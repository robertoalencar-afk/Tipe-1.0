/** Opt-in: login real e handlers reais, somente nas empresas virtuais. Sem mock de banco/Storage. */
import { afterAll, beforeAll, expect, it, vi } from "vitest";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { readFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import { supabaseAdmin } from "@/integrations/supabase/client.server";

// Expõe os handlers fora do transporte TanStack. O contexto vem de login/getUser reais abaixo.
vi.mock("@tanstack/react-start", () => ({
  createServerFn: () => {
    let validate = (data: unknown) => data;
    const builder = {
      middleware: () => builder,
      inputValidator: (fn: typeof validate) => {
        validate = fn;
        return builder;
      },
      handler:
        (fn: (args: { data: unknown; context: unknown }) => unknown) =>
        (args: { data: unknown; context: unknown }) =>
          fn({ ...args, data: validate(args.data) }),
    };
    return builder;
  },
}));
vi.mock("@/integrations/supabase/auth-middleware", () => ({ requireSupabaseAuth: {} }));
import {
  addBancoImagem,
  getBancoImagens,
  removeBancoImagem,
  saveFotoItem,
  usarImagemDoBanco,
} from "@/lib/tipe/midia.functions";

const url = process.env.SUPABASE_URL!;
const publicKey = process.env.SUPABASE_PUBLISHABLE_KEY!;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const slug = "bistro-teste";
const itemId = randomUUID();
let rid: string;
let otherItem: string;
let admin: SupabaseClient;
let owner: { supabase: SupabaseClient; userId: string };
let waiter: { supabase: SupabaseClient; userId: string };
const clients: SupabaseClient[] = [];
const bankNames: string[] = [];
const bankUrls: string[] = [];

async function context(email: string) {
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const login = await client.auth.signInWithPassword({ email, password: process.env.SENHA_TESTE! });
  if (login.error) throw new Error("Não foi possível autenticar a conta virtual de teste");
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data.user)
    throw new Error("Sessão de teste não validada pelo Supabase");
  return { supabase: client, userId: verified.data.user.id };
}
const call = (fn: unknown, data: unknown, ctx = owner) =>
  (fn as (args: unknown) => Promise<unknown>)({ data, context: ctx });

beforeAll(async () => {
  if (
    url !== "https://bnggnbwmihqexvihrqvy.supabase.co" ||
    !secret ||
    !publicKey ||
    !process.env.SENHA_TESTE
  )
    throw new Error("Ambiente de smoke não configurado; nenhuma alteração realizada");
  admin = supabaseAdmin as unknown as SupabaseClient;
  owner = await context("dono.bistro@exemplo.tipe.digital");
  waiter = await context("garcom.bistro@exemplo.tipe.digital");
  const restaurant = await admin.from("restaurants").select("id").eq("slug", slug).single();
  if (restaurant.error) throw new Error("Empresa virtual ausente");
  rid = restaurant.data.id;
  const role = await owner.supabase.rpc("has_restaurant_role", {
    _user_id: owner.userId,
    _restaurant_id: rid,
    _roles: ["owner"],
  });
  if (role.error || role.data !== true)
    throw new Error("Conta de teste sem papel owner neste restaurante");
  const other = await admin.from("restaurants").select("id").eq("slug", "bar-teste").single();
  if (other.error) throw new Error("Segunda empresa virtual ausente");
  const foreignItem = await admin
    .from("pdv_menu_items")
    .select("id")
    .eq("restaurant_id", other.data.id)
    .limit(1)
    .single();
  if (foreignItem.error) throw new Error("Item virtual para teste de isolamento ausente");
  otherItem = foreignItem.data.id;
  const created = await admin.from("pdv_menu_items").insert({
    id: itemId,
    restaurant_id: rid,
    code: `QA${itemId.replaceAll("-", "").slice(0, 12)}`,
    name: "QA temporário de mídia",
    price: 1,
    available: false,
    sector: "kitchen",
  });
  if (created.error)
    throw new Error(`Não foi possível criar o item isolado: ${created.error.message}`);
});

afterAll(async () => {
  if (admin && rid) {
    const removed = await admin.storage
      .from("restaurante-midia")
      .remove([
        `${rid}/itens/${itemId}-foto`,
        `${rid}/itens/${itemId}-profundidade`,
        ...bankNames.map((name) => `${rid}/banco/${name}`),
      ]);
    const deleted = await admin
      .from("pdv_menu_items")
      .delete()
      .eq("id", itemId)
      .eq("restaurant_id", rid);
    if (removed.error || deleted.error) throw new Error("A limpeza do smoke precisa ser concluída");
    const check = await admin.from("pdv_menu_items").select("id").eq("id", itemId);
    expect(check.data).toEqual([]);
  }
  await Promise.all(clients.map((client) => client.auth.signOut()));
});

it("autentica, envia/substitui, aplica, bloqueia indevidos e limpa imagens reais", async () => {
  const image = await readFile("public/cardapio/peixe-720.webp");
  const depth = await readFile("public/cardapio/baiao-depth.png");
  const photoData = `data:image/webp;base64,${image.toString("base64")}`;
  const depthData = `data:image/png;base64,${depth.toString("base64")}`;
  const added = (await call(addBancoImagem, { slug, imagem: photoData })) as {
    nome: string;
    url: string;
  };
  bankNames.push(added.nome);
  bankUrls.push(added.url);
  const publicResponse = await fetch(added.url);
  expect(publicResponse.status).toBe(200);
  expect(publicResponse.headers.get("content-type")).toMatch(/^image\/webp/);
  expect((await publicResponse.arrayBuffer()).byteLength).toBe(image.length);
  const listed = (await call(getBancoImagens, { slug })) as { imagens: { nome: string }[] };
  expect(listed.imagens.some((im) => im.nome === added.nome)).toBe(true);
  await call(usarImagemDoBanco, { slug, itemId, nome: added.nome });
  const applied = await admin
    .from("pdv_menu_items")
    .select("image_url,depth_url")
    .eq("id", itemId)
    .single();
  expect(applied.data?.image_url).toBe(bankUrls[0]!.split("?")[0]);
  await expect(call(removeBancoImagem, { slug, nome: added.nome })).rejects.toThrow(/em uso/);
  await call(saveFotoItem, { slug, itemId, tipo: "profundidade", imagem: depthData });
  const mapped = await admin.from("pdv_menu_items").select("depth_url").eq("id", itemId).single();
  expect(mapped.data?.depth_url).toContain(`${itemId}-profundidade`);
  await call(saveFotoItem, { slug, itemId, tipo: "foto", imagem: photoData });
  const replaced = await admin
    .from("pdv_menu_items")
    .select("image_url,depth_url")
    .eq("id", itemId)
    .single();
  expect(replaced.data?.depth_url).toBeNull();
  expect(replaced.data?.image_url).toContain(`${itemId}-foto`);
  await call(removeBancoImagem, { slug, nome: added.nome });
  await expect(
    call(saveFotoItem, { slug, itemId, tipo: "foto", imagem: photoData }, waiter),
  ).rejects.toThrow(/administrador/);
  await expect(
    call(saveFotoItem, { slug, itemId: otherItem, tipo: "foto", imagem: photoData }),
  ).rejects.toThrow(/Item não encontrado/);
  await expect(
    call(saveFotoItem, { slug: "bar-teste", itemId: otherItem, tipo: "foto", imagem: photoData }),
  ).rejects.toThrow();
  await expect(
    call(addBancoImagem, {
      slug,
      imagem: `data:image/png;base64,${Buffer.from("<html>não é imagem</html>").toString("base64")}`,
    }),
  ).rejects.toThrow(/conteúdo/);
  await call(saveFotoItem, { slug, itemId, tipo: "foto", imagem: null });
  const cleared = await admin
    .from("pdv_menu_items")
    .select("image_url,depth_url")
    .eq("id", itemId)
    .single();
  expect(cleared.data).toEqual({ image_url: null, depth_url: null });
  // O navegador autenticado também não consegue gravar diretamente no bucket.
  const directPath = `${rid}/itens/${itemId}-direto`;
  const direct = await owner.supabase.storage
    .from("restaurante-midia")
    .upload(directPath, image, { contentType: "image/webp" });
  if (!direct.error) await admin.storage.from("restaurante-midia").remove([directPath]);
  expect(direct.error).toBeTruthy();
});
