from contextlib import contextmanager
import logging
import psycopg
from psycopg.rows import dict_row
from .config import get_settings

_role_logged = False

@contextmanager
def connection():
    """Open one short-lived PostgreSQL connection for the request data operation.

    This lifecycle is safe for both traditional ASGI servers and serverless/Fluid
    runtimes because no process-level pool is left open when an instance suspends.

    Prepared statements are explicitly disabled for compatibility with Supabase
    shared transaction pooling on port 6543.
    """
    if not get_settings().database_url:
        from fastapi import HTTPException
        raise HTTPException(503,"Preview database connection is not configured.")
    with psycopg.connect(
        get_settings().database_url,
        row_factory=dict_row,
        connect_timeout=10,
        prepare_threshold=None,
        options=f"-c search_path=pg_catalog,{get_settings().district_schema},extensions",
    ) as conn:
        global _role_logged
        if not _role_logged:
            logging.getLogger(__name__).warning("Reporting connection role: %s", conn.info.user)
            _role_logged = True
        yield conn
