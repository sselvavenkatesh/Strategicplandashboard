"""Opt-in, read-only HTTP checks of the existing FastAPI deployment."""
import os
import pytest
import json
import urllib.request

pytestmark=pytest.mark.skipif(not os.getenv('PUBLIC_API_URL'),reason='PUBLIC_API_URL not configured')
BASE=os.getenv('PUBLIC_API_URL','').rstrip('/')

def get(path):
    with urllib.request.urlopen(BASE+path,timeout=45) as response:
        assert 'application/json' in response.headers.get('content-type','')
        return json.loads(response.read())

def test_existing_bootstrap_contract():
    value=get('/api/v1/bootstrap')
    assert value['profile']['districtId']=='riverside'
    assert len(value['goals'])==4

@pytest.mark.parametrize('goal,count',[('G1',3),('G2',2),('G3',1),('G4',1)])
def test_existing_indicator_contract(goal,count):
    rows=get(f'/api/v1/goals/{goal}/indicators')
    assert len(rows)==count
    assert all('numeric' in row and 'year' in row and row['id'] for row in rows)

@pytest.mark.parametrize('goal',['G1','G2','G3','G4'])
def test_existing_progress_contract(goal):
    rows=get(f'/api/v1/goals/{goal}/initiatives-full')
    assert rows
    assert all(0<=row['completion']<=100 and 'subInitiatives' in row for row in rows)

def test_existing_history_and_group_contract():
    rows=get('/api/v1/indicators/ID1/history')
    assert any(row['school_year']=='2022-23' and float(row['value_3_numeric'])==43 for row in rows)
    groups=get('/api/v1/indicators/ID1/student-groups?school_year=2025-26')
    assert any(row['student_group']=='All Students' for row in groups)
