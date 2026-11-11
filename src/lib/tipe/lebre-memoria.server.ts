// Server-only: lê e grava a memória da Lebre (tabela lebre_memories, migração 0058).
// Grava pelo service_role, sempre depois de limparMemoria (que barra dado sensível).
import { limparMemoria } from "./lebre-memoria";

const MAX_RESTAURANTE = 40;
const MAX_USUARIO = 20;

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export type Memorias = { restaurante: string[]; usuario: string[] };

export async function carregarMemorias(restaurantId: string, userId: string): Promise<Memorias> {
  try {
    const sb = await db();
    const { data } = await sb
      .from("lebre_memories" as never)
      .select("content, user_id")
      .eq("restaurant_id", restaurantId)
      .or(`user_id.is.null,user_id.eq.${userId}`)
      .order("used_at", { ascending: false })
      .limit(MAX_RESTAURANTE + MAX_USUARIO);
    const rows = (data ?? []) as Array<{ content: string; user_id: string | null }>;
    return {
      restaurante: rows.filter((r) => !r.user_id).map((r) => r.content),
      usuario: rows.filter((r) => r.user_id).map((r) => r.content),
    };
  } catch (error) {
    console.error("lebre memoria ler", error);
    return { restaurante: [], usuario: [] };
  }
}

/** Grava uma memória. Devolve o texto guardado, "repetida" ou null se foi barrada. */
export async function salvarMemoria(opts: {
  restaurantId: string;
  userId: string;
  pessoal: boolean;
  texto: string;
}): Promise<string | "repetida" | null> {
  const texto = limparMemoria(opts.texto);
  if (!texto) return null;
  const sb = await db();
  const dono = opts.pessoal ? opts.userId : null;
  let q = sb
    .from("lebre_memories" as never)
    .select("id, content")
    .eq("restaurant_id", opts.restaurantId);
  q = dono ? q.eq("user_id", dono) : q.is("user_id", null);
  const { data } = await q.order("used_at", { ascending: false });
  const rows = (data ?? []) as Array<{ id: string; content: string }>;
  const igual = rows.find((r) => r.content.toLowerCase() === texto.toLowerCase());
  if (igual) {
    await sb
      .from("lebre_memories" as never)
      .update({ used_at: new Date().toISOString() } as never)
      .eq("id", igual.id);
    return "repetida";
  }
  const max = dono ? MAX_USUARIO : MAX_RESTAURANTE;
  const sobra = rows.slice(max - 1).map((r) => r.id);
  if (sobra.length)
    await sb
      .from("lebre_memories" as never)
      .delete()
      .in("id", sobra);
  const { error } = await sb.from("lebre_memories" as never).insert({
    restaurant_id: opts.restaurantId,
    user_id: dono,
    content: texto,
    created_by: opts.userId,
  } as never);
  if (error) {
    console.error("lebre memoria gravar", error.message);
    return null;
  }
  return texto;
}

/** Apaga memórias: todas do usuário, todas do restaurante, ou as que contêm um trecho. */
export async function esquecerMemorias(opts: {
  restaurantId: string;
  userId: string;
  podeRestaurante: boolean;
  pessoal: boolean;
  trecho?: string;
}): Promise<number> {
  const sb = await db();
  const apagar = async (pessoal: boolean) => {
    let q = sb
      .from("lebre_memories" as never)
      .delete()
      .eq("restaurant_id", opts.restaurantId);
    q = pessoal ? q.eq("user_id", opts.userId) : q.is("user_id", null);
    if (opts.trecho) q = q.ilike("content", `%${opts.trecho.replace(/[%_]/g, "")}%`);
    const { data } = await q.select("id");
    return (data ?? []).length;
  };
  let n = await apagar(true);
  if (!opts.pessoal && opts.podeRestaurante) n += await apagar(false);
  return n;
}
