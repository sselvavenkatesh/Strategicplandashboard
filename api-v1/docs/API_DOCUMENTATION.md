# StrategicPlan API V1 Documentation

Version: 1.0.0
Status: Development
License: MIT
Base path: /api/v1

## Purpose

StrategicPlan API V1 provides a vendor-neutral REST interface for the existing StrategicPlan dashboard data. The current implementation connects directly to PostgreSQL with a read-only account and deliberately does not use the Supabase JavaScript SDK or Supabase REST API.

The first database is the existing Supabase PostgreSQL database. The HTTP contract is designed to remain stable if the PostgreSQL database is later moved to another provider.

## Calling the API

When running locally the default application URL is typically:

    http://localhost:8000

Interactive OpenAPI documentation:

    GET /docs

OpenAPI JSON:

    GET /openapi.json

Example with curl:

    curl http://localhost:8000/api/v1/goals

Example with JavaScript:

    const response = await fetch("http://localhost:8000/api/v1/goals");
    const goals = await response.json();

No production API hostname has been assigned yet. Do not use the V2.4 dashboard URL as the API URL.

## Endpoints

### GET /health

Purpose: Confirms that the StrategicPlan API process is running.

Example:

    GET /health

Response:

    {
      "status": "ok",
      "apiVersion": "1.0.0"
    }

### GET /api/v1/profile

Purpose: Returns district and strategic-plan profile information used by the dashboard header and overview.

Parameters: None.

Example:

    GET /api/v1/profile

Important response fields: districtId, districtName, planName, duration, subText, totalGoals, mission, vision, logo, planImage.

### GET /api/v1/goals

Purpose: Returns all public strategic-plan goals and their configured indicator and initiative counts.

Parameters: None.

Example:

    GET /api/v1/goals

Response contains: id, name, description, totalIndicators, totalInitiatives.

### GET /api/v1/goals/{goal_id}/indicators

Purpose: Returns the indicators belonging to a goal together with the latest KPI value, latest year, prior-year value and variance.

Path parameter:

    goal_id

Optional query parameter:

    school

Example:

    GET /api/v1/goals/G1/indicators

School-filtered example:

    GET /api/v1/goals/G1/indicators?school=Example%20High%20School

Important response fields: id, name, shortName, value, numeric, previous, variance, year, nature, isPercent, type.

### GET /api/v1/indicators/{indicator_id}/history

Purpose: Returns the historical KPI series for an indicator, including the same-year statewide reference where available.

Path parameter:

    indicator_id

Optional query parameter:

    school

Example:

    GET /api/v1/indicators/ID2/history

Important response fields include school_year, value_3_display, value_3_numeric, statewide_value_3_display and statewide_value_3_numeric.

### GET /api/v1/indicators/{indicator_id}/student-groups

Purpose: Returns a KPI broken down by student group for a selected school year. The response also carries the statewide benchmark used as the chart reference.

Path parameter:

    indicator_id

Required query parameter:

    school_year

Optional query parameter:

    school

Example:

    GET /api/v1/indicators/ID2/student-groups?school_year=2025-26

Example result records include All Students, Asian, Black or African American, English Learners, Hispanic of Any Race, Students With Disabilities, Two or More Races and White when those groups exist in source data.

### GET /api/v1/goals/{goal_id}/initiative-progress

Purpose: Returns aggregate action-item status and completion percentages for a goal.

Path parameter:

    goal_id

Optional query parameter:

    school

Example:

    GET /api/v1/goals/G1/initiative-progress

Important response fields: total_action_items, done_count, in_progress_count, not_yet_started_count, done_percent, in_progress_percent, not_yet_started_percent.

### GET /api/v1/goals/{goal_id}/initiatives

Purpose: Returns each initiative under a goal with its action-item counts and completion percentage.

Path parameter:

    goal_id

Optional query parameter:

    school

Example:

    GET /api/v1/goals/G1/initiatives

Important response fields include initiative_id, initiative_name, total_action_items, done_count, completion_percent and short_name.

### GET /api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives

Purpose: Returns sub-initiative level progress and status counts.

Path parameters:

    goal_id
    initiative_id

Optional query parameter:

    school

Example:

    GET /api/v1/goals/G1/initiatives/IN1/subinitiatives

Important response fields include sub_initiative_name, total_action_items, done_count, in_progress_count and not_yet_started_count.

### GET /api/v1/features/{version}/{feature}

Purpose: Returns whether a version-controlled StrategicPlan feature is enabled.

Path parameters:

    version
    feature

Example:

    GET /api/v1/features/2.4/ai_assistant

Response shape:

    {
      "version": "2.4",
      "feature": "ai_assistant",
      "enabled": true
    }

## Data source mapping

Profile maps to District_Profile.

Goals map to Goal_master.

Latest KPI values map to fn_indicator_key_values.

KPI history maps to fn_indicator_year_history.

Student-group values map to fn_indicator_student_groups.

Goal progress maps to fn_goal_initiative_progress.

Initiative progress maps to fn_initiative_progress.

Sub-initiative progress maps to fn_subinitiative_progress.

Feature enablement maps to is_feature_enabled.

This mapping is intentional for V1. It keeps the existing tested business calculations while replacing the Supabase-specific HTTP interface with a StrategicPlan-owned REST contract.

## Security

The API must use a dedicated read-only PostgreSQL role. Database passwords must be supplied as environment variables and must never be committed to GitHub. The postgres owner account and Supabase service-role credential must not be used by this reporting API.

## Portability

Because the application connects through PostgreSQL, the same API can later be pointed at another PostgreSQL-compatible hosting provider after the StrategicPlan schema and reporting functions have been migrated. The API consumer should not need to change endpoint URLs or response contracts because of a database-provider migration.
