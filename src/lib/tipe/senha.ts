// Política de senha da Tipe. A mesma regra vale no cadastro do restaurante, na conta da
// equipe e na troca de senha; o Supabase Auth repete o mínimo no servidor
// (ver docs/seguranca/README.md, "Configurar o Supabase Auth").

export const SENHA_MIN = 10;
export const SENHA_MAX = 72; // limite do bcrypt usado pelo Supabase Auth

// Senhas mais usadas no Brasil e no mundo (listas públicas de vazamentos), já normalizadas.
const COMUNS = new Set([
  "1234567890", "0123456789", "12345678910", "123456789a", "a123456789", "qwertyuiop",
  "senha12345", "senha123456", "senhasenha", "mudar12345", "mudar123456", "trocar1234",
  "brasil1234", "brasil12345", "flamengo12", "corinthians", "palmeiras1", "saopaulo12",
  "password12", "password123", "password1234", "iloveyou12", "abcdefghij", "abc1234567",
  "1q2w3e4r5t", "1qaz2wsx3edc", "qwerty1234", "qwerty12345", "asdfghjkl1", "zaq12wsxcde",
  "tipe123456", "tipe12345678", "restaurante", "restaurante1", "restaurante123", "garcom1234",
  "admin12345", "admin123456", "administrador", "welcome123", "bemvindo123", "11111111111",
]);

export type AvaliacaoSenha = {
  ok: boolean;
  /** 0 (muito fraca) a 4 (forte). */
  forca: 0 | 1 | 2 | 3 | 4;
  /** Requisitos que faltam, em frases curtas para mostrar ao usuário. */
  faltam: string[];
};

function normalizar(s: string) {
  return s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

function sequenciaOuRepeticao(s: string) {
  if (/^(.)\1+$/.test(s)) return true;
  const seq = "abcdefghijklmnopqrstuvwxyz0123456789";
  const inv = [...seq].reverse().join("");
  const n = normalizar(s);
  return n.length >= 6 && (seq.includes(n) || inv.includes(n));
}

/** Avalia a senha contra a política. `contexto` evita senha igual ao e-mail, nome ou restaurante. */
export function avaliarSenha(senha: string, contexto: { email?: string; nomes?: string[] } = {}): AvaliacaoSenha {
  const faltam: string[] = [];
  if (senha.length < SENHA_MIN) faltam.push(`Use pelo menos ${SENHA_MIN} caracteres`);
  if (senha.length > SENHA_MAX) faltam.push(`Use no máximo ${SENHA_MAX} caracteres`);
  if (!/\p{L}/u.test(senha)) faltam.push("Inclua letras");
  if (!/\d/.test(senha)) faltam.push("Inclua números");

  const n = normalizar(senha);
  if (COMUNS.has(n) || sequenciaOuRepeticao(senha)) faltam.push("Evite senhas comuns ou sequências");
  const partes = [
    ...(contexto.email ? [contexto.email.split("@")[0] ?? ""] : []),
    ...(contexto.nomes ?? []).flatMap((x) => x.split(/\s+/)),
  ]
    .map(normalizar)
    .filter((p) => p.length >= 4);
  if (partes.some((p) => n.includes(p))) faltam.push("Não use seu nome ou e-mail na senha");

  let pontos = 0;
  if (senha.length >= SENHA_MIN) pontos++;
  if (senha.length >= 14) pontos++;
  if (/[a-z]/.test(senha) && /[A-Z]/.test(senha)) pontos++;
  if (/[^\p{L}\d]/u.test(senha)) pontos++;
  const ok = faltam.length === 0;
  const forca = (ok ? Math.max(1, Math.min(4, pontos)) : Math.min(1, pontos)) as AvaliacaoSenha["forca"];
  return { ok, forca, faltam };
}

export const ROTULO_FORCA = ["Muito fraca", "Fraca", "Razoável", "Boa", "Forte"] as const;

/** Traduz erros do Supabase Auth ligados à senha. */
export function mensagemErroSenha(message: string): string | null {
  const m = message.toLowerCase();
  if (m.includes("pwned") || m.includes("leaked") || m.includes("compromised"))
    return "Essa senha apareceu em vazamentos conhecidos. Escolha outra.";
  if (m.includes("weak") || m.includes("password should") || m.includes("characters"))
    return `Senha fraca. Use pelo menos ${SENHA_MIN} caracteres com letras e números.`;
  if (m.includes("same") && m.includes("password")) return "A nova senha precisa ser diferente da atual.";
  if (m.includes("reauthentication")) return "Por segurança, entre de novo antes de trocar a senha.";
  return null;
}
