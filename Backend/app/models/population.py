from sqlalchemy import Float, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class PopulationPoint(Base):
    __tablename__ = "population_points"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    population: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    vulnerable_population: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )