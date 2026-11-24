import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  role: vi.fn(),
  scan: null as Record<string, unknown> | null,
  updates: [] as { tabela: string; valores: unknown }[],
  arquivos: [] as { name: string; id: string | null }[],
  removidos: [] as string[],
  enviados: [] as { caminho: string; corpo: string }[],
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: unknown) => x;
    const b = {
      middleware: () => b,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return b;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("./security.server", () => ({ enforceRate: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: (tabela: string) => {
      const chain: Record<string, unknown> = {};
      for (const k of ["select", "eq", "in", "neq", "order", "limit"]) chain[k] = () => chain;
      chain["update"] = (valores: unknown) => {
        m.updates.push({ tabela, valores });
        return chain;
      };
      chain["maybeSingle"] = async () => ({ data: m.scan });
      chain["then"] = (ok: (r: unknown) => unknown) => ok({ error: null, data: null, count: 0 });
      return chain;
    },
    storage: {
      from: (bucket: string) => ({
        list: async (pasta: string) => ({
          data: bucket === "modelos-3d" && pasta.endsWith("/giro") ? m.arquivos : [],
        }),
        upload: async (caminho: string, corpo: string) => {
          m.enviados.push({ caminho, corpo });
          return { error: null };
        },
        getPublicUrl: (c: string) => ({ data: { publicUrl: `https://cdn/${c}` } }),
        remove: async (n: string[]) => {
          m.removidos.push(...n);
          return {};
        },
      }),
    },
  },
}));
import { concluirEnvioScan, descartarScan, publicarScan } from "./scanner3d.functions";

const ctx = {
  userId: "u1",
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "r1" } }) }) }),
    }),
    rpc: m.role,
  },
};
const scanId = "22222222-2222-4222-8222-222222222222";
const base = { id: scanId, item_id: "i1", total_fotos: 40, poster_url: null };

beforeEach(() => {
  m.role.mockResolvedValue({ data: true });
  m.updates = [];
  m.removidos = [];
  m.arquivos = [];
  m.enviados = [];
});
const quadros = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ name: `${String(i).padStart(3, "0")}.jpg`, id: `f${i}` }));

it("só o dono mexe no scanner", async () => {
  m.role.mockResolvedValue({ data: false });
  m.scan = { ...base, status: "pronto", model_url: "https://x/a.glb" };
  await expect(
    publicarScan({ data: { slug: "bistro", scanId }, context: ctx } as never),
  ).rejects.toThrow(/administrador/);
});

it("não publica modelo que ainda não ficou pronto", async () => {
  m.scan = { ...base, status: "processando", model_url: null };
  await expect(
    publicarScan({ data: { slug: "bistro", scanId }, context: ctx } as never),
  ).rejects.toThrow(/ainda não está pronto/);
  expect(m.updates).toHaveLength(0);
});

it("publicar grava o modelo no prato e marca o scan", async () => {
  m.scan = { ...base, status: "pronto", model_url: "https://x/a.glb" };
  await publicarScan({ data: { slug: "bistro", scanId }, context: ctx } as never);
  expect(m.updates[0]).toEqual({
    tabela: "pdv_menu_items",
    valores: { model_url: "https://x/a.glb" },
  });
  expect(m.updates.at(-1)!.valores).toMatchObject({ status: "publicado" });
});

it("recusa envio com poucas fotos", async () => {
  m.scan = { ...base, status: "enviando", model_url: null };
  m.arquivos = quadros(5);
  await expect(
    concluirEnvioScan({ data: { slug: "bistro", scanId }, context: ctx } as never),
  ).rejects.toThrow(/Chegaram só 5 fotos/);
});

it("envio completo vira giro 360° pronto na hora, com as duas voltas", async () => {
  m.scan = { ...base, status: "enviando", model_url: null };
  m.arquivos = quadros(60);
  const r = await concluirEnvioScan({
    data: { slug: "bistro", scanId, inicioVolta2: 30 },
    context: ctx,
  } as never);
  expect(r).toEqual({ status: "pronto" });
  expect(m.enviados[0]!.caminho).toBe(`r1/${scanId}/giro.json`);
  const giro = JSON.parse(m.enviados[0]!.corpo);
  expect(giro.voltas.map((v: string[]) => v.length)).toEqual([30, 30]);
  expect(giro.voltas[0][0]).toBe(`https://cdn/r1/${scanId}/giro/000.jpg`);
  expect(m.updates[0]!.valores).toMatchObject({
    status: "pronto",
    total_fotos: 60,
    model_url: `https://cdn/r1/${scanId}/giro.json`,
  });
});

it("descartar um publicado tira o 3D do prato e apaga as fotos", async () => {
  m.scan = { ...base, status: "publicado", model_url: "https://x/a.glb" };
  m.arquivos = quadros(1);
  await descartarScan({ data: { slug: "bistro", scanId }, context: ctx } as never);
  expect(m.updates[0]).toEqual({ tabela: "pdv_menu_items", valores: { model_url: null } });
  expect(m.removidos).toEqual([`r1/${scanId}/giro/000.jpg`]);
});
