from app.database import SessionLocal
from app.models.resource import Resource
from app.services.allocation import create_allocation


db = SessionLocal()

try:
    resource = db.query(Resource).filter(
        Resource.name == "food_packets"
    ).first()

    allocation, shortage = create_allocation(
        db=db,
        disaster_id=5,
        resource=resource,
        required=24000
    )

    print("Allocated:", allocation.allocated_quantity)
    print("Shortage:", shortage)
    print("Remaining resource:", resource.quantity)

    db.rollback()

finally:
    db.close()