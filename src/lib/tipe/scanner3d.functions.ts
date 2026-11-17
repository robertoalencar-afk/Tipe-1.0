/* eslint-disable @typescript-eslint/no-explicit-any -- tabela nova ainda fora dos tipos gerados do Supabase */
/**
 * Scanner 3D de pratos. O navegador separa os quadros nítidos do vídeo (ou as fotos), pede URLs
 * assinadas e envia os JPEG direto ao bucket privado "scans-3d", sem passar pelo Worker.
 * A reconstrução roda no GitHub Actions (scanner-3d.yml, COLMAP + OpenMVS em CPU), que grava o
 * .glb no bucket público "modelos-3d". O modelo só entra no cardápio quando o dono aprova.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

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

export const caminhoFoto = (rid: string, scanId: string, i: number) =>
  `${rid}/${scanId}/${String(i).padStart(3, "0")}.jpg`;

/** Acorda o workflow na hora. Sem o token, o agendamento do workflow pega a fila mais tarde. */
async function acordarProcessamento(): Promise<boolean> {
  const token = process.env["GITHUB_SCANNER_TOKEN"];
  const repo = process.env["GITHUB_SCANNER_REPO"] || "robertoalencar-afk/tipe-1.0";
  if (!token) return false;
  try {
    const r = await fetch(
      `https://api.github.com/repos/${repo}/actions/workflows/scanner-3d.yml/dispatches`,
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${token}`,
          accept: "application/vnd.github+json",
          "user-agent": "tipe-scanner-3d",
          "content-type": "application/json",
        },
        body: JSON.stringify({ ref: "main" }),
      },
    );
    return r.ok;
  } catch {
    return false;
  }
}

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
    const { count } = await db
      .from("menu_item_scans")
      .select("id", { count: "exact", head: true })
      .eq("restaurant_id", rid)
      .in("status", ["enviando", "na_fila", "processando"]);
    if ((count ?? 0) >= 3)
      throw new Error("Já há 3 pratos sendo processados. Espere um terminar para enviar outro.");
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
    const urls = await Promise.all(
      Array.from({ length: data.total }, async (_, i) => {
        const { data: s, error: e } = await db.storage
          .from("scans-3d")
          .createSignedUploadUrl(caminhoFoto(rid, scan.id, i));
        if (e || !s) throw new Error("Não foi possível preparar o envio das fotos");
        return s.signedUrl as string;
      }),
    );
    return { scanId: scan.id as string, urls };
  });

export const concluirEnvioScan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, scanId: Id }).parse(d))
  .handler(async ({ data, context }) => {
    const { rid, db } = await comoDono(context, data.slug);
    const scan = await scanDoRestaurante(db, rid, data.scanId);
    if (scan.status !== "enviando") return { status: scan.status, imediato: false };
    const { data: lista } = await db.storage
      .from("scans-3d")
      .list(`${rid}/${scan.id}`, { limit: MAX_FOTOS + 1 });
    const enviadas = (lista ?? []).length;
    if (enviadas < MIN_FOTOS)
      throw new Error(`Chegaram só ${enviadas} fotos. São precisas pelo menos ${MIN_FOTOS}.`);
    await db
      .from("menu_item_scans")
      .update({ status: "na_fila", total_fotos: enviadas, atualizado_em: new Date().toISOString() })
      .eq("id", scan.id);
    const imediato = await acordarProcessamento();
    return { status: "na_fila" as ScanStatus, imediato };
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
    const { data: lista } = await db.storage.from("scans-3d").list(`${rid}/${scan.id}`, {
      limit: MAX_FOTOS + 1,
    });
    const nomes = ((lista ?? []) as { name: string }[]).map((f) => `${rid}/${scan.id}/${f.name}`);
    if (nomes.length) await db.storage.from("scans-3d").remove(nomes);
    return { ok: true };
  });
