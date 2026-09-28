# Deploy StrategicPlan API V1 to Vercel

This deployment is independent from the StrategicPlan V2.4 frontend.

## Git source

Repository: sselvavenkatesh/Strategicplandashboard

Branch: api-v1

Vercel Root Directory: api-v1

Do not configure react-dashboard as the API project's production branch.

## Runtime

Python 3.12 or later is declared in pyproject.toml.

Vercel entry point:

    api/index.py

It imports the provider-neutral FastAPI application from:

    app/main.py

No API route logic is duplicated in the Vercel entry point.

## Required environment variable

Configure this in Vercel Project Settings. Never commit the real value.

    DATABASE_URL

Use a dedicated read-only PostgreSQL connection string with SSL enabled.

Optional variables:

    API_TITLE=StrategicPlan API
    API_VERSION=1.0.0
    CORS_ORIGINS=https://your-test-client.example

For API-only testing, CORS does not affect curl, Swagger, or server-to-server calls.

## Database lifecycle

The V1 Vercel configuration uses a short-lived PostgreSQL connection for each
repository operation and closes it automatically afterward. It intentionally
does not keep a Python process-level database pool alive across Vercel function
suspension.

This changes infrastructure connection management only. Repository SQL,
reporting functions, endpoint paths and response mappings are unchanged.

## Post-deployment smoke tests

Replace API_HOST with the Vercel deployment hostname.

    curl https://API_HOST/health
    curl https://API_HOST/api/v1/profile
    curl https://API_HOST/api/v1/goals
    curl https://API_HOST/api/v1/goals/G1/indicators
    curl https://API_HOST/api/v1/indicators/ID2/history
    curl "https://API_HOST/api/v1/indicators/ID2/student-groups?school_year=2025-26"
    curl https://API_HOST/api/v1/goals/G1/initiative-progress
    curl https://API_HOST/api/v1/goals/G1/initiatives
    curl https://API_HOST/api/v1/goals/G1/initiatives/IN1/subinitiatives

Interactive API documentation:

    https://API_HOST/docs

## Regression rule

Do not connect the V2.4 frontend to this deployment during V1 validation.
The deployed API must first pass the HTTP parity report against the existing
Supabase outputs.
