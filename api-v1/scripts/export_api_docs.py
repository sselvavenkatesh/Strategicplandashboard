"""Export the registered routes without connecting to PostgreSQL.

Run from the repository root: python api-v1/scripts/export_api_docs.py
Cookie authentication is enforced manually by handlers, so annotate the export.
This does not change the runtime OpenAPI or application behavior.
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.main import app

schema = app.openapi()
schema['info']['description'] += '\nV2.5 documentation snapshot. Cookie security annotations are supplied by the exporter; many responses are untyped at runtime. See API_DOCUMENTATION.md for authorization, legacy routes and errors.'
schema.setdefault('components', {})['securitySchemes'] = {
    'AdminCookie': {'type': 'apiKey', 'in': 'cookie', 'name': 'strategic_admin_session'},
    'SuperAdminCookie': {'type': 'apiKey', 'in': 'cookie', 'name': 'strategic_superadmin_session'},
}
lines = ['# Registered route inventory', '', 'Generated from FastAPI; paths below include the `/api/v1` prefix. See [API documentation](API_DOCUMENTATION.md) for payloads and behavior.', '', '| Method | Path | Access | Parameters | JSON request |', '| --- | --- | --- | --- | --- |']
count = 0
for path, methods in schema['paths'].items():
    for method, op in methods.items():
        if method not in {'get', 'post', 'put', 'patch', 'delete'}:
            continue
        count += 1
        access = 'Public'
        if path.startswith('/api/v1/superadmin/') and path not in {'/api/v1/superadmin/login'}:
            modern = path.rsplit('/', 1)[-1] in {'session', 'workspace', 'users', 'sso-settings', 'ai-settings', 'logout'}
            access = 'Super Admin cookie' if modern else 'Legacy token; writes gated'
            if modern:
                op['security'] = [{'SuperAdminCookie': []}]
        elif path.startswith('/api/v1/admin/') and path not in {'/api/v1/admin/login', '/api/v1/admin/signin-config'}:
            access = 'Admin cookie'
            op['security'] = [{'AdminCookie': []}]
        elif '/auth/admin/' in path:
            access = 'OAuth provider flow; current and legacy callbacks' if '/oauth/' in path else 'Legacy authentication'
        elif path == '/api/v1/ai/ask':
            access = 'Public; validated cookies permit private context'
            op['security'] = [{}, {'AdminCookie': []}, {'SuperAdminCookie': []}]
        elif path in {'/validation', '/api/v1/validation'}:
            access = 'Diagnostic; disabled by default'
        elif path == '/api/v1/preview/dataset':
            access = 'Public; feature gated'
        if path in {'/api/v1/admin/logout', '/api/v1/superadmin/logout'}:
            op['security'] = [{}, *op.get('security', [])]
            access += ' if present; clears cookie'
        if path in {'/api/v1/auth/admin/login', '/api/v1/auth/admin/session', '/api/v1/auth/admin/logout', '/api/v1/auth/admin/sso/validate'} or (path == '/api/v1/superadmin/configuration' and method == 'get'):
            access = 'Retired; HTTP 410; use cookie workspace API'
            op['deprecated'] = True
            op.pop('security', None)
            op['responses'] = {'410': {'description': 'Retired token-based endpoint; use the workspace API.'}}
        op['x-v25-access'] = access
        params = ', '.join(f"{p['name']} ({p['in']}{', required' if p.get('required') else ', optional'})" for p in op.get('parameters', [])) or '—'
        body = op.get('requestBody', {}).get('content', {}).get('application/json', {}).get('schema', {})
        body_name = body.get('$ref', '').rsplit('/', 1)[-1] or '—'
        lines.append(f'| {method.upper()} | `{path}` | {access} | {params} | `{body_name}` |')
lines += ['', f'Total: **{count} registered operations**. Includes compatibility and diagnostic operations; this is not a claim that every operation is production enabled.', '', '## Request schemas', '']
for name, definition in schema.get('components', {}).get('schemas', {}).items():
    if name in {'HTTPValidationError', 'ValidationError'}:
        continue
    lines += [f'### {name}', '', '```json', json.dumps(definition, indent=2), '```', '']
(ROOT / 'docs/openapi-v2.5.json').write_text(json.dumps(schema, indent=2) + '\n')
(ROOT / 'docs/API_ROUTE_INVENTORY.md').write_text('\n'.join(lines) + '\n')
print(f'Exported {count} operations and request schemas.')
