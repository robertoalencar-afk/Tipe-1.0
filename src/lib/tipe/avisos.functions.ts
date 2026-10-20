import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Chave pública VAPID: o navegador precisa dela para criar a inscrição.
export const getPushPublicKey = createServerFn({ method: "GET" }).handler(async () => {
  return { publicKey: process.env["VAPID_PUBLIC_KEY"] ?? null };
});

const Inscricao = z.object({
  endpoint: z.string().url().max(1000).startsWith("https://"),
  p256dh: z.string().regex(/^[A-Za-z0-9_-]{80,100}$/),
  auth: z.string().regex(/^[A-Za-z0-9_-]{16,32}$/),
});

// Só quem é da equipe de algum restaurante (garçom com acesso, dono ou caixa) pode receber avisos.
export const savePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Inscricao.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const [{ data: garcom }, { data: cargo }] = await Promise.all([
      supabaseAdmin
        .from("pdv_waiters")
        .select("id")
        .eq("user_id", context.userId)
        .eq("active", true)
        .limit(1),
      supabaseAdmin
        .from("user_roles")
        .select("id")
        .eq("user_id", context.userId)
        .in("role", ["owner", "cashier"])
        .limit(1),
    ]);
    if (!garcom?.length && !cargo?.length)
      throw new Error("Avisos no celular são só para a equipe do restaurante");
    const t = supabaseAdmin.from("staff_push_subscriptions" as never) as unknown as {
      upsert: (v: object, o: object) => Promise<{ error: { message: string } | null }>;
    };
    // O mesmo aparelho pode trocar de conta: a inscrição passa a ser de quem entrou agora.
    const { error } = await t.upsert(
      { user_id: context.userId, ...data, created_at: new Date().toISOString() },
      { onConflict: "endpoint" },
    );
    if (error) throw new Error("Não foi possível ativar os avisos");
    return { ok: true };
  });

export const removePushSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ endpoint: z.string().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = supabaseAdmin.from("staff_push_subscriptions" as never) as unknown as {
      delete: () => {
        eq: (c: string, v: string) => { eq: (c: string, v: string) => Promise<unknown> };
      };
    };
    await t.delete().eq("endpoint", data.endpoint).eq("user_id", context.userId);
    return { ok: true };
  });
