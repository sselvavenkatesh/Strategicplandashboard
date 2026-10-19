# Indicator achievement preview — 19 October 2026

Branch: `preview/indicator-achievement-20261019`, based on `react-dashboard` at `79ab37fd762f45e011a0fbec9931e749d5b4c00e`. Draft PR #13. No merge or production promotion authorized.

## Behavior

The Summary page adds a compact blue micro progress strip below each goal description and one beside the page heading. Full-width goal titles and the original description spacing are restored; no gauge heading reservation remains. Each strip shows Achievement, its percentage, a thin 4px bar and the achieved/eligible count. Hover gives target details; click/tap opens the accessible details dialog. Existing indicator tiles, initiative bars and navigation are preserved. Achievement loading/API failure does not prevent the existing summary from rendering.

The security-invoker RPC `fn_indicator_achievement_summary(p_preview boolean default false)` returns overall totals and all visible goals in one request. Indicator_master and Goal_master with Role=All determine the included entities. The latest district observation must have Role=All, Category=All, Student Group=All Students and School=NULL. Each actual is paired with Target 1 for that same year. No older target fallback. Positive nature uses actual >= target; negative uses actual <= target. A valid zero is included. Missing/invalid actuals, targets or KPI direction are excluded and disclosed. With no eligible indicators, percent is NULL and the UI shows N/A.

Percent strings are measured in percentage points (39.53% means 39.53), and currency is measured in full dollars. Dollar signs, commas, percent signs and whitespace are removed before strict numeric parsing. Unit suffixes such as M and K are intentionally not inferred. The overall percentage pools achieved/eligible indicator counts; it does not average goal percentages. API percentages have one decimal; compact gauges round to whole percentages.

## Production isolation

The only database additions are the new read-only reporting RPC and the separate `Indicator_Target_Preview` table. No changes to production Indicator_Data, existing reporting functions or views. RLS allows public SELECT of demonstration targets; anon/authenticated have no write privileges. The RPC is security invoker with an empty search_path and fully qualified objects.

Demonstration targets are used only when p_preview=true. The frontend sets that only when VITE_ACHIEVEMENT_PREVIEW=true; Netlify config scopes it to this branch, and Vite also recognizes this exact branch in Vercel's preview environment. Normal production builds do not enable the demonstration targets.

Production Indicator_Data targets were NULL for all seven active latest indicators on inspection. The default RPC path returns N/A until real targets are approved and populated. The seven preview targets are separate data, not district-approved performance commitments.

| Indicator | Reporting year | Live actual at verification | Preview Target 1 | Result |
| --- | --- | --- | --- | --- |
| M-Step ELA | 2025-26 | 39.53% | 38% | Achieved |
| M-Step Math | 2025-26 | 34.42% | 40% | Not achieved |
| SAT | 2025-26 | 673 | 650 | Achieved |
| Freshmen on Track | 2025-26 | 97.45% | 95% | Achieved |
| Graduation Rate | 2024-25 | 84.4% | 90% | Not achieved |
| Chronic Absenteeism | 2025-26 | 23.32% | 25% | Achieved (lower is better) |
| Fund Balance | 2024-25 | $19,248,186 | $20,000,000 | Not achieved |

Goal results: G1 2/3 (66.7%), G2 1/2 (50%), G3 1/1 (100%), G4 0/1 (0%). Overall 4/7 (57.1%, displayed 57%). Seven current active indicators were verified from the live master; no assumed eighth indicator was added.

## Verification

- TypeScript and Vite build passed in normal and preview configurations.
- Public publishable-key HTTPS RPC returned the expected 4/7 overall and four goal scores.
- SQL assertions passed for baseline counts, pooled overall percentage, equality, negative direction, invalid target exclusion, empty denominator and zero target inclusion. Temporary fixture edits were rolled back.
- Anonymous SELECT/RPC succeeds; anonymous INSERT/UPDATE on preview targets is denied by grants.
- Hosted browser checks are recorded below after deployment.

## Release path

Review this preview first. Before a future release, approve actual district targets separately, populate the matching Indicator_Data Target 1 records, build without the demonstration flag, recheck missing coverage, and deploy only after explicit release approval. No API V1 frontend migration is required for this feature.

### Hosted QA findings

The Vercel frontend preview deployed successfully on the isolated branch. Direct /summary loading, live public RPC data, all five gauge scores, overall details dialog (seven rows), Escape dismissal with focus restoration, and dark/light themes were checked in the browser. The first visual pass found long-heading clipping caused by inherited fixed-height styles; the scoped title selector and shared heading space were corrected before handoff.

Supabase security advisors reported no finding for the new preview table or RPC. Existing normalized-view/security-definer and authentication-function findings remain outside this feature's scope; the production view and authorization functions were not altered. The new function itself is SECURITY INVOKER and does not add privileged execution.

The separate API V1 project also attempts to build this frontend branch automatically and fails because this branch does not contain its api-v1 root. That failed preview does not replace its production deployment and is not needed for the gauge feature. The frontend preview uses the existing Supabase connection.

Final desktop checks: 1363px viewport, no horizontal overflow, all full goal titles visible, five expected scores, seven target details, keyboard close/focus restoration and both themes. Final heading reservation is 90px to align descriptions and chart rows across the four cards. Mobile responsive styles are implemented but a mobile-sized browser session was unavailable; mobile visual QA remains unverified.

## Micro progress presentation

The approved follow-up replaces all five speedometers with blue micro progress bars. The 90px heading reservation and side-by-side gauge column are removed. Goal titles and descriptions again use the full card width. Bars use one blue fill and a muted remainder, distinct from the multicolor initiative stacks. Calculation, demonstration targets and details dialog are unchanged.

## Individual Goal page

Each Goal header reuses its achievement micro progress bar before Key Resources. Indicator tile headings show the same-year Target 1 and a green (achieved) or red (not achieved) status dot. No indicator achievement bar is added. Missing target/data or API failure uses a neutral dot and an unavailable label, never a false red/green result. Percentage KPIs retain %, SAT uses a numeric score and Fund Balance uses currency. Hover and accessible labels provide actual, target, reporting year and status. Existing tile click/keyboard detail dialogs, historical charts, statewide averages and initiative displays retain their handlers. This reuses the existing achievement RPC with no database changes.
