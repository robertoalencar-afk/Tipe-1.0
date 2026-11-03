// Tipe Guest · motor de reservas: regras puras (sem React, sem Supabase).
// Espelham as funções da migração 0042 para o /demo e o app Expo calcularem o mesmo que o banco.
// A garantia contra overbooking é do Postgres (EXCLUDE em guest_table_allocations); aqui é só cálculo.

export const GUEST_RESERVATIONS_FLAG = "guest.reservations";

export type ReservationStatus =
  | "pendente"
  | "confirmada"
  | "chegou"
  | "sentada"
  | "concluida"
  | "cancelada_cliente"
  | "cancelada_restaurante"
  | "nao_compareceu";

export const RESERVATION_STATUS_LABEL: Record<ReservationStatus, string> = {
  pendente: "Pendente",
  confirmada: "Confirmada",
  chegou: "Chegou",
  sentada: "Sentada",
  concluida: "Concluída",
  cancelada_cliente: "Cancelada pelo cliente",
  cancelada_restaurante: "Cancelada pelo restaurante",
  nao_compareceu: "Não compareceu",
};

/** Mudanças feitas pela equipe (guest_reservation_transition_allowed na 0042). */
export const STAFF_TRANSITIONS: Readonly<Record<ReservationStatus, readonly ReservationStatus[]>> = {
  pendente: ["confirmada"],
  confirmada: ["chegou", "nao_compareceu"],
  chegou: ["sentada"],
  sentada: ["concluida"],
  concluida: [],
  cancelada_cliente: [],
  cancelada_restaurante: [],
  nao_compareceu: [],
};

export function staffTransitionAllowed(from: ReservationStatus, to: ReservationStatus) {
  return STAFF_TRANSITIONS[from].includes(to);
}

export type ReservationSettings = {
  /** Deslocamento do fuso do restaurante em minutos (America/Fortaleza = -180, sem horário de verão). */
  utcOffsetMin: number;
  slotIntervalMin: number;
  durationMin: number;
  bufferMin: number;
  minAdvanceMin: number;
  maxAdvanceDays: number;
  minParty: number;
  maxParty: number;
  cancelCutoffMin: number;
  holdTtlSec: number;
  autoConfirm: boolean;
};

/** Padrões da tabela guest_reservation_settings. */
export const DEFAULT_RESERVATION_SETTINGS: ReservationSettings = {
  utcOffsetMin: -180,
  slotIntervalMin: 15,
  durationMin: 90,
  bufferMin: 15,
  minAdvanceMin: 60,
  maxAdvanceDays: 30,
  minParty: 1,
  maxParty: 12,
  cancelCutoffMin: 120,
  holdTtlSec: 300,
  autoConfirm: true,
};

/** Turno: dia da semana (0 = domingo) e primeira/última chegada em minutos do dia local. */
export type AvailabilityRule = { weekday: number; firstSeatingMin: number; lastSeatingMin: number };
/** Exceção: sem mesa = restaurante inteiro. Faixas meio abertas [start, end). */
export type AvailabilityException = { start: Date; end: Date; tableId?: string | null };
export type ReservableTable = { id: string; seatsMin: number | null; seatsMax: number; active?: boolean };
export type TableCombination = { tableIds: string[]; seatsMin: number; seatsMax: number };
export type Occupation = { tableId: string; start: Date; end: Date };

const MIN = 60_000;

function local(d: Date, s: ReservationSettings) {
  const l = new Date(d.getTime() + s.utcOffsetMin * MIN);
  return { weekday: l.getUTCDay(), minuteOfDay: l.getUTCHours() * 60 + l.getUTCMinutes(), seconds: l.getUTCSeconds() };
}

const overlaps = (a0: Date, a1: Date, b0: Date, b1: Date) => a0 < b1 && b0 < a1;

/** Motivo pelo qual o horário não está aberto para o grupo, ou null (guest_slot_closed_reason). */
export function slotClosedReason(args: {
  start: Date;
  party: number;
  now: Date;
  settings: ReservationSettings;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
}): string | null {
  const { start, party, now, settings: s, rules, exceptions } = args;
  if (!Number.isInteger(party) || party < s.minParty || party > s.maxParty)
    return `Grupo fora do limite deste restaurante (${s.minParty} a ${s.maxParty} pessoas)`;
  if (start.getTime() < now.getTime() + s.minAdvanceMin * MIN) return "Antecedência mínima não atendida";
  if (start.getTime() > now.getTime() + s.maxAdvanceDays * 1440 * MIN) return "Data além da antecedência máxima";
  const l = local(start, s);
  if (l.seconds !== 0 || start.getUTCMilliseconds() !== 0 || l.minuteOfDay % s.slotIntervalMin !== 0)
    return "Horário fora da grade de reservas";
  if (!rules.some((r) => r.weekday === l.weekday && l.minuteOfDay >= r.firstSeatingMin && l.minuteOfDay <= r.lastSeatingMin))
    return "Restaurante sem reservas neste horário";
  const serviceEnd = new Date(start.getTime() + s.durationMin * MIN);
  if (exceptions.some((e) => !e.tableId && overlaps(e.start, e.end, start, serviceEnd))) return "Horário bloqueado pelo restaurante";
  return null;
}

/** Faixa que a mesa fica ocupada: duração mais o intervalo de arrumação. */
export function occupiedRange(start: Date, s: ReservationSettings) {
  return { start, end: new Date(start.getTime() + (s.durationMin + s.bufferMin) * MIN) };
}

/** Mesa ou combinação livre, preferindo a menor que cabe (guest_find_tables). */
export function findTables(args: {
  party: number;
  range: { start: Date; end: Date };
  tables: ReservableTable[];
  combinations: TableCombination[];
  occupations: Occupation[];
  exceptions: AvailabilityException[];
}): string[] | null {
  const { party, range, tables, combinations, occupations, exceptions } = args;
  const free = new Map(
    tables
      .filter((t) => t.active !== false)
      .filter((t) => !occupations.some((o) => o.tableId === t.id && overlaps(o.start, o.end, range.start, range.end)))
      .filter((t) => !exceptions.some((e) => e.tableId === t.id && overlaps(e.start, e.end, range.start, range.end)))
      .map((t) => [t.id, t] as const),
  );
  const options = [
    ...[...free.values()]
      .filter((t) => party >= (t.seatsMin ?? 1) && party <= t.seatsMax)
      .map((t) => ({ ids: [t.id], seats: t.seatsMax, kind: 0 })),
    ...combinations
      .filter((c) => party >= c.seatsMin && party <= c.seatsMax && c.tableIds.every((id) => free.has(id)))
      .map((c) => ({ ids: [...c.tableIds], seats: c.seatsMax, kind: 1 })),
  ].sort((a, b) => a.kind - b.kind || a.seats - b.seats || a.ids.join().localeCompare(b.ids.join()));
  return options[0]?.ids ?? null;
}

/** Horários de um dia (data local AAAA-MM-DD) que estão abertos e têm mesa livre (guest_available_slots). */
export function availableSlots(args: {
  day: string;
  party: number;
  now: Date;
  settings: ReservationSettings;
  rules: AvailabilityRule[];
  exceptions: AvailabilityException[];
  tables: ReservableTable[];
  combinations: TableCombination[];
  occupations: Occupation[];
}): Date[] {
  const { day, settings: s } = args;
  const midnightUtc = Date.parse(`${day}T00:00:00Z`) - s.utcOffsetMin * MIN;
  const weekday = new Date(Date.parse(`${day}T00:00:00Z`)).getUTCDay();
  const out: Date[] = [];
  for (const r of args.rules.filter((x) => x.weekday === weekday).sort((a, b) => a.firstSeatingMin - b.firstSeatingMin)) {
    for (let m = r.firstSeatingMin; m <= r.lastSeatingMin; m += s.slotIntervalMin) {
      const start = new Date(midnightUtc + m * MIN);
      if (slotClosedReason({ ...args, start }) !== null) continue;
      if (findTables({ ...args, range: occupiedRange(start, s) }) === null) continue;
      if (!out.some((d) => d.getTime() === start.getTime())) out.push(start);
    }
  }
  return out;
}

/** Cliente pode cancelar ou alterar pelo app? Só pendente/confirmada e até o prazo de corte. */
export function guestCanChange(args: { status: ReservationStatus; start: Date; now: Date; settings: ReservationSettings }) {
  const { status, start, now, settings } = args;
  if (status !== "pendente" && status !== "confirmada") return { ok: false, reason: "Esta reserva não pode mais ser alterada" } as const;
  if (now.getTime() > start.getTime() - settings.cancelCutoffMin * MIN)
    return { ok: false, reason: "Fora do prazo pelo app; fale com o restaurante" } as const;
  return { ok: true } as const;
}

/** A posição na lista de espera é sempre uma estimativa, nunca garantia. */
export function waitlistPositionLabel(position: number) {
  return position <= 1 ? "Você é o próximo, por estimativa" : `Cerca de ${position - 1} grupos na sua frente (estimativa)`;
}
