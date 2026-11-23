// Saneia erros de funções do servidor antes de irem ao navegador.
// Mensagens de regra de negócio (escritas por nós, em português) passam como estão;
// detalhes internos de banco/PostgREST/Node viram uma mensagem genérica e ficam só no log.
const INTERNO = [
  /\b(relation|column|table|schema|function|operator|constraint|index)\b .*(does not exist|violates|already exists)/i,
  /duplicate key value|violates (foreign key|check|not-null|unique|row-level security)/i,
  /permission denied for/i,
  /invalid input syntax|syntax error at or near/i,
  /\bPGRST\d+|JWT|jwt|PostgREST|supabase/i,
  /could not find the .* in the schema cache/i,
  /\bat [\w$.<>]+ \(|node:internal|\/workers?\/|\.mjs:|\.ts:\d+/,
  /ECONNREFUSED|ETIMEDOUT|fetch failed|ENOTFOUND/i,
];

export const MENSAGEM_GENERICA = "Não foi possível concluir agora. Tente de novo em instantes.";

export function mensagemInterna(msg: string): boolean {
  return INTERNO.some((r) => r.test(msg));
}

/** Devolve o erro que pode ir ao cliente (o original, se for seguro). */
export function erroPublico(e: unknown): unknown {
  if (e instanceof Response) return e;
  if (e && typeof e === "object" && ("isNotFound" in e || "isRedirect" in e || "href" in e))
    return e;
  if (e instanceof Error) {
    if (!mensagemInterna(e.message)) return e;
    console.error("[erro interno ocultado]", e);
    const out = new Error(MENSAGEM_GENERICA);
    const st = (e as { status?: unknown }).status;
    if (typeof st === "number") (out as Error & { status?: number }).status = st;
    return out;
  }
  // Objeto cru (ex.: PostgrestError lançado direto): nunca serializar para o cliente.
  console.error("[erro não-Error ocultado]", e);
  return new Error(MENSAGEM_GENERICA);
}
