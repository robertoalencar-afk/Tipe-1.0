import { describe, expect, it } from "vitest";
import { b64uDecode, b64uEncode, cabecalhoVapid, cifrarMensagem } from "./web-push";

// RFC 8291, apêndice A: mesma entrada, mesmo corpo cifrado, byte a byte.
const RFC = {
  plaintext: "V2hlbiBJIGdyb3cgdXAsIEkgd2FudCB0byBiZSBhIHdhdGVybWVsb24",
  asPublic:
    "BP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A8",
  asPrivate: "yfWPiYE-n46HLnH0KqZOF1fJJU3MYrct3AELtAQ-oRw",
  uaPublic:
    "BCVxsr7N_eNgVRqvHtD0zTZsEc6-VV-JvLexhqUzORcxaOzi6-AYWXvTBHm4bjyPjs7Vd8pZGH6SRpkNtoIAiw4",
  auth: "BTBZMqHH6r4Tts7J_aSIgg",
  salt: "DGv6ra1nlYgDCS1FRnbzlw",
  esperado:
    "DGv6ra1nlYgDCS1FRnbzlwAAEABBBP4z9KsN6nGRTbVYI_c7VJSPQTBtkgcy27mlmlMoZIIgDll6e3vCYLocInmYWAmS6TlzAC8wEqKK6PBru3jl7A_yl95bQpu6cVPTpK4Mqgkf1CXztLVBSt2Ks3oZwbuwXPXLWyouBWLVWGNWQexSgSxsj_Qulcy4a-fN",
};

describe("cifrarMensagem", () => {
  it("reproduz o vetor de teste da RFC 8291", async () => {
    const corpo = await cifrarMensagem(b64uDecode(RFC.plaintext), RFC.uaPublic, RFC.auth, {
      salt: b64uDecode(RFC.salt),
      servidor: { publicKey: RFC.asPublic, privateKey: RFC.asPrivate },
    });
    expect(b64uEncode(corpo)).toBe(RFC.esperado);
  });

  it("recusa inscrição com chave de tamanho errado", async () => {
    await expect(cifrarMensagem(new Uint8Array([1]), "AAAA", RFC.auth)).rejects.toThrow("inválida");
  });
});

describe("cabecalhoVapid", () => {
  it("assina um JWT ES256 para a origem do endpoint, verificável com a chave pública", async () => {
    const par = (await crypto.subtle.generateKey({ name: "ECDSA", namedCurve: "P-256" }, true, [
      "sign",
      "verify",
    ])) as CryptoKeyPair;
    const pub = b64uEncode(new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey)));
    const d = (await crypto.subtle.exportKey("jwk", par.privateKey)).d!;
    const h = await cabecalhoVapid(
      "https://fcm.googleapis.com/fcm/send/abc",
      { publicKey: pub, privateKey: d },
      "mailto:contato@tipe.digital",
      0,
    );
    const m = /^vapid t=([^.]+)\.([^.]+)\.([^,]+), k=(.+)$/.exec(h)!;
    expect(m[4]).toBe(pub);
    const claims = JSON.parse(new TextDecoder().decode(b64uDecode(m[2]!)));
    expect(claims).toEqual({
      aud: "https://fcm.googleapis.com",
      exp: 12 * 3600,
      sub: "mailto:contato@tipe.digital",
    });
    const ok = await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      par.publicKey,
      b64uDecode(m[3]!),
      new TextEncoder().encode(`${m[1]}.${m[2]}`),
    );
    expect(ok).toBe(true);
  });
});
