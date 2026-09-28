from app import main

def test_routes_are_versioned():
    paths=set(main.app.openapi()["paths"])
    required={
      "/api/v1/profile","/api/v1/goals","/api/v1/goals/{goal_id}/indicators",
      "/api/v1/indicators/{indicator_id}/history","/api/v1/indicators/{indicator_id}/student-groups",
      "/api/v1/goals/{goal_id}/initiative-progress","/api/v1/goals/{goal_id}/initiatives",
      "/api/v1/goals/{goal_id}/initiatives/{initiative_id}/subinitiatives",
      "/api/v1/features/{version}/{feature}",
    }
    assert required <= paths
