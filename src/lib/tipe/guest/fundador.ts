// Restaurante Fundador do Tipe Reserva: etapas da migração 0073, na ordem da trilha.
export const ETAPAS_FUNDADOR = [
  "interessado",
  "selecionado",
  "em_implantacao",
  "em_testes",
  "piloto",
  "apto",
  "ativo",
] as const;
export type EtapaFundador = (typeof ETAPAS_FUNDADOR)[number] | "suspenso" | "encerrado";

export const ETAPA_LABEL: Record<EtapaFundador, string> = {
  interessado: "Interessado",
  selecionado: "Selecionado",
  em_implantacao: "Em implantação",
  em_testes: "Em testes",
  piloto: "Piloto",
  apto: "Apto",
  ativo: "Ativo",
  suspenso: "Suspenso",
  encerrado: "Encerrado",
};

/** Quantos parceiros em cada etapa, sempre com todas as etapas (zero quando vazia). */
export function contarEtapas(status: string[]): { etapa: EtapaFundador; n: number }[] {
  const todas: EtapaFundador[] = [...ETAPAS_FUNDADOR, "suspenso", "encerrado"];
  return todas.map((etapa) => ({ etapa, n: status.filter((s) => s === etapa).length }));
}

type Reserva = { restaurant_id: string; status: string; party_size: number };

/** Métricas de reservas por restaurante, sem nenhum dado do cliente. */
export function metricasReservas(rs: Reserva[]) {
  const por = new Map<string, { reservas: number; pessoas: number; canceladas: number; faltas: number; honradas: number }>();
  for (const r of rs) {
    const m = por.get(r.restaurant_id) ?? { reservas: 0, pessoas: 0, canceladas: 0, faltas: 0, honradas: 0 };
    m.reservas += 1;
    m.pessoas += r.party_size;
    if (r.status.startsWith("cancelada")) m.canceladas += 1;
    if (r.status === "nao_compareceu") m.faltas += 1;
    if (["chegou", "sentada", "concluida"].includes(r.status)) m.honradas += 1;
    por.set(r.restaurant_id, m);
  }
  const total = [...por.values()].reduce(
    (a, m) => ({
      reservas: a.reservas + m.reservas,
      pessoas: a.pessoas + m.pessoas,
      canceladas: a.canceladas + m.canceladas,
      faltas: a.faltas + m.faltas,
      honradas: a.honradas + m.honradas,
    }),
    { reservas: 0, pessoas: 0, canceladas: 0, faltas: 0, honradas: 0 },
  );
  const fechadas = total.honradas + total.faltas;
  return { total, taxaFalta: fechadas ? total.faltas / fechadas : 0, porRestaurante: por };
}
