import { describe, expect, it } from "vitest";
import {
  ENTRADAS,
  MODELOS_META,
  etapa,
  extrairFatos,
  horarioComercial,
  humanizar,
  lerDecisao,
  linkEntrada,
  mesclarFicha,
  origemPelaMensagem,
  pedeHumano,
  pedeOptout,
  promptComercial,
  proximaPergunta,
  respostaHumano,
  retornoEquipe,
  temperatura,
} from "./lebre-whatsapp";

// 2026-11-25 é quarta-feira. Horas em UTC; Fortaleza = UTC-3.
const quarta = (h: number) => new Date(Date.UTC(2026, 10, 25, h + 3));
const sexta = (h: number) => new Date(Date.UTC(2026, 10, 27, h + 3));

describe("opt-out e pedido de pessoa", () => {
  it("reconhece SAIR e variações claras", () => {
    for (const t of [
      "SAIR",
      "sair.",
      "Parar",
      "não quero mais receber mensagens",
      "me tira da lista por favor",
      "Descadastrar",
    ])
      expect(pedeOptout(t), t).toBe(true);
  });
  it("não confunde conversa normal com opt-out", () => {
    for (const t of [
      "vou sair para almoçar e volto",
      "quero parar de perder cliente na fila",
      "como faço para sair da maquininha?",
    ])
      expect(pedeOptout(t), t).toBe(false);
  });
  it("pedido de atendente vai para a equipe", () => {
    expect(pedeHumano("quero falar com uma pessoa")).toBe(true);
    expect(pedeHumano("Tem atendente?")).toBe(true);
    expect(pedeHumano("quanto custa?")).toBe(false);
  });
});

describe("horário da equipe", () => {
  it("segunda a sexta, 8h às 18h em Fortaleza", () => {
    expect(horarioComercial(quarta(10))).toBe(true);
    expect(horarioComercial(quarta(22))).toBe(false);
    expect(horarioComercial(new Date(Date.UTC(2026, 10, 28, 15)))).toBe(false); // sábado
  });
  it("diz quando a equipe retorna", () => {
    expect(retornoEquipe(quarta(10))).toBe("ainda hoje");
    expect(retornoEquipe(quarta(22))).toBe("amanhã a partir das 8h");
    expect(retornoEquipe(quarta(6))).toBe("hoje a partir das 8h");
    expect(retornoEquipe(sexta(20))).toBe("na segunda a partir das 8h");
    expect(respostaHumano({ nome: "Carla Mendes" }, quarta(22))).toContain("Combinado, Carla.");
  });
});

describe("ficha do lead", () => {
  it("extrai mesas, e-mail e PDV sem IA", () => {
    expect(extrairFatos("Temos 25 mesas, uso o Saipos. Meu email é Carla@Bistro.com.br")).toEqual({
      mesas: 25,
      pdv: "Saipos",
      email: "carla@bistro.com.br",
    });
  });
  it("mescla sem apagar o que já sabia e ignora lixo", () => {
    const f = mesclarFicha(
      { nome: "Carla", mesas: 20 },
      { nome: "", restaurante: "Bistrô da Praia", mesas: "abc", email: "invalido", cidade: "null" },
    );
    expect(f).toEqual({ nome: "Carla", mesas: 20, restaurante: "Bistrô da Praia" });
  });
  it("temperatura e etapa sobem conforme a conversa", () => {
    expect(temperatura({})).toBe("frio");
    expect(temperatura({ restaurante: "X", mesas: 12 })).toBe("morno");
    expect(temperatura({ restaurante: "X", mesas: 12, dor: "fila", nome: "Ana" })).toBe("quente");
    expect(temperatura({ demo: "quinta 15h" })).toBe("quente");
    expect(etapa({}, "novo")).toBe("qualificando");
    expect(etapa({ nome: "Ana", restaurante: "X", mesas: 10 }, "qualificando")).toBe("qualificado");
    expect(etapa({ demo: "sexta 10h" }, "qualificado")).toBe("demo");
    expect(etapa({ demo: "sexta 10h" }, "cliente")).toBe("cliente");
  });
  it("pergunta na ordem de uma boa vendedora", () => {
    expect(proximaPergunta({})).toBe("nome");
    expect(proximaPergunta({ nome: "Ana", restaurante: "X", cidade: "Fortaleza" })).toBe("mesas");
  });
});

describe("resposta com cara de gente", () => {
  it("tira travessão, markdown, frase de robô e excesso de emoji", () => {
    const t = humanizar("## Oi\nÓtima pergunta! A Tipe — que é ótima — ajuda **muito** 😀😀🎉");
    expect(t).not.toMatch(/[—–#]/);
    expect(t).not.toMatch(/Ótima pergunta/);
    expect(t).toContain("*muito*");
    expect([...t.matchAll(/\p{Extended_Pictographic}/gu)].length).toBe(1);
  });
  it("corta mensagens longas no fim de uma frase", () => {
    const t = humanizar("Frase curta e completa. ".repeat(60));
    expect(t.length).toBeLessThanOrEqual(700);
    expect(t.endsWith(".")).toBe(true);
  });
  it("lê o JSON do modelo e cai para texto puro se vier quebrado", () => {
    const d = lerDecisao(
      'ok {"resposta":"Prazer, Ana! Quantas mesas tem a casa?","ficha":{"nome":"Ana","restaurante":"Bar do Zé"},"humano":false}',
      {},
    );
    expect(d.resposta).toBe("Prazer, Ana! Quantas mesas tem a casa?");
    expect(d.ficha).toEqual({ nome: "Ana", restaurante: "Bar do Zé" });
    expect(lerDecisao("Oi, tudo bem?", { nome: "Ana" })).toEqual({
      resposta: "Oi, tudo bem?",
      ficha: { nome: "Ana" },
      humano: false,
    });
    expect(
      lerDecisao('{"resposta":"Vou chamar o Roberto.","humano":true,"motivo":"desconto"}', {})
        .humano,
    ).toBe(true);
  });
  it("o roteiro manda usar só os fatos e passar preço especial para a equipe", () => {
    const p = promptComercial({
      fatos: "FATOS",
      ficha: { nome: "Ana" },
      agora: quarta(10),
      primeira: true,
    });
    expect(p).toContain("FATOS");
    expect(p).toContain("primeira resposta");
    expect(p).toContain("Próxima informação que falta na ficha: restaurante");
    expect(p).toMatch(/desconto/);
  });
});

describe("portas de entrada e modelos", () => {
  it("cada link abre o número oficial com a mensagem e a origem é reconhecida", () => {
    for (const e of ENTRADAS) {
      expect(linkEntrada(e.texto)).toMatch(/^https:\/\/wa\.me\/558531790290\?text=/);
      expect(origemPelaMensagem(e.texto)).toBe(e.origem);
    }
    expect(origemPelaMensagem("boa noite")).toBeNull();
  });
  it("modelos de marketing oferecem saída e todos têm exemplo para cada variável", () => {
    for (const m of MODELOS_META) {
      const vars = m.corpo.match(/\{\{\d\}\}/g) ?? [];
      expect(m.exemplo.length).toBe(vars.length);
      if (m.categoria === "Marketing") expect(m.corpo).toContain("SAIR");
      expect(m.corpo).not.toMatch(/[—–]/);
    }
  });
});
