from .db import connection

def fetch_one(sql: str, params=()):
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()

def fetch_all(sql: str, params=()):
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()

def profile():
    return fetch_one('select * from public."District_Profile" limit 1')

def goals():
    return fetch_all('select * from public."Goal_master" where "Role"=%s order by "Goal ID"', ("All",))

def indicator_master(goal_id: str):
    return fetch_all('select * from public."Indicator_master" where "Goal ID"=%s and "Role"=%s order by "Indicator ID"', (goal_id, "All"))

def indicator_key_values(goal_id: str, school: str | None = None):
    return fetch_all("select * from public.fn_indicator_key_values(%s,%s)", (goal_id, school))

def indicator_history(indicator_id: str, school: str | None = None):
    return fetch_all("select * from public.fn_indicator_year_history(%s,%s)", (indicator_id, school))

def indicator_student_groups(indicator_id: str, school_year: str, school: str | None = None):
    return fetch_all("select * from public.fn_indicator_student_groups(%s,%s,%s)", (indicator_id, school_year, school))

def initiative_master(goal_id: str):
    return fetch_all('select * from public."Initiative_master" where "Goal ID"=%s and "Role"=%s order by "Initiative ID"', (goal_id, "All"))

def initiative_progress(goal_id: str, school: str | None = None):
    return fetch_all("select * from public.fn_initiative_progress(%s,%s)", (goal_id, school))

def subinitiative_progress(goal_id: str, initiative_id: str, school: str | None = None):
    return fetch_all("select * from public.fn_subinitiative_progress(%s,%s,%s)", (goal_id, initiative_id, school))

def goal_initiative_progress(goal_id: str | None = None, school: str | None = None):
    return fetch_all("select * from public.fn_goal_initiative_progress(%s,%s)", (goal_id, school))

def feature_enabled(version: str, feature: str):
    row = fetch_one("select public.is_feature_enabled(%s,%s) as enabled", (version, feature))
    return bool(row and row["enabled"])
