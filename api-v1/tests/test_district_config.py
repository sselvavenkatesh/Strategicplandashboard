import pytest
from pydantic import ValidationError
from fastapi import Request, HTTPException
from app.config import Settings,get_settings
from app.proxy_security import proxy_origin,public_api_base

def test_schema_name_is_server_controlled_identifier():
    assert Settings(district_schema='district_allen_park').district_schema=='district_allen_park'
    for value in ['public,other','district_x;drop schema public','district_x.other','']:
        with pytest.raises(ValidationError):Settings(district_schema=value)

def test_district_proxy_rejects_riverside_origin(monkeypatch):
    settings=get_settings()
    monkeypatch.setattr(settings,'public_app_origin','https://allenpark.k12matrix.com')
    monkeypatch.setattr(settings,'public_app_base_path','')
    monkeypatch.setattr(settings,'proxy_shared_key','test-key')
    def request(origin):
        return Request({'type':'http','method':'GET','path':'/','scheme':'https','server':('api.example',443),'headers':[(b'x-strategic-proxy-token',b'test-key'),(b'x-strategic-public-origin',origin.encode())]})
    assert public_api_base(request('https://allenpark.k12matrix.com'))=='https://allenpark.k12matrix.com'
    with pytest.raises(HTTPException):proxy_origin(request('https://k12matrix.com'))

def test_new_district_editing_requires_explicit_write_flag(monkeypatch):
    from fastapi.testclient import TestClient
    from app.main import app
    settings=get_settings()
    monkeypatch.setattr(settings,'district_schema','district_allen_park')
    monkeypatch.setattr(settings,'data_writes_enabled',False)
    client=TestClient(app)
    for path in ['/api/v1/admin/workspace','/api/v1/superadmin/workspace','/api/v1/superadmin/users','/api/v1/superadmin/sso-settings','/api/v1/superadmin/ai-settings']:
        response=client.post(path,json={})
        assert response.status_code==503
        assert response.json()['detail']=='Editing is not enabled for this district yet.'
    assert client.get('/health').json()['superAdminWritesEnabled'] is False
    assert client.get('/api/v1/superadmin/workspace').status_code==401
    monkeypatch.setattr(settings,'data_writes_enabled',True)
    assert client.post('/api/v1/superadmin/workspace',json={}).status_code==422
