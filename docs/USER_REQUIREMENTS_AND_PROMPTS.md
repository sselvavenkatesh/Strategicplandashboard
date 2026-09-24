# District 360 Strategic Plan Dashboard — User Requirements & Prompt Log

> Living document capturing the product requirements, decisions, and implementation instructions provided by the product owner. Update this document as new requirements are supplied. It complements `MASTER_PRODUCT_SPEC.md`; it does not replace the approved specification or live schema inspection.

## Product and implementation direction

- Build a K-12 Strategic Plan Dashboard for school districts.
- The product owner does not have a technical background, so implementation should remain maintainable and straightforward.
- Frontend: React.
- Backend/database: Supabase/PostgreSQL using Supabase APIs, Auth, Storage, views/functions/RPC where appropriate.
- Maintain a separate administration/data-management experience for district configuration, branding, goal imagery, indicator data, and initiative data.
- UX is a key product USP. Preserve the supplied UX references and product hierarchy rather than replacing them with a generic dashboard template.
- Dark mode is the default, with a light-mode option.
- Keep the application data-driven and multi-district-ready.
- Never commit Supabase secrets, database passwords, or service-role keys to GitHub.

## Source product requirements

The supplied product/architecture and UX documents define the core experience:

- Welcome Page.
- Summary Page.
- Goal Specific Page.
- Initiatives detail/popup.
- Indicator detail/popup.
- Public and Admin experiences.
- `Role = All` content is public-visible; `Role = Admin` content is Admin-only.
- Dashboard data comes from the Supabase master/data tables rather than screenshot sample values.

## Current Supabase data model

Current tables used by the product:

- `Goal_master`
- `Indicator_master`
- `Initiative_master`
- `Indicator_Data`
- `Initiative_Data`
- `admin_users`

The existing live schema must be inspected before proposing or applying schema changes.

### School dimension

A nullable `School` field is available in `Indicator_Data` and `Initiative_Data`. District-level reporting is the default. A dashboard-wide School filter can scope calculations to a selected school.

### Stakeholder ownership

Stakeholder assignment is **optional**.

Nullable `Stakeholder ID` is used on:

- `Goal_master`
- `Indicator_master`
- `Initiative_master`
- `Initiative_Data`

`Stakeholder ID` references `admin_users.id`.

Business meaning: if a school district wants a specific administrator to be responsible for a Goal, Indicator, Initiative, or applicable Initiative action-level record, it can assign that administrator. If no specific owner is required, the field remains null/unassigned.

The UI should therefore never require stakeholder selection and should support an unassigned state.

Do not duplicate stakeholder names into the business tables. Resolve the display name from `admin_users.Name`.

### Future stakeholder notifications

Future capability, not yet implemented: a stakeholder may receive an email when an Indicator falls below a defined benchmark/threshold.

No benchmark notification rules should be invented yet. Future design can determine threshold rules, comparison operators, notification frequency, duplicate suppression, and email delivery behavior. If no stakeholder is assigned, no stakeholder-specific email should be sent.

## Initiative reporting requirements

Initiative reporting is based on Action Items in `Initiative_Data`.

Current status semantics include:

- Done
- In Progress
- Not Yet Started

For completion calculations, **completed means `Status = 'Done'`**.

Do not calculate initiative progress from a manually entered percentage. Derive it from Action Item records.

### Initiative Chart 1 — Key Initiatives / overall Goal progress

Purpose: show overall Initiative progress for each Goal as a 100% stacked bar.

For a selected Goal:

```text
Total Action Items = count of Initiative_Data Action Items for the Goal

Done % =
  count(Action Items where Status = 'Done' for Goal)
  / count(all Action Items for Goal)
  × 100

In Progress % =
  count(Action Items where Status = 'In Progress' for Goal)
  / count(all Action Items for Goal)
  × 100

Not Yet Started % =
  count(Action Items where Status = 'Not Yet Started' for Goal)
  / count(all Action Items for Goal)
  × 100
```

The reporting result should retain both the count and percentage for every status so the chart can show percentages while tooltips/details can show Action Item counts.

This chart appears as a stacked bar with Done, In Progress, and Not Yet Started segments.

Current decision: the existing schema is sufficient. No additional column is required. A reusable SQL reporting view is preferred, but the final view design should be completed together with the broader reporting model rather than creating isolated chart-specific views.

### Initiative Chart 2 — Goal Specific Page / Initiative tile

For every Initiative within the selected Goal, display one Initiative tile.

The tile contains:

- Initiative Name.
- Initiative duration using Start Date and End Date.
- Overall Initiative completion percentage.
- A gauge/speedometer representing the same completion percentage.
- Sub-Initiative-level 100% stacked status bars.

#### Initiative completion

For a Goal + Initiative:

```text
Initiative Completion % =
  count(Action Items with Status = 'Done'
        for Goal + Initiative)
  / count(all Action Items
          for Goal + Initiative)
  × 100
```

The displayed completion number and the gauge must use the same calculated value.

#### Sub-Initiative stacked bars

Each bar represents one Sub-Initiative within the Initiative.

For each Goal + Initiative + Sub-Initiative:

```text
Done % =
  Done Action Items / Total Action Items × 100

In Progress % =
  In Progress Action Items / Total Action Items × 100

Not Yet Started % =
  Not Yet Started Action Items / Total Action Items × 100
```

The three status percentages form the 100% stacked bar. Counts should also be retained for display/tooltips.

Current decision: the existing schema is sufficient. No additional column is required.

## District vs School reporting scope

Initiative reporting is district-level by default.

When the dashboard School filter is set to **All Schools**, calculations use all applicable `Initiative_Data` rows.

When a specific school is selected, the same calculations are recomputed using only rows for that school.

Conceptually:

```text
All Schools
→ all applicable Initiative_Data rows
→ district-level Goal / Initiative / Sub-Initiative progress

Selected School
→ Initiative_Data filtered to selected School
→ Goal / Initiative / Sub-Initiative progress for that school
```

Do not create separate business formulas for district and school reporting. School is a reporting scope/filter applied to the same formulas.

The current `School` text field is sufficient for the present model. A normalized school master / stable School ID can be evaluated later together with the broader multi-district design; it is not an approved schema change yet.

## Reporting-layer design decisions

Do not create one SQL view per visual merely because the frontend has separate charts.

The Initiative charts reveal a reusable hierarchy:

```text
Goal
  → Action Item status distribution

Goal + Initiative
  → overall completion

Goal + Initiative + Sub-Initiative
  → Action Item status distribution
```

The reporting layer should support these reusable grains and preserve the School dimension/filter where necessary.

Simple presentation logic may remain in React, but reusable business calculations should preferably be centralized in PostgreSQL views/functions so that Summary, Goal, Admin, and future reporting experiences use consistent definitions.

Do not create the final Initiative views until Indicator chart requirements have also been reviewed. The Initiative and Indicator reporting layers should use a consistent approach for Goal, School, role visibility, and dashboard filters.

## Indicator reporting requirements

### Indicator Chart 1 — Key Indicator cards

For each KPI/Indicator belonging to a Goal, display one card. The displayed KPI value is `Value 3` from the most recent School Year where `Category = 'All'` and `Student Group = 'All Students'`.

### Indicator Chart 2 — Goal Specific KPI tile

For every KPI in the Goal, display one tile containing:
- latest KPI value using the Key Indicator rule above;
- latest Statewide Average for the KPI, using `Category = 'Statewide Average'` and `Student Group = 'All Students'`;
- KPI performance across available School Years using `Category = 'All'`, `Student Group = 'All Students'`, and `Value 3`.

School Years must be ordered chronologically rather than by unsafe text assumptions.

### Indicator Chart 3 — Indicator detail popup

Clicking a KPI card opens Indicator detail.

- Show Goal Name and Goal Description mapped to the Indicator.
- Show a current-year KPI scorecard using the latest `Category = 'All'`, `Student Group = 'All Students'` `Value 3`.
- Provide a School Year dropdown containing available years for the Indicator, defaulting to the latest year.
- For the selected year, chart Student Group on the X axis and numeric `Value 3` on the Y axis.
- Exclude `Category = 'Statewide Average'` from the bars.
- Draw the selected year's Statewide Average as a horizontal reference/trend line using the `Statewide Average` / `All Students` `Value 3`.
- Default chart type is bar. Some Indicators may later be configured as line or plot/scatter; do not invent that configuration until defined by the product owner.
- The reporting layer should preserve both the original display form of `Value 3` and a numeric form for charts and future benchmark logic.

### Indicator School scope

For Indicator reporting, district-level records currently use `School IS NULL`. When a specific School is selected, Indicator calculations should use that School's rows. Statewide Average remains a statewide reference rather than a school-specific value.

## Implemented reporting layer

Migration `add_dashboard_reporting_layer` created:

- `vw_indicator_reporting_normalized` — normalized Indicator reporting rows, including chronological School Year start and numeric `Value 3`.
- `fn_goal_initiative_progress(goal, school)` — Goal-level Initiative status counts/percentages.
- `fn_initiative_progress(goal, school)` — Initiative completion percentage and duration.
- `fn_subinitiative_progress(goal, initiative, school)` — Sub-Initiative status counts/percentages.
- `fn_indicator_key_values(goal, school)` — latest KPI values for Goal cards.
- `fn_indicator_year_history(indicator, school)` — KPI history with same-year Statewide Average.
- `fn_indicator_student_groups(indicator, school_year, school)` — Student Group chart rows plus Statewide Average reference-line value.

Initiative functions treat a null School parameter as all applicable Initiative rows, matching the All Schools requirement. Indicator functions treat a null School parameter as district-level rows where `School IS NULL`, avoiding accidental mixing of district and future school-specific KPI rows.

The reporting functions are `SECURITY INVOKER`; they do not bypass the caller's table permissions/RLS. RLS policies still need to be finalized before frontend production access.

## Indicator reporting — reviewed

All currently supplied Indicator charts have been reviewed against the live schema. No additional Indicator table columns were required for these visuals. Future benchmark/notification and per-Indicator chart-type rules remain intentionally undefined until specified.

## Security and backend items already identified

- RLS is enabled on the current public tables.
- RLS policies still need to be designed/implemented before production data access is wired to the frontend.
- Public aggregates must never expose Admin-only records.
- Some foreign-key columns currently lack covering indexes; indexing should be reviewed as part of backend hardening.
- Stakeholder ownership must remain optional.

## Current implementation checkpoint

Completed:

- GitHub repository foundation.
- React + TypeScript + Vite project structure.
- Routing foundation.
- Supabase client configuration using environment variables.
- Dark/light theme foundation.
- Dashboard/Admin page placeholders.
- Master product specification in the repository.
- Stakeholder schema migration.
- Supabase TypeScript schema types.
- Initiative chart/schema analysis.
- Indicator chart/schema analysis.
- Consolidated Supabase Initiative/Indicator reporting layer.

Next planned work:

- Finalize RLS/access policies before production frontend data access.
- Wire the React pages to the reporting functions.
- Validate chart output against the supplied UX references.
- Add future chart-type and benchmark notification rules only when explicitly defined.

## Maintenance rule for this file

As the product owner supplies new prompts, requirements, corrections, chart formulas, filters, schema decisions, or implementation constraints, append or revise this document so GitHub retains a durable record of the agreed product model.

Do not treat exploratory assistant suggestions as approved requirements unless the product owner accepts them.
