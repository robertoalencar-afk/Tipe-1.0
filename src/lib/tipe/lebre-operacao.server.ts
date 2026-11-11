import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/integrations/supabase/types";
import type { LebreProposal } from "./lebre.functions";
import type { ItemCardapio } from "./lebre-operacao";

export async function lerCardapio(
  sb: SupabaseClient<Database>,
  restaurantId: string,
): Promise<ItemCardapio[]> {
  const menu: ItemCardapio[] = [];
  for (let offset = 0; ; offset += 500) {
    const { data, error } = await sb
      .from("pdv_menu_items")
      .select("code, name, price, available")
      .eq("restaurant_id", restaurantId)
      .order("id")
      .range(offset, offset + 499);
    if (error)
      throw new Error("Não consegui consultar o cardápio. Tente novamente.");
    menu.push(
      ...(data ?? []).map((i) => ({
        code: String(i.code),
        name: i.name,
        price: Number(i.price),
        available: i.available,
      })),
    );
    if (!data || data.length < 500) return menu;
  }
}
export type OperacaoSnapshot = {
  session: string;
  waiter_id?: string;
  table_waiter_id?: string | null;
  items?: Array<{
    code: string;
    name: string;
    price: number;
    qty: number;
    notes?: string;
  }>;
};
export async function guardarOperacao(
  proposal: LebreProposal,
  restaurantId: string,
  actorId: string,
  snapshot: OperacaoSnapshot,
) {
  const { supabaseAdmin } =
    await import("@/integrations/supabase/client.server");
  const { error } = await supabaseAdmin
    .from("lebre_operation_proposals" as never)
    .insert({
      id: proposal.id,
      restaurant_id: restaurantId,
      actor_id: actorId,
      payload: proposal.payload as unknown as Json,
      snapshot: snapshot as unknown as Json,
    } as never);
  if (error)
    throw new Error(
      "Não consegui preparar a confirmação. Peça novamente à Lebre.",
    );
}
export async function executarOperacao(
  sb: SupabaseClient<Database>,
  proposalId: string,
  slug: string,
  payload: unknown,
): Promise<string> {
  const { data, error } = await sb.rpc(
    "lebre_execute_operation" as never,
    {
      p_proposal: proposalId,
      p_slug: slug,
      p_payload: payload as Json,
    } as never,
  );
  if (error) {
    const known = [
      "Sem permissão",
      "Proposta",
      "Mesa",
      "Item",
      "Garçom",
      "Cardápio",
      "Quantidade",
      "Há pagamentos",
      "limite do plano",
    ];
    throw new Error(
      known.some((k) => error["message"].includes(k))
        ? error["message"]
        : "Não consegui concluir a operação. Tente novamente; a confirmação não duplica o pedido.",
    );
  }
  if (
    !data ||
    typeof data !== "object" ||
    Array.isArray(data) ||
    typeof (data as Record<string, unknown>)["message"] !== "string"
  )
    throw new Error("A operação não retornou confirmação. Tente novamente.");
  return (data as Record<string, unknown>)["message"] as string;
}
