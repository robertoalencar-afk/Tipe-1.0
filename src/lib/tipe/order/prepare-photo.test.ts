import { afterEach, beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({ engine: vi.fn(), close: vi.fn() }));
vi.mock("./profundidade", () => ({ gerarProfundidade: m.engine }));
beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubGlobal(
    "createImageBitmap",
    vi.fn(async () => ({ width: 10, height: 10, close: m.close })),
  );
  m.engine.mockResolvedValue(new Blob(["depth"], { type: "image/png" }));
});
afterEach(() => vi.unstubAllGlobals());
it("reutiliza fotografias idênticas enviadas em arquivos diferentes", async () => {
  const { prepareDishDepth } = await import("./prepare-photo");
  const [a, b] = await Promise.all([
    prepareDishDepth(new File(["same actual photo"], "prato-a.jpg")),
    prepareDishDepth(new File(["same actual photo"], "prato-b.jpg")),
  ]);
  expect(a).toBe(b);
  expect(m.engine).toHaveBeenCalledOnce();
});
it("não reutiliza o volume de outra fotografia", async () => {
  const { prepareDishDepth } = await import("./prepare-photo");
  await prepareDishDepth(new Blob(["original"]));
  await prepareDishDepth(new Blob(["replacement"]));
  expect(m.engine).toHaveBeenCalledTimes(2);
});
it("envia a foto ao motor e libera o bitmap ao concluir", async () => {
  const { prepareDishDepth } = await import("./prepare-photo");
  const result = await prepareDishDepth(new Blob(["photo"]));
  expect(result.type).toBe("image/png");
  expect(m.engine).toHaveBeenCalledWith(
    expect.objectContaining({ width: 10 }),
    "/modelos/depth/model.onnx",
    expect.any(Function),
  );
  expect(m.close).toHaveBeenCalledOnce();
});
it("não marca foto como processada se o motor falhar e aceita nova tentativa", async () => {
  const { prepareDishDepth } = await import("./prepare-photo");
  m.engine.mockRejectedValueOnce(new Error("Sem memória"));
  await expect(prepareDishDepth(new Blob(["photo"]))).rejects.toThrow("Sem memória");
  await expect(prepareDishDepth(new Blob(["photo"]))).resolves.toBeInstanceOf(Blob);
  expect(m.close).toHaveBeenCalledTimes(2);
});
it("reutiliza o resultado da mesma foto remota, sem enviar credenciais", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => ({ ok: true, blob: async () => new Blob(["photo"]) })),
  );
  const { prepareDishDepth } = await import("./prepare-photo");
  const source = "https://images.example.invalid/prato.webp";
  const [a, b] = await Promise.all([prepareDishDepth(source), prepareDishDepth(source)]);
  expect(a).toBe(b);
  expect(m.engine).toHaveBeenCalledOnce();
  expect(fetch).toHaveBeenCalledWith(source, { credentials: "omit" });
});
