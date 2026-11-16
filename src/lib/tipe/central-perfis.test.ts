import { describe, expect, it } from "vitest";
import { PERFIS, caixasDoPerfil, ehPerfil, podeSecao } from "./central-perfis";

describe("perfis internos da Central", () => {
  it("nenhum perfil abre financeiro, inteligência, reserva ou administração", () => {
    for (const p of PERFIS) for (const s of ["financeiro", "inteligencia", "reserva", "administracao"]) expect(podeSecao(p, s)).toBe(false);
  });
  it("cada perfil abre só o que é da sua função", () => {
    expect(podeSecao("comercial", "comercial")).toBe(true);
    expect(podeSecao("comercial", "operacoes")).toBe(false);
    expect(podeSecao("dev", "operacoes")).toBe(true);
    expect(podeSecao("dev", "comunicacao")).toBe(false);
    expect(podeSecao("atendimento", "comercial")).toBe(false);
  });
  it("só e-mail de contato, nunca o do fundador; dev sem caixa", () => {
    expect(caixasDoPerfil("comercial")).toEqual(["contato@tipe.digital"]);
    expect(caixasDoPerfil("atendimento")).not.toContain("roberto@tipe.digital");
    expect(caixasDoPerfil("dev")).toEqual([]);
  });
  it("rejeita perfil desconhecido", () => {
    expect(ehPerfil("founder")).toBe(false);
    expect(ehPerfil("dev")).toBe(true);
  });
});
