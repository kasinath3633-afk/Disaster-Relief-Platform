import math
from typing import List, Dict, Any, Optional
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.models.shelter import Shelter
from app.models.warehouse import Warehouse
from app.models.disaster import Disaster
from app.models.population import PopulationPoint
from app.utils.geo import haversine_km


def validate_coordinates(latitude: float, longitude: float) -> tuple[bool, Optional[str]]:
    """
    Validate that geographic coordinates conform to WGS 84 (EPSG:4326) bounds:
    - Latitude:  [-90.0, 90.0]
    - Longitude: [-180.0, 180.0]
    """
    if not isinstance(latitude, (int, float)) or not isinstance(longitude, (int, float)):
        return False, "Coordinates must be numeric values."
    if math.isnan(latitude) or math.isnan(longitude):
        return False, "Coordinates cannot be NaN."
    if latitude < -90.0 or latitude > 90.0:
        return False, f"Invalid latitude {latitude}. Must be between -90.0 and 90.0."
    if longitude < -180.0 or longitude > 180.0:
        return False, f"Invalid longitude {longitude}. Must be between -180.0 and 180.0."
    return True, None


def ensure_spatial_indexes(db: Session) -> bool:
    """
    Ensure PostGIS GIST indexes exist on spatial entities.
    Returns True if indexes were created/verified, False if PostGIS is unavailable.
    """
    try:
        db.execute(text("SELECT PostGIS_Version();"))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_shelters_geom 
            ON shelters USING GIST ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography));
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_warehouses_geom 
            ON warehouses USING GIST ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography));
        """))
        db.execute(text("""
            CREATE INDEX IF NOT EXISTS idx_population_geom 
            ON population_points USING GIST ((ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography));
        """))
        db.commit()
        return True
    except Exception:
        db.rollback()
        return False


def get_nearby_shelters_spatial(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 50.0,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Query nearby active shelters using PostGIS ST_DWithin and ST_Distance on EPSG:4326 geography.
    Falls back to Python Haversine calculation if PostGIS extension is not installed.
    """
    valid, err = validate_coordinates(latitude, longitude)
    if not valid:
        raise ValueError(err)

    radius_meters = radius_km * 1000.0

    try:
        sql = text("""
            SELECT id, name, latitude, longitude, capacity, occupancy, is_active,
                   ST_Distance(
                       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                       ST_SetSRID(ST_MakePoint(:target_lon, :target_lat), 4326)::geography
                   ) / 1000.0 AS distance_km
            FROM shelters
            WHERE is_active = TRUE
              AND ST_DWithin(
                  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(:target_lon, :target_lat), 4326)::geography,
                  :radius_meters
              )
            ORDER BY distance_km ASC
            LIMIT :limit
        """)
        rows = db.execute(sql, {
            "target_lon": longitude,
            "target_lat": latitude,
            "radius_meters": radius_meters,
            "limit": limit
        }).mappings().all()

        return [
            {
                "id": row["id"],
                "name": row["name"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "capacity": row["capacity"],
                "occupancy": row["occupancy"],
                "is_active": row["is_active"],
                "distance_km": round(float(row["distance_km"]), 2)
            }
            for row in rows
        ]
    except Exception:
        # Fallback to Python haversine
        shelters = db.query(Shelter).filter(Shelter.is_active == True).all()
        results = []
        for s in shelters:
            dist = haversine_km(latitude, longitude, s.latitude, s.longitude)
            if dist <= radius_km:
                results.append({
                    "id": s.id,
                    "name": s.name,
                    "latitude": s.latitude,
                    "longitude": s.longitude,
                    "capacity": s.capacity,
                    "occupancy": s.occupancy,
                    "is_active": s.is_active,
                    "distance_km": round(dist, 2)
                })
        results.sort(key=lambda x: x["distance_km"])
        return results[:limit]


def get_nearby_warehouses_spatial(
    db: Session,
    latitude: float,
    longitude: float,
    radius_km: float = 100.0,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Query nearby warehouses using PostGIS ST_DWithin and ST_Distance on EPSG:4326 geography.
    Falls back to Python Haversine calculation if PostGIS is unavailable.
    """
    valid, err = validate_coordinates(latitude, longitude)
    if not valid:
        raise ValueError(err)

    radius_meters = radius_km * 1000.0

    try:
        sql = text("""
            SELECT id, name, latitude, longitude, capacity,
                   ST_Distance(
                       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                       ST_SetSRID(ST_MakePoint(:target_lon, :target_lat), 4326)::geography
                   ) / 1000.0 AS distance_km
            FROM warehouses
            WHERE ST_DWithin(
                  ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                  ST_SetSRID(ST_MakePoint(:target_lon, :target_lat), 4326)::geography,
                  :radius_meters
              )
            ORDER BY distance_km ASC
            LIMIT :limit
        """)
        rows = db.execute(sql, {
            "target_lon": longitude,
            "target_lat": latitude,
            "radius_meters": radius_meters,
            "limit": limit
        }).mappings().all()

        return [
            {
                "id": row["id"],
                "name": row["name"],
                "latitude": row["latitude"],
                "longitude": row["longitude"],
                "capacity": row["capacity"],
                "distance_km": round(float(row["distance_km"]), 2)
            }
            for row in rows
        ]
    except Exception:
        warehouses = db.query(Warehouse).all()
        results = []
        for w in warehouses:
            dist = haversine_km(latitude, longitude, w.latitude, w.longitude)
            if dist <= radius_km:
                results.append({
                    "id": w.id,
                    "name": w.name,
                    "latitude": w.latitude,
                    "longitude": w.longitude,
                    "capacity": w.capacity,
                    "distance_km": round(dist, 2)
                })
        results.sort(key=lambda x: x["distance_km"])
        return results[:limit]


def get_affected_population_spatial(
    db: Session,
    disaster_id: int
) -> Dict[str, Any]:
    """
    Query all population points impacted within a disaster zone using PostGIS ST_DWithin.
    Returns aggregated figures along with a valid GeoJSON FeatureCollection.
    """
    disaster = db.query(Disaster).filter(Disaster.id == disaster_id).first()
    if not disaster:
        return None

    valid, err = validate_coordinates(disaster.latitude, disaster.longitude)
    if not valid:
        raise ValueError(err)

    radius_meters = disaster.radius_km * 1000.0

    try:
        sql = text("""
            SELECT id, latitude, longitude, population, vulnerable_population,
                   ST_Distance(
                       ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                       ST_SetSRID(ST_MakePoint(:disaster_lon, :disaster_lat), 4326)::geography
                   ) / 1000.0 AS distance_km
            FROM population_points
            WHERE ST_DWithin(
                ST_SetSRID(ST_MakePoint(longitude, latitude), 4326)::geography,
                ST_SetSRID(ST_MakePoint(:disaster_lon, :disaster_lat), 4326)::geography,
                :radius_meters
            )
            ORDER BY distance_km ASC
        """)
        rows = db.execute(sql, {
            "disaster_lon": disaster.longitude,
            "disaster_lat": disaster.latitude,
            "radius_meters": radius_meters
        }).mappings().all()

        points_data = [
            {
                "id": r["id"],
                "latitude": r["latitude"],
                "longitude": r["longitude"],
                "population": r["population"],
                "vulnerable_population": r["vulnerable_population"],
                "distance_km": round(float(r["distance_km"]), 2)
            }
            for r in rows
        ]
    except Exception:
        # Fallback to Haversine
        points = db.query(PopulationPoint).all()
        points_data = []
        for p in points:
            dist = haversine_km(disaster.latitude, disaster.longitude, p.latitude, p.longitude)
            if dist <= disaster.radius_km:
                points_data.append({
                    "id": p.id,
                    "latitude": p.latitude,
                    "longitude": p.longitude,
                    "population": p.population,
                    "vulnerable_population": p.vulnerable_population,
                    "distance_km": round(dist, 2)
                })

    features = []
    total_pop = 0
    total_vuln = 0

    for p in points_data:
        total_pop += p["population"]
        total_vuln += p["vulnerable_population"]
        features.append({
            "type": "Feature",
            "geometry": {
                "type": "Point",
                "coordinates": [p["longitude"], p["latitude"]]
            },
            "properties": {
                "id": p["id"],
                "population": p["population"],
                "vulnerable_population": p["vulnerable_population"],
                "distance_km": p["distance_km"]
            }
        })

    geojson_collection = {
        "type": "FeatureCollection",
        "features": features
    }

    return {
        "disaster_id": disaster.id,
        "total_affected_population": total_pop,
        "total_vulnerable_population": total_vuln,
        "point_count": len(points_data),
        "geojson": geojson_collection
    }
