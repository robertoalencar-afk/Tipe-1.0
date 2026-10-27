#!/bin/bash
# Aplica no banco as migrações do repositório que ainda não foram aplicadas.
#
#   DATABASE_URL="postgresql://postgres:SENHA@db.XXXX.supabase.co:5432/postgres" scripts/db/aplicar-migracoes.sh
#
# Ordem: supabase/migrations (histórico inicial) e depois drizzle/migrations.
# Cada arquivo roda numa transação; o que já foi aplicado fica registrado em
# tipe_meta.migracoes e é pulado nas próximas vezes.
set -euo pipefail
: "${DATABASE_URL:?defina DATABASE_URL com a conexão do banco}"
REPO=$(cd "$(dirname "$0")/../.." && pwd)
export PGOPTIONS="${PGOPTIONS:-} -c client_min_messages=warning"
P=(psql "$DATABASE_URL" -X -q -v ON_ERROR_STOP=1)

"${P[@]}" -c "CREATE SCHEMA IF NOT EXISTS tipe_meta; CREATE TABLE IF NOT EXISTS tipe_meta.migracoes (arquivo text PRIMARY KEY, aplicada_em timestamptz NOT NULL DEFAULT now()); REVOKE ALL ON SCHEMA tipe_meta FROM PUBLIC;" >/dev/null

APLICADAS=$("${P[@]}" -At -c "SELECT arquivo FROM tipe_meta.migracoes")
N=0
for f in $(ls "$REPO"/supabase/migrations/*.sql | sort) $(ls "$REPO"/drizzle/migrations/*.sql | sort); do
  NOME="${f#"$REPO"/}"
  grep -qxF "$NOME" <<<"$APLICADAS" && continue
  echo "aplicando $NOME"
  "${P[@]}" -1 -f "$f" -c "INSERT INTO tipe_meta.migracoes (arquivo) VALUES ('$NOME')" >/dev/null
  N=$((N+1))
done
echo "ok: $N migração(ões) aplicada(s)"
