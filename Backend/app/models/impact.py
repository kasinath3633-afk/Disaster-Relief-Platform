from datetime import datetime
from sqlalchemy import DateTime, Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ImpactAssessment(Base):
    __tablename__ = "impact_assessments"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    disaster_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    affected_population: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    affected_buildings: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    affected_roads: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    affected_area_km2: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0
    )

    impact_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0
    )

    impact_level: Mapped[str] = mapped_column(
        String(20),
        nullable=False,
        default="LOW"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )
