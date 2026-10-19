# Indicator achievement preview — 19 October 2026

Branch: `preview/indicator-achievement-20261019`, based on `react-dashboard` at `79ab37fd762f45e011a0fbec9931e749d5b4c00e`. Draft PR #13. No merge or production promotion authorized.

## Behavior

The Summary page adds four compact semicircular goal gauges and one overall gauge. Hover gives target details; click/tap opens an accessible details dialog. No chart library added. The existing indicator tiles, initiative bars and navigation are preserved. Gauge loading/API failure does not prevent the existing summary from rendering.

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
