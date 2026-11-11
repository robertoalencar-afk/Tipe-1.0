#!/usr/bin/env node
// Gera os e-mails de autenticação da Tipe (Supabase Auth) num só visual.
// Uso: node scripts/emails/gerar-emails-auth.mjs  → escreve supabase/templates/*.html e auth-emails.json
// Variáveis {{ .X }} são do Supabase (Go templates); não traduza.
import { writeFileSync, mkdirSync } from "node:fs";

const SITE = "https://tipe.digital";
const IMG = `${SITE}/email`;
const FONT = "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";
const s = (t) => `<strong style="color:#071727;">${t}</strong>`;

function botao(href, texto) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="border-radius:999px;background:#10d1b4;">
            <a href="${href}" target="_blank" style="display:block;padding:16px 24px;font-size:16px;font-weight:600;color:#071727;text-decoration:none;border-radius:999px;">${texto}</a>
          </td></tr></table>`;
}
function codigo(t) {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%"><tr><td align="center" style="border-radius:16px;background:#f3f4f6;padding:18px 12px;font-size:32px;font-weight:700;letter-spacing:8px;color:#071727;font-family:'SFMono-Regular',Menlo,Consolas,monospace;">${t}</td></tr></table>`;
}
const p = (t, cor = "#575b5f", tam = 16, mb = 24) =>
  `<p style="margin:0 0 ${mb}px;font-size:${tam}px;line-height:1.6;color:${cor};">${t}</p>`;

function layout({ titulo, previa, lebre, fundo, alt, h1, corpo, aviso, avisoFundo = "#f3f4f6", rodape }) {
  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${titulo}</title>
</head>
<body style="margin:0;padding:0;background:#ffffff;-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${previa}&#8199;&#847;&#8199;&#847;&#8199;&#847;&#8199;&#847;</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#ffffff;">
<tr><td align="center" style="padding:32px 16px;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px;">
    <tr><td align="center" style="padding:0 0 20px;">
      <img src="${IMG}/tipe-logo-email.png" width="108" alt="Tipe" style="display:block;width:108px;height:auto;border:0;">
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid #e5e7eb;border-radius:24px;overflow:hidden;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
        <tr><td align="center" style="background:${fundo};padding:28px 24px 0;border-radius:24px 24px 0 0;">
          <img src="${IMG}/${lebre}.png" width="150" alt="${alt}" style="display:block;width:150px;height:auto;border:0;">
        </td></tr>
        <tr><td style="padding:32px 36px 8px;font-family:${FONT};color:#071727;">
          <h1 style="margin:0 0 12px;font-size:26px;line-height:1.2;font-weight:600;letter-spacing:-0.5px;">${h1}</h1>
          ${corpo}
        </td></tr>
        <tr><td style="padding:24px 36px 32px;font-family:${FONT};">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${avisoFundo};border-radius:16px;">
            <tr><td style="padding:16px 18px;font-size:14px;line-height:1.55;color:#575b5f;">${aviso}</td></tr>
          </table>
        </td></tr>
      </table>
    </td></tr>
    <tr><td align="center" style="padding:24px 16px 0;font-family:${FONT};font-size:12px;line-height:1.6;color:#8a8f96;">
      Tipe · pagamentos e atendimento para restaurantes<br>
      ${rodape}<br>
      Dúvidas? <a href="mailto:contato@tipe.digital" style="color:#8a8f96;">contato@tipe.digital</a>
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>
`;
}

const naoFoiVoce = `${s("Não foi você?")} Pode ignorar este e-mail, nada muda na sua conta. A Tipe nunca pede sua senha por e-mail, WhatsApp ou telefone.`;
const alerta = `${s("Não foi você?")} <a href="${SITE}/esqueci-a-senha" style="color:#007567;font-weight:600;">Troque a senha agora</a> e fale com a gente em contato@tipe.digital. A Tipe nunca pede sua senha.`;
const validade = (t) => p(`&#9201;&#65039; ${t}`, "#575b5f", 14, 0).replace("margin:0 0 0px", "margin:20px 0 0");

// chave = nome do campo no Supabase (mailer_templates_<chave>_content / mailer_subjects_<chave>)
const EMAILS = [
  {
    chave: "confirmation", arquivo: "confirmar-cadastro", painel: "Confirm signup",
    assunto: "Falta um toque para abrir a casa na Tipe",
    previa: "Confirme seu e-mail e a Tipe já começa a trabalhar pro seu restaurante.",
    lebre: "lebre-feliz", fundo: "#d3f8ee", alt: "A lebre da Tipe, animada",
    h1: "Bem-vindo à Tipe! Só falta um toque.",
    corpo: p(`Sua conta ${s("{{ .Email }}")} está quase pronta. Confirme o e-mail e a gente já arruma a mesa pra você:`) +
      botao("{{ .ConfirmationURL }}", "Confirmar meu e-mail") +
      validade(`O link vale por ${s("1 hora")}. Depois disso, é só pedir outro na tela de entrar.`),
    aviso: `${s("Não criou conta?")} Ignore este e-mail. Sem a confirmação, ninguém usa este endereço na Tipe.`,
    rodape: "Você recebeu este e-mail porque alguém criou uma conta na Tipe com este endereço.",
  },
  {
    chave: "invite", arquivo: "convite", painel: "Invite user",
    assunto: "Você entrou para a equipe! Seu acesso à Tipe chegou",
    previa: "Crie sua senha e comece a atender, receber gorjetas e acompanhar suas mesas pela Tipe.",
    lebre: "lebre-feliz", fundo: "#071727", alt: "A lebre da Tipe, dando boas-vindas",
    h1: "{{ if .Data.name }}{{ .Data.name }}, bem-vindo{{ else }}Bem-vindo{{ end }} à equipe!",
    corpo: p(`O restaurante liberou seu acesso à Tipe com o e-mail ${s("{{ .Email }}")}. Por lá você acompanha suas mesas, recebe chamados dos clientes e vê suas gorjetas caindo. Bora?`) +
      botao("{{ .ConfirmationURL }}", "Criar minha senha") +
      validade(`O convite funciona ${s("uma vez só")}. Venceu? Peça um novo ao gerente.`),
    aviso: `${s("Não conhece esse restaurante?")} Ignore este e-mail: sem criar a senha, o acesso não é ativado. A Tipe nunca pede sua senha.`,
    avisoFundo: "#fff4e8",
    rodape: "Você recebeu este e-mail porque um restaurante cadastrou você na equipe da Tipe.",
  },
  {
    chave: "magic_link", arquivo: "link-magico", painel: "Magic link",
    assunto: "Seu atalho para entrar na Tipe",
    previa: "Um toque e você já está dentro. Sem senha, sem fila.",
    lebre: "lebre-feliz", fundo: "#d3f8ee", alt: "A lebre da Tipe, apressada",
    h1: "Entrada expressa, sem fila",
    corpo: p(`Pediram um link de acesso para ${s("{{ .Email }}")}. Toque no botão e pronto, você está dentro:`) +
      botao("{{ .ConfirmationURL }}", "Entrar na Tipe") +
      validade(`O link vale por ${s("1 hora")} e funciona ${s("uma vez só")}.`),
    aviso: naoFoiVoce,
    rodape: "Você recebeu este e-mail porque alguém pediu um link de acesso para este endereço.",
  },
  {
    chave: "email_change", arquivo: "trocar-email", painel: "Change email address",
    assunto: "Confirme seu e-mail novo na Tipe",
    previa: "Falta só confirmar para a Tipe passar a usar este endereço.",
    lebre: "lebre-pensando", fundo: "#d3f8ee", alt: "A lebre da Tipe, conferindo",
    h1: "Endereço novo? A gente confere.",
    corpo: p(`Pediram para trocar o e-mail da conta de ${s("{{ .Email }}")} para ${s("{{ .NewEmail }}")}. Se foi você, é só confirmar:`) +
      botao("{{ .ConfirmationURL }}", "Confirmar e-mail novo") +
      validade(`O link vale por ${s("1 hora")}. Até confirmar, o e-mail antigo continua valendo.`),
    aviso: `${s("Não pediu a troca?")} Ignore este e-mail e <a href="${SITE}/esqueci-a-senha" style="color:#007567;font-weight:600;">troque sua senha</a> por garantia.`,
    rodape: "Você recebeu este e-mail porque pediram uma troca de endereço na sua conta Tipe.",
  },
  {
    chave: "reauthentication", arquivo: "reautenticacao", painel: "Reauthentication",
    assunto: "Seu código de segurança da Tipe: {{ .Token }}",
    previa: "Use este código para confirmar que é você mesmo.",
    lebre: "lebre-pensando", fundo: "#d3f8ee", alt: "A lebre da Tipe, de olho na segurança",
    h1: "É você mesmo? Prova rápida.",
    corpo: p("Antes de uma ação sensível na conta, a Tipe pede este código. Digite na tela que está aberta:") +
      codigo("{{ .Token }}") +
      validade(`O código vale por poucos minutos. Não compartilhe com ninguém, nem com quem diz ser da Tipe.`),
    aviso: naoFoiVoce,
    rodape: "Você recebeu este e-mail porque uma ação na sua conta Tipe pediu confirmação.",
  },
  {
    chave: "recovery", arquivo: "recuperar-senha", painel: "Reset password",
    assunto: "Sua nova senha da Tipe",
    previa: "Toque no botão para criar uma senha nova. O link vale por 1 hora e funciona uma vez só.",
    lebre: "lebre-pensando", fundo: "#d3f8ee", alt: "A lebre da Tipe, pensativa",
    h1: "Esqueceu a senha? Acontece!",
    corpo: p(`Até a lebre mais rápida esquece as coisas. Recebemos um pedido de senha nova para ${s("{{ .Email }}")}. É só tocar no botão:`) +
      botao("{{ .RedirectTo }}?token_hash={{ .TokenHash }}&type=recovery", "Criar nova senha") +
      validade(`O link vale por ${s("1 hora")} e funciona ${s("uma vez só")}. Se pedir outro, use sempre o e-mail mais recente.`),
    aviso: `${s("Não foi você?")} Pode ignorar este e-mail: sua senha continua a mesma e ninguém entra na sua conta sem este link. A Tipe nunca pede sua senha por e-mail, WhatsApp ou telefone.`,
    rodape: "Você recebeu este e-mail porque alguém pediu para redefinir a senha deste endereço na Tipe.",
  },
  // Avisos de segurança (Authentication → Emails → Security notifications)
  {
    chave: "password_changed_notification", aviso_seg: true, arquivo: "senha-alterada", painel: "Password changed",
    assunto: "Sua senha da Tipe foi alterada",
    previa: "Senha nova salva. Se não foi você, aja agora.",
    lebre: "lebre-feliz", fundo: "#071727", alt: "A lebre da Tipe, sorrindo",
    h1: "Senha nova, tudo certo!",
    corpo: p(`A senha da conta ${s("{{ .Email }}")} acabou de ser alterada. Por segurança, as sessões abertas em outros aparelhos foram encerradas.`, "#575b5f", 16, 0),
    aviso: alerta, avisoFundo: "#fff4e8",
    rodape: "Aviso automático de segurança da sua conta Tipe.",
  },
  {
    chave: "email_changed_notification", aviso_seg: true, arquivo: "email-alterado", painel: "Email address changed",
    assunto: "O e-mail da sua conta Tipe mudou",
    previa: "Sua conta agora usa outro endereço de e-mail.",
    lebre: "lebre-pensando", fundo: "#071727", alt: "A lebre da Tipe, atenta",
    h1: "Endereço trocado com sucesso",
    corpo: p(`A conta que usava ${s("{{ .OldEmail }}")} agora entra com ${s("{{ .Email }}")}. A partir de agora, os avisos da Tipe vão para o endereço novo.`, "#575b5f", 16, 0),
    aviso: alerta, avisoFundo: "#fff4e8",
    rodape: "Aviso automático de segurança da sua conta Tipe.",
  },
  {
    chave: "mfa_factor_enrolled_notification", aviso_seg: true, arquivo: "2fa-ativado", painel: "MFA method added",
    assunto: "Verificação em duas etapas ativada na Tipe",
    previa: "Sua conta ganhou uma camada extra de proteção.",
    lebre: "lebre-feliz", fundo: "#071727", alt: "A lebre da Tipe, comemorando",
    h1: "Cadeado extra instalado!",
    corpo: p(`A conta ${s("{{ .Email }}")} agora pede um código do aplicativo autenticador ao entrar. Mais difícil para curiosos, igual de fácil para você.`, "#575b5f", 16, 0),
    aviso: alerta, avisoFundo: "#fff4e8",
    rodape: "Aviso automático de segurança da sua conta Tipe.",
  },
  {
    chave: "mfa_factor_unenrolled_notification", aviso_seg: true, arquivo: "2fa-removido", painel: "MFA method removed",
    assunto: "Verificação em duas etapas removida na Tipe",
    previa: "Um método de verificação foi tirado da sua conta.",
    lebre: "lebre-pensando", fundo: "#071727", alt: "A lebre da Tipe, preocupada",
    h1: "Um cadeado saiu da porta",
    corpo: p(`Um método de verificação em duas etapas foi removido da conta ${s("{{ .Email }}")}. Recomendamos ativar de novo em Segurança da conta.`, "#575b5f", 16, 0),
    aviso: alerta, avisoFundo: "#fff4e8",
    rodape: "Aviso automático de segurança da sua conta Tipe.",
  },
];

const dir = new URL("../../supabase/templates/", import.meta.url);
mkdirSync(dir, { recursive: true });
const manifesto = [];
for (const e of EMAILS) {
  writeFileSync(new URL(`${e.arquivo}.html`, dir), layout({ ...e, titulo: e.assunto.replace("{{ .Token }}", "").replace(/: $/, "") }));
  manifesto.push({ chave: e.chave, arquivo: `${e.arquivo}.html`, assunto: e.assunto, painel: e.painel, notificacao: !!e.aviso_seg });
}
writeFileSync(new URL("auth-emails.json", dir), JSON.stringify(manifesto, null, 2) + "\n");
console.log(`${EMAILS.length} e-mails gerados em supabase/templates/`);
