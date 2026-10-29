"""Authenticated V2.5 workspace; reuse existing identity and write SQL contracts."""
import json
from uuid import UUID
from urllib.parse import urlsplit
import psycopg
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, Field
from . import repository as repo

router = APIRouter(prefix='/api/v1/superadmin')
COOKIE = 'strategic_superadmin_session'

def token_from(request: Request):
    token = request.cookies.get(COOKIE)
    if not token:
        raise HTTPException(401, 'Sign in with your Super Admin account.')
    try: return str(UUID(token))
    except ValueError: raise HTTPException(401, 'Invalid or expired Super Admin session.')

def checked_origin(request: Request):
    origin = request.headers.get('origin')
    if origin and urlsplit(origin).netloc != request.url.netloc:
        raise HTTPException(403, 'Cross-site changes are not allowed.')

def db_error(error):
    if error.sqlstate == '28000': raise HTTPException(401, 'Invalid or expired Super Admin session.')
    if error.sqlstate == '40001': raise HTTPException(409, 'Data changed since loading. Reload and try again.')
    if error.sqlstate == '23505': raise HTTPException(409, 'A record with the same key already exists.')
    if error.sqlstate in ('P0001','23503','23514','22P02','23502'):
        message = error.diag.message_primary if error.sqlstate == 'P0001' else 'Check the selected values and reporting keys.'
        raise HTTPException(422, message)
    raise HTTPException(503, 'Super Admin database operation is unavailable.')

@router.get('/session')
def session(request: Request, response: Response):
    response.headers['Cache-Control']='no-store'
    try: user = repo.validate_superadmin_session(token_from(request))
    except psycopg.Error as error: db_error(error)
    if not user: raise HTTPException(401, 'Invalid or expired Super Admin session.')
    return {'id':user['user_id'],'name':user.get('user_name') or 'Super Admin','email':user.get('user_email')}

@router.get('/workspace')
def workspace(request: Request, response: Response):
    response.headers['Cache-Control']='no-store'
    try: return repo.fetch_one('select public.v25_superadmin_snapshot(%s::uuid) as data',(token_from(request),))['data']
    except psycopg.Error as error: db_error(error)

class SaveWorkspace(BaseModel):
    revision: str = Field(min_length=32,max_length=32)
    change: dict

@router.get('/users')
def users(request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    try: return repo.fetch_one('select public.v25_superadmin_users(%s::uuid) as data',(token_from(request),))['data']
    except psycopg.Error as error: db_error(error)

class SaveUser(BaseModel):
    revision:str=Field(min_length=32,max_length=32)
    user:dict

@router.post('/users')
def save_user(body:SaveUser,request:Request,response:Response):
    token=token_from(request);checked_origin(request)
    if set(body.user)-{'id','name','email','googleEmail','microsoftEmail','active','password'}: raise HTTPException(422,'Unknown user fields.')
    payload=json.dumps(body.user)
    if len(payload.encode())>5000: raise HTTPException(413,'User details are too large.')
    response.headers['Cache-Control']='no-store'
    try: return repo.fetch_one('select public.v25_superadmin_save_user(%s::uuid,%s,%s::jsonb) as data',(token,body.revision,payload))['data']
    except psycopg.Error as error: db_error(error)

@router.get('/sso-settings')
def sso_settings(request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    try:
        if not repo.validate_superadmin_session(token_from(request)): raise HTTPException(401,'Invalid or expired Super Admin session.')
        config=repo.admin_auth_config() or {}
        base=str(request.base_url).rstrip('/')
        return {'googleConfigured':bool(config.get('google_configured')),'microsoftConfigured':bool(config.get('microsoft_configured')),'googleSecretSaved':bool(repo.oauth_secret('google')),'microsoftSecretSaved':bool(repo.oauth_secret('microsoft')),'googleCallback':base+'/api/v1/auth/admin/oauth/google/callback','microsoftCallback':base+'/api/v1/auth/admin/oauth/microsoft/callback'}
    except psycopg.Error as error: db_error(error)

class SsoSecrets(BaseModel):
    googleSecret:str|None=Field(default=None,max_length=4000)
    microsoftSecret:str|None=Field(default=None,max_length=4000)

@router.get('/ai-settings')
def ai_settings(request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    try:return repo.fetch_one('select public.v25_superadmin_ai_settings(%s::uuid) as data',(token_from(request),))['data']
    except psycopg.Error as error:db_error(error)

class AiSettings(BaseModel):
    model_config={'extra':'forbid'}
    model:str=Field(min_length=1,max_length=150)
    apiKey:str|None=Field(default=None,max_length=4000)

@router.post('/ai-settings')
def save_ai_settings(body:AiSettings,request:Request,response:Response):
    token=token_from(request);checked_origin(request)
    response.headers['Cache-Control']='no-store'
    try:return repo.fetch_one('select public.v25_superadmin_save_ai_settings(%s::uuid,%s,%s) as data',(token,body.model,body.apiKey))['data']
    except psycopg.Error as error:db_error(error)

@router.post('/sso-settings')
def save_sso_settings(body:SsoSecrets,request:Request,response:Response):
    token=token_from(request);checked_origin(request)
    try:
        if not repo.validate_superadmin_session(token): raise HTTPException(401,'Invalid or expired Super Admin session.')
        repo.save_oauth_secrets(token,body.googleSecret or None,body.microsoftSecret or None)
    except psycopg.Error as error: db_error(error)
    return sso_settings(request,response)

@router.post('/workspace')
def save_workspace(body: SaveWorkspace, request: Request, response: Response):
    token=token_from(request); checked_origin(request)
    response.headers['Cache-Control']='no-store'
    if body.change.get('action') not in {'configuration','masters','reporting','delete_goal'}:
        raise HTTPException(422,'Unknown save action.')
    payload=json.dumps(body.change)
    if len(payload.encode())>3_000_000: raise HTTPException(413,'Save payload is too large.')
    try: return repo.fetch_one('select public.v25_superadmin_save(%s::uuid,%s,%s::jsonb) as data',(token,body.revision,payload))['data']
    except psycopg.Error as error: db_error(error)

@router.post('/logout',status_code=204)
def logout(request: Request, response: Response):
    checked_origin(request)
    token=request.cookies.get(COOKIE)
    if token:
        try: repo.fetch_one('select public.v25_superadmin_logout(%s::uuid)',(str(UUID(token)),))
        except ValueError: pass
        except psycopg.Error as error: db_error(error)
    response.delete_cookie(COOKIE,path='/',secure=True,httponly=True,samesite='strict')
