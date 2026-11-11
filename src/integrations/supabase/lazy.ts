/**
 * Carrega o cliente Supabase sob demanda.
 *
 * O supabase-js pesa ~200 KB (sem gzip). A landing, as páginas públicas e a conta da
 * mesa do cliente não precisam dele para aparecer, então ele sai do pacote inicial e
 * só é baixado quando alguém realmente usa autenticação ou dados do Supabase.
 */
type Cliente = (typeof import("./client"))["supabase"];

let carregando: Promise<Cliente> | undefined;

export function carregarSupabase(): Promise<Cliente> {
  carregando ??= import("./client").then((m) => m.supabase);
  return carregando;
}

/** Evento disparado por client.ts quando o cliente é criado pela primeira vez. */
export const EVENTO_SUPABASE_PRONTO = "tipe:supabase-pronto";

/** Há sessão salva neste navegador? (chave padrão do supabase-js: sb-<ref>-auth-token) */
export function temSessaoSalva(): boolean {
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("sb-") && k.endsWith("-auth-token")) return true;
    }
  } catch {
    // Armazenamento bloqueado: trata como sem sessão.
  }
  return false;
}

/**
 * Usuário da sessão local para proteger telas no navegador (rotas com ssr: false).
 * Lê a sessão salva (sem ida à rede) para a troca de tela ser imediata; quem decide o
 * acesso aos dados continua sendo o servidor, que valida o token em cada chamada. Se o
 * token tiver sido revogado, o refresh falha, o supabase-js emite SIGNED_OUT e o
 * __root revalida as rotas, levando de volta ao login.
 */
export async function usuarioDaSessao() {
  if (!temSessaoSalva()) return null;
  const supabase = await carregarSupabase();
  const { data } = await supabase.auth.getSession();
  return data.session?.user ?? null;
}

export async function exigirSessao(): Promise<boolean> {
  return (await usuarioDaSessao()) != null;
}
