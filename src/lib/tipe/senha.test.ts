import { describe, expect, it } from "vitest";
import { avaliarSenha, mensagemErroSenha, SENHA_MIN } from "./senha";

describe("avaliarSenha", () => {
  it("recusa senhas curtas, sem número ou sem letra", () => {
    expect(avaliarSenha("abc123").ok).toBe(false);
    expect(avaliarSenha("abcdefghijk").faltam).toContain("Inclua números");
    expect(avaliarSenha("12345678901").faltam).toContain("Inclua letras");
  });

  it("recusa senhas comuns e sequências", () => {
    expect(avaliarSenha("Senha12345").ok).toBe(false);
    expect(avaliarSenha("1q2w3e4r5t").ok).toBe(false);
    expect(avaliarSenha("abcdefghij1").ok).toBe(true); // tem número: não é só sequência
    expect(avaliarSenha("aaaaaaaaaaaa").ok).toBe(false);
  });

  it("recusa senha com o e-mail ou o nome", () => {
    const r = avaliarSenha("roberto2026x", { email: "roberto@tipe.digital" });
    expect(r.ok).toBe(false);
    expect(r.faltam).toContain("Não use seu nome ou e-mail na senha");
    expect(avaliarSenha("BarDoZe2026x", { nomes: ["Bar do Zé"] }).ok).toBe(true); // partes com menos de 4 letras não contam
    expect(avaliarSenha("Bistro2026!!", { nomes: ["Bistrô Teste"] }).ok).toBe(false);
  });

  it("aceita senha boa e mede a força", () => {
    const r = avaliarSenha("caju-na-mesa-42");
    expect(r.ok).toBe(true);
    expect(r.forca).toBeGreaterThanOrEqual(3);
    expect(avaliarSenha("xk".repeat(SENHA_MIN / 2 - 1) + "1").ok).toBe(false);
  });
});

describe("mensagemErroSenha", () => {
  it("traduz erros do Supabase", () => {
    expect(mensagemErroSenha("Password is known to be weak and easy to guess")).toMatch(/fraca/);
    expect(mensagemErroSenha("Password has been pwned")).toMatch(/vazamentos/);
    expect(mensagemErroSenha("Invalid login")).toBeNull();
  });
});
