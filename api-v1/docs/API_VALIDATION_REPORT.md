# StrategicPlan API V1 Validation Report

Validation date: 2026-09-28
Reference system: live Supabase PostgreSQL reporting layer
API branch: api-v1
Validation status: Data-contract parity verified. Hosted HTTP runtime validation remains pending until API V1 is deployed.

## Validation method

For every endpoint, the existing Supabase table or reporting function is treated as the expected source. The independent API repository method calls the same PostgreSQL source using a read-only connection. Values below were queried from the live Supabase database and checked against the values returned by the API data path.

A test is PASS only when the expected Supabase value and the API value are identical.

The API is not yet hosted at a public URL. Therefore this report does not claim an external HTTP production test. A second HTTP-runtime validation pass will be added after deployment by calling every endpoint over HTTP and recording the returned payload.

## Profile API

Endpoint:

    GET /api/v1/profile

Source: District_Profile.

| Test | Expected from Supabase | Actual API data path | Result |
| --- | --- | --- | --- |
| District ID | riverside | riverside | PASS |
| District Name | Riverside School District | Riverside School District | PASS |
| Strategic Plan Name | Strategic Plan Dashboard | Strategic Plan Dashboard | PASS |
| Total Goals | 4 | 4 | PASS |

## Goals API

Endpoint:

    GET /api/v1/goals

Source: Goal_master where Role = All.

| Test | Expected from Supabase | Actual API data path | Result |
| --- | --- | --- | --- |
| Number of public goals | 4 | 4 | PASS |
| G1 | Culture of Excellence | Culture of Excellence | PASS |
| G1 Total Indicators | 3 | 3 | PASS |
| G1 Total Initiatives configured | 5 | 5 | PASS |
| G2 | Equitable Opportunities & Outcomes | Equitable Opportunities & Outcomes | PASS |
| G2 Total Indicators | 3 | 3 | PASS |
| G2 Total Initiatives configured | 6 | 6 | PASS |
| G3 | Whole-Child Environments | Whole-Child Environments | PASS |
| G3 Total Indicators | 1 | 1 | PASS |
| G3 Total Initiatives configured | 4 | 4 | PASS |
| G4 | High Impact, Diverse Staff | High Impact, Diverse Staff | PASS |
| G4 Total Indicators | 1 | 1 | PASS |
| G4 Total Initiatives configured | 5 | 5 | PASS |

Note: configured initiative counts in Goal_master are metadata and are not the same thing as the number of initiative records currently returned by the reporting function.

## Latest KPI API

Endpoint example:

    GET /api/v1/goals/G1/indicators

Source: fn_indicator_key_values.

| KPI | School Year | Expected from Supabase | Actual API data path | Result |
| --- | --- | --- | --- | --- |
| M-Step ELA | 2025-26 | 39.53% | 39.53% | PASS |
| M-Step Math | 2025-26 | 34.42% | 34.42% | PASS |
| SAT | 2025-26 | 673 | 673 | PASS |
| Freshmen on Track | 2025-26 | 97.45% | 97.45% | PASS |
| Graduation Rate | 2024-25 | 84.4% | 84.4% | PASS |
| Chronic Absenteeism | 2025-26 | 23.32% | 23.32% | PASS |
| Fund Balance | 2024-25 | $19,248,186 | $19,248,186 | PASS |

## KPI History API

Endpoint example:

    GET /api/v1/indicators/ID2/history

Source: fn_indicator_year_history.

| KPI | Year | Expected District | Actual API District | Expected Statewide | Actual API Statewide | Result |
| --- | --- | --- | --- | --- | --- | --- |
| M-Step ELA | 2022-23 | 43.00% | 43.00% | null | null | PASS |
| M-Step ELA | 2023-24 | 42.00% | 42.00% | null | null | PASS |
| M-Step ELA | 2024-25 | 40.00% | 40.00% | 41.00% | 41.00% | PASS |
| M-Step ELA | 2025-26 | 39.53% | 39.53% | 39.83% | 39.83% | PASS |
| M-Step Math | 2022-23 | 33.00% | 33.00% | null | null | PASS |
| M-Step Math | 2023-24 | 33.00% | 33.00% | null | null | PASS |
| M-Step Math | 2024-25 | 33.00% | 33.00% | 36.00% | 36.00% | PASS |
| M-Step Math | 2025-26 | 34.42% | 34.42% | 35.93% | 35.93% | PASS |
| SAT | 2024-25 | 653 | 653 | 973.40 | 973.40 | PASS |
| SAT | 2025-26 | 673 | 673 | 957.9 | 957.9 | PASS |
| Freshmen on Track | 2025-26 | 97.45% | 97.45% | 95.66% | 95.66% | PASS |
| Graduation Rate | 2024-25 | 84.4% | 84.4% | 84.0% | 84.0% | PASS |
| Chronic Absenteeism | 2025-26 | 23.32% | 23.32% | 27.16% | 27.16% | PASS |
| Fund Balance | 2024-25 | $19,248,186 | $19,248,186 | null | null | PASS |

The automated test suite additionally checks the complete history row set. Current history coverage is 4 years for ELA, 4 for Math, 4 for SAT, 3 for Freshmen on Track, 2 for Graduation Rate, 10 for Fund Balance and 4 for Chronic Absenteeism.

## Student Group API

Endpoint examples:

    GET /api/v1/indicators/ID1/student-groups?school_year=2025-26
    GET /api/v1/indicators/ID2/student-groups?school_year=2025-26

Source: fn_indicator_student_groups.

### M-Step ELA 2025-26

| Student Group | Expected from Supabase | Actual API data path | Statewide Reference | Result |
| --- | --- | --- | --- | --- |
| All Students | 39.53% | 39.53% | 39.83% | PASS |
| Asian | 53.63% | 53.63% | 39.83% | PASS |
| Black or African American | 25.70% | 25.70% | 39.83% | PASS |
| English Learners | 20.73% | 20.73% | 39.83% | PASS |
| Hispanic of Any Race | 33.54% | 33.54% | 39.83% | PASS |
| Students With Disabilities | 17.39% | 17.39% | 39.83% | PASS |
| Two or More Races | 43.48% | 43.48% | 39.83% | PASS |
| White | 54.38% | 54.38% | 39.83% | PASS |

### M-Step Math 2025-26

| Student Group | Expected from Supabase | Actual API data path | Statewide Reference | Result |
| --- | --- | --- | --- | --- |
| All Students | 34.42% | 34.42% | 35.93% | PASS |
| Asian | 50.70% | 50.70% | 35.93% | PASS |
| Black or African American | 18.42% | 18.42% | 35.93% | PASS |
| English Learners | 20.94% | 20.94% | 35.93% | PASS |
| Hispanic of Any Race | 29.81% | 29.81% | 35.93% | PASS |
| Students With Disabilities | 15.43% | 15.43% | 35.93% | PASS |
| Two or More Races | 38.59% | 38.59% | 35.93% | PASS |
| White | 49.94% | 49.94% | 35.93% | PASS |

## Goal Initiative Progress API

Endpoint example:

    GET /api/v1/goals/G1/initiative-progress

Source: fn_goal_initiative_progress.

| Goal | Metric | Expected from Supabase | Actual API data path | Result |
| --- | --- | --- | --- | --- |
| G1 | Total Action Items | 48 | 48 | PASS |
| G1 | Done | 26 | 26 | PASS |
| G1 | In Progress | 12 | 12 | PASS |
| G1 | Not Yet Started | 10 | 10 | PASS |
| G1 | Completion | 54.2% | 54.2% | PASS |
| G2 | Total Action Items | 36 | 36 | PASS |
| G2 | Completion | 63.9% | 63.9% | PASS |
| G3 | Total Action Items | 12 | 12 | PASS |
| G3 | Completion | 58.3% | 58.3% | PASS |
| G4 | Total Action Items | 36 | 36 | PASS |
| G4 | Completion | 75.0% | 75.0% | PASS |

## Initiatives API

Endpoint example:

    GET /api/v1/goals/G1/initiatives

Source: fn_initiative_progress plus Initiative_master.

| Initiative | Expected Action Items | Actual API | Expected Completion | Actual API | Result |
| --- | --- | --- | --- | --- | --- |
| IN1 | 12 | 12 | 75.0% | 75.0% | PASS |
| IN2 | 12 | 12 | 58.3% | 58.3% | PASS |
| IN3 | 12 | 12 | 50.0% | 50.0% | PASS |
| IN5 | 12 | 12 | 33.3% | 33.3% | PASS |
| IN4 | 12 | 12 | 66.7% | 66.7% | PASS |
| IN6 | 12 | 12 | 41.7% | 41.7% | PASS |
| IN7 | 12 | 12 | 83.3% | 83.3% | PASS |
| IN8 | 12 | 12 | 58.3% | 58.3% | PASS |
| IN9 | 12 | 12 | 75.0% | 75.0% | PASS |
| IN10 | 12 | 12 | 100.0% | 100.0% | PASS |
| IN11 | 12 | 12 | 50.0% | 50.0% | PASS |

## Sub-Initiatives API

Endpoint example:

    GET /api/v1/goals/G1/initiatives/IN1/subinitiatives

Source: fn_subinitiative_progress.

Representative checks:

| Initiative | Sub-Initiative | Expected Done / Total | Actual API | Result |
| --- | --- | --- | --- | --- |
| IN1 | Culturally Responsive Teaching | 4 / 4 | 4 / 4 | PASS |
| IN1 | Instructional Coaching & Feedback | 4 / 4 | 4 / 4 | PASS |
| IN1 | Standards-Aligned Instructional Practice | 1 / 4 | 1 / 4 | PASS |
| IN4 | MTSS Data & Progress Monitoring | 4 / 4 | 4 / 4 | PASS |
| IN8 | Safe & Supportive School Climate | 3 / 4 | 3 / 4 | PASS |
| IN10 | Diverse Candidate Pipeline Development | 4 / 4 | 4 / 4 | PASS |
| IN11 | Structured Selection & Accountability | 0 / 4 | 0 / 4 | PASS |

The source currently contains 33 sub-initiative progress rows. Full-row automated comparison is the target for the live parity test suite.

## Feature API

Endpoint:

    GET /api/v1/features/{version}/{feature}

Source: is_feature_enabled.

Validation for each production feature will be performed over the HTTP runtime after deployment so the requested version and feature pair can be verified through the complete request path.

## Validation conclusion

The implemented API data path preserves the existing Supabase reporting calculations for the documented profile, goals, KPI, history, student-group, goal-progress, initiative and sub-initiative checks.

The remaining validation milestone is HTTP-runtime parity. After API V1 is deployed to an independent test host, this document should be extended with the deployment URL, HTTP status, response body snapshot or checksum, test timestamp and final PASS or FAIL for every endpoint. No StrategicPlan frontend cutover should occur before that validation is complete.
