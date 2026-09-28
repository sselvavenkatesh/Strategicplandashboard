from app import main

def test_routes_are_versioned():
    paths=set(main.app.openapi()["paths"])
    required={
      "/api/v1/profile","/api/v1/goals","/api/v1/goals/{goal_id}/indicators",
      "/api/v1/indicators/{indicator_id}/history","/api/v1/indicators/{indicator_id}/student-groups",
      "/api/v1/goals/{goal_id}/initiative-progress","/api/v1/goals/{goal_id}/initiatives",
      "/api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives",
      "/api/v1/features/{version}/{feature}",
      "/api/v1/admin/signin-config","/api/v1/auth/admin/login","/api/v1/auth/admin/sso/validate","/api/v1/access-log",
      "/api/v1/superadmin/login","/api/v1/superadmin/configuration","/api/v1/superadmin/goals/{goal_id}",
      "/api/v1/superadmin/logo","/api/v1/superadmin/indicators/bulk","/api/v1/superadmin/initiatives/bulk",
    }
    assert required <= paths
