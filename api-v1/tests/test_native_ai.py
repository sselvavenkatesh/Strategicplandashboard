import json
import re
from pathlib import Path
from uuid import uuid4
import pytest
from fastapi.testclient import TestClient
from app import main, ai

@pytest.fixture
def configured(monkeypatch):
    monkeypatch.setattr(ai.repo,'ai_credentials',lambda:{'model':'gpt-oss:20b-cloud','api_key':'test-key-only'})
    monkeypatch.setattr(ai.repo,'feature_enabled',lambda *args:True)
    monkeypatch.setattr(ai.repo,'log_ai_conversation',lambda *args:None)
    return TestClient(main.app,base_url='https://testserver')

def test_original_prompt_is_preserved_verbatim():
    edge=(Path(__file__).resolve().parents[2]/'supabase/functions/district-ai-preview/index.ts').read_text()
    assert ai.SYSTEM_PROMPT==re.search(r'const system=`([\s\S]*?)`;',edge).group(1)

@pytest.mark.parametrize('cookie,user_id',[(None,None),('strategic_admin_session','6'),('strategic_superadmin_session','11')])
def test_context_scope_is_derived_from_verified_session_only(configured,monkeypatch,cookie,user_id):
    captured=[]
    monkeypatch.setattr(ai.repo,'fetch_one',lambda *args:{'data':{'id':'6'}})
    monkeypatch.setattr(ai.repo,'validate_superadmin_session',lambda *args:{'user_id':11})
    def context(include_private=False):
        captured.append(include_private)
        return {'indicators':[{'Indicator ID':'ID4','Indicator Name':'Graduation','Indicator_short_name':'Graduation'}],'privateSentinel':include_private}
    monkeypatch.setattr(ai.repo,'ai_context',context)
    monkeypatch.setattr(ai,'model_request',lambda context,*args:{'message':{'content':'Graduation is 99.5%.'}})
    if cookie:configured.cookies.set(cookie,str(uuid4()))
    result=configured.post('/api/v1/ai/ask',json={'question':'How are district indicators performing?'})
    assert result.status_code==200 and captured==[user_id is not None]
    assert result.headers['cache-control']=='no-store'
    assert 'test-key-only' not in result.text and 'privateSentinel' not in result.text

@pytest.mark.parametrize('token',['invalid',str(uuid4())])
def test_invalid_or_expired_sessions_cannot_use_private_data(configured,monkeypatch,token):
    monkeypatch.setattr(ai.repo,'fetch_one',lambda *args:{'data':None})
    monkeypatch.setattr(ai.repo,'ai_context',lambda *args,**kwargs:pytest.fail('Context read'))
    configured.cookies.set('strategic_admin_session',token)
    assert configured.post('/api/v1/ai/ask',json={'question':'Show district goals'}).status_code==401

def test_caller_cannot_forge_a_role_or_district_in_the_body(configured):
    for fields in [{'include_private':True},{'role':'SuperAdmin'},{'districtId':'other-district'},{'user_id':'11'}]:
        assert configured.post('/api/v1/ai/ask',json={'question':'Show district goals',**fields}).status_code==422

def test_cross_origin_private_ai_is_denied_before_authentication(configured,monkeypatch):
    monkeypatch.setattr(ai.repo,'fetch_one',lambda *args:pytest.fail('Authentication read'))
    assert configured.post('/api/v1/ai/ask',json={'question':'Show district goals'},headers={'Origin':'https://other.example'}).status_code==403

def test_status_returns_readiness_without_key_or_model(configured):
    result=configured.get('/api/v1/ai/status')
    assert result.json()=={'nativeReady':True} and result.headers['cache-control']=='no-store'

def test_unconfigured_key_does_not_call_model(configured,monkeypatch):
    monkeypatch.setattr(ai.repo,'ai_credentials',lambda:{})
    monkeypatch.setattr(ai,'model_request',lambda *args:pytest.fail('Model called'))
    assert configured.post('/api/v1/ai/ask',json={'question':'Show district goals'}).status_code==503

def test_out_of_scope_reuses_existing_response_without_model_cost(configured,monkeypatch):
    monkeypatch.setattr(ai,'model_request',lambda *args:pytest.fail('Model called'))
    result=configured.post('/api/v1/ai/ask',json={'question':'Tell me a joke'})
    assert result.status_code==200 and result.json()['answer']==ai.OUT_OF_SCOPE and result.json()['outOfScope'] is True

def test_provider_payload_reuses_model_settings_and_sends_key_only_as_header(monkeypatch):
    captured=[]
    class Result:
        def __enter__(self):return self
        def __exit__(self,*args):pass
        def read(self,*args):return b'{"message":{"content":"District answer"}}'
    def open_url(request,timeout):captured.append((request,timeout));return Result()
    monkeypatch.setattr(ai.urllib.request,'urlopen',open_url)
    ai.model_request({'indicators':[]},'Show district goals',{'api_key':'unit-test-secret','model':'gpt-oss:20b-cloud'})
    request,timeout=captured[0];body=json.loads(request.data)
    assert request.full_url=='https://ollama.com/api/chat' and timeout==90
    assert body['model']=='gpt-oss:20b-cloud' and body['think']=='low' and body['stream'] is False
    assert body['options']=={'temperature':0.1} and body['messages'][0]['content']==ai.SYSTEM_PROMPT+'\n\n'+ai.RESPONSE_GUIDANCE
    assert '\nUSER QUESTION:\n' in body['messages'][1]['content']
    assert 'unit-test-secret' not in request.data.decode() and request.get_header('Authorization')=='Bearer unit-test-secret'

def test_plain_text_and_private_indicator_labels_remain_readable():
    assert ai.clean_answer('**Findings**\n---\n- District progress\n\n\nMore')=='Findings\nDistrict progress\n\nMore'
    context={'indicators':[{'Indicator ID':'ID9','Indicator Name':'Private indicator','Indicator_short_name':'School Culture'}]}
    assert ai.indicator_references('ID9: 99.5%',context)=='School Culture - 99.5%'
    assert ai.indicator_references('School Culture (ID9) is 99.5%',context)=='School Culture is 99.5%'

def test_ai_settings_require_superadmin_and_redact_invalid_secret(configured):
    assert configured.get('/api/v1/superadmin/ai-settings').status_code==401
    assert configured.post('/api/v1/superadmin/ai-settings',json={'model':'test','apiKey':'key'}).status_code==401
    secret='CONFIDENTIAL-'+('x'*4100)
    result=configured.post('/api/v1/superadmin/ai-settings',json={'model':'test','apiKey':secret})
    assert result.status_code==422 and 'CONFIDENTIAL' not in result.text

def test_ai_settings_save_is_origin_checked_and_never_echoes_key(configured,monkeypatch):
    calls=[]
    monkeypatch.setattr(ai.repo,'fetch_one',lambda sql,params:calls.append((sql,params)) or {'data':{'model':'gpt-oss:20b-cloud','keySaved':True}})
    configured.cookies.set('strategic_superadmin_session',str(uuid4()))
    body={'model':'gpt-oss:20b-cloud','apiKey':'unit-test-secret'}
    assert configured.post('/api/v1/superadmin/ai-settings',json=body,headers={'Origin':'https://other.example'}).status_code==403
    assert not calls
    result=configured.post('/api/v1/superadmin/ai-settings',json=body)
    assert result.status_code==200 and result.json()=={'model':'gpt-oss:20b-cloud','keySaved':True}
    assert 'unit-test-secret' not in result.text and result.headers['cache-control']=='no-store'

def test_provider_failure_does_not_disclose_key_or_private_context(configured,monkeypatch):
    monkeypatch.setattr(ai.repo,'ai_context',lambda **kwargs:{'indicators':[]})
    def fail(*args):raise RuntimeError('unit-test-secret and private data')
    monkeypatch.setattr(ai,'model_request',fail)
    result=configured.post('/api/v1/ai/ask',json={'question':'Show district goals'})
    assert result.status_code==502 and 'unit-test-secret' not in result.text and 'private data' not in result.text
