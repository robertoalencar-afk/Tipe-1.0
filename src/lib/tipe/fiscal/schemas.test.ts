import { describe, expect, it } from "vitest";
import { CnpjFiscal, ConfiguracaoFiscal, PerfilProdutoFiscal, cnpjFiscalValido } from "./schemas";

const config = {
  provider: "focus",
  environment: "homologacao",
  cnpj: "11.222.333/0001-81",
  legalName: "Empresa de teste",
  stateRegistration: "12345",
  uf: "CE",
  municipalityCode: "2304400",
  taxRegime: "1",
  address: {
    street: "Rua de teste",
    number: "1",
    district: "Centro",
    city: "Fortaleza",
    postalCode: "60000000",
  },
  token: "token-local-de-teste",
};
const profile = {
  itemId: "10000000-0000-0000-0000-000000000001",
  validFrom: "2026-11-11",
  validUntil: null,
  ncm: "00000000",
  cfop: "5102",
  unit: "UN",
  layoutVersion: "teste",
  tablesVersion: "teste",
  reviewReference: "referencia-de-teste",
  attributes: { icms_situacao_tributaria: "102" },
};

describe("cadastro fiscal", () => {
  it("valida e normaliza CNPJ numérico", () => {
    expect(CnpjFiscal.parse(config.cnpj)).toBe("11222333000181");
  });
  it("valida o exemplo alfanumérico oficial da Receita", () => {
    expect(CnpjFiscal.parse("12.abc.345/01de-35")).toBe("12ABC34501DE35");
  });
  it.each([
    "00000000000000",
    "11111111111111",
    "11222333000182",
    "12ABC34501DE36",
    "12ABC34501DEAA",
    "123",
  ])("rejeita CNPJ inválido %s", (cnpj) => {
    expect(cnpjFiscalValido(cnpj)).toBe(false);
  });
  it("não aceita habilitação de produção fornecida pelo navegador", () => {
    expect(ConfiguracaoFiscal.safeParse({ ...config, enabled: true }).success).toBe(false);
  });
  it("mantém ambientes explícitos e rejeita token com quebra de linha", () => {
    expect(ConfiguracaoFiscal.safeParse(config).success).toBe(true);
    expect(ConfiguracaoFiscal.safeParse({ ...config, environment: "qualquer" }).success).toBe(
      false,
    );
    expect(
      ConfiguracaoFiscal.safeParse({ ...config, token: "segredo\nAuthorization: x" }).success,
    ).toBe(false);
  });
  it("exige UF brasileira e código municipal completo", () => {
    expect(ConfiguracaoFiscal.safeParse({ ...config, uf: "XX" }).success).toBe(false);
    expect(ConfiguracaoFiscal.safeParse({ ...config, municipalityCode: "230" }).success).toBe(
      false,
    );
  });
});

describe("perfil tributário versionado", () => {
  it("aceita dados revisados com vigência explícita", () => {
    expect(PerfilProdutoFiscal.safeParse(profile).success).toBe(true);
  });
  it("recusa datas inexistentes e intervalos invertidos", () => {
    expect(PerfilProdutoFiscal.safeParse({ ...profile, validFrom: "2026-02-30" }).success).toBe(
      false,
    );
    expect(PerfilProdutoFiscal.safeParse({ ...profile, validUntil: "2026-11-10" }).success).toBe(
      false,
    );
  });
  it("não deixa atributos sobrescrever preço, quantidade ou emitente", () => {
    for (const field of ["valor_unitario", "quantidade", "cnpj_emitente"])
      expect(
        PerfilProdutoFiscal.safeParse({ ...profile, attributes: { [field]: "1" } }).success,
      ).toBe(false);
  });
  it("recusa perfil sem tributos, sem revisão ou sem versão", () => {
    expect(PerfilProdutoFiscal.safeParse({ ...profile, attributes: {} }).success).toBe(false);
    expect(PerfilProdutoFiscal.safeParse({ ...profile, reviewReference: "" }).success).toBe(false);
    expect(PerfilProdutoFiscal.safeParse({ ...profile, tablesVersion: "" }).success).toBe(false);
  });
  it("recusa valores inválidos e campos adicionais", () => {
    expect(
      PerfilProdutoFiscal.safeParse({ ...profile, attributes: { icms_valor: -1 } }).success,
    ).toBe(false);
    expect(PerfilProdutoFiscal.safeParse({ ...profile, price: 0 }).success).toBe(false);
  });
});
