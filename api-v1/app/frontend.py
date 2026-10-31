"""Optional same-origin React hosting for container-based deployment."""
from pathlib import Path
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles

class ReactFiles(StaticFiles):
    async def get_response(self, path, scope):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404)
        try:
            response = await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404 or Path(path).suffix:
                raise
            response = await super().get_response("index.html", scope)
        if response.media_type and response.media_type.startswith('text/html'):
            response.headers['Cache-Control'] = 'no-store, max-age=0'
            response.headers['Pragma'] = 'no-cache'
        elif path.startswith('assets/'):
            response.headers['Cache-Control'] = 'public, max-age=31536000, immutable'
        return response

def install_frontend(app, directory: Path):
    if (directory / "index.html").is_file():
        app.mount("/", ReactFiles(directory=directory, html=True), name="frontend")
