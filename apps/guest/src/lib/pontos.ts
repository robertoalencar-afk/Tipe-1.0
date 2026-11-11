// Tipe Guest · programa de pontos (modo demonstração; valores a confirmar com o Roberto).
// Ganha na reserva honrada (quando a recepção leva à mesa), com bônus em horário mais calmo,
// que ajuda o restaurante a encher a casa fora do pico. 1.000 pontos viram R$ 10,00 de crédito.
import { localTime } from "@core/reservas";

export const PONTOS_RESERVA = 100;
export const BONUS_HORARIO_CALMO = 300;
export const PONTOS_POR_RESGATE = 1000;
/** Crédito de um resgate, em centavos. */
export const CREDITO_RESGATE = 1000;

/** Horário calmo: almoço depois das 14h, jantar antes das 19h30 ou a partir das 21h30 (Fortaleza). */
export function horarioCalmo(d: Date) {
  const hm = localTime(d);
  return (hm >= "14:00" && hm < "18:00") || hm < "12:00" || (hm >= "18:00" && hm < "19:30") || hm >= "21:30";
}

export function pontosDaReserva(d: Date) {
  return PONTOS_RESERVA + (horarioCalmo(d) ? BONUS_HORARIO_CALMO : 0);
}

export const fmtPontos = (n: number) => `${n.toLocaleString("pt-BR")} pts`;
