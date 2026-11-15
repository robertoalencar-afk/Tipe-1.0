import { HareOutline } from "../HareOutline";
/**
 * Moldura dos sistemas internos da Tipe (Central Tipe e Tipe Gestão).
 *
 * Um só esqueleto para os dois ambientes: barra lateral azul-marinho recolhível
 * com grupos de navegação, cabeçalho claro com título, busca global (Ctrl+K) e
 * ações, e gaveta no celular. Os ambientes mudam só o conteúdo dos grupos.
 * Tokens: docs/design-system.md. Nada de cor nova aqui.
 */
import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ComponentType,
  type ReactNode,
} from "react";
import {
  ChevronDown,
  ChevronsLeft,
  ChevronsRight,
  LogOut,
  Menu,
  Search,
  X,
  MoreHorizontal,
  MessageSquare,
  PanelLeftClose,
} from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { openLebre, useMascotPreference } from "@/lib/tipe/mascot-preference";
import { cn } from "@/lib/utils";

export type Icone = ComponentType<{ className?: string | undefined }>;

export type ItemNav = {
  /** Chave única; é o que `ativo` compara e o que `onNavegar` recebe. */
  k: string;
  l: string;
  i: Icone;
  /** Número à direita (pendências). Zero ou undefined não aparece. */
  badge?: number | undefined;
  /** Tom do badge: atenção (laranja) ou neutro. */
  badgeTone?: "warning" | "neutral" | undefined;
  /** Palavras extras para a busca global encontrar este item. */
  busca?: string | undefined;
};
/** Quem está logado: nome em destaque, função e (opcional) logomarca do restaurante. */
export type Usuario = {
  nome: string;
  funcao: string;
  detalhe?: string | undefined;
  logoUrl?: string | null | undefined;
};

function iniciaisDe(nome: string) {
  return (
    nome
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((p) => p[0]!.toUpperCase())
      .join("") || "?"
  );
}

function Avatar({ u, className }: { u: Usuario; className?: string }) {
  return (
    <span
      className={cn(
        "grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-brand text-xs font-semibold text-ink",
        className,
      )}
      aria-hidden
    >
      {iniciaisDe(u.nome)}
    </span>
  );
}

function MenuUsuario({
  u,
  onSair,
  claro = false,
  compacto = false,
}: {
  u: Usuario;
  onSair?: (() => void) | undefined;
  claro?: boolean;
  compacto?: boolean;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex w-full items-center gap-2.5 rounded-xl p-1.5 text-left transition-colors",
            claro ? "hover:bg-muted" : "hover:bg-white/[0.07]",
          )}
          aria-label={`Conta de ${u.nome}`}
        >
          <Avatar u={u} />
          <span className={cn("min-w-0 flex-1 leading-tight", compacto && "hidden")}>
            <span
              className={cn(
                "block truncate text-sm font-semibold",
                claro ? "text-foreground" : "text-white",
              )}
            >
              {u.nome}
            </span>
            <span
              className={cn(
                "block truncate text-[11px] font-medium uppercase tracking-wide",
                claro ? "text-brand-strong" : "text-brand",
              )}
            >
              {u.funcao}
            </span>
          </span>
          <ChevronDown
            className={cn(
              "size-4 shrink-0",
              compacto && "hidden",
              claro ? "text-muted-foreground" : "text-white/50",
            )}
          />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel className="font-normal">
          <span className="block text-sm font-semibold">{u.nome}</span>
          <span className="block text-xs text-muted-foreground">
            {u.funcao}
            {u.detalhe ? ` · ${u.detalhe}` : ""}
          </span>
        </DropdownMenuLabel>
        {onSair && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={onSair} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 size-4" /> Sair
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export type GrupoNav = { l: string; itens: ItemNav[] };

export type AcaoBusca = {
  k: string;
  l: string;
  grupo: string;
  i?: Icone | undefined;
  /** Texto de apoio (restaurante, e-mail…). */
  d?: string | undefined;
  onSelect: () => void;
};

const COLAPSO_KEY = "tipe-painel-recolhido";

function lerColapso() {
  try {
    return window.localStorage.getItem(COLAPSO_KEY) === "1";
  } catch {
    return false;
  }
}

export function Shell({
  ambiente,
  mascotScope,
  contexto,
  grupos,
  ativo,
  onNavegar,
  titulo,
  descricao,
  acoes,
  rodape,
  usuario,
  onSair,
  busca,
  children,
}: {
  /** Nome do ambiente: "Central Tipe" ou "Tipe Gestão". */
  ambiente: string;
  mascotScope?: string;
  /** Linha de apoio sob o nome (restaurante, e-mail do fundador…). */
  contexto?: ReactNode;
  grupos: GrupoNav[];
  ativo: string;
  onNavegar: (k: string) => void;
  titulo?: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  /** Área fixa no fim da barra lateral (sair, perfil). */
  rodape?: ReactNode;
  /** Pessoa logada: aparece no cabeçalho, na barra lateral e na gaveta, com botão Sair. */
  usuario?: Usuario | undefined;
  onSair?: (() => void) | undefined;
  /** Itens extras da busca global além da navegação (registros, atalhos). */
  busca?: AcaoBusca[] | undefined;
  children: ReactNode;
}) {
  const gestao = ambiente === "Tipe Gestão";
  const [mascotVisible, setMascotVisible] = useMascotPreference(mascotScope);
  const [recolhida, setRecolhida] = useState(false);
  const [gaveta, setGaveta] = useState(false);
  const [buscaAberta, setBuscaAberta] = useState(false);

  useEffect(() => setRecolhida(lerColapso()), []);
  const alternar = useCallback(() => {
    setRecolhida((v) => {
      try {
        window.localStorage.setItem(COLAPSO_KEY, v ? "0" : "1");
      } catch {
        // sem armazenamento: só nesta aba
      }
      return !v;
    });
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setBuscaAberta((v) => !v);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const ir = useCallback(
    (k: string) => {
      onNavegar(k);
      setGaveta(false);
      setBuscaAberta(false);
      if (typeof window !== "undefined") window.scrollTo({ top: 0 });
    },
    [onNavegar],
  );

  const itensBusca = useMemo<AcaoBusca[]>(
    () => [
      ...grupos.flatMap((g) =>
        g.itens.map<AcaoBusca>((it) => ({
          k: `nav:${it.k}`,
          l: it.l,
          grupo: g.l,
          i: it.i,
          d: it.busca,
          onSelect: () => ir(it.k),
        })),
      ),
      ...(busca ?? []),
    ],
    [grupos, busca, ir],
  );

  const mascotButton = (compact = false) =>
    mascotScope && (
      <button
        type="button"
        aria-pressed={mascotVisible}
        aria-label={mascotVisible ? "Ocultar mascote da Lebre" : "Exibir mascote da Lebre"}
        title={mascotVisible ? "Pode descansar, Lebre" : "Mostrar a Lebre"}
        onClick={() => setMascotVisible(!mascotVisible)}
        className="group mx-auto my-1 flex min-h-11 max-w-full items-center justify-center gap-2 rounded-full border border-primary/20 bg-primary/10 px-3 text-xs font-medium text-brand-strong hover:bg-primary/20"
      >
        <span className="size-5 transition-transform motion-safe:group-hover:-rotate-12">
          <HareOutline />
        </span>
        {!compact && (mascotVisible ? "Pode descansar, Lebre" : "Mostrar a Lebre")}
      </button>
    );

  const nav = (compacta: boolean) => (
    <nav
      aria-label={`Seções de ${ambiente}`}
      className="flex-1 space-y-4 overflow-y-auto px-2 py-3"
    >
      {grupos.map((g) => (
        <div key={g.l}>
          {!compacta && (
            <p
              className={cn(
                "px-3 pb-1 text-xs font-medium",
                gestao ? "text-muted-foreground" : "uppercase tracking-[0.08em] text-white/45",
              )}
            >
              {g.l}
            </p>
          )}
          {compacta && (
            <div
              className={cn("mx-3 mb-2 h-px first:hidden", gestao ? "bg-border" : "bg-white/10")}
              aria-hidden
            />
          )}
          <ul className="space-y-0.5">
            {g.itens.map(({ k, l, i: Icon, badge, badgeTone }) => {
              const on = ativo === k;
              return (
                <li key={k}>
                  <button
                    type="button"
                    onClick={() => ir(k)}
                    aria-current={on ? "page" : undefined}
                    title={compacta ? l : undefined}
                    className={cn(
                      "group relative flex min-h-10 w-full items-center gap-2.5 rounded-lg px-3 py-2 text-left text-[0.9rem] transition-colors duration-150",
                      on
                        ? gestao
                          ? "bg-foreground/[0.07] font-medium text-foreground"
                          : "bg-white/[0.12] font-medium text-white"
                        : gestao
                          ? "text-foreground/80 hover:bg-foreground/[0.05] hover:text-foreground"
                          : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                      compacta && "justify-center px-0",
                    )}
                  >
                    {on && !gestao && (
                      <span
                        className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-brand"
                        aria-hidden
                      />
                    )}
                    <Icon className="h-[18px] w-[18px] shrink-0" />
                    {!compacta && <span className="truncate">{l}</span>}
                    {badge ? (
                      <span
                        className={cn(
                          "ml-auto rounded-full px-1.5 py-0.5 text-[10.5px] font-semibold leading-none",
                          badgeTone === "warning"
                            ? "bg-highlight text-ink"
                            : gestao
                              ? "bg-foreground/10 text-foreground"
                              : "bg-white/15 text-white",
                          compacta && "absolute right-1.5 top-1 ml-0",
                        )}
                      >
                        {badge > 99 ? "99+" : badge}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );

  return (
    <div
      className={cn(
        "min-h-dvh overflow-x-clip text-foreground",
        gestao ? "bg-background" : "bg-background-muted",
      )}
    >
      <div
        className={cn(
          "lg:grid lg:min-h-dvh lg:transition-[grid-template-columns] lg:duration-200 print:block",
          recolhida ? "lg:grid-cols-[72px_minmax(0,1fr)]" : "lg:grid-cols-[248px_minmax(0,1fr)]",
        )}
      >
        {/* Barra lateral (computador) */}
        <aside
          className={cn(
            "hidden print:hidden lg:sticky lg:top-0 lg:flex lg:h-dvh lg:flex-col",
            gestao
              ? "border-r border-border bg-background-muted text-foreground"
              : "bg-ink text-white",
          )}
        >
          <div
            className={cn(
              "flex h-16 items-center px-4",
              recolhida ? "justify-center" : "justify-between",
            )}
          >
            {recolhida ? (
              <TipeLogo variant={gestao ? "dark" : "light"} className="h-6" />
            ) : (
              <div className="min-w-0">
                <TipeLogo variant={gestao ? "dark" : "light"} className="h-7" />
                <p
                  className={cn(
                    "mt-1 truncate text-[11px]",
                    gestao ? "text-muted-foreground" : "text-white/55",
                  )}
                >
                  {ambiente}
                </p>
              </div>
            )}
          </div>
          {!recolhida && contexto && (
            <div
              className={cn(
                "border-b px-4 py-3 text-xs",
                gestao ? "border-border text-muted-foreground" : "border-white/10 text-white/70",
              )}
            >
              {contexto}
            </div>
          )}
          {gestao && (
            <div className="space-y-1 px-2 py-3">
              <button
                type="button"
                onClick={openLebre}
                title="Conversar com a Lebre"
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm font-medium hover:bg-foreground/5"
              >
                <MessageSquare className="size-[18px] shrink-0" />
                {!recolhida && "Conversar com a Lebre"}
              </button>
              <button
                type="button"
                onClick={() => setBuscaAberta(true)}
                title="Buscar na gestão"
                className="flex min-h-11 w-full items-center gap-2.5 rounded-lg px-3 text-sm text-muted-foreground hover:bg-foreground/5"
              >
                <Search className="size-[18px] shrink-0" />
                {!recolhida && (
                  <>
                    <span className="flex-1 text-left">Buscar na gestão</span>
                    <kbd className="text-[10px]">⌘ K</kbd>
                  </>
                )}
              </button>
            </div>
          )}
          {nav(recolhida)}
          {mascotScope && <div id={`tipe-lebre-dock-${mascotScope}`} className="@container" />}
          <div className={cn("border-t p-2", gestao ? "border-border" : "border-white/10")}>
            {usuario && !recolhida && <MenuUsuario u={usuario} onSair={onSair} claro={gestao} />}
            {mascotButton(recolhida)}
            {usuario && recolhida && onSair && (
              <button
                type="button"
                onClick={onSair}
                className={cn(
                  "mb-1 flex w-full items-center justify-center rounded-xl p-2",
                  gestao
                    ? "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                    : "text-white/70 hover:bg-white/[0.07] hover:text-white",
                )}
                aria-label="Sair"
                title="Sair"
              >
                <LogOut className="h-4 w-4" />
              </button>
            )}
            {!recolhida && rodape}
            <button
              type="button"
              onClick={alternar}
              className={cn(
                "mt-1 flex min-h-10 w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-xs",
                gestao
                  ? "text-muted-foreground hover:bg-foreground/5 hover:text-foreground"
                  : "text-white/55 hover:bg-white/[0.07] hover:text-white",
              )}
              aria-label={recolhida ? "Expandir menu" : "Recolher menu"}
            >
              {recolhida ? (
                <ChevronsRight className="h-4 w-4" />
              ) : (
                <ChevronsLeft className="h-4 w-4" />
              )}
              {!recolhida && "Recolher"}
            </button>
          </div>
        </aside>

        <div className="min-w-0">
          {/* Cabeçalho */}
          <header className="sticky top-0 z-30 border-b border-border bg-background print:hidden">
            <div className="flex h-14 items-center gap-2 px-3 sm:px-6 lg:h-16">
              <Button
                size="icon"
                variant="ghost"
                className="lg:hidden"
                onClick={() => setGaveta(true)}
                aria-label="Abrir menu"
              >
                <Menu className="h-5 w-5" />
              </Button>
              <TipeLogo variant="dark" className="h-6 lg:hidden" />
              <div className="min-w-0 flex-1" />
              <button
                type="button"
                onClick={() => setBuscaAberta(true)}
                className={cn(
                  "hidden h-9 w-72 items-center gap-2 rounded-full border border-border bg-card px-3 text-sm text-muted-foreground transition-colors hover:border-foreground/25",
                  gestao ? "md:hidden" : "md:flex",
                )}
              >
                <Search className="h-4 w-4" />
                <span className="flex-1 text-left">Buscar</span>
                <kbd className="rounded-md border border-border px-1.5 text-[10.5px] font-medium">
                  Ctrl K
                </kbd>
              </button>
              <Button
                size="icon"
                variant="ghost"
                className="md:hidden"
                onClick={() => setBuscaAberta(true)}
                aria-label="Buscar"
              >
                <Search className="h-5 w-5" />
              </Button>
              {mascotScope && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" aria-label="Opções da gestão">
                      <MoreHorizontal className="size-5" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-64">
                    <DropdownMenuLabel>Personalizar a gestão</DropdownMenuLabel>

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onSelect={openLebre}>
                      <MessageSquare className="mr-2 size-4" />
                      Conversar com a Lebre
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={() => setBuscaAberta(true)}>
                      <Search className="mr-2 size-4" />
                      Buscar na gestão
                    </DropdownMenuItem>
                    <DropdownMenuItem onSelect={alternar} className="hidden lg:flex">
                      <PanelLeftClose className="mr-2 size-4" />
                      {recolhida ? "Expandir menu" : "Recolher menu"}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
              {acoes && <div className="flex items-center gap-1.5">{acoes}</div>}
              {usuario && (
                <div className="ml-1 hidden w-56 border-l border-border pl-3 sm:block">
                  <MenuUsuario u={usuario} onSair={onSair} claro />
                </div>
              )}
              {usuario && (
                <div className="sm:hidden">
                  <MenuUsuario
                    u={{ ...usuario, nome: usuario.nome }}
                    onSair={onSair}
                    claro
                    compacto
                  />
                </div>
              )}
            </div>
          </header>

          <main className="mx-auto w-full min-w-0 max-w-[1440px] px-3 pb-24 pt-5 sm:px-6 lg:px-8 lg:pb-16 lg:pt-7">
            {(titulo || descricao) && (
              <div className="mb-5 flex flex-wrap items-end justify-between gap-3 lg:mb-7">
                <div className="min-w-0">
                  {titulo && (
                    <h1 className="font-display text-[clamp(1.5rem,1.2rem+1vw,2.1rem)] font-medium leading-[1.08] tracking-[-0.03em]">
                      {titulo}
                    </h1>
                  )}
                  {descricao && (
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{descricao}</p>
                  )}
                </div>
              </div>
            )}
            {children}
          </main>
        </div>
      </div>

      {/* Gaveta (celular) */}
      <Sheet open={gaveta} onOpenChange={setGaveta}>
        <SheetContent
          side="left"
          className={cn(
            "w-[280px] border-0 p-0 [&>button]:hidden",
            gestao ? "bg-background-muted text-foreground" : "bg-ink text-white",
          )}
        >
          <SheetTitle className="sr-only">Menu de {ambiente}</SheetTitle>
          <div
            className={cn(
              "flex h-16 items-center justify-between border-b px-4",
              gestao ? "border-border" : "border-white/10",
            )}
          >
            <div>
              <TipeLogo variant={gestao ? "dark" : "light"} className="h-7" />
              <p className="mt-1 text-[11px] text-white/55">{ambiente}</p>
            </div>
            <button
              type="button"
              onClick={() => setGaveta(false)}
              className={cn(
                "rounded-full p-2",
                gestao
                  ? "text-muted-foreground hover:bg-foreground/5"
                  : "text-white/70 hover:bg-white/10",
              )}
              aria-label="Fechar menu"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
          {contexto && (
            <div
              className={cn(
                "border-b px-4 py-3 text-xs",
                gestao ? "border-border text-muted-foreground" : "border-white/10 text-white/70",
              )}
            >
              {contexto}
            </div>
          )}
          <div className="flex h-[calc(100%-4rem)] flex-col">
            {gestao && (
              <button
                type="button"
                onClick={() => {
                  setGaveta(false);
                  openLebre();
                }}
                className="mx-2 mt-2 flex min-h-11 items-center gap-2 rounded-lg px-3 text-sm font-medium hover:bg-foreground/5"
              >
                <MessageSquare className="size-4" />
                Conversar com a Lebre
              </button>
            )}
            {nav(false)}
            {(rodape || usuario) && (
              <div className={cn("border-t p-2", gestao ? "border-border" : "border-white/10")}>
                {usuario && <MenuUsuario u={usuario} onSair={onSair} claro={gestao} />}
                {mascotButton()}
                {rodape}
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>

      {/* Busca global */}
      <CommandDialog open={buscaAberta} onOpenChange={setBuscaAberta}>
        <CommandInput placeholder="Para onde você quer ir?" />
        <CommandList>
          <CommandEmpty>Nada encontrado.</CommandEmpty>
          {Object.entries(
            itensBusca.reduce<Record<string, AcaoBusca[]>>((acc, it) => {
              (acc[it.grupo] ??= []).push(it);
              return acc;
            }, {}),
          ).map(([grupo, itens]) => (
            <CommandGroup key={grupo} heading={grupo}>
              {itens.map((it) => {
                const Icon = it.i;
                return (
                  <CommandItem
                    key={it.k}
                    value={`${it.l} ${it.d ?? ""} ${grupo}`}
                    onSelect={it.onSelect}
                  >
                    {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
                    <span className="truncate">{it.l}</span>
                    {it.d && (
                      <span className="ml-auto truncate text-xs text-muted-foreground">{it.d}</span>
                    )}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </div>
  );
}
