import { describe, expect, it } from "vitest";
import { lerComando, respostaFaq, respostaSalao, type SalaoResumo } from "./lebre-regras";

describe("respostaFaq", () => {
  it("responde perguntas frequentes sem IA", () => {
    expect(respostaFaq("Quanto custa a TIPE?")).toContain("30 dias grátis");
    expect(respostaFaq("Quanto custa a TIPE?")).toContain("sem tarifa da TIPE por transação");
    expect(respostaFaq("funciona com o meu PDV?")).toContain("PDV próprio");
    expect(respostaFaq("Precisa baixar aplicativo?")).toContain("Não precisa baixar");
    expect(respostaFaq("tem Apple Pay?")).toContain("Pix, Apple Pay ou Google Pay");
  });

  it("apresenta o Tipe Pay como carro chefe e os outros produtos", () => {
    expect(respostaFaq("como funciona a TIPE?")).toContain("carro chefe da TIPE é o Tipe Pay");
    expect(respostaFaq("quais produtos vocês têm?")).toContain("Tipe Kitchen");
    expect(respostaFaq("dá para pedir pelo celular?")).toContain("Tipe Order");
  });

  it("não fala mais em PDV obrigatório nem em Apple Pay inativo", () => {
    for (const q of ["tem pdv proprio?", "tem Google Pay?", "como funciona"]) {
      const r = respostaFaq(q) ?? "";
      expect(r).not.toMatch(/ainda não|habilitação comercial|qualquer PDV do mercado/);
    }
  });

  it("deixa para a IA o que não reconhece ou é longo demais", () => {
    expect(respostaFaq("Minha esposa quer saber se vocês atendem em Fortaleza")).toBeNull();
    expect(respostaFaq("preço ".repeat(40))).toBeNull();
  });
});

describe("lerComando", () => {
  const mesas = ["1", "2", "12"];

  it("lê comandos de mesa", () => {
    expect(lerComando("abrir mesa 12", mesas)).toEqual({
      action: "set_table_active",
      number: "12",
      active: true,
    });
    expect(lerComando("abrir mesa 30", mesas)).toEqual({ action: "add_table", number: "30" });
    expect(lerComando("Cadastrar a mesa 7", mesas)).toEqual({ action: "add_table", number: "7" });
    expect(lerComando("fechar e liberar a mesa 2", mesas)).toEqual({
      action: "close_table",
      number: "2",
    });
    expect(lerComando("desativar mesa 1", mesas)).toEqual({
      action: "set_table_active",
      number: "1",
      active: false,
    });
  });

  it("lê comandos do cardápio", () => {
    expect(lerComando("pausar a picanha", mesas)).toEqual({
      action: "set_item_available",
      name: "picanha",
      available: false,
    });
    expect(lerComando("acabou o chopp", mesas)).toEqual({
      action: "set_item_available",
      name: "chopp",
      available: false,
    });
    expect(lerComando("voltar a caipirinha ao cardápio", mesas)).toEqual({
      action: "set_item_available",
      name: "caipirinha",
      available: true,
    });
  });

  it("lê comandos de equipe", () => {
    expect(lerComando("cadastrar garçom Maria Silva", mesas)).toEqual({
      action: "add_waiter",
      name: "Maria Silva",
    });
    expect(lerComando("convidar garçom João maria@ex.com", mesas)).toEqual({
      action: "invite_waiter",
      name: "João",
      email: "maria@ex.com",
    });
  });

  it("deixa perguntas e frases ambíguas para a IA", () => {
    expect(lerComando("posso fechar a mesa 2?", mesas)).toBeNull();
    expect(lerComando("como está a mesa 12", mesas)).toBeNull();
    expect(lerComando("qual o prato mais vendido hoje", mesas)).toBeNull();
  });
});

describe("respostaSalao", () => {
  const salao: SalaoResumo = {
    mesas: [
      { number: "1", active: true },
      { number: "2", active: true },
      { number: "3", active: false },
    ],
    mesasComConta: ["1", "2"],
    mesasAguardando: ["2"],
    pendentes: 1,
    valorAberto: 152.5,
    garcons: [
      { name: "Ana", active: true, comAcesso: true },
      { name: "Bruno", active: true, comAcesso: false },
    ],
  };

  it("responde consultas do salão com os dados do painel", () => {
    expect(respostaSalao("tem pagamento aguardando confirmação?", salao)).toContain("na mesa 2");
    expect(respostaSalao("quanto tem em aberto?", salao)).toContain("152,50");
    expect(respostaSalao("quais mesas estão abertas", salao)).toContain("1 e 2");
    expect(respostaSalao("quantas mesas eu tenho", salao)).toContain("2 mesas ativas");
    expect(respostaSalao("quem está na equipe?", salao)).toContain(
      "Ainda sem acesso ao app: Bruno",
    );
  });

  it("deixa o resto para a IA", () => {
    expect(respostaSalao("qual garçom vendeu mais ontem", salao)).toBeNull();
    expect(respostaSalao("me conta uma piada", salao)).toBeNull();
  });
});
