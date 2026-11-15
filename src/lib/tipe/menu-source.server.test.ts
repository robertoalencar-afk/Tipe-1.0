import { afterEach, expect, it, vi } from "vitest";
import { fetchMenuSource, publicAddress, publicSourceUrl } from "./menu-source.server";
afterEach(() => vi.unstubAllGlobals());
it.each([
  "http://example.com",
  "https://127.0.0.1",
  "https://2130706433",
  "https://0x7f000001",
  "https://[::1]",
  "https://user:pass@example.com",
  "https://example.com:8443",
  "https://a.local",
  "https://a.internal",
])("rejeita destino privado ou credenciais %s", (url) =>
  expect(() => publicSourceUrl(url)).toThrow(),
);
it.each([
  "127.0.0.1",
  "10.1.2.3",
  "172.16.0.1",
  "192.168.1.1",
  "169.254.169.254",
  "100.64.1.1",
  "0.0.0.0",
  "::1",
  "255.255.255.255",
])("rejeita resolução não pública %s", (ip) => expect(publicAddress(ip)).toBe(false));
it("bloqueia endereço privado retornado pelo DNS", async () => {
  const f = vi
    .fn()
    .mockImplementation(
      async () =>
        new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: "10.0.0.1" }] })),
    );
  vi.stubGlobal("fetch", f);
  await expect(fetchMenuSource("https://example.com/menu")).rejects.toThrow(/público/);
  expect(f).toHaveBeenCalledTimes(2);
});
it("verifica cada redirecionamento antes de seguir", async () => {
  const f = vi
    .fn()
    .mockResolvedValueOnce(
      new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: "93.184.216.34" }] })),
    )
    .mockResolvedValueOnce(new Response(JSON.stringify({ Status: 0, Answer: [] })))
    .mockResolvedValueOnce(
      new Response(null, { status: 302, headers: { location: "http://169.254.169.254" } }),
    );
  vi.stubGlobal("fetch", f);
  await expect(fetchMenuSource("https://example.com/menu")).rejects.toThrow(/HTTPS/);
  expect(f).toHaveBeenCalledTimes(3);
});
it("interrompe fonte grande antes de ler o corpo", async () => {
  vi.stubGlobal(
    "fetch",
    vi
      .fn()
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ Status: 0, Answer: [{ type: 1, data: "93.184.216.34" }] })),
      )
      .mockResolvedValueOnce(new Response(JSON.stringify({ Status: 0, Answer: [] })))
      .mockResolvedValueOnce(new Response("x", { headers: { "content-length": "9000000" } })),
  );
  await expect(fetchMenuSource("https://example.com/menu")).rejects.toThrow(/8 MB/);
});
