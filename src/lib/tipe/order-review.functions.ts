import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

export type OrderReview = {
  id: string;
  table_number: string;
  customer_name: string | null;
  quantity: number;
  total: number;
  created_at: string;
  preview: { code: string; name: string; qty: number; price: number; notes: string | null }[];
};

export const getPendingOrderReviews = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().regex(/^[a-z0-9-]{1,64}$/) }).parse(d))
  .handler(async ({ data, context }): Promise<OrderReview[]> => {
    const { data: rows, error } = await context.supabase.rpc(
      "pending_customer_order_reviews" as never,
      { p_slug: data.slug } as never,
    );
    if (error) throw new Error("Não foi possível carregar os pedidos para conferência");
    return rows as unknown as OrderReview[];
  });

export const resolveOrderReview = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid(), approve: z.boolean() }).parse(d))
  .handler(async ({ data, context }): Promise<{ state: string }> => {
    const { data: result, error } = await context.supabase.rpc(
      "resolve_customer_order_review" as never,
      { p_id: data.id, p_approve: data.approve } as never,
    );
    if (error)
      throw new Error(
        error.message.includes("Cardápio alterado")
          ? "Cardápio alterado. Recuse este pedido e peça ao cliente para enviar novamente."
          : "Não foi possível resolver este pedido. Confira se os pedidos da mesa continuam liberados e tente novamente.",
      );
    return result as unknown as { state: string };
  });
