"""Browser-bound OAuth initiation; no provider secret or session token in URLs."""
import base64
import hashlib
import hmac
import re
import secrets
from urllib.parse import urlsplit
from uuid import UUID
from fastapi import HTTPException, Request

RETURN_PATHS = {'/admin', '/strategic-plan/demo/admin'}

def return_destination(value: str | None, request: Request) -> str:
    origin = str(request.base_url).rstrip('/')
    if value is None:
        return origin + '/strategic-plan/demo/admin'
    try:
        parsed = urlsplit(value)
        valid = (parsed.scheme == request.url.scheme and parsed.netloc == request.url.netloc
                 and parsed.path in RETURN_PATHS and not parsed.query and not parsed.fragment
                 and not parsed.username and not parsed.password)
    except ValueError:
        valid = False
    if not valid:
        raise HTTPException(400, 'Invalid sign-in return address.')
    return origin + parsed.path

def cookie_name(provider: str) -> str:
    return '__Host-strategic_oauth_' + provider

def new_proof():
    verifier = secrets.token_urlsafe(48)
    challenge = base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).rstrip(b'=').decode()
    return verifier, challenge

def browser_verifier(request: Request, provider: str, state: str) -> str:
    try:
        canonical = str(UUID(state))
        saved_state, verifier = request.cookies.get(cookie_name(provider), '').split('.', 1)
        if (canonical != state or not hmac.compare_digest(saved_state, canonical)
                or not re.fullmatch(r'[A-Za-z0-9_-]{64}', verifier)):
            raise ValueError()
        return verifier
    except (ValueError, AttributeError):
        raise HTTPException(400, 'Sign-in could not be verified. Start sign-in again.')

def finish(response, provider):
    response.delete_cookie(cookie_name(provider), path='/', secure=True, httponly=True, samesite='lax')
    response.headers['Cache-Control'] = 'no-store'
    response.headers['Referrer-Policy'] = 'no-referrer'
    return response
