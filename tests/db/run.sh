#!/bin/bash
# Testes do banco do TIPE contra um PostgreSQL local descartável.
#
#   PGHOST=/caminho/do/socket PGPORT=5432 PGUSER=postgres tests/db/run.sh
#
# Cria (e apaga) o banco "tipe_test". Nunca aponte para produção.
# O histórico de migrações do repositório não recria todas as tabelas de
# produção (algumas foram criadas fora dele); por isso o script aplica as
# migrações em duas passadas e completa o que falta a partir dos tipos gerados
# em src/integrations/supabase/types.ts (ver stubs.mjs).
set -u
DIR=$(cd "$(dirname "$0")" && pwd); REPO=$(cd "$DIR/../.." && pwd)
DB=${TIPE_TEST_DB:-tipe_test}
P="psql -X -q -d $DB"
psql -X -q -d postgres -c "drop database if exists $DB" -c "create database $DB" >/dev/null || exit 1
$P -v ON_ERROR_STOP=1 -f "$DIR/bootstrap.sql" >/dev/null 2>&1 || { echo "falha no bootstrap"; exit 1; }
FILES="$REPO/supabase/migrations/*.sql $(ls "$REPO"/drizzle/migrations/*.sql | sort)"
for f in $FILES; do $P -f "$f" >/dev/null 2>&1; done
node "$DIR/stubs.mjs" "$REPO/src/integrations/supabase/types.ts" > /tmp/tipe-stubs.sql
$P -f /tmp/tipe-stubs.sql >/dev/null 2>&1
$P -f "$DIR/fixups.sql" >/dev/null 2>&1
for f in $FILES; do $P -f "$f" >/dev/null 2>&1; done
# A migração nova precisa aplicar sem erro sobre o estado atual.
LAST=$(ls "$REPO"/drizzle/migrations/*.sql | sort | tail -1)
$P -v ON_ERROR_STOP=1 -f "$LAST" >/dev/null 2>/tmp/tipe-last.log || { echo "FALHOU: $(basename "$LAST") não reaplica"; cat /tmp/tipe-last.log; exit 1; }
echo "ok: migrações aplicadas ($(basename "$LAST") idempotente)"

FAIL=0
$P -v ON_ERROR_STOP=1 -f "$DIR/payments.sql" >/tmp/tipe-db.raw 2>&1 || FAIL=1
grep -E "NOTICE:  ok:|FALHOU|ERROR" /tmp/tipe-db.raw | sed 's/.*NOTICE:  //; s/^psql:[^ ]* //' | tee /tmp/tipe-db.log
grep -qE "FALHOU|ERROR" /tmp/tipe-db.log && FAIL=1
$P -v ON_ERROR_STOP=1 -f "$DIR/balcao.sql" >/tmp/tipe-balcao.raw 2>&1 || FAIL=1
grep -E "NOTICE:  ok:|FALHOU|ERROR" /tmp/tipe-balcao.raw | sed 's/.*NOTICE:  //; s/^psql:[^ ]* //' | tee /tmp/tipe-balcao.log
grep -qE "FALHOU|ERROR" /tmp/tipe-balcao.log && FAIL=1
$P -v ON_ERROR_STOP=1 -f "$DIR/garcom.sql" >/tmp/tipe-garcom.raw 2>&1 || FAIL=1
grep -E "NOTICE:  ok:|FALHOU|ERROR" /tmp/tipe-garcom.raw | sed 's/.*NOTICE:  //; s/^psql:[^ ]* //' | tee /tmp/tipe-garcom.log
grep -qE "FALHOU|ERROR" /tmp/tipe-garcom.log && FAIL=1
$P -v ON_ERROR_STOP=1 -f "$DIR/pedido-mesa.sql" >/tmp/tipe-pedido-mesa.raw 2>&1 || FAIL=1
grep -E "NOTICE:  ok:|FALHOU|ERROR" /tmp/tipe-pedido-mesa.raw | sed 's/.*NOTICE:  //; s/^psql:[^ ]* //' | tee /tmp/tipe-pedido-mesa.log
grep -qE "FALHOU|ERROR" /tmp/tipe-pedido-mesa.log && FAIL=1
$P -v ON_ERROR_STOP=1 -f "$DIR/totem.sql" >/tmp/tipe-totem.raw 2>&1 || FAIL=1
grep -E "NOTICE:  ok:|FALHOU|ERROR" /tmp/tipe-totem.raw | sed 's/.*NOTICE:  //; s/^psql:[^ ]* //' | tee /tmp/tipe-totem.log
grep -qE "FALHOU|ERROR" /tmp/tipe-totem.log && FAIL=1
$P -v ON_ERROR_STOP=1 -f "$DIR/guest-avaliacoes.sql" >/tmp/tipe-guest.raw 2>&1 || FAIL=1
grep -E "NOTICE:  ok:|FALHOU|ERROR" /tmp/tipe-guest.raw | sed 's/.*NOTICE:  //; s/^psql:[^ ]* //' | tee /tmp/tipe-guest.log
grep -qE "FALHOU|ERROR" /tmp/tipe-guest.log && FAIL=1

# 1) Dois clientes pagando a conta inteira ao mesmo tempo, em conexões separadas.
$P -c "SET search_path=public,extensions; DELETE FROM table_payment_requests WHERE restaurant_slug='mare-alta' AND table_number='8'; DELETE FROM table_bill_items WHERE restaurant_slug='mare-alta' AND table_number='8'; INSERT INTO table_bill_items (restaurant_slug, table_number, item_code, item_name, unit_price, ordered_quantity, ordered_by, ordered_at) VALUES ('mare-alta','8','pizza','Pizza',90,1,'Teste',now()),('mare-alta','8','suco','Suco',12,3,'Teste',now());" >/dev/null
pay() { $P -c "SET search_path=public,extensions; BEGIN; SELECT register_table_payment('mare-alta','8','$1','restaurant','pix','pending',126,'{\"pizza\":1,\"suco\":3}','concorrencia-$2'); SELECT pg_sleep(0.5); COMMIT;" >/tmp/tipe-conc-$2.log 2>&1; }
pay "Ana Lima" a & pay "Bia Melo" b & wait
OKS=$(grep -L ERROR /tmp/tipe-conc-a.log /tmp/tipe-conc-b.log | wc -l)
ERRS=$(grep -l "não está mais disponível" /tmp/tipe-conc-a.log /tmp/tipe-conc-b.log | wc -l)
RES=$($P -At -c "SELECT sum(reserved_portion) FROM table_bill_items WHERE restaurant_slug='mare-alta' AND table_number='8'")
if [ "$OKS" = "1" ] && [ "$ERRS" = "1" ] && [ "$RES" = "4.0000" ]; then echo "ok: dois pagamentos simultâneos da mesma conta: um passa, o outro é recusado"; else echo "FALHOU: concorrência (passaram=$OKS recusados=$ERRS reservado=$RES)"; FAIL=1; fi

psql -X -q -d postgres -c "drop database if exists $DB" >/dev/null
[ $FAIL = 0 ] && echo "TODOS OS CENÁRIOS DO BANCO PASSARAM" || { echo "HÁ FALHAS"; exit 1; }
