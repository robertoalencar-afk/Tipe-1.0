#!/usr/bin/env node
// Aplica os e-mails de autenticação da Tipe no Supabase pela Management API.
// Precisa de SUPABASE_ACCESS_TOKEN (token pessoal: supabase.com/dashboard/account/tokens).
// Sem o token, avisa e sai sem erro (a publicação do site segue normal).
// Com RESEND_API_KEY, também liga o SMTP do Resend (remetente noreply@tipe.digital).
import { readFileSync } from "node:fs";

const token = process.env.SUPABASE_ACCESS_TOKEN;
const ref = process.env.SUPABASE_PROJECT_REF || "bnggnbwmihqexvihrqvy";
const resend = process.env.RESEND_API_KEY;
const dir = new URL("../../supabase/templates/", import.meta.url);

if (!token) {
  console.log("::warning::SUPABASE_ACCESS_TOKEN não configurado: e-mails do Supabase não foram atualizados.");
  process.exit(0);
}

const manifesto = JSON.parse(readFileSync(new URL("auth-emails.json", dir), "utf8"));
const html = (a) => readFileSync(new URL(a, dir), "utf8");

const principal = {};
const extras = {
  mailer_otp_exp: 3600,
  password_min_length: 10,
  password_required_characters: "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ:0123456789",
};
const avisos = {};
for (const e of manifesto) {
  const alvo = e.notificacao ? avisos : principal;
  alvo[`mailer_subjects_${e.chave}`] = e.assunto;
  alvo[`mailer_templates_${e.chave}_content`] = html(e.arquivo);
  if (e.notificacao) alvo[`mailer_notifications_${e.chave.replace(/_notification$/, "")}_enabled`] = true;
}

const api = `https://api.supabase.com/v1/projects/${ref}/config/auth`;
const headers = { Authorization: `Bearer ${token}`, "Content-Type": "application/json" };

// Mantém as URLs já cadastradas e garante as do site.
const atual = await fetch(api, { headers });
if (!atual.ok) {
  console.error(`::error::Supabase recusou a leitura da config (${atual.status}): ${await atual.text()}`);
  process.exit(1);
}
const cfg = await atual.json();
const urls = new Set(String(cfg.uri_allow_list || "").split(",").map((u) => u.trim()).filter(Boolean));
["https://tipe.digital/**", "https://www.tipe.digital/**", "https://tipe.robertoalencar.workers.dev/**"].forEach((u) => urls.add(u));
principal.uri_allow_list = [...urls].join(",");

// Só liga o Resend se o domínio tipe.digital já estiver verificado lá; senão os e-mails parariam de sair.
let resendOk = false;
if (resend) {
  // Chave só de envio (recomendada) não pode listar domínios: aí vale RESEND_DOMINIO_VERIFICADO=1, conferido no painel.
  const r = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${resend}` } }).catch(() => null);
  const d = r?.ok ? await r.json() : null;
  resendOk = !!d?.data?.some((x) => x.name === "tipe.digital" && x.status === "verified") || (r?.status === 401 && process.env.RESEND_DOMINIO_VERIFICADO === "1");
  if (!resendOk) console.log("::warning::Domínio tipe.digital ainda não verificado no Resend: SMTP não alterado.");
}
if (resendOk) {
  Object.assign(principal, {
    smtp_host: "smtp.resend.com", smtp_port: "465", smtp_user: "resend", smtp_pass: resend,
    smtp_admin_email: "noreply@tipe.digital", smtp_sender_name: "Tipe",
  });
  if ((cfg.rate_limit_email_sent ?? 0) < 30) principal.rate_limit_email_sent = 30;
}

async function enviar(nome, corpo) {
  const r = await fetch(api, { method: "PATCH", headers, body: JSON.stringify(corpo) });
  if (!r.ok) throw new Error(`${nome}: ${r.status} ${await r.text()}`);
  console.log(`✓ ${nome}: ${Object.keys(corpo).filter((k) => k.endsWith("_content")).length} modelos`);
}

await enviar("e-mails de conta", principal);
// Opcionais: dependem da versão do Auth; não derrubam a publicação.
for (const [nome, corpo] of [["avisos de segurança", avisos], ["validade e regra de senha", extras]]) {
  try { await enviar(nome, corpo); } catch (e) { console.log(`::warning::${nome} não aplicado (${e.message}). Veja docs/deploy/emails-supabase.md`); }
}
if (resendOk) console.log("✓ SMTP do Resend ligado (noreply@tipe.digital)");
else if (!resend) console.log("::warning::RESEND_API_KEY ausente: e-mails seguem pelo servidor padrão do Supabase (limite baixo).");
