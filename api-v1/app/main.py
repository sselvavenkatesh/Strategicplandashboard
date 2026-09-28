from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse
from .config import get_settings
from . import repository as repo

settings = get_settings()
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Provider-neutral REST facade over the StrategicPlan PostgreSQL reporting contract.",
    license_info={"name": "MIT", "identifier": "MIT"},
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.allowed_origins,
    allow_credentials=False,
    allow_methods=["GET"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "apiVersion": settings.api_version}

@app.get("/api/v1/profile")
def get_profile():
    row = repo.profile()
    if not row:
        raise HTTPException(404, "District profile not found")
    return {
        "districtId": row["District ID"], "districtName": row["School District Name"],
        "planName": row.get("Strategic Plan Name") or "", "duration": row.get("Strategic Plan Duration") or "",
        "subText": row.get("Sub Text") or "", "totalGoals": int(row.get("Total Goals") or 0),
        "mission": row.get("Mission Statement") or "", "vision": row.get("Vision Statement") or "",
        "logo": row.get("District Logo"), "planImage": row.get("Strategic Plan Image"),
    }

@app.get("/api/v1/goals")
def get_goals():
    return [{"id":r["Goal ID"],"name":r.get("Goal Name") or r["Goal ID"],
             "description":r.get("Goal Description") or "","totalIndicators":int(r.get("Total Indicators") or 0),
             "totalInitiatives":int(r.get("Total Initiatives") or 0)} for r in repo.goals()]

@app.get("/api/v1/goals/{goal_id}/indicators")
def get_indicators(goal_id: str, school: str | None = None):
    masters=repo.indicator_master(goal_id)
    values={r["indicator_id"]:r for r in repo.indicator_key_values(goal_id,school)}
    result=[]
    for m in masters:
        r=values.get(m["Indicator ID"],{})
        result.append({
            "id":m["Indicator ID"],"name":m.get("Indicator Name") or m["Indicator ID"],
            "shortName":m.get("Indicator_short_name") or m.get("Indicator Name") or m["Indicator ID"],
            "description":m.get("Indicator Name") or "",
            "value":r.get("value_3_display") or "—",
            "numeric":float(r["value_3_numeric"]) if r.get("value_3_numeric") is not None else None,
            "previous":float(r["previous_year_value_3_numeric"]) if r.get("previous_year_value_3_numeric") is not None else None,
            "variance":float(r["ly_variance_numeric"]) if r.get("ly_variance_numeric") is not None else None,
            "year":r.get("school_year") or "—",
            "nature":"Negative" if m.get("KPI Nature")=="Negative" else "Positive",
            "isPercent":str(m.get("Indicator Type") or "").lower()=="percent" or "%" in str(r.get("value_3_display") or ""),
            "type":str(m.get("Indicator Type") or ""),
        })
    return result

@app.get("/api/v1/indicators/{indicator_id}/history")
def get_indicator_history(indicator_id: str, school: str | None = None):
    return repo.indicator_history(indicator_id,school)

@app.get("/api/v1/indicators/{indicator_id}/student-groups")
def get_student_groups(indicator_id: str, school_year: str, school: str | None = None):
    return repo.indicator_student_groups(indicator_id,school_year,school)

@app.get("/api/v1/goals/{goal_id}/initiative-progress")
def get_goal_progress(goal_id: str, school: str | None = None):
    return repo.goal_initiative_progress(goal_id,school)

@app.get("/api/v1/goals/{goal_id}/initiatives")
def get_initiatives(goal_id: str, school: str | None = None):
    masters={r["Initiative ID"]:r for r in repo.initiative_master(goal_id)}
    rows=repo.initiative_progress(goal_id,school)
    return [{**r,
             "short_name":masters.get(r["initiative_id"],{}).get("Initiative_Short_name")
                or masters.get(r["initiative_id"],{}).get("Initiative Name")
                or r["initiative_id"]} for r in rows if r["initiative_id"] in masters]

@app.get("/api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives")
def get_subinitiatives(goal_id: str, initiative_id: str, school: str | None = None):
    return repo.subinitiative_progress(goal_id,initiative_id,school)

@app.get("/api/v1/features/{version}/{feature}")
def get_feature(version: str, feature: str):
    return {"version":version,"feature":feature,"enabled":repo.feature_enabled(version,feature)}

def _validation_checks():
    checks = []
    def add(name, endpoint, expected, actual):
        checks.append({"name": name, "endpoint": endpoint, "expected": expected, "actual": actual, "status": "PASS" if actual == expected else "FAIL"})
    try:
        p=get_profile(); add("Profile district", "/api/v1/profile", "Riverside School District", p["districtName"])
        add("Profile total goals", "/api/v1/profile", 4, p["totalGoals"])
    except Exception as e: checks.append({"name":"Profile","endpoint":"/api/v1/profile","expected":"Riverside profile","actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    try:
        g=get_goals(); add("Goals count", "/api/v1/goals", 4, len(g))
    except Exception as e: checks.append({"name":"Goals","endpoint":"/api/v1/goals","expected":4,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    expected_kpis={"ID1":("G1","2025-26","39.53%"),"ID2":("G1","2025-26","34.42%"),"ID3":("G1","2025-26","673"),"ID4":("G2","2025-26","97.45%"),"ID5":("G2","2024-25","84.4%"),"ID7":("G3","2025-26","23.32%"),"ID6":("G4","2024-25","$19,248,186")}
    for iid,(gid,year,value) in expected_kpis.items():
        ep=f"/api/v1/goals/{gid}/indicators"
        try:
            rows=get_indicators(gid); row=next((x for x in rows if x["id"]==iid),None)
            add(f"KPI {iid} year",ep,year,row["year"] if row else None); add(f"KPI {iid} value",ep,value,row["value"] if row else None)
        except Exception as e: checks.append({"name":f"KPI {iid}","endpoint":ep,"expected":value,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    histories={"ID1":("2022-23","43.00%"),"ID2":("2022-23","33.00%"),"ID3":("2025-26","673"),"ID4":("2025-26","97.45%"),"ID5":("2024-25","84.4%"),"ID6":("2024-25","$19,248,186"),"ID7":("2025-26","23.32%")}
    for iid,(year,value) in histories.items():
        ep=f"/api/v1/indicators/{iid}/history"
        try:
            rows=get_indicator_history(iid); row=next((r for r in rows if r.get("school_year")==year),None)
            add(f"History {iid} {year}",ep,value,row.get("value_3_display") if row else None)
        except Exception as e: checks.append({"name":f"History {iid}","endpoint":ep,"expected":value,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    for iid,expected_asian,statewide in [("ID1","53.63%","39.83%"),("ID2","50.70%","35.93%")]:
        ep=f"/api/v1/indicators/{iid}/student-groups?school_year=2025-26"
        try:
            rows=get_student_groups(iid,"2025-26"); asian=next((r for r in rows if r.get("student_group")=="Asian"),None)
            add(f"Student groups {iid} Asian",ep,expected_asian,asian.get("value_3_display") if asian else None)
            add(f"Student groups {iid} statewide",ep,statewide,asian.get("statewide_value_3_display") if asian else None)
        except Exception as e: checks.append({"name":f"Student groups {iid}","endpoint":ep,"expected":expected_asian,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    goal_progress={"G1":(48,26),"G2":(36,23),"G3":(12,7),"G4":(36,27)}
    for gid,(total,done) in goal_progress.items():
        ep=f"/api/v1/goals/{gid}/initiative-progress"
        try:
            rows=get_goal_progress(gid); row=rows[0] if rows else {}
            add(f"{gid} action items",ep,total,row.get("total_action_items")); add(f"{gid} done",ep,done,row.get("done_count"))
        except Exception as e: checks.append({"name":f"{gid} progress","endpoint":ep,"expected":total,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    initiatives={"G1":{"IN1":75.0,"IN2":58.3,"IN3":50.0,"IN5":33.3},"G2":{"IN4":66.7,"IN6":41.7,"IN7":83.3},"G3":{"IN8":58.3},"G4":{"IN10":100.0,"IN11":50.0,"IN9":75.0}}
    for gid,expected in initiatives.items():
        ep=f"/api/v1/goals/{gid}/initiatives"
        try:
            rows=get_initiatives(gid); byid={r["initiative_id"]:r for r in rows}
            for iid,pct in expected.items(): add(f"{gid} {iid} completion",ep,pct,float(byid.get(iid,{}).get("completion_percent")) if byid.get(iid,{}).get("completion_percent") is not None else None)
        except Exception as e: checks.append({"name":f"{gid} initiatives","endpoint":ep,"expected":"initiative progress","actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    try:
        ep="/api/v1/goals/G1/initiatives/IN1/subinitiatives"; rows=get_subinitiatives("G1","IN1")
        row=next((r for r in rows if r.get("sub_initiative_name")=="Culturally Responsive Teaching"),None)
        add("Subinitiative sample total",ep,4,row.get("total_action_items") if row else None); add("Subinitiative sample done",ep,4,row.get("done_count") if row else None)
    except Exception as e: checks.append({"name":"Subinitiatives","endpoint":ep,"expected":"4 done of 4","actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    try:
        ep="/api/v1/features/V2.3/AI%20Assistant"; actual=get_feature("V2.3","AI Assistant")
        add("AI feature flag",ep,True,actual["enabled"])
    except Exception as e: checks.append({"name":"AI feature flag","endpoint":ep,"expected":True,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    return checks

@app.get("/api/v1/validation")
def validation_json():
    checks=_validation_checks()
    return {"apiVersion":settings.api_version,"summary":{"total":len(checks),"passed":sum(c["status"]=="PASS" for c in checks),"failed":sum(c["status"]=="FAIL" for c in checks)},"checks":checks}

@app.get("/validation", response_class=HTMLResponse)
def validation_page():
    report=validation_json(); rows="".join(f"<tr><td>{c['status']}</td><td>{c['name']}</td><td><code>{c['endpoint']}</code></td><td>{c['expected']}</td><td>{c['actual']}</td></tr>" for c in report["checks"])
    s=report["summary"]
    return f"""<!doctype html><html><head><meta charset='utf-8'><title>StrategicPlan API V1 Validation</title><style>body{{font-family:Arial,sans-serif;margin:32px;color:#222}}table{{border-collapse:collapse;width:100%}}th,td{{border:1px solid #ddd;padding:8px;text-align:left}}th{{background:#f3f3f3}}code{{font-size:12px}}.summary{{font-size:20px;margin:18px 0}}</style></head><body><h1>StrategicPlan API V1 Validation</h1><div class='summary'>Total: {s['total']} &nbsp; Passed: {s['passed']} &nbsp; Failed: {s['failed']}</div><p>Read-only parity checks against the approved Supabase baseline.</p><table><thead><tr><th>Status</th><th>Check</th><th>API endpoint</th><th>Expected</th><th>Actual</th></tr></thead><tbody>{rows}</tbody></table></body></html>"""
