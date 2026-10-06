import math
from typing import Optional
from sqlalchemy.orm import Session

from app.models.disaster import Disaster
from app.models.simulation import SimulationResult
from app.models.population import PopulationPoint
from app.models.impact import ImpactAssessment
from app.utils.geo import haversine_km


def estimate_building_impact(affected_population: int, severity: int) -> int:
    """
    Estimate number of affected buildings.
    Project Assumption:
    Average occupancy factor is 4.5 persons per building.
    Damage/exposure ratio scales with disaster severity (1-10).
    """
    if affected_population <= 0 or severity <= 0:
        return 0
    ratio = severity / 10.0
    return round((affected_population / 4.5) * ratio)


def estimate_road_impact(radius_km: float, severity: int) -> int:
    """
    Estimate number of affected road segments / key corridors.
    Project Assumption:
    Road exposure correlates with disaster radius (km) and severity (1-10).
    A baseline network density of 2.5 road segments per radius kilometer is assumed.
    """
    if radius_km <= 0 or severity <= 0:
        return 0
    ratio = severity / 10.0
    return round(2.5 * radius_km * ratio)


def calculate_impact_score(
    affected_population: int,
    affected_buildings: int,
    affected_roads: int,
    severity: int
) -> float:
    """
    Calculate composite impact score between 0.0 and 100.0.
    Weighting model (Project Assumption):
    - Population Impact: 40% (Normalized against benchmark of 10,000 affected people)
    - Building Impact:   20% (Normalized against benchmark of 2,000 damaged buildings)
    - Road Impact:       15% (Normalized against benchmark of 100 affected road segments)
    - Disaster Severity: 25% (Normalized directly: severity / 10 * 100)
    """
    pop_score = min(100.0, (max(0, affected_population) / 10000.0) * 100.0)
    bld_score = min(100.0, (max(0, affected_buildings) / 2000.0) * 100.0)
    road_score = min(100.0, (max(0, affected_roads) / 100.0) * 100.0)
    sev_score = min(100.0, (max(1, min(10, severity)) / 10.0) * 100.0)

    score = (
        0.40 * pop_score
        + 0.20 * bld_score
        + 0.15 * road_score
        + 0.25 * sev_score
    )

    return round(min(100.0, max(0.0, score)), 2)


def determine_impact_level(score: float) -> str:
    """
    Map impact score (0-100) to severity classification.
    Thresholds:
    0–25   : LOW
    26–50  : MODERATE
    51–75  : HIGH
    76–100 : CRITICAL
    """
    if score <= 25.0:
        return "LOW"
    elif score <= 50.0:
        return "MODERATE"
    elif score <= 75.0:
        return "HIGH"
    else:
        return "CRITICAL"


def run_impact_assessment_calculation(
    disaster: Disaster,
    db: Session
) -> dict:
    """
    Execute deterministic impact assessment calculation for a disaster.
    Uses existing SimulationResult if present, otherwise computes from PopulationPoints.
    """
    # 1. Check if prior simulation result exists
    simulation = db.query(SimulationResult).filter(
        SimulationResult.disaster_id == disaster.id
    ).order_by(SimulationResult.id.desc()).first()

    if simulation:
        affected_pop = simulation.affected_population
        affected_area = simulation.affected_area_km2
    else:
        # Compute population from points within radius
        affected_pop = 0
        points = db.query(PopulationPoint).all()
        for point in points:
            dist = haversine_km(
                disaster.latitude,
                disaster.longitude,
                point.latitude,
                point.longitude
            )
            if dist <= disaster.radius_km:
                affected_pop += point.population
        affected_area = math.pi * (disaster.radius_km ** 2)

    affected_bld = estimate_building_impact(affected_pop, disaster.severity)
    affected_roads = estimate_road_impact(disaster.radius_km, disaster.severity)

    score = calculate_impact_score(
        affected_population=affected_pop,
        affected_buildings=affected_bld,
        affected_roads=affected_roads,
        severity=disaster.severity
    )

    level = determine_impact_level(score)

    return {
        "disaster_id": disaster.id,
        "affected_population": affected_pop,
        "affected_buildings": affected_bld,
        "affected_roads": affected_roads,
        "affected_area_km2": round(affected_area, 2),
        "impact_score": score,
        "impact_level": level,
    }


def execute_and_persist_impact_assessment(
    db: Session,
    disaster_id: int
) -> ImpactAssessment:
    """
    Run impact assessment and persist record in database.
    """
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        return None

    data = run_impact_assessment_calculation(disaster, db)

    assessment = ImpactAssessment(
        disaster_id=data["disaster_id"],
        affected_population=data["affected_population"],
        affected_buildings=data["affected_buildings"],
        affected_roads=data["affected_roads"],
        affected_area_km2=data["affected_area_km2"],
        impact_score=data["impact_score"],
        impact_level=data["impact_level"]
    )

    db.add(assessment)
    db.commit()
    db.refresh(assessment)

    return assessment
