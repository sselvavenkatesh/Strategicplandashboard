"""Vercel FastAPI entry point.

The application itself remains provider-neutral in app.main. This thin module
only exposes the existing FastAPI ASGI object in the location Vercel expects.
"""
from app.main import app

__all__ = ["app"]
