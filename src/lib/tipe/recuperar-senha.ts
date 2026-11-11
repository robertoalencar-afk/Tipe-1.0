// Regras do fluxo "esqueci a senha" usadas no navegador e no servidor (sem dependências).

/** Validade do link mandado por e-mail. Precisa bater com Authentication → Email → "Email OTP Expiration". */
export const LINK_VALIDADE_MIN = 60;
/** Espera entre dois pedidos de link na mesma tela (o Supabase também recusa antes de 60 s). */
export const REENVIO_ESPERA_S = 60;

const ORIGENS = [
  /^https:\/\/([a-z0-9-]+\.)*tipe\.digital$/,
  /^https:\/\/([a-z0-9-]+\.)*robertoalencar\.workers\.dev$/,
  /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/,
];

/** Só devolve origens da própria Tipe; qualquer outra cai no domínio oficial (evita link para site de terceiros). */
export function origemConfiavel(
  origem: string | null | undefined,
  padrao = "https://tipe.digital",
): string {
  const o = (origem ?? "").trim().replace(/\/+$/, "");
  return ORIGENS.some((r) => r.test(o)) ? o : padrao;
}

export function normalizarEmail(email: string): string {
  return email.trim().toLowerCase();
}

export type ProblemaLink = "expirado" | "invalido";

/**
 * Lê o erro que o Supabase devolve no endereço quando o link não serve mais
 * (`#error=access_denied&error_code=otp_expired&error_description=...`, em inglês).
 */
export function problemaNoLink(search: string, hash: string): ProblemaLink | null {
  const ler = (s: string) => new URLSearchParams(s.replace(/^[#?]/, ""));
  for (const p of [ler(hash), ler(search)]) {
    const codigo = (p.get("error_code") ?? "").toLowerCase();
    const erro = (p.get("error") ?? "").toLowerCase();
    if (!codigo && !erro) continue;
    return codigo.includes("expired") ? "expirado" : "invalido";
  }
  return null;
}

/** Atalho para a caixa de entrada dos provedores mais comuns no Brasil. */
export function caixaDeEntrada(email: string): { nome: string; url: string } | null {
  const dominio = normalizarEmail(email).split("@")[1] ?? "";
  if (["gmail.com", "googlemail.com"].includes(dominio))
    return { nome: "Gmail", url: "https://mail.google.com/mail/u/0/#search/from%3Atipe.digital" };
  if (/^(outlook|hotmail|live|msn)\.com(\.br)?$/.test(dominio))
    return { nome: "Outlook", url: "https://outlook.live.com/mail/0/" };
  if (/^(yahoo|ymail)\.com(\.br)?$/.test(dominio))
    return { nome: "Yahoo Mail", url: "https://mail.yahoo.com/" };
  if (dominio === "icloud.com" || dominio === "me.com")
    return { nome: "iCloud Mail", url: "https://www.icloud.com/mail" };
  if (/^(uol|bol)\.com\.br$/.test(dominio))
    return { nome: "UOL Mail", url: "https://email.uol.com.br/" };
  return null;
}

/** Mostra o e-mail sem expor tudo na tela (ex.: ro•••@gmail.com). */
export function mascararEmail(email: string): string {
  const [u = "", d = ""] = normalizarEmail(email).split("@");
  if (!d) return email;
  return `${u.slice(0, Math.min(2, u.length))}${"•".repeat(Math.max(3, Math.min(6, u.length - 2)))}@${d}`;
}
