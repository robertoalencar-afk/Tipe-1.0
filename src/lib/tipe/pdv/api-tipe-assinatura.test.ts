import { describe, expect, it } from "vitest";
import { apiTipe, assinarApiTipe } from "./adapters/api-tipe.server";

const segredo = `whsec_${"ab".repeat(24)}`;
const hex = async (s: string) =>
  Array.from(
    new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s))),
    (b) => b.toString(16).padStart(2, "0"),
  ).join("");
const req = (h: Record<string, string>) =>
  new Request("https://tipe.test/api/public/pdv/api_tipe/webhook", { method: "POST", headers: h });

describe("webhook API padrão TIPE", () => {
  it("aceita HMAC válido e recusa corpo alterado, assinatura errada e carimbo velho", async () => {
    const hash = await hex(segredo);
    const corpo = '{"events":[]}';
    const ts = String(Math.floor(Date.now() / 1000));
    const sig = `v1=${await assinarApiTipe(hash, ts, corpo)}`;
    expect(
      await apiTipe.validarWebhook(
        req({ "x-tipe-timestamp": ts, "x-tipe-signature": sig }),
        corpo,
        hash,
      ),
    ).toBe(true);
    expect(
      await apiTipe.validarWebhook(
        req({ "x-tipe-timestamp": ts, "x-tipe-signature": sig }),
        corpo + " ",
        hash,
      ),
    ).toBe(false);
    expect(
      await apiTipe.validarWebhook(
        req({ "x-tipe-timestamp": ts, "x-tipe-signature": `v1=${"0".repeat(64)}` }),
        corpo,
        hash,
      ),
    ).toBe(false);
    const velho = String(Math.floor(Date.now() / 1000) - 3600);
    const sigVelha = `v1=${await assinarApiTipe(hash, velho, corpo)}`;
    expect(
      await apiTipe.validarWebhook(
        req({ "x-tipe-timestamp": velho, "x-tipe-signature": sigVelha }),
        corpo,
        hash,
      ),
    ).toBe(false);
  });
  it("legado x-tipe-secret ainda funciona e segredo errado não", async () => {
    const hash = await hex(segredo);
    expect(await apiTipe.validarWebhook(req({ "x-tipe-secret": segredo }), "{}", hash)).toBe(true);
    expect(
      await apiTipe.validarWebhook(
        req({ "x-tipe-secret": `whsec_${"cd".repeat(24)}` }),
        "{}",
        hash,
      ),
    ).toBe(false);
    expect(await apiTipe.validarWebhook(req({}), "{}", hash)).toBe(false);
  });
});
