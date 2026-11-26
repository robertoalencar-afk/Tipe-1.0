import { MenuImportRows } from "./menu-csv";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

const Slug = z.string().min(1).max(64).regex(/^[a-z0-9-]+$/);
type Ctx = { supabase: any; userId: string; claims?: any };

async function isFounder(ctx: Ctx) {
  const { isFounderWith2fa } = await import("./founder-guard");
  return isFounderWith2fa(ctx);
}
// Autoriza pelo papel do usuário no restaurante (consulta com RLS do próprio usuário).
// Founder com 2FA configura integrações pelo servidor (sem acesso à operação do restaurante).
async function authorize(ctx: Ctx, slug: string, roles: string[]) {
  const { data: r } = await ctx.supabase.from("restaurants").select("id, slug").eq("slug", slug).maybeSingle();
  if (r) {
    const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", { _user_id: ctx.userId, _restaurant_id: r.id, _roles: roles });
    if (ok) return r as { id: string; slug: string };
  }
  if (await isFounder(ctx)) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fr } = await supabaseAdmin.from("restaurants").select("id, slug").eq("slug", slug).maybeSingle();
    if (fr) return fr as { id: string; slug: string };
  }
  throw new Error(r ? "Sem permissão" : "Restaurante não encontrado ou sem acesso");
}

/** Status da integração para o painel do restaurante. Nunca devolve credenciais. */
export const getPdvIntegration = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await authorize(context as Ctx, data.slug, ["owner", "cashier", "waiter"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getAdaptador, listarAdaptadores } = await import("./pdv/registry.server");
    const { data: c } = await supabaseAdmin.from("pdv_connections" as never).select("adapter, status, last_sync_at, last_error, last_error_at, credentials_encrypted").eq("restaurant_id", r.id).maybeSingle() as unknown as { data: { adapter: string; status: string; last_sync_at: string | null; last_error: string | null; last_error_at: string | null; credentials_encrypted: string | null } | null };
    const adapter = c?.adapter ?? "lancamento_tipe";
    const ad = getAdaptador(adapter);
    let avisoHost: string | null = null;
    if (adapter === "api_tipe" && c?.credentials_encrypted) {
      const { decryptSecret } = await import("./pagarme.server");
      const url = (JSON.parse(await decryptSecret(c.credentials_encrypted)) as Record<string, string>)["callback_url"];
      if (url) { try { avisoHost = new URL(url).host; } catch { avisoHost = null; } }
    }
    return {
      adapter,
      adapterName: ad?.nome ?? "Integração",
      status: adapter === "lancamento_tipe" ? "connected" : (c?.status ?? "not_connected"),
      lastSyncAt: c?.last_sync_at ?? null,
      lastError: c?.last_error ?? null,
      capacidades: ad?.capacidades() ?? null,
      disponiveis: listarAdaptadores().filter((a) => a.visivelParaRestaurante && a.id !== "lancamento_tipe").map((a) => ({ id: a.id, nome: a.nome })),
      avisoHost,
      isFounder: await isFounder(context as Ctx),
    };
  });

export const testPdvConnection = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await authorize(context as Ctx, data.slug, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getAdaptador } = await import("./pdv/registry.server");
    const { data: c } = await supabaseAdmin.from("pdv_connections" as never).select("adapter, credentials_encrypted, webhook_secret_hash").eq("restaurant_id", r.id).maybeSingle() as unknown as { data: { adapter: string; credentials_encrypted: string | null; webhook_secret_hash: string | null } | null };
    const ad = getAdaptador(c?.adapter ?? "lancamento_tipe");
    if (!ad) return { ok: false as const, erro: "Adaptador indisponível" };
    let credenciais: Record<string, string> | null = null;
    if (c?.credentials_encrypted) { const { decryptSecret } = await import("./pagarme.server"); credenciais = JSON.parse(await decryptSecret(c.credentials_encrypted)); }
    const res = await ad.testarConexao({ restaurantId: r.id, slug: r.slug, credenciais, segredoHash: c?.webhook_secret_hash ?? null });
    if (c) await supabaseAdmin.from("pdv_connections" as never).update((res.ok ? { status: "connected", last_error: null } : { status: "error", last_error: res.erro.slice(0, 200), last_error_at: new Date().toISOString() }) as never).eq("restaurant_id", r.id);
    return res.ok ? { ok: true as const } : { ok: false as const, erro: res.erro };
  });

/** Somente administrador TIPE troca o adaptador principal do restaurante. */
export const setPdvAdapter = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug, adapter: z.string().regex(/^[a-z0-9_]{2,40}$/), credentials: z.record(z.string(), z.string().max(500)).optional() }).parse(d))
  .handler(async ({ data, context }) => {
    if (!(await isFounder(context as Ctx))) throw new Error("Somente administradores TIPE trocam a integração");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { getAdaptador } = await import("./pdv/registry.server");
    const ad = getAdaptador(data.adapter);
    if (!ad) throw new Error("Adaptador desconhecido");
    const { data: r } = await supabaseAdmin.from("restaurants").select("id, slug").eq("slug", data.slug).maybeSingle();
    if (!r) throw new Error("Restaurante não encontrado");
    let secret: string | null = null, secretHash: string | null = null, credentials_encrypted: string | null = null;
    if (ad.capacidades().webhook) {
      secret = "whsec_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
      secretHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))), (b) => b.toString(16).padStart(2, "0")).join("");
    }
    if (data.credentials && Object.keys(data.credentials).length) {
      const res = await ad.conectar({ restaurantId: r.id, slug: r.slug, credenciais: null }, data.credentials);
      if (!res.ok) throw new Error(res.erro);
      const { encryptSecret } = await import("./pagarme.server");
      credentials_encrypted = await encryptSecret(JSON.stringify(data.credentials));
    }
    const { error } = await supabaseAdmin.from("pdv_connections" as never).upsert({
      restaurant_id: r.id, adapter: ad.id, status: ad.id === "lancamento_tipe" ? "connected" : "not_connected",
      webhook_secret_hash: secretHash, credentials_encrypted, last_error: null,
    } as never, { onConflict: "restaurant_id" });
    if (error) throw new Error("Não foi possível salvar a integração");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({ action: "pdv_adapter_changed", resource: `pdv:${ad.id}`, result: "ok", restaurantId: r.id, restaurantSlug: r.slug, actorId: (context as Ctx).userId });
    // O segredo é mostrado uma única vez ao administrador.
    return { secret, webhookUrl: ad.capacidades().webhook ? `/api/public/pdv/${ad.id}/webhook` : null };
  });

const novoSegredo = async () => {
  const secret = "whsec_" + Array.from(crypto.getRandomValues(new Uint8Array(24)), (b) => b.toString(16).padStart(2, "0")).join("");
  const hash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(secret))), (b) => b.toString(16).padStart(2, "0")).join("");
  return { secret, hash };
};

/**
 * O dono liga o próprio PDV pela API TIPE, sem depender da equipe:
 *  - ativar: troca o modo para API TIPE e gera o segredo (mostrado uma vez);
 *  - novo_segredo: gera outro segredo (o anterior deixa de valer na hora);
 *  - aviso: cadastra ou remove a URL que recebe o aviso de pagamento;
 *  - desativar: volta para o Lançamento TIPE.
 * Conectores de terceiros continuam só com administrador TIPE (setPdvAdapter).
 */
export const configurarApiTipe = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug,
    acao: z.enum(["ativar", "novo_segredo", "aviso", "desativar"]),
    callbackUrl: z.string().trim().max(300).optional(),
  }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await authorize(context as Ctx, data.slug, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { apiTipe, validarUrlAviso } = await import("./pdv/adapters/api-tipe.server");
    const { encryptSecret } = await import("./pagarme.server");
    const { logSecurityEvent } = await import("./security.server");
    const { data: c } = await supabaseAdmin.from("pdv_connections" as never).select("adapter").eq("restaurant_id", r.id).maybeSingle() as unknown as { data: { adapter: string } | null };
    const log = (action: string) => logSecurityEvent({ action, resource: "pdv:api_tipe", result: "ok", restaurantId: r.id, restaurantSlug: r.slug, actorId: (context as Ctx).userId });
    const webhookUrl = `/api/public/pdv/${apiTipe.id}/webhook`;

    if (data.acao === "desativar") {
      const { error } = await supabaseAdmin.from("pdv_connections" as never).upsert({ restaurant_id: r.id, adapter: "lancamento_tipe", status: "connected", webhook_secret_hash: null, credentials_encrypted: null, last_error: null } as never, { onConflict: "restaurant_id" });
      if (error) throw new Error("Não foi possível salvar a integração");
      await log("pdv_api_tipe_disabled");
      return { secret: null, webhookUrl: null };
    }
    if (data.acao === "ativar") {
      if (c && c.adapter !== "lancamento_tipe" && c.adapter !== apiTipe.id) throw new Error("Seu restaurante usa um conector configurado pela equipe Tipe. Fale com o suporte para trocar.");
      const { secret, hash } = await novoSegredo();
      const { error } = await supabaseAdmin.from("pdv_connections" as never).upsert({ restaurant_id: r.id, adapter: apiTipe.id, status: "not_connected", webhook_secret_hash: hash, credentials_encrypted: null, last_error: null } as never, { onConflict: "restaurant_id" });
      if (error) throw new Error("Não foi possível salvar a integração");
      await log("pdv_api_tipe_enabled");
      return { secret, webhookUrl };
    }
    if (c?.adapter !== apiTipe.id) throw new Error("Ative a API TIPE primeiro");
    if (data.acao === "novo_segredo") {
      const { secret, hash } = await novoSegredo();
      const { error } = await supabaseAdmin.from("pdv_connections" as never).update({ webhook_secret_hash: hash } as never).eq("restaurant_id", r.id);
      if (error) throw new Error("Não foi possível gerar o segredo");
      await log("pdv_api_tipe_secret_rotated");
      return { secret, webhookUrl };
    }
    const url = data.callbackUrl ?? "";
    if (url) {
      const erro = validarUrlAviso(url);
      if (erro) throw new Error(erro);
    }
    const credentials_encrypted = url ? await encryptSecret(JSON.stringify({ callback_url: new URL(url).toString() })) : null;
    const { error } = await supabaseAdmin.from("pdv_connections" as never).update({ credentials_encrypted } as never).eq("restaurant_id", r.id);
    if (error) throw new Error("Não foi possível salvar o endereço");
    await log(url ? "pdv_api_tipe_callback_set" : "pdv_api_tipe_callback_removed");
    return { secret: null, webhookUrl: null };
  });

/** Log de eventos recebidos/enviados: dono do restaurante e administradores TIPE. */
export const getPdvEvents = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const r = await authorize(context as Ctx, data.slug, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = await supabaseAdmin.from("pdv_events" as never).select("id, adapter, direction, external_event_id, event_type, status, detail, created_at").eq("restaurant_id", r.id).order("created_at", { ascending: false }).limit(50);
    return (rows ?? []) as { id: string; adapter: string; direction: string; external_event_id: string; event_type: string; status: string; detail: string | null; created_at: string }[];
  });

/** Importação de cardápio por CSV: categoria;codigo;item;preco;ativo */
export const importMenuCsv = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({
    slug: Slug,
    rows: MenuImportRows,
  }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = (context as Ctx).supabase;
    const r = await authorize(context as Ctx, data.slug, ["owner"]);
    const { data: cats } = await sb.from("pdv_menu_categories").select("id, name").eq("restaurant_id", r.id);
    const byName = new Map<string, string>((cats ?? []).map((c: { id: string; name: string }) => [c.name.toLowerCase(), c.id]));
    for (const name of new Set(data.rows.map((x) => x.category))) {
      if (byName.has(name.toLowerCase())) continue;
      const { data: c, error } = await sb.from("pdv_menu_categories").insert({ restaurant_id: r.id, name, position: 99 }).select("id").single();
      if (error) throw new Error("Somente o dono pode importar o cardápio");
      byName.set(name.toLowerCase(), c.id);
    }
    const rows = data.rows.map((x) => ({ restaurant_id: r.id, category_id: byName.get(x.category.toLowerCase())!, code: x.code.toUpperCase(), name: x.name, price: x.price, available: x.available }));
    const { error } = await sb.from("pdv_menu_items").upsert(rows, { onConflict: "restaurant_id,code" });
    if (error) throw new Error("Não foi possível importar. Confira o arquivo.");
    return { imported: rows.length };
  });

/** Itens mais vendidos (últimos 30 dias) para ordenar o Lançamento TIPE. */
export const getTopItems = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const sb = (context as Ctx).supabase;
    const { data: r } = await sb.from("restaurants").select("id").eq("slug", data.slug).maybeSingle();
    if (!r) return [] as string[];
    const since = new Date(Date.now() - 30 * 86400000).toISOString();
    const { data: rows } = await sb.from("pdv_order_items").select("item_code, quantity").eq("restaurant_id", r.id).neq("status", "cancelled").gte("created_at", since).limit(5000);
    const m = new Map<string, number>();
    (rows ?? []).forEach((x: { item_code: string; quantity: number }) => m.set(x.item_code, (m.get(x.item_code) ?? 0) + x.quantity));
    return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8).map(([c]) => c);
  });
