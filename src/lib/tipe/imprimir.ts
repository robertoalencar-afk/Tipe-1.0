// Impressão de tickets (cozinha e bar) e da pré-conta, para impressora térmica 80 mm ou
// impressora comum (A4). Gera um HTML simples e imprime só esse trecho, sem biblioteca.
// A pré-conta não é documento fiscal: o rodapé diz isso.

const esc = (s: string) =>
  s.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export type Papel = "58" | "80" | "a4";
export const PAPEL_ID = "tipe-impressao";

/** CSS da impressão, todo preso ao contêiner #tipe-impressao para não vazar no app. */
export function cssImpressao(papel: Papel = "80") {
  const S = `#${PAPEL_ID}`;
  const pagina =
    papel === "a4"
      ? `@page { size: A4 portrait; margin: 16mm; }`
      : `@page { size: ${papel}mm auto; margin: 2mm 3mm; }`;
  const largura = papel === "a4" ? "120mm" : papel === "58" ? "52mm" : "74mm";
  const fonte =
    papel === "a4"
      ? `12pt/1.45 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`
      : `${papel === "58" ? 11 : 13}px/1.35 "Courier New", ui-monospace, monospace`;
  return `
${pagina}
@media screen { ${S} { display: none !important; } }
@media print {
  html, body { background: #fff !important; height: auto !important; min-height: 0 !important; overflow: visible !important; margin: 0 !important; padding: 0 !important; }
  body > *:not(${S}) { display: none !important; }
  ${S} { display: block !important; position: static !important; }
}
${S}, ${S} * { box-sizing: border-box; color: #000 !important; background: transparent !important; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
${S} { font: ${fonte}; width: ${largura}; max-width: 100%; margin: 0 auto; }
${S} h1 { font-size: ${papel === "a4" ? "18pt" : "16px"}; margin: 0 0 2px; text-align: center; font-weight: 700; }
${S} h2 { font-size: 22px; margin: 6px 0; text-align: center; }
${S} .c { text-align: center; } ${S} .m { font-size: ${papel === "a4" ? "9.5pt" : "11px"}; }
${S} hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
${S} .l { display: flex; justify-content: space-between; gap: 6px; break-inside: avoid; page-break-inside: avoid; }
${S} .l span:first-child { flex: 1; min-width: 0; overflow-wrap: anywhere; } ${S} .l span:last-child { white-space: nowrap; }
${S} .t { font-weight: 700; font-size: ${papel === "a4" ? "13pt" : "15px"}; }
${S} .u { font-size: ${papel === "a4" ? "9.5pt" : "11px"}; margin: -1px 0 3px ${papel === "a4" ? "0" : "14px"}; }
${S} .c svg { width: ${papel === "58" ? "30mm" : "34mm"}; height: auto; aspect-ratio: 1; margin: 4px auto; display: block; }
${S} .obs { margin-left: 14px; font-weight: 700; }
${S} .aviso { border: 1px solid #000; padding: 3px 4px; text-align: center; font-weight: 700; font-size: ${papel === "a4" ? "10pt" : "11px"}; margin-top: 4px; }
`;
}

export type ItemTicket = {
  qty: number;
  nome: string;
  obs?: string | null;
  setor?: "kitchen" | "bar";
};

export function htmlTicket(v: {
  restaurante: string;
  titulo: string;
  subtitulo?: string | null;
  setor: string;
  hora: Date;
  itens: ItemTicket[];
}) {
  const linhas = v.itens
    .map(
      (i) =>
        `<div><div class="l t"><span>${i.qty}× ${esc(i.nome)}</span></div>${i.obs ? `<div class="obs">Obs.: ${esc(i.obs)}</div>` : ""}</div>`,
    )
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

/** Endereço que o QR da pré-conta abre: a conta da mesa, onde o cliente divide e paga pelo Tipe Pay. */
export function linkMesa(slug: string, code: string, token: string, origem?: string) {
  const base = origem && !/workers\.dev|localhost/.test(origem) ? origem : "https://tipe.digital";
  return `${base}/${slug}/${code}?t=${token}`;
}

const dataHora = (d: Date) =>
  d.toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

/** CNPJ com máscara; devolve como veio se não tiver 14 dígitos. */
export function formatarCnpj(v: string) {
  const d = v.replace(/\D/g, "");
  return d.length === 14 ? d.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5") : v;
}

/** Quanto já foi pago e quanto falta, com a taxa de serviço proporcional. `pagoItens` é o subtotal dos itens já pagos. */
export function saldoPreConta(linhas: LinhaConta[], taxa: number, pagoItens: number) {
  const t = totaisPreConta(linhas, taxa);
  const faltaItens = Math.max(0, Math.round((t.subtotal - Math.max(0, pagoItens)) * 100) / 100);
  const restante =
    Math.round((faltaItens + Math.round(faltaItens * Math.max(0, taxa) * 100) / 100) * 100) / 100;
  return { ...t, pago: Math.max(0, Math.round((t.total - restante) * 100) / 100), restante };
}

export function htmlPreConta(v: {
  restaurante: string;
  razaoSocial?: string | null;
  cnpj?: string | null;
  endereco?: string | null;
  telefone?: string | null;
  mesa: string;
  garcom?: string | null;
  hora: Date;
  linhas: LinhaConta[];
  taxa: number;
  pagoItens?: number | null;
  qrSvg?: string | null;
}) {
  const t = saldoPreConta(v.linhas, v.taxa, v.pagoItens ?? 0);
  const linhas = v.linhas
    .map(
      (l) =>
        `<div class="l"><span>${l.qty}× ${esc(l.nome)}</span><span>${brl(l.qty * l.unit)}</span></div>${l.qty !== 1 ? `<div class="u">${brl(l.unit)} cada</div>` : ""}`,
    )
    .join("");
  const pct = Math.round(v.taxa * 1000) / 10;
  const razao =
    v.razaoSocial && v.razaoSocial.trim().toLowerCase() !== v.restaurante.trim().toLowerCase()
      ? v.razaoSocial
      : null;
  const cab = [
    razao ? `<div class="c m">${esc(razao)}</div>` : "",
    v.cnpj ? `<div class="c m">CNPJ ${esc(formatarCnpj(v.cnpj))}</div>` : "",
    v.endereco ? `<div class="c m">${esc(v.endereco)}</div>` : "",
    v.telefone ? `<div class="c m">Tel. ${esc(v.telefone)}</div>` : "",
  ].join("");
  const saldo =
    t.pago > 0
      ? `<div class="l"><span>Já pago</span><span>${brl(t.pago)}</span></div><div class="l t"><span>Falta pagar</span><span>${brl(t.restante)}</span></div>`
      : "";
  return `<h1>${esc(v.restaurante)}</h1>${cab}<hr><div class="c t">PRÉ-CONTA · Mesa ${esc(v.mesa)}</div><div class="c m">${dataHora(v.hora)}${v.garcom ? ` · Garçom: ${esc(v.garcom)}` : ""}</div><hr>${linhas || `<div class="c m">Nenhum item lançado.</div>`}<hr><div class="l"><span>Subtotal</span><span>${brl(t.subtotal)}</span></div>${v.taxa > 0 ? `<div class="l"><span>Serviço (${pct}%, opcional)</span><span>${brl(t.servico)}</span></div>` : ""}<div class="l t"><span>Total</span><span>${brl(t.total)}</span></div>${saldo}<hr>${v.qrSvg ? `<div class="c">${v.qrSvg}</div><div class="c m">Aponte a câmera para dividir e pagar pelo Tipe Pay</div><hr>` : ""}<div class="aviso">NÃO É DOCUMENTO FISCAL</div><div class="c m">Pré-conta para conferência da mesa. Sem valor fiscal.</div>`;
}

/**
 * Imprime um trecho de HTML. Monta o conteúdo num contêiner do próprio documento e esconde o resto
 * do app só na impressão. Não usa iframe: no Safari do iPhone/iPad, imprimir um iframe imprime a
 * página inteira (modal + painel atrás).
 */
export function imprimirHtml(corpo: string, titulo = "Impressão", papel: Papel = "80") {
  if (typeof document === "undefined") return;
  document.getElementById(PAPEL_ID)?.remove();
  document.getElementById(`${PAPEL_ID}-css`)?.remove();
  const css = document.createElement("style");
  css.id = `${PAPEL_ID}-css`;
  css.textContent = cssImpressao(papel);
  const box = document.createElement("div");
  box.id = PAPEL_ID;
  box.setAttribute("aria-hidden", "true");
  box.innerHTML = corpo;
  document.head.appendChild(css);
  document.body.appendChild(box);
  const tituloAntes = document.title;
  document.title = titulo;
  const limpar = () => {
    window.removeEventListener("afterprint", limpar);
    document.title = tituloAntes;
    box.remove();
    css.remove();
  };
  window.addEventListener("afterprint", limpar);
  // Dá um quadro para o navegador montar o layout antes de abrir a impressão.
  setTimeout(() => window.print(), 50);
}
