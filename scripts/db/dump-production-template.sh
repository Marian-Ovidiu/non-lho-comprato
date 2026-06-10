#!/usr/bin/env bash
set -euo pipefail

if [ "${1:-}" = "" ]; then
  echo "Usage: PROD_DATABASE_URL=postgresql://... $0 <output.dump>" >&2
  exit 1
fi

if [ -z "${PROD_DATABASE_URL:-}" ]; then
  echo "PROD_DATABASE_URL is not set. Refusing to run." >&2
  exit 1
fi

OUTPUT_FILE="$1"
OUTPUT_DIR="$(dirname "$OUTPUT_FILE")"

mkdir -p "$OUTPUT_DIR"

echo "Production dump target (sanitized):"
node scripts/db/print-db-target.js PROD_DATABASE_URL

echo "Creating read-only logical dump in custom format: $OUTPUT_FILE"
PGOPTIONS="${PGOPTIONS:-} -c default_transaction_read_only=on" \
  pg_dump "$PROD_DATABASE_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="$OUTPUT_FILE"

echo "Dump complete: $OUTPUT_FILE"
