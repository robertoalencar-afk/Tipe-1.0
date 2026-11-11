/**
 * Modalidades de atendimento do Tipe Order: o catálogo único que o site (/produtos/order),
 * o configurador comercial, o simulador e o painel do restaurante leem. Puro: vale no
 * servidor, no navegador e nos testes.
 *
 * A disponibilidade de cada modalidade vem do que o código REALMENTE faz hoje (auditoria em
 * docs/tipe-order/MULTIFORMATO.md), não do estado de lançamento do produto. Um simulador
 * funcionando não prova nada: só o fluxo real no banco e no painel conta.
 */

export const MODALIDADES = ["mesas", "balcao", "comanda", "retirada", "delivery", "totem", "pulseira"] as const;
export type Modalidade = (typeof MODALIDADES)[number];

/** Estado comercial honesto de uma modalidade. */
export const DISPONIBILIDADES = ["operacional", "piloto", "desenvolvimento", "demonstracao", "planejada"] as const;
export type Disponibilidade = (typeof DISPONIBILIDADES)[number];

export const TEXTO_DISPONIBILIDADE: Record<Disponibilidade, { selo: string; curto: string; longo: string }> = {
  operacional: {
    selo: "Disponível",
    curto: "Funciona hoje nos restaurantes com o módulo ativo.",
    longo: "Código em produção, testado de ponta a ponta e ligado pelo painel do restaurante.",
  },
  piloto: {
    selo: "Em piloto",
    curto: "O fluxo existe no sistema e está em validação com restaurantes.",
    longo: "O fluxo está no sistema e passa nos testes, mas ainda não foi validado em operação real. Entra sob acompanhamento da equipe da Tipe.",
  },
  desenvolvimento: {
    selo: "Em desenvolvimento",
    curto: "Existe uma primeira versão; faltam partes antes de abrir para contratação.",
    longo: "Há uma primeira versão no sistema, sem algumas partes do fluxo completo. Não está à venda ainda.",
  },
  demonstracao: {
    selo: "Demonstração",
    curto: "O que você vê aqui é uma simulação para mostrar o fluxo.",
    longo: "Só a simulação existe. Serve para mostrar como a Tipe pretende tratar essa operação.",
  },
  planejada: {
    selo: "Planejada",
    curto: "No roteiro da Tipe. Ainda não existe no sistema.",
    longo: "Está no roteiro da Tipe, com a arquitetura definida, mas ainda não existe no sistema.",
  },
};

/** Canal gravado em pdv_orders.channel (migração 0023). "comanda" ainda não existe no banco. */
export type CanalPedido = "mesa" | "balcao" | "totem" | "tablet" | "delivery";

/** Quem começa o pedido. */
export type OrigemPedido = "cliente_celular" | "equipe" | "cliente_terminal" | "canal_externo";

/** Como a conta se fecha. */
export type Fechamento = "conta_da_mesa" | "antes_de_produzir" | "comanda_individual" | "canal_externo";

export type ModuloTipe = "pay" | "order" | "kitchen" | "staff" | "restaurant" | "totem";

export type PassoFluxo = { quem: "cliente" | "equipe" | "cozinha" | "caixa" | "sistema"; o_que: string };

export type DefinicaoModalidade = {
  id: Modalidade;
  nome: string;
  /** Linha curta para o seletor. */
  resumo: string;
  /** Frase comercial da modalidade. */
  promessa: string;
  disponibilidade: Disponibilidade;
  /** Por que a modalidade está nesse estado (aparece na seção Integrações e disponibilidade). */
  motivo: string;
  /** Para quem é. */
  indicada: string[];
  canal: CanalPedido | null;
  origem: OrigemPedido;
  fechamento: Fechamento;
  /** Jornada resumida, na ordem. */
  fluxo: PassoFluxo[];
  beneficios: { t: string; d: string }[];
  /** Módulos da Tipe que a modalidade usa. */
  modulos: ModuloTipe[];
  /** Precisa de módulo contratado além do Pay? */
  moduloContratado: "order" | "totem" | null;
};

export const DEFINICOES: Record<Modalidade, DefinicaoModalidade> = {
  mesas: {
    id: "mesas",
    nome: "Mesas",
    resumo: "O cliente pede e paga pelo QR Code da mesa",
    promessa: "Um QR Code na mesa. O cliente pede, a cozinha recebe, a conta se paga ali mesmo.",
    disponibilidade: "operacional",
    motivo:
      "Módulo order contratado por restaurante, mesa liberada pela equipe (com ou sem código), pedido pela mesa na cozinha e na conta, pagamento pelo Tipe Pay. Testado de ponta a ponta.",
    indicada: ["Restaurantes", "Bares com mesas", "Pizzarias", "Beach clubs com mesas"],
    canal: "mesa",
    origem: "cliente_celular",
    fechamento: "conta_da_mesa",
    fluxo: [
      { quem: "equipe", o_que: "Libera a mesa para pedir (com código, se o restaurante quiser)" },
      { quem: "cliente", o_que: "Lê o QR Code da mesa; o cardápio abre no navegador" },
      { quem: "cliente", o_que: "Escolhe, escreve observação e envia" },
      { quem: "cozinha", o_que: "Recebe os itens no Tipe Cozinha" },
      { quem: "equipe", o_que: "Acompanha o status e leva à mesa" },
      { quem: "sistema", o_que: "Os itens entram na conta da mesa" },
      { quem: "cliente", o_que: "Confere, divide e paga pelo Tipe Pay" },
      { quem: "caixa", o_que: "Vê a confirmação no painel" },
    ],
    beneficios: [
      { t: "Ninguém espera para pedir", d: "O cliente pede quando quer, sem chamar alguém." },
      { t: "Pedido escrito, com observação", d: "“Sem cebola” chega por escrito na cozinha." },
      { t: "Conta sem digitação", d: "O que foi pedido já está na conta da mesa." },
      { t: "Mesma conta, mesmo QR", d: "Pedir e pagar no mesmo lugar, sem aplicativo." },
    ],
    modulos: ["order", "kitchen", "staff", "pay"],
    moduloContratado: "order",
  },
  balcao: {
    id: "balcao",
    nome: "Balcão",
    resumo: "A equipe registra, cobra e a senha sai na hora",
    promessa: "Pedido no balcão, cobrado na hora, com senha. A cozinha já começa.",
    disponibilidade: "piloto",
    motivo:
      "Venda no balcão com caixa aberto, senha do dia, cozinha (KDS) e painel de senhas na TV existem no sistema e passam nos testes do banco. Falta validar com um restaurante em operação.",
    indicada: ["Cafeterias", "Lanchonetes", "Padarias", "Hamburguerias", "Operações rápidas"],
    canal: "balcao",
    origem: "equipe",
    fechamento: "antes_de_produzir",
    fluxo: [
      { quem: "equipe", o_que: "Registra o pedido no Lançamento Tipe (modo Balcão)" },
      { quem: "equipe", o_que: "Confirma quantidades, observações e nome do cliente" },
      { quem: "caixa", o_que: "Cobra em dinheiro, cartão ou Pix no caixa aberto" },
      { quem: "sistema", o_que: "Gera a senha do dia" },
      { quem: "cozinha", o_que: "Recebe os itens no Tipe Cozinha" },
      { quem: "equipe", o_que: "Chama a senha no painel da TV e entrega" },
    ],
    beneficios: [
      { t: "Cobra antes de produzir", d: "Sem fiado e sem conta aberta no balcão." },
      { t: "Senha sem papel", d: "A senha nasce com o pedido e aparece na TV." },
      { t: "Caixa fechado no fim do dia", d: "Cada venda entra no caixa aberto." },
      { t: "O mesmo cardápio", d: "Balcão, mesa e totem usam o mesmo cadastro." },
    ],
    modulos: ["restaurant", "kitchen"],
    moduloContratado: null,
  },
  comanda: {
    id: "comanda",
    nome: "Comanda individual",
    resumo: "Cada cliente tem a própria comanda, de qualquer ponto",
    promessa: "Cada cliente com a sua comanda. Pede no bar, na piscina, no palco. Fecha uma vez.",
    disponibilidade: "planejada",
    motivo:
      "Não existe modelo de comanda individual no sistema: hoje a conta é por mesa (Tipe Pay). A arquitetura está definida em docs/tipe-order/ARQUITETURA-PEDIDOS.md, sem migração aplicada.",
    indicada: ["Bares", "Beach clubs", "Casas de eventos", "Restaurantes de consumo individual"],
    canal: null,
    origem: "cliente_celular",
    fechamento: "comanda_individual",
    fluxo: [
      { quem: "equipe", o_que: "Abre uma comanda para o cliente (QR individual, cartão ou pulseira)" },
      { quem: "cliente", o_que: "Pede em qualquer ponto; tudo entra na mesma comanda" },
      { quem: "cozinha", o_que: "Recebe os itens com o número da comanda" },
      { quem: "cliente", o_que: "Confere o consumo no celular" },
      { quem: "caixa", o_que: "Fecha a comanda; o pagamento segue o Tipe Pay" },
    ],
    beneficios: [
      { t: "Consumo individual", d: "Sem dividir conta coletiva no fim da noite." },
      { t: "Pedido em qualquer ponto", d: "Bar, quiosque ou garçom: mesma comanda." },
      { t: "Sem perda de comanda", d: "Recuperação segura pela equipe." },
      { t: "Pulseira ou QR", d: "Tag abre uma URL segura da Tipe, sem aplicativo." },
    ],
    modulos: ["order", "kitchen", "staff", "pay"],
    moduloContratado: "order",
  },
  retirada: {
    id: "retirada",
    nome: "Retirada",
    resumo: "Pedido pronto, senha chamada, cliente retira",
    promessa: "Pedido com senha. Pronto, chama. O cliente retira e vai.",
    disponibilidade: "piloto",
    motivo:
      "Usa a venda no balcão: senha do dia, status na cozinha e painel de senhas na TV. O aviso ao cliente é só pelo painel da TV; não há SMS, WhatsApp nem notificação no celular.",
    indicada: ["Cafeterias", "Lanchonetes", "Quiosques", "Praças de alimentação", "Fast-food"],
    canal: "balcao",
    origem: "equipe",
    fechamento: "antes_de_produzir",
    fluxo: [
      { quem: "equipe", o_que: "Registra o pedido e cobra" },
      { quem: "sistema", o_que: "O pedido recebe a senha do dia" },
      { quem: "cozinha", o_que: "Prepara; o status muda no Tipe Cozinha" },
      { quem: "sistema", o_que: "Pronto: a senha aparece no painel da TV" },
      { quem: "cliente", o_que: "Retira no balcão" },
      { quem: "equipe", o_que: "Marca como retirado" },
    ],
    beneficios: [
      { t: "Senha visível", d: "O painel da TV mostra quem está pronto." },
      { t: "Tempo de preparo à vista", d: "A cozinha vê há quanto tempo cada pedido espera." },
      { t: "Sem gritar nome", d: "A senha chama; dá para chamar de novo." },
      { t: "Mesmo caixa", d: "Retirada e balcão fecham no mesmo caixa." },
    ],
    modulos: ["restaurant", "kitchen"],
    moduloContratado: null,
  },
  delivery: {
    id: "delivery",
    nome: "Delivery",
    resumo: "Pedidos de fora organizados na mesma cozinha",
    promessa: "Pedido de fora entra na mesma cozinha. Preparo, expedição e conclusão em um lugar.",
    disponibilidade: "demonstracao",
    motivo:
      "O canal delivery existe só como valor permitido no banco. Não há integração homologada com iFood, Rappi ou outros; nenhum pedido externo entra hoje. Sem logística própria neste projeto.",
    indicada: ["Restaurantes com entrega", "Pizzarias", "Hamburguerias", "Dark kitchens"],
    canal: "delivery",
    origem: "canal_externo",
    fechamento: "canal_externo",
    fluxo: [
      { quem: "sistema", o_que: "Pedido recebido com a origem identificada" },
      { quem: "equipe", o_que: "Valida itens e endereço" },
      { quem: "cozinha", o_que: "Prepara no Tipe Cozinha, junto com o salão" },
      { quem: "equipe", o_que: "Expede para o entregador" },
      { quem: "sistema", o_que: "Conclui o pedido" },
    ],
    beneficios: [
      { t: "Uma cozinha só", d: "Salão e delivery na mesma fila, sem outra tela." },
      { t: "Origem identificada", d: "Cada pedido diz de onde veio." },
      { t: "Expedição separada", d: "Pronto e expedido são passos diferentes." },
      { t: "Sem logística própria", d: "A entrega continua com quem você já usa." },
    ],
    modulos: ["kitchen", "restaurant"],
    moduloContratado: null,
  },
  totem: {
    id: "totem",
    nome: "Totem de autoatendimento",
    resumo: "O cliente monta o pedido na tela e recebe a senha",
    promessa: "Seu cliente escolhe. A Tipe organiza. Sua equipe entrega.",
    disponibilidade: "desenvolvimento",
    motivo:
      "Existe uma primeira versão (tela em /restaurante/totem com o cardápio real, senha e pedido aguardando o caixa cobrar). Faltam pagamento no terminal, personalização de itens, gestão de vários dispositivos e validação em equipamento real.",
    indicada: ["Fast-food", "Lanchonetes", "Cafeterias", "Padarias", "Praças de alimentação", "Quiosques"],
    canal: "totem",
    origem: "cliente_terminal",
    fechamento: "antes_de_produzir",
    fluxo: [
      { quem: "cliente", o_que: "Toca na tela para começar o pedido" },
      { quem: "cliente", o_que: "Navega pelo cardápio visual e monta o carrinho" },
      { quem: "cliente", o_que: "Revê o carrinho e confirma o pedido para pagar no caixa" },
      { quem: "sistema", o_que: "Gera a senha; o pedido fica aguardando pagamento" },
      { quem: "caixa", o_que: "Confirma o pagamento feito no caixa" },
      { quem: "cozinha", o_que: "Recebe os itens no Tipe Cozinha" },
      { quem: "cliente", o_que: "Acompanha a senha e retira" },
    ],
    beneficios: [
      { t: "Fila menor no caixa", d: "O cliente monta o pedido sozinho." },
      { t: "Cardápio da casa", d: "Categorias, produtos e carrinho na tela touchscreen." },
      { t: "Mesmo cadastro", d: "Totem, balcão e mesa usam os mesmos produtos." },
      { t: "Sem dado de cartão na tela", d: "Pagamento no caixa, em dinheiro ou na maquininha do estabelecimento." },
    ],
    modulos: ["totem", "order", "kitchen", "restaurant"],
    moduloContratado: "totem",
  },
  pulseira: {
    id: "pulseira",
    nome: "Tipe Pulseira",
    resumo: "A comanda acompanha o cliente, na pulseira NFC",
    promessa: "Tipe Pulseira: sua comanda acompanha você.",
    disponibilidade: "planejada",
    motivo:
      "Depende da comanda individual, que ainda não existe no sistema. A pulseira NFC pré-gravada abre uma URL segura da Tipe; o número da pulseira sozinho nunca autoriza pedido nem pagamento. Arquitetura em docs/tipe-order/PULSEIRA.md, sem migração aplicada.",
    indicada: ["Festas", "Bares", "Beach clubs", "Festivais", "Eventos"],
    canal: null,
    origem: "cliente_celular",
    fechamento: "comanda_individual",
    fluxo: [
      { quem: "equipe", o_que: "Ativa a pulseira numerada e vincula à comanda do cliente no Tipe Gestão" },
      { quem: "cliente", o_que: "Aproxima o celular da pulseira (ou lê o QR de apoio); o Tipe Order abre" },
      { quem: "cliente", o_que: "Escolhe no cardápio do celular e envia; tudo entra na mesma comanda" },
      { quem: "cozinha", o_que: "Recebe os itens no Tipe Cozinha com o número da pulseira" },
      { quem: "equipe", o_que: "Consulta o setor informado ou o GPS compartilhado com consentimento e entrega ao cliente" },
      { quem: "cliente", o_que: "Acompanha o consumo e paga pelo Tipe Pay" },
      { quem: "equipe", o_que: "Encerra a comanda; a pulseira volta ao estoque para reutilizar" },
    ],
    beneficios: [
      { t: "Sem comanda de papel", d: "A pulseira numerada substitui a cartela e o cartão." },
      { t: "Reutilizável", d: "Depois de encerrar a comanda e higienizar a pulseira, ela fica pronta para um novo atendimento." },
      { t: "Garçom encontra o cliente", d: "Mapa do evento e localização com consentimento." },
      { t: "Sem aplicativo", d: "Android e iPhone abrem a URL ao aproximar." },
    ],
    modulos: ["order", "kitchen", "staff", "pay", "restaurant"],
    moduloContratado: "order",
  },
};

export const ORDEM_SELETOR: Modalidade[] = ["mesas", "balcao", "totem", "retirada", "pulseira", "comanda", "delivery"];

export const ehModalidade = (v: unknown): v is Modalidade =>
  typeof v === "string" && (MODALIDADES as readonly string[]).includes(v);

/** O que o site pode afirmar como disponível hoje. */
export const estaContratavel = (m: Modalidade) =>
  DEFINICOES[m].disponibilidade === "operacional" || DEFINICOES[m].disponibilidade === "piloto";

/* ------------------------------------------------------------------ Configurador */

export const ESTABELECIMENTOS = [
  "restaurante",
  "bar",
  "cafeteria",
  "lanchonete",
  "quiosque",
  "beach_club",
  "outro",
] as const;
export type Estabelecimento = (typeof ESTABELECIMENTOS)[number];
export const NOME_ESTABELECIMENTO: Record<Estabelecimento, string> = {
  restaurante: "Restaurante",
  bar: "Bar",
  cafeteria: "Cafeteria",
  lanchonete: "Lanchonete",
  quiosque: "Quiosque",
  beach_club: "Beach club",
  outro: "Outro",
};

export const COMO_PEDEM = ["garcom", "celular", "balcao", "combinacao"] as const;
export type ComoPedem = (typeof COMO_PEDEM)[number];
export const NOME_COMO_PEDEM: Record<ComoPedem, string> = {
  garcom: "Pelo garçom",
  celular: "Pelo celular",
  balcao: "No balcão",
  combinacao: "Uma combinação",
};

export const MELHORIAS = ["agilidade", "organizacao", "fechamento", "cozinha", "caixa", "experiencia"] as const;
export type Melhoria = (typeof MELHORIAS)[number];
export const NOME_MELHORIA: Record<Melhoria, string> = {
  agilidade: "Agilidade no atendimento",
  organizacao: "Organização dos pedidos",
  fechamento: "Tempo de fechamento de conta",
  cozinha: "Fluxo da cozinha",
  caixa: "Controle do caixa",
  experiencia: "Experiência do cliente",
};

export type RespostasConfigurador = {
  estabelecimento: Estabelecimento | null;
  modalidades: Modalidade[];
  comoPedem: ComoPedem | null;
  melhorias: Melhoria[];
};

export const NOME_MODULO: Record<ModuloTipe, string> = {
  pay: "Tipe Pay",
  order: "Tipe Order",
  kitchen: "Tipe Cozinha",
  staff: "Tipe Equipe",
  restaurant: "Tipe Gestão",
  totem: "Tipe Order · Autoatendimento",
};

export const PAPEL_MODULO: Record<ModuloTipe, string> = {
  pay: "A conta da mesa no celular: dividir, pagar no estabelecimento; Pix, Apple Pay e Google Pay em piloto.",
  order: "O cardápio e o pedido pelo celular do cliente, no mesmo QR Code da conta.",
  kitchen: "A tela da cozinha e do bar: cada pedido com tempo, setor e status.",
  staff: "O app do garçom: mesas, liberação de pedidos, avisos de prato pronto e gorjetas.",
  restaurant: "O painel do restaurante: caixa, lançamento de pedidos, cardápio, equipe e relatórios.",
  totem: "A tela de autoatendimento para o cliente montar o pedido e receber a senha.",
};

/** Estado de cada módulo para a recomendação, derivado das modalidades que o pedem. */
export type ModuloRecomendado = {
  modulo: ModuloTipe;
  nome: string;
  papel: string;
  /** Pior disponibilidade entre as modalidades escolhidas que dependem dele. */
  disponibilidade: Disponibilidade;
  /** Modalidades escolhidas que o usam. */
  por: Modalidade[];
};

const PESO: Record<Disponibilidade, number> = {
  operacional: 0,
  piloto: 1,
  desenvolvimento: 2,
  demonstracao: 3,
  planejada: 4,
};

const ORDEM_MODULOS: ModuloTipe[] = ["pay", "order", "kitchen", "staff", "restaurant", "totem"];

/** Estado do módulo em si, independente da modalidade que o pede. */
const DISPONIBILIDADE_MODULO: Record<ModuloTipe, Disponibilidade> = {
  pay: "operacional",
  order: "operacional",
  kitchen: "operacional",
  staff: "operacional",
  restaurant: "operacional",
  totem: "desenvolvimento",
};

export type Recomendacao = {
  modulos: ModuloRecomendado[];
  /** Módulos prontos para contratar (operacional ou piloto). */
  disponiveis: ModuloTipe[];
  /** Módulos que precisariam ser desenvolvidos ou habilitados. */
  futuros: ModuloTipe[];
  /** Frase pronta: "Para o seu restaurante, sugerimos Tipe Pay, Tipe Order e Tipe Kitchen." */
  frase: string;
  /** Modalidades escolhidas que ainda não estão disponíveis. */
  modalidadesFuturas: Modalidade[];
  /** O visitante demonstrou interesse em totem. */
  interesseTotem: boolean;
};

const lista = (nomes: string[]) =>
  nomes.length <= 1 ? nomes.join("") : `${nomes.slice(0, -1).join(", ")} e ${nomes[nomes.length - 1]}`;

/**
 * Recomendação de módulos a partir das respostas. Regras:
 * - Tipe Pay entra sempre: é a base de tudo (e o único que recebe dinheiro).
 * - Cada modalidade escolhida traz os módulos que usa; "pelo celular" reforça o Order.
 * - A disponibilidade do módulo é a pior entre as modalidades que o pedem, para nunca
 *   anunciar como pronto algo que depende de uma modalidade planejada.
 * - Nada de preço: a proposta é feita pela equipe da Tipe.
 */
export function recomendar(r: RespostasConfigurador): Recomendacao {
  const por = new Map<ModuloTipe, Modalidade[]>();
  const pedir = (m: ModuloTipe, origem: Modalidade | null) => {
    if (origem) por.set(m, [...new Set([...(por.get(m) ?? []), origem])]);
    else if (!por.has(m)) por.set(m, []);
  };
  pedir("pay", null);
  pedir("restaurant", null);
  for (const m of r.modalidades) for (const mod of DEFINICOES[m].modulos) pedir(mod, m);
  if ((r.comoPedem === "celular" || r.comoPedem === "combinacao") && !por.has("order")) pedir("order", "mesas");
  if (r.comoPedem === "garcom") pedir("staff", null);
  if (r.melhorias.includes("cozinha") || r.melhorias.includes("organizacao")) pedir("kitchen", null);
  if (r.melhorias.includes("caixa")) pedir("restaurant", null);

  // Disponibilidade do módulo: o próprio estado dele, puxado para baixo só quando TODAS as
  // modalidades escolhidas que o pedem ainda não existem (ex.: Order só para pulseira).
  const disponibilidadeDe = (modulo: ModuloTipe): Disponibilidade => {
    const propria = DISPONIBILIDADE_MODULO[modulo];
    const origens = por.get(modulo) ?? [];
    if (!origens.length) return propria;
    const melhor = origens.reduce<Disponibilidade>(
      (acc, m) => (PESO[DEFINICOES[m].disponibilidade] < PESO[acc] ? DEFINICOES[m].disponibilidade : acc),
      "planejada",
    );
    return PESO[melhor] > PESO[propria] ? melhor : propria;
  };

  const modulos = ORDEM_MODULOS.filter((m) => por.has(m)).map((modulo) => ({
    modulo,
    nome: NOME_MODULO[modulo],
    papel: PAPEL_MODULO[modulo],
    disponibilidade: disponibilidadeDe(modulo),
    por: por.get(modulo) ?? [],
  }));
  const disponiveis = modulos
    .filter((m) => m.disponibilidade === "operacional" || m.disponibilidade === "piloto")
    .map((m) => m.modulo);
  const futuros = modulos.filter((m) => !disponiveis.includes(m.modulo)).map((m) => m.modulo);
  const quem = r.estabelecimento ? NOME_ESTABELECIMENTO[r.estabelecimento].toLowerCase() : "estabelecimento";
  const artigo = r.estabelecimento === "cafeteria" || r.estabelecimento === "lanchonete" ? "a sua" : "o seu";
  const nomesDisp = disponiveis.map((m) => NOME_MODULO[m]);
  const frase = nomesDisp.length
    ? `Para ${artigo} ${quem}, sugerimos ${lista(nomesDisp)}.`
    : `Para ${artigo} ${quem}, começamos pelo Tipe Pay.`;
  return {
    modulos,
    disponiveis,
    futuros,
    frase,
    modalidadesFuturas: r.modalidades.filter((m) => !estaContratavel(m)),
    interesseTotem: r.modalidades.includes("totem"),
  };
}

/** Resumo em texto para as notas do CRM (sem criar outro banco de leads). */
export function resumoParaCrm(r: RespostasConfigurador, rec: Recomendacao): string {
  const partes = [
    `Configurador Tipe Order`,
    `Estabelecimento: ${r.estabelecimento ? NOME_ESTABELECIMENTO[r.estabelecimento] : "não informado"}`,
    `Atende por: ${r.modalidades.length ? r.modalidades.map((m) => DEFINICOES[m].nome).join(", ") : "não informado"}`,
    `Pedidos hoje: ${r.comoPedem ? NOME_COMO_PEDEM[r.comoPedem] : "não informado"}`,
    `Quer melhorar: ${r.melhorias.length ? r.melhorias.map((m) => NOME_MELHORIA[m]).join(", ") : "não informado"}`,
    `Sugeridos: ${rec.disponiveis.map((m) => NOME_MODULO[m]).join(", ") || "—"}`,
  ];
  if (rec.futuros.length) partes.push(`Futuros: ${rec.futuros.map((m) => NOME_MODULO[m]).join(", ")}`);
  if (rec.interesseTotem) partes.push("Interesse em totem de autoatendimento: sim");
  return partes.join("\n");
}
