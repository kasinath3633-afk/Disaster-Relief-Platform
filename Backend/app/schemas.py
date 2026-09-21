from pydantic import BaseModel, Field


class DisasterCreate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float
    longitude: float
    radius_km: float

class DisasterUpdate(BaseModel):
    name: str
    severity: int = Field(ge=1, le=10)
    latitude: float
    longitude: float
    radius_km: float