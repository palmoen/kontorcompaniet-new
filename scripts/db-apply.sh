#!/usr/bin/env bash
# Legger Supabase-stub + migreringer (+ valgfritt dev-seed) på DATABASE_URL. Brukes i CI.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql "${DATABASE_URL:?DATABASE_URL mangler}" -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
[[ "${1:-}" == "--seed" ]] && "${PSQL[@]}" -f "$ROOT/supabase/seed/dev.sql"
echo "Database klar"
