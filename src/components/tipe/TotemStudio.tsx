import { useMemo, useRef, useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { GravarEtiquetaNfc } from "@/components/tipe/GravarEtiquetaNfc";
import { Printer } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import logo from "@/assets/marca/tipe-logo-branco.svg";
import logoDark from "@/assets/marca/tipe-logo.svg";

type Table = {
  id: string;
  number: string;
  code: string;
  access_token: string;
  active: boolean;
  waiter_id: string | null;
};

// Paletas fixas do material impresso (independem do tema da tela).
const MODELOS = {
  classico: {
    nome: "Clássico",
    desc: "Corpo azul-noite, adesivo branco com QR",
    bg: "#0b1f3a",
    fg: "#ffffff",
    accent: "#2dd4bf",
    stickerBg: "#ffffff",
    stickerFg: "#0b1f3a",
    logo: "light",
  },
  claro: {
    nome: "Claro",
    desc: "Corpo branco, ideal para mesas escuras",
    bg: "#ffffff",
    fg: "#0b1f3a",
    accent: "#14b8a6",
    stickerBg: "#0b1f3a",
    stickerFg: "#ffffff",
    logo: "dark",
  },
} as const;

// Sugestões de uso: cada tamanho indica onde o material funciona melhor.
const TAMANHOS = {
  adesivo: {
    nome: "Adesivo na mesa",
    medida: "8 × 8 cm",
    w: 80,
    h: 80,
    desc: "Cola direto no tampo da mesa",
  },
  quadrado: {
    nome: "Quadrado",
    medida: "10 × 10 cm",
    w: 100,
    h: 100,
    desc: "Placa ou adesivo quadrado",
  },
  faixa: {
    nome: "Faixa",
    medida: "10 × 5 cm",
    w: 100,
    h: 50,
    desc: "Horizontal, para bordas e balcões",
  },
  comanda: {
    nome: "Comanda individual",
    medida: "6 × 9 cm",
    w: 60,
    h: 90,
    desc: "Vai junto da comanda de cada cliente",
  },
  guardanapo: {
    nome: "Porta guardanapo",
    medida: "5 × 15 cm",
    w: 50,
    h: 150,
    desc: "Encaixa no porta guardanapo inox",
  },
  acrilico: {
    nome: "Suporte acrílico",
    medida: "10 × 15 cm",
    w: 100,
    h: 150,
    desc: "Display de mesa em acrílico (A6)",
  },
} as const;

type ModeloKey = keyof typeof MODELOS;
type TamanhoKey = keyof typeof TAMANHOS;

// Instrução curta, pensada para caber nos tamanhos pequenos.
const INSTRUCAO = "Aponte a câmera do celular para ver sua conta";

export function Totem({
  modelo,
  tamanho,
  mesa,
  link,
  restaurante,
  logoUrl,
  nfc = false,
}: {
  modelo: ModeloKey;
  tamanho: TamanhoKey;
  mesa: string;
  link: string;
  restaurante: string;
  logoUrl?: string | null | undefined;
  nfc?: boolean;
}) {
  const m = MODELOS[modelo],
    t = TAMANHOS[tamanho],
    horizontal = t.w > t.h;
  const qrMm = horizontal ? 32 : Math.min(t.w * 0.58, t.h * 0.38);
  const compact = t.h <= 90;
  return (
    <div
      className="totem"
      style={{
        width: `${t.w}mm`,
        height: `${t.h}mm`,
        boxSizing: "border-box",
        background: m.bg,
        color: m.fg,
        border: "0.25mm solid #9ca3af",
        borderRadius: "3mm",
        padding: horizontal ? "4mm" : "4mm",
        display: "flex",
        flexDirection: horizontal ? "row" : "column",
        alignItems: "center",
        justifyContent: "space-between",
        gap: "2mm",
        fontFamily: '"Inter Tight",sans-serif',
      }}
    >
      {horizontal && (
        <div style={{ background: "white", padding: "2mm", lineHeight: 0, borderRadius: "2mm" }}>
          <QRCodeSVG
            value={link}
            size={512}
            bgColor="#fff"
            fgColor="#021E34"
            marginSize={4}
            style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }}
          />
        </div>
      )}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "space-between",
          gap: "1.5mm",
          minWidth: 0,
          flex: 1,
          width: "100%",
          height: "100%",
          textAlign: "center",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "2mm",
            maxWidth: "100%",
          }}
        >
          {logoUrl && (
            <img
              src={logoUrl}
              alt={`Logomarca de ${restaurante}`}
              style={{
                width: compact ? "7mm" : "11mm",
                height: compact ? "7mm" : "11mm",
                objectFit: "contain",
                background: "white",
                borderRadius: "1mm",
              }}
            />
          )}
          <span
            style={{
              fontSize: horizontal ? "2.8mm" : compact ? "3mm" : "3.5mm",
              fontWeight: 600,
              overflowWrap: "anywhere",
            }}
          >
            {restaurante}
          </span>
        </div>
        <div
          style={{
            fontSize: horizontal ? "7mm" : compact ? "7mm" : "10mm",
            fontWeight: 800,
            lineHeight: 1.05,
          }}
        >
          Mesa {mesa}
        </div>
        {!horizontal && (
          <div style={{ background: "white", padding: "1mm", lineHeight: 0, borderRadius: "2mm" }}>
            <QRCodeSVG
              value={link}
              size={512}
              bgColor="#fff"
              fgColor="#021E34"
              marginSize={4}
              style={{ width: `${qrMm}mm`, height: `${qrMm}mm` }}
            />
          </div>
        )}
        <div style={{ fontSize: compact ? "2.6mm" : "3mm", lineHeight: 1.2 }}>
          Aponte a câmera para ver sua mesa
        </div>
        {nfc && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "1mm",
              fontSize: compact ? "2.5mm" : "2.8mm",
              fontWeight: 600,
              lineHeight: 1.2,
            }}
          >
            <svg
              width="16"
              height="20"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <rect x="7" y="2" width="10" height="20" rx="2" />
              <path d="M2 7a9 9 0 0 0 0 10M22 7a9 9 0 0 1 0 10" />
            </svg>
            Aproxime o celular aqui · NFC
          </div>
        )}
        <img
          src={m.logo === "light" ? logo : logoDark}
          alt="TIPE"
          style={{ width: horizontal ? "13mm" : "16mm", height: "4mm", objectFit: "contain" }}
        />
      </div>
    </div>
  );
}

// Escapa texto antes de inserir em HTML montado manualmente (nome do restaurante).
function escapeHtml(v: string) {
  return v.replace(
    /[&<>"']/g,
    (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c]!,
  );
}

export function TotemStudio({
  tables,
  link,
  restaurante,
  logoUrl,
}: {
  tables: Table[];
  link: (t: Table) => string;
  restaurante: string;
  logoUrl?: string | null | undefined;
}) {
  const ativas = useMemo(() => tables.filter((t) => t.active), [tables]);
  const [modelo, setModelo] = useState<ModeloKey>("classico");
  const [tamanho, setTamanho] = useState<TamanhoKey>("acrilico");
  const [selecionadas, setSelecionadas] = useState<string[] | null>(null);
  const escolhidas = ativas.filter((t) => !selecionadas || selecionadas.includes(t.id));
  const [nfc, setNfc] = useState(false);
  const printRef = useRef<HTMLDivElement>(null);

  function imprimir() {
    if (!escolhidas.length) {
      toast.error("Selecione ao menos uma mesa");
      return;
    }
    const w = window.open("", "_blank");
    if (!w) {
      toast.error("Permita pop-ups para imprimir");
      return;
    }
    w.document.write(
      `<!doctype html><html><head><title>Totens - ${escapeHtml(restaurante)}</title><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Sora:wght@700;800&display=swap"><style>@page{size:A4;margin:8mm}body{margin:0;font-family:Sora,sans-serif;-webkit-print-color-adjust:exact;print-color-adjust:exact}.grid{display:flex;flex-wrap:wrap;gap:4mm}.totem{break-inside:avoid;page-break-inside:avoid}</style></head><body><div class="grid">${printRef.current?.innerHTML ?? ""}</div><script>window.onload=async()=>{await Promise.all(Array.from(document.images).map(i=>i.decode().catch(()=>{})));await document.fonts.ready;window.print()}</script></body></html>`,
    );
    w.document.close();
  }

  const opt = (ativo: boolean) =>
    `rounded-xl border p-3 text-left transition ${ativo ? "border-primary bg-primary/10" : "border-border bg-card hover:border-primary/50"}`;

  return (
    <div className="mt-8 rounded-2xl border border-border bg-card/50 p-4 print:hidden">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
        <div>
          <h3 className="font-display text-xl font-bold">Impressão de totens</h3>
          <p className="text-sm text-muted-foreground">
            Escolha o modelo e onde vai usar. A impressão sai em folha A4, pronta para recortar.
          </p>
        </div>
        <Button onClick={imprimir}>
          <Printer className="mr-1 h-4 w-4" />
          Imprimir {escolhidas.length} totem(ns)
        </Button>
      </div>
      <div className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className="space-y-5">
          <label className="flex items-start gap-2 text-sm">
            <input type="checkbox" checked={nfc} onChange={(e) => setNfc(e.target.checked)} />
            Incluir indicação NFC (somente se a etiqueta estiver instalada e gravada).
          </label>
          <section>
            <p className="mb-2 text-sm font-semibold">Modelo</p>
            <div className="grid grid-cols-2 gap-2">
              {(Object.keys(MODELOS) as ModeloKey[]).map((k) => (
                <button
                  key={k}
                  type="button"
                  onClick={() => setModelo(k)}
                  className={opt(modelo === k)}
                >
                  <span className="mb-2 flex gap-1">
                    {[MODELOS[k].bg, MODELOS[k].stickerBg, MODELOS[k].accent].map((c) => (
                      <span
                        key={c}
                        className="h-4 w-4 rounded-full border border-border"
                        style={{ background: c }}
                      />
                    ))}
                  </span>
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
                <button
                  key={k}
                  type="button"
                  onClick={() => setTamanho(k)}
                  className={opt(tamanho === k)}
                >
                  <span className="block text-sm font-bold">{TAMANHOS[k].nome}</span>
                  <span className="block text-xs font-semibold text-primary">
                    {TAMANHOS[k].medida}
                  </span>
                  <span className="block text-xs text-muted-foreground">{TAMANHOS[k].desc}</span>
                </button>
              ))}
            </div>
          </section>
          <section>
            <div className="mb-2 flex items-center justify-between">
              <p className="text-sm font-semibold">Mesas</p>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setSelecionadas(selecionadas ? null : [])}
              >
                {selecionadas ? "Selecionar todas" : "Escolher mesas"}
              </Button>
            </div>
            {selecionadas ? (
              <div className="flex flex-wrap gap-1.5">
                {ativas.map((t) => {
                  const on = selecionadas.includes(t.id);
                  return (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() =>
                        setSelecionadas(
                          on ? selecionadas.filter((x) => x !== t.id) : [...selecionadas, t.id],
                        )
                      }
                      className={`h-9 min-w-12 rounded-md border px-2 text-sm font-semibold ${on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background"}`}
                    >
                      {t.number}
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Todas as {ativas.length} mesas ativas.
              </p>
            )}
          </section>
        </div>
        <div className="flex min-w-0 flex-col items-center gap-2 overflow-x-auto">
          <p className="text-xs text-muted-foreground">
            Prévia {escolhidas[0] ? `· Mesa ${escolhidas[0].number}` : ""}
          </p>
          <div
            className="rounded-xl bg-muted p-4"
            style={{
              zoom:
                tamanho === "acrilico"
                  ? 0.85
                  : tamanho === "guardanapo"
                    ? 0.7
                    : tamanho === "faixa"
                      ? 0.9
                      : 1,
            }}
          >
            {escolhidas[0] ? (
              <Totem
                modelo={modelo}
                tamanho={tamanho}
                mesa={escolhidas[0].number}
                link={link(escolhidas[0])}
                restaurante={restaurante}
                logoUrl={logoUrl}
                nfc={nfc}
              />
            ) : (
              <p className="p-8 text-sm text-muted-foreground">Nenhuma mesa</p>
            )}
          </div>
        </div>
      </div>
      <GravarEtiquetaNfc
        restaurante={restaurante}
        mesas={ativas.map((t) => ({ id: t.id, number: t.number, url: link(t) }))}
      />
      <div ref={printRef} className="hidden">
        {escolhidas.map((t) => (
          <Totem
            key={t.id}
            modelo={modelo}
            tamanho={tamanho}
            mesa={t.number}
            link={link(t)}
            restaurante={restaurante}
            logoUrl={logoUrl}
            nfc={nfc}
          />
        ))}
      </div>
    </div>
  );
}
