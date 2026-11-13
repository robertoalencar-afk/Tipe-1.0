import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { z } from "zod";
import { normalizarCnpjFiscal, PerfilProdutoFiscal } from "./schemas";
import { VendaFiscal, prepararNfcePresencial, pagamentosAprovadosDaVenda } from "./sale";
import {
  ManualPagamentoFiscal,
  prepararPagamentosFiscais,
  type ProvaPagamentoFiscal,
} from "./payments";
import { consultarComprovacaoPagarme } from "./pagarme-proof.server";
import { instanteFiscal } from "./time";
import type { AmbienteFiscal } from "./contract";

const Source = z.object({
  id: z.string().uuid(),
  source_kind: z.literal("table_bill"),
  source_reference: z.string(),
  table_number: z.string(),
  created_at: z.string(),
  items_snapshot: z.unknown(),
  payments_snapshot: z.unknown(),
});
const Settings = z.object({
  cnpj: z.string(),
  uf: z.string(),
  tax_regime: z.string(),
  time_zone: z.string(),
  updated_at: z.string(),
  configuration_revision: z.string().uuid(),
  enabled: z.boolean(),
  acquirer_cnpj: z.string().nullable(),
  service_fee_policy: z.enum(["blocked", "allocate_expenses"]),
  service_fee_review: z.string().nullable(),
});
const MenuItem = z.object({ id: z.string().uuid(), code: z.string() });
const Profile = z.object({
  id: z.string().uuid(),
  menu_item_id: z.string().uuid(),
  valid_from: z.string(),
  valid_until: z.string().nullable(),
  ncm: z.string(),
  cfop: z.string(),
  unit: z.string(),
  layout_version: z.string(),
  tables_version: z.string(),
  review_reference: z.string(),
  attributes: z.unknown(),
  calculation_rules: z.unknown(),
});
const CurrentPayment = z.object({
  id: z.string().uuid(),
  payment_method: z.string(),
  status: z.string(),
  amount: z.number(),
  service_fee_amount: z.number().nullable(),
  establishment_method: z.string().nullable(),
  provider: z.string().nullable(),
  provider_order_id: z.string().nullable(),
});
function ordered(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(ordered);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.entries(value)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => [k, ordered(v)]),
    );
  return value;
}
export async function fingerprintFiscal(value: unknown) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(JSON.stringify(ordered(value))),
  );
  return Array.from(new Uint8Array(hash), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

/** Chamado somente após autorização explícita do restaurante no handler.
 * Não grava pagamentos e não emite a nota: prepara fatos canônicos para conferência.
 */
export async function prepararVendaFiscalServidor(
  db: SupabaseClient<Database>,
  scope: {
    restaurantId: string;
    slug: string;
    registeredCnpj: string | null;
    environment: AmbienteFiscal;
    saleId: string;
    manualPayments?: import("./payments").ManualPagamentoFiscal[];
  },
  deps: {
    now?: () => Date;
    providerKey?: (rid: string) => Promise<string | null>;
    proof?: typeof consultarComprovacaoPagarme;
  } = {},
) {
  const { data: rawSource, error: sourceError } = await db
    .from("fiscal_sales" as never)
    .select(
      "id, source_kind, source_reference, table_number, created_at, items_snapshot, payments_snapshot",
    )
    .eq("restaurant_id", scope.restaurantId)
    .eq("id", scope.saleId)
    .single();
  if (sourceError) throw new Error("Venda fiscal não encontrada neste restaurante");
  const source = Source.parse(rawSource);
  const { data: rawCfg, error: cfgError } = await db
    .from("restaurant_fiscal_settings" as never)
    .select(
      "cnpj, uf, tax_regime, time_zone, updated_at, configuration_revision, enabled, acquirer_cnpj, service_fee_policy, service_fee_review",
    )
    .eq("restaurant_id", scope.restaurantId)
    .eq("environment", scope.environment)
    .single();
  if (cfgError) throw new Error("Configure os dados fiscais do restaurante neste ambiente");
  const cfg = Settings.parse(rawCfg);
  if (!scope.registeredCnpj || normalizarCnpjFiscal(scope.registeredCnpj) !== cfg.cnpj)
    throw new Error("O emitente fiscal difere do CNPJ cadastrado no restaurante");
  const taxDate = instanteFiscal(deps.now?.() ?? new Date(), cfg.time_zone).slice(0, 10);
  const parsedSale = VendaFiscal.safeParse({
    items: source.items_snapshot,
    payments: source.payments_snapshot,
  });
  if (!parsedSale.success)
    throw new Error(
      "A venda não tem todos os dados necessários à emissão. Concilie itens, pagamentos e taxa de serviço antes de continuar.",
    );
  const sale = parsedSale.data;
  // Verifica reversões e divergências posteriores ao arquivamento, sem editar o snapshot.
  const current = new Map<string, z.infer<typeof CurrentPayment>>();
  const ids = sale.payments.map((p) => p.id);
  for (let i = 0; i < ids.length; i += 100) {
    const { data, error } = await db
      .from("archived_payments")
      .select(
        "id, payment_method, status, amount, service_fee_amount, establishment_method, provider, provider_order_id",
      )
      .eq("restaurant_slug", scope.slug)
      .eq("payment_target", "restaurant")
      .in("id", ids.slice(i, i + 100));
    if (error) throw new Error("Não foi possível conciliar os pagamentos arquivados");
    for (const raw of data ?? []) {
      const p = CurrentPayment.parse(raw);
      if (current.has(p.id)) throw new Error("Pagamento arquivado duplicado");
      current.set(p.id, p);
    }
  }
  for (const p of sale.payments) {
    const c = current.get(p.id);
    if (
      !c ||
      c.amount !== p.amount ||
      c.service_fee_amount !== p.service_fee ||
      c.payment_method !== p.method ||
      c.establishment_method !== p.establishment_method ||
      c.provider !== p.provider ||
      c.provider_order_id !== p.provider_order_id
    )
      throw new Error(
        "O pagamento mudou desde o encerramento da venda. Faça a conciliação antes de emitir",
      );
    p.status = c.status;
  }
  const approved = pagamentosAprovadosDaVenda(sale);
  const digital = approved.filter((p) => p.method !== "at_establishment");
  const proofs: ProvaPagamentoFiscal[] = [];
  if (digital.length) {
    if (!cfg.acquirer_cnpj || digital.some((p) => p.provider !== "pagarme" || !p.provider_order_id))
      throw new Error(
        "Configure a credenciadora e concilie os pagamentos digitais antes de emitir",
      );
    const key = await (
      deps.providerKey ??
      (async (rid) => (await import("../pagarme.server")).restaurantPagarmeKey(rid))
    )(scope.restaurantId);
    if (!key)
      throw new Error("Conecte a conta de pagamentos deste restaurante para a conferência fiscal");
    const acquirerCnpj = cfg.acquirer_cnpj;
    let cursor = 0;
    let failed = false;
    const deadline = Date.now() + 60000;
    const workers = Array.from({ length: Math.min(4, digital.length) }, async () => {
      while (cursor < digital.length && !failed) {
        const index = cursor++;
        const payment = digital[index]!;
        try {
          if (Date.now() > deadline)
            throw new Error(
              "A conferência dos pagamentos demorou. Tente novamente; a nota não foi enviada.",
            );
          proofs[index] = await (deps.proof ?? consultarComprovacaoPagarme)(
            {
              paymentId: payment.id,
              orderId: payment.provider_order_id!,
              amountCents: Math.round(payment.amount * 100),
              acquirerCnpj,
            },
            key,
          );
        } catch (error) {
          failed = true;
          throw error;
        }
      }
    });
    const results = await Promise.allSettled(workers);
    const rejected = results.find(
      (result): result is PromiseRejectedResult => result.status === "rejected",
    );
    if (rejected) throw rejected.reason;
  }
  const menu: z.infer<typeof MenuItem>[] = [];
  const codes = sale.items.map((item) => item.code);
  for (let i = 0; i < codes.length; i += 100) {
    const { data, error } = await db
      .from("pdv_menu_items")
      .select("id, code")
      .eq("restaurant_id", scope.restaurantId)
      .in("code", codes.slice(i, i + 100));
    if (error) throw new Error("Não foi possível conferir o cadastro dos produtos");
    menu.push(...z.array(MenuItem).parse(data));
  }
  const profiles: z.infer<typeof Profile>[] = [];
  for (let i = 0; i < menu.length; i += 100) {
    const { data, error } = await db
      .from("fiscal_product_profiles" as never)
      .select(
        "id, menu_item_id, valid_from, valid_until, ncm, cfop, unit, layout_version, tables_version, review_reference, attributes, calculation_rules",
      )
      .eq("restaurant_id", scope.restaurantId)
      .eq("environment", scope.environment)
      .eq("uf", cfg.uf)
      .eq("tax_regime", cfg.tax_regime)
      .lte("valid_from", taxDate)
      .or(`valid_until.is.null,valid_until.gte.${taxDate}`)
      .in(
        "menu_item_id",
        menu.slice(i, i + 100).map((m) => m.id),
      );
    if (error) throw new Error("Não foi possível conferir as vigências tributárias");
    profiles.push(...z.array(Profile).parse(data));
  }
  profiles.sort((a, b) => a.id.localeCompare(b.id));
  const products = profiles.map((p) => ({
    code: menu.find((m) => m.id === p.menu_item_id)!.code,
    profile: PerfilProdutoFiscal.parse({
      itemId: p.menu_item_id,
      validFrom: p.valid_from,
      validUntil: p.valid_until,
      ncm: p.ncm,
      cfop: p.cfop,
      unit: p.unit,
      layoutVersion: p.layout_version,
      tablesVersion: p.tables_version,
      reviewReference: p.review_reference,
      attributes: p.attributes,
      calculationRules: p.calculation_rules,
    }),
  }));
  const manualProofs = z
    .array(ManualPagamentoFiscal)
    .max(1000)
    .parse(scope.manualPayments ?? [])
    .sort((a, b) => a.paymentId.localeCompare(b.paymentId));
  const prepared = prepararNfcePresencial({
    cnpj: cfg.cnpj,
    taxDate,
    sale,
    products,
    payments: prepararPagamentosFiscais(sale, proofs, manualProofs),
    serviceFee: { policy: cfg.service_fee_policy, review: cfg.service_fee_review },
  });
  const fingerprint = await fingerprintFiscal({
    source,
    cfg,
    taxDate,
    sale,
    profiles,
    prepared,
    manualProofs,
    proofs,
  });
  return { source, cfg, taxDate, sale, profiles, proofs, prepared, fingerprint, manualProofs };
}
