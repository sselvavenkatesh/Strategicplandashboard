"""V2.5 Admin workspace: existing district accounts, scoped reporting writes."""
import json
from uuid import UUID
import psycopg
from fastapi import APIRouter, HTTPException, Request, Response
from pydantic import BaseModel, ConfigDict, Field
from . import repository as repo
from .superadmin import checked_origin

router=APIRouter(prefix='/api/v1/admin')
COOKIE='strategic_admin_session'

def token_from(request:Request):
    try: return str(UUID(request.cookies.get(COOKIE,'')))
    except ValueError: raise HTTPException(401,'Sign in with your Admin account.')

def db_error(error,kind=None):
    if error.sqlstate=='28000': raise HTTPException(401,'Invalid or expired Admin session.')
    if error.sqlstate=='42501':
        entity='Indicator' if kind=='indicators' else 'Initiative' if kind=='initiatives' else 'Item'
        raise HTTPException(403,f'{entity} is not matching your assigned items. Please upload data which are assigned to you.')
    if error.sqlstate=='40001': raise HTTPException(409,'Data or assignments changed. Reload and try again.')
    if error.sqlstate=='23505': raise HTTPException(409,'A record with the same reporting key already exists.')
    if error.sqlstate in ('P0001','23503','23514','22P02','23502'):
        raise HTTPException(422,error.diag.message_primary if error.sqlstate=='P0001' else 'Check the selected values and reporting keys.')
    raise HTTPException(503,'Admin data is temporarily unavailable.')

def set_session(response:Response,token:str):
    response.set_cookie(COOKIE,token,max_age=8*60*60,secure=True,httponly=True,samesite='strict',path='/')
    response.headers['Cache-Control']='no-store'

class Login(BaseModel):
    model_config=ConfigDict(extra='forbid')
    email:str=Field(min_length=1,max_length=254)
    password:str=Field(min_length=1)

@router.post('/login')
def login(body:Login,request:Request,response:Response):
    checked_origin(request)
    try:
        user=repo.validate_admin_login(body.email.strip(),body.password)
        if not user or user.get('user_role')!='Admin': raise HTTPException(401,'Sign in failed. Check your Admin email and password.')
        token=repo.create_admin_session(user['user_id'])
    except psycopg.Error as error: db_error(error)
    set_session(response,token)
    return {'id':str(user['user_id']),'name':user.get('user_name') or user['user_email'],'email':user['user_email']}

@router.get('/session')
def session(request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    try: result=repo.fetch_one('select public.v25_admin_identity(%s::uuid) as data',(token_from(request),))
    except psycopg.Error as error: db_error(error)
    if not result or not result['data']: raise HTTPException(401,'Invalid or expired Admin session.')
    return result['data']

@router.get('/workspace')
def workspace(request:Request,response:Response):
    response.headers['Cache-Control']='no-store'
    try: return repo.fetch_one('select public.v25_admin_snapshot(%s::uuid) as data',(token_from(request),))['data']
    except psycopg.Error as error: db_error(error)

class Save(BaseModel):
    model_config=ConfigDict(extra='forbid')
    revision:str=Field(min_length=32,max_length=32)
    kind:str
    rows:list[dict]=Field(max_length=5000)

@router.post('/workspace')
def save(body:Save,request:Request,response:Response):
    token=token_from(request);checked_origin(request)
    if body.kind not in ('indicators','initiatives'): raise HTTPException(422,'Only assigned reporting data can be edited.')
    payload=json.dumps(body.rows)
    if len(payload.encode())>3_000_000: raise HTTPException(413,'Upload is too large.')
    response.headers['Cache-Control']='no-store'
    try: return repo.fetch_one('select public.v25_admin_save(%s::uuid,%s,%s,%s::jsonb) as data',(token,body.revision,body.kind,payload))['data']
    except psycopg.Error as error: db_error(error,body.kind)

@router.post('/logout',status_code=204)
def logout(request:Request,response:Response):
    checked_origin(request)
    token=request.cookies.get(COOKIE)
    if token:
        try: repo.revoke_admin_session(str(UUID(token)))
        except ValueError: pass
        except psycopg.Error as error: db_error(error)
    response.delete_cookie(COOKIE,path='/',secure=True,httponly=True,samesite='strict')
    response.headers['Cache-Control']='no-store'
