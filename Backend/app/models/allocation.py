from datetime import datetime

from sqlalchemy import DateTime, Integer
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Allocation(Base):
    __tablename__ = "allocations"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True
    )

    disaster_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    warehouse_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    resource_id: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    allocated_quantity: Mapped[int] = mapped_column(
        Integer,
        nullable=False
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )