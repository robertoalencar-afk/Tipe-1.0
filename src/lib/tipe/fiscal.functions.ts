import type { JsonFiscal } from "./fiscal/contract";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { ConfiguracaoFiscal, PerfilProdutoFiscal, SlugFiscal } from "./fiscal/schemas";

type ContextoFiscal = { supabase: SupabaseClient<Database>; userId: string };
const Escopo = z.object({ slug: SlugFiscal, environment: z.enum(["homologacao", "producao"]) });

async function autorizar(context: unknown, slug: string, configurar = false) {
  const ctx = context as ContextoFiscal;
  const { requireRestaurantRoles } = await import("./security.server");
  const restaurant = await requireRestaurantRoles(
    ctx.supabase,
    ctx.userId,
    slug,
    configurar ? ["owner"] : ["owner", "manager", "cashier"],
  );
  return { ctx, restaurant };
}

export const getFiscalSetup = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Escopo.parse(input))
  .handler(async ({ data, context }) => {
    const { restaurant } = await autorizar(context, data.slug, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Projeção explícita: nunca retornar credentials_encrypted ou token.
    const { data: settings, error } = await supabaseAdmin
      .from("restaurant_fiscal_settings" as never)
      .select(
        "provider, environment, cnpj, legal_name, state_registration, uf, municipality_code, tax_regime, address, enabled, verified_at, updated_at",
      )
      .eq("restaurant_id", restaurant.id)
      .eq("environment", data.environment)
      .maybeSingle();
    if (error) throw new Error("Não foi possível ler a configuração fiscal");
    return {
      settings: settings as unknown as Record<string, JsonFiscal> | null,
      registeredCnpj: restaurant.cnpj,
    };
  });

export const saveFiscalSetup = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slug: SlugFiscal, configuration: ConfiguracaoFiscal }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug, true);
    const { enforceRate, logSecurityEvent } = await import("./security.server");
    await enforceRate(`fiscal-settings:${restaurant.id}:${ctx.userId}`, 10, 300, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { encryptSecret } = await import("./pagarme.server");
    const config = data.configuration;
    let encrypted: string | undefined;
    if (config.token) encrypted = await encryptSecret(config.token);
    else {
      const { data: saved, error } = await supabaseAdmin
        .from("restaurant_fiscal_settings" as never)
        .select("credentials_encrypted")
        .eq("restaurant_id", restaurant.id)
        .eq("environment", config.environment)
        .maybeSingle();
      if (error) throw new Error("Não foi possível ler a credencial fiscal");
      encrypted = (saved as unknown as { credentials_encrypted?: string } | null)
        ?.credentials_encrypted;
    }
    if (!encrypted) throw new Error("Informe a chave do emissor para este ambiente");
    const { error } = await supabaseAdmin.rpc(
      "fiscal_save_settings" as never,
      {
        p_restaurant: restaurant.id,
        p_actor: ctx.userId,
        p_credentials: encrypted,
        p_data: {
          provider: config.provider,
          environment: config.environment,
          cnpj: config.cnpj,
          legal_name: config.legalName,
          state_registration: config.stateRegistration,
          uf: config.uf,
          municipality_code: config.municipalityCode,
          tax_regime: config.taxRegime,
          address: config.address,
        },
      } as never,
    );
    if (error)
      throw new Error("Não foi possível salvar. Confira o CNPJ do restaurante e os dados fiscais.");
    await logSecurityEvent({
      action: "fiscal_settings_saved",
      restaurantId: restaurant.id,
      restaurantSlug: data.slug,
      actorId: ctx.userId,
      result: "ok",
      resource: `fiscal:${config.environment}`,
    });
    return { saved: true, enabled: false };
  });

export const saveFiscalProductProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => Escopo.extend({ profile: PerfilProdutoFiscal }).strict().parse(input))
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug, true);
    const { enforceRate } = await import("./security.server");
    await enforceRate(`fiscal-product:${restaurant.id}:${ctx.userId}`, 60, 300, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const p = data.profile;
    const { data: id, error } = await supabaseAdmin.rpc(
      "fiscal_save_product_profile" as never,
      {
        p_restaurant: restaurant.id,
        p_actor: ctx.userId,
        p_environment: data.environment,
        p_data: {
          item_id: p.itemId,
          valid_from: p.validFrom,
          valid_until: p.validUntil,
          ncm: p.ncm,
          cfop: p.cfop,
          unit: p.unit,
          layout_version: p.layoutVersion,
          tables_version: p.tablesVersion,
          review_reference: p.reviewReference,
          attributes: p.attributes,
        },
      } as never,
    );
    if (error)
      throw new Error(
        "Não foi possível salvar. Confira a configuração, o produto e a sobreposição de vigências.",
      );
    return { id: String(id) };
  });

export const getFiscalDocuments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    Escopo.extend({ before: z.string().datetime().optional() }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { restaurant } = await autorizar(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("fiscal_documents" as never)
      .select(
        "id, model, state, source_kind, source_reference, amount_cents, access_key, sefaz_code, authorized_at, cancelled_at, created_at",
      )
      .eq("restaurant_id", restaurant.id)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.before) query = query.lt("created_at", data.before);
    const { data: documents, error } = await query;
    if (error) throw new Error("Não foi possível ler os documentos fiscais");
    return { documents: documents as unknown as Record<string, JsonFiscal>[] };
  });

export const getFiscalProducts = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    Escopo.extend({ offset: z.number().int().min(0).max(100000).default(0) })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { restaurant } = await autorizar(context, data.slug, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: items, error } = await supabaseAdmin
      .from("pdv_menu_items")
      .select("id, code, name, available")
      .eq("restaurant_id", restaurant.id)
      .order("id")
      .range(data.offset, data.offset + 49);
    if (error) throw new Error("Não foi possível ler os produtos");
    if (!items?.length) return { items: [], profiles: [] };
    const { data: profiles, error: profileError } = await supabaseAdmin
      .from("fiscal_product_profiles" as never)
      .select(
        "id, menu_item_id, uf, tax_regime, provider, valid_from, valid_until, ncm, cfop, unit, layout_version, tables_version, review_reference, attributes",
      )
      .eq("restaurant_id", restaurant.id)
      .in(
        "menu_item_id",
        items.map((i) => i.id),
      )
      .order("valid_from", { ascending: false });
    if (profileError) throw new Error("Não foi possível ler os perfis fiscais");
    return { items, profiles: profiles as unknown as Record<string, JsonFiscal>[] };
  });

export const closeFiscalProductProfile = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    Escopo.extend({ profileId: z.string().uuid(), validUntil: z.string().date() })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug, true);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc(
      "fiscal_close_product_profile" as never,
      {
        p_restaurant: restaurant.id,
        p_actor: ctx.userId,
        p_profile: data.profileId,
        p_until: data.validUntil,
      } as never,
    );
    if (error) throw new Error("Não foi possível encerrar a vigência deste perfil");
    return { closed: true };
  });
