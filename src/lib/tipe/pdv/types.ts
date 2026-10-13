// Modelo canônico da TIPE. Toda a plataforma (conta do cliente, divisão,
// pagamento, gorjeta e painel) trabalha só com estas entidades, sem saber
// qual sistema do restaurante originou os dados.

export type AdapterId = string; // ex.: "lancamento_tipe", "api_tipe"

/** Origem de qualquer registro vindo de um sistema externo. */
export type Origem = { externalId: string | null; sourceAdapter: AdapterId };

export type Restaurante = { id: string; slug: string; nome: string };

export type StatusMesa = "livre" | "aberta" | "pagamento_pendente" | "fechada";
export type Mesa = Origem & { id: string; numero: string; status: StatusMesa };

export type StatusConta = "aberta" | "fechada";
export type Conta = Origem & { id: string; mesaId: string; abertura: string; fechamento: string | null; status: StatusConta };

export type StatusItem = "pendente" | "parcialmente_pago" | "pago" | "cancelado";
export type ItemConta = Origem & {
  id: string;
  nome: string;
  quantidade: number;
  precoUnitario: number;
  total: number;
  observacao: string | null;
  garcom: string | null;
  lancadoEm: string;
  status: StatusItem;
  /** Frações já pagas (ex.: 1.5 = um item e meio). */
  fracaoPaga: number;
  /** Frações reservadas por pagamentos em andamento. */
  fracaoReservada: number;
};

export type Garcom = Origem & { id: string; nome: string };

/** Deriva o status canônico do item a partir das frações pagas. */
export function statusItem(quantidade: number, pago: number): StatusItem {
  if (quantidade <= 0) return "cancelado";
  if (pago <= 0.0001) return "pendente";
  if (pago + 0.0001 >= quantidade) return "pago";
  return "parcialmente_pago";
}

/** Deriva o status canônico da mesa. */
export function statusMesa(qtdItens: number, disponivel: number, pagamentosPendentes: number): StatusMesa {
  if (qtdItens === 0) return "livre";
  if (pagamentosPendentes > 0) return "pagamento_pendente";
  if (disponivel <= 0.0001) return "fechada";
  return "aberta";
}

// ---------------- Eventos canônicos ----------------
// Cada adaptador traduz o formato do sistema dele para um destes eventos.
type MesaRef = { number: string; external_id?: string | null };
export type EventoCanonico =
  | { type: "table_opened"; table: MesaRef }
  | { type: "table_closed"; table: MesaRef }
  | { type: "item_added"; table: MesaRef; item: { external_id?: string | null; code?: string | null; name: string; unit_price: number; quantity: number; notes?: string | null; waiter_name?: string | null } }
  | { type: "item_cancelled"; table: MesaRef; item: { external_id?: string | null; code?: string | null; quantity: number }; reason?: string };

/** Evento já traduzido + id único do evento no sistema de origem (idempotência). */
export type EventoRecebido = { eventId: string; evento: EventoCanonico };

// ---------------- Contrato de adaptador ----------------
export type Capacidades = {
  /** Recebe mudanças em tempo real por webhook. */
  webhook: boolean;
  /** Precisa de consulta periódica (sistemas sem webhook). */
  consultaPeriodica: boolean;
  /** Consegue avisar o sistema de origem que itens foram pagos. */
  devolvePagamento: boolean;
  /** Exige credenciais (chave de API etc.). */
  exigeCredenciais: boolean;
};

export type ContextoAdaptador = {
  restaurantId: string;
  slug: string;
  /** Credenciais já descriptografadas. Só existem no servidor. */
  credenciais: Record<string, string> | null;
};

export type ResultadoConexao = { ok: true } | { ok: false; erro: string };

export interface AdaptadorPdv {
  id: AdapterId;
  /** Nome exibido no painel. */
  nome: string;
  /** Se aparece na lista de integrações disponíveis do restaurante. */
  visivelParaRestaurante: boolean;
  capacidades(): Capacidades;
  conectar(ctx: ContextoAdaptador, credenciais: Record<string, string>): Promise<ResultadoConexao>;
  testarConexao(ctx: ContextoAdaptador): Promise<ResultadoConexao>;
  desconectar(ctx: ContextoAdaptador): Promise<void>;
  listarMesas(ctx: ContextoAdaptador): Promise<Pick<Mesa, "numero" | "externalId">[]>;
  buscarConta(ctx: ContextoAdaptador, mesa: string): Promise<EventoRecebido[]>;
  /** Valida a origem do webhook. Retorna false para rejeitar. */
  validarWebhook(request: Request, corpo: string, segredoHash: string | null): Promise<boolean>;
  /** Traduz o payload do sistema para eventos canônicos. */
  receberEvento(payload: unknown): EventoRecebido[];
  /** Para sistemas sem webhook: devolve eventos novos daquela mesa. */
  sincronizar(ctx: ContextoAdaptador, mesa: string): Promise<EventoRecebido[]>;
  informarPagamento(ctx: ContextoAdaptador, pagamento: { mesa: string; itens: Record<string, number>; valor: number; forma: string; id: string }): Promise<ResultadoConexao>;
  /** Opcional: encerra a conta no sistema de origem quando tudo foi pago. */
  fecharConta?(ctx: ContextoAdaptador, mesa: string): Promise<ResultadoConexao>;
  /** Opcional: equipe cadastrada no sistema de origem, para vincular garçons. */
  listarGarcons?(ctx: ContextoAdaptador): Promise<{ externalId: string; nome: string }[]>;
}

export const LANCAMENTO_TIPE: AdapterId = "lancamento_tipe";
