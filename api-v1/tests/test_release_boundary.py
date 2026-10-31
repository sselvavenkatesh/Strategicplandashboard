from fastapi.testclient import TestClient
from app import main,ai
from app.config import get_settings
from app import abuse
from urllib.parse import urlsplit,parse_qs
import pytest

@pytest.fixture
def client(monkeypatch):
    monkeypatch.setattr(get_settings(),'proxy_shared_key','unit-proxy-secret')
    return TestClient(main.app,base_url='https://backend.example')

def proxy():return {'x-strategic-proxy-token':'unit-proxy-secret','x-strategic-public-origin':'https://k12matrix.com','Origin':'https://k12matrix.com'}

def test_public_proxy_assertions_fail_closed(client):
    assert client.get('/api/v1/admin/session',headers={'x-strategic-proxy-token':'wrong'}).status_code==403
    assert client.get('/api/v1/admin/session',headers={**proxy(),'x-strategic-public-origin':'https://evil.example'}).status_code==403

def test_proxy_preserves_exact_origin_checks(client,monkeypatch):
    monkeypatch.setattr(main.repo,'validate_admin_login',lambda *args:None)
    assert client.post('/api/v1/admin/login',headers=proxy(),json={'email':'test@example.invalid','password':'a'}).status_code==401
    assert client.post('/api/v1/admin/login',headers={**proxy(),'Origin':'http://k12matrix.com'},json={'email':'a','password':'a'}).status_code==403

def test_google_callback_and_return_stay_on_external_host(client,monkeypatch):
    from uuid import uuid4
    monkeypatch.setattr(main.repo,'admin_auth_config',lambda:{'google_client_id':'client'})
    monkeypatch.setattr(main.repo,'oauth_secret',lambda *args:'unit-provider-secret')
    monkeypatch.setattr(main.repo,'create_admin_oauth_state',lambda *args:str(uuid4()))
    r=client.get('/api/v1/auth/admin/oauth/google/start',headers=proxy(),params={'return_to':'https://k12matrix.com/strategic-plan/demo/admin'},follow_redirects=False)
    assert r.status_code==302
    assert parse_qs(urlsplit(r.headers['location']).query)['redirect_uri']==['https://k12matrix.com/strategic-plan/demo/api/v1/auth/admin/oauth/google/callback']
    assert '__Host-strategic_oauth_google=' in r.headers['set-cookie']
    assert 'unit-proxy-secret' not in r.text+r.headers['location']

def test_large_chunked_body_rejected_before_login(client,monkeypatch):
    monkeypatch.setattr(main.repo,'validate_admin_login',lambda *args:pytest.fail('auth called'))
    r=client.post('/api/v1/admin/login',content=iter([b' '*10000,b' '*10000]))
    assert r.status_code==413

def test_shared_quota_returns_retry_after(client,monkeypatch):
    monkeypatch.setattr(get_settings(),'abuse_controls_enabled',True)
    monkeypatch.setattr(abuse.repo,'fetch_one',lambda *args:{'allowed':False})
    r=client.post('/api/v1/admin/login',json={'email':'a','password':'b'})
    assert r.status_code==429 and r.headers['Retry-After']=='900'

def test_ai_stream_keeps_json_contract_and_session_scope(client,monkeypatch):
    monkeypatch.setattr(ai.repo,'feature_enabled',lambda *args:True)
    monkeypatch.setattr(ai.repo,'ai_credentials',lambda:{'api_key':'unit-provider-secret'})
    captured=[]
    monkeypatch.setattr(ai,'run_ai',lambda q,s,u:captured.append(u) or {'answer':'Public strategic plan answer','sources':[]})
    r=client.post('/api/v1/ai/ask-stream',json={'question':'Show goals'})
    assert r.status_code==200 and r.json()['answer']=='Public strategic plan answer'
    assert r.content.startswith(b' \n') and captured==[None]
    assert r.headers['Cache-Control']=='no-store'

def test_ai_stream_handles_failure_without_exposing_provider_error(client,monkeypatch):
    monkeypatch.setattr(ai.repo,'feature_enabled',lambda *args:True)
    monkeypatch.setattr(ai.repo,'ai_credentials',lambda:{'api_key':'unit-secret'})
    def fail(*args):raise RuntimeError('unit-secret')
    monkeypatch.setattr(ai,'run_ai',fail)
    r=client.post('/api/v1/ai/ask-stream',json={'question':'Show goals'})
    assert 'detail' in r.json() and 'unit-secret' not in r.text
