import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { TIPOS_AVISO, type TipoAviso } from "./avisos-equipe";

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

const Preferencias = z.object({
  endpoint: z.string().max(1000),
  muted: z.array(z.enum(TIPOS_AVISO)).max(TIPOS_AVISO.length),
});

type TabelaInscricoes = {
  select: (c: string) => {
    eq: (
      c: string,
      v: string,
    ) => {
      eq: (
        c: string,
        v: string,
      ) => { maybeSingle: () => Promise<{ data: { muted_kinds: string[] } | null }> };
    };
  };
  update: (v: object) => {
    eq: (
      c: string,
      v: string,
    ) => {
      eq: (
        c: string,
        v: string,
      ) => { select: (c: string) => Promise<{ data: unknown[] | null; error: unknown }> };
    };
  };
};

// Quais tipos de aviso este celular recebe. Só a própria inscrição é lida ou alterada.
export const getPushPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ endpoint: z.string().max(1000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = supabaseAdmin.from(
      "staff_push_subscriptions" as never,
    ) as unknown as TabelaInscricoes;
    const { data: row } = await t
      .select("muted_kinds")
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId)
      .maybeSingle();
    return {
      found: !!row,
      muted: (row?.muted_kinds ?? []).filter((k): k is TipoAviso =>
        (TIPOS_AVISO as readonly string[]).includes(k),
      ),
    };
  });

export const setPushPreferences = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => Preferencias.parse(d))
  .handler(async ({ data, context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = supabaseAdmin.from(
      "staff_push_subscriptions" as never,
    ) as unknown as TabelaInscricoes;
    const { data: rows, error } = await t
      .update({ muted_kinds: [...new Set(data.muted)] })
      .eq("endpoint", data.endpoint)
      .eq("user_id", context.userId)
      .select("id");
    if (error || !rows?.length)
      throw new Error("Não foi possível salvar. Ligue os avisos de novo neste celular.");
    return { ok: true };
  });
