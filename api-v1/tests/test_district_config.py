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
