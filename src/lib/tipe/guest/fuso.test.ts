import { describe, expect, it } from "vitest";
import {
  DEFAULT_RESERVATION_SETTINGS as D,
  dayRange,
  localDay,
  localInstant,
  localTime,
  offsetAt,
} from "./reservas";

const FOR = { utcOffsetMin: -180, timeZone: "America/Fortaleza" };
const NY = { utcOffsetMin: 0, timeZone: "America/New_York" };

describe("fuso IANA do restaurante", () => {
  it("sem timeZone usa o deslocamento fixo (comportamento antigo)", () => {
    expect(offsetAt(new Date("2026-11-10T12:00:00Z"), D)).toBe(-180);
    expect(localTime(new Date("2026-11-10T23:30:00Z"))).toBe("20:30");
  });

  it("America/Fortaleza dá -180 o ano todo", () => {
    expect(offsetAt(new Date("2026-01-15T12:00:00Z"), FOR)).toBe(-180);
    expect(offsetAt(new Date("2026-07-15T12:00:00Z"), FOR)).toBe(-180);
  });

  it("IANA prevalece sobre o deslocamento fixo", () => {
    expect(offsetAt(new Date("2026-07-15T12:00:00Z"), NY)).toBe(-240);
    expect(offsetAt(new Date("2026-12-15T12:00:00Z"), NY)).toBe(-300);
  });

  it("dia local e hora local no fuso certo", () => {
    const d = new Date("2026-11-11T02:30:00Z");
    expect(localDay(d, FOR)).toBe("2026-11-10");
    expect(localTime(d, FOR)).toBe("23:30");
  });

  it("instante de 20:00 local em Fortaleza", () => {
    expect(localInstant("2026-11-10", "20:00", FOR).toISOString()).toBe("2026-11-10T23:00:00.000Z");
  });

  it("dia com mudança de horário de verão tem 23 horas", () => {
    const r = dayRange("2026-03-08", NY);
    expect((r.end.getTime() - r.start.getTime()) / 3_600_000).toBe(23);
    expect(localInstant("2026-03-08", "19:00", NY).toISOString()).toBe("2026-03-08T23:00:00.000Z");
  });

  it("ida e volta: horário local vira o mesmo horário", () => {
    for (const hh of ["00:00", "12:15", "23:45"]) {
      expect(localTime(localInstant("2026-11-10", hh, FOR), FOR)).toBe(hh);
      expect(localTime(localInstant("2026-07-04", hh, NY), NY)).toBe(hh);
    }
  });
});
