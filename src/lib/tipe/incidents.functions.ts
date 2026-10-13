import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Pendências financeiras do restaurante (estornos, contestações, valores
// divergentes, pagamentos travados). Leitura e resolução usam o cliente do
// próprio usuário: a política de acesso do banco limita a dono e caixa.

export type PaymentIncident = {
  id: string;
  kind: "refund" | "chargeback" | "amount_mismatch" | "paid_after_release" | "stuck_pending" | "pdv_writeback_failed";
  table_number: string | null;
  detail: string;
  amount: number | null;
  created_at: string;
  resolved_at: string | null;
  resolution_note: string | null;
};

export const getPaymentIncidents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(64), includeResolved: z.boolean().optional() }).parse(d))
  .handler(async ({ data, context }): Promise<PaymentIncident[]> => {
    const { supabase } = context;
    const { data: r } = await supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) return [];
    let q = supabase.from("payment_incidents" as never)
      .select("id, kind, table_number, detail, amount, created_at, resolved_at, resolution_note")
      .eq("restaurant_id" as never, r.id as never)
      .order("created_at" as never, { ascending: false })
      .limit(50);
    if (!data.includeResolved) q = q.is("resolved_at" as never, null);
    const { data: rows, error } = await q as unknown as { data: PaymentIncident[] | null; error: unknown };
    if (error) throw new Error("Não foi possível carregar as pendências");
    return (rows ?? []).map((x) => ({ ...x, amount: x.amount === null ? null : Number(x.amount) }));
  });

export const resolvePaymentIncident = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), note: z.string().trim().min(3).max(300) }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("resolve_payment_incident" as never, { p_id: data.id, p_note: data.note } as never);
    if (error) throw new Error(error.message.includes("Sem permissão") ? "Somente dono ou caixa podem resolver pendências." : "Não foi possível registrar a resolução");
    return { ok: true };
  });
