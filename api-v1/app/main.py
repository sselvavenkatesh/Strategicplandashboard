from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from .config import get_settings
from . import repository as repo

settings = get_settings()
app = FastAPI(
    title=settings.api_title,
    version=settings.api_version,
    description="Provider-neutral REST facade over the District 360 PostgreSQL reporting contract.",
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
def get_indicators(goal_id: str, school: str | None = Query(default=None)):
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
def get_indicator_history(indicator_id: str, school: str | None = Query(default=None)):
    return repo.indicator_history(indicator_id,school)

@app.get("/api/v1/indicators/{indicator_id}/student-groups")
def get_student_groups(indicator_id: str, school_year: str, school: str | None = Query(default=None)):
    return repo.indicator_student_groups(indicator_id,school_year,school)

@app.get("/api/v1/goals/{goal_id}/initiative-progress")
def get_goal_progress(goal_id: str, school: str | None = Query(default=None)):
    return repo.goal_initiative_progress(goal_id,school)

@app.get("/api/v1/goals/{goal_id}/initiatives")
def get_initiatives(goal_id: str, school: str | None = Query(default=None)):
    masters={r["Initiative ID"]:r for r in repo.initiative_master(goal_id)}
    rows=repo.initiative_progress(goal_id,school)
    return [{**r,
             "short_name":masters.get(r["initiative_id"],{}).get("Initiative_Short_name")
                or masters.get(r["initiative_id"],{}).get("Initiative Name")
                or r["initiative_id"]} for r in rows if r["initiative_id"] in masters]

@app.get("/api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives")
def get_subinitiatives(goal_id: str, initiative_id: str, school: str | None = Query(default=None)):
    return repo.subinitiative_progress(goal_id,initiative_id,school)

@app.get("/api/v1/features/{version}/{feature}")
def get_feature(version: str, feature: str):
    return {"version":version,"feature":feature,"enabled":repo.feature_enabled(version,feature)}
