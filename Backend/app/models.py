from datetime import datetime
from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column
from app.database import Base

class Disaster(Base):
    __tablename__ = "disasters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    severity: Mapped[int]
    latitude: Mapped[float]
    longitude: Mapped[float]
    radius_km: Mapped[float]
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

