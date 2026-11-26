import { describe, expect, it, vi } from "vitest";
import {
  apiTipe,
  assinarApiTipe,
  enviarAssinado,
  montarAvisoPagamento,
  validarUrlAviso,
} from "./adapters/api-tipe.server";
import { proximoEstadoBaixa } from "./outbox";

const chave = "ab".repeat(32);

describe("URL de aviso da API TIPE", () => {
  it("aceita https público e recusa http, IP, localhost, porta e o próprio domínio", () => {
    expect(validarUrlAviso("https://pdv.exemplo.com.br/tipe/aviso")).toBeNull();
    for (const u of [
      "http://pdv.exemplo.com.br/x",
      "https://127.0.0.1/x",
      "https://[::1]/x",
      "https://localhost/x",
      "https://pdv.local/x",
      "https://pdv.exemplo.com.br:8443/x",
      "https://u:s@pdv.exemplo.com.br/x",
      "https://tipe.digital/api",
      "https://intranet/x",
      "nada",
    ]) {
      expect(validarUrlAviso(u), u).not.toBeNull();
    }
  });
});

describe("aviso de pagamento", () => {
  it("monta o corpo com itens por código e valor em reais", () => {
    const a = montarAvisoPagamento(
      "bistro-teste",
      { mesa: "12", itens: { PF01: 1, "ext-l9": 0.5 }, valor: 98.894, forma: "pix", id: "p1" },
      new Date("2026-11-25T23:00:00Z"),
    );
    expect(a).toEqual({
      event_id: "pay-p1",
      type: "payment.approved",
      restaurant: "bistro-teste",
      table: "12",
      payment_id: "p1",
      amount: 98.89,
      method: "pix",
      items: [
        { code: "PF01", quantity: 1 },
        { code: "ext-l9", quantity: 0.5 },
      ],
      sent_at: "2026-11-25T23:00:00.000Z",
    });
  });

  it("envia assinado e a assinatura confere do lado do PDV", async () => {
    const f = vi.fn(async (_u: string, init: RequestInit) => {
      const h = init.headers as Record<string, string>;
      const esperada = `v1=${await assinarApiTipe(chave, h["x-tipe-timestamp"]!, String(init.body))}`;
      return new Response(null, { status: h["x-tipe-signature"] === esperada ? 204 : 401 });
    });
    expect(
      await enviarAssinado(
        "https://pdv.exemplo.com.br/aviso",
        chave,
        '{"a":1}',
        f as unknown as typeof fetch,
      ),
    ).toEqual({ ok: true });
    expect(f.mock.calls[0]![1]).toMatchObject({ method: "POST", redirect: "manual" });
  });

  it("resposta fora de 2xx, redirecionamento ou queda viram erro para nova tentativa", async () => {
    const r500 = vi.fn(async () => new Response(null, { status: 500 })) as unknown as typeof fetch;
    const r302 = vi.fn(async () => new Response(null, { status: 302 })) as unknown as typeof fetch;
    const caiu = vi.fn(async () => {
      throw new TypeError("fetch failed");
    }) as unknown as typeof fetch;
    expect(await enviarAssinado("https://pdv.exemplo.com.br/a", chave, "{}", r500)).toEqual({
      ok: false,
      erro: "O sistema respondeu 500",
    });
    expect(await enviarAssinado("https://pdv.exemplo.com.br/a", chave, "{}", r302)).toEqual({
      ok: false,
      erro: "O sistema respondeu 302",
    });
    expect(await enviarAssinado("https://pdv.exemplo.com.br/a", chave, "{}", caiu)).toEqual({
      ok: false,
      erro: "Não foi possível conectar ao sistema",
    });
    const nunca = vi.fn() as unknown as typeof fetch;
    expect((await enviarAssinado("http://pdv.exemplo.com.br/a", chave, "{}", nunca)).ok).toBe(
      false,
    );
    expect(nunca).not.toHaveBeenCalled();
  });

  it("sem URL de aviso a fila pula (o PDV consulta); com URL, devolve pagamento", () => {
    const ctx = { restaurantId: "r", slug: "bistro-teste", credenciais: null, segredoHash: chave };
    expect(apiTipe.capacidades().devolvePagamento).toBe(true);
    expect(apiTipe.avisoAtivo!(ctx)).toBe(false);
    expect(
      apiTipe.avisoAtivo!({
        ...ctx,
        credenciais: { callback_url: "https://pdv.exemplo.com.br/a" },
      }),
    ).toBe(true);
    expect(proximoEstadoBaixa({ attempts: 0, suporta: false, resultado: null }).status).toBe(
      "skipped",
    );
    expect(proximoEstadoBaixa({ attempts: 0, suporta: true, resultado: { ok: true } }).status).toBe(
      "done",
    );
    expect(
      proximoEstadoBaixa({ attempts: 7, suporta: true, resultado: { ok: false, erro: "x" } })
        .status,
    ).toBe("failed");
  });

  it("conectar recusa URL inválida", async () => {
    const ctx = { restaurantId: "r", slug: "s", credenciais: null };
    expect(await apiTipe.conectar(ctx, { callback_url: "http://x.com" })).toMatchObject({
      ok: false,
    });
    expect(await apiTipe.conectar(ctx, { callback_url: "https://pdv.exemplo.com.br/a" })).toEqual({
      ok: true,
    });
  });
});
