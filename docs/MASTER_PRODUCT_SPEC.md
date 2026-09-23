# District 360 Strategic Plan Dashboard — Master Product & Agent Specification

## Purpose

This file is the repository-level source of truth for AI-assisted implementation. It consolidates the supplied product/architecture and UX specifications with the agreed React + Supabase implementation direction.

## Product vision

District 360 communicates a K-12 school district's strategic-plan goals, indicator performance, and initiative/sub-initiative progress to Public and Admin audiences. UX is a key product differentiator.

## Architecture

- React + TypeScript frontend.
- Supabase PostgreSQL database.
- Supabase Auth for administrator identity.
- Supabase generated APIs/RPC and PostgreSQL views/functions for reusable business logic.
- Supabase Storage for district logos, goal imagery and uploaded assets.
- Separate dashboard and administration experiences using the same platform.
- Multi-district-ready architecture with a stable district identifier.

## Existing documented tables

- `Admin_users` — Admin user list.
- `Goal_master` — district goals.
- `Indicator_master` — indicators and goal mappings.
- `Initiative_master` — initiatives, sub-initiative totals and goal mappings.
- `Indicator_Data` — indicator progress by school year/category/student group with target data.
- `Initiative_Data` — initiative/sub-initiative/action-item status and duration data.

The existing database schema must be inspected before schema changes are proposed.

## Roles

- Default view: Public.
- Authenticated administrators: Admin.
- Master records use a documented `Role` field.
- `All` is Public-visible.
- `Admin` is Admin-only.
- Restricted records must not leak through counts, charts or aggregates.

## Dashboard information architecture

1. **Welcome Page** — district strategic-plan overview, mission, vision and dynamic goal presentation.
2. **Summary Page** — per-goal Key Initiatives stacked progress plus Key Indicator scorecards.
3. **Goal Specific Page** — goal tabs with detailed initiative and indicator progress.
4. **Initiatives Detail** — timeline and sub-initiative/action-item progress.
5. **Indicator Detail** — performance over school years and supported dimensions such as gender, ethnicity and economically disadvantaged.

Explore on Welcome leads to Summary.

## Documented calculations

### Summary — Key Initiatives

Source: `Initiative_Data`.

For each goal:
`count(Action Items in status) / total Action Items`

Use this to construct the stacked status distribution.

### Summary — Key Indicators

Source: `Indicator_Data`.

Show indicator name and indicator value for the latest School Year where `Category = 'All'`. The original source wording also says "Display value 3"; validate that phrase against the real schema rather than guessing its meaning.

## UX rules

- Dark mode by default; Light mode supported.
- Preserve the supplied reference hierarchy and visual storytelling.
- Do not convert the experience into a generic SaaS/sidebar dashboard.
- Use strong typography, grouped surfaces, goal imagery and intentional progressive disclosure.
- Use consistent status semantics and chart behavior.
- Desktop is the primary reference; tablet/mobile must remain usable.
- Charts must expose textual values and not rely on color alone.
- Interactive controls must support keyboard use.

## Administration UI

The planned Admin UI is an additional implementation requirement. It should support:

- District name and strategic-plan configuration.
- Mission, vision, duration and supporting text.
- District logo.
- Goal management and goal imagery.
- Indicator data upload/management.
- Initiative data upload/management.
- Validation before data is accepted/published.

The supplied documents do not yet define exact Admin screens, upload templates or publish workflow; do not invent those as established requirements.

## Agent guardrails

- Do not invent schema fields or business rules.
- Do not hard-code screenshot/sample district values.
- Do not assume screenshot data equals production data.
- Do not change documented calculations for implementation convenience.
- Do not expose Admin-only data in Public aggregates.
- Do not make schema migrations before inspecting the existing schema.
- Centralize reusable business logic.
- Do not commit secrets.
- Flag ambiguity instead of guessing.

## Recommended build sequence

1. Inspect existing Supabase schema and representative data.
2. Map page elements to tables/fields/calculations.
3. Identify and approve minimal schema/API changes.
4. Establish routing, themes and reusable components.
5. Establish district and role/auth contexts.
6. Implement Welcome.
7. Implement Summary and validate calculations.
8. Implement Goal page.
9. Implement Initiative/Indicator details.
10. Implement Admin workflows after data contracts are stable.
11. Add RLS/security, responsive behavior, accessibility and full UI states.
12. Validate each page against the original UX references.

## Definition of done

A page is complete only when it uses the approved data mapping, applies district and role visibility correctly, works in Dark/Light modes, is responsive, handles loading/empty/error states, preserves documented calculations and drill-down context, and has been reviewed against its supplied UX reference.
