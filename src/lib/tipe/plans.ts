// Mensalidades regulares verificadas no plan_catalog em 13/11/2026.
// Implantação aprovada por Roberto em 13/11/2026; descontos restritos não são oferta pública.
export const SHOW_PLAN_PRICES = true;
export const PLANS = [
  {
    id: "essencial",
    name: "Essencial",
    price: 59,
    fullPrice: 79,
    maxTables: 10,
    setupPrice: 200,
    features: [
      "Pagamento na mesa por QR Code",
      "Gorjeta extra para a equipe",
      "Painel em tempo real",
      "Lançamento TIPE incluso",
      "Tipe Order: cardápio e pedidos pelo celular",
      "Tipe Equipe: área do garçom e gorjetas",
      "Tipe Cozinha: pedidos por setor (KDS)",
    ],
  },
  {
    id: "profissional",
    name: "Profissional",
    price: 89,
    fullPrice: 119,
    maxTables: 20,
    setupPrice: 200,
    popular: true,
    features: [
      "Tudo do Essencial",
      "Integração via API TIPE",
      "Relatórios por garçom",
      "Material de mesa com QR Code (condições na proposta)",
    ],
  },
  {
    id: "premium",
    name: "Premium",
    price: 129,
    fullPrice: 179,
    maxTables: 40,
    setupPrice: 0,
    features: ["Tudo do Profissional", "Controle de caixa", "Suporte prioritário"],
  },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export const planById = (id: string) => PLANS.find((p) => p.id === id);
export const priceLabel = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });

export const PUBLIC_PRICING =
  "Essencial: R$ 79/mês, até 10 mesas; Profissional: R$ 119/mês, até 20 mesas; Premium: R$ 179/mês, até 40 mesas. Implantação única de R$ 200 no Essencial e no Profissional; grátis a partir do Premium. Personalizado sob consulta. Todos os planos incluem Tipe Order, Tipe Equipe e Tipe Cozinha.";
