#!/usr/bin/env bash
# Executar no Mac: bash scripts/deploy/configurar-github.sh
# Segredos nunca ficam no repositorio, argumentos de terminal ou chat.
set +x
set -euo pipefail
REPO="robertoalencar-afk/Tipe-1.0"
ENVIRONMENT="producao"

if ! command -v gh >/dev/null 2>&1; then
  echo "Instale GitHub CLI: brew install gh"
  exit 1
fi
if ! gh auth status >/dev/null 2>&1; then
  echo "Autentique pelo navegador com: gh auth login"
  exit 1
fi
if ! gh api "repos/$REPO/environments/$ENVIRONMENT" >/dev/null 2>&1; then
  echo "Criando ambiente GitHub: $ENVIRONMENT"
  gh api -X PUT "repos/$REPO/environments/$ENVIRONMENT" >/dev/null
fi

echo "Configurando dados PUBLICOS do Supabase tipe-production..."
gh variable set VITE_SUPABASE_URL --repo "$REPO" --body "https://bnggnbwmihqexvihrqvy.supabase.co"
gh variable set VITE_SUPABASE_PROJECT_ID --repo "$REPO" --body "bnggnbwmihqexvihrqvy"
gh variable set VITE_SUPABASE_PUBLISHABLE_KEY --repo "$REPO" --body "sb_publishable_VBd0grDcguwpR_gyqa2nEw_kW40dW4s"

existing_env="$(gh secret list --repo "$REPO" --env "$ENVIRONMENT" 2>/dev/null | awk '{print $1}' || true)"
existing_repo="$(gh secret list --repo "$REPO" 2>/dev/null | awk '{print $1}' || true)"

has_secret() {
  printf '%s\n%s\n' "$existing_env" "$existing_repo" | grep -qxF "$1"
}
save_secret() {
  local name="$1" value=""
  if has_secret "$name"; then
    echo "OK: $name ja cadastrado (nao foi substituido)"
    return
  fi
  # Reaproveita uma variavel existente no computador, se houver.
  value="$(printenv "$name" 2>/dev/null || true)"
  if [[ -z "$value" ]]; then
    if [[ "$name" == "CRON_SECRET" || "$name" == "TIPE_ENCRYPTION_KEY" ]]; then
      value="$(openssl rand -hex 32)"
      echo "Gerando $name. Nao altere a chave de criptografia depois de cadastrar dados reais."
    else
      echo "Falta $name. Cole o valor existente (entrada oculta)."
      case "$name" in
        CLOUDFLARE_API_TOKEN) echo "Use seu token Workers anterior se guardou uma copia." ;;
        DATABASE_URL) echo "Supabase > Connect > Session pooler (URI completa com senha codificada)." ;;
        SUPABASE_SERVICE_ROLE_KEY) echo "Supabase > Settings > API Keys > chave secreta de servidor." ;;
        ANTHROPIC_API_KEY) echo "Anthropic Console > API Keys." ;;
        RESEND_API_KEY) echo "Resend > API Keys." ;;
        CLOUDFLARE_ACCOUNT_ID) echo "Cloudflare > Workers & Pages > Account ID." ;;
      esac
      if [[ ! -t 0 ]]; then
        echo "Rode no Terminal: entrada interativa segura necessaria para $name."
        exit 1
      fi
      IFS= read -r -s -p "$name: " value
      printf '\n'
    fi
  fi
  if [[ -z "$value" ]]; then echo "Valor vazio: $name. Interrompido."; exit 1; fi
  printf '%s' "$value" | gh secret set "$name" --repo "$REPO" --env "$ENVIRONMENT"
  unset value
  echo "OK: $name cadastrado no ambiente protegido."
  existing_env="$existing_env"$'\n'"$name"
}

for name in DATABASE_URL SUPABASE_SERVICE_ROLE_KEY CLOUDFLARE_ACCOUNT_ID CLOUDFLARE_API_TOKEN ANTHROPIC_API_KEY RESEND_API_KEY CRON_SECRET TIPE_ENCRYPTION_KEY; do
  save_secret "$name"
done

echo ""
echo "Credenciais basicas cadastradas. TIPE_PRODUCTION_READY continua desativado."
echo "Nao houve publicacao. Ainda faltam testes de autenticacao, e-mail e pagamentos."
