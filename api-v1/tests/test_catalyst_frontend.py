from fastapi import FastAPI
from fastapi.testclient import TestClient
from app.frontend import install_frontend

def test_react_routes_do_not_mask_api_errors_or_serve_outside_build(tmp_path):
    build=tmp_path/'dist'
    build.mkdir()
    (build/'index.html').write_text('<html>React shell</html>')
    (build/'app.js').write_text('console.log(1)')
    (tmp_path/'private.txt').write_text('not public')
    app=FastAPI()
    @app.get('/api/v1/profile')
    def profile():return {'districtName':'Allen Park Public Schools'}
    install_frontend(app,build)
    client=TestClient(app)
    for path in ['/','/admin','/superadmin','/goals/G1']:
        response=client.get(path)
        assert 'React shell' in response.text
        assert response.headers['cache-control']=='no-store, max-age=0'
    assert client.get('/api/v1/profile').json()['districtName']=='Allen Park Public Schools'
    assert client.get('/api/v1/missing').status_code==404
    assert client.get('/missing.js').status_code==404
    assert client.get('/%2e%2e/private.txt').status_code==404
    assert client.get('/app.js').headers['content-type'].startswith('text/javascript')
