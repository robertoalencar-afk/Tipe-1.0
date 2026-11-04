import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Pedidos de integração (03/11): o dono envia a chave, o código de vínculo, o certificado
 * ou o arquivo do sistema escolhido no catálogo (src/components/tipe/site/integracoes/catalogo.ts).
 * Tudo que é segredo ou arquivo é criptografado no servidor antes de ir para o banco; a
 * leitura devolve só metadados. A equipe Tipe (fundador com 2FA) muda o status.
 */
const Slug = z
  .string()
  .min(1)
  .max(64)
  .regex(/^[a-z0-9-]+$/);
type Ctx = { supabase: any; userId: string; claims?: any };

async function isFounder(ctx: Ctx) {
  const { isFounderWith2fa } = await import("./founder-guard");
  return isFounderWith2fa(ctx);
}

async function authorize(ctx: Ctx, slug: string, roles: string[]) {
  const { data: r } = await ctx.supabase
    .from("restaurants")
    .select("id, slug")
    .eq("slug", slug)
    .maybeSingle();
  if (r) {
    const { data: ok } = await ctx.supabase.rpc("has_restaurant_role", {
      _user_id: ctx.userId,
      _restaurant_id: r.id,
      _roles: roles,
    });
    if (ok) return r as { id: string; slug: string };
  }
  if (await isFounder(ctx)) {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: fr } = await supabaseAdmin
      .from("restaurants")
      .select("id, slug")
      .eq("slug", slug)
      .maybeSingle();
    if (fr) return fr as { id: string; slug: string };
  }
  throw new Error(
    r ? "Somente o dono envia integrações" : "Restaurante não encontrado ou sem acesso",
  );
}

const MAX_ARQUIVO_B64 = 4_200_000; // ~3 MB de arquivo

export const sendIntegrationRequest = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: Slug,
        systemId: z.string().regex(/^[a-z0-9-]{2,40}$/),
        category: z.enum(["pdv", "delivery", "erp", "fiscal", "pagamentos", "cardapio"]),
        method: z.enum(["api", "autorizacao", "arquivo", "certificado", "webhook"]),
        credentials: z.record(z.string().max(60), z.string().max(2000)).optional(),
        file: z
          .object({
            name: z.string().min(1).max(200),
            type: z.string().max(100),
            b64: z.string().max(MAX_ARQUIVO_B64),
          })
          .optional(),
        notes: z.string().max(1000).optional(),
      })
      .refine(
        (x) =>
          (x.credentials && Object.values(x.credentials).some((v) => v.trim())) ||
          x.file ||
          x.method === "webhook",
        {
          message: "Envie a chave, o código ou o arquivo",
        },
      )
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const r = await authorize(ctx, data.slug, ["owner"]);
    const { encryptSecret } = await import("./pagarme.server");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const cred = data.credentials
      ? Object.fromEntries(Object.entries(data.credentials).filter(([, v]) => v.trim()))
      : null;
    const row = {
      restaurant_id: r.id,
      system_id: data.systemId,
      category: data.category,
      method: data.method,
      credentials_encrypted:
        cred && Object.keys(cred).length ? await encryptSecret(JSON.stringify(cred)) : null,
      file_name: data.file?.name ?? null,
      file_type: data.file?.type || null,
      file_encrypted: data.file ? await encryptSecret(data.file.b64) : null,
      notes: data.notes?.trim() || null,
      created_by: ctx.userId,
    };
    const { data: ins, error } = (await supabaseAdmin
      .from("integration_requests" as never)
      .insert(row as never)
      .select("id")
      .single()) as unknown as { data: { id: string } | null; error: { message: string } | null };
    if (error || !ins) throw new Error("Não foi possível enviar agora. Tente de novo.");
    return { id: ins.id };
  });

export type PedidoIntegracao = {
  id: string;
  system_id: string;
  category: string;
  method: string;
  file_name: string | null;
  tem_credencial: boolean;
  status: "recebido" | "em_ativacao" | "ativo" | "precisa_ajuste";
  status_note: string | null;
  created_at: string;
};

export const listIntegrationRequests = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data, context }) => {
    const ctx = context as Ctx;
    const r = await authorize(ctx, data.slug, ["owner"]);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: rows } = (await supabaseAdmin
      .from("integration_requests" as never)
      .select(
        "id, system_id, category, method, file_name, credentials_encrypted, status, status_note, created_at",
      )
      .eq("restaurant_id", r.id)
      .order("created_at", { ascending: false })
      .limit(50)) as unknown as {
      data:
        | (Omit<PedidoIntegracao, "tem_credencial"> & { credentials_encrypted: string | null })[]
        | null;
    };
    return {
      isFounder: await isFounder(ctx),
      pedidos: (rows ?? []).map(({ credentials_encrypted, ...p }) => ({
        ...p,
        tem_credencial: !!credentials_encrypted,
      })) as PedidoIntegracao[],
    };
  });

export const setIntegrationRequestStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        id: z.string().uuid(),
        status: z.enum(["recebido", "em_ativacao", "ativo", "precisa_ajuste"]),
        note: z.string().max(500).optional(),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    if (!(await isFounder(context as Ctx))) throw new Error("Somente a equipe Tipe muda o status");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("integration_requests" as never)
      .update({
        status: data.status,
        status_note: data.note?.trim() || null,
        updated_at: new Date().toISOString(),
      } as never)
      .eq("id", data.id);
    if (error) throw new Error("Não foi possível atualizar");
    return { ok: true };
  });
