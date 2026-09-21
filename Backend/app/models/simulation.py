from sqlalchemy import Float, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class SimulationResult(Base):
    __tablename__ = "simulation_results"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
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

    affected_area_km2: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0
    )

    severity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="completed"
    )