#!/usr/bin/env bash
# Legger Supabase-stub + migreringer (+ valgfritt innholdsseed og dev-seed) på DATABASE_URL. Brukes i CI.
# Mot det ekte Supabase-prosjektet: bruk `npm run db:push` (docs/06-supabase-oppsett.md), ikke dette skriptet.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PSQL=(psql "${DATABASE_URL:?DATABASE_URL mangler}" -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
if [[ "${1:-}" == "--seed" ]]; then
  "${PSQL[@]}" -f "$ROOT/supabase/seed/content.sql"
  "${PSQL[@]}" -f "$ROOT/supabase/seed/dev.sql"
fi
echo "Database klar"
