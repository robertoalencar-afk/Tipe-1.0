import { describe, expect, it } from "vitest";
import { erroPublico, MENSAGEM_GENERICA } from "./erro-publico";

describe("erroPublico", () => {
  it("mantém mensagem de regra de negócio", () => {
    const e = new Error("Somente o dono pode alterar mesas");
    expect(erroPublico(e)).toBe(e);
  });
  it.each([
    'duplicate key value violates unique constraint "x_pkey"',
    'relation "public.foo" does not exist',
    "permission denied for table restaurants",
    'new row violates row-level security policy for table "t"',
    "PGRST116: JSON object requested, multiple (or no) rows returned",
    'invalid input syntax for type uuid: "abc"',
  ])("oculta detalhe interno: %s", (m) => {
    expect((erroPublico(new Error(m)) as Error).message).toBe(MENSAGEM_GENERICA);
  });
  it("oculta objeto cru (PostgrestError)", () => {
    expect((erroPublico({ code: "42P01", message: "x", details: "y" }) as Error).message).toBe(
      MENSAGEM_GENERICA,
    );
  });
  it("preserva status 429", () => {
    const e = Object.assign(new Error("permission denied for x"), { status: 429 });
    expect((erroPublico(e) as Error & { status?: number }).status).toBe(429);
  });
});
