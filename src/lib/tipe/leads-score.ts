// Pontuação simples de prioridade do lead (0 a 100).
export type LeadScoreInput = {
  peak_queue?: string | null | undefined;
  close_time?: string | null | undefined;
  tables_range?: string | null | undefined;
  contact_role?: string | null | undefined;
  city?: string | null | undefined;
  stage2_completed_at?: string | null | undefined;
  referred_by_code?: string | null | undefined;
  discovery_source?: string | null | undefined;
  has_pagarme?: string | null | undefined;
};

const FORTALEZA_RM = ["fortaleza", "caucaia", "maracanau", "maranguape", "pacatuba", "aquiraz", "eusebio", "itaitinga", "horizonte", "pacajus", "guaiuba", "cascavel", "chorozinho", "pindoretama", "sao goncalo do amarante", "paracuru", "paraipaba", "trairi", "sao luis do curu"];
const norm = (s: string) => s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

export function leadScore(l: LeadScoreInput) {
  let s = 0;
  if (l.peak_queue === "sempre") s += 20; else if (l.peak_queue === "as_vezes") s += 10;
  if (l.close_time === "10_20" || l.close_time === "20_mais") s += 15;
  if (l.tables_range && l.tables_range !== "ate_10") s += 15;
  if (l.contact_role === "dono") s += 10;
  if (l.city && FORTALEZA_RM.includes(norm(l.city))) s += 10;
  if (l.stage2_completed_at) s += 10;
  if (l.referred_by_code || l.discovery_source === "indicacao") s += 10;
  if (l.has_pagarme === "sim") s += 10;
  return Math.min(100, s);
}

export const LEAD_STATUS: Record<string, string> = {
  novo: "Novo", contatado: "Contatado", demo_agendada: "Demonstração agendada", demo_feita: "Demonstração feita",
  piloto: "Piloto (30 dias grátis)", cliente: "Cliente", perdido: "Perdido",
};
export const LOST_REASONS: Record<string, string> = {
  preco: "Preço", sem_valor: "Não viu valor", pdv_nao_integra: "PDV não integra", concorrente: "Já usa concorrente", sem_resposta: "Sem resposta", outro: "Outro",
};
export const ROLE_LABEL: Record<string, string> = { dono: "Proprietário", gerente: "Gerente", outro: "Outro" };
export const VENUE: Record<string, string> = { restaurante: "Restaurante", bar: "Bar", cafeteria: "Cafeteria", quiosque: "Quiosque ou barraca de praia", food_park: "Food park", outro: "Outro" };
export const TABLES: Record<string, string> = { ate_10: "Até 10", "11_20": "11 a 20", "21_40": "21 a 40", "40_mais": "Mais de 40" };
export const WAITERS: Record<string, string> = { "1_3": "1 a 3", "4_8": "4 a 8", "9_15": "9 a 15", "15_mais": "Mais de 15" };
export const PEAKS: Record<string, string> = { almoco: "Almoço em dias úteis", jantar: "Jantar", fim_de_semana: "Fim de semana", happy_hour: "Happy hour", madrugada: "Madrugada" };
export const TICKETS: Record<string, string> = { ate_40: "Até R$ 40", "41_80": "R$ 41 a 80", "81_150": "R$ 81 a 150", "150_mais": "Acima de R$ 150" };
export const CLOSE_TIMES: Record<string, string> = { ate_5: "Até 5 min", "5_10": "5 a 10 min", "10_20": "10 a 20 min", "20_mais": "Mais de 20 min", nao_sei: "Não sei" };
export const QUEUES: Record<string, string> = { sempre: "Sempre", as_vezes: "Às vezes", raramente: "Raramente" };
export const PAINS: Record<string, string> = { demora: "Demora para fechar a conta", divisao: "Divisão da conta", maquininha: "Falta de maquininha", sobrecarga: "Garçons sobrecarregados", erros: "Erros na conta", outro: "Outro" };
export const PAGARME: Record<string, string> = { sim: "Sim", nao: "Não", nao_sei: "Não sei" };
export const SOURCES: Record<string, string> = { instagram: "Instagram", indicacao: "Indicação", google: "Google", visita: "Visita da equipe", evento: "Evento", outro: "Outro" };
