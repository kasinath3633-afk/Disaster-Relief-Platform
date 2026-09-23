import math


def haversine_km(
    latitude1: float,
    longitude1: float,
    latitude2: float,
    longitude2: float
) -> float:
    earth_radius_km = 6371.0

    latitude1 = math.radians(latitude1)
    latitude2 = math.radians(latitude2)

    latitude_difference = latitude2 - latitude1
    longitude_difference = math.radians(
        longitude2 - longitude1
    )

    a = (
        math.sin(latitude_difference / 2) ** 2
        + math.cos(latitude1)
        * math.cos(latitude2)
        * math.sin(longitude_difference / 2) ** 2
    )

    c = 2 * math.atan2(
        math.sqrt(a),
        math.sqrt(1 - a)
    )

    return earth_radius_km * c