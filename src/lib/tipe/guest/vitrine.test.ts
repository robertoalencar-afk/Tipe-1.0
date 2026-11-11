import { describe, expect, it } from "vitest";
import {
  colecoes,
  destaquePago,
  filtrar,
  horariosLivres,
  ordenar,
  perguntarLebre,
  podeAlocar,
  VITRINE,
} from "./vitrine";

const ids = (l: { id: string }[]) => l.map((x) => x.id);

describe("vitrine do Tipe Guest", () => {
  it("busca ignora acento e caixa e olha nome, cozinha, bairro e tags", () => {
    expect(ids(filtrar(VITRINE, { texto: "SERTAO" }))).toEqual(["brasa-do-sertao"]);
    expect(ids(filtrar(VITRINE, { texto: "iracema" }))).toEqual(["jangada-cafe"]);
  });

  it("filtros se somam", () => {
    const r = filtrar(VITRINE, { precos: [1], fundador: true });
    expect(ids(r)).toEqual(["boteco-do-farol"]);
  });

  it("relevância não sobe o patrocinado de graça", () => {
    const semPatrocinio = VITRINE.map((r) => ({ ...r, patrocinado: false }));
    expect(ids(ordenar(VITRINE, "relevancia"))).toEqual(ids(ordenar(semPatrocinio, "relevancia")));
    expect(destaquePago(VITRINE)?.id).toBe("mare-alta");
  });

  it("coleções vazias somem", () => {
    const c = colecoes(VITRINE.filter((r) => !r.fundador));
    expect(c.find((x) => x.id === "fundadores")).toBeUndefined();
  });

  it("horários livres vêm do motor (lotado não aparece)", () => {
    const agora = new Date("2026-11-10T12:00:00Z");
    const mare = VITRINE[0]!;
    const livres = horariosLivres(mare, "2026-11-11", 8, agora).map((d) => d.toISOString());
    // A mesa 9 (até 8) está ocupada às 20:00 local (23:00Z) por 90 min + 15 de folga.
    expect(livres).not.toContain("2026-11-11T23:00:00.000Z");
    expect(livres).not.toContain("2026-11-11T22:00:00.000Z"); // 19:00 invade as 20:00
    expect(livres).toContain("2026-11-12T01:00:00.000Z"); // 22:00 local, mesa já liberada
  });
});

describe("Pergunte à Lebre", () => {
  it("só devolve restaurantes da lista", () => {
    for (const q of ["frutos do mar romântico", "sushi", "algo barato com amigos", "xyz"]) {
      for (const r of perguntarLebre(q).restaurantes) expect(VITRINE).toContain(r);
    }
  });

  it("entende pistas simples", () => {
    expect(ids(perguntarLebre("quero comer peixe").restaurantes)).toEqual(["mare-alta"]);
    expect(ids(perguntarLebre("omakase").restaurantes)).toEqual(["kazoku"]);
  });

  it("sem pista, admite que não sabe", () => {
    expect(perguntarLebre("qualquer coisa").texto).toMatch(/Não achei nada exato/);
  });
});

describe("salão: alocar reserva na mesa", () => {
  const mesa = { id: "m4", seatsMin: 2, seatsMax: 4, estado: "livre" as const };
  const t = (h: number) => new Date(Date.UTC(2026, 10, 11, h));
  const base = { mesa, pessoas: 4, inicio: t(22), fim: t(24), reservaId: "r2" };

  it("aceita quando cabe e está livre", () => {
    expect(podeAlocar({ ...base, alocacoes: [] })).toEqual({ ok: true });
  });

  it("recusa conflito de horário na mesma mesa", () => {
    const r = podeAlocar({
      ...base,
      alocacoes: [{ reservaId: "r1", mesaId: "m4", inicio: t(23), fim: t(25) }],
    });
    expect(r).toEqual({ ok: false, motivo: "Já tem reserva nesse horário" });
  });

  it("encostar no fim da outra não é conflito; mover a própria reserva também não", () => {
    expect(
      podeAlocar({
        ...base,
        alocacoes: [{ reservaId: "r1", mesaId: "m4", inicio: t(20), fim: t(22) }],
      }).ok,
    ).toBe(true);
    expect(
      podeAlocar({
        ...base,
        alocacoes: [{ reservaId: "r2", mesaId: "m4", inicio: t(22), fim: t(24) }],
      }).ok,
    ).toBe(true);
  });

  it("recusa grupo grande demais e mesa bloqueada", () => {
    expect(podeAlocar({ ...base, pessoas: 6, alocacoes: [] }).ok).toBe(false);
    expect(podeAlocar({ ...base, mesa: { ...mesa, estado: "bloqueada" }, alocacoes: [] }).ok).toBe(
      false,
    );
  });
});
