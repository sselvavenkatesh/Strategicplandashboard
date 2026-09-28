# StrategicPlan API V1

Open-source, provider-neutral REST API for the District 360 Strategic Plan Dashboard.

## Design goals

The API application depends on PostgreSQL, not the Supabase JavaScript SDK or
PostgREST. Today it can read the existing Supabase PostgreSQL database. Later
the same service can point at AWS RDS/Aurora PostgreSQL, Azure Database for
PostgreSQL, or another compatible PostgreSQL host.

V1 deliberately reuses the existing reporting functions in PostgreSQL so the
business rules stay identical while the HTTP contract becomes independent.

## Endpoints

Profile, goals, latest indicators, indicator history, student groups, goal
initiative progress, initiatives, subinitiatives, and feature flags are exposed
under /api/v1.

Interactive OpenAPI documentation is available at /docs when the service runs.

## Local run

Create a Python 3.11+ virtual environment, install the project with the test
extra, copy .env.example to .env, and set DATABASE_URL to a read-only database
role. Never commit a real password.

Run:

    uvicorn app.main:app --reload

## Validation

Run:

    pytest

test_contract.py validates the HTTP surface. test_parity_live.py checks known
production KPI outputs through the new API.

Current verified baseline includes:

M-Step ELA 2022-23 = 43.00%
M-Step Math 2022-23 = 33.00%
M-Step ELA latest 2025-26 = 39.53%
M-Step Math latest 2025-26 = 34.42%
SAT latest 2025-26 = 673
Freshmen on Track latest 2025-26 = 97.45%
Graduation Rate latest 2024-25 = 84.4%
Chronic Absenteeism latest 2025-26 = 23.32%
Fund Balance latest 2024-25 = $19,248,186

## Security

Use a dedicated read-only PostgreSQL account for this public reporting service.
Do not use the postgres owner, Supabase service role, or any admin credential.

## License

MIT.
