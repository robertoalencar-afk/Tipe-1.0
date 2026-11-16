import type { DadosConfiguracaoFiscal, DadosPerfilProdutoFiscal } from "./schemas";

/** Projeções destinadas à Gestão; não incluem credenciais nem payloads da venda. */
export type ConfiguracaoFiscalPublica = {
  provider: string;
  environment: string;
  cnpj: string;
  legal_name: string;
  state_registration: string;
  uf: string;
  time_zone: string;
  acquirer_cnpj: string | null;
  service_fee_policy: string;
  service_fee_review: string | null;
  municipality_code: string;
  tax_regime: string;
  address: DadosConfiguracaoFiscal["address"];
  enabled: boolean;
  verified_at: string | null;
  updated_at: string;
};
export type PerfilFiscalPublico = {
  id: string;
  menu_item_id: string;
  uf: string;
  tax_regime: string;
  provider: string;
  valid_from: string;
  valid_until: string | null;
  ncm: string;
  cfop: string;
  unit: string;
  layout_version: string;
  tables_version: string;
  review_reference: string;
  attributes: DadosPerfilProdutoFiscal["attributes"];
  calculation_rules: DadosPerfilProdutoFiscal["calculationRules"];
};
export type DocumentoFiscalPublico = {
  send_started: boolean;
  dispatch_error: string | null;
  provider_reference: string;
  time_zone: string;
  id: string;
  model: string;
  state: string;
  source_kind: string;
  source_reference: string;
  amount_cents: number;
  access_key: string | null;
  sefaz_code: string | null;
  authorized_at: string | null;
  cancelled_at: string | null;
  created_at: string;
};
