import { FUSOS_FISCAIS_BR } from "./contract";
/** Hora da emissão no fuso escolhido para o estabelecimento, com offset ISO. */
export function instanteFiscal(now: Date, timeZone: string) {
  if (
    !FUSOS_FISCAIS_BR.includes(timeZone as (typeof FUSOS_FISCAIS_BR)[number]) ||
    !Number.isFinite(now.getTime())
  )
    throw new Error("Fuso fiscal inválido");
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
    timeZoneName: "longOffset",
  }).formatToParts(now);
  const part = (name: string) => parts.find((p) => p.type === name)?.value ?? "";
  const offset = part("timeZoneName").replace(/^GMT/, "") || "+00:00";
  if (!/^[+-]\d{2}:\d{2}$/.test(offset)) throw new Error("Offset fiscal inválido");
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}:${part("second")}${offset}`;
}
