import { describe, expect, it } from "vitest";
import {
  pendenciaDasIdeias,
  perguntaSobreAvisos,
  respostaDosAvisos,
  type Pendencia,
} from "./pendencias";

describe("avisos da Lebre", () => {
  it("transforma ideias do cardápio em aviso com solução", () => {
    const p = pendenciaDasIdeias([{ kind: "featured" }, { kind: "featured" }, { kind: "pair" }]);
    expect(p?.n).toBe(3);
    expect(p?.aba).toBe("cardapio");
    expect(p?.texto).toContain("2 pratos para destacar e 1 combinação");
    expect(p?.solucao).toBeTruthy();
    expect(pendenciaDasIdeias([])).toBeNull();
  });

  it("reconhece a pergunta sobre o número do botão", () => {
    expect(perguntaSobreAvisos("Apareceu três notificações aqui no botão. Do que se trata?")).toBe(
      true,
    );
    expect(perguntaSobreAvisos("o que é esse 3?")).toBe(true);
    expect(perguntaSobreAvisos("abre a mesa 4")).toBe(false);
  });

  it("responde citando cada aviso e a solução", () => {
    const itens: Pendencia[] = [
      { aba: "caixa", rotulo: "Caixa", texto: "Um pagamento espera.", n: 1, solucao: "Confirme." },
      pendenciaDasIdeias([{ kind: "pair" }, { kind: "featured" }])!,
    ];
    const r = respostaDosAvisos(itens);
    expect(r).toContain("soma 3 avisos");
    expect(r).toContain("Um pagamento espera.");
    expect(r).toContain("Confirme.");
    expect(r).toContain("2 ideias para o seu cardápio");
    expect(respostaDosAvisos([])).toContain("tudo em dia");
  });
});
