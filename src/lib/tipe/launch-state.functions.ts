/**
 * Estado de lançamento dos produtos do site (tabela product_launch_states, migração 0028).
 * Leitura pública só por aqui (a tabela não tem grant para anon/authenticated); escrita
 * só pelo fundador com 2FA, com registro em security_events.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  ESTADOS_LANCAMENTO,
  LANCAMENTO_PADRAO,
  ehEstadoLancamento,
  lerSobrescritaDeTeste,
  type EstadoLancamento,
} from "./launch-state";

const Slug = z.string().regex(/^[a-z0-9-]{1,40}$/);

export type RespostaLancamento = {
  slug: string;
  estado: EstadoLancamento;
  /** banco = linha na tabela; padrao = catálogo (tabela ausente, vazia ou erro); teste = variável de teste em dev. */
  fonte: "banco" | "padrao" | "teste";
};

/** Pública: devolve o estado do produto ou o padrão do catálogo. Nunca lança por falta da tabela. */
export const getLaunchState = createServerFn({ method: "GET" })
  .inputValidator((d) => z.object({ slug: Slug }).parse(d))
  .handler(async ({ data }): Promise<RespostaLancamento> => {
    const padrao = LANCAMENTO_PADRAO[data.slug] ?? "disponivel";
    if (import.meta.env.DEV) {
      const teste = lerSobrescritaDeTeste(process.env["TIPE_LAUNCH_STATE_OVERRIDE"], data.slug);
      if (teste) return { slug: data.slug, estado: teste, fonte: "teste" };
    }
    if (!(data.slug in LANCAMENTO_PADRAO)) return { slug: data.slug, estado: padrao, fonte: "padrao" };
    try {
      const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
      const { data: row, error } = (await db
        .from("product_launch_states" as never)
        .select("state")
        .eq("product_slug", data.slug)
        .maybeSingle()) as unknown as { data: { state: string } | null; error: { message: string } | null };
      if (error || !row || !ehEstadoLancamento(row.state)) return { slug: data.slug, estado: padrao, fonte: "padrao" };
      return { slug: data.slug, estado: row.state, fonte: "banco" };
    } catch {
      // Sem Supabase configurado ou tabela ainda não criada: vale o padrão do catálogo.
      return { slug: data.slug, estado: padrao, fonte: "padrao" };
    }
  });

async function requireFounder(ctx: { supabase: any; userId: string; claims?: any }) {
  const { requireFounder2fa } = await import("./founder-guard");
  await requireFounder2fa(ctx);
}

export type LinhaLancamento = {
  slug: string;
  estado: EstadoLancamento;
  padrao: EstadoLancamento;
  atualizadoEm: string | null;
  tabelaDisponivel: boolean;
};

/** Backoffice: estado atual de cada produto configurável. */
export const listLaunchStates = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<LinhaLancamento[]> => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data, error } = (await db
      .from("product_launch_states" as never)
      .select("product_slug, state, updated_at")) as unknown as {
      data: { product_slug: string; state: string; updated_at: string }[] | null;
      error: { message: string } | null;
    };
    return Object.entries(LANCAMENTO_PADRAO).map(([slug, padrao]) => {
      const row = data?.find((r) => r.product_slug === slug);
      return {
        slug,
        padrao,
        estado: row && ehEstadoLancamento(row.state) ? row.state : padrao,
        atualizadoEm: row?.updated_at ?? null,
        tabelaDisponivel: !error,
      };
    });
  });

/** Backoffice: muda o estado de lançamento. Só fundador com 2FA; a ação fica registrada. */
export const setLaunchState = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        slug: Slug.refine((s) => s in LANCAMENTO_PADRAO, "Produto sem estado de lançamento"),
        estado: z.enum(ESTADOS_LANCAMENTO),
      })
      .parse(d),
  )
  .handler(async ({ data, context }) => {
    await requireFounder(context);
    const { supabaseAdmin: db } = await import("@/integrations/supabase/client.server");
    const { data: antes } = (await db
      .from("product_launch_states" as never)
      .select("state")
      .eq("product_slug", data.slug)
      .maybeSingle()) as unknown as { data: { state: string } | null };
    const { error } = await db.from("product_launch_states" as never).upsert(
      {
        product_slug: data.slug,
        state: data.estado,
        updated_by: context.userId,
        updated_at: new Date().toISOString(),
      } as never,
      { onConflict: "product_slug" },
    );
    if (error) throw new Error("Não foi possível salvar o estado. A migração 0028 já foi aplicada?");
    const { logSecurityEvent } = await import("./security.server");
    await logSecurityEvent({
      action: "product_launch_state_changed",
      resource: `produto:${data.slug}`,
      actorId: context.userId,
      detail: `${antes?.state ?? LANCAMENTO_PADRAO[data.slug]} -> ${data.estado}`,
    });
    return { ok: true as const };
  });
