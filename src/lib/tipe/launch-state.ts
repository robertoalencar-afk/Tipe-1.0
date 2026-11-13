/**
 * Estado de lançamento de um produto do site (hoje só o Tipe Order usa). Puro: vale no
 * servidor, no navegador e nos testes. A fonte da verdade é a tabela
 * product_launch_states (migração 0028), mudada só pelo fundador no backoffice; sem
 * linha na tabela, vale o padrão do catálogo.
 *
 * Nenhum texto daqui promete data: o estado diz em que fase o produto está, não quando.
 */

export const ESTADOS_LANCAMENTO = [
  "em-desenvolvimento",
  "acesso-antecipado",
  "piloto",
  "disponivel",
] as const;

export type EstadoLancamento = (typeof ESTADOS_LANCAMENTO)[number];

export const ehEstadoLancamento = (v: unknown): v is EstadoLancamento =>
  typeof v === "string" && (ESTADOS_LANCAMENTO as readonly string[]).includes(v);

/** Produtos que têm estado de lançamento configurável, com o padrão de cada um. */
export const LANCAMENTO_PADRAO: Record<string, EstadoLancamento> = {
  order: "disponivel",
};

export const temLancamento = (slug: string) => slug in LANCAMENTO_PADRAO;

export type TextosLancamento = {
  /** Nome curto do estado (backoffice e leitores de tela). */
  nome: string;
  /** Selo do menu, dos cards e do topo da página; null = sem selo. */
  selo: string | null;
  /** Texto do botão principal (CTA) da página. */
  cta: string;
  /** Título do formulário no fim da página. */
  tituloFormulario: string;
  /** Botão de envio do formulário. */
  enviar: string;
  /** Resposta do FAQ "Quando estará disponível?". */
  quando: string;
  /** Linha curta para o rótulo do topo e a seção Pay x Order. */
  fase: string;
};

export const TEXTOS_LANCAMENTO: Record<EstadoLancamento, TextosLancamento> = {
  "em-desenvolvimento": {
    nome: "Em desenvolvimento",
    selo: null,
    cta: "Quero conhecer",
    tituloFormulario: "Quero conhecer o Tipe Order",
    enviar: "Quero conhecer",
    quando:
      "Consulte as condições de uso do Tipe Order com a equipe. A equipe avalia as condições do seu restaurante; o Tipe Pay usa o mesmo QR Code.",
    fase: "Conheça a proposta e consulte as condições com a equipe.",
  },
  "acesso-antecipado": {
    nome: "Acesso antecipado",
    selo: null,
    cta: "Solicitar demonstração",
    tituloFormulario: "Solicite uma demonstração",
    enviar: "Solicitar demonstração",
    quando:
      "Deixe seu contato para conhecer o Tipe Order e avaliar as condições de uso com a equipe.",
    fase: "Condições de uso avaliadas com a equipe.",
  },
  piloto: {
    nome: "Piloto",
    selo: null,
    cta: "Solicitar demonstração",
    tituloFormulario: "Solicite uma demonstração",
    enviar: "Solicitar demonstração",
    quando:
      "Consulte as condições de uso do Tipe Order com a equipe. Peça uma demonstração para ver funcionando e saber se o seu restaurante pode entrar. Ainda não há data para a disponibilidade geral.",
    fase: "Condições de uso avaliadas com a equipe.",
  },
  disponivel: {
    nome: "Disponível",
    selo: null,
    cta: "Contratar",
    tituloFormulario: "Contrate o Tipe Order",
    enviar: "Quero contratar",
    quando:
      "Já está disponível. O Tipe Order é um módulo adicional do Tipe Pay e usa o mesmo QR Code da mesa. Deixe seu contato e a equipe da Tipe cuida da contratação.",
    fase: "Disponível como módulo adicional do Tipe Pay.",
  },
};

export const PERGUNTA_QUANDO = "Quando estará disponível?";

/** Compatibilidade com o tipo Status do catálogo ("disponivel" | "em-breve"). */
export const statusDoEstado = (e: EstadoLancamento) =>
  e === "disponivel" ? ("disponivel" as const) : ("em-breve" as const);

/**
 * Lê a variável de teste TIPE_LAUNCH_STATE_OVERRIDE ("order=piloto,outro=disponivel").
 * Só é chamada em desenvolvimento (import.meta.env.DEV); em produção não existe.
 */
export function lerSobrescritaDeTeste(
  valor: string | undefined,
  slug: string,
): EstadoLancamento | null {
  if (!valor) return null;
  for (const par of valor.split(",")) {
    const [s, e] = par.split("=").map((x) => x.trim());
    if (s === slug && ehEstadoLancamento(e)) return e;
  }
  return null;
}
