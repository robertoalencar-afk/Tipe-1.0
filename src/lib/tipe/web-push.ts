/**
 * Web Push sem biblioteca externa, só com WebCrypto (roda no Cloudflare e no Node):
 * assinatura VAPID (RFC 8292) e corpo cifrado em aes128gcm (RFC 8291).
 */

const enc = new TextEncoder();

export function b64uEncode(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function b64uDecode(s: string): Uint8Array<ArrayBuffer> {
  const bin = atob(s.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((s.length + 3) % 4));
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function concat(...parts: Uint8Array[]): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(parts.reduce((n, p) => n + p.length, 0));
  let o = 0;
  for (const p of parts) {
    out.set(p, o);
    o += p.length;
  }
  return out;
}

/** Chave P-256 a partir da pública não comprimida (65 bytes) e, se houver, da privada. */
function jwkP256(publicRaw: Uint8Array, privateD?: string): JsonWebKey {
  return {
    kty: "EC",
    crv: "P-256",
    x: b64uEncode(publicRaw.slice(1, 33)),
    y: b64uEncode(publicRaw.slice(33, 65)),
    ...(privateD ? { d: privateD } : {}),
    ext: true,
  };
}

async function hkdf(
  salt: Uint8Array<ArrayBuffer>,
  ikm: Uint8Array<ArrayBuffer>,
  info: Uint8Array<ArrayBuffer>,
  length: number,
) {
  const key = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveBits"]);
  return new Uint8Array(
    await crypto.subtle.deriveBits({ name: "HKDF", hash: "SHA-256", salt, info }, key, length * 8),
  );
}

export type ChavesServidor = { publicKey: string; privateKey: string };

/** Corpo cifrado de uma mensagem push (um único registro aes128gcm). */
export async function cifrarMensagem(
  payload: Uint8Array,
  p256dh: string,
  auth: string,
  teste?: { salt: Uint8Array<ArrayBuffer>; servidor: ChavesServidor },
): Promise<Uint8Array<ArrayBuffer>> {
  const uaPublic = b64uDecode(p256dh);
  const authSecret = b64uDecode(auth);
  if (uaPublic.length !== 65 || authSecret.length !== 16)
    throw new Error("Inscrição de push inválida");
  const salt = teste?.salt ?? crypto.getRandomValues(new Uint8Array(16));

  let asPrivate: CryptoKey;
  let asPublic: Uint8Array<ArrayBuffer>;
  if (teste) {
    asPublic = b64uDecode(teste.servidor.publicKey);
    asPrivate = await crypto.subtle.importKey(
      "jwk",
      jwkP256(asPublic, teste.servidor.privateKey),
      { name: "ECDH", namedCurve: "P-256" },
      false,
      ["deriveBits"],
    );
  } else {
    const par = (await crypto.subtle.generateKey({ name: "ECDH", namedCurve: "P-256" }, true, [
      "deriveBits",
    ])) as CryptoKeyPair;
    asPrivate = par.privateKey;
    asPublic = new Uint8Array(await crypto.subtle.exportKey("raw", par.publicKey));
  }
  const uaKey = await crypto.subtle.importKey(
    "raw",
    uaPublic,
    { name: "ECDH", namedCurve: "P-256" },
    false,
    [],
  );
  const ecdh = new Uint8Array(
    await crypto.subtle.deriveBits({ name: "ECDH", public: uaKey }, asPrivate, 256),
  );

  const ikm = await hkdf(
    authSecret,
    ecdh,
    concat(enc.encode("WebPush: info\0"), uaPublic, asPublic),
    32,
  );
  const cek = await hkdf(salt, ikm, enc.encode("Content-Encoding: aes128gcm\0"), 16);
  const nonce = await hkdf(salt, ikm, enc.encode("Content-Encoding: nonce\0"), 12);

  const aes = await crypto.subtle.importKey("raw", cek, "AES-GCM", false, ["encrypt"]);
  const cifrado = new Uint8Array(
    await crypto.subtle.encrypt(
      { name: "AES-GCM", iv: nonce },
      aes,
      concat(payload, new Uint8Array([2])),
    ),
  );
  const rs = new Uint8Array([0, 0, 16, 0]); // 4096
  return concat(salt, rs, new Uint8Array([asPublic.length]), asPublic, cifrado);
}

/** Cabeçalho Authorization VAPID para o serviço de push do endpoint. */
export async function cabecalhoVapid(
  endpoint: string,
  chaves: ChavesServidor,
  contato: string,
  agora = Date.now(),
): Promise<string> {
  const pub = b64uDecode(chaves.publicKey);
  const key = await crypto.subtle.importKey(
    "jwk",
    jwkP256(pub, chaves.privateKey),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const header = b64uEncode(enc.encode(JSON.stringify({ typ: "JWT", alg: "ES256" })));
  const claims = b64uEncode(
    enc.encode(
      JSON.stringify({
        aud: new URL(endpoint).origin,
        exp: Math.floor(agora / 1000) + 12 * 3600,
        sub: contato,
      }),
    ),
  );
  const assinatura = new Uint8Array(
    await crypto.subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      enc.encode(`${header}.${claims}`),
    ),
  );
  return `vapid t=${header}.${claims}.${b64uEncode(assinatura)}, k=${chaves.publicKey}`;
}

export type Inscricao = { endpoint: string; p256dh: string; auth: string };

/** Envia uma mensagem. Devolve o status HTTP do serviço de push (404/410 = inscrição morta). */
export async function enviarPush(
  sub: Inscricao,
  mensagem: unknown,
  chaves: ChavesServidor,
  contato: string,
): Promise<number> {
  const corpo = await cifrarMensagem(enc.encode(JSON.stringify(mensagem)), sub.p256dh, sub.auth);
  const res = await fetch(sub.endpoint, {
    method: "POST",
    headers: {
      Authorization: await cabecalhoVapid(sub.endpoint, chaves, contato),
      "Content-Encoding": "aes128gcm",
      "Content-Type": "application/octet-stream",
      TTL: "600",
      Urgency: "high",
    },
    body: corpo,
  });
  return res.status;
}
