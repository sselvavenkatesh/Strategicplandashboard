# Allen Park Catalyst demonstration setup

Date: 31 October 2026. Riverside V2.5 remains frozen.

## Source and deployments

Keep one shared product repository. `feature/allenpark-catalyst` is a temporary development branch, not a permanent district fork. District configuration, database credentials and release selection belong to each deployment.

Catalyst project: `AllenPark-StrategicPlan` (`76801000000059001`).
AppSail service: `allenpark-api` (`76801000000059025`), Python 3.12, 512 MB.

Development endpoint: https://allenpark-api-10137622481.development.catalystappsail.com

The runtime health endpoint, live database reads, public welcome/summary pages and React sign-in screen are verified. The write flag was explicitly approved and enabled; a full browser save using the owner password has not been claimed as verified.

The demo packaging serves the compiled React build and FastAPI under one AppSail origin. This preserves secure, HttpOnly session cookies and provider callbacks without cross-site cookie changes. Slate was inspected but no Slate app was deployed. The optional Slate proxy draft was discarded. No application business logic was moved out of Python FastAPI.

The approved custom domain `allenpark.k12matrix.com` is not mapped yet. Do not advertise it as live.

## Database provisioning completed

Applied migration: `allenpark_isolated_demo_schema`.
Schema: `district_allen_park`.
Database role: `allenpark_api`, LOGIN, NOINHERIT, NOSUPERUSER, NOBYPASSRLS.

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

The initial copy excluded users, password hashes, sessions, assignments, OAuth state, provider credentials, secret IDs, conversation logs, access logs and quota counters. After explicit owner approval, only the active `selva@k12matrix.com` SuperAdmin account was created using a database-side hash copy. Hash equality was verified as a boolean; no hash or password was retrieved or displayed. SSO and AI configuration remain empty.

The schema is not exposed to browser Data APIs. Anonymous/authenticated schema access and function execution are revoked. RLS is enabled on all local tables. The API role receives SELECT policies for reporting tables and server-only execution of the district functions; it has no direct user/configuration table reads or reporting table writes.

## Verification completed

- New role can select Allen Park indicator reporting; it cannot select Riverside indicator reporting.
- Zero cloned functions and foreign keys reference Riverside public objects.
- Business row counts in Riverside remain unchanged.
- Admin SQL transaction QA passed: assignments, inherited access, edits, uploads, persistence, unauthorized batch rejection and sessions. All fixtures rolled back.
- Super Admin SQL transaction QA passed: login, configuration, assignments, master creation, edits, privacy, conflicts, deletion restrictions and logout. All fixtures rolled back.
- Backend tests: 98 passed, 19 opt-in tests skipped. One upstream TestClient deprecation warning.
- React TypeScript checks and production build passed; layout/component source unchanged.

## Required server environment

Configure only AppSail server environment, never a VITE variable or frontend bundle:

| Variable | Value |
| --- | --- |
| DATABASE_URL | Saved in the AppSail server environment; new Allen Park-only credential |
| DISTRICT_SCHEMA | district_allen_park |
| PUBLIC_APP_ORIGIN | Exact verified deployment origin; update on domain cutover |
| PUBLIC_APP_BASE_PATH | / |
| DATA_WRITES_ENABLED | true; explicitly approved and enabled |
| ABUSE_CONTROLS_ENABLED | true, configured |
| ENABLE_DIAGNOSTICS | false |

The connection search path is configured on PostgreSQL connection startup. It is never selected by request headers, query parameters or browser storage. Existing SQL callers use that deployment-specific schema. Copied function bodies are explicitly schema-qualified.

The owner explicitly approved credential storage in this exact Catalyst project and service. A new credential was generated for `allenpark_api` and saved only in AppSail server configuration. The verified shared pooler is `aws-0-ap-northeast-1.pooler.supabase.com:6543`; the pooler username includes the project ref. The direct IPv6 connection failed in AppSail; the existing pooler route succeeded without modifying Riverside. No connection string or password is committed.

Automatic approval review rejected setting `DATA_WRITES_ENABLED=true`: it treated persistent authenticated database writes as requiring separate explicit approval. The flag remained disabled until the owner subsequently explicitly approved `DATA_WRITES_ENABLED=true`; it is now enabled. New district deployments now enforce this flag on all Admin/Super Admin business mutation routes, including workspace, users, SSO and AI settings. Login/logout and reads remain available. The public-schema deployment keeps its existing behavior; Riverside is pinned to its prior release.

Live public dataset verification: 4 goals, 7 indicators, 193 indicator rows, 10 public initiatives and 120 public action rows. Private IN1 is excluded. Copied target overlays were restored by building with `VITE_ACHIEVEMENT_PREVIEW=true`; verified overall achievement is 57% (4 of 7), ELA 39.53% with target 38%, and graduation 84.4% with target 90%.

## Remaining activation and district configuration

The Catalyst development demo URL is live for viewing. Public, Admin and SuperAdmin React routes are deployed. The approved custom domain is not mapped yet.

1. Completed: explicit approval received and `DATA_WRITES_ENABLED=true` enabled only for this Allen Park service.
2. Owner can validate authenticated saves/reloads and uploads using the existing password. Database transaction QA has passed; full owner-password browser authentication has not been claimed as verified.
3. Create district Admin accounts and assignments through Super Admin. Other Riverside users were not copied.
4. Configure Allen Park-specific Google callback and AI key, then verify their flows. No Riverside provider key fallback is permitted.
5. Map/verify the approved custom domain and SSL; update canonical origin and provider callback registration together.
6. Monitor Catalyst usage. No plan upgrade or new subscription was purchased.

## Reproducibility

`provisioning/allenpark.sql` documents the one-time schema copy. It intentionally fails if the schema or role already exists. Do not rerun against the current provisioned schema, remove these guards, overwrite Riverside, or treat this district-specific demonstration script as a finished generic installer.

Build React with the existing dependency lockfile (`npm ci`, `npx tsc -b`, `VITE_ACHIEVEMENT_PREVIEW=true npx vite build`). For AppSail, package `api-v1/app`, `api-v1/run_catalyst.py`, compiled `dist`, and Python 3.12 Linux dependencies from the root `requirements.txt`. Use `python3 -u run_catalyst.py` as startup command. Never include environment files, credentials or test fixtures in the archive.

## Browser-session blank-page safeguards

The owner reported a blank normal-browser window and confirmed the same URL worked in Incognito. A fresh agent browser also loaded the welcome page without an application console error. The exact failing normal-browser exception was not captured; cache or browser-storage state is an inference, not a proven single cause.

Unguarded localStorage/sessionStorage accesses were found in theme initialization and optional access telemetry. Storage access now fails safely, invalid stored theme values fall back to the default, and a top-level React recovery screen prevents runtime render errors from leaving an empty background. The initial HTML also includes a visible loading state. The Python static host sends no-store for all HTML entry routes and immutable caching for hashed assets. Successful dashboard layout and authorization are unchanged.

Validation: blocked-storage rendering/effect regression test passed; frontend TypeScript and Vite build passed; four focused backend tests passed, including HTML cache headers and district write isolation. These changes are deployed only to Allen Park; Riverside V2.5 remains frozen. A normal-browser hard refresh may be needed once to replace previously cached HTML.

## Allen Park public branding

The public shell identifies the Allen Park profile by district ID and applies an isolated forest-green palette. The supplied logo is displayed unchanged on a compact white panel. Welcome uses an official Allen Park High School exterior photograph with a dark green contrast overlay; asset provenance is in `public/districts/allen-park/ASSETS.md`. Existing layout, welcome text placement, goal icons, and optional goal/mission/vision placement are retained. Buttons and achievement accents use green; progress status colors retain their meanings. Branding is removed when the public shell unmounts, so Admin and Super Admin keep the standard theme.

Only the Allen Park profile logo and strategic-plan image paths were updated in the database. Sample goals and metrics were not changed. Riverside was not deployed or modified.

Validation: TypeScript, Vite production build with achievement overlays, 52 existing Node tests and whitespace checks passed. Live public welcome branding and summary achievement styling were checked after deployment.
