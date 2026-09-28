# Strategic Plan Dashboard - Technical Architecture

Architecture version: V2.4 API Freeze
Freeze date: 28 Sep 2026
Product: Strategic Plan Dashboard

## 1. Release status

V2.4 API integration is functionally accepted and frozen. The existing Netlify V2.4 production deployment and its frozen source remain unchanged. The Vercel API architecture is a separate implementation path.

Known accepted limitation: the Vercel/API implementation has higher perceived latency than the direct Supabase V2.4 path. Performance optimization is intentionally deferred until after this freeze.

## 2. Current system architecture

Public/Admin browser flow:

```text
User browser
  -> Vercel frontend: React 19 + TypeScript + Vite
  -> same-origin /api/v1/* request
  -> Vercel rewrite
  -> StrategicPlan API V1 on Vercel
  -> Supabase PostgreSQL transaction pooler
  -> reporting tables/functions
  -> API JSON response
  -> React dashboard
```

AI flow:

```text
React
  -> StrategicPlan API V1
  -> Supabase district-ai Edge Function
  -> approved district data / AI context
  -> Ollama Cloud
  -> StrategicPlan API
  -> React
```

The AI Edge Function remains an interim server-side dependency. The browser does not call it directly.

## 3. Deployment topology

Frontend source branch: `v2.4-api-integration`.
Frontend host: Vercel.
Frontend project/domain: `k12matrix-strategicplan.vercel.app`.

API source branch: `api-v1`.
API host: Vercel.
API project: `strategicplan-apiv1`.
API base: `https://strategicplan-apiv1.vercel.app`.
API source root: `api-v1`.

Database: Supabase PostgreSQL.
Database access from API: PostgreSQL transaction pooler on port 6543 using the restricted `strategicuser_readonly` role for approved reads and SECURITY DEFINER RPCs for protected operations.

Legacy production: Netlify V2.4 remains untouched and must not be modified as part of this API freeze.

## 4. Frontend routing and API proxy

React uses BrowserRouter. Vercel must preserve API routing before the SPA fallback.

```json
{
  "rewrites": [
    {
      "source": "/api/v1/(.*)",
      "destination": "https://strategicplan-apiv1.vercel.app/api/v1/$1"
    },
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

The frontend API client uses same-origin paths. This keeps browser calls under `/api/v1` and lets Vercel proxy them to the API service.

## 5. Frontend architecture

Primary routes include Welcome, Summary, Goal pages, AI Assistant and Super Admin.

The browser no longer uses `@supabase/supabase-js` for dashboard/Admin/Super Admin data access in the API branch. `src/lib/supabase.ts` was removed. Application data access is centralized through `src/lib/api.ts` and API-backed dashboard services.

Admin sign-in, access logging, Super Admin configuration, goal deletion, logo updates and CSV bulk uploads use StrategicPlan API endpoints.

CSV upload supports Indicator and Initiative data. The UI validates template columns and file size before upload. Processing state is cleared after success or failure.

## 6. API V1

Public/read endpoints include:

- `GET /health`
- `GET /api/v1/bootstrap`
- `GET /api/v1/profile`
- `GET /api/v1/goals`
- `GET /api/v1/goals/{goal_id}/indicators`
- `GET /api/v1/indicators/{indicator_id}/history`
- `GET /api/v1/indicators/{indicator_id}/student-groups`
- `GET /api/v1/goals/{goal_id}/initiative-progress`
- `GET /api/v1/goals/{goal_id}/initiatives`
- `GET /api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives`
- `GET /api/v1/goals/{goal_id}/initiatives-full`
- `GET /api/v1/features/{version}/{feature}`
- `POST /api/v1/ai/ask`
- validation and diagnostics endpoints.

Admin/Super Admin endpoints include sign-in configuration, password login, OAuth start/callback, application sessions, logout, access logging, Super Admin login/configuration, goal deletion, logo update, OAuth secret update and Indicator/Initiative bulk upload.

## 7. Data and reporting

Authoritative PostgreSQL objects include District_Profile, Goal_master, Indicator_master, Indicator_Data, Initiative_master, Initiative_Data, Product_Feature_Flags, admin_users, User_Access_Log, AI_Conversation_Log, Super Admin sessions and Admin OAuth/session tables.

Reusable reporting objects include:

- `vw_indicator_reporting_normalized`
- `fn_goal_initiative_progress`
- `fn_initiative_progress`
- `fn_subinitiative_progress`
- `fn_indicator_key_values`
- `fn_indicator_year_history`
- `fn_indicator_student_groups`

KPI and initiative calculations remain centralized in PostgreSQL rather than duplicated in the browser.

Fund Balance is treated as Currency. Percentage formatting must only be applied to percentage indicators.

## 8. Authentication and authorization

Public dashboard reads are API-mediated.

Admin supports Userbased login plus dynamically configured Google or Microsoft SSO. District authentication settings are managed through Super Admin so provider configuration does not require a frontend code change or redeployment.

Super Admin uses server-created sessions. Protected configuration/write operations validate the session server-side and execute approved SECURITY DEFINER routines.

OAuth client secrets and service credentials must never be returned to the browser or committed to GitHub. Current OAuth secrets are server-readable from the database configuration layer; encryption-at-rest hardening remains future security work.

Known security-hardening backlog includes PKCE/nonce, stronger Microsoft ID-token verification, eliminating long-lived tokens from URLs, removing the legacy client-email SSO validation endpoint, and stronger OAuth secret storage.

## 9. Dynamic SSO

Super Admin can select the district Admin sign-in method and configure Google/Microsoft provider parameters. Public sign-in configuration exposes only safe metadata/configured state. Secrets are consumed server-side.

OAuth callbacks:

- Google: `/api/v1/auth/admin/oauth/google/callback`
- Microsoft: `/api/v1/auth/admin/oauth/microsoft/callback`

Provider-console callback registration remains an external one-time setup.

## 10. Security boundaries

The browser is untrusted. It does not receive database passwords, service-role keys, password hashes or OAuth client secrets.

The API uses a restricted database role. Protected mutations are performed through approved server-side functions rather than broad table-write grants.

The Supabase service-role credential remains backend-only where required. It must never be placed in Vite/browser environment variables.

## 11. Performance baseline and accepted limitation

The direct Supabase implementation is perceptibly faster than the Vercel API implementation. A database-side M-Step ELA generation test completed in approximately 0.009 seconds, indicating the underlying KPI SQL is fast.

Likely API-path latency contributors include serverless startup, network distance, PostgreSQL connection establishment, multiple API round trips and opening short-lived database connections.

Performance optimization is not part of this freeze. Future work should first instrument API database time and total request time, then optimize from measured results. Candidate improvements include composite endpoints such as bootstrap/goal dashboard responses, fewer database connections per page request, lazy Super Admin data loading and carefully evaluated connection reuse.

## 12. Validation status

API contract validation previously reached 54/54 passing checks for the public dashboard/API scope. Functional UI issues identified during migration were corrected, including Vercel SPA/API routing, Super Admin session validation and CSV upload processing-state reset.

The product owner accepted the API approach for freeze with the known performance gap.

## 13. Release discipline

Do not modify the Netlify V2.4 production path during Vercel/API optimization.

Frozen branches are immutable checkpoints. Any future performance, security or multi-district work must start from a new development branch created from the API freeze.

Secrets must remain outside source control. Database/schema changes must be versioned and reviewed.
