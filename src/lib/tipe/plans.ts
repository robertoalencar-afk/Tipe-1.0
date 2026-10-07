// Planos de assinatura TIPE (valores mensais em R$). Mesas máximas validadas também no banco (signup_restaurant).
export const TRIAL_DAYS = 30;
export const PLANS = [
  { id: "essencial", name: "Essencial", price: 49.9, maxTables: 10, features: ["Pagamento na mesa por QR Code", "Gorjeta extra para o garçom", "Painel em tempo real", "Lançamento TIPE incluso"] },
  { id: "profissional", name: "Profissional", price: 79.9, maxTables: 20, popular: true, features: ["Tudo do Essencial", "Integração assistida com seu PDV", "Relatórios por garçom", "Totens personalizados"] },
  { id: "premium", name: "Premium", price: 99.9, maxTables: 40, features: ["Tudo do Profissional", "Cozinha e bar (KDS)", "Controle de caixa", "Suporte prioritário"] },
] as const;
export type PlanId = (typeof PLANS)[number]["id"];
export const planById = (id: string) => PLANS.find((p) => p.id === id);
export const priceLabel = (v: number) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2 });
