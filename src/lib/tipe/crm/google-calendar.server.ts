const TIME_ZONE = "America/Fortaleza";

export class AgendaGoogleError extends Error {
  constructor(readonly code: "not_configured" | "busy" | "unavailable" | "meet_pending") {
    super(code);
  }
}

function partesFortaleza(date: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const value = (kind: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === kind)?.value ?? "";
  const weekdays: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };
  return {
    year: Number(value("year")),
    month: Number(value("month")),
    day: Number(value("day")),
    weekday: weekdays[value("weekday")] ?? 0,
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

/** Interpreta horários como “segunda às 10h” no fuso de Fortaleza. */
export function horarioDemo(texto: string, agora = new Date()): Date | null {
  const lower = texto.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const horaMatch =
    lower.match(/(?:as?)\s*(\d{1,2})(?::(\d{2})|h\s*(\d{2})?)?(?:\s*(?:da|de)\s*(manha|tarde|noite))?/) ??
    lower.match(/\b(\d{1,2})\s*h(?:\s*(\d{2}))?\b/);
  if (!horaMatch) return null;
  let hour = Number(horaMatch[1]);
  const minute = Number(horaMatch[2] ?? horaMatch[3] ?? 0);
  const periodo = horaMatch[4];
  if (periodo === "tarde" && hour < 12) hour += 12;
  if (periodo === "noite" && hour < 12) hour += 12;
  if (hour < 8 || hour >= 18 || minute > 59) return null;

  const localNow = partesFortaleza(agora);
  let year = localNow.year;
  let month = localNow.month;
  let day = localNow.day;

  const dateMatch = lower.match(/\b(\d{1,2})[/. -](\d{1,2})(?:[/. -](\d{2,4}))?\b/);
  const weekdays: Record<string, number> = {
    domingo: 0,
    segunda: 1,
    "segunda feira": 1,
    terca: 2,
    "terca feira": 2,
    quarta: 3,
    "quarta feira": 3,
    quinta: 4,
    "quinta feira": 4,
    sexta: 5,
    "sexta feira": 5,
    sabado: 6,
  };
  const weekdayMatch = lower.match(/\b(domingo|segunda(?:-feira)?|terca(?:-feira)?|quarta(?:-feira)?|quinta(?:-feira)?|sexta(?:-feira)?|sabado)\b/);
  const tomorrow = /\bamanha\b/.test(lower);
  const today = /\bhoje\b/.test(lower);

  if (dateMatch) {
    day = Number(dateMatch[1]);
    month = Number(dateMatch[2]);
    if (dateMatch[3]) year = Number(dateMatch[3].length === 2 ? "20" + dateMatch[3] : dateMatch[3]);
    const probe = new Date(Date.UTC(year, month - 1, day));
    if (probe.getUTCMonth() !== month - 1 || probe.getUTCDate() !== day) return null;
    if (!dateMatch[3] && probe.getTime() < Date.UTC(localNow.year, localNow.month - 1, localNow.day))
      year += 1;
  } else if (weekdayMatch) {
    const key = weekdayMatch[1].replace("-feira", "");
    const target = weekdays[key] ?? weekdays[key.replace("-", " ")] ?? 0;
    const todayUtc = Date.UTC(year, month - 1, day);
    let delta = (target - localNow.weekday + 7) % 7;
    if (delta === 0 && (hour < localNow.hour || (hour === localNow.hour && minute <= localNow.minute)))
      delta = 7;
    const chosen = new Date(todayUtc + delta * 86_400_000);
    year = chosen.getUTCFullYear();
    month = chosen.getUTCMonth() + 1;
    day = chosen.getUTCDate();
  } else if (tomorrow) {
    const chosen = new Date(Date.UTC(year, month - 1, day) + 86_400_000);
    year = chosen.getUTCFullYear();
    month = chosen.getUTCMonth() + 1;
    day = chosen.getUTCDate();
  } else if (!today) {
    return null;
  }

  const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
  if (weekday === 0 || weekday === 6) return null;
  const start = new Date(Date.UTC(year, month - 1, day, hour + 3, minute));
  if (start.getTime() <= agora.getTime() + 20 * 60_000) return null;
  return start;
}

export function formatoDemoFortaleza(date: Date): string {
  const dia = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(date);
  const hora = new Intl.DateTimeFormat("pt-BR", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);
  return dia + ", às " + hora;
}

type Evento = {
  id?: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: Array<{ entryPointType?: string; uri?: string }> };
  start?: { dateTime?: string; date?: string };
  end?: { dateTime?: string; date?: string };
  status?: string;
  transparency?: string;
};

async function tokenGoogle(): Promise<string> {
  const clientId = process.env["GOOGLE_CALENDAR_CLIENT_ID"];
  const clientSecret = process.env["GOOGLE_CALENDAR_CLIENT_SECRET"];
  const refreshToken = process.env["GOOGLE_CALENDAR_REFRESH_TOKEN"];
  if (!clientId || !clientSecret || !refreshToken) throw new AgendaGoogleError("not_configured");
  const body = new URLSearchParams({
    client_id: clientId,
    client_secret: clientSecret,
    refresh_token: refreshToken,
    grant_type: "refresh_token",
  });
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!res?.ok) throw new AgendaGoogleError("unavailable");
  const data = (await res.json().catch(() => ({}))) as { access_token?: string };
  if (!data.access_token) throw new AgendaGoogleError("unavailable");
  return data.access_token;
}

async function calendarFetch<T>(token: string, path: string, init?: RequestInit): Promise<T> {
  const res = await fetch("https://www.googleapis.com/calendar/v3/calendars/primary" + path, {
    ...init,
    headers: { Authorization: "Bearer " + token, "Content-Type": "application/json", ...init?.headers },
    signal: AbortSignal.timeout(8_000),
  }).catch(() => null);
  if (!res?.ok) throw new AgendaGoogleError("unavailable");
  return (await res.json()) as T;
}

function meetLink(event: Evento): string | undefined {
  return (
    event.hangoutLink ??
    event.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ??
    undefined
  );
}

/** Verifica a agenda e cria evento de 20 min com Google Meet, sem enviar convite por e-mail. */
export async function criarGoogleMeet(input: {
  conversationId: string;
  inicio: Date;
  restaurante: string;
  contato: string;
  dor?: string;
}): Promise<{ eventId: string; link: string }> {
  const token = await tokenGoogle();
  const fim = new Date(input.inicio.getTime() + 20 * 60_000);
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input.conversationId + "|" + input.inicio.toISOString()));
  const eventId = "tipe" + Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 40);
  const eventPath = "/events/" + eventId;
  let existente: Evento | undefined;
  try {
    existente = await calendarFetch<Evento>(token, eventPath);
  } catch {
    existente = undefined;
  }
  if (existente && meetLink(existente)) return { eventId, link: meetLink(existente)! };

  if (!existente) {
    const qs = new URLSearchParams({
      timeMin: input.inicio.toISOString(),
      timeMax: fim.toISOString(),
      singleEvents: "true",
      orderBy: "startTime",
      maxResults: "20",
    });
    const list = await calendarFetch<{ items?: Evento[] }>(token, "/events?" + qs);
    const ocupados = (list.items ?? []).filter((event) => event.status !== "cancelled" && event.transparency !== "transparent");
    const conflito = ocupados.some((event) => {
      const start = event.start?.dateTime ? Date.parse(event.start.dateTime) : event.start?.date ? Date.parse(event.start.date + "T00:00:00-03:00") : NaN;
      const end = event.end?.dateTime ? Date.parse(event.end.dateTime) : event.end?.date ? Date.parse(event.end.date + "T00:00:00-03:00") : NaN;
      return Number.isFinite(start) && Number.isFinite(end) && start < fim.getTime() && end > input.inicio.getTime();
    });
    if (conflito) throw new AgendaGoogleError("busy");

    const created = await calendarFetch<Evento>(token, "/events?conferenceDataVersion=1&sendUpdates=none", {
      method: "POST",
      body: JSON.stringify({
        id: eventId,
        summary: "Demonstração Tipe Pay — " + input.restaurante,
        description: [
          "Contato: " + input.contato,
          input.dor ? "Principal desafio: " + input.dor : "",
          "Demonstração comercial da Tipe.",
        ].filter(Boolean).join("\n"),
        start: { dateTime: input.inicio.toISOString(), timeZone: TIME_ZONE },
        end: { dateTime: fim.toISOString(), timeZone: TIME_ZONE },
        conferenceData: {
          createRequest: {
            requestId: eventId,
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
      }),
    });
    existente = created;
  }

  for (let tentativa = 0; tentativa < 6; tentativa++) {
    const link = existente ? meetLink(existente) : undefined;
    if (link) return { eventId, link };
    await new Promise((resolve) => setTimeout(resolve, 900));
    existente = await calendarFetch<Evento>(token, eventPath);
  }
  throw new AgendaGoogleError("meet_pending");
}
