import { MAX_IMPORT_BYTES } from "./menu-import";
export function publicSourceUrl(raw: string) {
  const u = new URL(raw);
  if (
    u.protocol !== "https:" ||
    u.username ||
    u.password ||
    (u.port && u.port !== "443") ||
    !u.hostname.includes(".") ||
    /[:\[\]]/.test(u.hostname) ||
    /^[\d.]+$/.test(u.hostname) ||
    /(^|\.)(localhost|local|internal|test|invalid|onion)$/.test(u.hostname)
  )
    throw new Error("Use um link HTTPS público, sem senha.");
  u.hash = "";
  return u;
}
export function publicAddress(ip: string) {
  if (ip.includes(":"))
    return (
      /^[23][0-9a-f]{0,3}:/i.test(ip) && !/^2001:(db8|0|10|20):/i.test(ip) && !/^2002:/i.test(ip)
    );
  const a = ip.split(".").map(Number);
  return (
    a.length === 4 &&
    a.every((n) => Number.isInteger(n) && n >= 0 && n <= 255) &&
    ![0, 10, 127].includes(a[0]!) &&
    a[0]! < 224 &&
    !(a[0] === 169 && a[1] === 254) &&
    !(a[0] === 172 && a[1]! >= 16 && a[1]! <= 31) &&
    !(a[0] === 192 && [0, 168].includes(a[1]!)) &&
    !(a[0] === 100 && a[1]! >= 64 && a[1]! <= 127) &&
    !(a[0] === 198 && [18, 19, 51].includes(a[1]!)) &&
    !(a[0] === 203 && a[1] === 0)
  );
}
async function checkPublicDns(host: string) {
  const results = await Promise.all(
    ["A", "AAAA"].map(async (type) => {
      const response = await fetch(
        `https://cloudflare-dns.com/dns-query?name=${encodeURIComponent(host)}&type=${type}`,
        { headers: { accept: "application/dns-json" }, signal: AbortSignal.timeout(5000) },
      );
      if (!response.ok) throw new Error("Não foi possível verificar esse endereço.");
      return (await response.json()) as {
        Status: number;
        Answer?: { type: number; data: string }[];
      };
    }),
  );
  const addresses = results.flatMap(
    (data) => data.Answer?.filter((a) => a.type === 1 || a.type === 28) ?? [],
  );
  if (
    results.some((r) => r.Status !== 0) ||
    !addresses.length ||
    addresses.some((a) => !publicAddress(a.data))
  )
    throw new Error("O link não aponta para um site público permitido.");
}
export async function fetchMenuSource(raw: string) {
  let url = publicSourceUrl(raw);
  for (let hop = 0; hop < 4; hop++) {
    await checkPublicDns(url.hostname);
    const response = await fetch(url, {
      redirect: "manual",
      credentials: "omit",
      headers: {
        Accept:
          "text/html,application/pdf,application/vnd.openxmlformats-officedocument.*,text/plain,image/*;q=0.8",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get("location");
      await response.body?.cancel();
      if (!location) throw new Error("Link sem destino.");
      url = publicSourceUrl(new URL(location, url).href);
      continue;
    }
    if (!response.ok)
      throw new Error("O site não permitiu a leitura. Envie o arquivo do cardápio.");
    if (Number(response.headers.get("content-length") ?? 0) > MAX_IMPORT_BYTES) {
      await response.body?.cancel();
      throw new Error("O arquivo do link ultrapassa 8 MB.");
    }
    const reader = response.body?.getReader();
    if (!reader) throw new Error("O link não retornou conteúdo.");
    const chunks: Uint8Array[] = [];
    let size = 0;
    try {
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        size += value.length;
        if (size > MAX_IMPORT_BYTES) throw new Error("O conteúdo ultrapassa 8 MB.");
        chunks.push(value);
      }
    } finally {
      await reader.cancel();
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const c of chunks) {
      bytes.set(c, offset);
      offset += c.length;
    }
    return {
      bytes,
      type: response.headers.get("content-type")?.split(";")[0] ?? "",
      url: url.href,
    };
  }
  throw new Error("O link redireciona muitas vezes. Use o endereço final.");
}
