import { ManualPagamentoFiscal } from "./fiscal/payments";
import type {
  ConfiguracaoFiscalPublica,
  PerfilFiscalPublico,
  DocumentoFiscalPublico,
} from "./fiscal/public-types";
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
        "provider, environment, cnpj, legal_name, state_registration, uf, time_zone, acquirer_cnpj, service_fee_policy, service_fee_review, municipality_code, tax_regime, address, enabled, verified_at, updated_at",
      )
      .eq("restaurant_id", restaurant.id)
      .eq("environment", data.environment)
      .maybeSingle();
    if (error) throw new Error("Não foi possível ler a configuração fiscal");
    return {
      settings: settings as unknown as ConfiguracaoFiscalPublica | null,
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
          time_zone: config.timeZone,
          acquirer_cnpj: config.acquirerCnpj,
          service_fee_policy: config.serviceFeePolicy,
          service_fee_review: config.serviceFeeReview,
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
          calculation_rules: p.calculationRules,
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
    Escopo.extend({
      before: z.string().datetime().optional(),
      documentId: z.string().uuid().optional(),
    })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { restaurant } = await autorizar(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let query = supabaseAdmin
      .from("fiscal_documents" as never)
      .select(
        "id, provider_reference, time_zone, model, state, source_kind, source_reference, amount_cents, access_key, sefaz_code, authorized_at, cancelled_at, created_at",
      )
      .eq("restaurant_id", restaurant.id)
      .eq("environment", data.environment)
      .order("created_at", { ascending: false })
      .limit(50);
    if (data.before) query = query.lt("created_at", data.before);
    if (data.documentId) query = query.eq("id", data.documentId);
    const { data: documents, error } = await query;
    if (error) throw new Error("Não foi possível ler os documentos fiscais");
    const docs = documents as unknown as Omit<
      DocumentoFiscalPublico,
      "send_started" | "dispatch_error"
    >[];
    const { data: jobs, error: jobsError } = docs.length
      ? await supabaseAdmin
          .from("fiscal_outbox" as never)
          .select("document_id, send_started_at, last_error_code")
          .eq("restaurant_id", restaurant.id)
          .eq("operation", "issue")
          .in(
            "document_id",
            docs.map((doc) => doc.id),
          )
      : { data: [], error: null };
    if (jobsError) throw new Error("Não foi possível conferir o estado do envio fiscal");
    const issueJobs = z
      .array(
        z.object({
          document_id: z.string().uuid(),
          send_started_at: z.string().nullable(),
          last_error_code: z.string().nullable(),
        }),
      )
      .parse(jobs);
    return {
      documents: docs.map((doc) => {
        const job = issueJobs.find((item) => item.document_id === doc.id);
        return {
          ...doc,
          send_started: Boolean(job?.send_started_at),
          dispatch_error: job?.last_error_code ?? null,
        };
      }),
    };
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
        "id, menu_item_id, uf, tax_regime, provider, valid_from, valid_until, ncm, cfop, unit, layout_version, tables_version, review_reference, attributes, calculation_rules",
      )
      .eq("restaurant_id", restaurant.id)
      .eq("environment", data.environment)
      .in(
        "menu_item_id",
        items.map((i) => i.id),
      )
      .order("valid_from", { ascending: false });
    if (profileError) throw new Error("Não foi possível ler os perfis fiscais");
    return { items, profiles: profiles as unknown as PerfilFiscalPublico[] };
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
        p_environment: data.environment,
        p_profile: data.profileId,
        p_until: data.validUntil,
      } as never,
    );
    if (error) throw new Error("Não foi possível encerrar a vigência deste perfil");
    return { closed: true };
  });

export const requestFiscalDocumentAction = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        slug: SlugFiscal,
        documentId: z.string().uuid(),
        requestId: z.string().uuid(),
        operation: z.enum(["consult", "cancel"]),
        reason: z.string().trim().min(15).max(255).optional(),
      })
      .strict()
      .refine((v) => v.operation !== "cancel" || Boolean(v.reason))
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug, data.operation === "cancel");
    const { enforceRate } = await import("./security.server");
    await enforceRate(`fiscal-action:${restaurant.id}:${ctx.userId}`, 20, 300, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: id, error } = await supabaseAdmin.rpc(
      "fiscal_request_document_action" as never,
      {
        p_restaurant: restaurant.id,
        p_actor: ctx.userId,
        p_document: data.documentId,
        p_request: data.requestId,
        p_operation: data.operation,
        p_reason: data.reason ?? null,
      } as never,
    );
    if (error)
      throw new Error(
        "Não foi possível solicitar a operação fiscal. Atualize o documento e confira a justificativa.",
      );
    return { jobId: String(id), queued: true };
  });

export const downloadFiscalArtifact = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z
      .object({
        slug: SlugFiscal,
        documentId: z.string().uuid(),
        kind: z.enum(["xml", "danfe", "cancelamento"]),
      })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug);
    const { enforceRate } = await import("./security.server");
    await enforceRate(`fiscal-download:${restaurant.id}:${ctx.userId}`, 30, 300, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin
      .from("fiscal_documents" as never)
      .select("environment, issuer_cnpj, access_key, state, artifacts")
      .eq("id", data.documentId)
      .eq("restaurant_id", restaurant.id)
      .single();
    if (error) throw new Error("Documento fiscal não encontrado");
    const doc = z
      .object({
        environment: z.enum(["homologacao", "producao"]),
        issuer_cnpj: z.string(),
        access_key: z.string(),
        state: z.string(),
        artifacts: z.record(z.string().nullable()),
      })
      .parse(raw);
    if (
      !["authorized", "cancelled"].includes(doc.state) ||
      (data.kind === "danfe" && doc.state !== "authorized") ||
      doc.access_key.slice(6, 20) !== doc.issuer_cnpj
    )
      throw new Error("O documento não está disponível para esta operação");
    const path = doc.artifacts[data.kind];
    if (!path) throw new Error("Arquivo ainda não disponibilizado pelo emissor");
    const { data: rawCfg, error: configError } = await supabaseAdmin
      .from("restaurant_fiscal_settings" as never)
      .select("cnpj, credentials_encrypted")
      .eq("restaurant_id", restaurant.id)
      .eq("environment", doc.environment)
      .single();
    if (configError) throw new Error("Credencial fiscal indisponível");
    const cfg = z.object({ cnpj: z.string(), credentials_encrypted: z.string() }).parse(rawCfg);
    if (cfg.cnpj !== doc.issuer_cnpj) throw new Error("Emitente divergente");
    const { decryptSecret } = await import("./pagarme.server");
    const { baixarArquivoFiscalFocus } = await import("./fiscal/artifacts.server");
    const file = await baixarArquivoFiscalFocus({
      environment: doc.environment,
      key: doc.access_key,
      path,
      token: await decryptSecret(cfg.credentials_encrypted),
      kind: data.kind,
    });
    const { Buffer } = await import("node:buffer");
    return {
      base64: Buffer.from(file.bytes).toString("base64"),
      mime: file.mime,
      filename: `${data.kind}-${doc.access_key}.${file.extension}`,
    };
  });

export const setFiscalEnabled = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    Escopo.extend({
      enabled: z.boolean(),
      review: z.string().trim().min(3).max(200).optional(),
      homologationDocumentId: z.string().uuid().optional(),
    })
      .strict()
      .refine((v) => !v.enabled || Boolean(v.review))
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug, true);
    const { isSimulationRestaurant } = await import("./pagarme.server");
    if (data.enabled && data.environment === "producao" && isSimulationRestaurant(data.slug))
      throw new Error("Restaurantes de demonstração não emitem notas em produção");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: enabled, error } = await supabaseAdmin.rpc(
      "fiscal_set_enabled" as never,
      {
        p_restaurant: restaurant.id,
        p_actor: ctx.userId,
        p_environment: data.environment,
        p_enabled: data.enabled,
        p_review: data.review ?? null,
        p_homologation_document: data.homologationDocumentId ?? null,
      } as never,
    );
    if (error)
      throw new Error(
        "Não foi possível habilitar a emissão. Confira a revisão fiscal e a NFC-e de homologação da mesma configuração.",
      );
    return { enabled: enabled === true };
  });

export const getFiscalSales = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    Escopo.extend({ offset: z.number().int().min(0).max(100000).default(0) })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { restaurant } = await autorizar(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows, error } = await supabaseAdmin
      .from("fiscal_sales" as never)
      .select("id, source_kind, table_number, created_at, payments_snapshot")
      .eq("restaurant_id", restaurant.id)
      .eq("source_kind", "table_bill")
      .order("created_at", { ascending: false })
      .order("id", { ascending: false })
      .range(data.offset, data.offset + 19);
    if (error) throw new Error("Não foi possível ler as vendas encerradas");
    const sales = z
      .array(
        z.object({
          id: z.string().uuid(),
          source_kind: z.string(),
          table_number: z.string().nullable(),
          created_at: z.string(),
          payments_snapshot: z.array(z.object({ status: z.string(), amount: z.number() })),
        }),
      )
      .parse(rows);
    const { data: docs, error: docsError } = sales.length
      ? await supabaseAdmin
          .from("fiscal_documents" as never)
          .select("id, source_sale_id, state")
          .eq("restaurant_id", restaurant.id)
          .eq("environment", data.environment)
          .in(
            "source_sale_id",
            sales.map((sale) => sale.id),
          )
          .in("state", ["draft", "queued", "processing", "uncertain", "authorized"])
      : { data: [], error: null };
    if (docsError) throw new Error("Não foi possível conferir as notas das vendas");
    const active = z
      .array(
        z.object({ id: z.string().uuid(), source_sale_id: z.string().uuid(), state: z.string() }),
      )
      .parse(docs);
    return {
      sales: sales.map((s) => ({
        id: s.id,
        sourceKind: s.source_kind,
        table: s.table_number,
        createdAt: s.created_at,
        document: active.find((doc) => doc.source_sale_id === s.id) ?? null,
        paidAtCloseCents: s.payments_snapshot
          .filter((p) => p.status === "approved")
          .reduce((sum, p) => sum + Math.round(p.amount * 100), 0),
      })),
    };
  });

async function prepararVendaAutorizada(
  authorized: Awaited<ReturnType<typeof autorizar>>,
  input: {
    slug: string;
    environment: "homologacao" | "producao";
    saleId: string;
    manualPayments?: import("./fiscal/payments").ManualPagamentoFiscal[];
  },
) {
  const { ctx, restaurant } = authorized;
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { prepararVendaFiscalServidor } = await import("./fiscal/source.server");
  const prepared = await prepararVendaFiscalServidor(supabaseAdmin, {
    restaurantId: restaurant.id,
    slug: input.slug,
    registeredCnpj: restaurant.cnpj,
    environment: input.environment,
    saleId: input.saleId,
    ...(input.manualPayments ? { manualPayments: input.manualPayments } : {}),
  });
  return { ctx, restaurant, prepared, supabaseAdmin };
}
const VendaFiscalInput = Escopo.extend({
  saleId: z.string().uuid(),
  manualPayments: z.array(ManualPagamentoFiscal).max(1000).default([]),
});
export const prepareFiscalSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) => VendaFiscalInput.strict().parse(input))
  .handler(async ({ data, context }) => {
    const { enforceRate } = await import("./security.server");
    const { ctx, restaurant } = await autorizar(context, data.slug);
    await enforceRate(`fiscal-preview:${restaurant.id}:${ctx.userId}`, 60, 60, data.slug);
    const { prepared: p } = await prepararVendaAutorizada({ ctx, restaurant }, data);
    const items = z
      .array(
        z.object({
          codigo_produto: z.string(),
          descricao: z.string(),
          quantidade_comercial: z.number(),
          valor_unitario_comercial: z.number(),
          valor_bruto: z.number(),
          valor_outras_despesas: z.number(),
          codigo_ncm: z.string(),
          cfop: z.string(),
        }),
      )
      .parse(p.prepared.payload["items"]);
    return {
      fingerprint: p.fingerprint,
      amountCents: p.prepared.amountCents,
      taxDate: p.taxDate,
      enabled: p.cfg.enabled,
      uf: p.cfg.uf,
      taxRegime: p.cfg.tax_regime,
      table: p.source.table_number,
      items: items.map((i) => ({
        code: i.codigo_produto,
        name: i.descricao,
        quantity: i.quantidade_comercial,
        unitPrice: i.valor_unitario_comercial,
        gross: i.valor_bruto,
        expenses: i.valor_outras_despesas,
        ncm: i.codigo_ncm,
        cfop: i.cfop,
      })),
    };
  });

export const issueFiscalSale = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    VendaFiscalInput.extend({
      fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
      requestId: z.string().uuid(),
    })
      .strict()
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    const { enforceRate } = await import("./security.server");
    const { ctx, restaurant } = await autorizar(context, data.slug);
    await enforceRate(`fiscal-issue:${restaurant.id}:${ctx.userId}`, 30, 60, data.slug);
    const { isSimulationRestaurant } = await import("./pagarme.server");
    if (data.environment === "producao" && isSimulationRestaurant(data.slug))
      throw new Error("Restaurantes de demonstração não emitem notas em produção");
    const { prepared: p, supabaseAdmin } = await prepararVendaAutorizada({ ctx, restaurant }, data);
    if (p.fingerprint !== data.fingerprint)
      throw new Error(
        "A venda, os pagamentos ou os tributos mudaram. Confira novamente antes de emitir.",
      );
    if (!p.cfg.enabled) throw new Error("O responsável precisa habilitar a emissão neste ambiente");
    const payments = p.sale.payments.map((payment) => ({
      ...payment,
      manual_fiscal_proof: p.manualProofs.find((proof) => proof.paymentId === payment.id) ?? null,
      fiscal_proof: p.proofs.find((proof) => proof.paymentId === payment.id) ?? null,
    }));
    const { data: result, error } = await supabaseAdmin.rpc(
      "fiscal_enqueue_sale" as never,
      {
        p_restaurant: restaurant.id,
        p_actor: ctx.userId,
        p_sale: data.saleId,
        p_environment: data.environment,
        p_request: data.requestId,
        p_configuration_version: p.cfg.updated_at,
        p_tax_date: p.taxDate,
        p_payload: p.prepared.payload,
        p_amount: p.prepared.amountCents,
        p_payments: payments,
        p_profile_ids: p.profiles.map((profile) => profile.id),
        p_fingerprint: p.fingerprint,
      } as never,
    );
    if (error)
      throw new Error(
        "Não foi possível enfileirar. Atualize a venda e a configuração fiscal antes de tentar novamente.",
      );
    return z
      .object({ id: z.string().uuid(), state: z.string(), existing: z.boolean() })
      .parse(result);
  });

export const discardFiscalPreparation = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slug: SlugFiscal, documentId: z.string().uuid() }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { ctx, restaurant } = await autorizar(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: discarded, error } = await supabaseAdmin.rpc(
      "fiscal_discard_unsent" as never,
      { p_restaurant: restaurant.id, p_actor: ctx.userId, p_document: data.documentId } as never,
    );
    if (error)
      throw new Error(
        "Não é possível descartar se o envio já começou. Consulte a mesma referência no emissor.",
      );
    return { discarded: discarded === true };
  });

export const getFiscalManualPayments = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input) =>
    z.object({ slug: SlugFiscal, saleId: z.string().uuid() }).strict().parse(input),
  )
  .handler(async ({ data, context }) => {
    const { restaurant } = await autorizar(context, data.slug);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: raw, error } = await supabaseAdmin
      .from("fiscal_sales" as never)
      .select("payments_snapshot")
      .eq("restaurant_id", restaurant.id)
      .eq("id", data.saleId)
      .single();
    if (error) throw new Error("Venda não encontrada neste restaurante");
    const source = z
      .object({
        payments_snapshot: z.array(
          z.object({
            id: z.string().uuid(),
            status: z.string(),
            method: z.string(),
            establishment_method: z.string().nullable(),
          }),
        ),
      })
      .parse(raw);
    const ids = source.payments_snapshot
      .filter(
        (p) =>
          p.status === "approved" &&
          p.method === "at_establishment" &&
          p.establishment_method === "card_terminal",
      )
      .map((p) => p.id);
    const payments: { id: string; customer: string; amountCents: number; createdAt: string }[] = [];
    for (let i = 0; i < ids.length; i += 100) {
      const { data: rows, error: paymentError } = await supabaseAdmin
        .from("archived_payments")
        .select("id, customer_name, amount, created_at")
        .eq("restaurant_slug", data.slug)
        .eq("payment_target", "restaurant")
        .eq("status", "approved")
        .eq("payment_method", "at_establishment")
        .eq("establishment_method", "card_terminal")
        .in("id", ids.slice(i, i + 100));
      if (paymentError) throw new Error("Não foi possível conferir os pagamentos presenciais");
      const parsed = z
        .array(
          z.object({
            id: z.string().uuid(),
            customer_name: z.string().nullable(),
            amount: z.number(),
            created_at: z.string(),
          }),
        )
        .parse(rows);
      payments.push(
        ...parsed.map((p) => ({
          id: p.id,
          customer: p.customer_name ?? "Cliente",
          amountCents: Math.round(p.amount * 100),
          createdAt: p.created_at,
        })),
      );
    }
    if (payments.length !== ids.length)
      throw new Error(
        "Os pagamentos presenciais mudaram. Atualize e faça a conciliação antes de emitir.",
      );
    return { payments };
  });
