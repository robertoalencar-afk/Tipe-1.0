// Conta do estabelecimento vinculada à assinatura. A regra vive no banco
// (restaurant_access, migração 0036); aqui só há textos e o mapa do webhook.

/** Módulos que um plano pode incluir (mesmo CHECK da migração 0036). */
export const PLAN_MODULES = ["order", "kds", "totem", "three_d", "guest"] as const;
export const MODULE_LABEL: Record<string, string> = {
  order: "Tipe Order",
  kds: "Tipe Cozinha",
  totem: "Totem",
  three_d: "Cardápio 3D",
  guest: "Tipe Reserva",
};

export type AccessState = "full" | "grace" | "blocked";
export type AccessReason =
  | "isento"
  | "ativa"
  | "teste"
  | "aguardando_cobranca"
  | "teste_encerrado"
  | "pagamento_atrasado"
  | "cancelada_ate_fim_do_periodo"
  | "cancelada"
  | "suspensa"
  | "sem_assinatura";

export interface Access {
  state: AccessState;
  reason: AccessReason;
  until?: string | null | undefined;
  since?: string | null | undefined;
}

const STATES = new Set<AccessState>(["full", "grace", "blocked"]);

/** Lê o jsonb do banco. Qualquer coisa estranha vira bloqueio (falha fechada). */
export function parseAccess(raw: unknown): Access {
  const o = (raw ?? {}) as Record<string, unknown>;
  const state = STATES.has(o["state"] as AccessState) ? (o["state"] as AccessState) : "blocked";
  const reason = (typeof o["reason"] === "string" ? o["reason"] : "sem_assinatura") as AccessReason;
  const str = (v: unknown) => (typeof v === "string" ? v : null);
  return { state, reason, until: str(o["until"]), since: str(o["since"]) };
}

const dia = (iso: string | null | undefined) =>
  iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "";

export function diasAte(iso: string | null | undefined, now = Date.now()) {
  if (!iso) return 0;
  return Math.max(0, Math.ceil((Date.parse(iso) - now) / 86_400_000));
}

export interface AccessCopy {
  tone: "ok" | "warn" | "error";
  title: string;
  text: string;
}

/** Texto do aviso no painel. `null` quando não há nada a avisar. */
export function accessNotice(a: Access, now = Date.now()): AccessCopy | null {
  const d = diasAte(a.until, now);
  switch (a.reason) {
    case "isento":
    case "ativa":
      return null;
    case "teste":
      return d <= 7
        ? {
            tone: "warn",
            title: `Faltam ${d} dia(s) de teste grátis`,
            text: `O teste termina em ${dia(a.until)}. Ative a assinatura para não interromper as mesas.`,
          }
        : null;
    case "aguardando_cobranca":
      return {
        tone: "warn",
        title: "Aguardando a primeira cobrança",
        text: `O cartão está cadastrado. Se a cobrança não for aprovada até ${dia(a.until)}, novas mesas deixam de abrir.`,
      };
    case "pagamento_atrasado":
      return a.state === "grace"
        ? {
            tone: "warn",
            title: "Pagamento da assinatura em atraso",
            text: `Tudo segue funcionando até ${dia(a.until)}. Atualize o cartão para evitar a suspensão.`,
          }
        : {
            tone: "error",
            title: "Conta suspensa por atraso",
            text: "Novas mesas e pedidos estão bloqueados. Mesas já abertas podem ser pagas normalmente.",
          };
    case "cancelada_ate_fim_do_periodo":
      return {
        tone: "warn",
        title: "Assinatura cancelada",
        text: `Você usa a TIPE até ${dia(a.until)}. Reative quando quiser.`,
      };
    case "cancelada":
      return {
        tone: "error",
        title: "Assinatura cancelada",
        text: "Novas mesas e pedidos estão bloqueados. Seus relatórios e históricos continuam disponíveis.",
      };
    case "teste_encerrado":
      return {
        tone: "error",
        title: "Seu teste grátis terminou",
        text: "Ative a assinatura para voltar a abrir mesas e pedidos. Mesas já abertas podem ser pagas normalmente.",
      };
    case "suspensa":
      return {
        tone: "error",
        title: "Conta suspensa pela TIPE",
        text: "Fale com a equipe TIPE para regularizar. Mesas já abertas podem ser pagas normalmente.",
      };
    default:
      return {
        tone: "error",
        title: "Conta sem assinatura",
        text: "Fale com a equipe TIPE para ativar um plano.",
      };
  }
}

/** Abas que continuam abertas com a conta bloqueada: dinheiro e dados do restaurante nunca ficam presos. */
export const ABAS_LIVRES_BLOQUEADO = [
  "inicio",
  "caixa",
  "historico",
  "relatorios",
  "recebimentos",
  "assinatura",
  "seguranca",
] as const;

export function abaLiberada(aba: string, a: Access) {
  return a.state !== "blocked" || (ABAS_LIVRES_BLOQUEADO as readonly string[]).includes(aba);
}

/**
 * Status local a partir do que o Pagar.me devolve (assinatura e, se houver, a
 * fatura do evento), sempre reconsultados na API e nunca lidos do corpo do webhook.
 */
export function statusFromProvider(
  subStatus: string,
  invoiceStatus?: string | null,
): string | null {
  if (subStatus === "canceled") return "canceled";
  if (subStatus === "future") return "trialing";
  if (invoiceStatus === "failed") return "past_due";
  if (invoiceStatus === "paid") return "active";
  // Assinatura "active" sem fatura paga não libera nada: só a fatura paga ativa.
  if (subStatus === "active") return null;
  return "past_due";
}

export const MOTIVOS_CANCELAMENTO = [
  "Preço",
  "Restaurante fechou ou vai fechar",
  "Faltou um recurso",
  "Problema técnico",
  "Vou usar outro sistema",
  "Outro motivo",
] as const;
