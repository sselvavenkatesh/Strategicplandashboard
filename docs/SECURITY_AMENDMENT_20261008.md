# Strategic Plan security amendment — 8 October 2026

Application baseline: frozen V2.4, 28e7fc15636490282b74d2e97db75b5fd839502a.
Header preview branch: security/v2.4-headers-20261008. No frontend components, chart code, CSS, calculations or login UI changed.

## Verified database findings and applied permission fix

The owner explicitly accepts public demo data. RLS was already enabled on all 14 public tables; explicit SELECT policies expose approved public rows. The report's named four SuperAdmin RPCs each validate the session token, expiry, active account and SuperAdmin role before writes. Their function definitions and browser EXECUTE access remain unchanged.

Applied Supabase migration: restrict_demo_write_grants_and_server_helpers.
- Removed unused direct INSERT/UPDATE/DELETE/TRUNCATE/REFERENCES/TRIGGER grants for PUBLIC, anon and authenticated on the six reporting tables.
- Preserved SELECT grants and all existing RLS policies, including public Role = All.
- Restricted get_server_oauth_secret(text) and create_admin_session(text) to backend service_role execution. They did not validate caller identity and were exposed by default function grants. Current V2.4 browser code and both active Edge Functions do not reference them.
- No row data, passwords, login behavior, stored session tokens or function bodies changed.
- Migration preconditions abort if RLS is missing or the inspected read-only policy model has changed; postconditions assert preserved reads and existing app RPC access.
- Catalog verification confirms no anonymous direct DML privileges on the six tables and no anon/authenticated helper execution; backend execution remains available.
- HTTP HEAD count checks return the original exposed demo counts: profile 1, goals 4, indicator master 7, indicator data 193, initiative master 11, initiative data 132. No row contents were extracted.
- Boolean-only inspection confirmed no Google/Microsoft OAuth secrets are currently stored; no secret values were accessed.

## App header policy

Netlify TOML adds CSP, X-Frame-Options DENY and a restrictive Permissions-Policy. CSP permits same-origin compiled scripts; inline styles required by React/Recharts; configured Supabase HTTPS/WSS for reads, login and AI; same-origin fonts and dynamic HTTPS/data/blob images. Dynamic district/goal images mean img-src is intentionally broader than a fixed host list. No unsafe-inline/eval permission is added for scripts.
OAuth navigations and resource links are navigations rather than fetches/frames; form-action self does not block Supabase OAuth redirects. Backend AI-provider connections are not browser connections.
Preserve existing SPA fallback and build configuration. If VITE_SUPABASE_URL changes, update connect-src for that deployment before publishing.
Production app headers are NOT deployed by this branch. Never merge to production without explicit approval.

## Remaining work and limits

This is targeted hardening, not a full authentication redesign or penetration-test guarantee. Other deliberately public SECURITY DEFINER endpoints require ongoing review. Login RPCs still lack a dedicated attempt limiter. validate_sso_admin accepts a supplied email; identity binding should be reviewed separately before using SSO with private records. Custom browser Admin sessionStorage state is not a database authorization boundary. A real multi-district rollout needs server-verified identity and tenant authorization, beyond this demo amendment.
Supabase advisors were run; do not claim all advisories cleared. Historical app build dependencies are unpinned and no lockfile is present in V2.4; dependency updates are excluded from this security-only change.
No real admin mutations, successful administrator login, real AI submission or provider SSO round-trip was performed in this review. Preserve frozen releases.

## Final verification status

The live Netlify demo loaded the district profile, four Welcome goals and populated Goal Summary/Key Indicators after permission hardening. No new app code was deployed to its production origin. Frontend build passes locally and on Vercel; the unrelated api-v1 preview fails because its API directory is not part of this frozen frontend branch, not because of a changed API.
Netlify app preview/header enforcement remains pending; the current account browser is not signed in. Do not equate the successful Vercel frontend preview with enforcement of netlify.toml headers. Before publishing, verify CSP on Netlify and check Welcome, Summary, Goal charts, dark/light themes, AI, valid/invalid login, SSO where configured, and SuperAdmin operations in an isolated test context.
Supabase remaining advisor groups: six private tables with no RLS policies (deny-all is intentional), one owner-privilege reporting view, and intentionally callable public/guarded RPC warnings. Advisor reference: https://supabase.com/docs/guides/database/database-linter?lint=0010_security_definer_view. Do not claim a clean overall security audit.
