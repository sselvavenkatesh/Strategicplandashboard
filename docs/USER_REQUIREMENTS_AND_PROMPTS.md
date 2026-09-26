# Strategic Plan Dashboard — User Requirements & Prompt Log

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


---

## UX design review history — frozen baseline (24 Sep 2026)

The product owner explicitly confirmed: **“now UX is frozen.”** The current GitHub Pages prototype is therefore the approved visual/interaction baseline. Do not change the frozen UX unless the product owner explicitly requests a later tweak.

### UX prompts and decisions captured during design review

1. **Goal Specific — Key Initiatives**
   - “Show Initiative name and description.”
   - Initiative progress bars must be shown at **Sub-Initiative level**.
   - Show **4 Initiative tiles per desktop page/row** so Key Indicators are visible with minimal/no scrolling.
   - Keep screens compact: trim blank space in headings and between Initiative description and chart.
   - Initiative cards show duration, overall Done %, gauge, and Sub-Initiative 100% stacked bars for Done / In Progress / Not Started.

2. **Goal Specific — Key Indicators**
   - Indicator card visual hierarchy should match Initiative cards.
   - Show Indicator Name followed immediately by Indicator Description, using the same compact name/description treatment as Initiative tiles.
   - Show latest Indicator value, compact **LY Var** beside the value, Statewide Average, and School Year performance chart.
   - Statewide Average label/value must remain readable and comparable in prominence to the KPI.
   - Remove duplicate LY Var beneath the chart.
   - Improve School Year label readability.
   - On Summary Key Indicator cards, LY Var must be inline beside the KPI number; arrows must remain inside the variance pill/card.

3. **Initiative Detail popup**
   - Must open as a popup/overlay from an Initiative tile.
   - Header shows Goal icon, Goal Name and Goal Description.
   - Show selected Initiative identity/description.
   - Next section: **Plan of Action timeline**.
   - Then Initiative Overall Done % and gauge.
   - Last section: enlarged Initiative Progress chart, using the same Sub-Initiative status logic as the Goal page.
   - Preserve the underlying Goal page while popup is open.

4. **Indicator Detail popup**
   - Must open as a popup/overlay from an Indicator tile.
   - Header shows Goal icon, Goal Name and Goal Description.
   - Show selected Indicator name.
   - Show current/latest School Year and KPI value.
   - School Year selector defaults to latest.
   - Main chart shows Student Group bars with values and Statewide Average horizontal reference line.
   - Keep the visual hierarchy close to the supplied Indicator detail reference.

5. **Navigation**
   - Hamburger navigation opens from the **right**.
   - Top-level title: **Explore the Dashboard**.
   - Help and Filter controls live compactly at the top of the navigation pane and are not permanently visible in the page toolbar.
   - Main navigation: **Home**, **Summary**, then individual visible Goal names.
   - Home and Summary have icons.
   - Clicking an individual Goal name opens the Goal Specific page with that Goal tab selected.
   - Do not show separate Initiative Detail or Indicator Detail navigation items; these are popup experiences.
   - Do not show “Select a page”.
   - Include subtle **Powered By K12Matrix** branding in the navigation pane.
   - Sign In is a compact blue oval/pill button beside the hamburger and opens a Sign In popup.

6. **Cross-page navigation behavior**
   - On Home/Welcome, clicking any Goal tile opens **Summary**.
   - On Summary, clicking a Goal tile opens the corresponding **Goal Specific** tab.

7. **Footer / K12Matrix branding**
   - Footer is a global component applicable to all pages and popup experiences.
   - It must be subtle and visible at the bottom of the viewport without requiring page scroll.
   - Footer is right aligned and shows **Powered By K12Matrix**.
   - K12Matrix logo is maintained as a separate reusable GitHub asset: `ux-preview/assets/k12matrix-logo.svg`.
   - The current logo is a prototype/placeholder brand asset and may be replaced later by the product owner.

8. **Tooltips / progressive disclosure**
   - Charts should provide hover tooltips for values and useful descriptions.
   - Initiative hover details should include **Start Date** and **End Date**.
   - Where text is truncated/ellipsis or a three-dot affordance is used, hover should expose the full relevant details.
   - UX principle: keep the default dashboard compact and reveal secondary detail through tooltips/hover rather than enlarging every card.

9. **Responsive/accessibility direction**
   - Desktop remains primary.
   - Preserve compact tablet/mobile adaptations.
   - Clickable cards should have clear interaction cues.
   - Detail must not rely exclusively on hover in the eventual production implementation; keyboard/touch-accessible equivalents are required.

### Frozen UX implementation locations

- `ux-preview/index.html`
- `ux-preview/styles.css`
- `ux-preview/app.js`
- `ux-preview/assets/k12matrix-logo.svg`
- GitHub Pages preview: `https://sselvavenkatesh.github.io/Strategicplandashboard/`

### Freeze rule

The current Home, Summary, Goal Specific, Initiative Detail popup, Indicator Detail popup, right-side navigation, Sign In treatment, global footer, tooltip direction, typography, colors, spacing, card surfaces, and interaction hierarchy are the **frozen UX baseline**.

Future implementation work should reproduce this baseline in React rather than redesign it. Any subsequent UX modification must be traceable to a new explicit product-owner request.

## Prompt-history preservation note

The requirements above preserve the product owner's UX prompts and the resulting accepted decisions from the design-review sequence. Earlier product, schema, calculation, security, school-scope, stakeholder, Initiative, Indicator, Supabase, and implementation requirements remain documented in the preceding sections of this file. Together, this document is the durable requirements/prompt-history record for the project.


## Critical React QA feedback — 2026-09-24
The currently deployed React build is NOT approved for UX review. Treat this feedback as a release-blocking requirement.

Observed on Summary page:
- Approved goal/header images are missing; icon/gradient placeholders are not acceptable substitutes.
- Indicator rendering/data validation is incomplete; all indicators from Indicator_master must render, while values must come only from valid Indicator_Data/reporting rows. Missing values display the approved unavailable state, never disappear and never use UX sample data.
- Approved chart/value tooltips are missing.
- Excessive blank vertical space/top spacing differs from the frozen UX.
- Multiple frozen UX elements, proportions, interactions, chart treatments, labels and details are still missing or materially different.

Release discipline:
1. ux-preview remains frozen and is the visual/interaction source of truth.
2. Supabase master/data tables remain the content source of truth.
3. React must reproduce the frozen UX structure without importing UX placeholder data.
4. Add automated smoke/unit tests for master-record rendering, missing-data states, initiative status calculations, indicator values/LY variance, image rendering/fallback behavior, tooltip presence, and critical navigation/modal interactions.
5. Perform desktop visual parity review page-by-page against frozen UX before requesting stakeholder review.
6. Do not call a deployment review-ready merely because it builds or deploys.
7. A release candidate must pass code/build checks, data checks, interaction checks, and visual-parity checks.


---

## Product naming clarification — 26 Sep 2026

The product owner explicitly instructed: **Do not call the product “District 360.” The product name is “Strategic Plan Dashboard.”**

Use **Strategic Plan Dashboard** in product documentation and future product discussions. Existing historical code identifiers, database values, storage/session keys, commit messages, or old screenshots may still contain “District 360”; do not rename technical identifiers without a separate migration requirement.

## React implementation and release history — 24–26 Sep 2026

The following prompt/decision history supplements the earlier UX and reporting requirements and records the product-owner instructions that drove the production React implementation.

### React parity and QA discipline

- The frozen UX is a strict visual specification, not general inspiration.
- React must reproduce each approved UX component and use Supabase data rather than screenshot/sample KPI values.
- The product owner explicitly required component-by-component comparison against the frozen UX before pushing a React candidate.
- When QA finds a failure, do not stop at reporting it: investigate the cause, correct it, retest, and make the candidate stable.
- A successful build alone is not sufficient to call a version review-ready.
- Preview deployments are preferred during iteration. Production deployment happens only after explicit approval.
- The product owner asked for basic automated/unit testing as part of the quality process.
- Responsive behavior is required for web/desktop, laptop, tablet and mobile. Final release QA should explicitly cover representative viewport sizes rather than assuming media queries are sufficient.

### Welcome page

- Welcome React implementation was brought into parity with the frozen UX.
- The primary CTA text was changed from **“Explore Full Dashboard →”** to **“Explore Strategic Plan →”** for V2.0.
- Goal tiles on Welcome navigate to Summary.
- Current page navigation uses a route-change loader carrying K12Matrix branding.

### Summary / Goal Summary page

- The generic **STRATEGIC PLAN** label above Goal Summary was replaced with the actual Strategic Plan Name and Strategic Plan Duration from District Profile.
- Summary Goal cards use real Supabase Goal, Initiative and Indicator data.
- Summary Key Indicator cards use **Indicator short names**.
- Fund Balance is displayed in millions using the format **$x.xxM**.
- LY variance respects KPI Nature: for Negative-nature indicators, a decrease is favorable; for Positive-nature indicators, an increase is favorable.
- Percent indicators retain the percent suffix in LY variance.
- Missing Indicator/Initiative data must use the approved unavailable state rather than fabricated data.

### Goal page — Initiative requirements implemented

- Initiative cards use Initiative short names and descriptions.
- Four Initiative cards per row remain the desktop UX target.
- Initiative progress is calculated from Action Item status rows.
- Overall completion gauge and Done percentage use the same calculated completion.
- Gauge color varies with progress; exactly 100% uses the same green as the Done status bar.
- Gauge hover/focus detail includes Initiative name, Sub-Initiative names, Start Date, End Date, Total Action Items and Completed %.
- Sub-Initiative stacked bars retain the compact/native tooltip behavior after the custom large stacked-bar tooltip experiment was explicitly rejected and reverted.
- Initiative charts were explicitly approved/frozen for V1.0.

### Goal page — Indicator requirements implemented / current behavior

- Indicator cards use Indicator short names and descriptions.
- Latest value, LY variance, Statewide Average and historical School Year bars are displayed.
- Fund Balance uses **$x.xxM**.
- Indicator and Statewide Average typography was aligned with the Initiative progress percentage treatment.
- **Current V2.0 behavior supersedes the earlier frozen UX interaction:** the product owner explicitly requested that clicking a Goal Page Indicator card **must not open the Indicator detail popup**. The click and keyboard activation trigger was disabled in React. The underlying Indicator data/card remains visible.
- The old Indicator detail implementation may remain in code temporarily, but it is not reachable from Goal Indicator cards unless the product owner explicitly re-enables that interaction.

### Header, branding and loader

- Riverside School District name in the header was enlarged while preserving the existing header height.
- A professional district-style inline mark was added for the Riverside School District prototype.
- **Powered By K12Matrix** branding was moved from the fixed global footer into the header.
- The footer was removed from the current V2 React shell.
- The canonical K12Matrix asset is the existing repository SVG: `ux-preview/assets/k12matrix-logo.svg`.
- The frozen UX asset itself must not be edited.
- A React-served copy is published at `public/k12matrix-logo.svg`; React references `/k12matrix-logo.svg` so Netlify/Vite can serve it reliably.
- The same canonical K12Matrix SVG is used in the header, navigation panel and route-change loader.
- On narrow mobile widths, header K12Matrix branding may be hidden to prevent collision/overflow while preserving the district identity and navigation controls.

### Sign In

- Sign In remains a compact pill action in the header.
- Sign In opens a modal/popup.
- The Sign In popup now includes the canonical **K12Matrix logo**.
- Product-owner copy change: **“Sign in with your administrator account.”**
- The previous copy “Sign in with your District 360 administrator account.” is obsolete.
- Current Admin Sign In is a custom database-backed login using the `validate_admin_login(p_email,p_password)` RPC and pgcrypto password verification; it is not Supabase Auth.
- Current browser session key is `district360_admin` (historical technical identifier; do not rename solely because the product display name changed).
- Google/Microsoft SSO remains a future capability.

### K12Matrix asset deployment correction

A V2 preview initially showed broken K12Matrix images because React referenced `/ux-preview/assets/k12matrix-logo.svg`, which was not guaranteed to be copied into the Vite production bundle. The correction was:
1. preserve the frozen source SVG;
2. copy it to `public/k12matrix-logo.svg`;
3. reference `/k12matrix-logo.svg` from React.

This is the required deployment-safe pattern unless the asset pipeline is deliberately redesigned.

### Responsive requirement and QA status

Responsive CSS currently contains desktop/laptop/tablet/mobile adaptations. A separate experimental QA branch (`qa/v2.0-responsive`) was created to investigate additional responsive hardening, but the product owner later instructed **not to continue work on that branch**. Do not treat that branch as the active product branch.

Active V2 development continued on `release/v2.0-dev`. Any V2.1 responsive work should start from the approved production baseline and be validated through a new preview branch.

Representative release-QA viewport targets previously agreed:
- 1920×1080 desktop
- 1366×768 laptop
- 768×1024 tablet
- 390×844 mobile
- 360×800 small mobile

### Release/version control history

- Frozen UX commit: `c75815e76e79b8fa97599d924265d7bd8015d0f7`.
- V1.0 immutable release baseline branch: `release/v1.0`.
- Goal Summary V1.0 merge into `react-dashboard`: `69791ec6c5558f9458c563bad3084d2f4c5aad28`.
- V2.0 development branch: `release/v2.0-dev`.
- V2.0 frozen checkpoint: `release/v2.0-frozen-checkpoint-1`.
- Responsive experiment branch: `qa/v2.0-responsive` — no longer the active branch by explicit product-owner instruction.
- Production hosting: Netlify.
- Production site: `https://vocal-twilight-54ee43.netlify.app/#/`.
- V2.0 was manually promoted/published in Netlify after successful preview deployment.
- Current production candidate lineage includes disabling the Goal Indicator popup and adding the K12Matrix logo/revised copy to Sign In.

### Netlify release discipline

- Avoid unnecessary production publishes because production deploys consume Netlify credits.
- Use Deploy Previews/branch previews for iteration where possible.
- Do not claim Netlify built/passed a commit without checking deployment/status evidence.
- The product owner may manually use Netlify **Publish deploy** to promote a successful Deploy Preview to production.
- Public visibility is acceptable for stakeholder/product evaluation provided public users remain read-only and Admin capabilities/data remain protected.

## V2.1 planning instruction

V2.0 is the current production milestone. Before V2.1 feature development:
1. preserve the production baseline;
2. maintain this prompt/requirements log;
3. maintain an AI handoff/context document in `docs`;
4. maintain a functional BRD in `docs`;
5. define V2.1 scope before implementation;
6. use preview → QA → owner approval → freeze → production release discipline.

## Documentation precedence

When requirements conflict, use this order:
1. the latest explicit product-owner instruction;
2. the current production behavior when explicitly approved;
3. the frozen UX baseline for areas not superseded;
4. earlier exploratory requirements.

Do not silently revive superseded behavior. In particular, the current product name is **Strategic Plan Dashboard**, Goal Indicator click-to-detail is disabled, K12Matrix branding is in the header/current shell rather than a fixed footer, and the Sign In copy is the revised administrator-account wording.


---

## V2.1 final prompt history and frozen requirements — 26 Sep 2026

The product owner completed the V2.1 public-dashboard review and explicitly requested that **V2.1 be frozen**. The following requirements supersede conflicting V2.0/frozen-UX notes above where applicable.

### Theme and visual parity
- Light Theme is approved across Welcome, Summary, Goal, Initiative Detail, Indicator Detail, K12Matrix branding, and right-side navigation.
- Dark remains the default theme; theme preference is persisted.
- Theme changes affect surfaces, typography, borders and colors without changing business behavior.

### Goal page and scalable goal navigation
- Goal icons on Goal pages and popups must match the Goal identity used on the Welcome page.
- Support districts with up to at least eight Goals without changing the approved four-goal desktop presentation:
  - Welcome retains four Goal tiles per desktop row; additional Goals flow to subsequent rows.
  - Goal tabs remain single-line and horizontally scroll when required.
  - Navigation pane scrolls when its Goal list exceeds viewport height.
  - Eight distinct Goal icons are available and used consistently.
- Add **Key Resources** beside the Goal icon. It opens the district strategic-plan resource location in a new tab.
- Current Key Resources destination is the approved district Zoho WorkDrive strategic-plan folder.
- Hide Help and Filter controls from the navigation pane.

### Initiative tile and Initiative Detail
- Initiative tiles retain hover/focus interaction.
- Initiative Detail popup is compact enough for normal desktop use without unnecessary scrolling.
- Popup title displays **Initiative short name - Initiative long name**.
- Plan of Action timeline:
  - initiative minimum Start Date is the left boundary;
  - initiative maximum End Date is the right boundary;
  - Sub-Initiative flags are positioned from Sub-Initiative End Date;
  - flag is green only when every Action Item in that Sub-Initiative is Done, otherwise red;
  - same-date Sub-Initiatives stack rather than overlap;
  - the final Sub-Initiative flag doubles as the Initiative End milestone, with **Initiative End** shown above it rather than a duplicate end flag.
- Initiative gauge uses the same dynamic progress-color logic as Goal-level progress.
- Approved data-readability adjustment: public Sub-Initiative End Dates were distributed across Jun-2025 / Jun-2026 / Jun-2027 by Initiative where needed to avoid excessive timeline overlap.

### Indicator tile and Indicator Detail
- Indicator Detail popup is enabled from Indicator tiles.
- Popup title displays **Indicator short name - Indicator long name**.
- Popup is compact and includes a loading treatment while selected-year data loads.
- Changing School Year updates both the Student Group chart and the displayed KPI value.
- Indicator tile LY variance remains beside the KPI area, positioned slightly lower than the KPI value.
- **LY Var** text is immediately beside the variance pill/value.
- Statewide Average has reserved independent space and must not overlap the KPI/variance area.

### Branding/navigation
- K12Matrix logo treatment is approved in both themes.
- Right-side navigation contains Home, Summary and dynamic Goal entries.
- Help and Filter utilities are hidden.
- Do not use the legacy product name in user-facing product copy; use **Strategic Plan Dashboard**.

### Release decision
- Product owner instruction: **“i want to freeze v2.1.”**
- V2.1 is the approved public-dashboard feature baseline.
- After documentation and freeze checkpoint creation, subsequent Admin-page development begins on **v2.2**.
- Do not modify the frozen V2.1 checkpoint for V2.2 work.
