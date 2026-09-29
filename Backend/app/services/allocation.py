from sqlalchemy.orm import Session

from app.models.allocation import Allocation
from app.models.resource import Resource


def calculate_allocation(required: int, available: int):
    allocated = min(required, available)
    shortage = required - allocated

    return allocated, shortage


def create_allocation(
    db: Session,
    disaster_id: int,
    resource: Resource,
    required: int
):
    allocated, shortage = calculate_allocation(
        required,
        resource.quantity
    )

    resource.quantity -= allocated

    allocation = Allocation(
        disaster_id=disaster_id,
        warehouse_id=resource.warehouse_id,
        resource_id=resource.id,
        allocated_quantity=allocated
    )

    db.add(allocation)

    return allocation, shortage