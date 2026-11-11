import { describe, expect, it } from "vitest";
import { distanceM, doorUrl, insideRadius, walkinPositionLabel } from "./fila";

const place = { lat: -3.7259, lng: -38.4987, radiusM: 150 };

describe("fila presencial", () => {
  it("distância de haversine em metros", () => {
    expect(distanceM(place.lat, place.lng, place.lat + 0.0009, place.lng)).toBeGreaterThan(95);
    expect(distanceM(place.lat, place.lng, place.lat + 0.0009, place.lng)).toBeLessThan(105);
    expect(distanceM(place.lat, place.lng, place.lat, place.lng)).toBe(0);
  });
  it("aceita perto da porta e recusa longe ou impreciso (como o banco)", () => {
    expect(insideRadius({ place, lat: place.lat + 0.0009, lng: place.lng, accuracyM: 25 })).toEqual(
      { ok: true },
    );
    expect(insideRadius({ place, lat: place.lat + 0.009, lng: place.lng, accuracyM: 25 })).toEqual({
      ok: false,
      reason: "longe",
    });
    expect(insideRadius({ place, lat: place.lat, lng: place.lng, accuracyM: 400 })).toEqual({
      ok: false,
      reason: "imprecisa",
    });
    // a folga para o GPS é limitada a 50 m: 210 m com precisão de 140 m não passa
    expect(
      insideRadius({ place, lat: place.lat + 0.00189, lng: place.lng, accuracyM: 140 }).ok,
    ).toBe(false);
  });
  it("QR da porta e texto da posição", () => {
    expect(doorUrl("https://tipe.digital/", "mare-alta", "abc")).toBe(
      "https://tipe.digital/mare-alta/fila?t=abc",
    );
    expect(walkinPositionLabel(1)).toBe("Você é o próximo");
    expect(walkinPositionLabel(2)).toBe("1 grupo na sua frente");
    expect(walkinPositionLabel(4)).toBe("3 grupos na sua frente");
  });
});
