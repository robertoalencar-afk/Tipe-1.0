#!/bin/bash
# Roda os testes de ponta a ponta do Tipe Order com tudo local: Postgres de teste,
# Supabase falso (tests/e2e/order/fake-supabase.mjs) e o app em modo dev.
#   PGHOST=/var/tmp/pg PGPORT=5432 PGUSER=postgres bash tests/e2e/order/run.sh
# Nunca aponte para o Supabase de produção: as chaves são geradas aqui e só valem localmente.
set -u
DIR=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$DIR/../../.." && pwd)
PORT=${E2E_APP_PORT:-5180}
LOGS=${E2E_LOGS:-/tmp/tipe-order-e2e}; mkdir -p "$LOGS"
cd "$REPO"

bash "$DIR/setup-db.sh" || exit 1

FAKE_SUPABASE_DEBUG=1 node "$DIR/fake-supabase.mjs" --print-keys > "$LOGS/fake-supabase.log" 2>&1 &
FAKE=$!
VITE=""
trap 'kill $FAKE 2>/dev/null; [ -n "$VITE" ] && kill -- -"$VITE" 2>/dev/null' EXIT
for _ in $(seq 1 50); do grep -q '^SERVICE=' "$LOGS/fake-supabase.log" && break; sleep 0.2; done
ANON=$(sed -n 's/^ANON=//p' "$LOGS/fake-supabase.log"); SERVICE=$(sed -n 's/^SERVICE=//p' "$LOGS/fake-supabase.log")
[ -n "$SERVICE" ] || { echo "Supabase falso não subiu"; cat "$LOGS/fake-supabase.log"; exit 1; }

export SUPABASE_URL=http://127.0.0.1:54321 VITE_SUPABASE_URL=http://127.0.0.1:54321
export SUPABASE_PUBLISHABLE_KEY=$ANON VITE_SUPABASE_PUBLISHABLE_KEY=$ANON SUPABASE_SERVICE_ROLE_KEY=$SERVICE
export SUPABASE_PROJECT_ID=local-e2e VITE_SUPABASE_PROJECT_ID=local-e2e
setsid npx vite dev --host 127.0.0.1 --port "$PORT" --strictPort > "$LOGS/vite.log" 2>&1 &
VITE=$!
for _ in $(seq 1 120); do curl -sf -o /dev/null "http://127.0.0.1:$PORT/" && break; sleep 1; done

BASE="http://127.0.0.1:$PORT" node "$DIR/fluxo-qr.e2e.mjs"
