import { describe, expect, it } from "vitest";
import {
  conta,
  estadoInicial,
  passoAtual,
  reduzir,
  type Acao,
  type Contexto,
  type EstadoSim,
  type ItemSim,
} from "./simulacao";
import { MODALIDADES, type Modalidade } from "./modalidades";

const CARDAPIO: Record<string, ItemSim> = {
  pastel: { code: "pastel", nome: "Pastel", preco: 3400, cat: "Petiscos" },
  caju: { code: "caju", nome: "Suco de caju", preco: 950, cat: "Bebidas" },
};
const ctx: Contexto = {
  cardapio: CARDAPIO,
  agora: () => "12:00",
  atendente: "Joyce",
  local: "Mesa 12",
  servico: 0.1,
};
const roda = (m: Modalidade, acoes: Acao[]) =>
  acoes.reduce<EstadoSim>((e, a) => reduzir(e, a, ctx), estadoInicial(m));

describe("simulador multiformato: mesas", () => {
  it("não envia pedido antes de a equipe liberar", () => {
    const e = roda("mesas", [{ tipo: "item", code: "pastel", delta: 1 }, { tipo: "enviar", chave: "k1" }]);
    expect(e.pedidos).toHaveLength(0);
    expect(e.carrinho["pastel"]).toBe(1);
  });
  it("liberou, pediu: vai para a cozinha e entra na conta com serviço", () => {
    const e = roda("mesas", [
      { tipo: "liberar" },
      { tipo: "item", code: "pastel", delta: 2 },
      { tipo: "enviar", chave: "k1" },
    ]);
    expect(e.pedidos[0]?.status).toBe("recebido");
    expect(conta(e, ctx)).toEqual({ subtotal: 6800, servico: 680, total: 7480, aPagar: 7480 });
  });
  it("a mesma chave nunca cria dois pedidos", () => {
    const e = roda("mesas", [
      { tipo: "liberar" },
      { tipo: "item", code: "pastel", delta: 1 },
      { tipo: "enviar", chave: "k1" },
      { tipo: "item", code: "pastel", delta: 1 },
      { tipo: "enviar", chave: "k1" },
    ]);
    expect(e.pedidos).toHaveLength(1);
  });
  it("paga pelo Pay e a gorjeta extra respeita R$2 até o valor pago, 70% para o garçom", () => {
    let e = roda("mesas", [
      { tipo: "liberar" },
      { tipo: "item", code: "caju", delta: 1 },
      { tipo: "enviar", chave: "k1" },
      { tipo: "pagar_conta", metodo: "apple_pay" },
    ]);
    expect(conta(e, ctx).aPagar).toBe(0);
    expect(e.ultimoPagamento).toEqual({ valor: 1045, metodo: "apple_pay" });
    const antes = e;
    e = reduzir(e, { tipo: "gorjeta", valor: 100 }, ctx);
    expect(e).toBe(antes);
    e = reduzir(e, { tipo: "gorjeta", valor: 2000 }, ctx);
    expect(e).toBe(antes);
    e = reduzir(e, { tipo: "gorjeta", valor: 500 }, ctx);
    expect(e.gorjetaExtra).toBe(500);
    expect(e.eventos[0]?.texto).toMatch(/R\$\s3,50 para Joyce/);
  });
});

describe("simulador multiformato: balcão, retirada e totem pagam antes de produzir", () => {
  for (const m of ["balcao", "retirada", "totem"] as const) {
    it(`${m}: nasce aguardando pagamento com senha e só vai à cozinha quando o caixa cobra`, () => {
      const base: Acao[] = [{ tipo: "item", code: "pastel", delta: 1 }];
      if (m === "totem") base.push({ tipo: "consumo", valor: "levar" });
      let e = roda(m, [...base, { tipo: "enviar", chave: "k1", cliente: "Rafael" }]);
      expect(e.pedidos[0]?.status).toBe("aguardando_pagamento");
      expect(e.pedidos[0]?.senha).toBe(41);
      expect(conta(e, ctx).servico).toBe(0);
      const parado = reduzir(e, { tipo: "avancar", pedidoId: 1 }, ctx);
      expect(parado.pedidos[0]?.status).toBe("aguardando_pagamento");
      e = reduzir(e, { tipo: "cobrar", pedidoId: 1, metodo: "pix" }, ctx);
      expect(e.pedidos[0]?.status).toBe("recebido");
      e = reduzir(e, { tipo: "avancar", pedidoId: 1 }, ctx);
      e = reduzir(e, { tipo: "avancar", pedidoId: 1 }, ctx);
      expect(e.pedidos[0]?.status).toBe("pronto");
      expect(e.eventos[0]?.texto).toContain("Senha 41 pronta");
      e = reduzir(e, { tipo: "avancar", pedidoId: 1 }, ctx);
      expect(e.pedidos[0]?.status).toBe("entregue");
      expect(passoAtual(e, ctx)).toBe(4);
    });
  }
  it("totem exige escolher comer aqui ou levar", () => {
    const e = roda("totem", [{ tipo: "item", code: "pastel", delta: 1 }, { tipo: "enviar", chave: "k1" }]);
    expect(e.pedidos).toHaveLength(0);
  });
  it("pagar_conta não existe fora do Tipe Pay", () => {
    const e = roda("balcao", [
      { tipo: "item", code: "pastel", delta: 1 },
      { tipo: "enviar", chave: "k1" },
      { tipo: "pagar_conta", metodo: "pix" },
    ]);
    expect(e.pagoCentavos).toBe(0);
  });
});

describe("simulador multiformato: delivery, pulseira e comanda", () => {
  it("delivery recebe pedido externo validado e termina em expedido", () => {
    let e = roda("delivery", [
      { tipo: "receber_externo", chave: "ext-1", origem: "Canal parceiro", itens: [{ code: "pastel", qtd: 1 }], cliente: "Entrega 1" },
      { tipo: "receber_externo", chave: "ext-1", origem: "Canal parceiro", itens: [{ code: "pastel", qtd: 1 }], cliente: "Entrega 1" },
    ]);
    expect(e.pedidos).toHaveLength(1);
    for (let i = 0; i < 3; i++) e = reduzir(e, { tipo: "avancar", pedidoId: 1 }, ctx);
    expect(e.pedidos[0]?.status).toBe("expedido");
  });
  it("pulseira: ativa, pede, localiza e só encerra depois de paga", () => {
    const px: Contexto = { ...ctx, local: "Pulseira 0421" };
    let e = estadoInicial("pulseira");
    e = reduzir(e, { tipo: "localizar", setor: "Pista", precisaoM: 12 }, px);
    expect(e.localizacao).toBeNull();
    e = reduzir(e, { tipo: "liberar" }, px);
    e = reduzir(e, { tipo: "item", code: "caju", delta: 2 }, px);
    e = reduzir(e, { tipo: "enviar", chave: "p1" }, px);
    e = reduzir(e, { tipo: "localizar", setor: "Pista", precisaoM: 12 }, px);
    expect(e.localizacao?.setor).toBe("Pista");
    const aberta = reduzir(e, { tipo: "encerrar" }, px);
    expect(aberta.liberada).toBe(true);
    e = reduzir(e, { tipo: "pagar_conta", metodo: "pix" }, px);
    e = reduzir(e, { tipo: "encerrar" }, px);
    expect(e.liberada).toBe(false);
    expect(e.localizacao).toBeNull();
    expect(e.eventos[0]?.texto).toContain("voltou ao estoque");
  });
  it("reiniciar limpa tudo em qualquer modalidade", () => {
    for (const m of MODALIDADES) {
      const e = roda(m, [{ tipo: "liberar" }, { tipo: "item", code: "pastel", delta: 1 }, { tipo: "reiniciar" }]);
      expect(e).toEqual(estadoInicial(m));
    }
  });
});
