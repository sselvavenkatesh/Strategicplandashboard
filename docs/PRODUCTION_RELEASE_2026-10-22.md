# Production release candidate — 22 October 2026

The product owner authorized production deployment of Strategic Plan Dashboard after disabling the Netlify badge. This supersedes the prior October 23 hold for this dashboard only. Website publication remains a separate second step.

Candidate includes indicator achievement bars/target scorecards, updated branding, clean chatbot indicator labels and support for both existing root routes and /strategic-plan/demo. The stable /strategic-plan-demo HTML shell is emitted for the website's later proxy routing.

Production explicitly sets VITE_ACHIEVEMENT_PREVIEW=false. Demonstration targets remain isolated; the live achievement API currently returns seven indicators with missing production targets, hence N/A percentages. No district records are changed by this release. The faster district-ai-preview remains preview-only; normal builds continue using the existing district-ai service. No shared AI-service replacement is part of this frontend publish.

Validation: exact remote source synchronized locally by Git blob hashes; TypeScript and both Vite builds passed; production bundle checks confirm the preview AI endpoint is excluded and the prefixed shell matches its HTML build; live public-key achievement RPC returns HTTP 200 with preview=false and four goals. Existing preview QA is documented in the other implementation notes. Browser verification remains unavailable due to the previously reported browser usage limit.

Publishing order: dashboard origin first; verify root, Summary, Goal, stable shell and nested assets; then deploy the corporate website routing to activate https://k12matrix.com/strategic-plan/demo. The existing URL remains available. Budget is one successful production deploy (15 credits) for this dashboard. This record is preparation, not proof that Netlify has published the candidate.
