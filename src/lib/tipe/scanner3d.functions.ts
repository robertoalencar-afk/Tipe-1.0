/* eslint-disable @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados do Supabase */
/**
 * Scanner 3D de pratos, com giro 360° instantâneo. O navegador tira os quadros (ao vivo, de um
 * vídeo ou de fotos), pede URLs assinadas e envia cada JPEG direto ao bucket público
 * "modelos-3d", sem passar pelo Worker. Ao concluir, o servidor grava a lista dos quadros
 * (giro.json) e o giro já fica pronto para o dono aprovar. Não há processamento demorado.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { montarGiro } from "./scanner/giro";

export const MIN_FOTOS = 20;
export const MAX_FOTOS = 150;

const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
const Id = z.string().uuid();
type Db = { from: (t: string) => any; storage: any };

export type ScanStatus =
  "enviando" | "na_fila" | "processando" | "pronto" | "erro" | "publicado" | "descartado";

async function comoDono(ctx: { supabase: any; userId: string }, slug: string) {
  const { data: r } = await ctx.supabase
    .from("restaurants")
    .select("id")
    .eq("slug", slug)
    .maybeSingle();
  if (!r) throw new Error("Restaurante não encontrado");
  const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", {
    _user_id: ctx.userId,
    _restaurant_id: r.id,
    _roles: ["owner"],
  });
  if (!ok) throw new Error("Somente o administrador do restaurante pode escanear pratos");
  const { enforceRate } = await import("./security.server");
  await enforceRate(`scan3d:${ctx.userId}:${r.id}`, 30, 60, slug);
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  return { rid: r.id as string, db: supabaseAdmin as unknown as Db };
}

async function scanDoRestaurante(db: Db, rid: string, scanId: string) {
  const { data } = await db
    .from("menu_item_scans")
    .select("id, item_id, status, total_fotos, model_url, poster_url")
    .eq("id", scanId)
    .eq("restaurant_id", rid)
    .maybeSingle();
  if (!data) throw new Error("Escaneamento não encontrado");
  return data as {
    id: string;
    item_id: string;
    status: ScanStatus;
    total_fotos: number;
    model_url: string | null;
    poster_url: string | null;
  };
}

const BUCKET = "modelos-3d";
const pastaGiro = (rid: string, scanId: string) => `${rid}/${scanId}/giro`;
export const caminhoFoto = (rid: string, scanId: string, i: number) =>
  `${pastaGiro(rid, scanId)}/${String(i).padStart(3, "0")}.jpg`;

/**
 * URLs assinadas em lotes pequenos: o Worker tem limite de subrequisições por chamada (50 no
 * plano gratuito do Cloudflare), então 60 assinaturas de uma vez quebravam o envio.
 */
export const LOTE_URLS = 12;

async function assinar(db: Db, rid: string, scanId: string, inicio: number, fim: number) {
  return Promise.all(
    Array.from({ length: fim - inicio }, async (_, k) => {
      const { data: s, error: e } = await db.storage
        .from(BUCKET)
        .createSignedUploadUrl(caminhoFoto(rid, scanId, inicio + k), { upsert: true });
      if (e || !s) {
        console.error("scanner: falha ao assinar envio", e?.message ?? e);
        throw new Error("Não foi possível preparar o envio das fotos");
      }
      return s.signedUrl as string;
    }),
  );
}

export const urlsDeEnvio = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        scanId: Id,
        inicio: z
          .number()
          .int()
          .min(0)
          .max(MAX_FOTOS - 1),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoDono(context, data.slug);
    const scan = await scanDoRestaurante(db, rid, data.scanId);
    if (scan.status !== "enviando") throw new Error("Este envio já foi encerrado");
    const fim = Math.min(scan.total_fotos, data.inicio + LOTE_URLS);
    if (data.inicio >= fim) return { urls: [] as string[] };
    return { urls: await assinar(db, rid, scan.id, data.inicio, fim) };
  });

export const iniciarScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ slug: Slug, itemId: Id, total: z.number().int().min(MIN_FOTOS).max(MAX_FOTOS) })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoDono(context, data.slug);
    const { data: item } = await db
      .from("pdv_menu_items")
      .select("id")
      .eq("id", data.itemId)
      .eq("restaurant_id", rid)
      .maybeSingle();
    if (!item) throw new Error("Prato não encontrado");
    // Envio que ficou pela metade há mais de 30 min (app fechado, internet caiu) não trava a fila.
    await db
      .from("menu_item_scans")
      .update({ status: "descartado", atualizado_em: new Date().toISOString() })
      .eq("restaurant_id", rid)
      .eq("status", "enviando")
      .lt("criado_em", new Date(Date.now() - 30 * 60_000).toISOString());
    const { count } = await db
      .from("menu_item_scans")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", rid)
      .in("status", ["enviando", "na_fila", "processando"]);
    if ((count ?? 0) >= 3)
      throw new Error("Já há 3 pratos sendo enviados. Espere um terminar para enviar outro.");
    const { data: scan, error } = await db
      .from("menu_item_scans")
      .insert({
        restaurant_id: rid,
        item_id: data.itemId,
        total_fotos: data.total,
        criado_por: context.userId,
      })
      .select("id")
      .single();
    if (error || !scan) throw new Error("Não foi possível iniciar o escaneamento");
    try {
      const urls = await assinar(db, rid, scan.id as string, 0, Math.min(LOTE_URLS, data.total));
      return { scanId: scan.id as string, urls };
    } catch (e) {
      await db.from("menu_item_scans").update({ status: "descartado" }).eq("id", scan.id);
      throw e;
    }
  });

export const concluirEnvioScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        scanId: Id,
        inicioVolta2: z.number().int().min(0).max(MAX_FOTOS).nullable().optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoDono(context, data.slug);
    const scan = await scanDoRestaurante(db, rid, data.scanId);
    if (scan.status !== "enviando") return { status: scan.status };
    const { data: lista } = await db.storage.from(BUCKET).list(pastaGiro(rid, scan.id), {
      limit: MAX_FOTOS + 1,
      sortBy: { column: "name", order: "asc" },
    });
    const nomes = ((lista ?? []) as { name: string }[])
      .map((f) => f.name)
      .filter((n) => /^\d{3}\.jpg$/.test(n))
      .sort();
    if (nomes.length < MIN_FOTOS)
      throw new Error(`Chegaram só ${nomes.length} fotos. São precisas pelo menos ${MIN_FOTOS}.`);
    const urls = nomes.map(
      (n) =>
        db.storage.from(BUCKET).getPublicUrl(`${pastaGiro(rid, scan.id)}/${n}`).data
          .publicUrl as string,
    );
    // O corte da 2ª volta veio em índice de captura; conta só os quadros que chegaram antes dele.
    const corte =
      data.inicioVolta2 == null
        ? null
        : nomes.filter((n) => Number(n.slice(0, 3)) < data.inicioVolta2!).length;
    const caminho = `${rid}/${scan.id}/giro.json`;
    const { error } = await db.storage
      .from(BUCKET)
      .upload(caminho, JSON.stringify(montarGiro(urls, corte)), {
        contentType: "application/json",
        upsert: true,
        cacheControl: "31536000",
      });
    if (error) throw new Error("Não foi possível montar o giro do prato");
    const agora = new Date().toISOString();
    await db
      .from("menu_item_scans")
      .update({
        status: "pronto",
        total_fotos: nomes.length,
        model_url: db.storage.from(BUCKET).getPublicUrl(caminho).data.publicUrl,
        poster_url: urls[0],
        processado_em: agora,
        atualizado_em: agora,
      })
      .eq("id", scan.id);
    return { status: "pronto" as ScanStatus };
  });

export const listarScans = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const { data: r } = await context.supabase
      .from("restaurants")
      .select("id")
      .eq("slug", data.slug)
      .maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    // RLS: só o dono enxerga as linhas.
    const { data: linhas } = await (context.supabase as unknown as Db)
      .from("menu_item_scans")
      .select(
        "id, item_id, status, total_fotos, model_url, poster_url, detalhe, criado_em, processado_em",
      )
      .eq("restaurant_id", r.id)
      .neq("status", "descartado")
      .order("criado_em", { ascending: false })
      .limit(30);
    return ((linhas ?? []) as any[]).map((l) => ({
      id: l.id as string,
      itemId: l.item_id as string,
      status: l.status as ScanStatus,
      fotos: l.total_fotos as number,
      modelUrl: (l.model_url as string | null) ?? null,
      posterUrl: (l.poster_url as string | null) ?? null,
      detalhe: (l.detalhe as string | null) ?? null,
      criadoEm: l.criado_em as string,
      processadoEm: (l.processado_em as string | null) ?? null,
    }));
  });

export const publicarScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, scanId: Id }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoDono(context, data.slug);
    const scan = await scanDoRestaurante(db, rid, data.scanId);
    if (scan.status !== "pronto" || !scan.model_url)
      throw new Error("O modelo ainda não está pronto para publicar");
    const { error } = await db
      .from("pdv_menu_items")
      .update({ model_url: scan.model_url })
      .eq("id", scan.item_id)
      .eq("restaurant_id", rid);
    if (error) throw new Error("Não foi possível publicar no cardápio");
    // Outro scan publicado do mesmo prato volta a "pronto": só um modelo fica no ar.
    await db
      .from("menu_item_scans")
      .update({ status: "pronto" })
      .eq("restaurant_id", rid)
      .eq("item_id", scan.item_id)
      .eq("status", "publicado");
    await db
      .from("menu_item_scans")
      .update({ status: "publicado", atualizado_em: new Date().toISOString() })
      .eq("id", scan.id);
    return { ok: true };
  });

export const descartarScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, scanId: Id }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoDono(context, data.slug);
    const scan = await scanDoRestaurante(db, rid, data.scanId);
    if (scan.status === "processando")
      throw new Error("Este prato está sendo processado agora. Tente de novo quando terminar.");
    if (scan.status === "publicado") {
      await db
        .from("pdv_menu_items")
        .update({ model_url: null })
        .eq("id", scan.item_id)
        .eq("restaurant_id", rid)
        .eq("model_url", scan.model_url);
    }
    await db
      .from("menu_item_scans")
      .update({ status: "descartado", atualizado_em: new Date().toISOString() })
      .eq("id", scan.id);
    // Apaga os quadros do giro e, de escaneamentos antigos, as fotos brutas e o modelo.
    const pastas: [string, string][] = [
      [BUCKET, pastaGiro(rid, scan.id)],
      [BUCKET, `${rid}/${scan.id}`],
      ["scans-3d", `${rid}/${scan.id}`],
    ];
    for (const [bucket, pasta] of pastas) {
      const { data: lista } = await db.storage.from(bucket).list(pasta, { limit: MAX_FOTOS + 10 });
      const nomes = ((lista ?? []) as { name: string; id: string | null }[])
        .filter((f) => f.id) // pastas vêm sem id
        .map((f) => `${pasta}/${f.name}`);
      if (nomes.length) await db.storage.from(bucket).remove(nomes);
    }
    return { ok: true };
  });
