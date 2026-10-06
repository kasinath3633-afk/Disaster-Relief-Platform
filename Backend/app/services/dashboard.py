from typing import Dict, Any, Optional
from sqlalchemy.orm import Session

from app.models.disaster import Disaster
from app.models.simulation import SimulationResult
from app.models.impact import ImpactAssessment
from app.models.relief import ReliefRequirement
from app.models.allocation import Allocation
from app.models.resource import Resource
from app.models.shelter import Shelter
from app.models.warehouse import Warehouse
from app.models.routing import RoadNode, RoadEdge
from app.services.external_data import ResilientWeatherService


def get_disaster_dashboard_summary(
    db: Session,
    disaster_id: int,
    weather_service: Optional[ResilientWeatherService] = None
) -> Optional[Dict[str, Any]]:
    """
    Compile a holistic, unified real-time dashboard summary for disaster coordinators.
    """
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        return None

    # 1. Simulation status
    simulation = db.query(SimulationResult).filter(
        SimulationResult.disaster_id == disaster_id
    ).order_by(SimulationResult.id.desc()).first()

    # 2. Impact Assessment
    impact = db.query(ImpactAssessment).filter(
        ImpactAssessment.disaster_id == disaster_id
    ).order_by(ImpactAssessment.id.desc()).first()

    # 3. Relief Requirements
    relief = db.query(ReliefRequirement).filter(
        ReliefRequirement.disaster_id == disaster_id
    ).order_by(ReliefRequirement.id.desc()).first()

    # 4. Shelters
    shelters = db.query(Shelter).all()
    total_shelter_capacity = sum(s.capacity for s in shelters)
    total_shelter_occupancy = sum(s.occupancy for s in shelters)

    # 5. Warehouses & Resources
    warehouses = db.query(Warehouse).all()
    resources = db.query(Resource).all()
    total_stock_units = sum(r.quantity for r in resources)

    # 6. Allocations & Unmet Demand
    allocations = db.query(Allocation).filter(
        Allocation.disaster_id == disaster_id
    ).all()
    total_allocated_units = sum(a.allocated_quantity for a in allocations)

    unmet_demand_items = []
    warnings = []

    if relief:
        req_map = {
            "food_packets": relief.food_packets,
            "water_liters": relief.water_liters,
            "medical_kits": relief.medical_kits,
            "blankets": relief.blankets
        }
        res_by_id = {r.id: r.name for r in resources}
        allocated_sums = {}
        for a in allocations:
            rname = res_by_id.get(a.resource_id)
            if rname:
                allocated_sums[rname] = allocated_sums.get(rname, 0) + a.allocated_quantity

        for rname, req_qty in req_map.items():
            alloc_qty = allocated_sums.get(rname, 0)
            shortage = max(0, req_qty - alloc_qty)
            unmet_demand_items.append({
                "resource": rname,
                "required": req_qty,
                "allocated": alloc_qty,
                "unmet": shortage,
                "reason": "Fulfilled" if shortage == 0 else f"Shortage of {shortage} units."
            })
            if shortage > 0:
                warnings.append(f"Resource Shortage: {rname} has {shortage} unallocated units.")

    # 7. Weather
    weather_dict = None
    if weather_service:
        w_data = weather_service.get_weather(disaster.latitude, disaster.longitude)
        weather_dict = w_data.model_dump()
        warnings.extend(w_data.warnings)

    # 8. Road network corridors
    passable_edges_count = db.query(RoadEdge).filter(RoadEdge.is_blocked == False).count()
    blocked_edges_count = db.query(RoadEdge).filter(RoadEdge.is_blocked == True).count()
    if blocked_edges_count > 0:
        warnings.append(f"Transit Hazard: {blocked_edges_count} road segments currently blocked in operational zone.")

    # 9. Overall Response Status
    impact_level = impact.impact_level if impact else "UNKNOWN"
    if impact_level in ["CRITICAL", "HIGH"] or len(warnings) >= 3:
        overall_status = "CRITICAL_ACTION_REQUIRED"
    elif impact_level == "MODERATE" or len(warnings) > 0:
        overall_status = "ELEVATED_RESPONSE"
    else:
        overall_status = "NORMAL_MONITORING"

    return {
        "disaster": {
            "id": disaster.id,
            "name": disaster.name,
            "severity": disaster.severity,
            "latitude": disaster.latitude,
            "longitude": disaster.longitude,
            "radius_km": disaster.radius_km,
            "created_at": disaster.created_at
        },
        "simulation_status": simulation.status if simulation else "not_started",
        "impact_score": impact.impact_score if impact else None,
        "impact_level": impact_level,
        "affected_population": impact.affected_population if impact else (simulation.affected_population if simulation else 0),
        "affected_buildings": impact.affected_buildings if impact else 0,
        "affected_roads": impact.affected_roads if impact else 0,
        "shelter_metrics": {
            "total_shelters": len(shelters),
            "total_capacity": total_shelter_capacity,
            "total_occupancy": total_shelter_occupancy,
            "available_capacity": max(0, total_shelter_capacity - total_shelter_occupancy)
        },
        "warehouse_metrics": {
            "total_warehouses": len(warehouses),
            "total_available_stock_units": total_stock_units
        },
        "relief_requirements": {
            "food_packets": relief.food_packets if relief else 0,
            "water_liters": relief.water_liters if relief else 0,
            "medical_kits": relief.medical_kits if relief else 0,
            "blankets": relief.blankets if relief else 0,
            "status": relief.status if relief else "unestimated"
        },
        "allocations_count": len(allocations),
        "unmet_demand": unmet_demand_items,
        "road_network": {
            "passable_corridors": passable_edges_count,
            "blocked_corridors": blocked_edges_count
        },
        "weather": weather_dict,
        "warnings": warnings,
        "overall_response_status": overall_status
    }
