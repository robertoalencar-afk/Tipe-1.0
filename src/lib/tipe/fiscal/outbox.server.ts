import { ManualPagamentoFiscal } from "./payments";
import { prepararVendaFiscalServidor } from "./source.server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";
import { decryptSecret } from "../pagarme.server";
import { criarEmissorFocus } from "./focus.server";
import { processarTrabalhoFiscal, type TrabalhoFiscal } from "./processor";

const ClaimedJob = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  document_id: z.string().uuid(),
  lease_token: z.string().uuid(),
  operation: z.enum(["issue", "consult", "cancel"]),
  send_started_at: z.string().nullable(),
  reason: z.string().nullable(),
});
const Document = z.object({
  id: z.string().uuid(),
  restaurant_id: z.string().uuid(),
  provider_reference: z.string(),
  environment: z.enum(["homologacao", "producao"]),
  model: z.enum(["nfe", "nfce"]),
  state: z.string(),
  issuer_cnpj: z.string(),
  time_zone: z.string(),
  tax_date: z.string(),
  payload_snapshot: z.record(z.unknown()),
  payments_snapshot: z.array(z.record(z.unknown())),
  source_sale_id: z.string().uuid().nullable(),
  preparation_fingerprint: z.string().nullable(),
});
const Configuration = z.object({
  restaurant_id: z.string().uuid(),
  environment: z.enum(["homologacao", "producao"]),
  cnpj: z.string(),
  time_zone: z.string(),
  enabled: z.boolean(),
  credentials_encrypted: z.string(),
});
const STATES = {
  autorizado: "authorized",
  processando: "processing",
  rejeitado: "rejected",
  denegado: "denied",
  cancelado: "cancelled",
  desconhecido: "uncertain",
} as const;

/** Apenas rotina autenticada no servidor. Nenhuma credencial ou payload sai no resumo. */
export async function processarFilaFiscal(db: SupabaseClient<Database>, limit = 5) {
  const { data, error } = await db.rpc("fiscal_outbox_claim" as never, { p_limit: limit } as never);
  if (error) throw new Error("Não foi possível reservar a fila fiscal");
  let processed = 0;
  let deferred = 0;
  await Promise.all(
    ((data ?? []) as unknown[]).map(async (raw) => {
      try {
        const claimed = ClaimedJob.parse(raw);
        const { data: rawDocument, error: documentError } = await db
          .from("fiscal_documents" as never)
          .select(
            "id, restaurant_id, provider_reference, environment, model, state, issuer_cnpj, time_zone, tax_date, payload_snapshot, source_sale_id, preparation_fingerprint, payments_snapshot",
          )
          .eq("id", claimed.document_id)
          .eq("restaurant_id", claimed.restaurant_id)
          .single();
        if (documentError) throw new Error("document_read");
        const doc = Document.parse(rawDocument);
        const { data: rawCfg, error: configError } = await db
          .from("restaurant_fiscal_settings" as never)
          .select("restaurant_id, environment, cnpj, time_zone, enabled, credentials_encrypted")
          .eq("restaurant_id", claimed.restaurant_id)
          .eq("environment", doc.environment)
          .maybeSingle();
        if (configError) throw new Error("configuration_read");
        const cfg = rawCfg ? Configuration.parse(rawCfg) : null;
        const job: TrabalhoFiscal = {
          id: claimed.id,
          lease: claimed.lease_token,
          restaurantId: claimed.restaurant_id,
          operation: claimed.operation,
          sendStartedAt: claimed.send_started_at,
          reason: claimed.reason,
          document: {
            id: doc.id,
            restaurantId: doc.restaurant_id,
            reference: doc.provider_reference,
            environment: doc.environment,
            model: doc.model,
            state: doc.state,
            issuerCnpj: doc.issuer_cnpj,
            timeZone: doc.time_zone,
            taxDate: doc.tax_date,
            sourceSaleId: doc.source_sale_id,
            preparationFingerprint: doc.preparation_fingerprint,
            payload: doc.payload_snapshot as TrabalhoFiscal["document"]["payload"],
          },
          configuration: cfg
            ? {
                restaurantId: cfg.restaurant_id,
                cnpj: cfg.cnpj,
                timeZone: cfg.time_zone,
                enabled: cfg.enabled,
                environment: cfg.environment,
              }
            : null,
        };
        await processarTrabalhoFiscal(job, {
          async validateBeforeSend(j) {
            if (!j.document.sourceSaleId || !j.document.preparationFingerprint) return false;
            const { data: rawRestaurant, error } = await db
              .from("restaurants")
              .select("slug, cnpj")
              .eq("id", j.restaurantId)
              .single();
            if (error) throw new Error("source_restaurant_read");
            const restaurant = z
              .object({ slug: z.string(), cnpj: z.string().nullable() })
              .parse(rawRestaurant);
            const fresh = await prepararVendaFiscalServidor(db, {
              restaurantId: j.restaurantId,
              slug: restaurant.slug,
              registeredCnpj: restaurant.cnpj,
              environment: j.document.environment,
              saleId: j.document.sourceSaleId,
              manualPayments: doc.payments_snapshot.flatMap((payment) =>
                payment["manual_fiscal_proof"]
                  ? [ManualPagamentoFiscal.parse(payment["manual_fiscal_proof"])]
                  : [],
              ),
            });
            return fresh.fingerprint === j.document.preparationFingerprint;
          },
          async beginSend(j, payload) {
            const { data: started, error } = await db.rpc(
              "fiscal_outbox_begin_send" as never,
              { p_job: j.id, p_lease: j.lease, p_payload: payload } as never,
            );
            if (error) throw new Error("begin_send_failed");
            return started === true;
          },
          async emitter() {
            if (!cfg) throw new Error("configuration_missing");
            return criarEmissorFocus({
              ambiente: cfg.environment,
              cnpj: cfg.cnpj,
              token: await decryptSecret(cfg.credentials_encrypted),
              // Emissão é bloqueada pelo estado da configuração e pela RPC antes do POST.
              // A consulta de uma nota já enviada continua disponível após desabilitar.
              producaoHabilitada: true,
            });
          },
          async finish(j, outcome) {
            const r = outcome.result;
            const { data: finished, error } = await db.rpc(
              "fiscal_outbox_finish" as never,
              {
                p_job: j.id,
                p_lease: j.lease,
                p_error: outcome.error,
                p_fatal: outcome.fatal,
                p_result: r
                  ? {
                      state: STATES[r.estado],
                      key: r.chave,
                      sefazCode: r.codigoSefaz,
                      artifacts: r.arquivos ?? {},
                      protocol: r.protocolo ?? null,
                      authorizedAt: r.autorizadoEm ?? null,
                    }
                  : null,
              } as never,
            );
            if (error) throw new Error("finish_failed");
            return finished === true;
          },
        });
        processed++;
      } catch {
        // Lease expira e permite nova leitura. Erros e dados do provedor não são registrados.
        deferred++;
      }
    }),
  );
  return { processed, deferred };
}
