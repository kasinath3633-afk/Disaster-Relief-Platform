from math import pi

from app.database import SessionLocal
from app.models.disaster import Disaster
from app.models.population import PopulationPoint
from app.models.simulation import SimulationResult
from app.utils.geo import haversine_distance


db = SessionLocal()

try:
    # 1. Get the disaster
    disaster = db.query(Disaster).filter(
        Disaster.name == "Pala Flood 2026"
    ).first()

    if not disaster:
        raise RuntimeError("Disaster not found")

    # 2. Get all population points
    population_points = db.query(PopulationPoint).all()

    # 3. Calculate affected population
    affected_population = 0

    for point in population_points:
        distance = haversine_distance(
            disaster.latitude,
            disaster.longitude,
            point.latitude,
            point.longitude
        )

        if distance <= disaster.radius_km:
            affected_population += point.population

    # 4. Calculate affected area
    affected_area_km2 = pi * (disaster.radius_km ** 2)

    # 5. Check if a result already exists
    result = db.query(SimulationResult).filter(
        SimulationResult.disaster_id == disaster.id
    ).first()

    # 6. Create or update the result
    if result:
        result.affected_population = affected_population
        result.affected_area_km2 = affected_area_km2
        result.severity = disaster.severity
        result.status = "completed"
    else:
        result = SimulationResult(
            disaster_id=disaster.id,
            affected_population=affected_population,
            affected_area_km2=affected_area_km2,
            severity=disaster.severity,
            status="completed"
        )

        db.add(result)

    # 7. Save to database
    db.commit()
    db.refresh(result)

    print("Simulation completed successfully!")
    print(f"Disaster: {disaster.name}")
    print(f"Affected population: {affected_population}")
    print(f"Affected area: {affected_area_km2:.2f} km²")
    print(f"Severity: {disaster.severity}")
    print(f"Status: {result.status}")
    print(f"Simulation result ID: {result.id}")

finally:
    db.close()
    