from uuid import uuid4
import psycopg
from fastapi.testclient import TestClient
from app import main, superadmin

TOKEN=str(uuid4())

def client():
    value=TestClient(main.app,base_url='https://testserver')
    value.cookies.set(superadmin.COOKIE,TOKEN)
    return value

def test_workspace_requires_session_before_any_database_call(monkeypatch):
    monkeypatch.setattr(main.repo,'fetch_one',lambda *args: (_ for _ in ()).throw(AssertionError('Unexpected database call')))
    c=TestClient(main.app,base_url='https://testserver')
    assert c.get('/api/v1/superadmin/workspace').status_code==401
    assert c.post('/api/v1/superadmin/workspace',json={'revision':'0'*32,'change':{'action':'configuration'}}).status_code==401

def test_existing_login_issues_http_only_secure_cookie(monkeypatch):
    monkeypatch.setattr(main.repo,'validate_superadmin_login',lambda *args:{'user_id':11,'user_name':'District Owner','user_email':'owner@example.invalid','session_token':TOKEN})
    c=TestClient(main.app,base_url='https://testserver')
    result=c.post('/api/v1/superadmin/login',json={'email':'owner@example.invalid','password':'unit-test-only'})
    assert result.status_code==200 and result.json()['id']=='11'
    cookie=result.headers['set-cookie'].lower()
    assert 'httponly' in cookie and 'secure' in cookie and 'samesite=strict' in cookie
    assert 'token' not in result.json()

def test_invalid_credentials_do_not_issue_cookie(monkeypatch):
    monkeypatch.setattr(main.repo,'validate_superadmin_login',lambda *args:None)
    result=TestClient(main.app).post('/api/v1/superadmin/login',json={'email':'bad@example.invalid','password':'wrong'})
    assert result.status_code==401 and 'set-cookie' not in result.headers

def test_cross_origin_save_is_denied_before_database(monkeypatch):
    monkeypatch.setattr(main.repo,'fetch_one',lambda *args: (_ for _ in ()).throw(AssertionError('Unexpected database call')))
    result=client().post('/api/v1/superadmin/workspace',headers={'Origin':'https://untrusted.example'},json={'revision':'0'*32,'change':{'action':'configuration'}})
    assert result.status_code==403

def test_save_passes_revision_and_session_to_transactional_contract(monkeypatch):
    calls=[]
    def write(sql,params):calls.append((sql,params));return {'data':{'revision':'1'*32,'goals':[]}}
    monkeypatch.setattr(main.repo,'fetch_one',write)
    result=client().post('/api/v1/superadmin/workspace',headers={'Origin':'https://testserver'},json={'revision':'0'*32,'change':{'action':'reporting','kind':'indicators','dataRows':[]}})
    assert result.status_code==200 and result.json()['revision']=='1'*32
    assert calls[0][1][0:2]==(TOKEN,'0'*32)
    assert result.headers['cache-control']=='no-store'

def test_concurrent_edit_conflict_is_not_reported_as_success(monkeypatch):
    def conflict(*args):raise psycopg.errors.SerializationFailure('stale')
    monkeypatch.setattr(main.repo,'fetch_one',conflict)
    result=client().post('/api/v1/superadmin/workspace',json={'revision':'0'*32,'change':{'action':'reporting'}})
    assert result.status_code==409

def test_logout_revokes_and_clears_cookie(monkeypatch):
    calls=[]
    monkeypatch.setattr(main.repo,'fetch_one',lambda sql,params:calls.append(params))
    result=client().post('/api/v1/superadmin/logout',json={})
    assert result.status_code==204 and calls==[(TOKEN,)]
    assert 'max-age=0' in result.headers['set-cookie'].lower()
