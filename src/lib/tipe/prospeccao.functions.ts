/**
 * Prospecção ativa (Central > Comercial > Prospecção): servidor.
 *
 * Acesso: founder ou equipe interna com a seção "comercial", sempre com 2FA (acessoCentral).
 * Escrita só aqui, com service_role, depois da checagem. Nada é enviado para fora:
 * a tela abre o WhatsApp com o rascunho e a pessoa registra o toque. Tabelas: migração 0093.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { aposToque, canalDoPasso, CATEGORIAS, RESULTADOS, type Resultado } from "./prospeccao";

type Ctx = { supabase: any; userId: string; claims?: any };
async function db(ctx: Ctx) {
  const { acessoCentral } = await import("./founder-guard");
  await acessoCentral(
    ctx,
    "comercial",
    "Somente a equipe comercial da Tipe, com verificação em duas etapas",
  );
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Tabelas da 0093 ainda não estão nos tipos gerados.
  return supabaseAdmin as unknown as { from: (t: string) => any; rpc: (f: string, a?: any) => any };
}
const Uuid = z.string().uuid();
const LISTA =
  "id, name, category, cuisine, brand, street, number, neighborhood, city, state, lat, lon, phone, whatsapp, website, instagram, email, opening_hours, rating, reviews_count, score, score_reasons, status, cadence_step, next_touch_at, last_touch_at, discard_reason, lead_id, source, source_ref, first_seen_at";

export const getProspeccao = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const d = await db(context);
    // Paginado em blocos de 1000 (limite do PostgREST); uma cidade grande cabe em poucos blocos.
    const todos: any[] = [];
    for (let de = 0; de < 20000; de += 1000) {
      const { data, error } = await d
        .from("crm_prospects")
        .select(LISTA)
        .order("score", { ascending: false })
        .order("id")
        .range(de, de + 999);
      if (error) throw new Error(error.message);
      todos.push(...(data ?? []));
      if (!data || data.length < 1000) break;
    }
    const runs = await d
      .from("crm_prospect_runs")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10);
    return { prospects: todos, coletas: runs.data ?? [] };
  });

export const getProspect = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: Uuid }).parse(v))
  .handler(async ({ data, context }) => {
    const d = await db(context);
    const [p, t] = await Promise.all([
      d.from("crm_prospects").select(LISTA).eq("id", data.id).maybeSingle(),
      d
        .from("crm_prospect_touches")
        .select("*")
        .eq("prospect_id", data.id)
        .order("created_at", { ascending: false }),
    ]);
    if (!p.data) throw new Error("Prospect não encontrado");
    return { prospect: p.data, toques: t.data ?? [] };
  });

async function bloquear(d: Awaited<ReturnType<typeof db>>, p: any, motivo: string) {
  const linhas = [
    { value: p.source_ref, kind: "source_ref" },
    { value: p.phone, kind: "phone" },
    { value: p.whatsapp, kind: "phone" },
    { value: p.email, kind: "email" },
    { value: p.instagram, kind: "instagram" },
  ]
    .filter((x) => x.value)
    .map((x) => ({ ...x, reason: motivo }));
  if (linhas.length)
    await d.from("crm_optout").upsert(linhas, { onConflict: "value", ignoreDuplicates: true });
}

export const registrarToque = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: Uuid,
        resultado: z.enum(Object.keys(RESULTADOS) as [Resultado, ...Resultado[]]),
        canal: z.enum(["whatsapp", "ligacao", "instagram", "email", "visita"]).optional(),
        nota: z.string().trim().max(1000).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const d = await db(context);
    const { data: p } = await d.from("crm_prospects").select("*").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Prospect não encontrado");
    if (p.status === "opt_out") throw new Error("Este restaurante pediu para não ser contatado.");
    if (p.status === "convertido") throw new Error("Já virou lead: continue pelo funil.");
    const passo = Math.min(
      5,
      p.status === "respondeu" ? Math.max(1, p.cadence_step) : p.cadence_step + 1,
    );
    const canal = data.canal ?? canalDoPasso(passo, p);
    const agora = new Date();
    const prox = aposToque(passo, data.resultado, agora);
    const ins = await d
      .from("crm_prospect_touches")
      .insert({
        prospect_id: p.id,
        step: passo,
        channel: canal,
        outcome: data.resultado,
        note: data.nota || null,
        actor: context.userId,
      });
    if (ins.error) throw new Error(ins.error.message);
    const upd = await d
      .from("crm_prospects")
      .update({
        ...prox,
        last_touch_at: agora.toISOString(),
        assigned_to: p.assigned_to ?? context.userId,
        discard_reason:
          prox.status === "descartado"
            ? data.resultado === "sem_interesse"
              ? "Sem interesse"
              : "Cadência encerrada sem resposta"
            : prox.status === "opt_out"
              ? "Pediu para não receber"
              : null,
        updated_at: agora.toISOString(),
      })
      .eq("id", p.id);
    if (upd.error) throw new Error(upd.error.message);
    if (prox.status === "opt_out")
      await bloquear(d, p, "Pediu para não receber (registrado na cadência)");
    return { ok: true, ...prox };
  });

export const descartarProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: Uuid,
        motivo: z.string().trim().min(2).max(120),
        naoContatar: z.boolean().default(false),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const d = await db(context);
    const { data: p } = await d.from("crm_prospects").select("*").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Prospect não encontrado");
    if (p.status === "convertido") throw new Error("Já virou lead: marque como perdido no funil.");
    await d
      .from("crm_prospects")
      .update({
        status: data.naoContatar ? "opt_out" : "descartado",
        discard_reason: data.motivo,
        next_touch_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    if (data.naoContatar) await bloquear(d, p, data.motivo);
    return { ok: true };
  });

/** Reabre um descartado (não vale para opt-out). */
export const reabrirProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) => z.object({ id: Uuid }).parse(v))
  .handler(async ({ data, context }) => {
    const d = await db(context);
    const { data: p } = await d
      .from("crm_prospects")
      .select("status")
      .eq("id", data.id)
      .maybeSingle();
    if (p?.status !== "descartado") throw new Error("Só dá para reabrir um descartado.");
    await d
      .from("crm_prospects")
      .update({
        status: "novo",
        cadence_step: 0,
        next_touch_at: null,
        discard_reason: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", data.id);
    return { ok: true };
  });

const VENUE_DE: Record<string, string> = {
  restaurant: "restaurante",
  bar: "bar",
  pub: "bar",
  biergarten: "bar",
  cafe: "cafeteria",
  fast_food: "outro",
  ice_cream: "outro",
  food_court: "food_park",
};

/** Virou conversa de verdade: cria o lead (o gatilho abre oportunidade + tarefa no funil). */
export const converterProspect = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((v) =>
    z
      .object({
        id: Uuid,
        contato: z.string().trim().min(2).max(80),
        cargo: z.enum(["dono", "gerente", "outro"]),
        email: z.string().trim().toLowerCase().email().max(120),
        telefone: z.string().trim().max(30).optional(),
        nota: z.string().trim().max(1000).optional(),
      })
      .parse(v),
  )
  .handler(async ({ data, context }) => {
    const d = await db(context);
    const { data: p } = await d.from("crm_prospects").select("*").eq("id", data.id).maybeSingle();
    if (!p) throw new Error("Prospect não encontrado");
    if (p.status === "opt_out") throw new Error("Este restaurante pediu para não ser contatado.");
    if (p.lead_id) return { leadId: p.lead_id as string };
    const { foneBR } = await import("./prospeccao");
    const fone = foneBR(data.telefone ?? "") ?? p.whatsapp ?? p.phone;
    const notas = [
      `Prospecção ativa (${CATEGORIAS[p.category as keyof typeof CATEGORIAS] ?? p.category}, score ${p.score}).`,
      ...(p.score_reasons ?? []),
      p.source === "osm"
        ? `Fonte: https://www.openstreetmap.org/${p.source_ref}`
        : `Fonte: ${p.source}`,
      data.nota ? `Nota: ${data.nota}` : "",
    ]
      .filter(Boolean)
      .join("\n");
    const { data: lead, error } = await d
      .from("restaurant_leads")
      .insert({
        restaurant_name: p.name,
        contact_name: data.contato,
        contact_role: data.cargo,
        email: data.email,
        phone: fone ? `+${fone}` : null,
        city: p.city,
        state: p.state,
        neighborhood: p.neighborhood,
        instagram: p.instagram ? `@${p.instagram}` : null,
        venue_type: VENUE_DE[p.category] ?? "outro",
        discovery_source: "prospeccao",
        origin_page: "central/prospeccao",
        utm_source: "prospeccao",
        utm_medium: p.source,
        marketing_opt_in: false,
        notes: notas,
        assigned_to: context.userId,
      })
      .select("id")
      .single();
    if (error) throw new Error(error.message);
    await d
      .from("crm_prospects")
      .update({
        status: "convertido",
        lead_id: lead.id,
        next_touch_at: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", p.id);
    return { leadId: lead.id as string };
  });
