"""Live parity tests. Run only against a read-only PostgreSQL role.

These assertions intentionally encode known Supabase production outputs. If source
data changes, update the baseline only after comparing the old Supabase RPC and
the new REST endpoint for the same database snapshot.
"""
import os
import pytest
from fastapi.testclient import TestClient

pytestmark=pytest.mark.skipif(not os.getenv("DATABASE_URL"),reason="DATABASE_URL not configured")
from app.main import app
client=TestClient(app)

def test_mstep_ela_2022_23_parity():
    rows=client.get("/api/v1/indicators/ID1/history").json()
    row=next(x for x in rows if x["school_year"]=="2022-23")
    assert float(row["value_3_numeric"]) == 43.00
    assert row["value_3_display"] == "43.00%"

def test_mstep_math_2022_23_parity():
    rows=client.get("/api/v1/indicators/ID2/history").json()
    row=next(x for x in rows if x["school_year"]=="2022-23")
    assert float(row["value_3_numeric"]) == 33.00
    assert row["value_3_display"] == "33.00%"

@pytest.mark.parametrize(("goal","indicator","year","display"),[
 ("G1","ID1","2025-26","39.53%"),
 ("G1","ID2","2025-26","34.42%"),
 ("G1","ID3","2025-26","673"),
 ("G2","ID4","2025-26","97.45%"),
 ("G2","ID5","2024-25","84.4%"),
 ("G3","ID7","2025-26","23.32%"),
 ("G4","ID6","2024-25","$19,248,186"),
])
def test_latest_kpi_parity(goal,indicator,year,display):
    rows=client.get(f"/api/v1/goals/{goal}/indicators").json()
    row=next(x for x in rows if x["id"]==indicator)
    assert row["year"]==year
    assert row["value"]==display
