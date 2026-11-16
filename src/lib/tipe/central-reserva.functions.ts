/**
 * Central Tipe · Tipe Reserva: parceiros do Restaurante Fundador por etapa, métricas agregadas de
 * reservas (sem nome, telefone ou e-mail de cliente) e o estado das mensagens. Só fundador com 2FA.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { contarEtapas, metricasReservas } from "./guest/fundador";

type Ctx = { supabase: any; userId: string; claims?: any };

export const getReservaCentral = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ dias: z.number().int().min(7).max(365).default(30) }).parse(d ?? {}))
  .handler(async ({ data, context }) => {
    const { requireFounder2fa } = await import("./founder-guard");
    await requireFounder2fa(context as Ctx);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as { from: (t: string) => any };
    const since = new Date(Date.now() - data.dias * 864e5).toISOString();
    const [fp, rs, wl] = await Promise.all([
      db.from("founding_partner_enrollments").select("id, restaurant_id, status, status_changed_at, joined_at, pilot_eligible"),
      db.from("guest_reservations").select("restaurant_id, status, party_size").gte("created_at", since).limit(20000),
      db.from("guest_waitlist_entries").select("id", { count: "exact", head: true }).gte("created_at", since),
    ]);
    const parceiros = (fp.data ?? []) as { id: string; restaurant_id: string; status: string; status_changed_at: string; joined_at: string | null; pilot_eligible: boolean }[];
    const reservas = (rs.data ?? []) as { restaurant_id: string; status: string; party_size: number }[];
    const m = metricasReservas(reservas);
    const ids = [...new Set([...parceiros.map((p) => p.restaurant_id), ...m.porRestaurante.keys()])];
    const { data: rests } = ids.length
      ? await db.from("restaurants").select("id, name, slug").in("id", ids)
      : { data: [] };
    const nome = new Map<string, string>(((rests ?? []) as { id: string; name: string }[]).map((r) => [r.id, r.name]));
    return {
      etapas: contarEtapas(parceiros.map((p) => p.status)),
      parceiros: parceiros
        .map((p) => ({ id: p.id, restaurante: nome.get(p.restaurant_id) ?? "Restaurante", etapa: p.status, desde: p.status_changed_at, entrada: p.joined_at, piloto: p.pilot_eligible }))
        .sort((a, b) => b.desde.localeCompare(a.desde)),
      reservas: { ...m.total, taxaFalta: m.taxaFalta, espera: wl.count ?? 0 },
      porRestaurante: [...m.porRestaurante.entries()]
        .map(([id, v]) => ({ id, restaurante: nome.get(id) ?? "Restaurante", ...v }))
        .sort((a, b) => b.reservas - a.reservas),
      mensagens: {
        email: Boolean(process.env["RESEND_API_KEY"]),
        whatsapp: Boolean(process.env["WHATSAPP_TOKEN"] && process.env["WHATSAPP_PHONE_NUMBER_ID"]),
        modelosAprovados: process.env["WHATSAPP_RESERVA_MODELOS"] === "aprovados",
      },
    };
  });
