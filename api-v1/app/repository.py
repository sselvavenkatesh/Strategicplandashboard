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


def initiative_data(goal_id: str):
    return fetch_all('select * from public."Initiative_Data" where "Goal ID"=%s and "Role"=%s order by "Initiative ID", "Sub Initiative Name", "Action Item"', (goal_id, "All"))


def admin_signin_config():
    return fetch_one('select "Admin Signin Method" from public."District_Profile" limit 1')

def validate_admin_login(email: str, password: str):
    rows = fetch_all("select * from public.validate_admin_login(%s,%s)", (email, password))
    return rows[0] if rows else None

def validate_sso_admin(email: str):
    rows = fetch_all("select * from public.validate_sso_admin(%s)", (email,))
    return rows[0] if rows else None

def validate_superadmin_login(email: str, password: str):
    rows = fetch_all("select * from public.validate_superadmin_login(%s,%s)", (email, password))
    return rows[0] if rows else None

def superadmin_profile():
    return fetch_one('select * from public."District_Profile" limit 1')

def superadmin_goals():
    return fetch_all('select * from public."Goal_master" order by "Goal ID"')

def superadmin_indicator_data():
    return fetch_all('select * from public."Indicator_Data"')

def superadmin_initiative_data():
    return fetch_all('select * from public."Initiative_Data"')

def superadmin_indicator_count():
    row=fetch_one('select count(*) as count from public."Indicator_master" where "Role"=%s', ("All",))
    return int(row["count"] if row else 0)

def superadmin_initiative_count():
    row=fetch_one('select count(*) as count from public."Initiative_master" where "Role"=%s', ("All",))
    return int(row["count"] if row else 0)

def save_superadmin_configuration(token: str, profile, goals):
    row=fetch_one("select public.save_superadmin_configuration(%s,%s::jsonb,%s::jsonb) as result", (token, __import__("json").dumps(profile), __import__("json").dumps(goals)))
    return row["result"] if row else None

def delete_superadmin_goal(token: str, goal_id: str):
    row=fetch_one("select public.delete_superadmin_goal(%s,%s) as result", (token, goal_id))
    return row["result"] if row else None

def update_superadmin_logo(token: str, logo: str):
    row=fetch_one("select public.update_superadmin_logo(%s,%s) as result", (token, logo))
    return row["result"] if row else None

def superadmin_bulk_upsert_data(token: str, dataset: str, rows):
    row=fetch_one("select public.superadmin_bulk_upsert_data(%s,%s,%s::jsonb) as result", (token, dataset, __import__("json").dumps(rows)))
    return row["result"] if row else None


def validate_superadmin_session(token: str):
    rows=fetch_all("select * from public.validate_superadmin_session(%s::uuid)", (token,))
    return rows[0] if rows else None

def log_dashboard_access(session_id: str, user_id, user_name, user_email, user_type, region, country, page_path, user_agent):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select public.log_dashboard_access(%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s)", (session_id,user_id,user_name,user_email,user_type,region,country,page_path,user_agent))


def admin_auth_config():
    return fetch_one("select * from public.get_admin_auth_config()")

def save_oauth_secrets(token: str, google_secret: str | None, microsoft_secret: str | None):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select public.save_district_oauth_secrets(%s::uuid,%s,%s)", (token,google_secret,microsoft_secret))

def oauth_secret(provider: str):
    column='"Google Client Secret"' if provider=="google" else '"Microsoft Client Secret"'
    return fetch_one(f'''select c.{column} as secret from public."District_Auth_Config" c join public."District_Profile" p on p."District ID"=c."District ID" limit 1''')


def create_admin_oauth_state(provider: str, return_to: str):
    row=fetch_one("select public.create_admin_oauth_state(%s,%s) as state",(provider,return_to))
    return str(row["state"])

def consume_admin_oauth_state(state: str, provider: str):
    row=fetch_one("select public.consume_admin_oauth_state(%s::uuid,%s) as return_to",(state,provider))
    return row.get("return_to") if row else None

def create_admin_session(user_id):
    row=fetch_one("select public.create_admin_session(%s) as token",(str(user_id),))
    return str(row["token"])

def validate_admin_session(token: str):
    rows=fetch_all("select * from public.validate_admin_session(%s::uuid)",(token,))
    return rows[0] if rows else None

def revoke_admin_session(token: str):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select public.revoke_admin_session(%s::uuid)",(token,))
