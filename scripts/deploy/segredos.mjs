// Monta o JSON de segredos do Worker a partir das variáveis de ambiente presentes
// (no GitHub Actions elas vêm dos segredos do ambiente "producao").
//   node scripts/deploy/segredos.mjs app  | wrangler secret bulk
//   node scripts/deploy/segredos.mjs cron | wrangler secret bulk --config cron-worker/wrangler.jsonc
const LISTAS = {
  app: [
    "SUPABASE_URL", "SUPABASE_PUBLISHABLE_KEY", "SUPABASE_SERVICE_ROLE_KEY",
    "ANTHROPIC_API_KEY", "ANTHROPIC_MODEL", "RESEND_API_KEY", "EMAIL_FROM",
    "CRON_SECRET", "TIPE_ENCRYPTION_KEY",
    "PAGARME_SECRET_KEY", "PAGARME_PUBLIC_KEY", "PAGARME_WEBHOOK_SECRET", "PAGARME_TIPE_RECIPIENT_ID", "TIPE_PLATFORM_FEE_PERCENT",
    "CLOUDFLARE_ACCOUNT_ID", "CLOUDFLARE_AI_TOKEN", "GOOGLE_PAY_MERCHANT_ID",
    "CLOUDFLARE_AI_MODEL", "CLOUDFLARE_AI_DAILY_LIMIT",
    "GROQ_API_KEY", "GROQ_MODEL", "GROQ_VISION_MODEL", "LEBRE_CLAUDE_FALLBACK",
  ],
  cron: ["CRON_SECRET"],
};
const nomes = LISTAS[process.argv[2]];
if (!nomes) { console.error("uso: segredos.mjs app|cron"); process.exit(1); }
const out = Object.fromEntries(nomes.filter((n) => process.env[n]).map((n) => [n, process.env[n]]));
console.error(`segredos enviados: ${Object.keys(out).join(", ") || "nenhum"}`);
process.stdout.write(JSON.stringify(out));
