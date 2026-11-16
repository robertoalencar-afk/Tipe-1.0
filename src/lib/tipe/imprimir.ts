// Impressão de tickets (cozinha e bar) e da pré-conta, para impressora térmica 80 mm ou
// impressora comum. Gera um HTML simples e imprime num iframe oculto, sem biblioteca.
// A pré-conta não é documento fiscal: o rodapé diz isso.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

const CSS = `
@page { size: 80mm auto; margin: 3mm; }
* { box-sizing: border-box; }
body { font: 13px/1.35 "Courier New", monospace; color: #000; width: 74mm; margin: 0; }
h1 { font-size: 16px; margin: 0 0 2px; text-align: center; }
h2 { font-size: 22px; margin: 6px 0; text-align: center; }
.c { text-align: center; } .m { color: #000; font-size: 11px; }
hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
.l { display: flex; justify-content: space-between; gap: 6px; }
.l span:first-child { flex: 1; } .t { font-weight: 700; font-size: 15px; }
.obs { margin-left: 14px; font-weight: 700; }
`;

export type ItemTicket = { qty: number; nome: string; obs?: string | null; setor?: "kitchen" | "bar" };

export function htmlTicket(v: { restaurante: string; titulo: string; subtitulo?: string | null; setor: string; hora: Date; itens: ItemTicket[] }) {
  const linhas = v.itens
    .map((i) => `<div><div class="l t"><span>${i.qty}× ${esc(i.nome)}</span></div>${i.obs ? `<div class="obs">Obs.: ${esc(i.obs)}</div>` : ""}</div>`)
    .join("");
  return `<h1>${esc(v.restaurante)}</h1><div class="c m">${esc(v.setor)} · ${v.hora.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div><hr><h2>${esc(v.titulo)}</h2>${v.subtitulo ? `<div class="c">${esc(v.subtitulo)}</div>` : ""}<hr>${linhas}<hr><div class="c m">Ticket de produção</div>`;
}

export type LinhaConta = { qty: number; nome: string; unit: number };

/** Total da pré-conta. A taxa de serviço (0 a 1) é sobre os itens, arredondada em centavos. */
export function totaisPreConta(linhas: LinhaConta[], taxa: number) {
  const subtotal = Math.round(linhas.reduce((s, l) => s + l.qty * l.unit, 0) * 100) / 100;
  const servico = Math.round(subtotal * Math.max(0, taxa) * 100) / 100;
  return { subtotal, servico, total: Math.round((subtotal + servico) * 100) / 100 };
}

export function htmlPreConta(v: { restaurante: string; mesa: string; garcom?: string | null; hora: Date; linhas: LinhaConta[]; taxa: number }) {
  const t = totaisPreConta(v.linhas, v.taxa);
  const linhas = v.linhas
    .map((l) => `<div class="l"><span>${l.qty}× ${esc(l.nome)}</span><span>${brl(l.qty * l.unit)}</span></div>`)
    .join("");
  return `<h1>${esc(v.restaurante)}</h1><div class="c m">PRÉ-CONTA · ${v.hora.toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</div><hr><div class="c t">Mesa ${esc(v.mesa)}</div>${v.garcom ? `<div class="c m">Garçom: ${esc(v.garcom)}</div>` : ""}<hr>${linhas}<hr><div class="l"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>${v.taxa > 0 ? `<div class="l"><span>Serviço (${Math.round(v.taxa * 1000) / 10}%)</span><span>${brl(t.servico)}</span></div>` : ""}<div class="l t"><span>Total</span><span>${brl(t.total)}</span></div><hr><div class="c m">Sem valor fiscal. Para conferência da mesa.</div>`;
}

/** Imprime um trecho de HTML num iframe oculto. */
export function imprimirHtml(corpo: string, titulo = "Impressão") {
  if (typeof document === "undefined") return;
  const f = document.createElement("iframe");
  f.setAttribute("aria-hidden", "true");
  f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
  document.body.appendChild(f);
  const d = f.contentDocument;
  if (!d) { f.remove(); return; }
  d.open();
  d.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(titulo)}</title><style>${CSS}</style></head><body>${corpo}</body></html>`);
  d.close();
  const limpar = () => setTimeout(() => f.remove(), 1000);
  f.contentWindow?.addEventListener("afterprint", limpar);
  setTimeout(() => { f.contentWindow?.focus(); f.contentWindow?.print(); setTimeout(limpar, 60000); }, 150);
}
