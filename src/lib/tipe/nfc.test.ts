import { describe, expect, it, vi } from "vitest";
import {
  erroGravacaoNfc,
  gravadorDisponivel,
  gravarLinkMesa,
  lerPedidoGravacao,
  linkGravacaoRemota,
  modoGravacao,
  appClipIos,
} from "./nfc";

describe("etiqueta NFC da mesa", () => {
  it("grava o link do QR como URL NDEF, preservando o token de acesso", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    class Reader {
      write = write;
    }
    const controller = new AbortController();
    await gravarLinkMesa(
      Reader,
      "https://tipe.digital/restaurante/mesa3?t=qr-publico",
      controller.signal,
    );
    expect(write).toHaveBeenCalledWith(
      {
        records: [
          { recordType: "url", data: "https://tipe.digital/restaurante/mesa3?t=qr-publico" },
        ],
      },
      { overwrite: false, signal: controller.signal },
    );
  });
  it("sobrescreve somente quando solicitado explicitamente", async () => {
    const write = vi.fn().mockResolvedValue(undefined);
    class Reader {
      write = write;
    }
    await gravarLinkMesa(
      Reader,
      "https://tipe.digital/teste/mesa1?t=qr",
      new AbortController().signal,
      true,
    );
    expect(write.mock.calls[0]?.[1].overwrite).toBe(true);
  });
  it.each([
    "http://tipe.digital/teste/mesa1",
    "javascript:alert(1)",
    "https://user:password@tipe.digital/teste/mesa1",
    "https://tipe.digital/teste/mesa1?session_token=segredo",
    "https://tipe.digital/teste/mesa1?session=segredo",
  ])("recusa endereço inadequado: %s", (url) => {
    const write = vi.fn();
    class Reader {
      write = write;
    }
    expect(() => gravarLinkMesa(Reader, url, new AbortController().signal)).toThrow();
    expect(write).not.toHaveBeenCalled();
  });
  it("não confunde suporte do navegador com disponibilidade de hardware", async () => {
    class Reader {
      write = vi.fn().mockRejectedValue(new DOMException("NFC indisponível", "NotSupportedError"));
    }
    await expect(
      gravarLinkMesa(Reader, "https://tipe.digital/teste/mesa1", new AbortController().signal),
    ).rejects.toThrow();
    expect(erroGravacaoNfc(new DOMException("", "NotSupportedError"))).toContain("Android");
    expect(gravadorDisponivel()).toBeNull();
  });
  it("diferencia permissão negada e cancelamento", () => {
    expect(erroGravacaoNfc(new DOMException("", "NotAllowedError"))).toContain("Permita");
    expect(erroGravacaoNfc(new DOMException("", "AbortError"))).toContain("cancelada");
  });
});

describe("gravação NFC em iPhone e tablets", () => {
  const origem = "https://tipe.digital";
  const link = "https://tipe.digital/bistro/mesa3?t=qr-publico";
  it("monta a página pública de gravação e lê de volta o mesmo link", () => {
    const remoto = linkGravacaoRemota(origem, link, "3");
    const u = new URL(remoto);
    expect(u.pathname).toBe("/gravar-nfc");
    expect(
      lerPedidoGravacao({ u: u.searchParams.get("u"), m: u.searchParams.get("m") }, origem),
    ).toEqual({ link, mesa: "3" });
  });
  it("recusa link de outro site, sem HTTPS ou com sessão do cliente", () => {
    expect(lerPedidoGravacao({ u: "https://golpe.com/x", m: "1" }, origem)).toBeNull();
    expect(lerPedidoGravacao({ u: "http://tipe.digital/x", m: "1" }, origem)).toBeNull();
    expect(lerPedidoGravacao({ u: `${link}&session=abc` }, origem)).toBeNull();
    expect(lerPedidoGravacao({ u: 42 }, origem)).toBeNull();
    expect(() => linkGravacaoRemota(origem, "http://tipe.digital/x", "1")).toThrow();
  });
  it("sem Web NFC: iPhone usa app gratuito; iPad e outros usam outro celular", () => {
    vi.stubGlobal("navigator", {
      userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)",
    });
    expect(modoGravacao()).toBe("iphone");
    vi.stubGlobal("navigator", { userAgent: "Mozilla/5.0 (iPad; CPU OS 18_0 like Mac OS X)" });
    expect(modoGravacao()).toBe("sem-nfc");
    vi.unstubAllGlobals();
  });
});

describe("App Clip do iPhone", () => {
  it("fica desligado sem o app publicado e liga com id + bundle", () => {
    expect(appClipIos({})).toBeNull();
    expect(appClipIos({ VITE_IOS_APP_ID: "abc", VITE_IOS_CLIP_BUNDLE: "x" })).toBeNull();
    expect(
      appClipIos({ VITE_IOS_APP_ID: "123", VITE_IOS_CLIP_BUNDLE: "digital.tipe.app.Clip" })?.banner,
    ).toBe("app-id=123, app-clip-bundle-id=digital.tipe.app.Clip, app-clip-display=card");
  });
  it("leva o pedido de substituir até o iPhone", () => {
    const u = new URL(
      linkGravacaoRemota("https://tipe.digital", "https://tipe.digital/b/m1?t=x", "1", true),
    );
    expect(u.searchParams.get("s")).toBe("1");
  });
});
