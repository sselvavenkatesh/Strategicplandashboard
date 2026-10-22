# AI latency preview — 22 October 2026

The existing district-ai service and all production deployments remain unchanged. New district-ai-preview duplicates its data retrieval, system instructions, model selection, authentication and response format. For gpt-oss models only it requests the supported low reasoning setting rather than the model default. Existing model credentials stay in project secrets. JWT verification remains enabled. Additional response timing fields contain only millisecond/token counts, not credentials or reasoning.

Frontend preview routing uses the existing VITE_ACHIEVEMENT_PREVIEW flag, enabled only on the isolated achievement-preview branch. Normal builds continue to invoke district-ai. The public website preview snapshot is built with that preview flag. Indicator-name cleanup, Copy/Download, layouts and database records are unchanged.

Measured direct public-key HTTPS tests:
- Improvement-over-time question: HTTP 200; end-to-end 13.64s; data 905ms, model 5993ms, total service 7105ms.
- Main goals question: HTTP 200; end-to-end 9.20s; data 536ms, model 1961ms, total service 2955ms. All four goals returned.
- Latest All Students ELA: HTTP 200; end-to-end 8.74s; data 526ms, model 1627ms, total service 2639ms. 39.53%, 2025-26 returned.

Earlier unmodified-service conversation logs include 31.0s, 78.2s and 89.8s server response times; these are historical observations, not a controlled paired benchmark. External model load, network latency and response length still vary. No fixed response-time guarantee. No cache or fabricated response is introduced.

The full existing data context and scope rules are retained to keep this latency change small. Database query time is measured separately. Rollout to the shared production AI service requires separate validation and authorization; shipping the frontend alone does not change production AI settings.

TypeScript and root/prefixed Vite builds pass. API verification is performed directly; browser verification is unavailable because its automatic approval review hit the usage limit earlier in this session.
