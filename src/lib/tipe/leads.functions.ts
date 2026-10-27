import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const opt = (max: number) => z.string().trim().max(max).optional().transform((v) => (v ? v : null));
const enumOpt = (vals: [string, ...string[]]) => z.enum(vals).optional().nullable();

const step1Schema = z.object({
  contactName: z.string().trim().min(5).max(120).refine((v) => v.split(/\s+/).length >= 2, "Informe nome e sobrenome"),
  phone: z.string().trim().regex(/^\(\d{2}\) 9\d{4}-\d{4}$/, "WhatsApp inválido"),
  email: z.string().trim().email().max(200),
  restaurantName: z.string().trim().min(2).max(120),
  city: z.string().trim().min(2).max(80),
  state: z.string().trim().regex(/^[A-Za-z]{2}$/).transform((v) => v.toUpperCase()),
  role: z.enum(["dono", "gerente", "outro"]),
  tablesRange: z.enum(["ate_10", "11_20", "21_40", "40_mais"]),
  pdvSystem: z.string().trim().min(2).max(80),
  acquirer: z.string().trim().min(2).max(80),
  privacyAccepted: z.literal(true),
  marketingOptIn: z.boolean(),
  // Capturados automaticamente
  utm_source: opt(120), utm_medium: opt(120), utm_campaign: opt(120), utm_content: opt(120), utm_term: opt(120),
  ref: z.string().regex(/^[a-z0-9]{4,16}$/i).optional(),
  // "tipe-order": formulário da página /produtos/order (origin_page é text, sem migração).
  originPage: z.enum(["home", "simulador", "calculadora", "tipe-order"]).default("home"),
  /** Estado de lançamento do produto quando a pessoa se cadastrou (só para originPage "tipe-order"). */
  launchState: z.enum(["em-desenvolvimento", "acesso-antecipado", "piloto", "disponivel"]).optional(),
  usedSimulator: z.boolean().default(false),
  calculator: z.record(z.string(), z.number().finite()).optional(),
});

export const submitLead = createServerFn({ method: "POST" })
  .inputValidator((data) => step1Schema.parse(data))
  .handler(async ({ data }) => {
    const { enforceRate, clientIp } = await import("./security.server");
    await enforceRate(`lead:${clientIp()}`, 5, 600);
    // Entrada validada e limitada por IP; gravação apenas nesta tabela.
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: row, error } = await db.from("restaurant_leads").insert({
      restaurant_name: data.restaurantName, contact_name: data.contactName, email: data.email, phone: data.phone,
      city: data.city, state: data.state, contact_role: data.role, tables_range: data.tablesRange, pdv_system: data.pdvSystem, acquirer: data.acquirer, privacy_accepted_at: new Date().toISOString(), marketing_opt_in: data.marketingOptIn,
      utm_source: data.utm_source, utm_medium: data.utm_medium, utm_campaign: data.utm_campaign, utm_content: data.utm_content, utm_term: data.utm_term,
      referred_by_code: data.ref?.toLowerCase() ?? null, origin_page: data.originPage, used_simulator: data.usedSimulator, calculator: data.calculator ?? null,
      // Interesse no Tipe Order vai nas notas do CRM para a equipe comercial ver de cara.
      ...(data.originPage === "tipe-order" ? { notes: `Interesse: Tipe Order (estado na hora do cadastro: ${data.launchState ?? "não informado"})` } : {}),
    } as never).select("id, ref_code, update_token").single() as unknown as { data: { id: string; ref_code: string; update_token: string } | null; error: { message: string } | null };
    if (error || !row) {
      console.error("lead_insert", error?.message);
      throw new Error("Falha ao registrar o contato");
    }
    try {
      const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
      const templateData = { restaurantName: data.restaurantName, contactName: data.contactName, email: data.email, phone: data.phone, city: `${data.city}/${data.state}` };
      await Promise.allSettled([
        sendTemplateEmail("lead-notification", "roberto@tipe.digital", { templateData, idempotencyKey: `lead-notification-${row.id}`, replyTo: data.email }),
        sendTemplateEmail("lead-confirmation", data.email, { templateData, idempotencyKey: `lead-confirmation-${row.id}`, replyTo: "contato@tipe.digital" }),
      ]).then((r) => r.forEach((x) => x.status === "rejected" && console.error("lead_email", x.reason)));
    } catch (e) {
      console.error("lead_email", e);
    }
    return { ok: true as const, leadId: row.id, token: row.update_token, refCode: row.ref_code };
  });

const step2Schema = z.object({
  leadId: z.string().uuid(),
  token: z.string().regex(/^[0-9a-f]{48}$/),
  neighborhood: opt(80),
  instagram: z.string().trim().max(60).optional().transform((v) => (v ? `@${v.replace(/^@+/, "")}` : null)),
  venueType: enumOpt(["restaurante", "bar", "cafeteria", "quiosque", "food_park", "outro"]),
  tablesRange: enumOpt(["ate_10", "11_20", "21_40", "40_mais"]),
  waitersRange: enumOpt(["1_3", "4_8", "9_15", "15_mais"]),
  peakTimes: z.array(z.enum(["almoco", "jantar", "fim_de_semana", "happy_hour", "madrugada"])).max(5).default([]),
  ticketRange: enumOpt(["ate_40", "41_80", "81_150", "150_mais"]),
  closeTime: enumOpt(["ate_5", "5_10", "10_20", "20_mais", "nao_sei"]),
  peakQueue: enumOpt(["sempre", "as_vezes", "raramente"]),
  pains: z.array(z.enum(["demora", "divisao", "maquininha", "sobrecarga", "erros", "outro"])).max(6).default([]),
  pdvSystem: opt(80),
  acquirer: opt(80),
  hasPagarme: enumOpt(["sim", "nao", "nao_sei"]),
  discoverySource: enumOpt(["instagram", "indicacao", "google", "visita", "evento", "outro"]),
  referrerName: opt(120),
});

export const submitLeadDetails = createServerFn({ method: "POST" })
  .inputValidator((data) => step2Schema.parse(data))
  .handler(async ({ data }) => {
    const { enforceRate, clientIp, safeEqual } = await import("./security.server");
    await enforceRate(`lead2:${clientIp()}`, 10, 600);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: lead } = await db.from("restaurant_leads").select("id, update_token" as never).eq("id", data.leadId).maybeSingle() as unknown as { data: { id: string; update_token: string | null } | null };
    if (!lead?.update_token || !safeEqual(lead.update_token, data.token)) throw new Error("Cadastro não encontrado");
    const { error } = await db.from("restaurant_leads").update({
      neighborhood: data.neighborhood, instagram: data.instagram, venue_type: data.venueType ?? null, tables_range: data.tablesRange ?? null,
      waiters_range: data.waitersRange ?? null, peak_times: data.peakTimes, ticket_range: data.ticketRange ?? null, close_time: data.closeTime ?? null,
      peak_queue: data.peakQueue ?? null, pains: data.pains, pdv_system: data.pdvSystem, acquirer: data.acquirer, has_pagarme: data.hasPagarme ?? null,
      discovery_source: data.discoverySource ?? null, referrer_name: data.discoverySource === "indicacao" ? data.referrerName : null,
      stage2_completed_at: new Date().toISOString(),
    } as never).eq("id", data.leadId);
    if (error) throw new Error("Não foi possível salvar agora");
    return { ok: true as const };
  });

// ---------------- Mini-CRM (somente administradores TIPE) ----------------
async function requireAdmin(ctx: { supabase: any; userId: string; claims?: any }) {
  const { requireFounder2fa } = await import("./founder-guard");
  await requireFounder2fa(ctx, "Acesso restrito aos administradores TIPE, com verificação em duas etapas");
}

export const listLeads = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await requireAdmin(context);
    // Leitura com a sessão do próprio administrador: a política do banco também exige o papel.
    const { data, error } = await context.supabase.from("restaurant_leads")
      .select("id, created_at, restaurant_name, contact_name, email, phone, city, state, contact_role, marketing_opt_in, neighborhood, instagram, venue_type, tables_range, waiters_range, peak_times, ticket_range, close_time, peak_queue, pains, pdv_system, acquirer, has_pagarme, discovery_source, referrer_name, stage2_completed_at, utm_source, utm_medium, utm_campaign, utm_content, utm_term, ref_code, referred_by_code, origin_page, used_simulator, calculator, status, notes, next_contact_at, lost_reason, message")
      .order("created_at", { ascending: false }).limit(5000);
    if (error) throw new Error("Não foi possível carregar os leads");
    return (data ?? []) as Lead[];
  });

export type Lead = {
  id: string; created_at: string; restaurant_name: string; contact_name: string; email: string; phone: string | null; city: string | null; state: string | null;
  contact_role: string | null; marketing_opt_in: boolean; neighborhood: string | null; instagram: string | null; venue_type: string | null; tables_range: string | null;
  waiters_range: string | null; peak_times: string[] | null; ticket_range: string | null; close_time: string | null; peak_queue: string | null; pains: string[] | null;
  pdv_system: string | null; acquirer: string | null; has_pagarme: string | null; discovery_source: string | null; referrer_name: string | null; stage2_completed_at: string | null;
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; utm_content: string | null; utm_term: string | null; ref_code: string | null;
  referred_by_code: string | null; origin_page: string | null; used_simulator: boolean; calculator: Record<string, number> | null; status: string; notes: string | null;
  next_contact_at: string | null; lost_reason: string | null; message: string | null;
};

export const updateLead = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    id: z.string().uuid(),
    status: z.enum(["novo", "contatado", "demo_agendada", "demo_feita", "piloto", "cliente", "perdido"]),
    notes: z.string().max(4000).nullable(),
    nextContactAt: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).nullable(),
    lostReason: z.enum(["preco", "sem_valor", "pdv_nao_integra", "concorrente", "sem_resposta", "outro"]).nullable(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    await requireAdmin(context);
    const { data: rows, error } = await context.supabase.from("restaurant_leads").update({
      status: data.status, notes: data.notes, next_contact_at: data.nextContactAt, lost_reason: data.status === "perdido" ? data.lostReason : null,
    }).eq("id", data.id).select("id");
    if (error || !rows?.length) throw new Error("Não foi possível salvar");
    return { ok: true };
  });
