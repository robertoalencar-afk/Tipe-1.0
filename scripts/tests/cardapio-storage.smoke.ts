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
const temporaryAccount = process.env.TIPE_SMOKE_TEMP_ACCOUNT === "true";
let qaUserId: string | undefined;
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
  // Apenas usuários já existentes com papel na empresa virtual: não cria contas nem redefine senha.
  const role =
    email === "dono.bistro@exemplo.tipe.digital"
      ? "owner"
      : email === "garcom.bistro@exemplo.tipe.digital"
        ? "waiter"
        : null;
  if (!role) throw new Error("Conta fora do escopo do smoke");
  const candidates = await admin
    .from("user_roles")
    .select("user_id")
    .eq("restaurant_id", rid)
    .eq("role", role);
  if (candidates.error) throw new Error("Não foi possível verificar os papéis virtuais");
  let found = false;
  for (const row of candidates.data ?? []) {
    const result = await admin.auth.admin.getUserById(row.user_id);
    if (result.data.user?.email === email) {
      if (result.data.user.factors?.some((factor) => factor.status === "verified"))
        throw new Error("Smoke não pode contornar MFA");
      found = true;
      break;
    }
  }
  if (!found) throw new Error("Conta virtual existente não encontrada");
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.properties?.hashed_token)
    throw new Error("Não foi possível gerar a sessão virtual de uso único");
  const login = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "email",
  });
  if (login.error) throw new Error("Não foi possível autenticar a conta virtual de teste");
  const verified = await client.auth.getUser();
  if (verified.error || !verified.data.user)
    throw new Error("Sessão de teste não validada pelo Supabase");
  return { supabase: client, userId: verified.data.user.id };
}
async function qaContext() {
  const email = `qa-midia-${randomUUID()}@exemplo.tipe.digital`;
  const created = await admin.auth.admin.createUser({ email, email_confirm: true });
  if (created.error || !created.data.user)
    throw new Error("Não foi possível criar a conta QA temporária");
  qaUserId = created.data.user.id;
  const grant = await admin
    .from("user_roles")
    .insert({ user_id: qaUserId, restaurant_id: rid, role: "owner" });
  if (grant.error) throw new Error("Não foi possível atribuir o papel restrito à empresa virtual");
  const link = await admin.auth.admin.generateLink({ type: "magiclink", email });
  if (link.error || !link.data.properties?.hashed_token)
    throw new Error("Não foi possível gerar a sessão QA");
  const client = createClient(url, publicKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  clients.push(client);
  const login = await client.auth.verifyOtp({
    token_hash: link.data.properties.hashed_token,
    type: "email",
  });
  if (login.error) throw new Error("Não foi possível autenticar a sessão QA");
  const verified = await client.auth.getUser();
  if (verified.error || verified.data.user?.id !== qaUserId)
    throw new Error("Sessão QA não validada pelo Supabase");
  return { supabase: client, userId: qaUserId };
}
const call = (fn: unknown, data: unknown, ctx = owner) =>
  (fn as (args: unknown) => Promise<unknown>)({ data, context: ctx });

beforeAll(async () => {
  if (url !== "https://bnggnbwmihqexvihrqvy.supabase.co" || !secret || !publicKey)
    throw new Error("Ambiente de smoke não configurado; nenhuma alteração realizada");
  admin = supabaseAdmin as unknown as SupabaseClient;
  const restaurant = await admin.from("restaurants").select("id").eq("slug", slug).single();
  if (restaurant.error) throw new Error("Empresa virtual ausente");
  rid = restaurant.data.id;
  owner = temporaryAccount ? await qaContext() : await context("dono.bistro@exemplo.tipe.digital");
  waiter = temporaryAccount ? owner : await context("garcom.bistro@exemplo.tipe.digital");
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
  const errors: string[] = [];
  if (admin && rid) {
    const removed = await admin.storage
      .from("restaurante-midia")
      .remove([
        `${rid}/itens/${itemId}-foto`,
        `${rid}/itens/${itemId}-profundidade`,
        `${rid}/itens/${itemId}-direto`,
        ...bankNames.map((name) => `${rid}/banco/${name}`),
      ]);
    if (removed.error) errors.push("arquivos");
    const deleted = await admin
      .from("pdv_menu_items")
      .delete()
      .eq("id", itemId)
      .eq("restaurant_id", rid);
    if (deleted.error) errors.push("produto");
    const check = await admin.from("pdv_menu_items").select("id").eq("id", itemId);
    if (check.error || check.data?.length) errors.push("verificação do produto");
    const files = await admin.storage
      .from("restaurante-midia")
      .list(`${rid}/itens`, { search: itemId });
    if (files.error || files.data?.length) errors.push("verificação dos arquivos");
    for (const name of bankNames) {
      const result = await admin.storage
        .from("restaurante-midia")
        .list(`${rid}/banco`, { search: name });
      if (result.error || result.data?.some((file) => file.name === name))
        errors.push("verificação da biblioteca");
    }
  }
  await Promise.all(
    clients.map(async (client) => {
      const result = await client.auth.signOut({ scope: "local" });
      if (result.error) errors.push("sessão");
    }),
  );
  if (admin && qaUserId) {
    const roles = await admin.from("user_roles").delete().eq("user_id", qaUserId);
    if (roles.error) errors.push("papel QA");
    const deleted = await admin.auth.admin.deleteUser(qaUserId);
    if (deleted.error) errors.push("conta QA");
    const remaining = await admin.from("user_roles").select("id").eq("user_id", qaUserId);
    if (remaining.error || remaining.data?.length) errors.push("verificação dos papéis");
  }
  if (errors.length)
    throw new Error(`A limpeza do smoke precisa ser concluída: ${errors.join(", ")}`);
  console.log("Limpeza confirmada: produto, arquivos, sessões e conta QA temporária removidos");
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
  if (temporaryAccount) {
    const revoked = await admin
      .from("user_roles")
      .delete()
      .eq("user_id", qaUserId!)
      .eq("restaurant_id", rid);
    if (revoked.error) throw new Error("Não foi possível retirar o papel QA para testar a recusa");
  }
  await expect(
    call(saveFotoItem, { slug, itemId, tipo: "foto", imagem: photoData }, waiter),
  ).rejects.toThrow();
});
