import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  role: vi.fn(),
  upload: vi.fn(),
  list: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  item: vi.fn(),
  count: 0,
  eq: vi.fn(),
  catalog: [] as { id: string; name: string; image_url: string }[],
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
vi.mock("./security.server", () => ({ enforceRate: vi.fn(), logSecurityEvent: vi.fn() }));
vi.mock("@/integrations/supabase/client.server", () => ({
  supabaseAdmin: {
    from: () => {
      interface Chain {
        select: () => Chain;
        update: (x: unknown) => Chain;
        eq: (...args: unknown[]) => Chain;
        not: () => Chain;
        maybeSingle: typeof m.item;
        then: (resolve: (result: { count: number; error: null }) => unknown) => unknown;
      }
      const chain: Chain = {
        select: () => chain,
        update: (x: unknown) => {
          m.update(x);
          return chain;
        },
        eq: (...args: unknown[]) => {
          m.eq(...args);
          return chain;
        },
        not: () => chain,
        maybeSingle: m.item,
        then: (resolve: (result: { count: number; error: null }) => unknown) =>
          resolve({ count: m.count, error: null, data: m.catalog } as {
            count: number;
            error: null;
          }),
      };
      return chain;
    },
    storage: {
      from: () => ({
        upload: m.upload,
        list: m.list,
        remove: m.remove,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.invalid/${path}` },
        }),
      }),
    },
  },
}));
import { saveFotoItem, removeBancoImagem, getBancoImagens } from "./midia.functions";
const ctx = {
  userId: "u1",
  supabase: {
    from: () => ({
      select: () => ({ eq: () => ({ maybeSingle: async () => ({ data: { id: "r1" } }) }) }),
    }),
    rpc: m.role,
  },
};
const data = {
  slug: "teste",
  itemId: "11111111-1111-4111-8111-111111111111",
  tipo: "foto",
  imagem: "data:image/png;base64,iVBORw0KGgo=",
};
beforeEach(() => {
  vi.clearAllMocks();
  m.role.mockResolvedValue({ data: true });
  m.item.mockResolvedValue({ data: { id: data.itemId } });
  m.upload.mockResolvedValue({ error: null });
  m.list.mockResolvedValue({ data: [], error: null });
  m.count = 0;
  m.catalog = [];
});
it("rejeita usuário sem papel owner antes de usar storage", async () => {
  m.role.mockResolvedValue({ data: false });
  await expect(saveFotoItem({ data, context: ctx } as never)).rejects.toThrow(/administrador/);
  expect(m.upload).not.toHaveBeenCalled();
});
it("rejeita item de outro restaurante", async () => {
  m.item.mockResolvedValue({ data: null });
  await expect(saveFotoItem({ data, context: ctx } as never)).rejects.toThrow(
    /Item não encontrado/,
  );
  expect(m.upload).not.toHaveBeenCalled();
});
it("limpa mapa de profundidade ao trocar a foto", async () => {
  await saveFotoItem({ data, context: ctx } as never);
  expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ depth_url: null }));
});
it("não exclui foto em uso no cardápio", async () => {
  m.count = 1;
  await expect(
    removeBancoImagem({
      data: { slug: "teste", nome: "11111111-1111-4111-8111-111111111111.png" },
      context: ctx,
    } as never),
  ).rejects.toThrow(/em uso/);
  expect(m.remove).not.toHaveBeenCalled();
});

it("grava foto e profundidade preparada juntas, sem expor envio manual", async () => {
  await saveFotoItem({ data: { ...data, profundidade: data.imagem }, context: ctx } as never);
  expect(m.upload).toHaveBeenCalledTimes(2);
  expect(m.update).toHaveBeenCalledWith(
    expect.objectContaining({ image_url: expect.any(String), depth_url: expect.any(String) }),
  );
});
it("não aplica profundidade antiga se a foto foi trocada durante o processamento", async () => {
  m.item.mockResolvedValue({
    data: { id: data.itemId, image_url: "https://example.invalid/nova.webp" },
  });
  await expect(
    saveFotoItem({
      data: { ...data, tipo: "profundidade", sourcePhoto: "https://example.invalid/antiga.webp" },
      context: ctx,
    } as never),
  ).rejects.toThrow(/foto mudou/);
  expect(m.upload).not.toHaveBeenCalled();
});

it("preserva fotos anteriores em arquivos diferentes na galeria do restaurante", async () => {
  await saveFotoItem({ data, context: ctx } as never);
  await saveFotoItem({ data, context: ctx } as never);
  const paths = m.upload.mock.calls.map((call) => call[0]);
  expect(paths).toHaveLength(2);
  expect(paths[0]).toMatch(/^r1\/banco\/[0-9a-f-]{36}\.png$/);
  expect(paths[1]).not.toBe(paths[0]);
  expect(m.update.mock.calls[0]![0].image_url).toBe(`https://storage.invalid/${paths[0]}`);
  expect(m.remove).not.toHaveBeenCalled();
});
it("galeria cheia não substitui a foto atual nem inicia upload", async () => {
  m.list.mockResolvedValue({
    data: Array.from({ length: 200 }, (_, i) => ({ name: `${i}.png` })),
    error: null,
  });
  await expect(saveFotoItem({ data, context: ctx } as never)).rejects.toThrow(/200 imagens/);
  expect(m.upload).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
});
it("falha ao listar a galeria preserva a foto atual", async () => {
  m.list.mockResolvedValue({ data: null, error: { message: "failed" } });
  await expect(saveFotoItem({ data, context: ctx } as never)).rejects.toThrow(
    /consultar a galeria/,
  );
  expect(m.upload).not.toHaveBeenCalled();
  expect(m.update).not.toHaveBeenCalled();
});

it("galeria inclui fotos existentes no cardápio e logomarca, mesmo sem envios", async () => {
  m.catalog = [{ id: "i1", name: "Prato", image_url: "https://storage.invalid/legacy.png" }];
  m.item.mockResolvedValue({ data: { logo_url: "https://storage.invalid/logo.png" } });
  const gallery = await getBancoImagens({ data: { slug: "teste" }, context: ctx } as never);
  expect(gallery.cardapio).toEqual([
    { id: "i1", name: "Prato", url: "https://storage.invalid/legacy.png" },
  ]);
  expect(gallery.logoUrl).toBe("https://storage.invalid/logo.png");
  expect(gallery.imagens).toEqual([]);
  expect(m.eq).toHaveBeenCalledWith("restaurant_id", "r1");
  expect(m.eq).toHaveBeenCalledWith("id", "r1");
});
