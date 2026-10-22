# Branded Strategic Plan demo — 22 October 2026

Requested URL: https://k12matrix.com/strategic-plan/demo

The build emits the existing root application plus a second Vite build in dist/strategic-plan/demo. Both use the same source, APIs, target configuration and styles. BrowserRouter detects the exact demo prefix with a segment boundary. Public logo and OAuth callback paths use the build base. Light-theme CSS resolves the logo through Vite. Netlify and Vercel have prefix-specific SPA fallbacks before the root fallback.

Corporate website routing proxies the demo HTML and assets, keeping dashboard assets under their own prefix. Website and dashboard remain separate repositories and deploys. Existing root dashboard links remain valid. No DNS changes.

Release sequence: deploy dashboard first and check /strategic-plan/demo/index.html and referenced assets on its Netlify production origin; then publish website routing. Respect the October 23 production hold. Do not enable VITE_ACHIEVEMENT_PREVIEW in production. Demonstration targets remain scoped to the existing preview branch. Existing district targets and data are unchanged. SSO on the new domain requires an allowed Supabase redirect https://k12matrix.com/strategic-plan/demo/ before use; this change does not modify provider configuration.

Validation: TypeScript and both Vite builds pass. Hosted routing and browser checks are recorded in the paired website PR after deployment. No production deployment is performed by this change.
