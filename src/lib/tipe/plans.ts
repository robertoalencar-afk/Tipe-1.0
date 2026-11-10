// Planos de assinatura TIPE (valores mensais em R$; price = preço fundador). Fonte oficial dos limites e preços: tabela plan_catalog no banco, editável pelo founder.
export const TRIAL_DAYS = 30;
export const SHOW_PLAN_PRICES = false;
export const PLANS = [
  { id: "essencial", name: "Essencial", price: 59, fullPrice: 79, maxTables: 10, features: ["Pagamento na mesa por QR Code", "Gorjeta extra para a equipe", "Painel em tempo real", "Lançamento TIPE incluso"] },
  { id: "profissional", name: "Profissional", price: 89, fullPrice: 119, maxTables: 20, popular: true, features: ["Tudo do Essencial", "Integração via API TIPE (sob análise)", "Relatórios por garçom", "Totens personalizados"] },
  { id: "premium", name: "Premium", price: 129, fullPrice: 179, maxTables: 40, features: ["Tudo do Profissional", "Cozinha e bar (KDS)", "Controle de caixa", "Suporte prioritário"] },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export const planById = (id: string) => PLANS.find((p) => p.id === id);
export const priceLabel = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
