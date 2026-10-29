# Strategic Plan Dashboard — V2.5 REST API

Updated 29 October 2026. Application V2.5; HTTP namespace `/api/v1`, runtime API version `1.0.0`. This documents the implementation, including known limitations, rather than certifying it for production.

- [All 51 registered operations, parameters and exact request schemas](API_ROUTE_INVENTORY.md)
- [OpenAPI JSON for Swagger/Postman import](openapi-v2.5.json)
- [Security architecture review and release blockers](../../docs/V2.5_SECURITY_ARCHITECTURE_REVIEW.md)
- [Validation status](API_VALIDATION_REPORT.md)

## Locations and security contract

Preview origin: `https://strategicplan-v25-preview-sselvavenkatesh.vercel.app`. Append routes below. The branded `/strategic-plan/demo/api/v1/...` prefix also reaches FastAPI. Vercel deployment protection can require authentication before application login. Production V2.4 has not been promoted to this implementation.

Locally run `uvicorn app.main:app --app-dir api-v1 --reload` with server-side database configuration. `/docs`, `/openapi.json` and `/health` work on a directly served API; the combined preview's SPA rewrites do not explicitly expose these paths. Import the committed OpenAPI file instead of assuming those URLs work on the preview hostname.

Modern Admin and Super Admin use separate opaque cookies: `strategic_admin_session` and `strategic_superadmin_session`. Login sets Secure, HttpOnly, SameSite=Strict, Path=/ cookies with an eight-hour browser lifetime; server expiry/revocation also applies. Modern login JSON contains identity, never the session token. Use same-origin HTTPS requests and `credentials: 'same-origin'`. Do not put tokens/credentials in URLs, browser storage or frontend environment variables. Writes check Origin when supplied; the guard is not a complete standalone CSRF protection. Current CORS does not support credentialed cross-origin integrations.

Cookie checks are manual in handlers. The committed OpenAPI adds security annotations without changing runtime behavior. Many responses are untyped at runtime, so generated response schemas remain generic; use the field summaries and source as well. Full request schemas are in the inventory.

## Public dashboard

Paths below begin with `/api/v1`. These reporting routes remain public even when called by an Admin; authenticated private content belongs in workspace APIs.

| Function | GET route | Inputs and main output |
| --- | --- | --- |
| First page load | `/bootstrap` | `{profile,goals}` |
| District profile | `/profile` | districtId, districtName, planName, duration, subText, totalGoals, mission, vision, logo, planImage |
| Goals | `/goals` | Array: id, name, description, totalIndicators, totalInitiatives |
| Latest indicators | `/goals/{goal_id}/indicators` | Optional `school`; id/name/shortName, value/numeric, previous/variance/year, nature, isPercent/isCurrency/type |
| History | `/indicators/{indicator_id}/history` | Optional `school`; yearly values and statewide reference |
| Student groups | `/indicators/{indicator_id}/student-groups` | Required `school_year`, optional `school`; category/group values and statewide comparison |
| Target | `/indicators/{indicator_id}/target` | Required `school_year`, optional boolean `preview=false`; `{target:number or null}`; overlay falls back to real exact-year target |
| Achievement | `/achievement` | Optional boolean `preview=false`; database achievement-summary JSON |
| Goal initiative progress | `/goals/{goal_id}/initiative-progress` | Optional `school`; action counts and status percentages |
| Initiative progress | `/goals/{goal_id}/initiatives` | Optional `school`; initiative_id/name/short_name, counts and completion_percent |
| Sub-initiatives | `/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives` | Optional `school`; names and status counts |
| Full initiative panel | `/goals/{goal_id}/initiatives-full` | id/name/shortName, done/inProgress/notStarted counts, completion percentage, dates, totalActionItems, subInitiatives |
| Friendly indicator labels | `/indicator-labels` | Array of `{id,name}` |
| Feature switch | `/features/{version}/{feature}` | `{version,feature,enabled}` |
| Preview data | `/preview/dataset` | Public prototype dataset; 404 if disabled; not an Admin API |
| Sign-in providers | `/admin/signin-config` | districtId, signinMethod and Google/Microsoft readiness; no secrets |

Public visibility is intended to require a public reporting row, public master and public parent Goal. The security fix now enforces parent/master/row visibility in public RLS, normalized reporting and initiative functions. Database regression checks cover direct tables/RPCs and reporting calculations; see SEC-01/02 remediation evidence in the security review. Missing/private data may return an empty array or null rather than 404.

`POST /api/v1/access-log` accepts the AccessLog schema and returns 204. It is best-effort client telemetry. Submitted names, roles and email addresses are not trusted authentication evidence.

## Admin workspace

| Method / route | Contract |
| --- | --- |
| `POST /api/v1/admin/login` | `{email,password}` → `{id,name,email}` and Admin cookie |
| `GET /api/v1/admin/session` | Validated active Admin identity |
| `GET /api/v1/admin/workspace` | Revisioned snapshot with profile, Goals, masters, reporting rows and assignment/access metadata |
| `POST /api/v1/admin/workspace` | `{revision,kind,rows}` → refreshed workspace after transactional save |
| `POST /api/v1/admin/logout` | Revoke session, clear cookie, 204 |

`kind` is `indicators` or `initiatives`. Use the 32-character revision from the latest snapshot, then replace it with the returned revision after saving. Stale snapshots return 409. Up to 5,000 rows and 3 MB serialized reporting payload are checked after JSON parsing. Preserve canonical database-facing column names and stable reporting-row identity from the snapshot so edits update the original row.

Admins can view district masters, including private masters. Reporting edits/uploads require assignments. Goal assignments inherit by default; explicit Indicator/Initiative restrictions narrow access. Configuration, master definitions, assignments and users are Super Admin-only. Database functions validate permissions again; UI controls are not authorization.

CSV parsing/name normalization and template download happen in React; there is no separate multipart upload API. Users need not provide master IDs in CSV. The frontend maps names to available masters and submits JSON; unmatched/unassigned items are rejected. API clients must preserve returned canonical columns and stable row identity instead of guessing a CSV schema.

## Super Admin workspace

| Method / route | Contract |
| --- | --- |
| `POST /api/v1/superadmin/login` | `{email,password}` → `{id,name,email}` and Super Admin cookie |
| `GET /api/v1/superadmin/session` | Validated Super Admin identity |
| `GET /api/v1/superadmin/workspace` | Full revisioned district workspace |
| `POST /api/v1/superadmin/workspace` | `{revision,change}` → refreshed workspace |
| `GET /api/v1/superadmin/users` | User list and revision; no password hashes |
| `POST /api/v1/superadmin/users` | `{revision,user}` → refreshed users/revision |
| `GET /api/v1/superadmin/sso-settings` | Readiness, saved-secret flags, callback URLs; no secret values |
| `POST /api/v1/superadmin/sso-settings` | `{googleSecret?,microsoftSecret?}`; blank retains stored value |
| `GET /api/v1/superadmin/ai-settings` | Model and saved-key status; no key value |
| `POST /api/v1/superadmin/ai-settings` | `{model,apiKey?}`; blank key retains existing key |
| `POST /api/v1/superadmin/logout` | Revoke session, clear cookie, 204 |

Workspace `change` structures used by the client:

```json
{"action":"configuration","profile":{},"goals":[],"owners":{}}
{"action":"masters","kind":"indicators","records":[],"owners":{}}
{"action":"masters","kind":"initiatives","records":[],"owners":{},"create":true,"dataRows":[]}
{"action":"reporting","kind":"indicators","dataRows":[]}
{"action":"delete_goal","goalId":"<selected-goal-id>"}
```

These are structural examples, not safe empty replacement payloads. Load the current workspace, preserve relevant existing fields, and submit the intended section with its latest revision. Configuration covers branding/logo, Goal count/names/privacy and owners. Masters cover names, short names, alignment/privacy and assignments. Reporting covers actuals, targets, dates, status and action items. The database validates changes; the UI warns before Goal deletion.

User fields: `id`, `name`, `email`, `googleEmail`, `microsoftEmail`, `active`, `password`. Omit ID for a new user and preserve returned ID for edits. Password is write-only. Provider client IDs/tenant metadata are configuration fields; confidential secrets use `/sso-settings`. Client IDs are not secrets. Sensitive validation errors are redacted for user, SSO-secret and AI-key saves.

## AI

`GET /api/v1/ai/status` → `{"nativeReady":true}` if a district key is stored. This is configuration readiness, not a provider health check.

`POST /api/v1/ai/ask` accepts:

```json
{"question":"How are district initiatives progressing?","sessionId":"<optional-conversation-uuid>"}
```

Question: 3–1,200 characters. sessionId: at most 100 characters. Unknown fields rejected. Response includes `answer`, `sources`; model calls also return `timings`, `modelMetrics`; scope rejection includes `outOfScope:true`. Plain-text answers retain the original prompt/model settings but are not deterministic.

No cookie means public context. Validated Admin/Super Admin cookies permit private strategic content, independent of edit assignments. Invalid supplied cookies return 401. Body fields cannot request private scope or another district. Account records, keys and previous conversation logs are excluded from model input. Provider URL is fixed, timeout 90 seconds, keys stay server-side after submission, and no shared answer cache is used. Conversation logs require a retention policy. The owner saved a key and confirmed responses on 29 October; this review did not capture a browser network trace.

## OAuth, legacy and diagnostic routes

Admin Google/Microsoft use `GET /api/v1/auth/admin/oauth/{provider}/start?return_to=...` and `/callback?code=...&state=...`. Provider registration must use the server callback, not a React page. Start accepts only the same-origin `/admin` or `/strategic-plan/demo/admin` return path, with no query/fragment. A ten-minute host-only Secure/HttpOnly/SameSite=Lax initiation cookie binds state to that browser. Both providers use S256 PKCE. Callback rechecks the destination and consumes one-use database state, then issues an HttpOnly Admin cookie; session tokens are never put in redirect URLs. Public database roles cannot create or consume OAuth state. Existing callback URLs remain unchanged. Starting another flow for the same provider replaces the pending browser proof; restart sign-in after an expired attempt.

Other registered compatibility paths: `/auth/admin/login`, `/auth/admin/session`, `/auth/admin/logout`, `/superadmin/configuration`, `/superadmin/goals/{goal_id}`, `/superadmin/logo`, `/superadmin/oauth-secrets`, `/superadmin/indicators/bulk`, `/superadmin/initiatives/bulk`. Exact methods, query tokens and bodies appear in the inventory. Token-based Admin login/session/logout and Super Admin configuration GET are retired with HTTP 410, without database access. Their replacement is the cookie workspace contract. Other legacy Super Admin writes return 503 by default with `DATA_WRITES_ENABLED=false`; modern workspace/user/settings writes intentionally bypass that legacy flag. Email-only `POST /auth/admin/sso/validate` is retired with 410.

`GET /api/v1/validation` and `/validation` are disabled unless diagnostics are explicitly enabled. `/health` reports process/API/write-flag state, not full database/provider health.

## Errors, limits and maintenance

Errors normally use `{"detail":"message"}`; Pydantic validation can use a detail array. Common statuses: 401 invalid/expired authentication, 403 wrong origin/unassigned edit, 404 disabled/missing feature, 409 stale revision/duplicate key, 413 post-parse size limit, 422 validation/business rule, 502 AI provider failure, 503 unavailable storage/configuration or gated legacy write. Logout/telemetry return 204 without JSON.

No application limiter exists for login, AI or telemetry. Upstream limits/WAF settings need separate verification. This is a single-district implementation, with fail-closed credential resolution for ambiguous district selection; schema-per-district authorization is not implemented.

Regenerate inventory/OpenAPI: `python api-v1/scripts/export_api_docs.py` with API dependencies installed; no database connection required. Add typed response models and explicit authentication dependencies next. PostgreSQL portability does not automatically migrate Supabase Vault/auth contracts.
