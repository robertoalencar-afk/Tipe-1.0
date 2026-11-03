import { describe, expect, it } from "vitest";
import {
  availableSlots,
  DEFAULT_RESERVATION_SETTINGS,
  findTables,
  guestCanChange,
  occupiedRange,
  slotClosedReason,
  staffTransitionAllowed,
  waitlistPositionLabel,
  type AvailabilityRule,
  type ReservableTable,
} from "./reservas";

// Mesmos cenários de tests/db/guest-reservas.sql, calculados sem banco.
const s = { ...DEFAULT_RESERVATION_SETTINGS, slotIntervalMin: 30, maxParty: 8 };
const now = new Date("2026-11-03T12:00:00Z"); // 09:00 em Fortaleza
const at = (iso: string) => new Date(`${iso}-03:00`);
const rules: AvailabilityRule[] = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, firstSeatingMin: 11 * 60, lastSeatingMin: 23 * 60 }));
const tables: ReservableTable[] = [
  { id: "r2", seatsMin: 1, seatsMax: 2 },
  { id: "r4", seatsMin: 2, seatsMax: 4 },
];
const combinations = [{ tableIds: ["r2", "r4"], seatsMin: 5, seatsMax: 6 }];
const base = { now, settings: s, rules, exceptions: [], tables, combinations, occupations: [] };

describe("regras do horário", () => {
  it("aceita horário na grade, no turno e com antecedência", () => {
    expect(slotClosedReason({ ...base, start: at("2026-11-06T19:00:00"), party: 2 })).toBeNull();
  });
  it("recusa fora da grade, fora do turno, cedo demais, longe demais e grupo inválido", () => {
    expect(slotClosedReason({ ...base, start: at("2026-11-06T19:10:00"), party: 2 })).toMatch(/grade/);
    expect(slotClosedReason({ ...base, start: at("2026-11-06T03:00:00"), party: 2 })).toMatch(/sem reservas/);
    expect(slotClosedReason({ ...base, start: at("2026-11-03T09:30:00"), party: 2 })).toMatch(/mínima/);
    expect(slotClosedReason({ ...base, start: at("2027-01-10T19:00:00"), party: 2 })).toMatch(/máxima/);
    expect(slotClosedReason({ ...base, start: at("2026-11-06T19:00:00"), party: 9 })).toMatch(/Grupo/);
  });
  it("feriado do restaurante inteiro bloqueia; bloqueio de uma mesa não", () => {
    const feriado = { start: at("2026-11-07T00:00:00"), end: at("2026-11-08T00:00:00") };
    expect(slotClosedReason({ ...base, exceptions: [feriado], start: at("2026-11-07T19:00:00"), party: 2 })).toMatch(/bloqueado/);
    expect(slotClosedReason({ ...base, exceptions: [{ ...feriado, tableId: "r2" }], start: at("2026-11-07T19:00:00"), party: 2 })).toBeNull();
  });
});

describe("mesas", () => {
  const range = occupiedRange(at("2026-11-06T19:00:00"), s);
  it("ocupação inclui duração e intervalo de arrumação", () => {
    expect((range.end.getTime() - range.start.getTime()) / 60_000).toBe(s.durationMin + s.bufferMin);
  });
  it("prefere a menor mesa que cabe e usa combinação para grupo maior", () => {
    expect(findTables({ ...base, party: 2, range })).toEqual(["r2"]);
    expect(findTables({ ...base, party: 3, range })).toEqual(["r4"]);
    expect(findTables({ ...base, party: 6, range })).toEqual(["r2", "r4"]);
    expect(findTables({ ...base, party: 7, range })).toBeNull();
  });
  it("mesa ocupada em faixa sobreposta não é oferecida; faixa encostada é", () => {
    const occ = [{ tableId: "r2", ...range }];
    expect(findTables({ ...base, occupations: occ, party: 2, range })).toEqual(["r4"]);
    const depois = occupiedRange(range.end, s);
    expect(findTables({ ...base, occupations: occ, party: 2, range: depois })).toEqual(["r2"]);
  });
});

describe("horários do dia", () => {
  it("exclui o horário lotado e mantém os livres", () => {
    const r19 = occupiedRange(at("2026-11-06T19:00:00"), s);
    const occupations = [{ tableId: "r2", ...r19 }, { tableId: "r4", ...r19 }];
    const slots = availableSlots({ ...base, occupations, day: "2026-11-06", party: 2 }).map((d) => d.getTime());
    expect(slots).not.toContain(at("2026-11-06T19:00:00").getTime());
    expect(slots).not.toContain(at("2026-11-06T20:30:00").getTime());
    expect(slots).toContain(at("2026-11-06T13:00:00").getTime());
    expect(slots).toContain(at("2026-11-06T21:00:00").getTime());
  });
});

describe("estados e política", () => {
  it("equipe segue a ordem pendente → confirmada → chegou → sentada → concluída", () => {
    expect(staffTransitionAllowed("confirmada", "chegou")).toBe(true);
    expect(staffTransitionAllowed("confirmada", "sentada")).toBe(false);
    expect(staffTransitionAllowed("concluida", "sentada")).toBe(false);
  });
  it("cliente muda só dentro do prazo e só reservas ativas", () => {
    const start = at("2026-11-06T19:00:00");
    expect(guestCanChange({ status: "confirmada", start, now, settings: s }).ok).toBe(true);
    expect(guestCanChange({ status: "confirmada", start: new Date(now.getTime() + 30 * 60_000), now, settings: s }).ok).toBe(false);
    expect(guestCanChange({ status: "sentada", start, now, settings: s }).ok).toBe(false);
  });
  it("posição na lista de espera aparece como estimativa", () => {
    expect(waitlistPositionLabel(1)).toMatch(/estimativa/);
    expect(waitlistPositionLabel(3)).toMatch(/2 grupos.*estimativa/);
  });
});
