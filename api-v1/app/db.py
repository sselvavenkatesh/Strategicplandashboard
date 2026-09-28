from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from .config import get_settings

@contextmanager
def connection():
    """Open one short-lived PostgreSQL connection for the request data operation.

    This lifecycle is safe for both traditional ASGI servers and serverless/Fluid
    runtimes because no process-level pool is left open when an instance suspends.
    """
    with psycopg.connect(
        get_settings().database_url,
        row_factory=dict_row,
        connect_timeout=10,
    ) as conn:
        yield conn
