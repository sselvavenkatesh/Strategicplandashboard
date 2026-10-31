"""Optional same-origin React hosting for container-based deployment."""
from pathlib import Path
from starlette.exceptions import HTTPException
from starlette.staticfiles import StaticFiles

class ReactFiles(StaticFiles):
    async def get_response(self, path, scope):
        if path == "api" or path.startswith("api/"):
            raise HTTPException(404)
        try:
            return await super().get_response(path, scope)
        except HTTPException as error:
            if error.status_code != 404 or Path(path).suffix:
                raise
            return await super().get_response("index.html", scope)

def install_frontend(app, directory: Path):
    if (directory / "index.html").is_file():
        app.mount("/", ReactFiles(directory=directory, html=True), name="frontend")
