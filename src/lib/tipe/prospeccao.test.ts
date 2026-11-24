import { describe, expect, it } from "vitest";
import {
  aposToque,
  atendeNoite,
  canalDoPasso,
  consultaOverpass,
  deOsm,
  ehCelular,
  faixa,
  filaDoDia,
  foneBR,
  foneLegivel,
  linkWhatsapp,
  mensagem,
  poloDe,
  processarOsm,
  type ElementoOsm,
} from "./prospeccao";

const el = (
  id: number,
  tags: Record<string, string>,
  extra: Partial<ElementoOsm> = {},
): ElementoOsm => ({ type: "node", id, lat: -3.731, lon: -38.49, tags, ...extra });

describe("foneBR", () => {
  it("normaliza formatos comuns de Fortaleza", () => {
    expect(foneBR("+55 85 99876-5432")).toBe("5585998765432");
    expect(foneBR("(85) 3261-1234")).toBe("558532611234");
    expect(foneBR("98765-4321")).toBe("5585987654321");
    expect(foneBR("0xx85 3261 1234")).toBe("558532611234");
    expect(foneBR("+55 85 3261-1234; +55 85 99999-0000")).toBe("558532611234");
  });
  it("rejeita lixo e celular sem 9", () => {
    expect(foneBR("123")).toBeNull();
    expect(foneBR("85 81234-5678")).toBeNull();
    expect(foneBR(undefined)).toBeNull();
  });
  it("identifica celular e formata", () => {
    expect(ehCelular("5585998765432")).toBe(true);
    expect(ehCelular("558532611234")).toBe(false);
    expect(foneLegivel("5585998765432")).toBe("(85) 99876-5432");
    expect(foneLegivel("558532611234")).toBe("(85) 3261-1234");
  });
});

describe("deOsm", () => {
  it("extrai só dados públicos de empresa", () => {
    const p = deOsm(
      el(1, {
        amenity: "restaurant",
        name: " Cantinho  do Peixe ",
        phone: "85 99876-5432",
        website: "cantinho.com.br",
        "contact:instagram": "https://instagram.com/Cantinho.Peixe/",
        "addr:street": "Rua Frederico Borges",
        "addr:housenumber": "409",
        opening_hours: "Mo-Su 11:00-23:00",
        cuisine: "seafood",
      }),
      "Fortaleza",
      "CE",
    )!;
    expect(p).toMatchObject({
      source: "osm",
      source_ref: "node/1",
      name: "Cantinho do Peixe",
      category: "restaurant",
      phone: "5585998765432",
      whatsapp: "5585998765432",
      website: "https://cantinho.com.br/",
      instagram: "cantinho.peixe",
      city: "Fortaleza",
      state: "CE",
    });
  });
  it("ignora sem nome, categoria fora do escopo ou desativado", () => {
    expect(deOsm(el(2, { amenity: "restaurant" }), "Fortaleza", "CE")).toBeNull();
    expect(deOsm(el(3, { amenity: "bank", name: "Banco" }), "Fortaleza", "CE")).toBeNull();
    expect(
      deOsm(el(4, { amenity: "bar", name: "Bar Velho", disused: "yes" }), "Fortaleza", "CE"),
    ).toBeNull();
  });
  it("usa o centro de ways e não aceita site de rede social", () => {
    const p = deOsm(
      {
        type: "way",
        id: 9,
        center: { lat: -3.74, lon: -38.5 },
        tags: { amenity: "bar", name: "Boteco", website: "https://facebook.com/boteco" },
      },
      "Fortaleza",
      "CE",
    )!;
    expect(p.lat).toBe(-3.74);
    expect(p.website).toBeNull();
  });
});

describe("whatsapp", () => {
  it("ignora fixo marcado como WhatsApp e usa celular do telefone", () => {
    const a = deOsm(
      el(5, { amenity: "bar", name: "B", "contact:whatsapp": "85 3261-1234" }),
      "Fortaleza",
      "CE",
    )!;
    expect(a.whatsapp).toBeNull();
    const b = deOsm(
      el(6, {
        amenity: "bar",
        name: "B",
        "contact:whatsapp": "85 3261-1234",
        phone: "85 99876-5432",
      }),
      "Fortaleza",
      "CE",
    )!;
    expect(b.whatsapp).toBe("5585998765432");
  });
});

describe("score", () => {
  it("restaurante com WhatsApp no polo e jantar fica na faixa A; lanchonete sem contato fica C", () => {
    const [a] = processarOsm(
      [
        el(1, {
          amenity: "restaurant",
          name: "A",
          phone: "85 99876-5432",
          "contact:instagram": "a",
          opening_hours: "18:00-23:30",
          cuisine: "japanese",
        }),
      ],
      "Fortaleza",
      "CE",
    );
    expect(faixa(a!.score)).toBe("A");
    expect(a!.score_reasons.some((r) => r.includes("Polo gastronômico"))).toBe(true);
    const [c] = processarOsm(
      [el(2, { amenity: "fast_food", name: "C" }, { lat: -3.85, lon: -38.6 })],
      "Fortaleza",
      "CE",
    );
    expect(faixa(c!.score)).toBe("C");
  });
  it("rede/franquia perde pontos", () => {
    const base = { amenity: "restaurant", name: "X", phone: "85 3261-1234" };
    const [solo] = processarOsm([el(1, base)], "Fortaleza", "CE");
    const [rede] = processarOsm([el(1, { ...base, brand: "Rede" })], "Fortaleza", "CE");
    expect(rede!.score).toBeLessThan(solo!.score);
  });
  it("polo por coordenada ou bairro", () => {
    expect(
      poloDe({ city: "Fortaleza", lat: -3.7305, lon: -38.4905, neighborhood: null }),
    ).toContain("Varjota");
    expect(poloDe({ city: "Fortaleza", lat: -3.9, lon: -38.6, neighborhood: "Aldeota" })).toBe(
      "Aldeota",
    );
    expect(
      poloDe({ city: "Fortaleza", lat: -3.9, lon: -38.6, neighborhood: "Messejana" }),
    ).toBeNull();
  });
  it("lê horário noturno", () => {
    expect(atendeNoite("Mo-Fr 11:00-15:00")).toBe(false);
    expect(atendeNoite("Mo-Sa 11:00-15:00, 18:00-23:00")).toBe(true);
    expect(atendeNoite("Fr-Sa 17:00-02:00")).toBe(true);
    expect(atendeNoite(null)).toBe(false);
  });
  it("remove duplicados por telefone ficando com o melhor", () => {
    const l = processarOsm(
      [
        el(1, { amenity: "fast_food", name: "Pizzaria Z", phone: "85 3261-1234" }),
        el(2, { amenity: "restaurant", name: "Pizzaria Z Delivery", phone: "(85) 3261-1234" }),
      ],
      "Fortaleza",
      "CE",
    );
    expect(l).toHaveLength(1);
    expect(l[0]!.category).toBe("restaurant");
  });
});

describe("cadência", () => {
  const agora = new Date("2026-11-24T12:00:00Z");
  it("sem resposta avança para o próximo passo no dia certo", () => {
    const r = aposToque(1, "sem_resposta", agora);
    expect(r).toMatchObject({ status: "em_contato", cadence_step: 1 });
    expect(r.next_touch_at).toBe("2026-11-26T12:00:00.000Z");
    expect(aposToque(5, "sem_resposta", agora).status).toBe("descartado");
  });
  it("opt-out e sem interesse encerram; resposta vira prioridade", () => {
    expect(aposToque(2, "opt_out", agora)).toEqual({
      status: "opt_out",
      cadence_step: 2,
      next_touch_at: null,
    });
    expect(aposToque(2, "sem_interesse", agora).status).toBe("descartado");
    expect(aposToque(3, "interessado", agora).status).toBe("respondeu");
  });
  it("troca de canal quando falta telefone", () => {
    expect(canalDoPasso(1, { phone: null, whatsapp: null, instagram: "x", email: null })).toBe(
      "instagram",
    );
    expect(
      canalDoPasso(1, { phone: "558532611234", whatsapp: null, instagram: null, email: null }),
    ).toBe("ligacao");
    expect(canalDoPasso(2, { phone: null, whatsapp: null, instagram: null, email: null })).toBe(
      "visita",
    );
  });
  it("mensagens escritas trazem a saída (LGPD)", () => {
    for (const passo of [1, 3, 4])
      expect(mensagem(passo, { name: "Bar X", category: "bar", neighborhood: null })).toContain(
        "responder SAIR",
      );
    expect(linkWhatsapp("5585998765432", "olá & tudo")).toBe(
      "https://wa.me/5585998765432?text=ol%C3%A1%20%26%20tudo",
    );
  });
  it("fila do dia: respondeu, depois vencidos, depois melhores novos até o limite", () => {
    const l = [
      { id: "n1", status: "novo" as const, score: 50, next_touch_at: null },
      { id: "n2", status: "novo" as const, score: 90, next_touch_at: null },
      { id: "c1", status: "em_contato" as const, score: 10, next_touch_at: "2026-11-23T10:00:00Z" },
      { id: "c2", status: "em_contato" as const, score: 99, next_touch_at: "2026-12-10T10:00:00Z" },
      { id: "r1", status: "respondeu" as const, score: 5, next_touch_at: "2026-11-24T09:00:00Z" },
      { id: "o1", status: "opt_out" as const, score: 100, next_touch_at: null },
    ];
    expect(filaDoDia(l, agora, 1).map((x) => x.id)).toEqual(["r1", "c1", "n2"]);
  });
});

describe("consultaOverpass", () => {
  it("limita ao município e escapa aspas", () => {
    const q = consultaOverpass('For"taleza', "ce");
    expect(q).toContain('area["ISO3166-2"="BR-CE"]');
    expect(q).toContain('["name"="Fortaleza"]');
    expect(q).toContain("restaurant|bar");
  });
});
