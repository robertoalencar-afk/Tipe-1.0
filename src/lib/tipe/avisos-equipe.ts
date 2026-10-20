// Textos dos avisos no celular da equipe (web push). Puro, para testar sem banco.
// Regra: gorjeta extra só avisa o garçom; nunca entra nos avisos do restaurante.
import { TIP_SPLIT } from "./rules";

export type Destino = "garcom" | "gestao";
// `url` é a tela da gestão; o garçom sempre abre a área dele (/garcom).
export type Aviso = { titulo: string; corpo: string; url: string; tag: string; para: Destino[] };

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
      titulo: `Mesa ${p.mesa} pagou tudo`,
      corpo: `Último pagamento de ${brl(p.valor)}. A mesa pode ser liberada.`,
      url: painel,
      tag: `quitada-${p.mesa}`,
      para: ["garcom", "gestao"],
    };
  }
  return {
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
    titulo: `Mesa ${mesa} deu nota ${estrelas}`,
    corpo: texto,
    url: "/garcom",
    tag: `nota-${mesa}`,
    para: ["garcom", "gestao"],
  };
}
