#!/usr/bin/env bash
set -euo pipefail
: "${TIPE_SQL_TEST_URL:?Informe o endereço de um banco local descartável de testes}"
repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
review_sql="$(mktemp)"
trap 'rm -f "$review_sql"' EXIT
python3 - "$repo_root" "$review_sql" <<'PYTHON'
import sys
from pathlib import Path
root=Path(sys.argv[1])
s=(root/'drizzle/migrations/0027_order_modules_table_ordering.sql').read_text()
a=s.index('CREATE OR REPLACE FUNCTION public.pdv_customer_order')
b=s.index('-- Restaurantes que já',a)
Path(sys.argv[2]).write_text(s[a:b])
PYTHON
psql "$TIPE_SQL_TEST_URL" -v ON_ERROR_STOP=1 \
 -f "$repo_root/scripts/db/tests/customer-order-review.fixture.sql" \
 -f "$review_sql" \
 -f "$repo_root/drizzle/migrations/0059_customer_order_review.sql" \
 -f "$repo_root/drizzle/migrations/0064_menu_accompaniments.sql" \
 -f "$repo_root/scripts/db/tests/customer-order-review.sql"
