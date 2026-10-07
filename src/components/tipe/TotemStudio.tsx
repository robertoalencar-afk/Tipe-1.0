import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png.asset.json";
import logoDark from "@/assets/logo-dark.png.asset.json";

type Table = { id: string; number: string; code: string; access_token: string; active: boolean; waiter_id: string | null };

// Paletas fixas do material impresso (independem do tema da tela).
const MODELOS = {
  classico: { nome: "Clássico", desc: "Corpo azul-noite, adesivo branco com QR", bg: "#0b1f3a", fg: "#ffffff", accent: "#2dd4bf", stickerBg: "#ffffff", stickerFg: "#0b1f3a", logo: "light" },
  claro: { nome: "Claro", desc: "Corpo branco, ideal para mesas escuras", bg: "#ffffff", fg: "#0b1f3a", accent: "#14b8a6", stickerBg: "#0b1f3a", stickerFg: "#ffffff", logo: "dark" },
} as const;

// Sugestões de uso: cada tamanho indica onde o material funciona melhor.
const TAMANHOS = {
  adesivo: { nome: "Adesivo na mesa", medida: "8 × 8 cm", w: 80, h: 80, qr: 0.5, desc: "Cola direto no tampo da mesa" },
  comanda: { nome: "Comanda individual", medida: "6 × 9 cm", w: 60, h: 90, qr: 0.52, desc: "Vai junto da comanda de cada cliente" },
  guardanapo: { nome: "Porta guardanapo", medida: "5 × 15 cm", w: 50, h: 150, qr: 0.62, desc: "Encaixa no porta guardanapo inox" },
  acrilico: { nome: "Suporte acrílico", medida: "10 × 15 cm", w: 100, h: 150, qr: 0.56, desc: "Display de mesa em acrílico (A6)" },
} as const;

type ModeloKey = keyof typeof MODELOS;
type TamanhoKey = keyof typeof TAMANHOS;

function Totem({ modelo, tamanho, mesa, link, restaurante }: { modelo: ModeloKey; tamanho: TamanhoKey; mesa: string; link: string; restaurante: string }) {
  const m = MODELOS[modelo];
  const t = TAMANHOS[tamanho];
  const compacto = tamanho === "adesivo" || tamanho === "comanda";
  const estreito = tamanho === "guardanapo";
  const qrMm = Math.min(t.w, t.h) * t.qr;
  const pad = compacto ? "3mm" : estreito ? "4mm 3mm" : "6mm 5mm";
  const logoH = compacto ? "5.5mm" : estreito ? "5mm" : "9mm";
  const fraseFs = compacto ? "2.9mm" : estreito ? "2.7mm" : "4mm";
  const mesaFs = compacto ? "2.6mm" : estreito ? "2.5mm" : "3.4mm";
  const restFs = compacto ? "2.1mm" : estreito ? "2mm" : "2.6mm";
  const scanFs = compacto ? "2.4mm" : estreito ? "2.3mm" : "3.2mm";

  return (
    <div
      className="totem"
      style={{
        width: `${t.w}mm`,
        height: `${t.h}mm`,
        background: m.bg,
        color: m.fg,
        borderRadius: compacto ? "4mm" : "3mm",
        overflow: "hidden",
        border: m.bg === "#ffffff" ? "0.3mm dashed #cbd5e1" : undefined,
        boxSizing: "border-box",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "space-between",
        padding: pad,
        fontFamily: "Sora, Manrope, sans-serif",
      }}
    >
      <img src={m.logo === "light" ? logo.url : logoDark.url} alt="TIPE" style={{ height: logoH, maxWidth: "70%", objectFit: "contain" }} />

      {/* Adesivo com o QR, como no suporte de plástico da referência */}
      <div
        style={{
          background: m.stickerBg,
          color: m.stickerFg,
          padding: compacto ? "2mm" : "3mm",
          borderRadius: compacto ? "2.5mm" : "3.5mm",
          lineHeight: 0,
          boxShadow: "0 1mm 2.5mm rgba(0,0,0,0.28)",
          border: `0.25mm solid ${m.accent}`,
        }}
      >
        <QRCodeSVG value={link} size={512} style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }} level="M" />
      </div>

      <div style={{ fontSize: scanFs, fontWeight: 700, letterSpacing: "0.02em", color: m.accent }}>Escanear para pagar</div>

      <div style={{ textAlign: "center" }}>
        <div style={{ fontSize: fraseFs, fontWeight: 800, letterSpacing: "0.01em" }}>Pague. Sem esperar.</div>
        <div style={{ marginTop: compacto ? "0.6mm" : "1.2mm", fontSize: mesaFs, fontWeight: 700, color: m.accent }}>Mesa {mesa}</div>
        <div style={{ marginTop: "0.4mm", maxWidth: `${t.w - 10}mm`, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontSize: restFs, opacity: 0.75 }}>{restaurante}</div>
      </div>
    </div>
  );
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
    w.document.write(`<!doctype html><html><head><title>Totens — ${restaurante}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap"><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Sora,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.grid{display:flex;flex-wrap:wrap;gap:4mm}.totem{break-inside:avoid;page-break-inside:avoid}</style></head><body><div class="grid">${printRef.current?.innerHTML ?? ""}</div><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
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
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
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
          <div className="rounded-xl bg-muted p-4" style={{ zoom: tamanho === "acrilico" ? 0.85 : tamanho === "guardanapo" ? 0.7 : 1 }}>
            {escolhidas[0] ? <Totem modelo={modelo} tamanho={tamanho} mesa={escolhidas[0].number} link={link(escolhidas[0])} restaurante={restaurante} /> : <p className="p-8 text-sm text-muted-foreground">Nenhuma mesa</p>}
          </div>
        </div>
      </div>
      <div ref={printRef} className="hidden">
        {escolhidas.map((t) => <Totem key={t.id} modelo={modelo} tamanho={tamanho} mesa={t.number} link={link(t)} restaurante={restaurante} />)}
      </div>
    </div>
  );
}
