/**
 * Peças compartilhadas dos sistemas internos (Central Tipe e Tipe Gestão):
 * indicadores, painéis, tabelas compactas, painel lateral, lista de atenção,
 * filtros e esqueletos. Sempre com dado real: sem dado, mostre `vazio`.
 */
import { type ComponentType, type ReactNode, useId, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight, ChevronLeft, ChevronRight, Minus, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import { EmptyState, StatusBadge, type Tone } from "@/components/tipe/ds";
import { cn } from "@/lib/utils";

export { EmptyState, StatusBadge };
export type { Tone };

export const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const brlCurto = (n: number) =>
  Math.abs(n) >= 1000
    ? `R$ ${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 1 })} mil`
    : brl(n);
export const dataBR = (s: string) => new Date(s).toLocaleDateString("pt-BR");
export const horaBR = (s: string) =>
  new Date(s).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
export function relativo(iso: string, agora = Date.now()) {
  const diff = Math.round((agora - new Date(iso).getTime()) / 60000);
  if (diff < 1) return "agora";
  if (diff < 60) return `há ${diff} min`;
  const h = Math.round(diff / 60);
  if (h < 24) return `há ${h} h`;
  const d = Math.round(h / 24);
  if (d < 30) return `há ${d} d`;
  return dataBR(iso);
}
export const iniciais = (nome: string) =>
  nome
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");

/** Indicador: número grande, variação opcional e um clique para abrir o detalhe. */
export function Kpi({
  label,
  value,
  hint,
  delta,
  deltaBom,
  icon: Icon,
  tone,
  onClick,
  vazio,
  className,
}: {
  label: ReactNode;
  value?: ReactNode;
  hint?: ReactNode;
  /** Variação em % contra o período anterior. */
  delta?: number | undefined;
  /** Se subir é bom (receita) ou ruim (atrasos). Padrão: subir é bom. */
  deltaBom?: boolean | undefined;
  icon?: ComponentType<{ className?: string }> | undefined;
  tone?: "brand" | "warning" | "error" | undefined;
  onClick?: (() => void) | undefined;
  vazio?: ReactNode;
  className?: string | undefined;
}) {
  const Tag = onClick ? "button" : "div";
  return (
    <Tag
      type={onClick ? "button" : undefined}
      onClick={onClick}
      className={cn(
        "surface-card @container flex min-h-[108px] flex-col p-4 text-left sm:p-5",
        onClick && "transition-[border-color,box-shadow] hover:border-foreground/20 hover:shadow-soft",
        tone === "warning" && "border-highlight/50",
        tone === "error" && "border-destructive/40",
        className,
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <p className="truncate text-[13px] text-muted-foreground">{label}</p>
        {Icon && (
          <Icon
            className={cn(
              "h-4 w-4 shrink-0",
              tone === "warning" ? "text-highlight" : tone === "error" ? "text-destructive" : tone === "brand" ? "text-brand-strong" : "text-muted-foreground/70",
            )}
          />
        )}
      </div>
      {value !== undefined && value !== null ? (
        <div className="mt-auto flex flex-wrap items-baseline gap-x-2 pt-3">
          <p className="money text-[1.4rem] font-medium leading-none tracking-[-0.035em] @[11rem]:text-[1.7rem] @[14rem]:text-[2rem]">
            {value}
          </p>
          {delta !== undefined && Number.isFinite(delta) && <Delta value={delta} bom={deltaBom ?? true} />}
        </div>
      ) : (
        <p className="mt-auto pt-3 text-sm text-muted-foreground">{vazio ?? "Sem dados ainda"}</p>
      )}
      {hint && <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p>}
      {onClick && <ArrowRight className="sr-only" />}
    </Tag>
  );
}

export function Delta({ value, bom }: { value: number; bom: boolean }) {
  const zero = Math.abs(value) < 0.05;
  const positivo = value > 0;
  const favoravel = zero ? null : positivo === bom;
  const Icon = zero ? Minus : positivo ? ArrowUpRight : ArrowDownRight;
  return (
    <span
      className={cn(
        "inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[11px] font-medium leading-none",
        favoravel === null
          ? "bg-muted text-muted-foreground"
          : favoravel
            ? "bg-success/12 text-[oklch(0.42_0.12_150)]"
            : "bg-destructive/10 text-destructive",
      )}
      title="Em relação ao período anterior"
    >
      <Icon className="h-3 w-3" />
      {zero ? "0%" : `${positivo ? "+" : ""}${value.toLocaleString("pt-BR", { maximumFractionDigits: 0 })}%`}
    </span>
  );
}

/** Painel branco com título, apoio e ações; a unidade de composição das páginas. */
export function Painel({
  titulo,
  descricao,
  acoes,
  children,
  className,
  semPadding = false,
}: {
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  children: ReactNode;
  className?: string | undefined;
  /** Para tabelas e listas que já têm o próprio respiro. */
  semPadding?: boolean;
}) {
  return (
    <section className={cn("surface-card overflow-hidden", className)}>
      {(titulo || acoes) && (
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-border px-4 py-3 sm:px-5">
          <div className="min-w-0">
            {titulo && <h2 className="text-[0.95rem] font-medium tracking-[-0.01em]">{titulo}</h2>}
            {descricao && <p className="mt-0.5 text-xs text-muted-foreground">{descricao}</p>}
          </div>
          {acoes && <div className="flex shrink-0 flex-wrap items-center gap-2">{acoes}</div>}
        </div>
      )}
      <div className={semPadding ? "" : "p-4 sm:p-5"}>{children}</div>
    </section>
  );
}

export type Coluna<T> = {
  k: string;
  l: ReactNode;
  /** Célula; recebe a linha. */
  c: (row: T) => ReactNode;
  /** Alinhar à direita (números). */
  num?: boolean | undefined;
  /** Só no computador. */
  md?: boolean | undefined;
  w?: string | undefined;
};

/** Tabela compacta e legível. Clique na linha abre o detalhe; sem linhas, mostra `vazio`. */
export function Tabela<T>({
  colunas,
  linhas,
  chave,
  onLinha,
  vazio,
  rodape,
  densa = false,
  className,
}: {
  colunas: Coluna<T>[];
  linhas: T[];
  chave: (row: T) => string;
  onLinha?: ((row: T) => void) | undefined;
  vazio?: ReactNode;
  rodape?: ReactNode;
  densa?: boolean;
  className?: string | undefined;
}) {
  if (linhas.length === 0) return <div className="p-4">{vazio ?? <EmptyState title="Nada por aqui" />}</div>;
  return (
    <div className={cn("overflow-x-auto", className)}>
      <table className="w-full text-sm">
        <thead className="text-left text-[11.5px] font-medium uppercase tracking-[0.06em] text-muted-foreground">
          <tr className="border-b border-border">
            {colunas.map((c) => (
              <th
                key={c.k}
                scope="col"
                style={c.w ? { width: c.w } : undefined}
                className={cn("px-4 py-2.5 font-medium sm:px-5", c.num && "text-right", c.md && "hidden md:table-cell")}
              >
                {c.l}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((row) => (
            <tr
              key={chave(row)}
              onClick={onLinha ? () => onLinha(row) : undefined}
              tabIndex={onLinha ? 0 : undefined}
              onKeyDown={onLinha ? (e) => e.key === "Enter" && onLinha(row) : undefined}
              className={cn(
                "border-b border-border last:border-0",
                onLinha && "cursor-pointer transition-colors hover:bg-background-muted/70 focus-visible:bg-background-muted/70 focus-visible:outline-none",
              )}
            >
              {colunas.map((c) => (
                <td
                  key={c.k}
                  className={cn(
                    "px-4 align-middle sm:px-5",
                    densa ? "py-2" : "py-3",
                    c.num && "money text-right",
                    c.md && "hidden md:table-cell",
                  )}
                >
                  {c.c(row)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {rodape && <div className="border-t border-border px-4 py-2.5 text-xs text-muted-foreground sm:px-5">{rodape}</div>}
    </div>
  );
}

/** Paginação simples no cliente para listas médias. */
export function usePaginacao<T>(itens: T[], porPagina = 25) {
  const [pagina, setPagina] = useState(1);
  const total = Math.max(1, Math.ceil(itens.length / porPagina));
  const p = Math.min(pagina, total);
  const fatia = itens.slice((p - 1) * porPagina, p * porPagina);
  const controles =
    total > 1 ? (
      <div className="flex items-center justify-between gap-3">
        <span>
          {(p - 1) * porPagina + 1}–{Math.min(p * porPagina, itens.length)} de {itens.length}
        </span>
        <span className="inline-flex items-center gap-1">
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={p <= 1} onClick={() => setPagina(p - 1)} aria-label="Página anterior">
            <ChevronLeft />
          </Button>
          <span className="tabular-nums">
            {p}/{total}
          </span>
          <Button size="icon" variant="ghost" className="h-7 w-7" disabled={p >= total} onClick={() => setPagina(p + 1)} aria-label="Próxima página">
            <ChevronRight />
          </Button>
        </span>
      </div>
    ) : null;
  return { fatia, controles, reset: () => setPagina(1) };
}

/** Painel lateral de detalhes (registro, ficha, formulário). */
export function PainelLateral({
  aberto,
  onFechar,
  titulo,
  descricao,
  children,
  rodape,
  largo = false,
}: {
  aberto: boolean;
  onFechar: () => void;
  titulo: ReactNode;
  descricao?: ReactNode;
  children: ReactNode;
  rodape?: ReactNode;
  largo?: boolean;
}) {
  return (
    <Sheet open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <SheetContent
        side="right"
        className={cn("flex w-full flex-col gap-0 p-0 sm:max-w-lg [&>button]:hidden", largo && "sm:max-w-2xl")}
      >
        <div className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
          <div className="min-w-0">
            <SheetTitle className="font-display text-lg font-medium tracking-[-0.02em]">{titulo}</SheetTitle>
            {descricao ? (
              <SheetDescription className="mt-0.5 text-xs">{descricao}</SheetDescription>
            ) : (
              <SheetDescription className="sr-only">Detalhes</SheetDescription>
            )}
          </div>
          <button
            type="button"
            onClick={onFechar}
            className="rounded-full p-2 text-muted-foreground hover:bg-background-muted hover:text-foreground"
            aria-label="Fechar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {rodape && <div className="border-t border-border px-5 py-3">{rodape}</div>}
      </SheetContent>
    </Sheet>
  );
}

export type Prioridade = "alta" | "media" | "baixa";
export type ItemAtencao = {
  id: string;
  titulo: string;
  descricao?: string | undefined;
  origem: string;
  /** Restaurante ou contato ligado ao item. */
  quem?: string | undefined;
  prioridade: Prioridade;
  em: string;
  responsavel?: string | undefined;
  acao?: { l: string; onClick: () => void } | undefined;
  onAbrir?: (() => void) | undefined;
};

const PRIO: Record<Prioridade, { l: string; tone: Tone }> = {
  alta: { l: "Alta", tone: "error" },
  media: { l: "Média", tone: "warning" },
  baixa: { l: "Baixa", tone: "neutral" },
};

/** "Precisa da sua atenção": prioridades reais, cada uma com origem, quem, data e ação rápida. */
export function ListaAtencao({ itens, vazio }: { itens: ItemAtencao[]; vazio?: ReactNode }) {
  if (itens.length === 0)
    return (
      vazio ?? (
        <EmptyState title="Nada pendente" text="Quando algo precisar de você, aparece aqui com origem, prioridade e ação." />
      )
    );
  return (
    <ul className="divide-y divide-border">
      {itens.map((it) => (
        <li key={it.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3 sm:px-5">
          <button
            type="button"
            onClick={it.onAbrir}
            className="min-w-0 flex-1 text-left disabled:cursor-default"
            disabled={!it.onAbrir}
          >
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={PRIO[it.prioridade].tone}>{PRIO[it.prioridade].l}</StatusBadge>
              <span className="truncate text-sm font-medium">{it.titulo}</span>
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {it.origem}
              {it.quem ? ` · ${it.quem}` : ""}
              {it.responsavel ? ` · ${it.responsavel}` : ""}
              {it.descricao ? ` · ${it.descricao}` : ""}
            </p>
          </button>
          <span className="shrink-0 text-xs text-muted-foreground" title={horaBR(it.em)}>
            {relativo(it.em)}
          </span>
          {it.acao && (
            <Button size="sm" variant="outline" className="h-8 shrink-0" onClick={it.acao.onClick}>
              {it.acao.l}
            </Button>
          )}
        </li>
      ))}
    </ul>
  );
}

/** Seletor segmentado (períodos, visões). */
export function Segmentado<T extends string | number>({
  value,
  onChange,
  options,
  label,
  className,
}: {
  value: T;
  onChange: (v: T) => void;
  options: readonly (readonly [T, string])[];
  label: string;
  className?: string | undefined;
}) {
  return (
    <div role="radiogroup" aria-label={label} className={cn("inline-flex rounded-full border border-border bg-card p-0.5 shadow-xs", className)}>
      {options.map(([v, l]) => (
        <button
          key={String(v)}
          type="button"
          role="radio"
          aria-checked={value === v}
          onClick={() => onChange(v)}
          className={cn(
            "h-8 rounded-full px-3 text-[13px] font-medium transition-colors",
            value === v ? "bg-ink text-white" : "text-muted-foreground hover:text-foreground",
          )}
        >
          {l}
        </button>
      ))}
    </div>
  );
}

export function Busca({
  value,
  onChange,
  placeholder = "Buscar",
  className,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  className?: string | undefined;
}) {
  const id = useId();
  return (
    <div className={cn("relative", className)}>
      <label htmlFor={id} className="sr-only">
        {placeholder}
      </label>
      <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="h-9 w-full rounded-full border border-border bg-card pl-9 pr-3 text-sm shadow-xs outline-none transition-colors placeholder:text-muted-foreground hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-focus-ring/30"
      />
    </div>
  );
}

/** Campo com rótulo visível (nunca só placeholder). */
export function Campo({
  label,
  children,
  ajuda,
  erro,
  className,
}: {
  label: ReactNode;
  children: ReactNode;
  ajuda?: ReactNode;
  erro?: ReactNode;
  className?: string | undefined;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-[13px] font-medium">{label}</span>
      {children}
      {erro ? (
        <span className="mt-1 block text-xs text-destructive">{erro}</span>
      ) : ajuda ? (
        <span className="mt-1 block text-xs text-muted-foreground">{ajuda}</span>
      ) : null}
    </label>
  );
}

export const inputCls =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-focus-ring/30 disabled:opacity-60";

/** Esqueleto de carregamento para páginas inteiras. */
export function Esqueleto({ linhas = 3 }: { linhas?: number }) {
  return (
    <div aria-busy="true" aria-label="Carregando" className="space-y-4">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="h-[108px] tipe-brilho rounded-2xl bg-card motion-reduce:animate-none" />
        ))}
      </div>
      {Array.from({ length: linhas }, (_, i) => (
        <div key={i} className="h-40 tipe-brilho rounded-2xl bg-card motion-reduce:animate-none" />
      ))}
    </div>
  );
}

/** Faixa que marca dado de demonstração ou recurso que depende de configuração. */
export function Aviso({
  tone = "neutral",
  children,
  acao,
}: {
  tone?: "neutral" | "warning" | "demo";
  children: ReactNode;
  acao?: ReactNode;
}) {
  return (
    <div
      role={tone === "warning" ? "alert" : undefined}
      className={cn(
        "flex flex-wrap items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-sm",
        tone === "warning" && "border-highlight/50 bg-highlight/10",
        tone === "demo" && "border-dashed border-brand/50 bg-brand-soft/60",
        tone === "neutral" && "border-border bg-card",
      )}
    >
      <span className="min-w-0">
        {tone === "demo" && <strong className="mr-1.5 font-semibold">Demonstração.</strong>}
        {children}
      </span>
      {acao}
    </div>
  );
}

export function Avatar({ nome, className }: { nome: string; className?: string | undefined }) {
  return (
    <span
      className={cn(
        "grid h-8 w-8 shrink-0 place-items-center rounded-full bg-ink text-[11px] font-semibold text-white",
        className,
      )}
      aria-hidden
    >
      {iniciais(nome)}
    </span>
  );
}
