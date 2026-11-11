import { describe, expect, it } from "vitest";
import { caixaDeEntrada, mascararEmail, origemConfiavel, problemaNoLink } from "./recuperar-senha";

describe("recuperar senha", () => {
  it("aceita só origens da Tipe no link do e-mail", () => {
    expect(origemConfiavel("https://tipe.digital")).toBe("https://tipe.digital");
    expect(origemConfiavel("https://www.tipe.digital/")).toBe("https://www.tipe.digital");
    expect(origemConfiavel("https://tipe.robertoalencar.workers.dev")).toBe(
      "https://tipe.robertoalencar.workers.dev",
    );
    expect(origemConfiavel("https://tipe.digital.golpe.com")).toBe("https://tipe.digital");
    expect(origemConfiavel("https://eviltipe.digital")).toBe("https://tipe.digital");
    expect(origemConfiavel(null)).toBe("https://tipe.digital");
  });

  it("traduz o erro do Supabase no endereço", () => {
    expect(
      problemaNoLink(
        "",
        "#error=access_denied&error_code=otp_expired&error_description=Email+link+is+invalid+or+has+expired",
      ),
    ).toBe("expirado");
    expect(problemaNoLink("?error=access_denied&error_code=bad_jwt", "")).toBe("invalido");
    expect(problemaNoLink("?token_hash=abc&type=recovery", "")).toBeNull();
  });

  it("sugere a caixa de entrada certa", () => {
    expect(caixaDeEntrada("ana@gmail.com")?.nome).toBe("Gmail");
    expect(caixaDeEntrada("ana@hotmail.com.br")?.nome).toBe("Outlook");
    expect(caixaDeEntrada("ana@restaurante.com.br")).toBeNull();
  });

  it("mascara o e-mail", () => {
    expect(mascararEmail("Roberto@Gmail.com")).toBe("ro•••••@gmail.com");
    expect(mascararEmail("ab@x.com")).toBe("ab•••@x.com");
  });
});
