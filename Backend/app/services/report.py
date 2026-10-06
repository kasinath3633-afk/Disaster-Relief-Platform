from io import BytesIO
from datetime import datetime

from reportlab.lib.pagesizes import A4
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet
from reportlab.lib.units import mm


def generate_disaster_report(
    disaster,
    simulation,
    relief,
    allocations,
    resources,
    shelters,
    population_points
):
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=20 * mm,
        leftMargin=20 * mm,
        topMargin=20 * mm,
        bottomMargin=20 * mm
    )

    styles = getSampleStyleSheet()

    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    normal_style = styles["Normal"]

    elements = []

    elements.append(
        Paragraph("Disaster Report", title_style)
    )
    elements.append(Spacer(1, 10))

    elements.append(
        Paragraph(f"Disaster: {disaster.name}", heading_style)
    )

    disaster_data = [
        ["Field", "Value"],
        ["Severity", str(disaster.severity)],
        ["Latitude", str(disaster.latitude)],
        ["Longitude", str(disaster.longitude)],
        ["Radius (km)", str(disaster.radius_km)],
        ["Created At", str(disaster.created_at)]
    ]

    table = Table(disaster_data, colWidths=[60 * mm, 100 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6)
    ]))

    elements.append(table)
    elements.append(Spacer(1, 15))

    if simulation:
        elements.append(
            Paragraph("Simulation Results", heading_style)
        )

        simulation_data = [
            ["Field", "Value"],
            ["Affected Population", str(simulation.affected_population)],
            ["Affected Area (km²)", str(simulation.affected_area_km2)],
            ["Severity", str(simulation.severity)],
            ["Status", str(simulation.status)]
        ]

        table = Table(simulation_data, colWidths=[60 * mm, 100 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 6)
        ]))

        elements.append(table)
        elements.append(Spacer(1, 15))

    if relief:
        elements.append(
            Paragraph("Relief Requirements", heading_style)
        )

        relief_data = [
            ["Resource", "Required"],
            ["Food Packets", str(relief.food_packets)],
            ["Water Liters", str(relief.water_liters)],
            ["Medical Kits", str(relief.medical_kits)],
            ["Blankets", str(relief.blankets)],
            ["Status", str(relief.status)]
        ]

        table = Table(relief_data, colWidths=[60 * mm, 100 * mm])
        table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 6)
        ]))

        elements.append(table)
        elements.append(Spacer(1, 15))

    elements.append(
        Paragraph("Resource Allocations", heading_style)
    )

    allocation_data = [
        ["Warehouse", "Resource", "Allocated"]
    ]

    resource_map = {
        resource.id: resource
        for resource in resources
    }

    for allocation in allocations:
        resource = resource_map.get(allocation.resource_id)

        allocation_data.append([
            str(allocation.warehouse_id),
            resource.name if resource else str(allocation.resource_id),
            str(allocation.allocated_quantity)
        ])

    if len(allocation_data) == 1:
        allocation_data.append([
            "-",
            "No allocations",
            "-"
        ])

    table = Table(
        allocation_data,
        colWidths=[45 * mm, 65 * mm, 50 * mm]
    )

    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6)
    ]))

    elements.append(table)
    elements.append(Spacer(1, 15))

    elements.append(
        Paragraph("Shelter Information", heading_style)
    )

    total_capacity = sum(shelter.capacity for shelter in shelters)
    total_occupancy = sum(shelter.occupancy for shelter in shelters)
    available_capacity = total_capacity - total_occupancy

    shelter_data = [
        ["Field", "Value"],
        ["Total Shelters", str(len(shelters))],
        ["Total Capacity", str(total_capacity)],
        ["Current Occupancy", str(total_occupancy)],
        ["Available Capacity", str(available_capacity)]
    ]

    table = Table(shelter_data, colWidths=[60 * mm, 100 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6)
    ]))

    elements.append(table)
    elements.append(Spacer(1, 15))

    elements.append(
        Paragraph("Population Information", heading_style)
    )

    total_population = sum(
        point.population for point in population_points
    )

    total_vulnerable = sum(
        point.vulnerable_population for point in population_points
    )

    population_data = [
        ["Field", "Value"],
        ["Population Points", str(len(population_points))],
        ["Total Population", str(total_population)],
        ["Vulnerable Population", str(total_vulnerable)]
    ]

    table = Table(population_data, colWidths=[60 * mm, 100 * mm])
    table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.lightgrey),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 6)
    ]))

    elements.append(table)
    elements.append(Spacer(1, 15))

    elements.append(
        Paragraph(
            f"Report Generated: {datetime.now()}",
            normal_style
        )
    )

    document.build(elements)

    buffer.seek(0)

    return buffer