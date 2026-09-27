# Strategic Plan Dashboard

K-12 school-district strategic-plan dashboard built with React, TypeScript and Supabase.

## Current release — V2.2

**V2.2 is the frozen product baseline as of 27 Sep 2026.** It includes the approved public-facing dashboard, existing Admin sign-in experience, and the V2.2 Super Admin module at `/superadmin`.

### Included experiences

- Public dashboard: Welcome, Summary, Goal-specific pages, Initiative Detail and Indicator Detail.
- Dark/light themes, scalable Goal presentation, dynamic Goal navigation, Key Resources and Supabase-backed KPI/Initiative reporting.
- Existing Admin sign-in and Public/Admin-aware data visibility.
- Super Admin: Home counts, Strategic Plan configuration, editable Goal Master, distinct Goal-name validation, guarded Goal deletion, district-logo management, Admin sign-in method configuration, Google/Microsoft SSO configuration foundation, Indicator/Initiative data review, and Initiative pagination.
- Super Admin CRUD feedback uses push-style notifications and destructive Goal deletion requires confirmation.
- Indicator/Initiative CSV write/upload remains protected until the full validation/write path is completed.

## Release branches

- `v2.2` — frozen V2.2 release branch. Do not use for new feature development.
- `v2.1-frozen` — prior frozen public-dashboard baseline.
- `react-dashboard` — established React integration lineage.
- `main` — repository default/history.

New development must start from the frozen V2.2 release baseline on a new version branch. Do not modify frozen release branches for feature work.

## Technology

- React + TypeScript + Vite
- Supabase PostgreSQL, Auth/API/RPC and storage capabilities
- React Router
- Recharts

## Development principles

- Product name: **Strategic Plan Dashboard**. Legacy technical identifiers may still contain older names.
- Keep district content data-driven; do not hard-code dashboard values.
- Preserve Public/Admin visibility and security boundaries.
- Centralize reusable KPI/Initiative calculations.
- Never commit database passwords, OAuth secrets, service-role keys, or other credentials.
- Use preview → QA → product-owner approval → freeze/release discipline.
- A successful build is not equivalent to UX approval.
- Review `docs/AI_CONTEXT_INFO.md`, `docs/BRD_STRATEGIC_PLAN_DASHBOARD.md`, and `docs/USER_REQUIREMENTS_AND_PROMPTS.md` before changing the product.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and publishable/anon key.
5. Run `npm run dev`.

## Release note

V2.2 is frozen at the documented release checkpoint. Production promotion/merge is a separate action and must not be assumed from the branch freeze alone.


## V2.3 development - K12 AI Assistant

V2.3 is isolated on the `v2.3` branch created from `v2.2-frozen`; V2.2 remains immutable. V2.3 adds a feature-flagged K12 AI Assistant using a Supabase Edge Function and Ollama Cloud. The lightweight AI experience includes a compact header icon, plain-language district-data answers, ten Popular Questions, Copy/Download, loading feedback, scope/safety controls and AI audit logging. AI chart generation is intentionally excluded from the current lightweight design.

See `docs/TECHNICAL_ARCHITECTURE.md` for the end-to-end application, data, security, AI and deployment architecture.


## V2.3 frozen release — 27 Sep 2026

V2.3 is the AI-enabled release of the Strategic Plan Dashboard. It preserves the complete V2.2 baseline and adds the feature-flagged K12 AI Assistant, Popular Questions, plain-language grounded responses, Copy/Download, processing feedback, audit logging, dashboard access logging, and V2.3 reporting-data maintenance refinements. AI charts were deliberately removed to keep responses lightweight.

Release separation is explicit: **V2.2 remains the frozen non-AI release; V2.3 is the AI-enabled release.** The immutable V2.2 branches are not modified by the V2.3 release.


## V2.4 — Responsive Branding Maintenance Release

V2.4 is a focused UI maintenance release based on V2.3. It preserves existing dashboard and AI functionality while correcting two branding issues: the Powered By K12Matrix header treatment remains visible and responsive on mobile, and the canonical K12Matrix dark/light SVG assets include additional spacing between “K12” and “Matrix” to prevent glyph overlap on some laptop/browser rendering combinations.
