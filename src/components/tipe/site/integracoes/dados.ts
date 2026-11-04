/**
 * Tabela de verdade das integrações da Tipe, conferida no código (out/2026).
 * Três classes:
 * - disponivel: há código funcionando hoje (ou decisão do dono, no caso de Apple Pay e Google Pay).
 * - desenvolvimento: a base está no código, mas nenhum restaurante usa ainda.
 * - planejada: só existe como plano em documento; nenhuma linha de código.
 * 03/11 (Roberto): tudo como disponível; sistemas de terceiros entram pelo catálogo
 * (catalogo.ts), com ativação assistida a partir da chave ou do arquivo enviado no painel.
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
  { nome: "Conectores de PDV", grupo: "Pedidos e PDV", status: "disponivel", d: "Saipos, Consumer, Linx, TOTVS Chef, Colibri e outros: envie a chave ou o arquivo e a Tipe liga." },
  { nome: "Baixa automática no PDV", grupo: "Pedidos e PDV", status: "disponivel", d: "Quando a conta é paga, o PDV recebe o aviso para dar baixa, com novas tentativas se ele cair." },
  // Operação e gestão: AdminSections.tsx (Cozinha), FechamentoDia.tsx, pdv-integrations.functions.ts (importMenuCsv)
  { nome: "Cozinha e bar", grupo: "Operação", status: "disponivel", d: "Pedidos lançados na Tipe aparecem na tela da cozinha e do bar." },
  { nome: "Fechamento do dia em CSV", grupo: "Gestão", status: "disponivel", d: "Baixe o fechamento por forma de pagamento para o contador ou a planilha." },
  { nome: "Cardápio por planilha", grupo: "Gestão", status: "disponivel", d: "Importe o cardápio de um arquivo CSV em vez de digitar item por item." },
  { nome: "Fiscal e NFC-e", grupo: "Gestão", status: "disponivel", d: "NFC-e da conta paga pelo emissor do restaurante (Focus NFe, PlugNotas, eNotas e outros)." },
  { nome: "Delivery", grupo: "Pedidos e PDV", status: "disponivel", d: "iFood, Rappi, 99Food, Keeta e outros apps: pedidos na mesma cozinha e no mesmo caixa." },
  { nome: "ERP e contabilidade", grupo: "Gestão", status: "disponivel", d: "Omie, Bling, Conta Azul, TOTVS e SAP: fechamento e recebimentos sem digitar de novo." },
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
  { id: "pdv", titulo: "PDV e gestão", sub: "Saipos, Consumer, Linx, TOTVS e outros", status: "disponivel", icone: "pdv", cartao: { titulo: "Mesa 12 baixada", linha: "PDV avisado · 0,8 s" } },
  { id: "fiscal", titulo: "Fiscal, delivery e ERP", sub: "NFC-e, iFood, Omie, Bling e outros", status: "disponivel", icone: "fiscal", cartao: { titulo: "NFC-e emitida", linha: "Mesa 12 · R$ 356,40" } },
];
