#!/usr/bin/env bash
# Teste REAL MISS -> HIT no seu Mac (ou qualquer máquina com acesso à Cloudflare).
#
#   bash scripts/real-test.sh            # roda local (wrangler dev) contra o AI Gateway real
#   bash scripts/real-test.sh --deploy   # também grava os segredos, publica e testa a URL pública
#   bash scripts/real-test.sh --expiry   # inclui o teste de expiração (≈70 s, chave descartável)
#
# O token é lido sem eco e só vai para .dev.vars (chmod 600, ignorado pelo git)
# e para `wrangler secret put` via stdin. Nunca é impresso.
set -euo pipefail
cd "$(dirname "$0")/.."

DEPLOY=0
EXTRA=()
for a in "$@"; do
  case "$a" in
    --deploy) DEPLOY=1 ;;
    --expiry) EXTRA+=("--expiry") ;;
  esac
done

[ -d node_modules ] || npm ci

if ! npx wrangler whoami --json >/dev/null 2>&1; then
  echo "Faça login na Cloudflare (abre o navegador)..."
  npx wrangler login
fi

if [ -z "${CLOUDFLARE_ACCOUNT_ID:-}" ]; then
  CLOUDFLARE_ACCOUNT_ID="$(npx wrangler whoami --json | node -e '
    let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{const a=JSON.parse(s).accounts||[];
    if(a.length!==1){console.error("Contas encontradas: "+a.map(x=>x.name+" ("+x.id+")").join(", ")+
    ". Rode de novo com CLOUDFLARE_ACCOUNT_ID=<id> na frente.");process.exit(1)}
    console.error("Conta: "+a[0].name);console.log(a[0].id)})')"
fi
export CLOUDFLARE_ACCOUNT_ID

if [ -z "${CF_GATEWAY_TOKEN:-}" ]; then
  echo "Cole o token da API (Workers AI: Read + AI Gateway: Read + AI Gateway: Edit)."
  echo "Ele não aparece na tela. Crie em https://dash.cloudflare.com/profile/api-tokens"
  read -r -s -p "Token: " CF_GATEWAY_TOKEN
  echo
fi
export CF_GATEWAY_TOKEN

case "$CF_GATEWAY_TOKEN" in
  cfk_*)
    echo "Isso é a Global API Key (prefixo cfk_), não um API token. Ela não funciona aqui e dá acesso total à conta."
    echo "Crie um API token (prefixo cfut_ ou cfat_) em https://dash.cloudflare.com/profile/api-tokens"
    exit 1
    ;;
  *" "* | "")
    echo "O valor colado não parece um token (está vazio ou tem espaços). Copie só o token e rode de novo."
    exit 1
    ;;
  cfut_* | cfat_*) ;;
  *)
    echo "Aviso: o valor não começa com cfut_ ou cfat_. Tentando mesmo assim..."
    ;;
esac

umask 077
printf 'CLOUDFLARE_ACCOUNT_ID=%s\nCLOUDFLARE_API_TOKEN=%s\n' "$CLOUDFLARE_ACCOUNT_ID" "$CF_GATEWAY_TOKEN" > .dev.vars

echo
echo "== Teste local (wrangler dev -> AI Gateway real) =="
npx wrangler dev --port 8787 > .wrangler-dev.log 2>&1 &
DEV_PID=$!
trap 'kill $DEV_PID 2>/dev/null || true' EXIT
for _ in $(seq 1 40); do
  curl -s -o /dev/null http://localhost:8787/ 2>/dev/null && break
  sleep 1
done
node scripts/verify-cache.mjs http://localhost:8787 --allow-warm ${EXTRA[@]+"${EXTRA[@]}"} || LOCAL_FAIL=1
kill $DEV_PID 2>/dev/null || true

if [ "$DEPLOY" = "1" ] && [ -n "${LOCAL_FAIL:-}" ]; then
  echo
  echo "Deploy pulado: o teste local falhou. Veja o motivo em .wrangler-dev.log (evento faq_failed)."
elif [ "$DEPLOY" = "1" ]; then
  echo
  echo "== Deploy (Workers, sem recursos pagos) =="
  npx wrangler deploy --env="" | tee .wrangler-deploy.log
  # Cada `secret put` publica uma nova versão com o segredo.
  printf '%s' "$CLOUDFLARE_ACCOUNT_ID" | npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env=""
  printf '%s' "$CF_GATEWAY_TOKEN" | npx wrangler secret put CLOUDFLARE_API_TOKEN --env=""
  URL="$(grep -Eo 'https://[a-zA-Z0-9.-]+\.workers\.dev' .wrangler-deploy.log | head -1)"
  echo "URL pública: $URL/faq/refund"
  # A chave faq:refund:v1 já foi aquecida pelo teste local, então aqui o esperado é HIT/HIT.
  node scripts/verify-cache.mjs "$URL" --warm || true
fi

[ -z "${LOCAL_FAIL:-}" ] || exit 1
