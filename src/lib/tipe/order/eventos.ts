/**
 * Contratos de domínio do pedido, compartilhados por todas as modalidades do Tipe Order.
 *
 * O registro real continua em pdv_orders / pdv_order_items (migrações 0023–0027); nada aqui
 * cria tabela nova. Estes tipos dizem o que um pedido precisa carregar e quais eventos o
 * sistema emite, para que mesa, balcão, totem, retirada, delivery e (no futuro) comanda
 * falem a mesma língua. O simulador do site usa os mesmos tipos com dados fictícios.
 *
 * Regras que estes contratos protegem:
 * - Idempotência: todo pedido nasce com uma chave de requisição; a mesma chave nunca cria
 *   dois pedidos (índice pdv_orders_request).
 * - Pagamento é fato do Tipe Pay ou do caixa, nunca do navegador: "pagamento_confirmado"
 *   só existe com referência de pagamento.
 * - Item pago não se cancela (tabela table_bill_items: paid_portion).
 */
import type { CanalPedido, Modalidade, OrigemPedido } from "./modalidades";

export const STATUS_ITEM = ["aguardando_pagamento", "recebido", "preparando", "pronto", "entregue", "cancelado"] as const;
export type StatusItem = (typeof STATUS_ITEM)[number];

/** Correspondência com pdv_order_items.status. */
export const STATUS_ITEM_BANCO: Record<StatusItem, string> = {
  aguardando_pagamento: "pending_payment",
  recebido: "received",
  preparando: "preparing",
  pronto: "ready",
  entregue: "delivered",
  cancelado: "cancelled",
};

export type SetorProducao = "kitchen" | "bar";

export type ItemPedido = {
  code: string;
  nome: string;
  /** Centavos inteiros. */
  precoUnitario: number;
  quantidade: number;
  observacao?: string | undefined;
  setor: SetorProducao;
  status: StatusItem;
};

/** Identificação do consumidor conforme a modalidade. */
export type IdentificacaoPedido =
  | { tipo: "mesa"; mesa: string; sessaoConta: string }
  | { tipo: "senha"; senha: number; diaOperacao: string; cliente?: string | undefined }
  | { tipo: "comanda"; comanda: string; cliente?: string | undefined }
  | { tipo: "externo"; origem: string; referencia: string };

export type PedidoDominio = {
  id: string;
  restauranteId: string;
  /** Chave idempotente gerada por quem cria o pedido (8–64 caracteres). */
  chaveRequisicao: string;
  canal: CanalPedido;
  modalidade: Modalidade;
  origem: OrigemPedido;
  identificacao: IdentificacaoPedido;
  itens: ItemPedido[];
  /** Quem lançou (equipe) ou dispositivo (totem); null para pedido do cliente pelo celular. */
  responsavel?: { tipo: "equipe" | "dispositivo"; id: string } | undefined;
  criadoEm: string;
  /** Preenchido só pelo Tipe Pay ou pelo caixa: nunca pelo cliente. */
  pagamento?: { referencia: string; metodo: string; confirmadoEm: string } | undefined;
};

/* ------------------------------------------------------------------ Eventos */

export type EventoPedido =
  | { tipo: "pedido_criado"; pedidoId: string; chaveRequisicao: string; canal: CanalPedido; modalidade: Modalidade }
  | { tipo: "pedido_confirmado"; pedidoId: string }
  | { tipo: "pedido_enviado_cozinha"; pedidoId: string; setores: SetorProducao[] }
  | { tipo: "item_em_preparo"; pedidoId: string; itemCode: string }
  | { tipo: "item_pronto"; pedidoId: string; itemCode: string }
  | { tipo: "pedido_entregue"; pedidoId: string }
  | { tipo: "pedido_cancelado"; pedidoId: string; motivo: string; por: string }
  | { tipo: "conta_atualizada"; identificacao: IdentificacaoPedido; totalCentavos: number }
  | { tipo: "pagamento_confirmado"; pedidoId: string | null; referencia: string; metodo: string; valorCentavos: number };

export type TipoEvento = EventoPedido["tipo"];

export type EventoRegistrado = {
  /** Determinística: o mesmo evento gera o mesmo id, então repetir não duplica. */
  eventId: string;
  em: string;
  evento: EventoPedido;
};

/** Id determinístico do evento: tipo + pedido + item/referência. */
export function idDoEvento(e: EventoPedido): string {
  switch (e.tipo) {
    case "pedido_criado":
      return `${e.tipo}:${e.chaveRequisicao}`;
    case "item_em_preparo":
    case "item_pronto":
      return `${e.tipo}:${e.pedidoId}:${e.itemCode}`;
    case "pagamento_confirmado":
      return `${e.tipo}:${e.referencia}`;
    case "conta_atualizada":
      return `${e.tipo}:${chaveIdentificacao(e.identificacao)}:${e.totalCentavos}`;
    default:
      return `${e.tipo}:${e.pedidoId}`;
  }
}

export function chaveIdentificacao(i: IdentificacaoPedido): string {
  switch (i.tipo) {
    case "mesa":
      return `mesa:${i.mesa}:${i.sessaoConta}`;
    case "senha":
      return `senha:${i.diaOperacao}:${i.senha}`;
    case "comanda":
      return `comanda:${i.comanda}`;
    case "externo":
      return `externo:${i.origem}:${i.referencia}`;
  }
}

/** Transições permitidas de status de item. Cancelar vale de qualquer estado não final. */
const PROXIMOS: Record<StatusItem, StatusItem[]> = {
  aguardando_pagamento: ["recebido", "cancelado"],
  recebido: ["preparando", "pronto", "cancelado"],
  preparando: ["pronto", "recebido", "cancelado"],
  pronto: ["entregue", "preparando", "cancelado"],
  entregue: [],
  cancelado: [],
};

export function podeMudarStatus(de: StatusItem, para: StatusItem): boolean {
  return PROXIMOS[de].includes(para);
}

/**
 * Cancelamento consistente: item pago (ou com pagamento em andamento) não se cancela.
 * `pagoPorcao` é a fração já paga do item na conta (table_bill_items.paid_portion).
 */
export function podeCancelarItem(item: ItemPedido, pagoPorcao = 0, reservadoPorcao = 0): boolean {
  if (item.status === "entregue" || item.status === "cancelado") return false;
  return pagoPorcao <= 0 && reservadoPorcao <= 0;
}

/** Valida a chave de requisição no mesmo formato que o banco aceita. */
export const chaveRequisicaoValida = (k: string) => /^[A-Za-z0-9_-]{8,64}$/.test(k);

/** Modalidade → como o pedido se identifica e quando vai para a cozinha. */
export const REGRAS_MODALIDADE: Record<
  Modalidade,
  { identificacao: IdentificacaoPedido["tipo"]; cozinhaApos: "envio" | "pagamento"; pagamentoPor: "tipe_pay" | "caixa" | "canal_externo" }
> = {
  mesas: { identificacao: "mesa", cozinhaApos: "envio", pagamentoPor: "tipe_pay" },
  balcao: { identificacao: "senha", cozinhaApos: "pagamento", pagamentoPor: "caixa" },
  retirada: { identificacao: "senha", cozinhaApos: "pagamento", pagamentoPor: "caixa" },
  totem: { identificacao: "senha", cozinhaApos: "pagamento", pagamentoPor: "caixa" },
  comanda: { identificacao: "comanda", cozinhaApos: "envio", pagamentoPor: "tipe_pay" },
  pulseira: { identificacao: "comanda", cozinhaApos: "envio", pagamentoPor: "tipe_pay" },
  delivery: { identificacao: "externo", cozinhaApos: "envio", pagamentoPor: "canal_externo" },
};

/** Total dos itens vivos, em centavos. */
export const totalDoPedido = (itens: ItemPedido[]) =>
  itens.filter((i) => i.status !== "cancelado").reduce((s, i) => s + i.precoUnitario * i.quantidade, 0);
