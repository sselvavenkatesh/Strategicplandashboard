import base64
import hashlib
from urllib.parse import parse_qs,urlsplit
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from app import main
from app.oauth_security import cookie_name

@pytest.fixture
def flow(monkeypatch):
    states={}; exchanges=[]
    monkeypatch.setattr(main.repo,'admin_auth_config',lambda:{'google_client_id':'google-client','microsoft_client_id':'ms-client','microsoft_tenant_id':'tenant'})
    monkeypatch.setattr(main.repo,'oauth_secret',lambda *a:'unit-test-provider-secret')
    def create(provider,destination):
        state=str(uuid4());states[state]=(provider,destination);return state
    def consume(state,provider):
        item=states.get(state)
        return states.pop(state)[1] if item and item[0]==provider else None
    monkeypatch.setattr(main.repo,'create_admin_oauth_state',create)
    monkeypatch.setattr(main.repo,'consume_admin_oauth_state',consume)
    monkeypatch.setattr(main,'_form_post',lambda url,body:exchanges.append((url,body)) or {'access_token':'unit-test-access-token'})
    monkeypatch.setattr(main,'_json_get',lambda *a:{'email':'test@example.invalid','email_verified':True,'mail':'test@example.invalid'})
    monkeypatch.setattr(main.repo,'validate_sso_admin',lambda *a:{'user_id':6})
    token=str(uuid4())
    monkeypatch.setattr(main.repo,'create_admin_session',lambda *a:token)
    monkeypatch.setattr(main.repo,'fetch_one',lambda *a:{'data':{'id':'6'}})
    return TestClient(main.app,base_url='https://testserver'),states,exchanges,token

def start(c,provider='google',path='/strategic-plan/demo/admin'):
    response=c.get(f'/api/v1/auth/admin/oauth/{provider}/start',params={'return_to':'https://testserver'+path},follow_redirects=False)
    assert response.status_code==302
    return response,parse_qs(urlsplit(response.headers['location']).query)['state'][0]

@pytest.mark.parametrize('provider',['google','microsoft'])
@pytest.mark.parametrize('path',['/admin','/strategic-plan/demo/admin'])
def test_both_providers_complete_cookie_only_flow_with_pkce(flow,provider,path):
    c,states,exchanges,token=flow
    response,state=start(c,provider,path)
    proof=c.cookies.get(cookie_name(provider)).split('.',1)[1]
    params=parse_qs(urlsplit(response.headers['location']).query)
    expected=base64.urlsafe_b64encode(hashlib.sha256(proof.encode()).digest()).rstrip(b'=').decode()
    assert params['code_challenge']==[expected] and params['code_challenge_method']==['S256']
    assert params['redirect_uri']==[f'https://testserver/api/v1/auth/admin/oauth/{provider}/callback']
    cookie=response.headers['set-cookie'].lower()
    assert all(flag in cookie for flag in ['secure','httponly','samesite=lax','path=/','max-age=600'])
    assert proof not in response.headers['location'] and 'unit-test-provider-secret' not in response.text
    result=c.get(f'/api/v1/auth/admin/oauth/{provider}/callback',params={'state':state,'code':'test-code'},follow_redirects=False)
    assert result.status_code==302 and result.headers['location']=='https://testserver'+path
    assert exchanges[0][1]['code_verifier']==proof
    assert token not in result.headers['location'] and 'adminSession' not in result.headers['location']
    assert c.cookies.get('strategic_admin_session')==token and c.cookies.get(cookie_name(provider)) is None
    assert result.headers['cache-control']=='no-store' and result.headers['referrer-policy']=='no-referrer'
    assert c.get(f'/api/v1/auth/admin/oauth/{provider}/callback',params={'state':state,'code':'test-code'}).status_code==400

@pytest.mark.parametrize('destination',['https://other.example/admin','http://testserver/admin','https://testserver.evil/admin','https://testserver/admin?next=evil','https://testserver/admin#token','https://testserver/arbitrary/admin','//testserver/admin','https://attacker@testserver/admin'])
def test_untrusted_start_destinations_fail_before_creating_state(flow,destination):
    c,states,_,_=flow
    r=c.get('/api/v1/auth/admin/oauth/google/start',params={'return_to':destination},follow_redirects=False)
    assert r.status_code==400 and not states

def test_callback_in_another_browser_cannot_consume_state(flow):
    c,states,exchanges,_=flow;_,state=start(c)
    other=TestClient(main.app,base_url='https://testserver')
    r=other.get('/api/v1/auth/admin/oauth/google/callback',params={'state':state,'code':'test-code'})
    assert r.status_code==400 and state in states and not exchanges

def test_swapped_state_and_wrong_provider_fail_before_exchange(flow):
    c,states,exchanges,_=flow;_,state=start(c)
    for provider,value in [('microsoft',state),('google',str(uuid4())),('google','invalid')]:
        assert c.get(f'/api/v1/auth/admin/oauth/{provider}/callback',params={'state':value,'code':'test-code'}).status_code==400
    assert state in states and not exchanges

def test_callback_rechecks_saved_destination_even_when_browser_bound(flow):
    c,states,exchanges,_=flow;_,state=start(c);states[state]=('google','https://other.example/admin')
    assert c.get('/api/v1/auth/admin/oauth/google/callback',params={'state':state,'code':'test-code'}).status_code==400
    assert not exchanges and 'strategic_admin_session' not in c.cookies

def test_provider_error_is_generic_and_clears_proof(flow):
    c,_,exchanges,_=flow;_,state=start(c)
    r=c.get('/api/v1/auth/admin/oauth/google/callback',params={'state':state,'error':'untrusted-provider-text'},follow_redirects=False)
    assert r.status_code==302 and r.headers['location'].endswith('?authError=oauth_failed')
    assert c.cookies.get(cookie_name('google')) is None and not exchanges

def test_expired_database_state_does_not_exchange_code(flow):
    c,states,exchanges,_=flow;_,state=start(c);states.clear()
    assert c.get('/api/v1/auth/admin/oauth/google/callback',params={'state':state,'code':'test-code'}).status_code==400
    assert not exchanges

def test_unverified_or_unmapped_identity_cannot_create_session(flow,monkeypatch):
    c,_,_,_=flow
    monkeypatch.setattr(main.repo,'create_admin_session',lambda *a:(_ for _ in ()).throw(AssertionError('Session minted')))
    for verified,mapped in [(False,True),(True,False)]:
        monkeypatch.setattr(main,'_json_get',lambda *a:{'email':'test@example.invalid','email_verified':verified})
        monkeypatch.setattr(main.repo,'validate_sso_admin',lambda *a: {'user_id':6} if mapped else None)
        _,state=start(c)
        r=c.get('/api/v1/auth/admin/oauth/google/callback',params={'state':state,'code':'test-code'},follow_redirects=False)
        assert r.status_code==302 and 'authError=' in r.headers['location']
        assert 'strategic_admin_session' not in c.cookies

@pytest.mark.parametrize('method,path,body',[('post','/api/v1/auth/admin/login',{'email':'x','password':'test'}),('get','/api/v1/auth/admin/session',None),('post','/api/v1/auth/admin/logout',None),('get','/api/v1/superadmin/configuration',None)])
def test_retired_token_routes_never_access_database(monkeypatch,method,path,body):
    monkeypatch.setattr(main.repo,'validate_admin_login',lambda *a:(_ for _ in ()).throw(AssertionError('Legacy login called')))
    monkeypatch.setattr(main.repo,'validate_admin_session',lambda *a:(_ for _ in ()).throw(AssertionError('Legacy session called')))
    c=TestClient(main.app)
    r=getattr(c,method)(path,**({'json':body} if body else {}))
    assert r.status_code==410 and 'token' not in r.json()
