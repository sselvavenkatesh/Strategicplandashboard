from fastapi.testclient import TestClient
from app import main,superadmin

def test_user_and_sso_management_require_superadmin_cookie(monkeypatch):
    monkeypatch.setattr(main.repo,'fetch_one',lambda *args:(_ for _ in ()).throw(AssertionError('Unexpected database call')))
    c=TestClient(main.app,base_url='https://testserver')
    assert c.get('/api/v1/superadmin/users').status_code==401
    assert c.post('/api/v1/superadmin/users',json={'revision':'0'*32,'user':{}}).status_code==401
    assert c.get('/api/v1/superadmin/sso-settings').status_code==401
    assert c.post('/api/v1/superadmin/sso-settings',json={}).status_code==401

def test_sso_settings_expose_status_and_callbacks_without_secrets(monkeypatch):
    monkeypatch.setattr(main.repo,'validate_superadmin_session',lambda *args:{'user_id':11})
    monkeypatch.setattr(main.repo,'admin_auth_config',lambda:{'google_configured':True,'microsoft_configured':False})
    c=TestClient(main.app,base_url='https://testserver');c.cookies.set(superadmin.COOKIE,'11111111-1111-4111-8111-111111111111')
    data=c.get('/api/v1/superadmin/sso-settings').json()
    assert data['googleConfigured'] is True and data['microsoftConfigured'] is False
    assert data['googleCallback']=='https://testserver/api/v1/auth/admin/oauth/google/callback'
    assert all('secret' not in key.lower() for key in data)

def test_secret_save_is_origin_checked_and_blank_retains_saved_values(monkeypatch):
    calls=[]
    monkeypatch.setattr(main.repo,'validate_superadmin_session',lambda *args:{'user_id':11})
    monkeypatch.setattr(main.repo,'admin_auth_config',lambda:{})
    monkeypatch.setattr(main.repo,'save_oauth_secrets',lambda *args:calls.append(args))
    c=TestClient(main.app,base_url='https://testserver');c.cookies.set(superadmin.COOKIE,'11111111-1111-4111-8111-111111111111')
    assert c.post('/api/v1/superadmin/sso-settings',json={'googleSecret':'test-secret'},headers={'Origin':'https://other.example'}).status_code==403
    assert not calls
    response=c.post('/api/v1/superadmin/sso-settings',json={'googleSecret':'test-secret'})
    assert response.status_code==200 and calls[0][1:]==('test-secret',None)
    assert 'test-secret' not in response.text

def test_invalid_secret_is_not_echoed_in_validation_errors():
    c=TestClient(main.app,base_url='https://testserver')
    secret='CONFIDENTIAL-'+('x'*4100)
    response=c.post('/api/v1/superadmin/sso-settings',json={'googleSecret':secret})
    assert response.status_code==422 and 'CONFIDENTIAL' not in response.text

def test_public_signin_config_does_not_return_sso_identifiers(monkeypatch):
    monkeypatch.setattr(main.repo,'admin_auth_config',lambda:{'google_client_id':'private-config-id','google_auth_id':'private-auth-id','microsoft_tenant_id':'private-tenant'})
    response=TestClient(main.app).get('/api/v1/admin/signin-config')
    assert response.status_code==200 and 'private-' not in response.text
