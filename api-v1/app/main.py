from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import HTMLResponse, RedirectResponse
from pydantic import BaseModel
import json, os, urllib.request, urllib.parse, re, unicodedata
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
    allow_origin_regex=r"https://k12matrix-strategicplan(?:-[a-zA-Z0-9-]+)?\.vercel\.app",
    allow_credentials=False,
    allow_methods=["GET", "POST", "PUT", "DELETE"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"status": "ok", "apiVersion": settings.api_version}

@app.get("/api/v1/bootstrap")
def get_bootstrap():
    p, goals = repo.dashboard_bootstrap()
    if not p: raise HTTPException(404, "District profile not found")
    profile={
      "districtId":p["District ID"],"districtName":p["School District Name"],
      "planName":p.get("Strategic Plan Name") or "","duration":p.get("Strategic Plan Duration") or "",
      "subText":p.get("Sub Text") or "","totalGoals":int(p.get("Total Goals") or 0),
      "mission":p.get("Mission Statement") or "","vision":p.get("Vision Statement") or "",
      "logo":p.get("District Logo"),"planImage":p.get("Strategic Plan Image")
    }
    return {"profile":profile,"goals":[{"id":r["Goal ID"],"name":r.get("Goal Name") or r["Goal ID"],"description":r.get("Goal Description") or "","totalIndicators":int(r.get("Total Indicators") or 0),"totalInitiatives":int(r.get("Total Initiatives") or 0)} for r in goals]}

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
            "isPercent":str(m.get("Indicator Type") or "").lower()=="percent" and "$" not in str(r.get("value_3_display") or ""),
            "isCurrency":str(m.get("Indicator Type") or "").lower()=="currency" or "$" in str(r.get("value_3_display") or ""),
            "type":"Currency" if "$" in str(r.get("value_3_display") or "") else str(m.get("Indicator Type") or ""),
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

def _date_key(v):
    if not v: return (9999,99)
    months={"Jan":1,"Feb":2,"Mar":3,"Apr":4,"May":5,"Jun":6,"Jul":7,"Aug":8,"Sep":9,"Oct":10,"Nov":11,"Dec":12}
    s=str(v).strip()
    try: return (int(s[4:]),months.get(s[:3],99))
    except: return (9999,99)

@app.get("/api/v1/goals/{goal_id}/initiatives-full")
def get_initiatives_full(goal_id: str):
    masters={r["Initiative ID"]:r for r in repo.initiative_master(goal_id)}
    rows=repo.initiative_data(goal_id)
    result=[]
    for iid,m in masters.items():
        rr=[r for r in rows if r["Initiative ID"]==iid]
        done=sum(r.get("Status")=="Done" for r in rr); progress=sum(r.get("Status")=="In Progress" for r in rr); not_started=sum(r.get("Status")=="Not Yet Started" for r in rr)
        starts=sorted([r.get("Start Date") for r in rr if r.get("Start Date")],key=_date_key); ends=sorted([r.get("End Date") for r in rr if r.get("End Date")],key=_date_key)
        names=list(dict.fromkeys(r.get("Sub Initiative Name") for r in rr if r.get("Sub Initiative Name")))
        subs=[]
        for name in names:
            sr=[r for r in rr if r.get("Sub Initiative Name")==name]; sd=sum(r.get("Status")=="Done" for r in sr); sp=sum(r.get("Status")=="In Progress" for r in sr); sn=sum(r.get("Status")=="Not Yet Started" for r in sr); total=sd+sp+sn or 1
            ss=sorted([r.get("Start Date") for r in sr if r.get("Start Date")],key=_date_key); se=sorted([r.get("End Date") for r in sr if r.get("End Date")],key=_date_key)
            subs.append({"name":name,"done":100*sd/total,"inProgress":100*sp/total,"notStarted":100*sn/total,"start":ss[0] if ss else None,"end":se[-1] if se else None,"totalActionItems":len(sr),"completion":100*sd/total})
        total=len(rr)
        result.append({"id":iid,"name":m.get("Initiative Name") or iid,"shortName":m.get("Initiative_Short_name") or m.get("Initiative Name") or iid,"description":m.get("Initiative Name") or "","done":done,"inProgress":progress,"notStarted":not_started,"completion":100*done/total if total else 0,"start":starts[0] if starts else None,"end":ends[-1] if ends else None,"totalActionItems":total,"subInitiatives":subs})
    return result

class AdminLogin(BaseModel):
    email: str
    password: str

class SsoAdminValidation(BaseModel):
    email: str

class OAuthSecrets(BaseModel):
    token: str
    googleClientSecret: str | None = None
    microsoftClientSecret: str | None = None

class AccessLog(BaseModel):
    sessionId: str
    userId: str | None = None
    userName: str | None = None
    userEmail: str | None = None
    userType: str = "Public"
    region: str | None = None
    country: str | None = None
    pagePath: str | None = None
    userAgent: str | None = None

class SuperAdminConfiguration(BaseModel):
    token: str
    profile: dict
    goals: list[dict]

class SuperAdminLogo(BaseModel):
    token: str
    logo: str

class SuperAdminBulkData(BaseModel):
    token: str
    rows: list[dict]

@app.get("/api/v1/admin/signin-config")
def get_admin_signin_config():
    row=repo.admin_auth_config() or {}
    return {
      "districtId":row.get("district_id"),
      "signinMethod":row.get("signin_method") or "Userbased",
      "google":{"clientId":row.get("google_client_id"),"authId":row.get("google_auth_id"),"configured":bool(row.get("google_configured"))},
      "microsoft":{"clientId":row.get("microsoft_client_id"),"tenantId":row.get("microsoft_tenant_id"),"authId":row.get("microsoft_auth_id"),"configured":bool(row.get("microsoft_configured"))}
    }

@app.put("/api/v1/superadmin/oauth-secrets")
def put_oauth_secrets(body: OAuthSecrets):
    if not repo.validate_superadmin_session(body.token): raise HTTPException(401,"Invalid or expired Super Admin session")
    repo.save_oauth_secrets(body.token,body.googleClientSecret,body.microsoftClientSecret)
    return {"saved":True,"googleSecretConfigured":bool(body.googleClientSecret),"microsoftSecretConfigured":bool(body.microsoftClientSecret)}

@app.post("/api/v1/auth/admin/login")
def admin_login(body: AdminLogin):
    try:
        row=repo.validate_admin_login(body.email.strip(),body.password)
    except Exception as e:
        raise HTTPException(500, f"Admin authentication unavailable: {type(e).__name__}")
    if not row: raise HTTPException(401,"Invalid credentials")
    token=repo.create_admin_session(row.get("user_id"))
    return {"token":token,"name":row.get("user_name") or row.get("user_email"),"email":row.get("user_email")}

def _safe_return_to(value: str | None):
    fallback=os.getenv("FRONTEND_URL","https://k12matrix-strategicplan.vercel.app")
    if not value: return fallback
    allowed=[x.rstrip("/") for x in settings.allowed_origins]
    return value if any(value==x or value.startswith(x+"/") for x in allowed) else fallback

def _oauth_callback(provider: str):
    base=os.getenv("API_PUBLIC_URL","https://strategicplan-apiv1.vercel.app").rstrip("/")
    return f"{base}/api/v1/auth/admin/oauth/{provider}/callback"

def _form_post(url: str, values: dict):
    data=urllib.parse.urlencode(values).encode()
    req=urllib.request.Request(url,data=data,headers={"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},method="POST")
    with urllib.request.urlopen(req,timeout=20) as resp: return json.loads(resp.read().decode())

def _json_get(url: str, token: str):
    req=urllib.request.Request(url,headers={"Authorization":"Bearer "+token,"Accept":"application/json"})
    with urllib.request.urlopen(req,timeout=20) as resp: return json.loads(resp.read().decode())

@app.get("/api/v1/auth/admin/oauth/{provider}/start")
def admin_oauth_start(provider: str, return_to: str | None = None):
    provider=provider.lower()
    if provider not in ("google","microsoft"): raise HTTPException(404,"Unsupported SSO provider")
    cfg=repo.admin_auth_config() or {}
    expected="Google" if provider=="google" else "Microsoft"
    if cfg.get("signin_method")!=expected: raise HTTPException(409,f"{expected} is not the configured district sign-in method")
    secret=repo.oauth_secret(provider)
    if provider=="google":
        client_id=cfg.get("google_client_id")
        if not client_id or not secret: raise HTTPException(503,"Google SSO is not fully configured")
        authorize="https://accounts.google.com/o/oauth2/v2/auth"
        params={"client_id":client_id,"redirect_uri":_oauth_callback(provider),"response_type":"code","scope":"openid email profile","access_type":"online","prompt":"select_account"}
    else:
        client_id=cfg.get("microsoft_client_id"); tenant=cfg.get("microsoft_tenant_id")
        if not client_id or not tenant or not secret: raise HTTPException(503,"Microsoft SSO is not fully configured")
        authorize=f"https://login.microsoftonline.com/{urllib.parse.quote(tenant,safe='')}/oauth2/v2.0/authorize"
        params={"client_id":client_id,"redirect_uri":_oauth_callback(provider),"response_type":"code","scope":"openid profile email User.Read","response_mode":"query"}
    state=repo.create_admin_oauth_state(provider,_safe_return_to(return_to))
    params["state"]=state
    return RedirectResponse(authorize+"?"+urllib.parse.urlencode(params),status_code=302)

@app.get("/api/v1/auth/admin/oauth/{provider}/callback")
def admin_oauth_callback(provider: str, code: str | None = None, state: str | None = None, error: str | None = None):
    provider=provider.lower()
    if provider not in ("google","microsoft") or not state: raise HTTPException(400,"Invalid OAuth callback")
    try: return_to=repo.consume_admin_oauth_state(state,provider)
    except Exception: return_to=None
    if not return_to: raise HTTPException(400,"OAuth state is invalid or expired")
    if error or not code:
        return RedirectResponse(return_to+"?"+urllib.parse.urlencode({"authError":error or "oauth_failed"}),status_code=302)
    cfg=repo.admin_auth_config() or {}; secret=repo.oauth_secret(provider)
    try:
        if provider=="google":
            tokens=_form_post("https://oauth2.googleapis.com/token",{"code":code,"client_id":cfg.get("google_client_id"),"client_secret":secret,"redirect_uri":_oauth_callback(provider),"grant_type":"authorization_code"})
            user=_json_get("https://openidconnect.googleapis.com/v1/userinfo",tokens["access_token"])
            email=user.get("email")
            if not user.get("email_verified"): raise ValueError("Google email is not verified")
        else:
            tenant=cfg.get("microsoft_tenant_id")
            tokens=_form_post(f"https://login.microsoftonline.com/{urllib.parse.quote(str(tenant),safe='')}/oauth2/v2.0/token",{"code":code,"client_id":cfg.get("microsoft_client_id"),"client_secret":secret,"redirect_uri":_oauth_callback(provider),"grant_type":"authorization_code","scope":"openid profile email User.Read"})
            user=_json_get("https://graph.microsoft.com/v1.0/me?$select=displayName,mail,userPrincipalName",tokens["access_token"])
            email=user.get("mail") or user.get("userPrincipalName")
        if not email: raise ValueError("Provider did not return an email address")
        admin=repo.validate_sso_admin(email)
        if not admin:
            return RedirectResponse(return_to+"?"+urllib.parse.urlencode({"authError":"not_authorized"}),status_code=302)
        token=repo.create_admin_session(admin.get("user_id"))
        params={"adminSession":token,"email":admin.get("user_email") or email,"name":admin.get("user_name") or email}
        return RedirectResponse(return_to+"?"+urllib.parse.urlencode(params),status_code=302)
    except Exception:
        return RedirectResponse(return_to+"?"+urllib.parse.urlencode({"authError":"provider_validation_failed"}),status_code=302)

@app.get("/api/v1/auth/admin/session")
def admin_session(token: str = Query(...)):
    row=repo.validate_admin_session(token)
    if not row: raise HTTPException(401,"Invalid or expired Admin session")
    return {"name":row.get("user_name") or row.get("user_email"),"email":row.get("user_email")}

@app.post("/api/v1/auth/admin/logout", status_code=204)
def admin_logout(token: str = Query(...)):
    try: repo.revoke_admin_session(token)
    except Exception: pass
    return None

@app.post("/api/v1/auth/admin/sso/validate")
def admin_sso_validate(body: SsoAdminValidation):
    row=repo.validate_sso_admin(body.email.strip())
    if not row: raise HTTPException(403,"SSO account is not authorized for Admin access")
    return {"name":row.get("user_name") or row.get("user_email"),"email":row.get("user_email")}

@app.post("/api/v1/access-log", status_code=204)
def access_log(body: AccessLog):
    try:
        repo.log_dashboard_access(body.sessionId,body.userId,body.userName,body.userEmail,body.userType,body.region,body.country,body.pagePath,body.userAgent)
    except Exception:
        # Access telemetry must never make the dashboard unavailable.
        return None
    return None

@app.post("/api/v1/superadmin/login")
def superadmin_login(body: AdminLogin):
    row=repo.validate_superadmin_login(body.email.strip(),body.password)
    if not row: raise HTTPException(401,"Invalid credentials")
    token=row.get("session_token")
    if not token: raise HTTPException(500,"Super Admin session token was not returned")
    return {"token":token,"email":row.get("user_email") or body.email.strip(),"name":row.get("user_name") or row.get("user_email") or body.email.strip()}

@app.get("/api/v1/superadmin/configuration")
def superadmin_configuration(token: str = Query(...)):
    try: session=repo.validate_superadmin_session(token)
    except Exception: session=None
    if not session: raise HTTPException(401,"Invalid or expired Super Admin session")
    p=repo.superadmin_profile() or {}
    return {
      "profile":p,
      "goals":repo.superadmin_goals(),
      "indicators":repo.superadmin_indicator_data(),
      "initiatives":repo.superadmin_initiative_data(),
      "indicatorCount":repo.superadmin_indicator_count(),
      "initiativeCount":repo.superadmin_initiative_count(),
    }

@app.put("/api/v1/superadmin/configuration")
def put_superadmin_configuration(body: SuperAdminConfiguration):
    try: return {"result":repo.save_superadmin_configuration(body.token,body.profile,body.goals)}
    except Exception as e: raise HTTPException(400,str(e))

@app.delete("/api/v1/superadmin/goals/{goal_id}")
def delete_superadmin_goal(goal_id: str, token: str = Query(...)):
    try: return {"result":repo.delete_superadmin_goal(token,goal_id)}
    except Exception as e: raise HTTPException(400,str(e))

@app.put("/api/v1/superadmin/logo")
def put_superadmin_logo(body: SuperAdminLogo):
    if len(body.logo)>1_500_000: raise HTTPException(413,"Logo payload is too large")
    try: return {"result":repo.update_superadmin_logo(body.token,body.logo)}
    except Exception as e: raise HTTPException(400,str(e))

@app.post("/api/v1/superadmin/indicators/bulk")
def bulk_indicators(body: SuperAdminBulkData):
    try: return {"result":repo.superadmin_bulk_upsert_data(body.token,"indicator",body.rows)}
    except Exception as e: raise HTTPException(400,str(e))

@app.post("/api/v1/superadmin/initiatives/bulk")
def bulk_initiatives(body: SuperAdminBulkData):
    try: return {"result":repo.superadmin_bulk_upsert_data(body.token,"initiative",body.rows)}
    except Exception as e: raise HTTPException(400,str(e))

class AiQuestion(BaseModel):
    question: str
    sessionId: str = "api-v1"

@app.get("/api/v1/diagnostics/ai-config")
def ai_config_diagnostics():
    return {
        "supabaseUrlConfigured": bool(os.getenv("SUPABASE_URL")),
        "supabaseAnonKeyConfigured": bool(os.getenv("SUPABASE_ANON_KEY")),
        "viteSupabaseUrlConfigured": bool(os.getenv("VITE_SUPABASE_URL")),
        "viteSupabaseAnonKeyConfigured": bool(os.getenv("VITE_SUPABASE_ANON_KEY")),
    }

def _ask_ai(question, session_id):
    base=os.getenv("VITE_SUPABASE_URL") or os.getenv("SUPABASE_URL")
    key=os.getenv("VITE_SUPABASE_ANON_KEY") or os.getenv("SUPABASE_ANON_KEY")
    if not base or not key: raise RuntimeError("AI proxy environment not configured")
    req=urllib.request.Request(base.rstrip("/")+"/functions/v1/district-ai",data=json.dumps({"question":question,"sessionId":session_id}).encode(),headers={"Content-Type":"application/json","apikey":key,"Authorization":"Bearer "+key},method="POST")
    with urllib.request.urlopen(req,timeout=45) as resp: return json.loads(resp.read().decode())

@app.post("/api/v1/ai/ask")
def ask_ai(body: AiQuestion):
    try: return _ask_ai(body.question,body.sessionId)
    except Exception as e: raise HTTPException(502, f"AI service unavailable: {type(e).__name__}")

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
    for gid,iid,expected in [("G1","IN1",{"done":9,"inProgress":2,"notStarted":1,"completion":75.0,"start":"Sep-2023","end":"Jun-2027","subInitiatives":3}),("G4","IN10",{"done":12,"inProgress":0,"notStarted":0,"completion":100.0,"start":"Jan-2023","end":"Jun-2027","subInitiatives":3})]:
        ep=f"/api/v1/goals/{gid}/initiatives-full"
        try:
            row=next((x for x in get_initiatives_full(gid) if x["id"]==iid),None)
            actual={"done":row["done"],"inProgress":row["inProgress"],"notStarted":row["notStarted"],"completion":row["completion"],"start":row["start"],"end":row["end"],"subInitiatives":len(row["subInitiatives"])} if row else None
            add(f"Full initiative {iid}",ep,expected,actual)
        except Exception as e: checks.append({"name":f"Full initiative {iid}","endpoint":ep,"expected":expected,"actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
    for label,question,expected_value in [("AI question ELA","What is the district M-Step ELA assessment value for 2025-26?","39.53%"),("AI question graduation","What is the district graduation rate for 2024-25?","84.4%")]:
        ep="/api/v1/ai/ask"
        try:
            out=_ask_ai(question,"api-v1-validation"); answer=str(out.get("answer") or "")
            normalized=unicodedata.normalize("NFKC",answer)
            expected_number=expected_value.replace("%","")
            compact=re.sub(r"[^0-9.%]+","",normalized)
            matched=expected_number+"%" in compact
            add(label,ep,f"answer contains {expected_value}",f"answer contains {expected_value}" if matched else answer[:240])
        except Exception as e: checks.append({"name":label,"endpoint":ep,"expected":f"answer contains {expected_value}","actual":f"ERROR: {type(e).__name__}: {e}","status":"FAIL"})
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
