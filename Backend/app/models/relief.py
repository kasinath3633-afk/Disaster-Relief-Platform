from sqlalchemy import Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class ReliefRequirement(Base):
    __tablename__ = "relief_requirements"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    disaster_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    food_packets: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    water_liters: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    medical_kits: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    blankets: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
        default=0
    )

    status: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
        default="estimated"
    )