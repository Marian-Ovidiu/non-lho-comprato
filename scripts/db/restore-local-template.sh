#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: LOCAL_DATABASE_URL=postgresql://localhost/... $0 <input.dump>" >&2
  exit 1
fi

if [ -z "${LOCAL_DATABASE_URL:-}" ]; then
  echo "LOCAL_DATABASE_URL is not set. Refusing to run." >&2
  exit 1
fi

DUMP_FILE="$1"

if [ ! -f "$DUMP_FILE" ]; then
  echo "Dump file does not exist: $DUMP_FILE" >&2
  exit 1
fi

HOST="$(node -e 'const u=new URL(process.env.LOCAL_DATABASE_URL); console.log(u.hostname)' 2>/dev/null || true)"

case "$HOST" in
  localhost|127.0.0.1|::1)
    ;;
  *)
    echo "LOCAL_DATABASE_URL host is not clearly local: $HOST" >&2
    echo "Refusing restore. Use localhost, 127.0.0.1, or ::1 for this safety template." >&2
    exit 1
    ;;
esac

case "$HOST" in
  *supabase.co|*supabase.com|*pooler.supabase.com|*supabase.net)
    echo "LOCAL_DATABASE_URL looks like Supabase. Refusing restore." >&2
    exit 1
    ;;
esac

echo "Local restore target (sanitized):"
node scripts/db/print-db-target.js LOCAL_DATABASE_URL

echo "WARNING: this can overwrite objects in the local database only. Continuing in 5 seconds..." >&2
sleep 5

pg_restore \
  --dbname="$LOCAL_DATABASE_URL" \
  --clean \
  --if-exists \
  --no-owner \
  --no-privileges \
  "$DUMP_FILE"

echo "Restore complete: $DUMP_FILE"
