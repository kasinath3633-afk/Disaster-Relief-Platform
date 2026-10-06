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


def generate_comprehensive_disaster_report(
    disaster,
    simulation=None,
    impact=None,
    relief=None,
    allocations=None,
    resources=None,
    shelters=None,
    population_points=None,
    weather=None,
    unmet_demands=None
) -> BytesIO:
    """
    Generate an exhaustive disaster decision-support PDF report encompassing:
    - Disaster summary
    - Atmospheric & weather hazard assessment
    - Advanced impact estimation (population, buildings, roads)
    - Shelter capacities and population points
    - Relief inventory, dispatches, and unmet demands
    """
    buffer = BytesIO()

    document = SimpleDocTemplate(
        buffer,
        pagesize=A4,
        rightMargin=15 * mm,
        leftMargin=15 * mm,
        topMargin=15 * mm,
        bottomMargin=15 * mm
    )

    styles = getSampleStyleSheet()
    title_style = styles["Title"]
    heading_style = styles["Heading2"]
    normal_style = styles["Normal"]

    elements = []

    # Title Banner
    elements.append(Paragraph("Comprehensive Disaster Logistics & Impact Report", title_style))
    elements.append(Spacer(1, 8))

    # 1. Disaster Overview Table
    elements.append(Paragraph(f"Disaster Event: {disaster.name}", heading_style))
    disaster_data = [
        ["Field", "Value"],
        ["Disaster ID", str(disaster.id)],
        ["Disaster Severity", f"{disaster.severity} / 10"],
        ["Epicenter (Lat, Lon)", f"{disaster.latitude:.4f}, {disaster.longitude:.4f}"],
        ["Hazard Impact Radius", f"{disaster.radius_km:.1f} km"],
        ["Incident Timestamp", str(disaster.created_at)]
    ]
    t_disaster = Table(disaster_data, colWidths=[60 * mm, 120 * mm])
    t_disaster.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1A365D")),
        ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
        ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
        ("PADDING", (0, 0), (-1, -1), 5)
    ]))
    elements.append(t_disaster)
    elements.append(Spacer(1, 10))

    # 2. Weather & Environmental Conditions
    if weather:
        elements.append(Paragraph("Atmospheric & Environmental Hazard Data", heading_style))
        weather_data = [
            ["Metric", "Value"],
            ["Data Source", str(weather.get("source", "Telemetry"))],
            ["Ambient Temperature", f"{weather.get('temperature_c', 0.0)} °C"],
            ["Precipitation / Rainfall", f"{weather.get('rainfall_mm', 0.0)} mm"],
            ["Wind Speed", f"{weather.get('wind_speed_kmh', 0.0)} km/h"],
            ["Visibility", f"{weather.get('visibility_km', 10.0)} km"],
            ["Atmospheric Hazard Risk", f"{weather.get('weather_risk', 0.0):.2f} (Scale 0.0 - 1.0)"],
            ["Condition Summary", str(weather.get("weather_condition", "Normal"))]
        ]
        t_weather = Table(weather_data, colWidths=[60 * mm, 120 * mm])
        t_weather.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2B6CB0")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 4)
        ]))
        elements.append(t_weather)

        warnings = weather.get("warnings", [])
        if warnings:
            elements.append(Spacer(1, 4))
            for w in warnings:
                elements.append(Paragraph(f"<b>ALERT:</b> {w}", normal_style))
        elements.append(Spacer(1, 10))

    # 3. Advanced Impact Assessment
    if impact:
        elements.append(Paragraph("Advanced Multi-Sector Impact Assessment", heading_style))
        impact_data = [
            ["Assessment Factor", "Estimated Value"],
            ["Composite Impact Score", f"{impact.impact_score:.2f} / 100.0"],
            ["Severity Classification", str(impact.impact_level)],
            ["Estimated Affected Population", f"{impact.affected_population:,} persons"],
            ["Estimated Damaged Buildings", f"{impact.affected_buildings:,} structures"],
            ["Estimated Affected Road Corridors", f"{impact.affected_roads:,} segments"],
            ["Hazard Footprint Area", f"{impact.affected_area_km2:.2f} km²"],
        ]
        t_impact = Table(impact_data, colWidths=[60 * mm, 120 * mm])
        t_impact.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#C53030")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 4)
        ]))
        elements.append(t_impact)
        elements.append(Spacer(1, 10))

    # 4. Relief Requirements & Unmet Demands
    if relief:
        elements.append(Paragraph("Relief Requirements & Fulfillment", heading_style))
        relief_data = [
            ["Resource Category", "Required Units"]
        ]
        relief_data.append(["Food Packets", str(relief.food_packets)])
        relief_data.append(["Water Liters", str(relief.water_liters)])
        relief_data.append(["Medical Kits", str(relief.medical_kits)])
        relief_data.append(["Blankets", str(relief.blankets)])

        t_relief = Table(relief_data, colWidths=[90 * mm, 90 * mm])
        t_relief.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#2C7A7B")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 4)
        ]))
        elements.append(t_relief)
        elements.append(Spacer(1, 10))

    if unmet_demands:
        elements.append(Paragraph("Unmet Demand & Logistics Shortages", heading_style))
        unmet_table_data = [["Resource", "Required", "Allocated", "Unmet Shortage", "Status"]]
        for u in unmet_demands:
            unmet_table_data.append([
                str(u.get("resource")),
                str(u.get("required")),
                str(u.get("allocated")),
                str(u.get("unmet")),
                "Deficit" if u.get("unmet", 0) > 0 else "Fulfilled"
            ])
        t_unmet = Table(unmet_table_data, colWidths=[40 * mm, 30 * mm, 30 * mm, 35 * mm, 45 * mm])
        t_unmet.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#742A2A")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 4)
        ]))
        elements.append(t_unmet)
        elements.append(Spacer(1, 10))

    # 5. Shelters Status
    if shelters:
        elements.append(Paragraph("Shelter Network Capacity & Occupancy", heading_style))
        tot_cap = sum(s.capacity for s in shelters)
        tot_occ = sum(s.occupancy for s in shelters)
        shelter_summary = [
            ["Metric", "Value"],
            ["Total Registered Shelters", str(len(shelters))],
            ["Cumulative Capacity", f"{tot_cap:,}"],
            ["Current Occupancy", f"{tot_occ:,}"],
            ["Available Evacuee Capacity", f"{max(0, tot_cap - tot_occ):,}"]
        ]
        t_sh = Table(shelter_summary, colWidths=[60 * mm, 120 * mm])
        t_sh.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#4A5568")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.whitesmoke),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("PADDING", (0, 0), (-1, -1), 4)
        ]))
        elements.append(t_sh)
        elements.append(Spacer(1, 10))

    elements.append(Paragraph(f"Comprehensive Audit Report Generated: {datetime.now()}", normal_style))

    document.build(elements)
    buffer.seek(0)
    return buffer