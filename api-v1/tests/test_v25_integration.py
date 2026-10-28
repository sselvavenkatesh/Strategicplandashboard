from fastapi.testclient import TestClient
from app import main

client=TestClient(main.app)

def test_process_health_does_not_open_a_database(monkeypatch):
    monkeypatch.setattr(main.repo,'profile',lambda: (_ for _ in ()).throw(AssertionError('Unexpected database call')))
    result=client.get('/health')
    assert result.status_code==200
    assert result.json()['dataWritesEnabled'] is False

def test_achievement_reuses_the_database_contract(monkeypatch):
    expected={'preview':True,'overall':{'total':7,'eligible':7,'achieved':4,'excluded':0,'percent':57.1},'goals':[]}
    received=[]
    monkeypatch.setattr(main.repo,'achievement_summary',lambda preview: received.append(preview) or expected)
    result=client.get('/api/v1/achievement?preview=true')
    assert result.status_code==200 and result.json()==expected and received==[True]

def test_target_uses_exact_selected_year_and_neutral_missing_value(monkeypatch):
    received=[]
    monkeypatch.setattr(main.repo,'indicator_target',lambda indicator,year,preview: received.append((indicator,year,preview)))
    result=client.get('/api/v1/indicators/ID1/target?school_year=2022-23&preview=true')
    assert result.json()=={'target':None}
    assert received==[('ID1','2022-23',True)]

def test_preview_write_guard_prevents_old_superadmin_mutations(monkeypatch):
    monkeypatch.setattr(main.repo,'update_superadmin_logo',lambda *args: (_ for _ in ()).throw(AssertionError('Production write attempted')))
    result=client.put('/api/v1/superadmin/logo',json={'token':'not-a-real-token','logo':'data:image/png;base64,abc'})
    assert result.status_code==503
    assert client.delete('/api/v1/superadmin/goals/G1?token=test').status_code==503

def test_email_alone_does_not_validate_a_new_sso_identity(monkeypatch):
    monkeypatch.setattr(main.repo,'validate_sso_admin',lambda *args: (_ for _ in ()).throw(AssertionError('Email lookup should not authenticate')))
    assert client.post('/api/v1/auth/admin/sso/validate',json={'email':'someone@example.com'}).status_code==410

def test_expensive_public_parity_diagnostics_are_disabled():
    assert client.get('/api/v1/validation').status_code==404

def test_public_preview_dataset_response_does_not_add_stakeholder_accounts(monkeypatch):
    expected={'profile':{},'goals':[],'indicators':[],'initiatives':[],'indicatorData':[],'initiativeData':[]}
    monkeypatch.setattr(main.repo,'preview_dataset',lambda: expected)
    assert client.get('/api/v1/preview/dataset').json()==expected
