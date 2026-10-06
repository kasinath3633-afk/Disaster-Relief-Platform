import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.disaster import Disaster
from app.models.shelter import Shelter
from app.models.warehouse import Warehouse
from app.models.resource import Resource
from app.models.relief import ReliefRequirement
from app.models.allocation import Allocation
from app.utils.geo import haversine_km


def calculate_destination_priority(
    shelter: Shelter,
    disaster_severity: int
) -> float:
    """
    Calculate explainable priority score (0-100) for a shelter destination.
    Heuristic combines:
    - Occupancy / capacity pressure (35%)
    - Absolute sheltered population scale (35%)
    - Disaster severity intensity (30%)
    """
    capacity = max(1, shelter.capacity)
    occupancy = max(0, shelter.occupancy)
    
    demand_ratio = min(1.0, occupancy / capacity)
    pop_scale = min(1.0, occupancy / 500.0)
    sev_scale = min(1.0, max(1, disaster_severity) / 10.0)

    score = (
        0.35 * (demand_ratio * 100.0)
        + 0.35 * (pop_scale * 100.0)
        + 0.30 * (sev_scale * 100.0)
    )
    return round(score, 2)


def rank_candidate_warehouses(
    warehouses_with_resource: List[Tuple_warehouse_resource := Any],
    shelter_lat: float,
    shelter_lon: float
) -> List[Dict[str, Any]]:
    """
    Rank warehouses offering the required resource based on proximity and route safety.
    Efficiency Heuristic:
    Score = 100 - min(60, distance_km * 1.5) - (risk_score * 40)
    """
    candidates = []
    for warehouse, res in warehouses_with_resource:
        dist = haversine_km(warehouse.latitude, warehouse.longitude, shelter_lat, shelter_lon)
        # Approximate baseline route risk based on distance to hazard / perimeter
        est_risk = round(min(0.8, 0.05 + (dist / 150.0)), 2)
        efficiency_score = 100.0 - min(60.0, dist * 1.5) - (est_risk * 40.0)

        candidates.append({
            "warehouse": warehouse,
            "resource": res,
            "distance_km": round(dist, 2),
            "risk_score": est_risk,
            "efficiency_score": round(efficiency_score, 2)
        })

    # Sort descending by efficiency score (closest & lowest risk first)
    candidates.sort(key=lambda x: x["efficiency_score"], reverse=True)
    return candidates


def run_intelligent_allocation_heuristic(
    db: Session,
    disaster_id: int,
    commit_to_db: bool = True
) -> Dict[str, Any]:
    """
    Execute modular intelligent relief allocation heuristic.
    Preserves explainability and determinism.
    """
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        return None

    relief = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).order_by(ReliefRequirement.id.desc()).first()

    if not relief:
        return None

    active_shelters = db.query(Shelter).filter(Shelter.is_active == True).all()
    if not active_shelters:
        # Default destination if no shelters are recorded
        active_shelters = [
            Shelter(
                id=0,
                name="Central Relief Distribution Point",
                latitude=disaster.latitude,
                longitude=disaster.longitude,
                capacity=1000,
                occupancy=500,
                is_active=True
            )
        ]

    # Prioritize destinations
    shelter_priorities = []
    for s in active_shelters:
        pri = calculate_destination_priority(s, disaster.severity)
        shelter_priorities.append((pri, s))
    shelter_priorities.sort(key=lambda x: x[0], reverse=True)

    required_totals = {
        "food_packets": relief.food_packets,
        "water_liters": relief.water_liters,
        "medical_kits": relief.medical_kits,
        "blankets": relief.blankets
    }

    # Demand allocation per shelter based on relative occupancy share
    total_occupancy = sum(max(1, s.occupancy) for _, s in shelter_priorities)
    
    dispatch_results = []
    unmet_demand_results = []

    for res_name, total_req in required_totals.items():
        if total_req <= 0:
            continue

        allocated_for_resource = 0
        remaining_resource_needed = total_req

        # Fetch all warehouses that hold this resource with quantity > 0
        resources = db.query(Resource).filter(
            Resource.name == res_name,
            Resource.quantity > 0
        ).all()

        warehouse_map = {w.id: w for w in db.query(Warehouse).all()}

        # Distribute demand across prioritized shelters
        for priority_score, shelter in shelter_priorities:
            if remaining_resource_needed <= 0:
                break

            share = max(1, shelter.occupancy) / total_occupancy
            shelter_need = int(math.ceil(total_req * share))
            shelter_need = min(shelter_need, remaining_resource_needed)

            if shelter_need <= 0:
                continue

            available_candidates = []
            for r in resources:
                if r.quantity > 0 and r.warehouse_id in warehouse_map:
                    available_candidates.append((warehouse_map[r.warehouse_id], r))

            if not available_candidates:
                break

            ranked = rank_candidate_warehouses(
                available_candidates,
                shelter.latitude,
                shelter.longitude
            )

            for cand in ranked:
                if shelter_need <= 0:
                    break

                wh = cand["warehouse"]
                res = cand["resource"]

                send_qty = min(shelter_need, res.quantity)
                if send_qty <= 0:
                    continue

                res.quantity -= send_qty
                shelter_need -= send_qty
                remaining_resource_needed -= send_qty
                allocated_for_resource += send_qty

                reason = (
                    f"Dispatched {send_qty} {res.unit} to {shelter.name} (Priority {priority_score}) "
                    f"from {wh.name} based on optimal proximity ({cand['distance_km']} km) "
                    f"and low transit hazard risk ({cand['risk_score']})."
                )

                dispatch_results.append({
                    "resource": res_name,
                    "destination_shelter_id": shelter.id,
                    "destination_shelter_name": shelter.name,
                    "warehouse_id": wh.id,
                    "warehouse_name": wh.name,
                    "quantity": send_qty,
                    "priority_score": priority_score,
                    "distance_km": cand["distance_km"],
                    "risk_score": cand["risk_score"],
                    "reason": reason
                })

                if commit_to_db and shelter.id != 0:
                    alloc_rec = Allocation(
                        disaster_id=disaster_id,
                        warehouse_id=wh.id,
                        resource_id=res.id,
                        allocated_quantity=send_qty
                    )
                    db.add(alloc_rec)

        shortage = total_req - allocated_for_resource
        unmet_reason = (
            f"Sufficient inventory available; 100% demand fulfilled."
            if shortage == 0
            else f"Regional inventory deficit: warehouse network exhausted with {shortage} units unmet."
        )

        unmet_demand_results.append({
            "resource": res_name,
            "required": total_req,
            "allocated": allocated_for_resource,
            "unmet": max(0, shortage),
            "reason": unmet_reason
        })

    if commit_to_db:
        db.commit()

    return {
        "disaster_id": disaster_id,
        "total_allocations_count": len(dispatch_results),
        "allocations": dispatch_results,
        "unmet_demand": unmet_demand_results,
        "heuristic_description": (
            "Multi-criteria explainable heuristic prioritizing high-occupancy vulnerable shelters, "
            "evaluating route proximity and transit risk penalties, and distributing warehouse inventory."
        ),
        "status": "completed"
    }
