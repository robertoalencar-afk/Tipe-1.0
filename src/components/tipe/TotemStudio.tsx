import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { GravarEtiquetaNfc } from "@/components/tipe/GravarEtiquetaNfc";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import logo from "@/assets/marca/tipe-logo-branco.svg";
import logoDark from "@/assets/marca/tipe-logo.svg";

type Table = { id: string; number: string; code: string; access_token: string; active: boolean; waiter_id: string | null };

// Paletas fixas do material impresso (independem do tema da tela).
const MODELOS = {
  classico: { nome: "Clássico", desc: "Corpo azul-noite, adesivo branco com QR", bg: "#0b1f3a", fg: "#ffffff", accent: "#2dd4bf", stickerBg: "#ffffff", stickerFg: "#0b1f3a", logo: "light" },
  claro: { nome: "Claro", desc: "Corpo branco, ideal para mesas escuras", bg: "#ffffff", fg: "#0b1f3a", accent: "#14b8a6", stickerBg: "#0b1f3a", stickerFg: "#ffffff", logo: "dark" },
} as const;

// Sugestões de uso: cada tamanho indica onde o material funciona melhor.
const TAMANHOS = {
  adesivo: { nome: "Adesivo na mesa", medida: "8 × 8 cm", w: 80, h: 80, desc: "Cola direto no tampo da mesa" },
  quadrado: { nome: "Quadrado", medida: "10 × 10 cm", w: 100, h: 100, desc: "Placa ou adesivo quadrado" },
  faixa: { nome: "Faixa", medida: "10 × 5 cm", w: 100, h: 50, desc: "Horizontal, para bordas e balcões" },
  comanda: { nome: "Comanda individual", medida: "6 × 9 cm", w: 60, h: 90, desc: "Vai junto da comanda de cada cliente" },
  guardanapo: { nome: "Porta guardanapo", medida: "5 × 15 cm", w: 50, h: 150, desc: "Encaixa no porta guardanapo inox" },
  acrilico: { nome: "Suporte acrílico", medida: "10 × 15 cm", w: 100, h: 150, desc: "Display de mesa em acrílico (A6)" },
} as const;

type ModeloKey = keyof typeof MODELOS;
type TamanhoKey = keyof typeof TAMANHOS;

// Instrução curta, pensada para caber nos tamanhos pequenos.
const INSTRUCAO = "Aponte a câmera do celular para ver sua conta";

function Totem({ modelo, tamanho, mesa, link, restaurante }: { modelo: ModeloKey; tamanho: TamanhoKey; mesa: string; link: string; restaurante: string }) {
  const m = MODELOS[modelo];
  const t = TAMANHOS[tamanho];
  const horizontal = t.w > t.h;
  const base = Math.min(t.w, t.h); // escala tipográfica pelo menor lado
  const mm = (f: number) => `${(base * f).toFixed(2)}mm`;
  const qrMm = horizontal ? t.h - 12 : Math.min(t.w * 0.62, t.h * 0.5);
  const logoSrc = m.logo === "light" ? logo : logoDark;

  const qr = (
    <div style={{ background: m.stickerBg, padding: mm(0.03), borderRadius: mm(0.04), lineHeight: 0, border: `0.3mm solid ${m.accent}`, flexShrink: 0 }}>
      <QRCodeSVG value={link} size={512} bgColor={m.stickerBg} fgColor={m.stickerFg} style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }} level="M" />
    </div>
  );
  const instrucao = (
    <div style={{ display: "flex", alignItems: "center", gap: "1mm", fontSize: mm(horizontal ? 0.07 : 0.042), fontWeight: 700, lineHeight: 1.2, color: m.accent }}>
      <svg viewBox="0 0 24 24" style={{ width: mm(horizontal ? 0.1 : 0.06), height: mm(horizontal ? 0.1 : 0.06), flexShrink: 0 }} fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" /><circle cx="12" cy="13" r="3" /></svg>
      <span>{INSTRUCAO}</span>
    </div>
  );
  const rodape = (
    <div style={{ textAlign: horizontal ? "left" : "center", minWidth: 0 }}>
      <div style={{ fontSize: mm(horizontal ? 0.085 : 0.05), fontWeight: 800 }}>Pague. Sem esperar.</div>
      <div style={{ fontSize: mm(horizontal ? 0.075 : 0.042), fontWeight: 700, color: m.accent, marginTop: "0.5mm" }}>Mesa {mesa}</div>
      <div style={{ fontSize: mm(horizontal ? 0.06 : 0.032), opacity: 0.75, marginTop: "0.3mm", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: horizontal ? `${t.w - qrMm - 16}mm` : `${t.w - 8}mm` }}>{restaurante}</div>
    </div>
  );

  return (
    <div
      className="totem"
      style={{
        width: `${t.w}mm`, height: `${t.h}mm`, background: m.bg, color: m.fg,
        borderRadius: "3mm", overflow: "hidden", boxSizing: "border-box",
        border: m.bg === "#ffffff" ? "0.3mm dashed #cbd5e1" : undefined,
        display: "flex", flexDirection: horizontal ? "row" : "column", alignItems: "center",
        justifyContent: "space-between", gap: horizontal ? "4mm" : undefined,
        padding: horizontal ? "5mm" : mm(0.06), fontFamily: "\"Inter Tight\", sans-serif",
      }}
    >
      {horizontal ? (
        <>
          {qr}
          <div style={{ flex: 1, minWidth: 0, height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between" }}>
            <img src={logoSrc} alt="TIPE" style={{ height: "6mm", alignSelf: "flex-start", objectFit: "contain" }} />
            {instrucao}
            {rodape}
          </div>
        </>
      ) : (
        <>
          <img src={logoSrc} alt="TIPE" style={{ height: mm(0.08), maxWidth: "70%", objectFit: "contain" }} />
          {qr}
          {instrucao}
          {rodape}
        </>
      )}
    </div>
  );
}

// Escapa texto antes de inserir em HTML montado manualmente (nome do restaurante).
function escapeHtml(v: string) {
  return v.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!);
}

export function TotemStudio({ tables, link, restaurante }: { tables: Table[]; link: (t: Table) => string; restaurante: string }) {
  const ativas = useMemo(() => tables.filter((t) => t.active), [tables]);
  const [modelo, setModelo] = useState<ModeloKey>("classico");
  const [tamanho, setTamanho] = useState<TamanhoKey>("acrilico");
  const [selecionadas, setSelecionadas] = useState<string[] | null>(null);
  const escolhidas = ativas.filter((t) => !selecionadas || selecionadas.includes(t.id));
  const printRef = useRef<HTMLDivElement>(null);

  function imprimir() {
    if (!escolhidas.length) { toast.error("Selecione ao menos uma mesa"); return; }
    const w = window.open("", "_blank");
    if (!w) { toast.error("Permita pop-ups para imprimir"); return; }
    w.document.write(`<!doctype html><html><head><title>Totens - ${escapeHtml(restaurante)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap"><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Sora,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.grid{display:flex;flex-wrap:wrap;gap:4mm}.totem{break-inside:avoid;page-break-inside:avoid}</style></head><body><div class="grid">${printRef.current?.innerHTML ?? ""}</div><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
    w.document.close();
  }

  const opt = (ativo: boolean) => `rounded-xl border p-3 text-left transition ${ativo ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/50 p-4 print:hidden">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-bold">Impressão de totens</h3>
          <p className="text-sm text-muted-foreground">Escolha o modelo e onde vai usar. A impressão sai em folha A4, pronta para recortar.</p>
        </div>
        <Button onClick={imprimir}><Printer className="mr-1 h-4 w-4" />Imprimir {escolhidas.length} totem(ns)</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <section>
            <p className="mb-2 text-sm font-semibold">Modelo</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODELOS) as ModeloKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setModelo(k)} className={opt(modelo === k)}>
                  <span className="mb-2 flex gap-1">{[MODELOS[k].bg, MODELOS[k].stickerBg, MODELOS[k].accent].map((c) => <span key={c} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />)}</span>
                  <span className="block text-sm font-bold">{MODELOS[k].nome}</span>
                  <span className="block text-xs text-muted-foreground">{MODELOS[k].desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-2 text-sm font-semibold">Onde vai usar</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
              {(Object.keys(TAMANHOS) as TamanhoKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setTamanho(k)} className={opt(tamanho === k)}>
                  <span className="block text-sm font-bold">{TAMANHOS[k].nome}</span>
                  <span className="block text-xs font-semibold text-primary">{TAMANHOS[k].medida}</span>
                  <span className="block text-xs text-muted-foreground">{TAMANHOS[k].desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Mesas</p>
              <Button size="sm" variant="ghost" onClick={() => setSelecionadas(selecionadas ? null : [])}>{selecionadas ? "Selecionar todas" : "Escolher mesas"}</Button>
            </div>
            {selecionadas ? (
              <div className="flex flex-wrap gap-1.5">
                {ativas.map((t) => {
                  const on = selecionadas.includes(t.id);
                  return <button key={t.id} type="button" onClick={() => setSelecionadas(on ? selecionadas.filter((x) => x !== t.id) : [...selecionadas, t.id])} className={`h-9 min-w-12 rounded-md border px-2 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}>{t.number}</button>;
                })}
              </div>
            ) : <p className="text-sm text-muted-foreground">Todas as {ativas.length} mesas ativas.</p>}
          </section>
        </div>
        <div className="flex flex-col items-center gap-2">
          <p className="text-xs text-muted-foreground">Prévia {escolhidas[0] ? `· Mesa ${escolhidas[0].number}` : ""}</p>
          <div className="rounded-xl bg-muted p-4" style={{ zoom: tamanho === "acrilico" ? 0.85 : tamanho === "guardanapo" ? 0.7 : tamanho === "faixa" ? 0.9 : 1 }}>
            {escolhidas[0] ? <Totem modelo={modelo} tamanho={tamanho} mesa={escolhidas[0].number} link={link(escolhidas[0])} restaurante={restaurante} /> : <p className="p-8 text-sm text-muted-foreground">Nenhuma mesa</p>}
          </div>
        </div>
      </div>
      <GravarEtiquetaNfc restaurante={restaurante} mesas={ativas.map((t) => ({ id: t.id, number: t.number, url: link(t) }))} />
      <div ref={printRef} className="hidden">
        {escolhidas.map((t) => <Totem key={t.id} modelo={modelo} tamanho={tamanho} mesa={t.number} link={link(t)} restaurante={restaurante} />)}
      </div>
    </div>
  );
}
