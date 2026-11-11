import { describe, expect, it, vi } from "vitest";
import { criarEmissorFocus } from "./focus.server";
import { selecionarPerfilFiscal, UFS_FISCAIS, type PerfilTributarioVersionado } from "./contract";

const config = {
  ambiente: "homologacao" as const,
  cnpj: "12345678000195",
  token: "token-ficticio-de-teste",
};
const autorizado = {
  ref: "conta-1",
  status: "autorizado",
  chave_nfe: "1".repeat(44),
  status_sefaz: "100",
};
const resposta = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
const transporte = (body: unknown = autorizado, status = 200) =>
  vi.fn<typeof fetch>().mockResolvedValue(resposta(body, status));

describe("conector fiscal Focus — sem chamadas externas", () => {
  it("separa homologação, insere o CNPJ e preserva campos novos da reforma sem inventar taxas", async () => {
    const fetcher = transporte();
    const e = criarEmissorFocus(config, fetcher);
    const result = await e.emitir("nfce", "conta-1", {
      items: [{ ibs_cbs_classificacao_tributaria: "200047" }],
    });
    const [url, init] = fetcher.mock.calls[0]!;
    expect(String(url)).toBe("https://homologacao.focusnfe.com.br/v2/nfce?ref=conta-1");
    expect(init?.redirect).toBe("error");
    expect(init?.method).toBe("POST");
    expect(JSON.parse(String(init?.body))).toEqual({
      cnpj_emitente: config.cnpj,
      items: [{ ibs_cbs_classificacao_tributaria: "200047" }],
    });
    expect(result.estado).toBe("autorizado");
  });

  it("bloqueia produção sem habilitação explícita no servidor", () => {
    expect(() => criarEmissorFocus({ ...config, ambiente: "producao" })).toThrow(
      /produção não habilitada/,
    );
  });

  it("usa a origem de produção só quando habilitada", async () => {
    const fetcher = transporte();
    await criarEmissorFocus(
      { ...config, ambiente: "producao", producaoHabilitada: true },
      fetcher,
    ).consultar("nfce", "conta-1");
    expect(String(fetcher.mock.calls[0]![0])).toBe("https://api.focusnfe.com.br/v2/nfce/conta-1");
  });

  it("não permite trocar o emitente no payload", () => {
    const fetcher = transporte();
    expect(() =>
      criarEmissorFocus(config, fetcher).emitir("nfce", "conta-1", {
        cnpj_emitente: "00000000000191",
      }),
    ).toThrow(/Configuração/);
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("não declara suporte a NFS-e sem conector próprio", async () => {
    const fetcher = transporte();
    await expect(
      criarEmissorFocus(config, fetcher).consultar("nfse", "conta-1"),
    ).rejects.toMatchObject({ motivo: "modelo_nao_suportado" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("não transforma HTTP 201 em autorização quando a SEFAZ rejeita", async () => {
    const e = criarEmissorFocus(
      config,
      transporte({ status: "erro_autorizacao", status_sefaz: "539" }, 201),
    );
    expect((await e.emitir("nfce", "conta-1", {})).estado).toBe("rejeitado");
  });

  it("contingência offline não é apresentada como autorização", async () => {
    const e = criarEmissorFocus(config, transporte({ status: "contingencia_offline" }, 201));
    expect((await e.emitir("nfce", "conta-1", {})).estado).toBe("desconhecido");
  });

  it("autorização sem chave não é confirmada", async () => {
    expect(
      (
        await criarEmissorFocus(config, transporte({ status: "autorizado" })).consultar(
          "nfce",
          "conta-1",
        )
      ).estado,
    ).toBe("desconhecido");
  });

  it.each([
    { ...autorizado, ref: "outra-conta" },
    { ...autorizado, cnpj_emitente: "00000000000191" },
  ])("recusa resposta de outra operação/empresa", async (body) => {
    await expect(
      criarEmissorFocus(config, transporte(body)).consultar("nfce", "conta-1"),
    ).rejects.toMatchObject({ motivo: "resultado_incerto" });
  });

  it("falha de rede não reenvia a nota nem expõe o segredo", async () => {
    const fetcher = vi.fn<typeof fetch>().mockRejectedValue(new Error(config.token));
    await expect(
      criarEmissorFocus(config, fetcher).emitir("nfce", "conta-1", {}),
    ).rejects.toMatchObject({ motivo: "resultado_incerto" });
    expect(fetcher).toHaveBeenCalledTimes(1);
    await expect(
      criarEmissorFocus(config, fetcher).consultar("nfce", "conta-1"),
    ).rejects.not.toThrow(config.token);
  });

  it.each([409, 429, 500, 503])(
    "HTTP %s exige reconciliação antes de nova emissão",
    async (status) => {
      const fetcher = transporte({}, status);
      await expect(
        criarEmissorFocus(config, fetcher).emitir("nfce", "conta-1", {}),
      ).rejects.toMatchObject({ motivo: "resultado_incerto" });
      expect(fetcher).toHaveBeenCalledTimes(1);
    },
  );

  it("não aceita referência como caminho/URL de destino", async () => {
    const fetcher = transporte();
    await expect(
      criarEmissorFocus(config, fetcher).consultar("nfce", "../../outra-empresa"),
    ).rejects.toMatchObject({ motivo: "requisicao" });
    expect(fetcher).not.toHaveBeenCalled();
  });

  it("cancelamento exige motivo e usa a mesma referência", async () => {
    const fetcher = transporte({ status: "cancelado" });
    const e = criarEmissorFocus(config, fetcher);
    expect(() => e.cancelar("nfce", "conta-1", "curto")).toThrow();
    expect(
      (await e.cancelar("nfce", "conta-1", "Venda cancelada a pedido do cliente")).estado,
    ).toBe("cancelado");
    expect(fetcher.mock.calls[0]![1]?.method).toBe("DELETE");
  });

  it("mudança do objeto de configuração não altera o ambiente capturado", async () => {
    const local = { ...config };
    const fetcher = transporte();
    const e = criarEmissorFocus(local, fetcher);
    local.token = "outro-token";
    await e.consultar("nfe", "conta-1");
    expect(new Headers(fetcher.mock.calls[0]![1]?.headers).get("Authorization")).toBe(
      `Basic ${btoa(`${config.token}:`)}`,
    );
  });
});

const perfil: PerfilTributarioVersionado = {
  id: "perfil-1",
  uf: "CE",
  regime: "simples",
  vigenciaInicio: "2026-01-01",
  vigenciaFim: "2026-12-31",
  versaoLeiaute: "teste",
  versaoTabelas: "teste",
  revisadoEm: "2026-01-01",
  revisadoPor: "responsavel-contabil",
};
describe("perfis fiscais por UF e vigência", () => {
  it("contempla as 27 UFs, sem alíquota nacional presumida", () =>
    expect(new Set(UFS_FISCAIS).size).toBe(27));
  it("seleciona somente o perfil da UF, regime e data da operação", () =>
    expect(selecionarPerfilFiscal([perfil], "CE", "simples", "2026-11-11")).toEqual(perfil));
  it.each([
    [perfil, { ...perfil, id: "outro" }],
    [{ ...perfil, revisadoPor: "" }],
    [{ ...perfil, versaoTabelas: "" }],
    [],
  ])("bloqueia perfil ausente, sobreposto ou sem revisão", (...perfis) =>
    expect(() =>
      selecionarPerfilFiscal(perfis as PerfilTributarioVersionado[], "CE", "simples", "2026-11-11"),
    ).toThrow(),
  );
  it("não reaproveita perfil de outra UF ou vencido", () => {
    expect(() => selecionarPerfilFiscal([perfil], "SP", "simples", "2026-11-11")).toThrow();
    expect(() => selecionarPerfilFiscal([perfil], "CE", "simples", "2027-01-01")).toThrow();
  });
  it("recusa datas inválidas em vez de selecionar regra tributária errada", () =>
    expect(() => selecionarPerfilFiscal([perfil], "CE", "simples", "2026-02-31")).toThrow());
});
