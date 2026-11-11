import { describe, expect, it } from "vitest";
import { avisoDeChamado, avisoDeNota, avisoDePagamento, avisoDeSaque, querReceber } from "./avisos-equipe";

const base = {
  id: "p1",
  mesa: "7",
  slug: "bar",
  valor: 80,
  alvo: "restaurant",
  metodo: "pix",
  status: "approved",
};

describe("avisoDePagamento", () => {
  it("pagamento parcial avisa só o garçom", () => {
    const a = avisoDePagamento(base)!;
    expect(a.para).toEqual(["garcom"]);
    expect(a.titulo).toContain("Mesa 7 pagou");
  });
  it("conta quitada avisa garçom e gestão", () => {
    const a = avisoDePagamento({ ...base, contaQuitada: true })!;
    expect(a.para).toEqual(["garcom", "gestao"]);
    expect(a.titulo).toBe("Mesa 7 pagou tudo");
  });
  it("pagar no local avisa todos com a forma escolhida", () => {
    const a = avisoDePagamento({
      ...base,
      status: "pending",
      metodo: "at_establishment",
      formaLocal: "cash",
    })!;
    expect(a.titulo).toBe("Mesa 7 quer pagar em dinheiro");
    expect(a.para).toEqual(["garcom", "gestao"]);
  });
  it("gorjeta vai só para o garçom, com a parte dele", () => {
    const a = avisoDePagamento({ ...base, alvo: "tipe", valor: 10 })!;
    expect(a.para).toEqual(["garcom"]);
    expect(a.corpo).toContain("7,00");
  });
  it("pendente digital e recusado não avisam", () => {
    expect(avisoDePagamento({ ...base, status: "pending" })).toBeNull();
    expect(avisoDePagamento({ ...base, status: "failed" })).toBeNull();
  });
});

describe("avisoDeNota", () => {
  it("só notas de 1 ou 2 estrelas", () => {
    expect(avisoDeNota("4", 3)).toBeNull();
    expect(avisoDeNota("4", 2, "demorou")!.corpo).toBe('"demorou"');
  });
});

describe("avisos por tipo", () => {
  it("cada aviso diz o seu tipo", () => {
    expect(avisoDePagamento(base)!.tipo).toBe("pagamento");
    expect(avisoDePagamento({ ...base, alvo: "tipe" })!.tipo).toBe("gorjeta");
    expect(avisoDeNota("4", 1)!.tipo).toBe("nota");
  });
  it("saque pago e recusado vão só para o garçom", () => {
    const pago = avisoDeSaque("s1", "paid", 84.5);
    expect(pago).toMatchObject({ tipo: "saque", titulo: "Seu Pix foi enviado", para: ["garcom"] });
    expect(pago.corpo).toContain("84,50");
    expect(avisoDeSaque("s1", "rejected", 10, "chave inválida").corpo).toContain(
      "Motivo: chave inválida",
    );
  });
  it("chamado da mesa vai para o garçom da mesa e para a gestão", () => {
    expect(avisoDeChamado("bistro-teste", "5", "bill")).toMatchObject({
      tipo: "chamado",
      titulo: "Mesa 5 pediu a conta",
      url: "/bistro-teste",
      tag: "chamado-5-bill",
      para: ["garcom", "gestao"],
    });
    expect(querReceber(["chamado"], "chamado")).toBe(false);
  });
  it("celular que silenciou um tipo não recebe esse tipo", () => {
    expect(querReceber(["gorjeta"], "gorjeta")).toBe(false);
    expect(querReceber(["gorjeta"], "nota")).toBe(true);
    expect(querReceber(null, "saque")).toBe(true);
  });
});
