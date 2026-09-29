from app.services.allocation import calculate_allocation
from app.services.allocation import create_allocation


def test_full_allocation():
    allocated, shortage = calculate_allocation(100, 500)

    assert allocated == 100
    assert shortage == 0


def test_insufficient_inventory():
    allocated, shortage = calculate_allocation(500, 300)

    assert allocated == 300
    assert shortage == 200


def test_exact_inventory():
    allocated, shortage = calculate_allocation(500, 500)

    assert allocated == 500
    assert shortage == 0


def test_zero_inventory():
    allocated, shortage = calculate_allocation(500, 0)

    assert allocated == 0
    assert shortage == 500

def test_multiple_warehouse_allocation():
    required = 10000
    warehouse_1 = 5000
    warehouse_2 = 8000

    allocated_1, shortage_1 = calculate_allocation(
        required,
        warehouse_1
    )

    remaining = required - allocated_1

    allocated_2, shortage_2 = calculate_allocation(
        remaining,
        warehouse_2
    )

    total_allocated = allocated_1 + allocated_2
    total_shortage = shortage_2

    assert total_allocated == 10000
    assert total_shortage == 0


def test_multiple_warehouse_insufficient():
    required = 15000
    warehouse_1 = 5000
    warehouse_2 = 8000

    allocated_1, shortage_1 = calculate_allocation(
        required,
        warehouse_1
    )

    remaining = required - allocated_1

    allocated_2, shortage_2 = calculate_allocation(
        remaining,
        warehouse_2
    )

    total_allocated = allocated_1 + allocated_2
    total_shortage = shortage_2

    assert total_allocated == 13000
    assert total_shortage == 2000