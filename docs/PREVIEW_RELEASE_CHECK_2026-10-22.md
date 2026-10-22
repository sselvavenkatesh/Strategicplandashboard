# Strategic Plan Netlify review — 22 October 2026

PR #14 uses release 2e5e317 application source. Netlify GitHub access has been restored and the preview builds successfully.

The new review branch initially omitted the branch-specific VITE_ACHIEVEMENT_PREVIEW setting. It therefore read empty production targets instead of the existing Indicator_Target_Preview data. Read-only database checks confirm preview totals: 7 eligible, 4 achieved, 57.1%; production totals: 7 excluded, no eligible targets.

netlify.toml now enables the existing preview mode for preview/release-check-20261022 only, matching the earlier indicator-achievement preview. This mode also uses the existing district-ai-preview endpoint, as implemented in src/lib/ai.ts. Production still explicitly uses VITE_ACHIEVEMENT_PREVIEW=false; no database data or functions are changed.

This PR is for demonstration review and must not be merged or published to production without resolving how demonstration targets should be treated for the eventual public demo. A production build with the existing production targets will show N/A.

Netlify preview requires team sign-in. Build, routing and API checks are distinct from browser visual verification; do not claim visual verification without completing it.
