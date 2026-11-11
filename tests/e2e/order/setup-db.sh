#!/bin/bash
# Monta o banco local "tipe_e2e" para os testes de ponta a ponta do Tipe Order:
# mesmas migrações e ajustes de tests/db/run.sh, mais o seed.sql deste diretório.
#   PGHOST=/var/tmp/pg PGPORT=5432 PGUSER=postgres tests/e2e/order/setup-db.sh
# Nunca aponte para produção.
set -u
DIR=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$DIR/../../.." && pwd); DBT="$REPO/tests/db"
DB=${TIPE_E2E_DB:-tipe_e2e}
P="psql -X -q -d $DB"
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null || exit 1
$P -v ON_ERROR_STOP=1 -f "$DBT/bootstrap.sql" >/dev/null 2>&1 || { echo "falha no bootstrap"; exit 1; }
FILES="$REPO/supabase/migrations/*.sql $(ls "$REPO"/drizzle/migrations/*.sql | sort)"
for f in $FILES; do $P -f "$f" >/dev/null 2>&1; done
node "$DBT/stubs.mjs" "$REPO/src/integrations/supabase/types.ts" > /tmp/tipe-e2e-stubs.sql
$P -f /tmp/tipe-e2e-stubs.sql >/dev/null 2>&1
$P -f "$DBT/fixups.sql" >/dev/null 2>&1
for f in $FILES; do $P -f "$f" >/dev/null 2>&1; done
$P -v ON_ERROR_STOP=1 -f "$DIR/seed.sql" || { echo "falha no seed"; exit 1; }
echo "ok: banco $DB pronto"
