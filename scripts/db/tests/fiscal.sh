#!/usr/bin/env bash
set -euo pipefail
: "${TIPE_SQL_TEST_URL:?Informe um banco descartável isolado para os testes fiscais}"
repo_root="$(cd "$(dirname "$0")/../../.." && pwd)"
archive_sql="$(mktemp)"
trap 'rm -f "$archive_sql"' EXIT
python3 - "$repo_root" "$archive_sql" <<'PYTHON'
from pathlib import Path
import sys
root=Path(sys.argv[1])
source=next((root/'drizzle/migrations').glob('0022_*')).read_text()
start=source.index('CREATE OR REPLACE FUNCTION public.archive_and_reopen_table')
end=source.index('$function$;', start)+len('$function$;')
Path(sys.argv[2]).write_text(source[start:end])
PYTHON
psql "$TIPE_SQL_TEST_URL" -v ON_ERROR_STOP=1 \
  -f "$repo_root/scripts/db/tests/fiscal.fixture.sql" \
  -f "$archive_sql" \
  -f "$repo_root/drizzle/migrations/0076_fiscal_foundation.sql" \
  -f "$repo_root/scripts/db/tests/fiscal-foundation.sql" \
  -f "$repo_root/drizzle/migrations/0077_fiscal_sale_snapshots.sql" \
  -f "$repo_root/scripts/db/tests/fiscal-sales.sql" \
  -f "$repo_root/drizzle/migrations/0078_fiscal_sale_issuance.sql" \
  -f "$repo_root/scripts/db/tests/fiscal-issuance.sql"
