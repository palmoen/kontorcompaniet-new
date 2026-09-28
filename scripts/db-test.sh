#!/usr/bin/env bash
# Kjører migreringene mot en midlertidig Postgres (lokalt eller i CI) og tester RLS/regler.
# Bruk: npm run db:test            (starter egen klynge med pg_ctl)
#       DATABASE_URL=... npm run db:test   (bruker eksisterende database, f.eks. CI-service)
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cleanup() { :; }
if [[ -z "${DATABASE_URL:-}" ]]; then
  PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
  TMP="$(mktemp -d)"; chmod 755 "$TMP"
  RUNAS=""; [[ "$(id -u)" == "0" ]] && RUNAS="runuser -u postgres --"
  [[ -n "$RUNAS" ]] && chown postgres "$TMP"
  $RUNAS "$PGBIN/initdb" -D "$TMP/data" -U postgres -A trust >/dev/null
  $RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" -o "-p 54329 -k $TMP" -l "$TMP/log" -w start >/dev/null
  cleanup() { $RUNAS "$PGBIN/pg_ctl" -D "$TMP/data" -w stop >/dev/null || true; rm -rf "$TMP"; }
  DATABASE_URL="postgresql://postgres@localhost:54329/postgres?host=$TMP"
fi
trap cleanup EXIT
PSQL=(psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -q -X)
"${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql"
for f in "$ROOT"/supabase/migrations/*.sql; do echo "→ $(basename "$f")"; "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -f "$ROOT/supabase/tests/10_policies.sql"
