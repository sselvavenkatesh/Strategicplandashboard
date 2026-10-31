"""Provider-neutral ASGI entry point for Zoho AppSail."""
import os
import uvicorn
from pathlib import Path
from app.main import app
from app.frontend import install_frontend

install_frontend(app, Path(__file__).parent / "dist")

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0",
                port=int(os.environ.get("X_ZOHO_CATALYST_LISTEN_PORT", "9000")),
                proxy_headers=False)
