from app.services.allocation import calculate_allocation, create_allocation
from app.services.report import generate_disaster_report, generate_comprehensive_disaster_report
from app.services.impact import (
    estimate_building_impact,
    estimate_road_impact,
    calculate_impact_score,
    determine_impact_level,
    run_impact_assessment_calculation,
    execute_and_persist_impact_assessment,
)
from app.services.gis import (
    validate_coordinates,
    ensure_spatial_indexes,
    get_nearby_shelters_spatial,
    get_nearby_warehouses_spatial,
    get_affected_population_spatial,
)
from app.services.routing import (
    RoutingGraph,
    compute_edge_weight,
    dijkstra_safe_path,
    astar_safe_path,
    seed_sample_road_network,
)
from app.services.intelligent_allocation import (
    calculate_destination_priority,
    rank_candidate_warehouses,
    run_intelligent_allocation_heuristic,
)
from app.services.external_data import (
    NormalizedWeatherData,
    ExternalDataProvider,
    MockWeatherProvider,
    OpenMeteoWeatherProvider,
    ResilientWeatherService,
    compute_weather_risk,
    get_weather_adjusted_impact_score,
)

from app.services.dashboard import get_disaster_dashboard_summary

__all__ = [
    "calculate_allocation",
    "create_allocation",
    "generate_disaster_report",
    "generate_comprehensive_disaster_report",
    "estimate_building_impact",
    "estimate_road_impact",
    "calculate_impact_score",
    "determine_impact_level",
    "run_impact_assessment_calculation",
    "execute_and_persist_impact_assessment",
    "validate_coordinates",
    "ensure_spatial_indexes",
    "get_nearby_shelters_spatial",
    "get_nearby_warehouses_spatial",
    "get_affected_population_spatial",
    "RoutingGraph",
    "compute_edge_weight",
    "dijkstra_safe_path",
    "astar_safe_path",
    "seed_sample_road_network",
    "calculate_destination_priority",
    "rank_candidate_warehouses",
    "run_intelligent_allocation_heuristic",
    "NormalizedWeatherData",
    "ExternalDataProvider",
    "MockWeatherProvider",
    "OpenMeteoWeatherProvider",
    "ResilientWeatherService",
    "compute_weather_risk",
    "get_weather_adjusted_impact_score",
    "get_disaster_dashboard_summary",
]

