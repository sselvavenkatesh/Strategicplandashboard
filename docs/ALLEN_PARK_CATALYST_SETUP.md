# Allen Park Catalyst demonstration setup

Date: 31 October 2026. Riverside V2.5 remains frozen.

## Source and deployments

Keep one shared product repository. `feature/allenpark-catalyst` is a temporary development branch, not a permanent district fork. District configuration, database credentials and release selection belong to each deployment.

Catalyst project: `AllenPark-StrategicPlan` (`76801000000059001`).
AppSail service: `allenpark-api` (`76801000000059025`), Python 3.12, 512 MB.

Development endpoint: https://allenpark-api-10137622481.development.catalystappsail.com

The runtime health endpoint and the deployed React Super Admin sign-in screen were verified. Database connectivity and authenticated browser workflows are not yet verified.

The demo packaging serves the compiled React build and FastAPI under one AppSail origin. This preserves secure, HttpOnly session cookies and provider callbacks without cross-site cookie changes. Slate was inspected but no Slate app was deployed. The optional Slate proxy draft was discarded. No application business logic was moved out of Python FastAPI.

The approved custom domain `allenpark.k12matrix.com` is not mapped yet. Do not advertise it as live.

## Database provisioning completed

Applied migration: `allenpark_isolated_demo_schema`.
Schema: `district_allen_park`.
Database role: `allenpark_api`, currently NOLOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS.

Copied business data only:

| Data | Rows |
| --- | ---: |
| Goals | 4 |
| Indicator masters | 7 |
| Initiative masters | 11 |
| Indicator reporting rows | 193 |
| Initiative action rows | 132 |

Reporting functions, the normalization view, indexes, constraints and independent identity sequences were created in the district schema. Local foreign keys point to local tables. Supabase Auth coupling was omitted because the application uses FastAPI account sessions. Stakeholder IDs were cleared; assignments require Allen Park users.

Profile name is Allen Park Public Schools; subtext identifies demonstration data. Mission and vision remain Riverside-derived sample content pending district content approval.

No users, password hashes, sessions, assignments, OAuth state, provider credentials, secret IDs, conversation logs, access logs or quota counters were copied. SSO and AI configuration start empty.

The schema is not exposed to browser Data APIs. Anonymous/authenticated schema access and function execution are revoked. RLS is enabled on all local tables. The API role receives SELECT policies for reporting tables and server-only execution of the district functions; it has no direct user/configuration table reads or reporting table writes.

## Verification completed

- New role can select Allen Park indicator reporting; it cannot select Riverside indicator reporting.
- Zero cloned functions and foreign keys reference Riverside public objects.
- Business row counts in Riverside remain unchanged.
- Admin SQL transaction QA passed: assignments, inherited access, edits, uploads, persistence, unauthorized batch rejection and sessions. All fixtures rolled back.
- Super Admin SQL transaction QA passed: login, configuration, assignments, master creation, edits, privacy, conflicts, deletion restrictions and logout. All fixtures rolled back.
- Backend tests: 97 passed, 19 opt-in tests skipped. One upstream TestClient deprecation warning.
- React TypeScript checks and production build passed; layout/component source unchanged.

## Required server environment

Configure only AppSail server environment, never a VITE variable or frontend bundle:

| Variable | Value |
| --- | --- |
| DATABASE_URL | New Allen Park-only PostgreSQL credential; not created/stored yet |
| DISTRICT_SCHEMA | district_allen_park |
| PUBLIC_APP_ORIGIN | Exact verified deployment origin; update on domain cutover |
| PUBLIC_APP_BASE_PATH | / |
| DATA_WRITES_ENABLED | true after database connection verification |
| ABUSE_CONTROLS_ENABLED | true after database connection verification |
| ENABLE_DIAGNOSTICS | false |

The connection search path is configured on PostgreSQL connection startup. It is never selected by request headers, query parameters or browser storage. Existing SQL callers use that deployment-specific schema. Copied function bodies are explicitly schema-qualified.

AppSail has not been given a database credential. Browser policy requires action-time confirmation before granting a newly hosted backend database access. Obtain that confirmation for this exact project/service. Separately decide how to bootstrap `selva@k12matrix.com`: reuse only that owner's existing hash server-side after explicit authorization, or establish a fresh password through an approved secure flow. Never print a credential/hash or copy other district accounts.

## Remaining before a usable demo URL

1. Approve and store the new isolated DB credential in the named AppSail service and configure the non-secret settings above.
2. Bootstrap the platform owner account; create district Admin accounts and assignments through Super Admin.
3. Deploy the final source package with the origin restriction and verify live database reads, public privacy filtering, authenticated saves/reloads, uploads and session isolation.
4. Configure Allen Park-specific Google callback and AI key, then verify their flows. No Riverside provider key fallback is permitted.
5. Map/verify the approved custom domain and SSL; update canonical origin and provider callback registration together.
6. Monitor Catalyst usage. No plan upgrade or new subscription was purchased.

## Reproducibility

`provisioning/allenpark.sql` documents the one-time schema copy. It intentionally fails if the schema or role already exists. Do not rerun against the current provisioned schema, remove these guards, overwrite Riverside, or treat this district-specific demonstration script as a finished generic installer.

Build React with the existing dependency lockfile (`npm ci`, `npx tsc -b`, `npx vite build`). For AppSail, package `api-v1/app`, `api-v1/run_catalyst.py`, compiled `dist`, and Python 3.12 Linux dependencies from the root `requirements.txt`. Use `python3 -u run_catalyst.py` as startup command. Never include environment files, credentials or test fixtures in the archive.
