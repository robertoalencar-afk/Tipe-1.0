import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Chamado da mesa: o cliente pede o garçom ou a conta pelo QR; a equipe vê em
// "O que precisa de você agora" e recebe no celular. Gravação só pelo servidor,
// com a sessão da mesa conferida; leitura e "atendido" pelo cliente do usuário,
// limitados pela política do banco a dono, caixa e garçom do restaurante.

export type TipoChamado = "waiter" | "bill";
export type ChamadoAberto = { id: string; table: string; kind: TipoChamado; at: string };

// Tabela nova (migração 0034): ainda fora dos tipos gerados.
type LinhaChamado = { id: string; table_number: string; kind: TipoChamado; created_at: string; session_token: string };

const Chamar = z.object({
  slug: z.string().min(1).max(64),
  table: z.string().min(1).max(16),
  session: z.string().min(16).max(128),
  kind: z.enum(["waiter", "bill"]),
});

export const callStaff = createServerFn({ method: "POST" })
  .inputValidator((d) => Chamar.parse(d))
  .handler(async ({ data }) => {
    const { verifyTableSession, enforceRate } = await import("./security.server");
    const ok = await verifyTableSession(data.slug, data.table, data.session);
    if (!ok) throw new Error("Sessão da mesa expirada. Leia o QR de novo.");
    await enforceRate(`chamado:${data.slug}:${data.table}:${data.kind}`, 1, 120, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const t = supabaseAdmin.from("table_calls" as never) as unknown as {
      insert: (v: object) => { select: (c: string) => Promise<{ data: { id: string }[] | null; error: { code?: string; message: string } | null }> };
    };
    // Um chamado aberto por mesa e tipo (índice único parcial): tocar de novo não cria outro aviso.
    const { data: novo, error } = await t
      .insert({ restaurant_id: ok.restaurantId, table_number: data.table, kind: data.kind, session_token: data.session })
      .select("id");
    if (error && error.code !== "23505") throw new Error("Não foi possível avisar a equipe. Chame alguém no salão.");
    if (novo?.length) {
      const { data: mesa } = await supabaseAdmin
        .from("restaurant_tables")
        .select("waiter_id")
        .eq("restaurant_id", ok.restaurantId)
        .eq("number", data.table)
        .maybeSingle();
      const { avisarChamado } = await import("./avisos-equipe.server");
      await avisarChamado(supabaseAdmin, ok.restaurantId, (mesa as { waiter_id: string | null } | null)?.waiter_id ?? null, data.slug, data.table, data.kind);
    }
    return { ok: true };
  });

export const getOpenCalls = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: z.string().min(1).max(64) }).parse(d))
  .handler(async ({ data, context }): Promise<ChamadoAberto[]> => {
    const { supabase } = context;
    const { data: r } = await supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) return [];
    const { data: linhas } = (await supabase
      .from("table_calls" as never)
      .select("id, table_number, kind, created_at, session_token")
      .eq("restaurant_id" as never, r.id as never)
      .is("resolved_at" as never, null)
      .order("created_at" as never, { ascending: true })
      .limit(50)) as unknown as { data: LinhaChamado[] | null };
    if (!linhas?.length) return [];
    // Só vale o chamado da conta aberta agora: mesa reaberta descarta os antigos.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: mesas } = (await supabaseAdmin
      .from("restaurant_tables")
      .select("number, session_token" as never)
      .eq("restaurant_id", r.id)
      .in("number", [...new Set(linhas.map((l) => l.table_number))])) as unknown as {
      data: { number: string; session_token: string }[] | null;
    };
    const sessao = new Map((mesas ?? []).map((m) => [m.number, m.session_token]));
    return linhas
      .filter((l) => sessao.get(l.table_number) === l.session_token)
      .map((l) => ({ id: l.id, table: l.table_number, kind: l.kind, at: l.created_at }));
  });

export const resolveCall = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ id: z.string().uuid() }).parse(d))
  .handler(async ({ data, context }) => {
    const { error } = await context.supabase.rpc("resolve_table_call" as never, { p_id: data.id } as never);
    if (error) throw new Error("Não foi possível marcar o chamado como atendido");
    return { ok: true };
  });
