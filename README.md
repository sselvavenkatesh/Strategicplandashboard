# District 360 — Strategic Plan Dashboard

K-12 school district strategic-plan dashboard built with React and Supabase.

## Product

The product contains two experiences:

- **Strategic Plan Dashboard** — Welcome, Summary, Goal, Initiative Detail and Indicator Detail experiences with Public/Admin-aware visibility.
- **Administration UI** — district configuration, branding, goal imagery, and indicator/initiative data management.

UX is a core product differentiator. The dashboard is dark-mode-first with light-mode support.

## Technology direction

- React + TypeScript
- Vite
- Supabase PostgreSQL, Auth, Storage and generated APIs/RPC
- React Router
- Recharts

## Development principles

- Data-driven; do not hard-code district content.
- Multi-district-ready.
- Apply Public/Admin visibility consistently.
- Centralize shared KPI/chart business logic.
- Never commit database passwords, service-role keys, or other secrets.
- Review `docs/MASTER_PRODUCT_SPEC.md` before implementing product pages.

## Local setup

1. Install Node.js 20+.
2. Run `npm install`.
3. Copy `.env.example` to `.env.local`.
4. Add the Supabase project URL and publishable/anon key.
5. Run `npm run dev`.
