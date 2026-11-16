import { describe, expect, it } from "vitest";
import {
  ConfiguracaoImpressaoFiscal,
  impressaoFiscalInicial,
  lerConfiguracaoImpressaoFiscal,
  podeImprimirCupomFiscal,
} from "./printing";
describe("preferências da impressora fiscal", () => {
  it("aceita as conexões, sistemas e papéis oferecidos", () => {
    for (const connection of ["usb", "network", "bluetooth"])
      for (const system of ["windows", "macos", "linux", "android", "ios"])
        for (const paper of ["58", "80", "a4"])
          expect(
            ConfiguracaoImpressaoFiscal.safeParse({
              ...impressaoFiscalInicial,
              connection,
              system,
              paper,
            }).success,
          ).toBe(true);
  });
  it("recupera preferências e trata armazenamento corrompido", () => {
    expect(lerConfiguracaoImpressaoFiscal("{invalid")).toEqual(impressaoFiscalInicial);
    expect(lerConfiguracaoImpressaoFiscal(null)).toEqual(impressaoFiscalInicial);
    const cfg = { ...impressaoFiscalInicial, connection: "bluetooth" };
    expect(lerConfiguracaoImpressaoFiscal(JSON.stringify(cfg))).toEqual(cfg);
  });
  it("só libera um documento autorizado com chave e DANFC-e", () => {
    const d = {
      state: "authorized",
      environment: "producao",
      accessKey: "1".repeat(44),
      danfe: "/arquivo",
    };
    expect(podeImprimirCupomFiscal(d)).toBe(true);
    for (const state of ["queued", "processing", "uncertain", "rejected", "denied", "cancelled"])
      expect(podeImprimirCupomFiscal({ ...d, state })).toBe(false);
    expect(podeImprimirCupomFiscal({ ...d, accessKey: null })).toBe(false);
    expect(podeImprimirCupomFiscal({ ...d, danfe: null })).toBe(false);
  });
});
