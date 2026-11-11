// Envia os avisos da equipe por web push. Nunca derruba o fluxo que chamou:
// sem chaves VAPID não faz nada, e qualquer erro ou demora é engolido.
import {
  avisoDeChamado,
  avisoDeNota,
  avisoDePagamento,
  avisoDeSaque,
  querReceber,
  type Aviso,
} from "./avisos-equipe";
import { enviarPush, type ChavesServidor } from "./web-push";

type Admin = Awaited<typeof import("@/integrations/supabase/client.server")>["supabaseAdmin"];
// Tabela nova (migração 0026): ainda fora dos tipos gerados.
type Inscricao = {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  muted_kinds: string[] | null;
};

const LIMITE_MS = 3000;

function chaves(): (ChavesServidor & { contato: string }) | null {
  const publicKey = process.env["VAPID_PUBLIC_KEY"];
  const privateKey = process.env["VAPID_PRIVATE_KEY"];
  if (!publicKey || !privateKey) return null;
  return {
    publicKey,
    privateKey,
    contato: process.env["VAPID_SUBJECT"] ?? "mailto:contato@tipe.digital",
  };
}

export function avisosAtivos() {
  return chaves() !== null;
}

/** Quem recebe: o garçom da mesa abre a área dele; dono e caixa abrem o painel do restaurante. */
async function destinatarios(
  admin: Admin,
  restaurantId: string,
  waiterId: string | null,
  aviso: Aviso,
): Promise<Map<string, string>> {
  const url = new Map<string, string>();
  if (aviso.para.includes("garcom") && waiterId) {
    const { data } = await admin
      .from("pdv_waiters")
      .select("user_id")
      .eq("id", waiterId)
      .eq("restaurant_id", restaurantId)
      .maybeSingle();
    if (data?.user_id) url.set(data.user_id, "/garcom");
  }
  if (aviso.para.includes("gestao")) {
    const { data } = await admin
      .from("user_roles")
      .select("user_id")
      .eq("restaurant_id", restaurantId)
      .in("role", ["owner", "cashier"]);
    for (const r of data ?? []) url.set(r.user_id, aviso.url);
  }
  return url;
}

async function entregar(admin: Admin, para: Map<string, string>, aviso: Aviso) {
  const k = chaves();
  if (!k || para.size === 0) return;
  const tabela = admin.from("staff_push_subscriptions" as never) as unknown as ReturnType<
    Admin["from"]
  >;
  const { data } = await (
    tabela.select("id, user_id, endpoint, p256dh, auth, muted_kinds") as unknown as {
      in: (c: string, v: string[]) => Promise<{ data: Inscricao[] | null }>;
    }
  ).in("user_id", [...para.keys()]);
  await Promise.all(
    // Cada celular pode silenciar tipos de aviso (pagamentos, gorjetas, notas, saques).
    (data ?? [])
      .filter((s) => querReceber(s.muted_kinds, aviso.tipo))
      .map(async (s) => {
        try {
          const mensagem = {
            title: aviso.titulo,
            body: aviso.corpo,
            url: para.get(s.user_id) ?? "/",
            tag: aviso.tag,
          };
          const status = await enviarPush(s, mensagem, k, k.contato);
          const t = admin.from("staff_push_subscriptions" as never) as unknown as {
            delete: () => { eq: (c: string, v: string) => Promise<unknown> };
            update: (v: object) => { eq: (c: string, v: string) => Promise<unknown> };
          };
          // 404/410: o navegador cancelou a inscrição; apaga para não insistir.
          if (status === 404 || status === 410) await t.delete().eq("id", s.id);
          else if (status < 300)
            await t.update({ last_sent_at: new Date().toISOString() }).eq("id", s.id);
        } catch {
          /* serviço de push fora do ar: o aviso na tela continua valendo */
        }
      }),
  );
}

async function comLimite(tarefa: () => Promise<void>) {
  if (!avisosAtivos()) return;
  try {
    await Promise.race([tarefa(), new Promise<void>((r) => setTimeout(r, LIMITE_MS))]);
  } catch (e) {
    console.error("avisos-equipe", e instanceof Error ? e.message : e);
  }
}

/** Avisa a equipe sobre um pagamento (pagar no local, pago, conta quitada, gorjeta). */
export function avisarPagamento(admin: Admin, paymentId: string) {
  return comLimite(async () => {
    const { data: p } = await admin
      .from("table_payment_requests")
      .select(
        "id, restaurant_slug, table_number, amount, payment_target, payment_method, status, establishment_method, waiter_id",
      )
      .eq("id", paymentId)
      .maybeSingle();
    if (!p) return;
    const { data: rest } = await admin
      .from("restaurants")
      .select("id")
      .eq("slug", p.restaurant_slug)
      .maybeSingle();
    if (!rest) return;
    let contaQuitada = false;
    if (p.payment_target === "restaurant" && p.status === "approved") {
      const { data: itens } = await admin
        .from("table_bill_items")
        .select("ordered_quantity, paid_portion")
        .eq("restaurant_slug", p.restaurant_slug)
        .eq("table_number", p.table_number);
      contaQuitada =
        (itens ?? []).length > 0 &&
        (itens ?? []).every((i) => Number(i.paid_portion) + 1e-4 >= Number(i.ordered_quantity));
    }
    const aviso = avisoDePagamento({
      id: p.id,
      mesa: p.table_number,
      slug: p.restaurant_slug,
      valor: Number(p.amount),
      alvo: p.payment_target,
      metodo: p.payment_method,
      status: p.status,
      formaLocal: p.establishment_method,
      contaQuitada,
    });
    if (!aviso) return;
    await entregar(admin, await destinatarios(admin, rest.id, p.waiter_id, aviso), aviso);
  });
}

/** Avisa garçom e gestão quando a mesa dá nota 1 ou 2. */
export function avisarNota(
  admin: Admin,
  restaurantId: string,
  waiterId: string | null,
  mesa: string,
  estrelas: number,
  comentario?: string | null,
) {
  return comLimite(async () => {
    const aviso = avisoDeNota(mesa, estrelas, comentario);
    if (!aviso) return;
    await entregar(admin, await destinatarios(admin, restaurantId, waiterId, aviso), aviso);
  });
}

/** Avisa o garçom quando a TIPE paga ou recusa o saque dele. */
export function avisarSaque(
  admin: Admin,
  saque: { id: string; waiterId: string; restaurantId: string; valor: number },
  status: "paid" | "rejected",
  nota?: string | null,
) {
  return comLimite(async () => {
    const aviso = avisoDeSaque(saque.id, status, saque.valor, nota);
    await entregar(
      admin,
      await destinatarios(admin, saque.restaurantId, saque.waiterId, aviso),
      aviso,
    );
  });
}

/** Avisa o garçom da mesa e a gestão quando o cliente chama pela conta do QR. */
export function avisarChamado(
  admin: Admin,
  restaurantId: string,
  waiterId: string | null,
  slug: string,
  mesa: string,
  tipo: "waiter" | "bill",
) {
  return comLimite(async () => {
    const aviso = avisoDeChamado(slug, mesa, tipo);
    await entregar(admin, await destinatarios(admin, restaurantId, waiterId, aviso), aviso);
  });
}

/** Pedido fica retido no banco; o push só convida a conferir na mesa. */
export async function avisarConferenciaPedido(admin: Admin, restaurantId: string, waiterId: string | null, slug: string, table: string, id: string, quantity: number) {
  const aviso: Aviso = { tipo: "chamado", titulo: `Mesa ${table}: conferir pedido`, corpo: `${quantity} itens aguardam sua confirmação na mesa antes de ir à cozinha.`, url: `/${slug}`, tag: `pedido-conferencia-${id}`, para: ["garcom", "gestao"] };
  await comLimite(async () => entregar(admin, await destinatarios(admin, restaurantId, waiterId, aviso), aviso));
}
