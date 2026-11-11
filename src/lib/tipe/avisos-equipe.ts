// Textos dos avisos no celular da equipe (web push). Puro, para testar sem banco.
// Regra: gorjeta extra só avisa o garçom; nunca entra nos avisos do restaurante.
import { TIP_SPLIT } from "./rules";

export type Destino = "garcom" | "gestao";
/** Tipos que cada pessoa pode silenciar em cada celular. */
export const TIPOS_AVISO = ["pagamento", "chamado", "gorjeta", "nota", "saque"] as const;
export type TipoAviso = (typeof TIPOS_AVISO)[number];
export const NOME_TIPO_AVISO: Record<TipoAviso, string> = {
  pagamento: "Pagamentos das mesas",
  chamado: "Chamados das mesas",
  gorjeta: "Gorjetas",
  nota: "Notas baixas",
  saque: "Saques via Pix",
};
// `url` é a tela da gestão; o garçom sempre abre a área dele (/garcom).
export type Aviso = {
  tipo: TipoAviso;
  titulo: string;
  corpo: string;
  url: string;
  tag: string;
  para: Destino[];
};

export type PagamentoAviso = {
  id: string;
  mesa: string;
  slug: string;
  valor: number;
  alvo: string; // "restaurant" | "tipe"
  metodo: string;
  status: string;
  formaLocal?: string | null; // "cash" | "card_terminal"
  contaQuitada?: boolean;
};

const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function avisoDePagamento(p: PagamentoAviso): Aviso | null {
  const painel = `/${p.slug}`;
  if (p.alvo === "tipe") {
    if (p.status !== "approved") return null;
    const parte = Math.round(p.valor * 100 * TIP_SPLIT.waiter) / 100;
    return {
      tipo: "gorjeta",
      titulo: "Você recebeu uma gorjeta",
      corpo: `Mesa ${p.mesa}: ${brl(parte)} para você.`,
      url: "/garcom",
      tag: `gorjeta-${p.id}`,
      para: ["garcom"],
    };
  }
  if (p.alvo !== "restaurant") return null;
  if (p.status === "pending" && p.metodo === "at_establishment") {
    const forma = p.formaLocal === "cash" ? "em dinheiro" : "na maquininha";
    return {
      tipo: "pagamento",
      titulo: `Mesa ${p.mesa} quer pagar ${forma}`,
      corpo: `${brl(p.valor)} aguardando confirmação.`,
      url: painel,
      tag: `local-${p.id}`,
      para: ["garcom", "gestao"],
    };
  }
  if (p.status !== "approved") return null;
  if (p.contaQuitada) {
    return {
      tipo: "pagamento",
      titulo: `Mesa ${p.mesa} pagou tudo`,
      corpo: `Último pagamento de ${brl(p.valor)}. A mesa pode ser liberada.`,
      url: painel,
      tag: `quitada-${p.mesa}`,
      para: ["garcom", "gestao"],
    };
  }
  return {
    tipo: "pagamento",
    titulo: `Mesa ${p.mesa} pagou ${brl(p.valor)}`,
    corpo: "Ainda há itens em aberto na conta.",
    url: "/garcom",
    tag: `pago-${p.id}`,
    para: ["garcom"],
  };
}

export function avisoDeNota(
  mesa: string,
  estrelas: number,
  comentario?: string | null,
): Aviso | null {
  if (estrelas > 2) return null;
  const texto = comentario?.trim() ? `"${comentario.trim().slice(0, 90)}"` : "Vale passar na mesa.";
  return {
    tipo: "nota",
    titulo: `Mesa ${mesa} deu nota ${estrelas}`,
    corpo: texto,
    url: "/garcom",
    tag: `nota-${mesa}`,
    para: ["garcom", "gestao"],
  };
}

/** Cliente tocou "Chamar garçom" ou "Pedir a conta": avisa o garçom da mesa e a gestão. */
export function avisoDeChamado(slug: string, mesa: string, tipo: "waiter" | "bill"): Aviso {
  return {
    tipo: "chamado",
    titulo: tipo === "bill" ? `Mesa ${mesa} pediu a conta` : `Mesa ${mesa} chamou o garçom`,
    corpo: tipo === "bill" ? "Leve a maquininha ou ajude com o pagamento." : "Passe na mesa.",
    url: `/${slug}`,
    tag: `chamado-${mesa}-${tipo}`,
    para: ["garcom", "gestao"],
  };
}

/** Saque resolvido pela TIPE: só o garçom dono do saque recebe. */
export function avisoDeSaque(
  id: string,
  status: "paid" | "rejected",
  valor: number,
  nota?: string | null,
): Aviso {
  return status === "paid"
    ? {
        tipo: "saque",
        titulo: "Seu Pix foi enviado",
        corpo: `${brl(valor)} a caminho da sua conta.`,
        url: "/garcom",
        tag: `saque-${id}`,
        para: ["garcom"],
      }
    : {
        tipo: "saque",
        titulo: "Seu saque não foi pago",
        // Saque recusado não sai do saldo (waiter_balance ignora "rejected").
        corpo: nota?.trim()
          ? `${brl(valor)} voltou para o seu saldo. Motivo: ${nota.trim().slice(0, 80)}`
          : `${brl(valor)} voltou para o seu saldo. Confira na área do garçom.`,
        url: "/garcom",
        tag: `saque-${id}`,
        para: ["garcom"],
      };
}

/** Silenciados num celular: o aviso só vai se o tipo dele não estiver na lista. */
export function querReceber(silenciados: readonly string[] | null | undefined, tipo: TipoAviso) {
  return !(silenciados ?? []).includes(tipo);
}
