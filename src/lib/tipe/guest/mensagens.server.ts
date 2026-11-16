// Tipe Reserva · envio das mensagens ao cliente (só no servidor). Nunca derruba a ação da equipe:
// qualquer falha vira um aviso no log e a reserva segue igual.
import {
  codigoReserva,
  diaHora,
  inicioDoSlot,
  planejarEnvio,
  prepararMensagem,
  telefoneWhatsApp,
  type Contato,
  type DadosMensagem,
  type TipoMensagem,
} from "./mensagens";

type Db = { from: (t: string) => any; auth: { admin: { getUserById: (id: string) => Promise<any> } } };

async function db(): Promise<Db> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin as unknown as Db;
}

const cfg = () => ({
  resendApiKey: process.env["RESEND_API_KEY"],
  whatsappToken: process.env["WHATSAPP_TOKEN"],
  whatsappPhoneNumberId: process.env["WHATSAPP_PHONE_NUMBER_ID"],
  whatsappModelos: process.env["WHATSAPP_RESERVA_MODELOS"],
});

async function contatoDoUsuario(s: Db, userId: string | null | undefined): Promise<Contato> {
  if (!userId) return {};
  const r = await s.auth.admin.getUserById(userId).catch(() => null);
  const u = r?.data?.user;
  return { email: u?.email ?? null, telefone: u?.phone ?? null };
}

async function restaurante(s: Db, id: string) {
  const [{ data: r }, { data: st }] = await Promise.all([
    s.from("restaurants").select("name").eq("id", id).maybeSingle(),
    s.from("guest_reservation_settings").select("timezone").eq("restaurant_id", id).maybeSingle(),
  ]);
  return { nome: (r?.name as string) ?? "restaurante", fuso: (st?.timezone as string) || "America/Fortaleza" };
}

async function enviar(tipo: TipoMensagem, d: DadosMensagem, c: Contato, restaurantId: string, chave: string) {
  const conf = cfg();
  for (const plano of planejarEnvio(conf, c)) {
    if (!plano.vai) continue;
    const m = prepararMensagem(plano.canal, tipo, d);
    try {
      if (plano.canal === "email") {
        const { sendTemplateEmail } = await import("@/lib/email-templates/send-email");
        await sendTemplateEmail("reserva-aviso", c.email!, {
          templateData: { assunto: m.assunto, corpo: m.corpo, restaurante: d.restaurante },
          idempotencyKey: `reserva:${tipo}:${chave}`,
          restaurantId,
        });
      } else {
        const { sendTemplate } = await import("@/lib/tipe/crm/whatsapp");
        await sendTemplate(
          { token: conf.whatsappToken!, phoneNumberId: conf.whatsappPhoneNumberId! },
          telefoneWhatsApp(c.telefone)!,
          m.modelo,
          m.parametros,
        );
      }
    } catch (e) {
      console.warn(`[reserva] ${plano.canal} ${tipo} não saiu:`, (e as Error).message);
    }
  }
}

/** Confirmação ou cancelamento de uma reserva. */
export async function avisarReserva(tipo: "confirmada" | "cancelada", reservationId: string) {
  try {
    const s = await db();
    const { data: r } = await s
      .from("guest_reservations")
      .select("id, restaurant_id, guest_user_id, guest_name, guest_phone, party_size, slot, status")
      .eq("id", reservationId)
      .maybeSingle();
    if (!r) return;
    // Reserva pendente (restaurante sem confirmação automática) só recebe o aviso quando a equipe confirmar.
    if (tipo === "confirmada" && r.status !== "confirmada") return;
    const rest = await restaurante(s, r.restaurant_id);
    const inicio = inicioDoSlot(String(r.slot));
    if (!inicio) return;
    const doUsuario = await contatoDoUsuario(s, r.guest_user_id);
    const c: Contato = { email: doUsuario.email, telefone: r.guest_phone || doUsuario.telefone };
    await enviar(
      tipo,
      {
        nome: r.guest_name ?? "",
        restaurante: rest.nome,
        ...diaHora(inicio, rest.fuso),
        pessoas: r.party_size,
        codigo: codigoReserva(r.id),
      },
      c,
      r.restaurant_id,
      r.id,
    );
  } catch (e) {
    console.warn("[reserva] aviso não montado:", (e as Error).message);
  }
}

/** Mesa livre para quem está na lista de espera. */
export async function avisarEspera(entryId: string, minutos: number) {
  try {
    const s = await db();
    const { data: w } = await s
      .from("guest_waitlist_entries")
      .select("id, restaurant_id, guest_user_id, guest_name, party_size")
      .eq("id", entryId)
      .maybeSingle();
    if (!w) return;
    const rest = await restaurante(s, w.restaurant_id);
    const c = await contatoDoUsuario(s, w.guest_user_id);
    await enviar(
      "espera_mesa_livre",
      {
        nome: w.guest_name ?? "",
        restaurante: rest.nome,
        ...diaHora(new Date(), rest.fuso),
        pessoas: w.party_size,
        codigo: codigoReserva(w.id),
        minutosResposta: minutos,
      },
      c,
      w.restaurant_id,
      `${w.id}:${Date.now()}`,
    );
  } catch (e) {
    console.warn("[reserva] aviso da espera não montado:", (e as Error).message);
  }
}
