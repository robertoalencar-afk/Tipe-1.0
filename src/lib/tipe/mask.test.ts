import { describe, it, expect } from "vitest";
import { maskCpf, maskPix } from "./mask";
describe("máscaras", () => {
  it("CPF", () => expect(maskCpf("12345678901")).toBe("***.456.789-**"));
  it("Pix e-mail", () => expect(maskPix("email", "joao@gmail.com")).toBe("****@gmail.com"));
});
