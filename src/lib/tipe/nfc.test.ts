import { describe, expect, it, vi } from "vitest";
import { erroGravacaoNfc, gravadorDisponivel, gravarLinkMesa } from "./nfc";

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
