// Tipe Reserva · mensagens ao cliente (Fase 6). PREPARADAS, NÃO ENVIADAS: nada aqui chama Resend
// nem WhatsApp. O envio real depende de ok do Roberto, chaves (RESEND / Meta) e modelos aprovados
// pela Meta. Até lá, prepararMensagem só monta o conteúdo e diz que o envio está desligado.

export const ENVIO_RESERVA_HABILITADO = false as const;

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

export type MensagemPreparada = {
  canal: Canal;
  tipo: TipoMensagem;
  assunto: string;
  corpo: string;
  enviar: false;
  motivo: "envio_desligado";
};

/** Monta a mensagem. Nunca envia: enviar é sempre false enquanto o envio estiver desligado. */
export function prepararMensagem(
  canal: Canal,
  tipo: TipoMensagem,
  d: DadosMensagem,
): MensagemPreparada {
  const t = TEXTOS[tipo](d);
  return { canal, tipo, ...t, enviar: false, motivo: "envio_desligado" };
}
