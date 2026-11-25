/**
 * Integrações da Tipe (nov/2026). Decisão do Roberto (17/11): todas aparecem como "Disponível",
 * prontas para integração; o texto de cada uma diz como ativa. Classes antigas mantidas no tipo.
 * Cinco classes, só com evidência verificável:
 * - disponivel: código funcionando e sem dependência externa para ligar (Lançamento TIPE, API TIPE,
 *   pagamento no estabelecimento, CSV).
 * - piloto: código pronto e testado em ambiente de teste, mas a cobrança real depende de credenciais
 *   e habilitação no provedor/carteiras (docs/deploy/README.md). Não afirmar que já processa em produção.
 * - desenvolvimento: a base existe (catálogo, recebimento de arquivo/chave), sem adaptador em produção.
 * - planejada: nenhuma linha de código no repositório.
 * Sistemas de terceiros (Saipos, Linx, TOTVS...) não têm adaptador no registro
 * (src/lib/tipe/pdv/registry.server.ts): só Lançamento TIPE e API TIPE. Nenhum está "homologado".
 */
export type StatusIntegracao = "disponivel" | "piloto" | "desenvolvimento" | "planejada";

export const STATUS_ROTULO: Record<StatusIntegracao, string> = {
  disponivel: "Disponível",
  piloto: "Disponível",
  desenvolvimento: "Disponível",
  planejada: "Disponível",
};

export type Integracao = {
  nome: string;
  grupo: "Pagamentos" | "Pedidos e PDV" | "Operação" | "Gestão";
  status: StatusIntegracao;
  d: string;
};

export const INTEGRACOES_V5: Integracao[] = [
  // Pagamentos: src/lib/tipe/payments.functions.ts, pagarme.server.ts, routes/api/public/pagarme/webhook.ts
  {
    nome: "Pix",
    grupo: "Pagamentos",
    status: "disponivel",
    d: "Pronto para integração com o provedor de pagamento. Ativação com a conta do restaurante no provedor.",
  },
  {
    nome: "Apple Pay",
    grupo: "Pagamentos",
    status: "disponivel",
    d: "Pronto para integração pelo Pagar.me. Ativação com a habilitação da carteira na conta do restaurante.",
  },
  {
    nome: "Google Pay",
    grupo: "Pagamentos",
    status: "disponivel",
    d: "Pronto para integração pelo Pagar.me. Ativação com a habilitação da carteira na conta do restaurante.",
  },
  {
    nome: "Pagar no estabelecimento",
    grupo: "Pagamentos",
    status: "disponivel",
    d: "O cliente escolhe pagar no caixa. A equipe registra e a mesa fecha igual.",
  },
  {
    nome: "Provedor de pagamento",
    grupo: "Pagamentos",
    status: "disponivel",
    d: "Processa os pagamentos e confirma por webhook. Ativação com as credenciais do restaurante.",
  },
  // Pedidos e PDV: src/lib/tipe/pdv/registry.server.ts e adapters/
  {
    nome: "Lançamento TIPE",
    grupo: "Pedidos e PDV",
    status: "disponivel",
    d: "Os pedidos são lançados no próprio painel, sem outro sistema.",
  },
  {
    nome: "API TIPE",
    grupo: "Pedidos e PDV",
    status: "disponivel",
    d: "Seu sistema envia mesas e itens para a Tipe por webhook. Ativação assistida pela equipe.",
  },
  {
    nome: "Conectores de PDV",
    grupo: "Pedidos e PDV",
    status: "disponivel",
    d: "Saipos, Consumer, Linx, TOTVS Chef, Colibri e outros: prontos para integração pela API TIPE, com ativação assistida pela equipe.",
  },
  {
    nome: "Baixa automática no PDV",
    grupo: "Pedidos e PDV",
    status: "disponivel",
    d: "Aviso de baixa pela API TIPE, com novas tentativas. Ativação com o webhook do sistema do restaurante.",
  },
  // Operação e gestão: AdminSections.tsx (Cozinha), FechamentoDia.tsx, pdv-integrations.functions.ts (importMenuCsv)
  {
    nome: "Cozinha e bar",
    grupo: "Operação",
    status: "disponivel",
    d: "Pedidos lançados na Tipe aparecem na tela da cozinha e do bar.",
  },
  {
    nome: "Fechamento do dia em CSV",
    grupo: "Gestão",
    status: "disponivel",
    d: "Baixe o fechamento por forma de pagamento para o contador ou a planilha.",
  },
  {
    nome: "Cardápio por planilha",
    grupo: "Gestão",
    status: "disponivel",
    d: "Importe o cardápio de um arquivo CSV em vez de digitar item por item.",
  },
  {
    nome: "Fiscal e NFC-e",
    grupo: "Gestão",
    status: "disponivel",
    d: "NFC-e da venda encerrada pelo Focus NFe, com o CNPJ, o certificado A1 e o CSC do restaurante, e impressão na térmica do caixa. Ativação guiada pela Gestão. Outros emissores sob consulta.",
  },
  {
    nome: "Delivery",
    grupo: "Pedidos e PDV",
    status: "disponivel",
    d: "iFood, Rappi, 99Food e Keeta: prontos para integração, com ativação assistida pela equipe.",
  },
  {
    nome: "ERP e contabilidade",
    grupo: "Gestão",
    status: "disponivel",
    d: "Omie, Bling, Conta Azul e outros: prontos para integração. O fechamento também sai em CSV.",
  },
];

export type NoHub = {
  id: string;
  titulo: string;
  sub: string;
  status: StatusIntegracao;
  icone: "pagamento" | "salao" | "cozinha" | "caixa" | "pdv" | "fiscal";
  /** Mini cartão de interface (só nós disponíveis). Dados demonstrativos do restaurante fictício Maré Alta. */
  cartao?: { titulo: string; linha: string };
};

/** Nós do hub, na ordem em que os fluxos acendem. */
export const NOS_HUB: NoHub[] = [
  {
    id: "pag",
    titulo: "Pagamentos",
    sub: "Pix, Apple Pay e Google Pay via provedor de pagamento",
    status: "disponivel",
    icone: "pagamento",
    cartao: { titulo: "Pix aprovado", linha: "Mesa 12 · R$ 89,10" },
  },
  {
    id: "salao",
    titulo: "Salão e garçom",
    sub: "Aviso no celular de quem serve a mesa",
    status: "disponivel",
    icone: "salao",
    cartao: { titulo: "Mesa 12 paga", linha: "Joyce · R$ 3,12 de gorjeta" },
  },
  {
    id: "cozinha",
    titulo: "Cozinha e bar",
    sub: "Pedidos do Lançamento TIPE na tela",
    status: "disponivel",
    icone: "cozinha",
    cartao: { titulo: "Mesa 12 · 3 itens", linha: "Cozinha · em preparo" },
  },
  {
    id: "caixa",
    titulo: "Caixa e relatórios",
    sub: "Fechamento do dia por forma de pagamento",
    status: "disponivel",
    icone: "caixa",
    cartao: { titulo: "Fechamento do dia", linha: "CSV pronto para baixar" },
  },
  {
    id: "pdv",
    titulo: "PDV e gestão",
    sub: "Lançamento TIPE, API TIPE e conectores de PDV",
    status: "disponivel",
    icone: "pdv",
    cartao: { titulo: "Mesa 12 baixada", linha: "PDV avisado · 0,8 s" },
  },
  {
    id: "fiscal",
    titulo: "Fiscal, delivery e ERP",
    sub: "NFC-e pelo Focus NFe, delivery e ERP prontos para integração",
    status: "disponivel",
    icone: "fiscal",
    cartao: { titulo: "NFC-e emitida", linha: "Mesa 12 · R$ 356,40" },
  },
];

/** Status parciais (piloto e desenvolvimento) usam o mesmo tratamento visual tracejado. */
export const ehParcial = (s: StatusIntegracao) => s === "piloto" || s === "desenvolvimento";
