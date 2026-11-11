import { describe, expect, it } from "vitest";
import { lerPedidoMemoria, limparMemoria, motivoSensivel } from "./lebre-memoria";

describe("memória da Lebre", () => {
  it("guarda preferências e fatos de operação", () => {
    expect(limparMemoria("a mesa 10 é a da varanda.")).toBe("A mesa 10 é a da varanda");
    expect(limparMemoria("aqui chamamos chopp de chope")).toBe("Aqui chamamos chopp de chope");
    expect(limparMemoria("a gente prefere receber em Pix")).not.toBeNull();
  });

  it("nunca guarda dado sensível", () => {
    for (const t of [
      "o CPF do João é 123.456.789-09",
      "cartão 4111 1111 1111 1111",
      "a senha do wifi é tipe123",
      "o e-mail da Ana é ana@ex.com",
      "liga pra ele no (85) 99999-1234",
      "a chave pix da casa é a do dono",
      "o garçom tem diabetes, diagnóstico novo",
      "salário da Maria é 2 mil",
    ]) {
      expect(motivoSensivel(t), t).not.toBeNull();
      expect(limparMemoria(t), t).toBeNull();
    }
  });

  it("entende os pedidos diretos", () => {
    expect(lerPedidoMemoria("lembre que a mesa 10 é a varanda")).toEqual({
      tipo: "lembrar",
      texto: "a mesa 10 é a varanda",
      pessoal: false,
    });
    expect(lerPedidoMemoria("lembre para mim que eu prefiro respostas em lista")).toMatchObject({
      tipo: "lembrar",
      pessoal: true,
    });
    expect(lerPedidoMemoria("o que você lembra?")).toEqual({ tipo: "listar" });
    expect(lerPedidoMemoria("esqueça tudo sobre mim")).toEqual({
      tipo: "esquecer",
      tudo: true,
      pessoal: true,
    });
    expect(lerPedidoMemoria("esqueça a varanda")).toEqual({
      tipo: "esquecer",
      tudo: false,
      trecho: "a varanda",
    });
    expect(lerPedidoMemoria("abrir mesa 5")).toBeNull();
  });
});
