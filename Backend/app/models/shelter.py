from datetime import datetime

from sqlalchemy import DateTime
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Shelter(Base):
    __tablename__ = "shelters"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    latitude: Mapped[float]
    longitude: Mapped[float]
    capacity: Mapped[int]
    occupancy: Mapped[int] = mapped_column(default=0)
    is_active: Mapped[bool] = mapped_column(default=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow
    )

