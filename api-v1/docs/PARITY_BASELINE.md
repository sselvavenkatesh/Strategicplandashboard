# API V1 parity baseline

Validated against live Supabase project vznwvenzjzccvtqorhas on 2026-09-28.

The V1 REST service reads PostgreSQL through a dedicated read-only connection and calls the same reporting functions currently used by the V2.4 dashboard. This establishes behavioral parity while removing the frontend's dependency on the Supabase HTTP SDK.

## KPI history coverage

M-Step ELA: 4 years, 2022-23 through 2025-26.
M-Step Math: 4 years, 2022-23 through 2025-26.
SAT: 4 years, 2022-23 through 2025-26.
Freshmen on Track: 3 years, 2023-24 through 2025-26.
Graduation Rate: 2 years, 2023-24 through 2024-25.
Fund Balance: 10 years, 2015-16 through 2024-25.
Chronic Absenteeism: 4 years, 2022-23 through 2025-26.

## Explicit historical checks

M-Step ELA 2022-23: 43.00%.
M-Step Math 2022-23: 33.00%.

## Latest KPI checks

M-Step ELA 2025-26: 39.53%.
M-Step Math 2025-26: 34.42%.
SAT 2025-26: 673.
Freshmen on Track 2025-26: 97.45%.
Graduation Rate 2024-25: 84.4%.
Chronic Absenteeism 2025-26: 23.32%.
Fund Balance 2024-25: $19,248,186.

## Goal initiative progress checks

G1: 48 action items; 26 Done; 12 In Progress; 10 Not Yet Started; 54.2% complete.
G2: 36 action items; 23 Done; 7 In Progress; 6 Not Yet Started; 63.9% complete.
G3: 12 action items; 7 Done; 3 In Progress; 2 Not Yet Started; 58.3% complete.
G4: 36 action items; 27 Done; 5 In Progress; 4 Not Yet Started; 75.0% complete.

## Initiative API coverage

All 11 production initiatives were returned by fn_initiative_progress and are exposed through the V1 goal initiatives route. Subinitiative status distribution is exposed separately through the V1 subinitiatives route.

## Release rule

An endpoint is not considered parity-complete when its live test differs from the existing Supabase reporting result for the same database snapshot.
