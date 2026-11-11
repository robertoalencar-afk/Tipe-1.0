import { beforeEach, expect, it, vi } from "vitest";
const m = vi.hoisted(() => ({
  role: vi.fn(),
  upload: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
  item: vi.fn(),
  count: 0,
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
        eq: () => Chain;
        maybeSingle: typeof m.item;
        then: (resolve: (result: { count: number; error: null }) => unknown) => unknown;
      }
      const chain: Chain = {
        select: () => chain,
        update: (x: unknown) => {
          m.update(x);
          return chain;
        },
        eq: () => chain,
        maybeSingle: m.item,
        then: (resolve: (result: { count: number; error: null }) => unknown) =>
          resolve({ count: m.count, error: null }),
      };
      return chain;
    },
    storage: {
      from: () => ({
        upload: m.upload,
        remove: m.remove,
        getPublicUrl: (path: string) => ({
          data: { publicUrl: `https://storage.invalid/${path}` },
        }),
      }),
    },
  },
}));
import { saveFotoItem, removeBancoImagem } from "./midia.functions";
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
  m.count = 0;
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
