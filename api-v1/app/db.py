from contextlib import contextmanager
import psycopg
from psycopg.rows import dict_row
from .config import get_settings

@contextmanager
def connection():
    """Open one short-lived PostgreSQL connection for the request data operation.

    This lifecycle is safe for both traditional ASGI servers and serverless/Fluid
    runtimes because no process-level pool is left open when an instance suspends.

    Prepared statements are explicitly disabled for compatibility with Supabase
    shared transaction pooling on port 6543.
    """
    with psycopg.connect(
        get_settings().database_url,
        row_factory=dict_row,
        connect_timeout=10,
        prepare_threshold=None,
    ) as conn:
        yield conn
