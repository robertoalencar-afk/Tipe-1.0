// Tipe Reserva · mensagens ao cliente. Ligadas em 2026-11-16 (ok do Roberto). Aqui só o conteúdo
// e as regras puras; o envio de verdade fica em mensagens.server.ts. E-mail sai pelo Resend
// (RESEND_API_KEY). WhatsApp sai só com modelo aprovado pela Meta (WHATSAPP_TOKEN,
// WHATSAPP_PHONE_NUMBER_ID e WHATSAPP_RESERVA_MODELOS=aprovados); sem isso o canal é pulado.

export const ENVIO_RESERVA_HABILITADO = true as const;

export type TipoMensagem = "confirmada" | "lembrete" | "cancelada" | "espera_mesa_livre";
export type Canal = "email" | "whatsapp";

export type DadosMensagem = {
  nome: string;
  restaurante: string;
  dia: string; // já formatado, ex.: "sexta, 14/11"
  hora: string; // "20:00"
  pessoas: number;
  codigo: string;
  /** Minutos para responder quando a mesa da lista de espera fica livre. */
  minutosResposta?: number;
};

const primeiro = (n: string) => n.trim().split(/\s+/)[0] ?? "";
const p = (n: number) => `${n} ${n === 1 ? "pessoa" : "pessoas"}`;

const TEXTOS: Record<TipoMensagem, (d: DadosMensagem) => { assunto: string; corpo: string }> = {
  confirmada: (d) => ({
    assunto: `Reserva confirmada no ${d.restaurante}`,
    corpo: `Oi, ${primeiro(d.nome)}! Sua mesa no ${d.restaurante} está confirmada: ${d.dia}, ${d.hora}, ${p(d.pessoas)}. Código ${d.codigo}.`,
  }),
  lembrete: (d) => ({
    assunto: `Hoje tem ${d.restaurante}`,
    corpo: `${primeiro(d.nome)}, lembrete da sua reserva hoje às ${d.hora} no ${d.restaurante}, ${p(d.pessoas)}. Não vai dar? Cancele pelo app.`,
  }),
  cancelada: (d) => ({
    assunto: `Reserva cancelada no ${d.restaurante}`,
    corpo: `${primeiro(d.nome)}, sua reserva ${d.codigo} no ${d.restaurante} (${d.dia}, ${d.hora}) foi cancelada.`,
  }),
  espera_mesa_livre: (d) => ({
    assunto: `Abriu uma mesa no ${d.restaurante}`,
    corpo: `${primeiro(d.nome)}, abriu mesa no ${d.restaurante} às ${d.hora} para ${p(d.pessoas)}. Confirme no app em até ${d.minutosResposta ?? 15} minutos.`,
  }),
};

/** Modelos do WhatsApp, cadastrados na Meta com estes nomes e as variáveis na ordem de PARAMETROS. */
export const MODELO_WHATSAPP: Record<TipoMensagem, string> = {
  confirmada: "tipe_reserva_confirmada",
  lembrete: "tipe_reserva_lembrete",
  cancelada: "tipe_reserva_cancelada",
  espera_mesa_livre: "tipe_reserva_espera_mesa",
};

const PARAMETROS: Record<TipoMensagem, (d: DadosMensagem) => string[]> = {
  confirmada: (d) => [primeiro(d.nome), d.restaurante, d.dia, d.hora, p(d.pessoas), d.codigo],
  lembrete: (d) => [primeiro(d.nome), d.hora, d.restaurante, p(d.pessoas)],
  cancelada: (d) => [primeiro(d.nome), d.codigo, d.restaurante, d.dia, d.hora],
  espera_mesa_livre: (d) => [primeiro(d.nome), d.restaurante, d.hora, p(d.pessoas), String(d.minutosResposta ?? 15)],
};

export type MensagemPreparada = {
  canal: Canal;
  tipo: TipoMensagem;
  assunto: string;
  corpo: string;
  modelo: string;
  parametros: string[];
};

/** Monta a mensagem do canal: texto (e-mail) e modelo com variáveis (WhatsApp). */
export function prepararMensagem(
  canal: Canal,
  tipo: TipoMensagem,
  d: DadosMensagem,
): MensagemPreparada {
  const t = TEXTOS[tipo](d);
  return { canal, tipo, ...t, modelo: MODELO_WHATSAPP[tipo], parametros: PARAMETROS[tipo](d) };
}

export type ConfigEnvio = {
  resendApiKey?: string | undefined;
  whatsappToken?: string | undefined;
  whatsappPhoneNumberId?: string | undefined;
  whatsappModelos?: string | undefined;
};

export type Contato = { email?: string | null | undefined; telefone?: string | null | undefined };

export type Plano = { canal: Canal; vai: boolean; motivo?: "sem_chave" | "sem_contato" | "modelo_pendente" };

/** Decide por canal se a mensagem sai, e por que não. Sem chave ou sem contato, pula sem erro. */
export function planejarEnvio(cfg: ConfigEnvio, c: Contato): Plano[] {
  const email: Plano = !cfg.resendApiKey
    ? { canal: "email", vai: false, motivo: "sem_chave" }
    : !c.email
      ? { canal: "email", vai: false, motivo: "sem_contato" }
      : { canal: "email", vai: true };
  const wa: Plano =
    !cfg.whatsappToken || !cfg.whatsappPhoneNumberId
      ? { canal: "whatsapp", vai: false, motivo: "sem_chave" }
      : cfg.whatsappModelos !== "aprovados"
        ? { canal: "whatsapp", vai: false, motivo: "modelo_pendente" }
        : !telefoneWhatsApp(c.telefone)
          ? { canal: "whatsapp", vai: false, motivo: "sem_contato" }
          : { canal: "whatsapp", vai: true };
  return [email, wa];
}

/** Telefone no formato da Meta (só dígitos, com DDI). Número brasileiro sem DDI ganha o 55. */
export function telefoneWhatsApp(t: string | null | undefined): string | null {
  const d = (t ?? "").replace(/\D/g, "");
  if (d.length === 10 || d.length === 11) return `55${d}`;
  if (d.length >= 12 && d.length <= 15) return d;
  return null;
}

/** Código curto e estável da reserva, derivado do id (o mesmo em todo canal). */
export function codigoReserva(id: string): string {
  return `TR-${id.replace(/-/g, "").slice(0, 6).toUpperCase()}`;
}

/** Dia e hora no fuso do restaurante, como o cliente lê: "sexta, 14/11" e "20:00". */
export function diaHora(inicio: Date, timeZone: string): { dia: string; hora: string } {
  const sem = new Intl.DateTimeFormat("pt-BR", { weekday: "long", timeZone }).format(inicio).split("-")[0] ?? "";
  const dm = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", timeZone }).format(inicio);
  const hora = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone }).format(inicio);
  return { dia: `${sem}, ${dm}`, hora };
}

/** Início de um tstzrange como o PostgREST devolve: ["2026-11-14 23:00:00+00","..."). */
export function inicioDoSlot(slot: string): Date | null {
  const m = /(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?)(Z|[+-]\d{2}(?::?\d{2})?)/.exec(slot);
  if (!m) return null;
  let tz = m[3]!;
  if (tz !== "Z") tz = tz.length === 3 ? `${tz}:00` : tz.includes(":") ? tz : `${tz.slice(0, 3)}:${tz.slice(3)}`;
  const d = new Date(`${m[1]}T${m[2]}${tz}`);
  return Number.isNaN(d.getTime()) ? null : d;
}
