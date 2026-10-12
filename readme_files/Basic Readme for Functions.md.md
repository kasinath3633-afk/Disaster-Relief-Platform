# Dashboard Operations Guide: Simulation, Impact Assessment & Relief Estimation

This document provides a detailed, viva-ready technical guide explaining the purpose, mathematical formulas, inputs, outputs, and operational workflow of the three core decision-support functions in the Disaster Management System Dashboard:
1. **Simulate (`POST /simulation/run`)**
2. **Assess Impact (`POST /impact/run/{disaster_id}`)**
3. **Estimate Relief (`POST /relief/estimate/{disaster_id}`)**

---

## 1. Operational Workflow & Pipeline

In modern disaster response and humanitarian logistics, emergency coordinators cannot dispatch aid haphazardly without quantitative situational awareness. The system operates on a structured, three-stage sequential pipeline:

```text
       ┌────────────────────────────────────────────────────────┐
       │                 1. DISASTER CREATED                    │
       │    (Epicenter Latitude/Longitude, Radius km, Severity)  │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │                 2. SIMULATE FUNCTION                   │
       │  • Haversine geodesic distance calculation             │
       │  • Population point spatial intersection               │
       │  • Circular disaster hazard footprint area             │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │               3. ASSESS IMPACT FUNCTION                │
       │  • Structural & building damage estimation             │
       │  • Transportation & road network disruption            │
       │  • 4-Factor composite impact scoring (0 to 100)        │
       │  • Qualitative alert level (LOW/MODERATE/HIGH/CRITICAL)│
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
       ┌────────────────────────────────────────────────────────┐
       │              4. ESTIMATE RELIEF FUNCTION               │
       │  • Food packets rationing (3 meals/person)             │
       │  • Clean water supply (5 liters/person)                │
       │  • Medical emergency kits (10% ratio)                  │
       │  • Blankets & thermal gear (50% ratio)                 │
       └───────────────────────────┬────────────────────────────┘
                                   │
                                   ▼
          Downstream: GIS Proximity, Safe Routing & Resource Allocation
```

---

## 2. Deep Dive: The "Simulate" Function

### What is its purpose?
The **Simulate** function is the primary spatial triggering mechanism of the decision-support engine. When an incident occurs (such as an earthquake epicenter, cyclone landfall, chemical leak, or flood origin), coordinators define its geographic coordinates, severity level ($1\text{--}10$), and hazard radius ($r$ in km). 

The simulation computes the **physical territorial footprint** of the disaster and evaluates which registered census population points fall inside the hazardous perimeter.

### How it works (Algorithm & Logic)
1. **Hazard Area Calculation:**
   $$\text{Affected Area } (A) = \pi \times r^2 \quad (\text{km}^2)$$
2. **Geodesic Spatial Intersection:**
   For every registered population point $(\phi_p, \lambda_p)$ in the database, the system calculates the exact great-circle distance $d$ to the disaster center $(\phi_d, \lambda_d)$ using the **Haversine formula**:
   $$a = \sin^2\left(\frac{\Delta \phi}{2}\right) + \cos(\phi_d)\cos(\phi_p)\sin^2\left(\frac{\Delta \lambda}{2}\right)$$
   $$c = 2 \cdot \text{atan2}(\sqrt{a}, \sqrt{1-a})$$
   $$d = R_{\text{earth}} \times c \quad (R_{\text{earth}} = 6371.0\text{ km})$$
3. **Aggregate Population Exposure:**
   If $d \le r$, the point's population is added to the total:
   $$\text{Affected Population} = \sum_{d_i \le r} P_i$$

### Role in the Dashboard
- Renders the circular hazard boundary on geospatial maps.
- Provides immediate census metrics on how many lives are directly exposed.
- Persists a `SimulationResult` record with status `"completed"`.

---

## 3. Deep Dive: The "Assess Impact" Function

### What is its purpose?
While simulation indicates *how many people* live within the disaster zone, it does not evaluate structural degradation, logistics corridor impairment, or multi-dimensional threat levels. 

The **Assess Impact** function transforms raw population counts into a comprehensive **multi-sector damage profile**. It models building vulnerabilities, infrastructure hazards, and calculates an **explainable 0–100 Composite Impact Score** with automated triage classification.

### How it works (Algorithm & Logic)
1. **Building Damage Estimation:**
   In regional disaster planning, building density correlates with population density and hazard severity. Using an empirical occupancy model of 4.5 residents per structure scaled by severity ($1\text{--}10$):
   $$\text{Affected Buildings} = \text{round}\left(\frac{\text{Affected Population}}{4.5} \times \frac{\text{Severity}}{10}\right)$$

2. **Road Network & Corridor Impact:**
   Infrastructure exposure correlates with disaster footprint radius and intensity:
   $$\text{Affected Roads} = \text{round}\left(2.5 \times r \times \frac{\text{Severity}}{10}\right)$$

3. **Composite Impact Scoring Model (0 to 100):**
   The system normalizes metrics against standard regional baselines and weights them deterministically:
   - **Population Exposure ($S_{\text{pop}}$):** 40% weight (normalized against 10,000 persons)
   - **Building Damage ($S_{\text{bld}}$):** 20% weight (normalized against 2,000 structures)
   - **Road Impairment ($S_{\text{road}}$):** 15% weight (normalized against 100 segments)
   - **Hazard Severity ($S_{\text{sev}}$):** 25% weight ($10 \times \text{Severity}$)

   $$\text{Impact Score} = 0.40 \cdot S_{\text{pop}} + 0.20 \cdot S_{\text{bld}} + 0.15 \cdot S_{\text{road}} + 0.25 \cdot S_{\text{sev}}$$

4. **Severity Triage Categorization:**
   | Score Range | Severity Level | Tactical Operational Response |
   | :--- | :--- | :--- |
   | **0 – 25** | `LOW` | Localized response; local authority monitoring. |
   | **26 – 50** | `MODERATE` | Elevated response; regional warehouses placed on standby. |
   | **51 – 75** | `HIGH` | High-priority emergency; shelter mobilization and aid dispatch. |
   | **76 – 100** | `CRITICAL` | Severe disaster declaration; multi-agency evacuation and maximum relief. |

### Role in the Dashboard
- Displays color-coded severity badges (`CRITICAL`, `HIGH`, `MODERATE`, `LOW`).
- Quantifies secondary physical damages (homes lost, road blockages).
- Triggers operational alert banners on the dashboard (`CRITICAL_ACTION_REQUIRED`).

---

## 4. Deep Dive: The "Estimate Relief" Function

### What is its purpose?
Humanitarian response fails if supply needs are guessed under duress. The **Estimate Relief** function calculates the exact, non-negotiable **daily survival commodities** required to sustain the displaced population based on internationally recognized humanitarian ration standards (e.g., Sphere Project standards).

### How it works (Algorithm & Logic)
Using the verified affected population from the simulation, the engine computes:

1. **Food Packets:**
   $$\text{Food Packets} = \text{Affected Population} \times 3$$
   *(Rationale: 3 balanced nutritional meals per individual per 24-hour cycle).*

2. **Clean Drinking Water:**
   $$\text{Water Liters} = \text{Affected Population} \times 5$$
   *(Rationale: 5 liters/day per individual; 2.5–3L for drinking, 2L for basic sanitation and infant care).*

3. **Emergency Medical First-Aid Kits:**
   $$\text{Medical Kits} = \text{round}(\text{Affected Population} \times 0.10)$$
   *(Rationale: 1 emergency trauma kit for every 10 exposed individuals to treat injuries and waterborne infection).*

4. **Blankets & Thermal Shelter Supplies:**
   $$\text{Blankets} = \text{round}(\text{Affected Population} \times 0.50)$$
   *(Rationale: 1 blanket per 2 individuals to prevent hypothermia in temporary displacement shelters).*

### Role in the Dashboard
- Generates the exact commodity requirement matrix.
- Feeds directly into:
  - **Relief Availability Tracker (`GET /relief/{id}/availability`):** Compares required vs available regional warehouse stock.
  - **Intelligent Relief Allocation (`POST /relief/{id}/intelligent-allocate`):** Determines which warehouse sends which supplies along which safe route.
  - **Unmet Demand Cards:** Highlights immediate logistical shortages on the dashboard.

---

## 5. Summary Comparison Matrix

| Feature / Dimension | 1. Simulate | 2. Assess Impact | 3. Estimate Relief |
| :--- | :--- | :--- | :--- |
| **API Endpoint** | `POST /simulation/run` | `POST /impact/run/{disaster_id}` | `POST /relief/estimate/{disaster_id}` |
| **Primary Question Answered** | *"Where is the disaster, and how many people are exposed?"* | *"How destructive is the event, and what is its overall severity?"* | *"Exactly what supplies and quantities are needed to sustain victims?"* |
| **Key Inputs** | Disaster Center (Lat, Lon), Radius (km), Census Population Points | Simulation Population, Radius, Severity Rating | Affected Population count |
| **Key Outputs** | Affected Population count, Circular Footprint Area ($\text{km}^2$) | Damaged Buildings, Blocked Roads, Impact Score (0–100), Level (`LOW` to `CRITICAL`) | Food Packets, Water Liters, Medical Kits, Blankets |
| **Downstream Impact** | Feeds into Impact Assessment and Relief Estimation | Feeds into Triage, Warning Banners, and Dashboard Status | Feeds into Warehouse Allocation, Routing, and Shortage Alerts |
| **Database Table** | `simulation_results` | `impact_assessments` | `relief_requirements` |
