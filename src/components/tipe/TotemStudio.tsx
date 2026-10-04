import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import logo from "@/assets/logo.png.asset.json";
import logoDark from "@/assets/logo-dark.png.asset.json";

type Table = { id: string; number: string; code: string; access_token: string; active: boolean };

// Paletas fixas do material impresso (independem do tema da tela).
const MODELOS = {
  classico: { nome: "Clássico", desc: "Azul-marinho com destaque turquesa", bg: "#0b1f3a", fg: "#ffffff", accent: "#2dd4bf", qrBg: "#ffffff", logo: "light" },
  claro: { nome: "Claro", desc: "Fundo branco, ideal para mesas escuras", bg: "#ffffff", fg: "#0b1f3a", accent: "#14b8a6", qrBg: "#ffffff", logo: "dark" },
  turquesa: { nome: "Turquesa", desc: "Vibrante, chama atenção no salão", bg: "#14b8a6", fg: "#0b1f3a", accent: "#0b1f3a", qrBg: "#ffffff", logo: "dark" },
  minimal: { nome: "Minimalista", desc: "Preto e branco, econômico na impressão", bg: "#ffffff", fg: "#111111", accent: "#111111", qrBg: "#ffffff", logo: "dark" },
} as const;

const TAMANHOS = {
  display: { nome: "Display de mesa", medida: "10 × 15 cm", w: 100, h: 150, qr: 0.62, desc: "Para acrílico de mesa (A6)" },
  grande: { nome: "Display grande", medida: "15 × 21 cm", w: 148, h: 210, qr: 0.6, desc: "Balcão e entrada (A5)" },
  tenda: { nome: "Tenda dobrável", medida: "10 × 20 cm", w: 100, h: 200, qr: 0.55, desc: "Dobre ao meio: dois lados iguais" },
  adesivo: { nome: "Adesivo quadrado", medida: "8 × 8 cm", w: 80, h: 80, qr: 0.6, desc: "Cola direto no tampo da mesa" },
} as const;

type ModeloKey = keyof typeof MODELOS;
type TamanhoKey = keyof typeof TAMANHOS;

function Totem({ modelo, tamanho, mesa, link, restaurante, frase, mostrarNome }: { modelo: ModeloKey; tamanho: TamanhoKey; mesa: string; link: string; restaurante: string; frase: string; mostrarNome: boolean }) {
  const m = MODELOS[modelo];
  const t = TAMANHOS[tamanho];
  const qrMm = Math.min(t.w, tamanho === "tenda" ? t.h / 2 : t.h) * t.qr;
  const lado = (rotate = false) => (
    <div style={{ height: tamanho === "tenda" ? "50%" : "100%", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", padding: tamanho === "adesivo" ? "4mm" : "7mm 6mm", boxSizing: "border-box", transform: rotate ? "rotate(180deg)" : undefined }}>
      {tamanho !== "adesivo" && <img src={m.logo === "light" ? logo.url : logoDark.url} alt="TIPE" style={{ height: tamanho === "grande" ? "16mm" : "10mm", objectFit: "contain" }} />}
      <div style={{ background: m.qrBg, padding: "2.5mm", borderRadius: "3mm", border: modelo === "minimal" ? `0.4mm solid ${m.fg}` : undefined, lineHeight: 0 }}>
        <QRCodeSVG value={link} size={512} style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }} level="M" />
      </div>
      <div style={{ textAlign: "center", fontFamily: "Sora, Manrope, sans-serif" }}>
        {tamanho !== "adesivo" && <div style={{ fontSize: tamanho === "grande" ? "6mm" : "4.2mm", fontWeight: 800 }}>{frase}</div>}
        <div style={{ marginTop: "1.5mm", fontSize: tamanho === "adesivo" ? "3.2mm" : "3.4mm", fontWeight: 700, color: m.accent }}>Mesa {mesa}{tamanho === "adesivo" ? " · Aponte a câmera" : ""}</div>
        {mostrarNome && tamanho !== "adesivo" && <div style={{ marginTop: "1mm", fontSize: "2.8mm", opacity: 0.75 }}>{restaurante}</div>}
      </div>
    </div>
  );
  return (
    <div className="totem" style={{ width: `${t.w}mm`, height: `${t.h}mm`, background: m.bg, color: m.fg, borderRadius: tamanho === "adesivo" ? "4mm" : "2mm", overflow: "hidden", border: m.bg === "#ffffff" ? "0.3mm dashed #cbd5e1" : undefined, boxSizing: "border-box", display: "flex", flexDirection: "column" }}>
      {tamanho === "tenda" ? (<>{lado(true)}<div style={{ borderTop: `0.3mm dashed ${m.fg}`, opacity: 0.4 }} />{lado()}</>) : lado()}
    </div>
  );
}

export function TotemStudio({ tables, link, restaurante }: { tables: Table[]; link: (t: Table) => string; restaurante: string }) {
  const ativas = useMemo(() => tables.filter((t) => t.active), [tables]);
  const [modelo, setModelo] = useState<ModeloKey>("classico");
  const [tamanho, setTamanho] = useState<TamanhoKey>("display");
  const [frase, setFrase] = useState("Pague. Sem esperar.");
  const [mostrarNome, setMostrarNome] = useState(true);
  const [selecionadas, setSelecionadas] = useState<string[] | null>(null);
  const escolhidas = ativas.filter((t) => !selecionadas || selecionadas.includes(t.id));
  const printRef = useRef<HTMLDivElement>(null);

  function imprimir() {
    if (!escolhidas.length) return toast.error("Selecione ao menos uma mesa");
    const w = window.open("", "_blank");
    if (!w) return toast.error("Permita pop-ups para imprimir");
    w.document.write(`<!doctype html><html><head><title>Totens — ${restaurante}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap"><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Sora,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.grid{display:flex;flex-wrap:wrap;gap:4mm}.totem{break-inside:avoid;page-break-inside:avoid}</style></head><body><div class="grid">${printRef.current?.innerHTML ?? ""}</div><script>window.onload=()=>setTimeout(()=>window.print(),400)</script></body></html>`);
    w.document.close();
  }

  const opt = (ativo: boolean) => `rounded-xl border p-3 text-left transition ${ativo ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/50 p-4 print:hidden">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-bold">Impressão de totens</h3>
          <p className="text-sm text-muted-foreground">Escolha modelo e tamanho. A impressão sai em folha A4, pronta para recortar.</p>
        </div>
        <Button onClick={imprimir}><Printer className="mr-1 h-4 w-4" />Imprimir {escolhidas.length} totem(ns)</Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <section>
            <p className="mb-2 text-sm font-semibold">Modelo</p>
            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              {(Object.keys(MODELOS) as ModeloKey[]).map((k) => (
                <button key={k} type="button" onClick={() => setModelo(k)} className={opt(modelo === k)}>
                  <span className="mb-2 flex gap-1">{[MODELOS[k].bg, MODELOS[k].accent, MODELOS[k].fg].map((c) => <span key={c} className="h-4 w-4 rounded-full border border-border" style={{ background: c }} />)}</span>
                  <span className="block text-sm font-bold">{MODELOS[k].nome}</span>
                  <span className="block text-xs text-muted-foreground">{MODELOS[k].desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <p className="mb-2 text-sm font-semibold">Tamanho</p>
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
          <section className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold">Frase do totem
              <input value={frase} maxLength={32} onChange={(e) => setFrase(e.target.value)} className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm font-normal" />
            </label>
            <label className="flex items-center gap-2 self-end text-sm"><input type="checkbox" checked={mostrarNome} onChange={(e) => setMostrarNome(e.target.checked)} /> Mostrar nome do restaurante</label>
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
          <div className="rounded-xl bg-muted p-4" style={{ zoom: tamanho === "grande" ? 0.6 : tamanho === "tenda" ? 0.7 : 0.85 }}>
            {escolhidas[0] ? <Totem modelo={modelo} tamanho={tamanho} mesa={escolhidas[0].number} link={link(escolhidas[0])} restaurante={restaurante} frase={frase} mostrarNome={mostrarNome} /> : <p className="p-8 text-sm text-muted-foreground">Nenhuma mesa</p>}
          </div>
        </div>
      </div>
      <div ref={printRef} className="hidden">
        {escolhidas.map((t) => <Totem key={t.id} modelo={modelo} tamanho={tamanho} mesa={t.number} link={link(t)} restaurante={restaurante} frase={frase} mostrarNome={mostrarNome} />)}
      </div>
    </div>
  );
}
