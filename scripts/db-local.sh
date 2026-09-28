#!/usr/bin/env bash
# Lokal Postgres for utvikling og e2e: migreringer + dev-seed.
# Bruk: eval "$(bash scripts/db-local.sh start)"  → setter DATABASE_URL
#       bash scripts/db-local.sh stop
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
DIR="${KC_PG_DIR:-/tmp/kc-pg}"; PORT="${KC_PG_PORT:-54330}"
PGBIN="$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)"
RUNAS=""; [[ "$(id -u)" == "0" ]] && RUNAS="runuser -u postgres --"
URL="postgresql://postgres@localhost:$PORT/postgres"
case "${1:-start}" in
  start)
    if [[ ! -d "$DIR/data" ]]; then
      mkdir -p "$DIR"; chmod 755 "$DIR"; [[ -n "$RUNAS" ]] && chown postgres "$DIR"
      $RUNAS "$PGBIN/initdb" -D "$DIR/data" -U postgres -A trust >/dev/null
      $RUNAS "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=localhost" -l "$DIR/log" -w start >/dev/null
      PSQL=(psql "$URL" -v ON_ERROR_STOP=1 -q -X)
      "${PSQL[@]}" -f "$ROOT/supabase/tests/00_supabase_stub.sql" >/dev/null
      for f in "$ROOT"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f" >/dev/null; done
      "${PSQL[@]}" -f "$ROOT/supabase/seed/dev.sql" >/dev/null
    elif ! $RUNAS "$PGBIN/pg_ctl" -D "$DIR/data" status >/dev/null 2>&1; then
      $RUNAS "$PGBIN/pg_ctl" -D "$DIR/data" -o "-p $PORT -k $DIR -c listen_addresses=localhost" -l "$DIR/log" -w start >/dev/null
    fi
    echo "export DATABASE_URL=$URL";;
  stop) $RUNAS "$PGBIN/pg_ctl" -D "$DIR/data" -w stop >/dev/null || true; rm -rf "$DIR";;
esac
