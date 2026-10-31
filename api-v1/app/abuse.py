"""Shared PostgreSQL quotas; disabled only in isolated tests/local development."""
import hashlib
import hmac
from fastapi import HTTPException,Request
from .config import get_settings
from .proxy_security import proxy_origin
from . import repository as repo

def limited(scope,subject,maximum,seconds):
    settings=get_settings()
    digest=hmac.new(settings.proxy_shared_key.encode(),subject.encode(),hashlib.sha256).hexdigest()
    try:allowed=repo.fetch_one('select public.v25_take_api_limit(%s,%s,%s,%s) as allowed',(scope,digest,maximum,seconds))['allowed']
    except Exception:raise HTTPException(503,'Request protection is temporarily unavailable.')
    if not allowed:raise HTTPException(429,'Too many requests. Please try again shortly.',headers={'Retry-After':str(seconds)})

def client_address(request:Request):
    if proxy_origin(request):return request.headers.get('x-strategic-client-ip','unknown')[:100]
    # Vercel overwrites this platform-owned header; ignore it outside Vercel.
    import os
    if os.getenv('VERCEL')=='1':return request.headers.get('x-vercel-forwarded-for','unknown').split(',')[0].strip()[:100]
    return request.client.host if request.client else 'unknown'

def request_limits(request:Request,body:bytes):
    if not get_settings().abuse_controls_enabled:return
    path=request.url.path;ip=client_address(request)
    if path.endswith('/login') or '/oauth/' in path and path.endswith('/start'):
        limited('login-ip',ip,120,900)
        if path.endswith('/login'):
            import json
            try:account=str(json.loads(body).get('email','')).strip().casefold()
            except Exception:account='invalid'
            limited('login-account',account,15,900)
    elif path in ('/api/v1/ai/ask','/api/v1/ai/ask-stream'):
        limited('ai-ip',ip,12,60);limited('ai-global','district',120,3600)
    elif path=='/api/v1/access-log':limited('telemetry',ip,120,60)

def acquire_ai_lease():
    if not get_settings().abuse_controls_enabled:return None
    try:lease=repo.fetch_one('select public.v25_acquire_ai_lease() as id')['id']
    except Exception:raise HTTPException(503,'AI request protection is temporarily unavailable.')
    if not lease:raise HTTPException(429,'AI is busy. Please try again shortly.',headers={'Retry-After':'15'})
    return lease

def release_ai_lease(lease):
    if lease:
        try:repo.fetch_one('select public.v25_release_ai_lease(%s::uuid)',(str(lease),))
        except Exception:pass # bounded lease expires even after an instance failure
