# Strategic Plan production release — 22 October 2026

The product owner approved Netlify Preview #14 and explicitly requested all preview changes for production, including the favicon and target/achievement data. This supersedes the earlier production-target isolation decision for this public Riverside demonstration deployment.

Production and review builds both set VITE_ACHIEVEMENT_PREVIEW=true. They read the same seven existing Indicator_Target_Preview targets and the existing district-ai-preview service. The live district actuals remain unchanged. Read-only verification returns 7 eligible, 4 achieved, 57.1% overall; goal results G1 66.7%, G2 50%, G3 100%, G4 0%. No database writes or function changes are required.

Includes the approved achievement UI, updated branding, clean chatbot indicator labels, removed preview note, favicon shared with Financial Dashboard, root and /strategic-plan/demo builds and stable HTML proxy shell. Favicon paths were verified in the root, nested and proxy-shell HTML; TypeScript and both Vite builds passed. Netlify Preview #14 built successfully and the product owner approved its appearance. Automated browser verification remains limited by the previously reported usage restriction and preview access protection.

Publish the dashboard origin first using the existing react-dashboard Git integration. Verify deployed commit, assets and anonymous achievement API. Website routing must then publish separately to activate https://k12matrix.com/strategic-plan/demo; include an explicit proxy rule for the new favicon. Do not infer custom URL readiness from the dashboard-only deployment.

Budget one successful production publication for this dashboard. Release preparation is not proof of publication; confirm the Netlify current production deploy and commit after merging.
