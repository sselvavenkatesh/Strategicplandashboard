from .db import connection

AI_CONTEXT_QUERIES = [
    ('profile', '''select "School District Name","Strategic Plan Name","Strategic Plan Duration","Mission Statement","Vision Statement" from "District_Profile" limit 1''', False),
    ('goals', '''select "Goal ID","Goal Name","Goal Description","Total Indicators","Total Initiatives" from "Goal_master" where (%s or "Role"='All') order by "Goal ID"''', True),
    ('indicators', '''select m."Indicator ID",m."Indicator Name",m."Indicator_short_name",m."Indicator Type",m."Goal ID",m."KPI Nature" from "Indicator_master" m join "Goal_master" g on g."Goal ID"=m."Goal ID" where (%s or (m."Role"='All' and g."Role"='All')) order by m."Indicator ID"''', True),
    ('initiatives', '''select m."Initiative ID",m."Initiative Name",m."Initiative_Short_name",m."Goal ID" from "Initiative_master" m join "Goal_master" g on g."Goal ID"=m."Goal ID" where (%s or (m."Role"='All' and g."Role"='All')) order by m."Initiative ID"''', True),
    ('indicatorData', '''select d."Goal ID",d."Indicator ID",d."Indicator Name",d."School Year",d."Category",d."Student Group",d."Value 1",d."Value 2",d."Value 3",d."Target 1",d."Target 2",d."Target 3",d."School" from "Indicator_Data" d join "Indicator_master" m on m."Indicator ID"=d."Indicator ID" and m."Goal ID"=d."Goal ID" join "Goal_master" g on g."Goal ID"=m."Goal ID" where (%s or (d."Role"='All' and m."Role"='All' and g."Role"='All')) order by d."Indicator ID",d."School Year",d."Category",d."Student Group" limit 300''', True),
    ('initiativeData', '''select d."Goal ID",d."Initiative ID",d."Initiative Name",d."Sub Initiative Name",d."Start Date",d."End Date",d."Action Item",d."Status",d."Target 1",d."Target 2",d."Target 3",d."School" from "Initiative_Data" d join "Initiative_master" m on m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID" join "Goal_master" g on g."Goal ID"=m."Goal ID" where (%s or (d."Role"='All' and m."Role"='All' and g."Role"='All')) order by d."Initiative ID",d."Sub Initiative Name",d."Action Item" limit 300''', True),
    ('initiativeProgress', '''select m."Goal ID" as goal_id,m."Initiative ID" as initiative_id,
      coalesce(nullif(m."Initiative_Short_name",''),m."Initiative Name") as name,
      count(d."Initiative ID") as total,
      count(*) filter(where d."Status"='Done') as completed,
      count(*) filter(where d."Status"='In Progress') as in_progress,
      count(*) filter(where d."Status" in ('Not Yet Started','Not Started')) as not_started,
      count(*) filter(where d."Status"='On Hold') as on_hold
      from "Initiative_master" m join "Goal_master" g on g."Goal ID"=m."Goal ID"
      left join "Initiative_Data" d on d."Initiative ID"=m."Initiative ID" and d."Goal ID"=m."Goal ID" and (%s or d."Role"='All')
      where (%s or (m."Role"='All' and g."Role"='All'))
      group by m."Goal ID",m."Initiative ID",m."Initiative_Short_name",m."Initiative Name"
      order by m."Goal ID",m."Initiative ID"''', True),
]

def ai_credentials():
    return fetch_one('select * from v25_server_ai_credentials()') or {}

def ai_context(include_private: bool = False):
    result = {}
    with connection() as conn, conn.cursor() as cur:
        cur.execute('set transaction isolation level repeatable read read only')
        cur.execute('select count(*) as count from "District_Profile"')
        if cur.fetchone()['count'] != 1:
            raise ValueError('District routing is not configured')
        for name, sql, scoped in AI_CONTEXT_QUERIES:
            cur.execute(sql, ((include_private,)*2 if name=='initiativeProgress' else (include_private,)) if scoped else ())
            rows = cur.fetchall()
            result[name] = rows[0] if name == 'profile' and rows else None if name == 'profile' else rows
    # Public counts must not disclose excluded children of otherwise public Goals.
    for goal in result['goals']:
        goal['Total Indicators'] = sum(row['Goal ID'] == goal['Goal ID'] for row in result['indicators'])
        goal['Total Initiatives'] = sum(row['Goal ID'] == goal['Goal ID'] for row in result['initiatives'])
    from .ai_progress import progress_summary
    result['progressSummary']=progress_summary(result['goals'],result['initiativeProgress'])
    return result

def log_ai_conversation(session_id, user_id, question, answer, in_scope, sources, ms):
    import json
    return fetch_one('select v25_log_ai_conversation(%s::uuid,%s,%s,%s,%s,%s::jsonb,%s)',
                     (session_id,user_id,question,answer,in_scope,json.dumps(sources),ms))

def fetch_one(sql: str, params=()):
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchone()

def fetch_all(sql: str, params=()):
    with connection() as conn, conn.cursor() as cur:
        cur.execute(sql, params)
        return cur.fetchall()

def dashboard_bootstrap():
    with connection() as conn, conn.cursor() as cur:
        cur.execute('select * from "District_Profile" limit 1'); p=cur.fetchone()
        cur.execute('select * from "Goal_master" where "Role"=%s order by "Goal ID"', ("All",)); g=cur.fetchall()
        return p,g

def profile():
    return fetch_one('select * from "District_Profile" limit 1')

def goals():
    return fetch_all('select * from "Goal_master" where "Role"=%s order by "Goal ID"', ("All",))

def indicator_master(goal_id: str):
    return fetch_all("""select m.* from "Indicator_master" m where m."Goal ID"=%s and m."Role"=%s and exists(select 1 from "Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by m."Indicator ID" """, (goal_id, "All"))

def indicator_key_values(goal_id: str, school: str | None = None):
    return fetch_all("select f.* from fn_indicator_key_values(%s,%s) f where exists(select 1 from \"Indicator_master\" m join \"Goal_master\" g on g.\"Goal ID\"=m.\"Goal ID\" where m.\"Indicator ID\"=f.indicator_id and m.\"Role\"='All' and g.\"Role\"='All')", (goal_id, school))

def indicator_history(indicator_id: str, school: str | None = None):
    return fetch_all("select f.* from fn_indicator_year_history(%s,%s) f where exists(select 1 from \"Indicator_master\" m join \"Goal_master\" g on g.\"Goal ID\"=m.\"Goal ID\" where m.\"Indicator ID\"=f.indicator_id and m.\"Role\"='All' and g.\"Role\"='All')", (indicator_id, school))

def indicator_student_groups(indicator_id: str, school_year: str, school: str | None = None):
    return fetch_all("select f.* from fn_indicator_student_groups(%s,%s,%s) f where exists(select 1 from \"Indicator_master\" m join \"Goal_master\" g on g.\"Goal ID\"=m.\"Goal ID\" where m.\"Indicator ID\"=f.indicator_id and m.\"Role\"='All' and g.\"Role\"='All')", (indicator_id, school_year, school))

def initiative_master(goal_id: str):
    return fetch_all("""select m.* from "Initiative_master" m where m."Goal ID"=%s and m."Role"=%s and exists(select 1 from "Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All') order by m."Initiative ID" """, (goal_id, "All"))

def initiative_progress(goal_id: str, school: str | None = None):
    return fetch_all("select f.* from fn_initiative_progress(%s,%s) f where exists(select 1 from \"Initiative_master\" m join \"Goal_master\" g on g.\"Goal ID\"=m.\"Goal ID\" where m.\"Initiative ID\"=f.initiative_id and m.\"Role\"='All' and g.\"Role\"='All')", (goal_id, school))

def subinitiative_progress(goal_id: str, initiative_id: str, school: str | None = None):
    return fetch_all("""select f.* from fn_subinitiative_progress(%s,%s,%s) f where exists(select 1 from "Initiative_master" m join "Goal_master" g on g."Goal ID"=m."Goal ID" where m."Initiative ID"=%s and m."Goal ID"=%s and m."Role"='All' and g."Role"='All')""", (goal_id, initiative_id, school, initiative_id, goal_id))

def goal_initiative_progress(goal_id: str | None = None, school: str | None = None):
    # Match initiatives-full: only public masters and public reporting rows.
    return fetch_all('''
      select d."Goal ID" as goal_id, count(*) as total_action_items,
        count(*) filter (where d."Status"='Done') as done_count,
        count(*) filter (where d."Status"='In Progress') as in_progress_count,
        count(*) filter (where d."Status"='Not Yet Started') as not_yet_started_count,
        round(100.0*count(*) filter (where d."Status"='Done')/count(*),1) as done_percent,
        round(100.0*count(*) filter (where d."Status"='In Progress')/count(*),1) as in_progress_percent,
        round(100.0*count(*) filter (where d."Status"='Not Yet Started')/count(*),1) as not_yet_started_percent
      from "Initiative_Data" d
      join "Initiative_master" m on m."Initiative ID"=d."Initiative ID" and m."Goal ID"=d."Goal ID"
      where d."Role"='All' and m."Role"='All' and exists(select 1 from "Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"='All')
        and (%s::text is null or d."Goal ID"=%s)
        and (%s::text is null or d."School"=%s)
      group by d."Goal ID" order by d."Goal ID"
    ''', (goal_id, goal_id, school, school))

def feature_enabled(version: str, feature: str):
    row = fetch_one("select is_feature_enabled(%s,%s) as enabled", (version, feature))
    return bool(row and row["enabled"])


def initiative_data(goal_id: str):
    return fetch_all('select * from "Initiative_Data" where "Goal ID"=%s and "Role"=%s order by "Initiative ID", "Sub Initiative Name", "Action Item"', (goal_id, "All"))


def admin_signin_config():
    return fetch_one('select "Admin Signin Method" from "District_Profile" limit 1')

def validate_admin_login(email: str, password: str):
    rows = fetch_all("select * from validate_admin_login(%s,%s)", (email, password))
    return rows[0] if rows else None

def validate_sso_admin(email: str, provider: str | None = None):
    rows = fetch_all("select * from v25_validate_sso_admin(%s,%s)", (email,provider)) if provider else fetch_all("select * from validate_sso_admin(%s)", (email,))
    return rows[0] if rows else None

def validate_superadmin_login(email: str, password: str):
    rows = fetch_all("select * from validate_superadmin_login(%s,%s)", (email, password))
    return rows[0] if rows else None

def superadmin_profile():
    return fetch_one('select * from "District_Profile" limit 1')

def superadmin_goals():
    return fetch_all('select * from "Goal_master" order by "Goal ID"')

def superadmin_indicator_data():
    return fetch_all('select * from "Indicator_Data"')

def superadmin_initiative_data():
    return fetch_all('select * from "Initiative_Data"')

def superadmin_indicator_count():
    row=fetch_one('select count(*) as count from "Indicator_master" where "Role"=%s', ("All",))
    return int(row["count"] if row else 0)

def superadmin_initiative_count():
    row=fetch_one('select count(*) as count from "Initiative_master" where "Role"=%s', ("All",))
    return int(row["count"] if row else 0)

def save_superadmin_configuration(token: str, profile, goals):
    row=fetch_one("select save_superadmin_configuration(%s,%s::jsonb,%s::jsonb) as result", (token, __import__("json").dumps(profile), __import__("json").dumps(goals)))
    return row["result"] if row else None

def delete_superadmin_goal(token: str, goal_id: str):
    row=fetch_one("select delete_superadmin_goal(%s,%s) as result", (token, goal_id))
    return row["result"] if row else None

def update_superadmin_logo(token: str, logo: str):
    row=fetch_one("select update_superadmin_logo(%s,%s) as result", (token, logo))
    return row["result"] if row else None

def superadmin_bulk_upsert_data(token: str, dataset: str, rows):
    row=fetch_one("select superadmin_bulk_upsert_data(%s,%s,%s::jsonb) as result", (token, dataset, __import__("json").dumps(rows)))
    return row["result"] if row else None


def validate_superadmin_session(token: str):
    rows=fetch_all("select * from validate_superadmin_session(%s::uuid)", (token,))
    return rows[0] if rows else None

def log_dashboard_access(session_id: str, user_id, user_name, user_email, user_type, region, country, page_path, user_agent):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select log_dashboard_access(%s::uuid,%s,%s,%s,%s,%s,%s,%s,%s)", (session_id,user_id,user_name,user_email,user_type,region,country,page_path,user_agent))


def admin_auth_config():
    return fetch_one("select * from get_admin_auth_config()")

def save_oauth_secrets(token: str, google_secret: str | None, microsoft_secret: str | None):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select save_district_oauth_secrets(%s::uuid,%s,%s)", (token,google_secret,microsoft_secret))

def oauth_secret(provider: str):
    row=fetch_one("select get_server_oauth_secret(%s) as secret",(provider,))
    return row.get("secret") if row else None


def create_admin_oauth_state(provider: str, return_to: str):
    row=fetch_one("select create_admin_oauth_state(%s,%s) as state",(provider,return_to))
    return str(row["state"])

def consume_admin_oauth_state(state: str, provider: str):
    row=fetch_one("select consume_admin_oauth_state(%s::uuid,%s) as return_to",(state,provider))
    return row.get("return_to") if row else None

def create_admin_session(user_id):
    row=fetch_one("select create_admin_session(%s) as token",(str(user_id),))
    return str(row["token"])

def validate_admin_session(token: str):
    rows=fetch_all("select * from validate_admin_session(%s::uuid)",(token,))
    return rows[0] if rows else None

def revoke_admin_session(token: str):
    with connection() as conn, conn.cursor() as cur:
        cur.execute("select revoke_admin_session(%s::uuid)",(token,))


def achievement_summary(preview: bool):
    row = fetch_one('select fn_indicator_achievement_summary(%s) as result', (preview,))
    return row['result'] if row else None


def indicator_target(indicator_id: str, school_year: str, preview: bool):
    # A demo overlay is optional. New/uploaded indicators use their real target
    # for this exact year when no non-null overlay exists.
    row = fetch_one("""select coalesce(
        (select target_1 from "Indicator_Target_Preview" where %s and indicator_id=%s and school_year=%s),
        (select target_1 from vw_indicator_reporting_normalized where indicator_id=%s and school_year=%s and category='All' and student_group='All Students' and role='All' and school is null)
    ) as target_1 where exists(select 1 from "Indicator_master" m join "Goal_master" g on g."Goal ID"=m."Goal ID" where m."Indicator ID"=%s and m."Role"='All' and g."Role"='All')
      and exists(select 1 from vw_indicator_reporting_normalized n where n.indicator_id=%s and n.school_year=%s and n.category='All' and n.student_group='All Students' and n.school is null and n.role='All')""", (preview, indicator_id, school_year, indicator_id, school_year, indicator_id, indicator_id, school_year))
    return row.get('target_1') if row else None


def indicator_labels():
    return fetch_all('select "Indicator ID" as id, coalesce(nullif("Indicator_short_name",\'\'),"Indicator Name",\'indicator\') as name from "Indicator_master" m where "Role"=%s and exists(select 1 from "Goal_master" g where g."Goal ID"=m."Goal ID" and g."Role"=\'All\') order by "Indicator ID"', ('All',))


def preview_dataset():
    # Only the same public, canonical fields already used by the UI prototype.
    # Stakeholder accounts and authentication tables are deliberately excluded.
    queries = {
        'profile': 'select "School District Name","Strategic Plan Name","Strategic Plan Duration","Mission Statement","Vision Statement","District Logo","Admin Signin Method" from "District_Profile" limit 1',
        'goals': 'select "Goal ID","Goal Name","Goal Description","Total Indicators","Total Initiatives" from "Goal_master" where "Role"=\'All\' order by "Goal ID"',
        'indicators': 'select "Indicator ID","Indicator Name","Goal ID","Indicator Type","KPI Nature" from "Indicator_master" where "Role"=\'All\' order by "Indicator ID"',
        'initiatives': 'select "Initiative ID","Initiative Name","Goal ID","Total Sub Initiatives" from "Initiative_master" where "Role"=\'All\' order by "Initiative ID"',
        'indicatorData': 'select "Goal ID","Indicator ID","Indicator Name","School Year","Category","Student Group","Value 1","Value 2","Value 3","Target 1","Target 2","Target 3","School" from "Indicator_Data" where "Role"=\'All\'',
        'initiativeData': 'select "Goal ID","Initiative ID","Initiative Name","Sub Initiative Name","Start Date","End Date","Action Item","Status","Target 1","Target 2","Target 3","School" from "Initiative_Data" where "Role"=\'All\'',
    }
    result = {}
    with connection() as conn, conn.cursor() as cur:
        for key, query in queries.items():
            cur.execute(query)
            result[key] = (cur.fetchone() or {}) if key == 'profile' else cur.fetchall()
        cur.execute('select indicator_id,school_year,target_1 from "Indicator_Target_Preview"')
        targets = {(row['indicator_id'], row['school_year']): row['target_1'] for row in cur.fetchall()}
    public_goals={row['Goal ID'] for row in result['goals']}
    for key in ('indicators','initiatives'):
        result[key]=[row for row in result[key] if row['Goal ID'] in public_goals]
    for kind,key,identifier in (('indicators','indicatorData','Indicator ID'),('initiatives','initiativeData','Initiative ID')):
        allowed={row[identifier] for row in result[kind]}
        result[key]=[row for row in result[key] if row[identifier] in allowed and row['Goal ID'] in public_goals]
    for row in result['indicatorData']:
        if row.get('Category') == 'All' and row.get('Student Group') == 'All Students' and not row.get('School'):
            row['Target 1'] = targets.get((row['Indicator ID'], row['School Year']), row.get('Target 1'))
    return result
