/**
 * Logomarca e fotos do cardápio. Só o administrador do restaurante envia. O navegador reduz a
 * imagem (webp, até 1600 px) antes; o servidor confere tipo e tamanho e grava no bucket público
 * "restaurante-midia" com caminho fixo por restaurante, então um envio novo substitui o antigo.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
const MAX_BYTES = 1_500_000;
type Db = { from: (t: string) => any; storage: any };

async function comoAdmin(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner"] });
  if (!ok) throw new Error("Somente o administrador do restaurante pode alterar imagens");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { rid: r.id as string, db: supabaseAdmin as unknown as Db };
}

function decodificar(dataUrl: string) {
  const m = /^data:(image\/(?:webp|png|jpeg));base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl);
  if (!m) throw new Error("Envie uma imagem PNG, JPG ou WebP");
  const bin = atob(m[2]!);
  if (bin.length > MAX_BYTES) throw new Error("Imagem grande demais. Use uma de até 1,5 MB");
  const bytes = Uint8Array.from(bin, (c) => c.charCodeAt(0));
  return { bytes, tipo: m[1]!, ext: m[1] === "image/png" ? "png" : m[1] === "image/jpeg" ? "jpg" : "webp" };
}

async function enviar(db: Db, caminho: string, dataUrl: string) {
  const { bytes, tipo } = decodificar(dataUrl);
  const { error } = await db.storage.from("restaurante-midia").upload(caminho, bytes, { contentType: tipo, upsert: true, cacheControl: "300" });
  if (error) throw new Error("Não foi possível salvar a imagem");
  const { data } = db.storage.from("restaurante-midia").getPublicUrl(caminho);
  return `${data.publicUrl}?v=${Date.now()}`;
}

export const getMidia = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    const sb = context.supabase as unknown as Db;
    const [rest, itens] = await Promise.all([
      sb.from("restaurants").select("logo_url").eq("id", r.id).maybeSingle(),
      sb.from("pdv_menu_items").select("id, image_url, depth_url").eq("restaurant_id", r.id),
    ]);
    return {
      logoUrl: (rest.data?.logo_url as string | null) ?? null,
      itens: Object.fromEntries(((itens.data ?? []) as any[]).map((i) => [i.id, { foto: i.image_url as string | null, profundidade: i.depth_url as string | null }])) as Record<string, { foto: string | null; profundidade: string | null }>,
    };
  });

export const saveLogo = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, imagem: z.string().max(2_300_000).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const url = data.imagem ? await enviar(db, `${rid}/logo`, data.imagem) : null;
    const { error } = await db.from("restaurants").update({ logo_url: url }).eq("id", rid);
    if (error) throw new Error("Não foi possível salvar a logomarca");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: url ? "logo_atualizada" : "logo_removida", resource: "restaurants", restaurantId: rid, restaurantSlug: data.slug, actorId: context.userId });
    return { url };
  });

export const saveFotoItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, itemId: z.string().uuid(), tipo: z.enum(["foto", "profundidade"]), imagem: z.string().max(2_300_000).nullable() }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { data: item } = await db.from("pdv_menu_items").select("id").eq("id", data.itemId).eq("restaurant_id", rid).maybeSingle();
    if (!item) throw new Error("Item não encontrado neste restaurante");
    const coluna = data.tipo === "foto" ? "image_url" : "depth_url";
    const url = data.imagem ? await enviar(db, `${rid}/itens/${data.itemId}-${data.tipo}`, data.imagem) : null;
    const patch: Record<string, unknown> = { [coluna]: url };
    if (data.tipo === "foto" && !url) patch["depth_url"] = null;
    const { error } = await db.from("pdv_menu_items").update(patch).eq("id", data.itemId);
    if (error) throw new Error("Não foi possível salvar a imagem");
    return { url };
  });

/* ---------------- Banco de imagens ----------------
 * Biblioteca de fotos do restaurante em "<restaurante>/banco/" no mesmo bucket. Dono, gerente e
 * caixa veem; só o administrador envia, remove ou aplica uma foto a um item do cardápio.
 */
async function comoMembro(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id").eq("slug", slug).maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: ["owner", "manager", "cashier"] });
  if (!ok) throw new Error("Sem acesso ao banco de imagens");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { rid: r.id as string, db: supabaseAdmin as unknown as Db };
}

export const getBancoImagens = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoMembro(context, data.slug);
    const { data: lista, error } = await db.storage.from("restaurante-midia").list(`${rid}/banco`, { limit: 200, sortBy: { column: "created_at", order: "desc" } });
    if (error) throw new Error("Não foi possível carregar o banco de imagens");
    return {
      imagens: ((lista ?? []) as { name: string; created_at?: string }[])
        .filter((f) => /\.(webp|png|jpg)$/.test(f.name))
        .map((f) => ({ nome: f.name, url: db.storage.from("restaurante-midia").getPublicUrl(`${rid}/banco/${f.name}`).data.publicUrl as string, em: f.created_at ?? null })),
    };
  });

export const addBancoImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, imagem: z.string().max(2_300_000) }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { ext } = decodificar(data.imagem);
    const { data: lista } = await db.storage.from("restaurante-midia").list(`${rid}/banco`, { limit: 201 });
    if ((lista?.length ?? 0) >= 200) throw new Error("O banco chegou a 200 imagens. Remova algumas para enviar novas");
    const nome = `${crypto.randomUUID()}.${ext}`;
    const url = await enviar(db, `${rid}/banco/${nome}`, data.imagem);
    return { nome, url };
  });

export const removeBancoImagem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, nome: z.string().regex(/^[0-9a-f-]{36}\.(webp|png|jpg)$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { error } = await db.storage.from("restaurante-midia").remove([`${rid}/banco/${data.nome}`]);
    if (error) throw new Error("Não foi possível remover a imagem");
    return { ok: true };
  });

/** Aplica uma imagem do banco como foto de um item (a URL precisa ser deste restaurante). */
export const usarImagemDoBanco = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, itemId: z.string().uuid(), nome: z.string().regex(/^[0-9a-f-]{36}\.(webp|png|jpg)$/) }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoAdmin(context, data.slug);
    const { data: item } = await db.from("pdv_menu_items").select("id").eq("id", data.itemId).eq("restaurant_id", rid).maybeSingle();
    if (!item) throw new Error("Item não encontrado neste restaurante");
    const { data: lista } = await db.storage.from("restaurante-midia").list(`${rid}/banco`, { search: data.nome, limit: 5 });
    if (!(lista ?? []).some((f: { name: string }) => f.name === data.nome)) throw new Error("Imagem não encontrada no banco");
    const url = db.storage.from("restaurante-midia").getPublicUrl(`${rid}/banco/${data.nome}`).data.publicUrl as string;
    const { error } = await db.from("pdv_menu_items").update({ image_url: url }).eq("id", data.itemId);
    if (error) throw new Error("Não foi possível aplicar a imagem");
    return { url };
  });
