"""
Bootstrap — generates/persists JWT secret before uvicorn starts.
Prints the key to stdout; entrypoint.sh captures and exports it.
"""
import os
import secrets
import sys

db_url = os.environ.get(
    "DATABASE_URL",
    "postgresql+asyncpg://postgres:postgres@db:5432/simplegear",
)
sync_url = db_url.replace("+asyncpg", "").replace("postgresql+psycopg2", "postgresql")

env_key = os.environ.get("APP_SECRET_KEY", "").strip()
if env_key and env_key != "dev-secret-change-in-production":
    try:
        import psycopg2
        conn = psycopg2.connect(sync_url)
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO app_settings (key, value) VALUES ('app_secret_key', %s)
            ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
            WHERE app_settings.value IS DISTINCT FROM EXCLUDED.value
            """,
            (env_key,),
        )
        cur.close()
        conn.close()
    except Exception as exc:
        print(f"[bootstrap] Warning: could not sync key to DB: {exc}", file=sys.stderr)
    print(env_key)
    sys.exit(0)

try:
    import psycopg2
    conn = psycopg2.connect(sync_url)
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute("SELECT value FROM app_settings WHERE key = 'app_secret_key'")
    row = cur.fetchone()
    if row and row[0]:
        print("[bootstrap] Using persisted APP_SECRET_KEY from DB", file=sys.stderr)
        print(row[0])
        cur.close()
        conn.close()
        sys.exit(0)
    new_key = secrets.token_hex(32)
    cur.execute(
        "INSERT INTO app_settings (key, value) VALUES ('app_secret_key', %s) ON CONFLICT (key) DO UPDATE SET value = %s",
        (new_key, new_key),
    )
    print("[bootstrap] Generated and persisted new APP_SECRET_KEY", file=sys.stderr)
    print(new_key)
    cur.close()
    conn.close()
except Exception as exc:
    print(f"[bootstrap] Warning: {exc}", file=sys.stderr)
    fallback = env_key or "dev-secret-change-in-production"
    print(fallback)
