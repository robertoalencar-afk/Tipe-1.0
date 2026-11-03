// Tipe Guest · acesso do servidor ao motor de reservas (0042). Só o servidor chama as funções do banco
// (service_role); quem chama aqui já validou a sessão do usuário. Toda escrita passa por limite por
// usuário e por IP antes de chegar ao banco, que ainda revalida flag, regras e capacidade.
import { clientIp, enforceRate } from "@/lib/tipe/security.server";

async function db() {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return supabaseAdmin;
}

export class ReservationError extends Error {
  status = 409;
}

async function rpc<T>(fn: string, args: Record<string, unknown>): Promise<T> {
  const { data, error } = await (await db()).rpc(fn as never, args as never);
  // As mensagens do banco são escritas para o cliente (ex.: "Sem mesa disponível...").
  if (error) throw new ReservationError(error.message);
  return data as T;
}

async function limit(action: string, userId: string | null, max: number) {
  await enforceRate(`guest:${action}:ip:${clientIp()}`, max * 3, 60);
  if (userId) await enforceRate(`guest:${action}:user:${userId}`, max, 60);
}

export async function createHold(a: {
  restaurantId: string;
  userId: string | null;
  sessionKey: string;
  party: number;
  start: string;
}) {
  await limit("hold", a.userId, 10);
  const rows = await rpc<{ hold_id: string; expires_at: string; table_ids: string[] }[]>(
    "guest_create_hold",
    {
      p_restaurant_id: a.restaurantId,
      p_guest_user_id: a.userId,
      p_session_key: a.sessionKey,
      p_party: a.party,
      p_start: a.start,
    },
  );
  const h = rows[0];
  if (!h) throw new ReservationError("Não foi possível segurar o horário");
  return { holdId: h.hold_id, expiresAt: h.expires_at };
}

export async function confirmReservation(a: {
  holdId: string;
  sessionKey: string;
  idempotencyKey: string;
  userId: string | null;
  name: string;
  phone?: string | null;
  notes?: string | null;
  occasion?: string | null;
  channel?: "guest_app" | "web" | "painel" | "telefone";
}) {
  await limit("confirm", a.userId, 10);
  return rpc<string>("guest_confirm_reservation", {
    p_hold_id: a.holdId,
    p_session_key: a.sessionKey,
    p_idempotency_key: a.idempotencyKey,
    p_guest_name: a.name,
    p_guest_phone: a.phone ?? null,
    p_notes: a.notes ?? null,
    p_occasion: a.occasion ?? null,
    p_channel: a.channel ?? "guest_app",
  });
}

export async function cancelReservation(a: {
  reservationId: string;
  actorId: string;
  by: "cliente" | "restaurante";
  reason?: string | undefined;
}) {
  await limit("cancel", a.actorId, 10);
  return rpc<string>("guest_cancel_reservation", {
    p_reservation_id: a.reservationId,
    p_actor: a.actorId,
    p_by: a.by,
    p_reason: a.reason ?? null,
  });
}

export async function changeReservation(a: {
  reservationId: string;
  userId: string;
  start: string;
  party: number;
}) {
  await limit("change", a.userId, 10);
  return rpc<string[]>("guest_change_reservation", {
    p_reservation_id: a.reservationId,
    p_actor: a.userId,
    p_new_start: a.start,
    p_new_party: a.party,
  });
}

export async function setReservationStatus(a: {
  reservationId: string;
  actorId: string;
  to: string;
}) {
  await limit("status", a.actorId, 60);
  return rpc<string>("guest_set_reservation_status", {
    p_reservation_id: a.reservationId,
    p_actor: a.actorId,
    p_to: a.to,
  });
}

export async function availableSlots(a: { restaurantId: string; day: string; party: number }) {
  await limit("slots", null, 60);
  return rpc<string[]>("guest_available_slots", {
    p_restaurant_id: a.restaurantId,
    p_day: a.day,
    p_party: a.party,
  });
}

const range = (from: string, to: string) => `[${from},${to})`;

export async function joinWaitlist(a: {
  restaurantId: string;
  userId: string;
  name: string;
  party: number;
  from: string;
  to: string;
}) {
  await limit("waitlist", a.userId, 5);
  const rows = await rpc<{ entry_id: string; position_estimate: number }[]>("guest_join_waitlist", {
    p_restaurant_id: a.restaurantId,
    p_guest_user_id: a.userId,
    p_guest_name: a.name,
    p_party: a.party,
    p_wanted: range(a.from, a.to),
  });
  return { entryId: rows[0]?.entry_id, positionEstimate: rows[0]?.position_estimate };
}

export async function createAlert(a: {
  restaurantId: string;
  userId: string;
  party: number;
  from: string;
  to: string;
}) {
  await limit("alert", a.userId, 5);
  return rpc<string>("guest_create_alert", {
    p_restaurant_id: a.restaurantId,
    p_guest_user_id: a.userId,
    p_party: a.party,
    p_wanted: range(a.from, a.to),
  });
}

export async function seatReservation(a: {
  reservationId: string;
  actorId: string;
  tableId: string;
}) {
  await limit("seat", a.actorId, 60);
  return rpc<string>("guest_seat_reservation", {
    p_reservation_id: a.reservationId,
    p_actor: a.actorId,
    p_table_id: a.tableId,
  });
}

export async function callWaitlist(a: { entryId: string; actorId: string; minutes?: number }) {
  await limit("waitlist_call", a.actorId, 30);
  return rpc<string>("guest_call_waitlist", {
    p_entry_id: a.entryId,
    p_actor: a.actorId,
    p_minutes: a.minutes ?? 15,
  });
}
