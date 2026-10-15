/**
 * Composições de demonstração do painel do restaurante e da área do garçom,
 * montadas com os componentes do design system (StatusBadge, cartões) e dados
 * fictícios. Mostram apenas recursos que existem no produto.
 */
import {
  HandCoins,
  LayoutGrid,
  Landmark,
  QrCode,
  ReceiptText,
  Wallet,
  History,
  Users,
  Home,
  BarChart3,
} from "lucide-react";
import { StatusBadge, type Tone } from "@/components/tipe/ds";
import { cn } from "@/lib/utils";
import { money } from "./ProductScreens";

type Mesa = {
  n: string;
  estado: "livre" | "ocupada" | "aguardando" | "encerrada";
  total?: number;
  pago?: number;
};
const MESAS: Mesa[] = [
  { n: "01", estado: "ocupada", total: 212.4, pago: 98 },
  { n: "02", estado: "livre" },
  { n: "03", estado: "aguardando", total: 86.9, pago: 0 },
  { n: "04", estado: "ocupada", total: 154, pago: 154 },
  { n: "05", estado: "ocupada", total: 63.5, pago: 21 },
  { n: "06", estado: "livre" },
  { n: "07", estado: "encerrada", total: 120, pago: 120 },
  { n: "08", estado: "ocupada", total: 301.2, pago: 150.6 },
];
const ESTADO: Record<Mesa["estado"], { label: string; tone: Tone }> = {
  livre: { label: "Livre", tone: "neutral" },
  ocupada: { label: "Ocupada", tone: "brand" },
  aguardando: { label: "Aguardando", tone: "warning" },
  encerrada: { label: "Encerrada", tone: "success" },
};
const TRANSACOES = [
  {
    mesa: "08",
    nome: "Bruno S.",
    forma: "Pix",
    valor: 150.6,
    tone: "success" as Tone,
    status: "Aprovado",
  },
  {
    mesa: "03",
    nome: "Carla M.",
    forma: "Maquininha",
    valor: 86.9,
    tone: "warning" as Tone,
    status: "Confirmar",
  },
  {
    mesa: "01",
    nome: "Diego R.",
    forma: "Pix",
    valor: 98,
    tone: "success" as Tone,
    status: "Aprovado",
  },
  {
    mesa: "05",
    nome: "Elisa P.",
    forma: "Dinheiro",
    valor: 21,
    tone: "success" as Tone,
    status: "Confirmado",
  },
];

export function DashboardPreview({ className }: { className?: string }) {
  const nav = [
    [Home, "Início"],
    [LayoutGrid, "Salão"],
    [Wallet, "Caixa"],
    [History, "Histórico"],
    [BarChart3, "Relatórios"],
    [Users, "Equipe"],
    [QrCode, "Mesas e QR"],
    [Landmark, "Recebimentos"],
  ] as const;
  return (
    <div
      className={cn(
        "overflow-hidden rounded-[1.4rem] border border-white/10 bg-background text-foreground shadow-device",
        className,
      )}
      role="img"
      aria-label="Demonstração do painel do restaurante com dados fictícios"
    >
      <div className="flex items-center gap-1.5 border-b border-border bg-surface px-4 py-2.5">
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="h-2.5 w-2.5 rounded-full bg-border" />
        <span className="ml-3 truncate rounded-full bg-background-muted px-3 py-1 text-[10px] text-muted-foreground">
          tipe.digital/marealta
        </span>
      </div>
      <div className="grid grid-cols-[150px_1fr] max-md:grid-cols-1">
        <aside className="border-r border-border bg-surface p-2.5 max-md:hidden">
          <p className="px-2 pb-2 pt-1 font-display text-[12px] font-semibold">Maré Alta</p>
          {nav.map(([Icon, l], i) => (
            <span
              key={l}
              className={cn(
                "flex items-center gap-2 rounded-lg px-2 py-1.5 text-[11px]",
                i === 1 ? "bg-ink font-semibold text-white" : "text-muted-foreground",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {l}
            </span>
          ))}
        </aside>
        <div className="min-w-0 p-4 sm:p-5">
          <div className="flex items-end justify-between gap-3">
            <div>
              <p className="text-[10px] text-muted-foreground">Hoje, salão principal</p>
              <p className="font-display text-[15px] font-semibold tracking-heading">Salão</p>
            </div>
            <StatusBadge tone="brand" live>
              Ao vivo
            </StatusBadge>
          </div>
          <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ["Recebido hoje", money(2840.5)],
              ["Mesas abertas", "5 de 8"],
              ["Em aberto", money(487.8)],
              ["A confirmar", "1"],
            ].map(([l, v]) => (
              <div key={l} className="rounded-xl border border-border bg-surface p-2.5">
                <p className="text-[9px] text-muted-foreground">{l}</p>
                <p className="money mt-1 font-display text-[13px] font-semibold">{v}</p>
              </div>
            ))}
          </div>
          <div className="mt-3 grid gap-3 lg:grid-cols-[1.25fr_1fr]">
            <div className="grid grid-cols-4 gap-1.5">
              {MESAS.map((m) => {
                const pct = m.total ? Math.round(((m.pago ?? 0) / m.total) * 100) : 0;
                return (
                  <div
                    key={m.n}
                    className={cn(
                      "flex aspect-[1/0.92] flex-col rounded-xl border p-2",
                      m.estado === "livre"
                        ? "border-dashed border-border bg-transparent"
                        : "border-border bg-surface",
                    )}
                  >
                    <span className="font-display text-[11px] font-semibold">Mesa {m.n}</span>
                    <span
                      className={cn(
                        "mt-0.5 text-[8.5px] font-semibold",
                        m.estado === "aguardando"
                          ? "text-[oklch(0.45_0.11_60)]"
                          : m.estado === "livre"
                            ? "text-muted-foreground"
                            : "text-brand-strong",
                      )}
                    >
                      {ESTADO[m.estado].label}
                    </span>
                    {m.total ? (
                      <span className="mt-auto">
                        <span className="money block text-[9.5px] font-semibold">
                          {money(m.total)}
                        </span>
                        <span className="mt-1 block h-1 overflow-hidden rounded-full bg-background-muted">
                          <span
                            className="block h-full rounded-full bg-brand"
                            style={{ width: `${pct}%` }}
                          />
                        </span>
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
            <div className="rounded-xl border border-border bg-surface">
              <p className="border-b border-border px-3 py-2 text-[10.5px] font-semibold">
                Pagamentos recentes
              </p>
              <ul className="divide-y divide-border">
                {TRANSACOES.map((t) => (
                  <li key={t.nome} className="flex items-center justify-between gap-2 px-3 py-2">
                    <span className="min-w-0">
                      <span className="block truncate text-[10px] font-semibold">
                        Mesa {t.mesa} · {t.nome}
                      </span>
                      <span className="block text-[9px] text-muted-foreground">{t.forma}</span>
                    </span>
                    <span className="text-right">
                      <span className="money block text-[10px] font-semibold">
                        {money(t.valor)}
                      </span>
                      <StatusBadge tone={t.tone} className="mt-0.5 px-1.5 py-0.5 text-[8.5px]">
                        {t.status}
                      </StatusBadge>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function WaiterPreview({ className }: { className?: string }) {
  const gorjetas = [
    ["Mesa 08", "20:12", 10],
    ["Mesa 03", "19:47", 7],
    ["Mesa 11", "19:05", 14],
  ] as const;
  const barras = [35, 52, 18, 64, 40, 72, 58];
  return (
    <div
      className={cn("flex h-full flex-col bg-background px-4 pb-5 pt-9", className)}
      role="img"
      aria-label="Demonstração da área do garçom com dados fictícios"
    >
      <p className="text-[10px] text-muted-foreground">Maré Alta · garçom</p>
      <p className="font-display text-[17px] font-semibold tracking-heading">Olá, Rafael!</p>
      <div className="mt-3 rounded-2xl bg-ink p-4 text-white">
        <p className="text-[10px] text-white/60">Disponível para saque</p>
        <p className="money font-display text-[24px] font-semibold tracking-heading">
          {money(186.2)}
        </p>
        <p className="mt-1 text-[9.5px] text-white/60">Repasse por Pix no dia 16</p>
      </div>
      <div className="mt-2.5 grid grid-cols-2 gap-1.5">
        {[
          [HandCoins, "Gorjetas hoje", money(31)],
          [ReceiptText, "Mesas hoje", "9"],
        ].map(([Icon, l, v]) => {
          const I = Icon as typeof HandCoins;
          return (
            <div key={l as string} className="rounded-xl border border-border bg-surface p-2.5">
              <I className="h-3.5 w-3.5 text-brand-strong" />
              <p className="mt-1.5 text-[9px] text-muted-foreground">{l as string}</p>
              <p className="money font-display text-[13px] font-semibold">{v as string}</p>
            </div>
          );
        })}
      </div>
      <div className="mt-2.5 rounded-xl border border-border bg-surface p-3">
        <p className="text-[10px] font-semibold">Gorjetas extras · 7 dias</p>
        <div className="mt-2 flex h-14 items-end gap-1.5">
          {barras.map((b, i) => (
            <span
              key={i}
              className={cn(
                "flex-1 rounded-t-[4px]",
                i === barras.length - 1 ? "bg-brand" : "bg-brand/35",
              )}
              style={{ height: `${b}%` }}
            />
          ))}
        </div>
      </div>
      <ul className="mt-2.5 divide-y divide-border rounded-xl border border-border bg-surface">
        {gorjetas.map(([m, h, v]) => (
          <li key={m} className="flex justify-between px-3 py-2 text-[10px]">
            <span>
              {m} · {h}
            </span>
            <span className="money font-semibold text-brand-strong">{money(v)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
