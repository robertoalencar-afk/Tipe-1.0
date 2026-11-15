import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  role: vi.fn(),
  rpc: vi.fn(),
  quota: vi.fn(),
  ai: vi.fn(),
  list: vi.fn(),
  rate: vi.fn(),
}));
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (x: unknown) => x;
    const b = {
      middleware: () => b,
      inputValidator: (f: typeof validate) => {
        validate = f;
        return b;
      },
      handler: (fn: any) => async (args: any) => fn({ ...args, data: validate(args.data) }),
    };
    return b;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    rpc: m.quota,
    storage: {
      from: () => ({
        list: m.list,
        getPublicUrl: (path: string) => ({ data: { publicUrl: `https://storage.test/${path}` } }),
      }),
    },
  },
}));
vi.mock("./security.server", () => ({ enforceRate: m.rate }));
vi.mock("./ai.server", () => ({ askAI: m.ai }));
import { analyzeMenuSource, publishMenuImport } from "./menu-import.functions";
const context = {
  userId: "owner",
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "r1" } }) }) }),
    }),
    rpc: (name: string, args: unknown) =>
      name === "has_restaurant_role" ? m.role(args) : m.rpc(name, args),
  },
};
const row = {
  code: "IABCDEF01000",
  name: "Prato",
  category: "Pratos",
  description: "Descrição revisada",
  price: 42,
  asset: {
    name: "11111111-1111-4111-8111-111111111111.jpg",
    depthName: "11111111-1111-4111-8111-111111111111.png",
  },
};
beforeEach(() => {
  vi.clearAllMocks();
  m.role.mockResolvedValue({ data: true });
  m.quota.mockResolvedValue({ data: { allowed: true } });
  m.rpc.mockResolvedValue({ data: 1 });
  m.list.mockResolvedValue({ data: [{ name: row.asset.name }, { name: row.asset.depthName }] });
  m.ai.mockResolvedValue('{"items":[]}');
});
it("análise bloqueada antes de gastar cota sem dono autorizado", async () => {
  m.role.mockResolvedValue({ data: false });
  await expect(
    analyzeMenuSource({ data: { slug: "teste", text: "menu" }, context } as never),
  ).rejects.toThrow(/dono/);
  expect(m.ai).not.toHaveBeenCalled();
  expect(m.quota).not.toHaveBeenCalled();
});
it("cota indisponível bloqueia o modelo", async () => {
  m.quota.mockResolvedValue({ error: { message: "offline" } });
  await expect(
    analyzeMenuSource({ data: { slug: "teste", text: "menu" }, context } as never),
  ).rejects.toThrow(/cota/);
  expect(m.ai).not.toHaveBeenCalled();
});
it("preço ausente não chega à publicação", async () => {
  await expect(
    publishMenuImport({
      data: { slug: "teste", rows: [{ ...row, price: null }] },
      context,
    } as never),
  ).rejects.toThrow();
  expect(m.rpc).not.toHaveBeenCalled();
});
it("publica com o cliente autenticado e substituição explícita", async () => {
  await publishMenuImport({
    data: { slug: "teste", rows: [row], replace: true },
    context,
  } as never);
  expect(m.rpc).toHaveBeenCalledWith("publish_menu_import", {
    p_slug: "teste",
    p_replace: true,
    p_rows: [
      {
        ...row,
        asset: undefined,
        image_url: `https://storage.test/r1/banco/${row.asset.name}`,
        depth_url: `https://storage.test/r1/profundidade/${row.asset.depthName}`,
      },
    ],
  });
  expect(m.quota).not.toHaveBeenCalled();
});
it("bloqueia foto que não existe no banco do restaurante", async () => {
  m.list.mockResolvedValue({ data: [] });
  await expect(
    publishMenuImport({
      data: {
        slug: "teste",
        rows: [
          {
            ...row,
            asset: {
              name: "11111111-1111-4111-8111-111111111111.jpg",
              depthName: "11111111-1111-4111-8111-111111111111.png",
            },
          },
        ],
      },
      context,
    } as never),
  ).rejects.toThrow(/não pertence/);
  expect(m.rpc).not.toHaveBeenCalled();
});

it.each([{ description: "" }, { asset: null }, { category: "Para organizar" }])(
  "bloqueia publicação incompleta %j",
  async (patch) => {
    await expect(
      publishMenuImport({
        data: { slug: "teste", rows: [{ ...row, ...patch }] },
        context,
      } as never),
    ).rejects.toThrow();
    expect(m.rpc).not.toHaveBeenCalled();
  },
);
