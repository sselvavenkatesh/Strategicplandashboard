from uuid import uuid4
import psycopg
from fastapi.testclient import TestClient
from app import main, admin
TOKEN=str(uuid4())

def client():
    c=TestClient(main.app,base_url='https://testserver')
    c.cookies.set(admin.COOKIE,TOKEN)
    return c

def test_no_cookie_means_no_database_reads_or_writes(monkeypatch):
    monkeypatch.setattr(admin.repo,'fetch_one',lambda *args:(_ for _ in ()).throw(AssertionError('Database reached')))
    c=TestClient(main.app)
    assert c.get('/api/v1/admin/workspace').status_code==401
    assert c.post('/api/v1/admin/workspace',json={'revision':'0'*32,'kind':'indicators','rows':[]}).status_code==401

def test_login_reuses_real_accounts_and_sets_cookie_without_exposing_token(monkeypatch):
    monkeypatch.setattr(admin.repo,'admin_auth_config',lambda:{'signin_method':'Userbased'})
    monkeypatch.setattr(admin.repo,'validate_admin_login',lambda *args:{'user_id':6,'user_role':'Admin','user_name':'Owner','user_email':'a@example.invalid'})
    monkeypatch.setattr(admin.repo,'create_admin_session',lambda uid:TOKEN)
    response=client().post('/api/v1/admin/login',json={'email':'a@example.invalid','password':'unit-test-only'})
    assert response.status_code==200 and response.json()['id']=='6' and 'token' not in response.json()
    cookie=response.headers['set-cookie'].lower()
    assert all(flag in cookie for flag in ('httponly','secure','samesite=strict'))

def test_incorrect_credentials_and_superadmin_do_not_enter_admin_portal(monkeypatch):
    monkeypatch.setattr(admin.repo,'admin_auth_config',lambda:{})
    monkeypatch.setattr(admin.repo,'create_admin_session',lambda uid:(_ for _ in ()).throw(AssertionError('Created session')))
    for user in [None,{'user_id':11,'user_role':'SuperAdmin'}]:
        monkeypatch.setattr(admin.repo,'validate_admin_login',lambda *args:user)
        assert client().post('/api/v1/admin/login',json={'email':'a@example.invalid','password':'wrong'}).status_code==401

def test_scoped_session_and_snapshot_use_http_only_token(monkeypatch):
    calls=[]
    monkeypatch.setattr(admin.repo,'fetch_one',lambda sql,params:calls.append((sql,params)) or {'data':{'id':'6','goals':[]}})
    c=client()
    assert c.get('/api/v1/admin/session').json()['id']=='6'
    r=c.get('/api/v1/admin/workspace')
    assert r.status_code==200 and r.headers['cache-control']=='no-store'
    assert all(params==(TOKEN,) for sql,params in calls)
    assert 'v25_admin_snapshot' in calls[-1][0]

def test_scope_denial_conflict_and_metadata_errors_remain_distinct(monkeypatch):
    for error,code in [(psycopg.errors.InsufficientPrivilege('unassigned'),403),(psycopg.errors.SerializationFailure('stale'),409),(psycopg.errors.InvalidAuthorizationSpecification('expired'),401)]:
        def fail(*args):raise error
        monkeypatch.setattr(admin.repo,'fetch_one',fail)
        assert client().post('/api/v1/admin/workspace',json={'revision':'0'*32,'kind':'indicators','rows':[]}).status_code==code

def test_master_actions_and_cross_origin_changes_rejected_before_database(monkeypatch):
    monkeypatch.setattr(admin.repo,'fetch_one',lambda *args:(_ for _ in ()).throw(AssertionError('Database reached')))
    c=client()
    assert c.post('/api/v1/admin/workspace',json={'revision':'0'*32,'kind':'masters','rows':[]}).status_code==422
    assert c.post('/api/v1/admin/workspace',json={'revision':'0'*32,'kind':'indicators','rows':[],'owners':{}}).status_code==422
    assert c.post('/api/v1/admin/workspace',headers={'Origin':'https://other.example'},json={'revision':'0'*32,'kind':'indicators','rows':[]}).status_code==403

def test_logout_revokes_cookie_and_session(monkeypatch):
    calls=[]
    monkeypatch.setattr(admin.repo,'revoke_admin_session',lambda token:calls.append(token))
    r=client().post('/api/v1/admin/logout')
    assert r.status_code==204 and calls==[TOKEN] and 'max-age=0' in r.headers['set-cookie'].lower()

def test_sso_configuration_prevents_password_fallback(monkeypatch):
    monkeypatch.setattr(admin.repo,'admin_auth_config',lambda:{'signin_method':'Google'})
    monkeypatch.setattr(admin.repo,'validate_admin_login',lambda *args:(_ for _ in ()).throw(AssertionError('Password fallback')))
    assert client().post('/api/v1/admin/login',json={'email':'a@example.invalid','password':'test'}).status_code==409

def test_verified_workspace_oauth_sets_cookie_without_query_string_token(monkeypatch):
    monkeypatch.setattr(main.repo,'consume_admin_oauth_state',lambda *args:'https://testserver/strategic-plan/demo/admin')
    monkeypatch.setattr(main.repo,'admin_auth_config',lambda:{'google_client_id':'configured'})
    monkeypatch.setattr(main.repo,'oauth_secret',lambda *args:'unit-test-only')
    monkeypatch.setattr(main,'_form_post',lambda *args:{'access_token':'unit-test-only'})
    monkeypatch.setattr(main,'_json_get',lambda *args:{'email':'a@example.invalid','email_verified':True})
    monkeypatch.setattr(main.repo,'validate_sso_admin',lambda *args:{'user_id':6,'user_email':'a@example.invalid'})
    monkeypatch.setattr(main.repo,'create_admin_session',lambda *args:TOKEN)
    monkeypatch.setattr(main.repo,'fetch_one',lambda *args:{'data':{'id':'6'}})
    response=client().get('/api/v1/auth/admin/oauth/google/callback?code=test&state='+str(uuid4()),follow_redirects=False)
    assert response.status_code==302
    assert response.headers['location']=='https://testserver/strategic-plan/demo/admin'
    assert 'httponly' in response.headers['set-cookie'].lower()
    assert TOKEN not in response.headers['location']


def test_unassigned_upload_returns_functional_assignment_message(monkeypatch):
    def deny(*args):raise psycopg.errors.InsufficientPrivilege('unassigned')
    monkeypatch.setattr(admin.repo,'fetch_one',deny)
    for kind,entity in [('indicators','Indicator'),('initiatives','Initiative')]:
        response=client().post('/api/v1/admin/workspace',json={'revision':'0'*32,'kind':kind,'rows':[]})
        assert response.status_code==403
        assert response.json()['detail']==f'{entity} is not matching your assigned items. Please upload data which are assigned to you.'
