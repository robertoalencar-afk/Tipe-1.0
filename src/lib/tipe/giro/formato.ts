/** Formatação brasileira da calculadora (moeda, números, minutos e horas). */

const seguro = (n: number) => (Number.isFinite(n) ? n : 0);

/** R$ 1.234 (sem centavos) ou R$ 1.234,56 com `centavos`. */
export function brl(n: number, centavos = false) {
  const v = seguro(n);
  return v.toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
    minimumFractionDigits: centavos ? 2 : 0,
    maximumFractionDigits: centavos ? 2 : 0,
  });
}

/** Resultado com sinal explícito: + R$ 1.200 ou − R$ 80. */
export function brlSinal(n: number) {
  const v = Math.round(seguro(n));
  if (v === 0) return brl(0);
  return `${v > 0 ? "+" : "−"} ${brl(Math.abs(v))}`;
}

export function numero(n: number, casas = 0) {
  return seguro(n).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });
}

export function pct(n: number, casas = 0) {
  return `${numero(n, casas)}%`;
}

/** 45 min, 1 h, 3 h 20 min, 1.204 h. */
export function duracao(min: number) {
  const m = Math.round(Math.max(0, seguro(min)));
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (h >= 100) return `${numero(Math.round(m / 60))} h`;
  if (r === 0) return `${h} h`;
  return `${h} h ${r} min`;
}

/** Converte texto digitado (aceita vírgula decimal e separador de milhar) em número. */
export function lerNumero(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  // Vírgula é decimal; ponto é milhar quando vem em grupos de três (1.500 = 1500).
  const normal = limpo.includes(",")
    ? limpo.replace(/\./g, "").replace(",", ".")
    : /^-?\d{1,3}(\.\d{3})+$/.test(limpo)
      ? limpo.replace(/\./g, "")
      : limpo;
  const n = Number(normal);
  return Number.isFinite(n) ? n : null;
}
