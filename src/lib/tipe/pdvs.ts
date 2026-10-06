// Catálogo de PDVs exibido no onboarding e nas integrações. Qualquer PDV é aceito:
// os que não estão na lista entram como nome livre (slug) pelo campo "Outro PDV".
export type PdvInfo = { k: string; l: string; menu: string };

export const PDVS: PdvInfo[] = [
  { k: "saipos", l: "Saipos", menu: "Configurações → Integrações → Parceiros" },
  { k: "consumer", l: "Consumer", menu: "Configurações → Integrações" },
  { k: "goomer", l: "Goomer", menu: "Painel → Integrações → API" },
  { k: "anotaai", l: "Anota AI", menu: "Configurações → Integrações" },
  { k: "totvs", l: "TOTVS Chef", menu: "Administração → Integrações → Webhooks" },
  { k: "linx", l: "Linx Degust", menu: "Configurações → Integrações externas" },
  { k: "colibri", l: "Colibri", menu: "Retaguarda → Integrações" },
  { k: "menew", l: "Menew", menu: "Configurações → Integrações" },
  { k: "teknisa", l: "Teknisa", menu: "Retaguarda → Integrações" },
  { k: "bematech", l: "Bematech Live", menu: "Configurações → Integrações" },
  { k: "raffinato", l: "Raffinato", menu: "Configurações → Integrações" },
  { k: "sischef", l: "Sischef", menu: "Configurações → Integrações" },
  { k: "cardapioweb", l: "Cardápio Web", menu: "Configurações → Integrações" },
  { k: "wabiz", l: "Wabiz", menu: "Configurações → Integrações" },
  { k: "hiper", l: "Hiper", menu: "Configurações → Integrações" },
  { k: "marketup", l: "MarketUP", menu: "Configurações → Integrações" },
  { k: "vhsys", l: "VHSYS", menu: "Configurações → Integrações" },
  { k: "tagme", l: "Tagme", menu: "Configurações → Integrações" },
];

export const pdvGeneric = (nome: string): PdvInfo => ({ k: slugPdv(nome) || "outro", l: nome || "Outro PDV", menu: "a área de integrações ou API do seu sistema" });

export function slugPdv(nome: string) {
  return nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 40);
}

export function pdvLabel(k: string) {
  return PDVS.find((p) => p.k === k)?.l ?? k.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
