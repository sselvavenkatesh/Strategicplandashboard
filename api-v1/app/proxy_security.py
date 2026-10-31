"""Trust only our authenticated server proxy; never arbitrary forwarded hosts."""
import hmac
import re
from urllib.parse import urlsplit
from fastapi import HTTPException, Request
from .config import get_settings

_ORIGINS={'https://k12matrix.com','https://www.k12matrix.com','https://k12matrix-strategicplan.netlify.app'}

def proxy_origin(request:Request):
    supplied=request.headers.get('x-strategic-proxy-token','')
    configured=get_settings().proxy_shared_key
    if not supplied:return None
    if not configured or not hmac.compare_digest(supplied,configured):
        raise HTTPException(403,'Untrusted application proxy.')
    origin=request.headers.get('x-strategic-public-origin','')
    district_origin=get_settings().public_app_origin
    valid=(origin==district_origin) if district_origin else (origin in _ORIGINS or bool(re.fullmatch(r'https://(?:deploy-preview-\d+|[a-z0-9-]+)--(?:k12matrix|k12matrix-strategicplan)\.netlify\.app',origin)))
    if not valid:
        raise HTTPException(403,'Untrusted application origin.')
    return origin

def public_origin(request:Request):
    return proxy_origin(request) or get_settings().public_app_origin or str(request.base_url).rstrip('/')

def public_api_base(request:Request):
    origin=public_origin(request)
    return origin+(get_settings().public_app_base_path.rstrip('/') if proxy_origin(request) else '')

def checked_origin(request:Request):
    origin=request.headers.get('origin')
    if request.headers.get('sec-fetch-site')=='cross-site':
        raise HTTPException(403,'Cross-site changes are not allowed.')
    if origin and origin!=public_origin(request):
        raise HTTPException(403,'Cross-site changes are not allowed.')
