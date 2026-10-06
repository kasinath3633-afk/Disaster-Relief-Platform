from sqlalchemy import Float, Integer, String, Boolean, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class RoadNode(Base):
    __tablename__ = "road_nodes"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False
    )

    latitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    longitude: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )


class RoadEdge(Base):
    __tablename__ = "road_edges"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        autoincrement=True
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=True,
        default="Road"
    )

    start_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("road_nodes.id", ondelete="CASCADE"),
        nullable=False
    )

    end_node_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("road_nodes.id", ondelete="CASCADE"),
        nullable=False
    )

    distance_km: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    speed_limit_kmh: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=40.0
    )

    travel_time_minutes: Mapped[float] = mapped_column(
        Float,
        nullable=False
    )

    risk_score: Mapped[float] = mapped_column(
        Float,
        nullable=False,
        default=0.0
    )

    is_blocked: Mapped[bool] = mapped_column(
        Boolean,
        nullable=False,
        default=False
    )
