/**
 * Indicadores comerciais da Central: chegada de leads, tempo da primeira resposta, funil e origem.
 * Função pura (sem banco) para ser testada; a Central alimenta com dados reais.
 * "Primeira resposta" = primeiro contato humano registrado (e-mail, WhatsApp, ligação, reunião ou nota)
 * depois da chegada do lead. Registros do sistema (kind "system", "stage", "task") não contam.
 */
export type LeadIn = { id: string; created_at: string; nome: string; contato: string; origem: string | null };
export type RespostaIn = { lead_id: string; at: string };
export type EtapaIn = { key: string; label: string; position: number; kind: "open" | "won" | "lost" };
export type OportunidadeIn = { lead_id: string | null; stage_key: string; status: "open" | "won" | "lost"; created_at: string };

const MIN = 60_000;
export type Desempenho = {
  total: number;
  totalAnterior: number;
  respondidos: number;
  semResposta: number;
  tempoMedioMin: number | null;
  medianaMin: number | null;
  ate15Pct: number | null;
  ate60Pct: number | null;
  ganhos: number;
  conversaoPct: number;
  aguardando: { id: string; nome: string; contato: string; minutos: number }[];
  porDia: { dia: string; total: number }[];
  funil: { key: string; label: string; atingiram: number; passoPct: number | null }[];
  porOrigem: { origem: string; total: number; respondidos: number; ganhos: number }[];
};

export function mediana(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m]! : (s[m - 1]! + s[m]!) / 2;
}

export function calcularDesempenho(i: {
  agora: number;
  dias: number;
  leads: LeadIn[];
  leadsAnteriores: number;
  respostas: RespostaIn[];
  etapas: EtapaIn[];
  oportunidades: OportunidadeIn[];
}): Desempenho {
  const primeira = new Map<string, number>();
  for (const r of i.respostas) {
    const t = new Date(r.at).getTime();
    const cur = primeira.get(r.lead_id);
    if (cur === undefined || t < cur) primeira.set(r.lead_id, t);
  }
  const tempos: number[] = [];
  const aguardando: Desempenho["aguardando"] = [];
  for (const l of i.leads) {
    const chegou = new Date(l.created_at).getTime();
    const resp = primeira.get(l.id);
    if (resp !== undefined && resp >= chegou) tempos.push((resp - chegou) / MIN);
    else if (resp === undefined) aguardando.push({ id: l.id, nome: l.nome, contato: l.contato, minutos: Math.max(0, Math.round((i.agora - chegou) / MIN)) });
  }
  aguardando.sort((a, b) => b.minutos - a.minutos);
  const pctDe = (n: number) => (tempos.length ? Math.round((n / tempos.length) * 100) : null);

  const ganhosLead = new Set(i.oportunidades.filter((o) => o.status === "won" && o.lead_id).map((o) => o.lead_id!));
  const idsPeriodo = new Set(i.leads.map((l) => l.id));
  const ganhos = [...ganhosLead].filter((id) => idsPeriodo.has(id)).length;

  const porDiaMap = new Map<string, number>();
  for (let d = i.dias - 1; d >= 0; d--) porDiaMap.set(new Date(i.agora - d * 864e5).toISOString().slice(0, 10), 0);
  for (const l of i.leads) {
    const k = l.created_at.slice(0, 10);
    if (porDiaMap.has(k)) porDiaMap.set(k, (porDiaMap.get(k) ?? 0) + 1);
  }

  // Funil acumulado: quantas oportunidades chegaram a cada etapa (perdidas não entram: não guardam a etapa).
  const ordenadas = i.etapas.filter((e) => e.kind !== "lost").sort((a, b) => a.position - b.position);
  const posDe = new Map(ordenadas.map((e) => [e.key, e.position]));
  const ativas = i.oportunidades.filter((o) => o.status !== "lost" && posDe.has(o.stage_key));
  const funil = ordenadas.map((e, idx) => {
    const atingiram = ativas.filter((o) => (posDe.get(o.stage_key) ?? 0) >= e.position).length;
    return { key: e.key, label: e.label, atingiram, passoPct: 0 as number | null, idx };
  });
  const funilFinal = funil.map((f, idx) => ({ key: f.key, label: f.label, atingiram: f.atingiram, passoPct: idx === 0 ? null : funil[idx - 1]!.atingiram > 0 ? Math.round((f.atingiram / funil[idx - 1]!.atingiram) * 100) : null }));

  const origens = new Map<string, { total: number; respondidos: number; ganhos: number }>();
  for (const l of i.leads) {
    const k = (l.origem ?? "").trim() || "Direto";
    const o = origens.get(k) ?? { total: 0, respondidos: 0, ganhos: 0 };
    o.total += 1;
    if (primeira.has(l.id)) o.respondidos += 1;
    if (ganhosLead.has(l.id)) o.ganhos += 1;
    origens.set(k, o);
  }

  return {
    total: i.leads.length,
    totalAnterior: i.leadsAnteriores,
    respondidos: tempos.length,
    semResposta: aguardando.length,
    tempoMedioMin: tempos.length ? Math.round(tempos.reduce((s, t) => s + t, 0) / tempos.length) : null,
    medianaMin: tempos.length ? Math.round(mediana(tempos)!) : null,
    ate15Pct: pctDe(tempos.filter((t) => t <= 15).length),
    ate60Pct: pctDe(tempos.filter((t) => t <= 60).length),
    ganhos,
    conversaoPct: i.leads.length ? Math.round((ganhos / i.leads.length) * 1000) / 10 : 0,
    aguardando: aguardando.slice(0, 15),
    porDia: [...porDiaMap.entries()].map(([dia, total]) => ({ dia, total })),
    funil: funilFinal,
    porOrigem: [...origens.entries()].map(([origem, v]) => ({ origem, ...v })).sort((a, b) => b.total - a.total),
  };
}

/** "12 min", "3 h 05", "2 d". */
export function duracaoCurta(min: number | null) {
  if (min === null) return "—";
  if (min < 1) return "menos de 1 min";
  if (min < 60) return `${min} min`;
  if (min < 1440) return `${Math.floor(min / 60)} h ${String(min % 60).padStart(2, "0")}`;
  return `${Math.floor(min / 1440)} d`;
}
