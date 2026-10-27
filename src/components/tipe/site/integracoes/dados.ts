/**
 * Tabela de verdade das integrações da Tipe, conferida no código (out/2026).
 * Três classes:
 * - disponivel: há código funcionando hoje (ou decisão do dono, no caso de Apple Pay e Google Pay).
 * - desenvolvimento: a base está no código, mas nenhum restaurante usa ainda.
 * - planejada: só existe como plano em documento; nenhuma linha de código.
 * Nenhum PDV de terceiro aparece como integrado. Ao mudar algo aqui, confira o código antes.
 */
export type StatusIntegracao = "disponivel" | "desenvolvimento" | "planejada";

export const STATUS_ROTULO: Record<StatusIntegracao, string> = {
  disponivel: "Disponível",
  desenvolvimento: "Em desenvolvimento",
  planejada: "Planejada",
};

export type Integracao = {
  nome: string;
  grupo: "Pagamentos" | "Pedidos e PDV" | "Operação" | "Gestão";
  status: StatusIntegracao;
  d: string;
};

export const INTEGRACOES_V5: Integracao[] = [
  // Pagamentos: src/lib/tipe/payments.functions.ts, pagarme.server.ts, routes/api/public/pagarme/webhook.ts
  { nome: "Pix", grupo: "Pagamentos", status: "disponivel", d: "Gerado pelo Pagar.me na hora. O valor cai direto na conta do restaurante." },
  { nome: "Apple Pay", grupo: "Pagamentos", status: "disponivel", d: "Pagamento em um toque no iPhone, processado pelo Pagar.me." },
  { nome: "Google Pay", grupo: "Pagamentos", status: "disponivel", d: "Pagamento em um toque no Android, processado pelo Pagar.me." },
  { nome: "Pagar no estabelecimento", grupo: "Pagamentos", status: "disponivel", d: "O cliente escolhe pagar no caixa. A equipe registra e a mesa fecha igual." },
  { nome: "Pagar.me", grupo: "Pagamentos", status: "disponivel", d: "Processa os pagamentos, confirma por webhook e separa o valor de cada recebedor." },
  // Pedidos e PDV: src/lib/tipe/pdv/registry.server.ts e adapters/
  { nome: "Lançamento TIPE", grupo: "Pedidos e PDV", status: "disponivel", d: "Os pedidos são lançados no próprio painel, sem outro sistema." },
  { nome: "API TIPE", grupo: "Pedidos e PDV", status: "disponivel", d: "Seu sistema envia mesas e itens para a Tipe por webhook. Ativação assistida pela equipe." },
  { nome: "Conectores de PDV", grupo: "Pedidos e PDV", status: "desenvolvimento", d: "Contrato único para ligar PDVs de mercado. Nenhum conector externo ativo ainda." },
  { nome: "Baixa automática no PDV", grupo: "Pedidos e PDV", status: "desenvolvimento", d: "Fila que avisa o PDV quando a conta é paga, com novas tentativas se ele cair." },
  { nome: "Lightspeed K-Series", grupo: "Pedidos e PDV", status: "planejada", d: "Estudado como primeiro conector externo. Depende de conta de parceiro." },
  // Operação e gestão: AdminSections.tsx (Cozinha), FechamentoDia.tsx, pdv-integrations.functions.ts (importMenuCsv)
  { nome: "Cozinha e bar", grupo: "Operação", status: "disponivel", d: "Pedidos lançados na Tipe aparecem na tela da cozinha e do bar." },
  { nome: "Fechamento do dia em CSV", grupo: "Gestão", status: "disponivel", d: "Baixe o fechamento por forma de pagamento para o contador ou a planilha." },
  { nome: "Cardápio por planilha", grupo: "Gestão", status: "disponivel", d: "Importe o cardápio de um arquivo CSV em vez de digitar item por item." },
  { nome: "Fiscal e NFC-e", grupo: "Gestão", status: "planejada", d: "Emissão de nota pelo sistema fiscal do restaurante. Ainda sem data." },
  { nome: "Delivery", grupo: "Pedidos e PDV", status: "planejada", d: "Pedidos de plataformas de entrega no mesmo painel. Ainda sem data." },
  { nome: "ERP e contabilidade", grupo: "Gestão", status: "planejada", d: "Envio direto do fechamento para sistemas de gestão. Hoje, por CSV." },
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
  { id: "pag", titulo: "Pagamentos", sub: "Pix, Apple Pay e Google Pay via Pagar.me", status: "disponivel", icone: "pagamento", cartao: { titulo: "Pix aprovado", linha: "Mesa 12 · R$ 118,79" } },
  { id: "salao", titulo: "Salão e garçom", sub: "Aviso no celular de quem serve a mesa", status: "disponivel", icone: "salao", cartao: { titulo: "Mesa 12 paga", linha: "Joyce · R$ 4,20 de gorjeta" } },
  { id: "cozinha", titulo: "Cozinha e bar", sub: "Pedidos do Lançamento TIPE na tela", status: "disponivel", icone: "cozinha", cartao: { titulo: "Mesa 12 · 3 itens", linha: "Cozinha · em preparo" } },
  { id: "caixa", titulo: "Caixa e relatórios", sub: "Fechamento do dia por forma de pagamento", status: "disponivel", icone: "caixa", cartao: { titulo: "Fechamento do dia", linha: "CSV pronto para baixar" } },
  { id: "pdv", titulo: "PDV e gestão", sub: "Conectores de PDV e baixa automática", status: "desenvolvimento", icone: "pdv" },
  { id: "fiscal", titulo: "Fiscal, delivery e ERP", sub: "Categorias no plano, sem data", status: "planejada", icone: "fiscal" },
];
