import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import {
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronsLeft,
  ChevronsRight,
  ChevronsUpDown,
  CircleDollarSign,
  Contact as ContactIcon,
  Filter,
  Gauge,
  Inbox,
  KanbanSquare,
  Layers,
  LifeBuoy,
  ListTodo,
  LogOut,
  Menu,
  MessageCircle,
  Plus,
  RotateCcw,
  Search,
  Settings,
  ShieldCheck,
  Trophy,
  UserRound,
  Users,
  Wallet,
  Workflow,
} from "lucide-react";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { TipeSymbol } from "@/components/tipe/Logo";
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Action } from "@/lib/tipe/crm/permissions";
import { resetDemo } from "@/lib/tipe/crm/store";
import { useCrm, useOrgData } from "./context";
import { QuickCreate } from "./forms";
import { Avatar, relative } from "./ui";

type NavItem = {
  to: string;
  label: string;
  icon: typeof Gauge;
  perm?: Action | undefined;
  platform?: boolean | undefined;
  exact?: boolean | undefined;
  badge?: (d: ReturnType<typeof useBadges>) => number;
};
const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Visão", items: [{ to: "/crm", label: "Dashboard", icon: Gauge, exact: true }] },
  {
    group: "Comercial",
    items: [
      { to: "/crm/contatos", label: "Contatos", icon: ContactIcon },
      { to: "/crm/empresas", label: "Empresas", icon: Building2 },
      { to: "/crm/leads", label: "Leads", icon: Filter, badge: (b) => b.newLeads },
      { to: "/crm/oportunidades", label: "Oportunidades", icon: KanbanSquare },
      { to: "/crm/funis", label: "Funis", icon: Workflow },
    ],
  },
  {
    group: "Rotina",
    items: [
      { to: "/crm/tarefas", label: "Tarefas", icon: ListTodo, badge: (b) => b.overdue },
      { to: "/crm/calendario", label: "Calendário", icon: CalendarDays },
    ],
  },
  {
    group: "Relacionamento",
    items: [
      { to: "/crm/atendimento", label: "Atendimento", icon: Inbox, badge: (b) => b.unread },
      { to: "/crm/whatsapp", label: "WhatsApp", icon: MessageCircle },
      { to: "/crm/suporte", label: "Suporte", icon: LifeBuoy },
    ],
  },
  {
    group: "Pessoas",
    items: [
      { to: "/crm/equipe", label: "Equipe", icon: Users },
      { to: "/crm/organizacoes", label: "Organizações", icon: Layers },
      { to: "/crm/gamificacao", label: "Gamificação", icon: Trophy },
    ],
  },
  {
    group: "Gestão",
    items: [
      {
        to: "/crm/relatorios",
        label: "Relatórios",
        icon: ChartNoAxesCombined,
        perm: "reports.view",
      },
      { to: "/crm/planos", label: "Planos", icon: CircleDollarSign },
      { to: "/crm/financeiro", label: "Financeiro", icon: Wallet, perm: "finance.view" },
      { to: "/crm/configuracoes", label: "Configurações", icon: Settings },
      { to: "/crm/perfil", label: "Perfil", icon: UserRound },
    ],
  },
  {
    group: "Plataforma",
    items: [{ to: "/crm/admin", label: "Administração", icon: ShieldCheck, platform: true }],
  },
];

function useBadges() {
  const { me } = useCrm();
  const d = useOrgData();
  const now = new Date().toISOString();
  return {
    unread: d.conversations.reduce((a, c) => a + (c.status !== "encerrada" ? c.unread : 0), 0),
    overdue: d.tasks.filter(
      (t) => t.assigneeId === me.id && t.status !== "concluida" && t.dueAt < now,
    ).length,
    newLeads: d.leads.filter((l) => l.status === "novo").length,
  };
}

function NavLinks({ collapsed, onNavigate }: { collapsed: boolean; onNavigate?: () => void }) {
  const { me, can } = useCrm();
  const badges = useBadges();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav aria-label="Menu do back office" className="flex flex-col gap-4">
      {NAV.map((g) => {
        const items = g.items.filter(
          (i) => (!i.perm || can(i.perm)) && (!i.platform || me.platformAdmin),
        );
        if (!items.length) return null;
        return (
          <div key={g.group}>
            {!collapsed && (
              <p className="mb-1 px-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-sidebar-foreground/45">
                {g.group}
              </p>
            )}
            <ul className="space-y-0.5">
              {items.map((item) => {
                const active = item.exact
                  ? path === item.to || path === `${item.to}/`
                  : path.startsWith(item.to);
                const count = item.badge?.(badges) ?? 0;
                const link = (
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "group relative flex h-8 items-center gap-2.5 rounded-lg px-2.5 text-[0.8rem] font-medium text-sidebar-foreground/70 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      active && "bg-sidebar-accent text-sidebar-accent-foreground",
                      collapsed && "justify-center px-0",
                    )}
                  >
                    {active && (
                      <span
                        aria-hidden
                        className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary"
                      />
                    )}
                    <item.icon
                      className={cn(
                        "h-4 w-4 shrink-0",
                        active
                          ? "text-primary"
                          : "text-sidebar-foreground/55 group-hover:text-sidebar-foreground",
                      )}
                      aria-hidden
                    />
                    {!collapsed && <span className="truncate">{item.label}</span>}
                    {count > 0 &&
                      (collapsed ? (
                        <span
                          aria-label={`${count} pendentes`}
                          className="absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-full bg-primary"
                        />
                      ) : (
                        <span className="ml-auto rounded-md bg-primary/15 px-1.5 text-[0.65rem] font-semibold text-primary">
                          {count}
                        </span>
                      ))}
                  </Link>
                );
                return (
                  <li key={item.to}>
                    {collapsed ? (
                      <Tooltip>
                        <TooltipTrigger asChild>{link}</TooltipTrigger>
                        <TooltipContent
                          side="right"
                          className="bg-popover text-popover-foreground ring-1 ring-border"
                        >
                          {item.label}
                          {count > 0 ? ` · ${count}` : ""}
                        </TooltipContent>
                      </Tooltip>
                    ) : (
                      link
                    )}
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </nav>
  );
}

function OrgSwitcher() {
  const { org, orgs, run, role } = useCrm();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 min-w-0 max-w-[15rem] items-center gap-2 rounded-lg border border-border bg-background/40 px-2.5 text-left hover:bg-muted"
        aria-label="Trocar de organização"
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-primary/15 font-display text-[0.65rem] font-bold text-primary">
          {org.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-xs font-semibold leading-tight">{org.name}</span>
          <span className="block truncate text-[0.65rem] leading-tight text-muted-foreground">
            {ROLE_LABEL[role]}
          </span>
        </span>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Suas organizações
        </DropdownMenuLabel>
        {orgs.map((o) => (
          <DropdownMenuItem
            key={o.org.id}
            onSelect={() => {
              if (o.org.id !== org.id) {
                const r = run({ type: "switchOrg", orgId: o.org.id });
                if (r.ok) navigate({ to: "/crm" });
              }
            }}
            className="gap-2"
          >
            <span className="grid h-6 w-6 place-items-center rounded-md bg-muted text-[0.6rem] font-bold">
              {o.org.name.slice(0, 2).toUpperCase()}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-xs font-medium">{o.org.name}</span>
              <span className="block text-[0.65rem] text-muted-foreground">
                {ROLE_LABEL[o.role]}
              </span>
            </span>
            {o.org.id === org.id && <Check className="h-3.5 w-3.5 text-primary" />}
          </DropdownMenuItem>
        ))}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/crm/organizacoes", search: { nova: 1 } })}
          className="gap-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          Criar organização
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const d = useOrgData();
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setOpen((o) => !o);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);
  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    navigate({ to, search } as never);
  };
  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex h-9 w-full min-w-0 items-center gap-2 rounded-lg border border-border bg-background/40 px-3 text-left text-xs text-muted-foreground hover:bg-muted md:max-w-sm"
        aria-label="Busca global"
      >
        <Search className="h-4 w-4 shrink-0" />
        <span className="truncate">Buscar contatos, empresas, negócios…</span>
        <kbd className="ml-auto hidden rounded border border-border px-1.5 font-sans text-[0.65rem] sm:inline">
          Ctrl K
        </kbd>
      </button>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um nome, empresa, e-mail ou telefone" />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>Nada encontrado nesta organização.</CommandEmpty>
          <CommandGroup heading="Contatos">
            {d.contacts.slice(0, 200).map((c) => (
              <CommandItem
                key={c.id}
                value={`contato ${c.name} ${c.email} ${c.phone}`}
                onSelect={() => go(`/crm/contatos/${c.id}`)}
              >
                <ContactIcon />
                {c.name}
                <span className="ml-auto truncate text-xs text-muted-foreground">{c.email}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Empresas">
            {d.companies.map((c) => (
              <CommandItem
                key={c.id}
                value={`empresa ${c.name} ${c.neighborhood}`}
                onSelect={() => go("/crm/empresas", { empresa: c.id })}
              >
                <Building2 />
                {c.name}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Oportunidades">
            {d.deals.map((x) => (
              <CommandItem
                key={x.id}
                value={`oportunidade ${x.title}`}
                onSelect={() => go("/crm/oportunidades", { deal: x.id })}
              >
                <KanbanSquare />
                {x.title}
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Leads">
            {d.leads.map((l) => (
              <CommandItem
                key={l.id}
                value={`lead ${l.name} ${l.companyName} ${l.email}`}
                onSelect={() => go("/crm/leads", { lead: l.id })}
              >
                <Filter />
                {l.name}
                <span className="ml-auto text-xs text-muted-foreground">{l.companyName}</span>
              </CommandItem>
            ))}
          </CommandGroup>
          <CommandGroup heading="Tarefas">
            {d.tasks
              .filter((t) => t.status !== "concluida")
              .map((t) => (
                <CommandItem
                  key={t.id}
                  value={`tarefa ${t.title}`}
                  onSelect={() => go("/crm/tarefas", { tarefa: t.id })}
                >
                  <ListTodo />
                  {t.title}
                </CommandItem>
              ))}
          </CommandGroup>
        </CommandList>
      </CommandDialog>
    </>
  );
}

function Notifications() {
  const { s, me, org, run } = useCrm();
  const navigate = useNavigate();
  const list = s.notifications.filter((n) => n.userId === me.id && n.orgId === org.id).slice(0, 20);
  const unread = list.filter((n) => !n.read).length;
  return (
    <Popover>
      <PopoverTrigger
        className="relative grid h-9 w-9 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground"
        aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b border-border px-3 py-2.5">
          <p className="text-xs font-semibold">Notificações</p>
          {unread > 0 && (
            <button
              type="button"
              className="text-xs text-primary hover:underline"
              onClick={() => run({ type: "markNotificationsRead" })}
            >
              Marcar todas como lidas
            </button>
          )}
        </div>
        <ul className="max-h-80 overflow-y-auto">
          {list.length === 0 && (
            <li className="px-3 py-8 text-center text-xs text-muted-foreground">
              Tudo em dia por aqui.
            </li>
          )}
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => navigate({ to: n.href } as never)}
                className="flex w-full gap-2 px-3 py-2.5 text-left hover:bg-muted"
              >
                <span
                  className={cn(
                    "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
                    n.read ? "bg-transparent" : "bg-primary",
                  )}
                />
                <span className="min-w-0">
                  <span className="block text-xs">{n.text}</span>
                  <span className="block text-[0.65rem] text-muted-foreground">
                    {relative(n.at)}
                  </span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      </PopoverContent>
    </Popover>
  );
}

function ActivityIndicator() {
  const { s, org } = useCrm();
  const last = s.activities.find((a) => a.orgId === org.id);
  const [pulse, setPulse] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setPulse(true);
    const t = setTimeout(() => setPulse(false), 1400);
    return () => clearTimeout(t);
  }, [s]);
  const [, force] = useState(0);
  useEffect(() => {
    const t = setInterval(() => force((n) => n + 1), 30000);
    return () => clearInterval(t);
  }, []);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className="hidden h-9 items-center gap-2 rounded-lg px-2 text-[0.7rem] text-muted-foreground lg:flex"
          role="status"
          aria-live="polite"
        >
          <span className="relative flex h-2 w-2">
            <span
              className={cn(
                "absolute inline-flex h-full w-full rounded-full bg-success opacity-60",
                pulse && "motion-safe:animate-ping",
              )}
            />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
          </span>
          {pulse ? "Salvo" : last ? `Atividade ${relative(last.at)}` : "Sincronizado"}
        </span>
      </TooltipTrigger>
      <TooltipContent className="max-w-64 bg-popover text-popover-foreground ring-1 ring-border">
        {last ? last.summary : "Sem atividade ainda"}
      </TooltipContent>
    </Tooltip>
  );
}

function QuickActions() {
  const { openCreate, can } = useCrm();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:bg-primary/90"
        aria-label="Ações rápidas"
      >
        <Plus className="h-4 w-4" />
        <span className="hidden sm:inline">Criar</span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Ações rápidas
        </DropdownMenuLabel>
        <DropdownMenuItem
          disabled={!can("contacts.write")}
          onSelect={() => openCreate("contact")}
          className="gap-2 text-xs"
        >
          <ContactIcon className="h-3.5 w-3.5" />
          Novo contato
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!can("contacts.write")}
          onSelect={() => openCreate("company")}
          className="gap-2 text-xs"
        >
          <Building2 className="h-3.5 w-3.5" />
          Nova empresa
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!can("leads.write")}
          onSelect={() => openCreate("lead")}
          className="gap-2 text-xs"
        >
          <Filter className="h-3.5 w-3.5" />
          Novo lead
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!can("deals.create")}
          onSelect={() => openCreate("deal")}
          className="gap-2 text-xs"
        >
          <KanbanSquare className="h-3.5 w-3.5" />
          Nova oportunidade
        </DropdownMenuItem>
        <DropdownMenuItem
          disabled={!can("tasks.write")}
          onSelect={() => openCreate("task")}
          className="gap-2 text-xs"
        >
          <ListTodo className="h-3.5 w-3.5" />
          Nova tarefa
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

function UserMenu() {
  const { me, run } = useCrm();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full" aria-label="Perfil e conta">
        <Avatar name={me.name} className="h-8 w-8 text-xs" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuLabel>
          <span className="block text-xs font-semibold">{me.name}</span>
          <span className="block text-[0.7rem] font-normal text-muted-foreground">{me.email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/crm/perfil" })}
          className="gap-2 text-xs"
        >
          <UserRound className="h-3.5 w-3.5" />
          Meu perfil
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => navigate({ to: "/crm/configuracoes" })}
          className="gap-2 text-xs"
        >
          <Settings className="h-3.5 w-3.5" />
          Configurações
        </DropdownMenuItem>
        <DropdownMenuItem
          onSelect={() => {
            resetDemo();
            navigate({ to: "/crm/entrar" });
          }}
          className="gap-2 text-xs"
        >
          <RotateCcw className="h-3.5 w-3.5" />
          Restaurar dados de demonstração
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          onSelect={() => {
            run({ type: "logout" });
            navigate({ to: "/crm/entrar" });
          }}
          className="gap-2 text-xs"
        >
          <LogOut className="h-3.5 w-3.5" />
          Sair
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

const COLLAPSE_KEY = "tipe-crm-menu-recolhido";

export function Shell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    try {
      setCollapsed(localStorage.getItem(COLLAPSE_KEY) === "1");
    } catch {
      /* preferência opcional */
    }
  }, []);
  const toggle = () =>
    setCollapsed((c) => {
      try {
        localStorage.setItem(COLLAPSE_KEY, c ? "0" : "1");
      } catch {
        /* preferência opcional */
      }
      return !c;
    });
  const { org } = useCrm();
  const path = useRouterState({ select: (r) => r.location.pathname });
  useEffect(() => setMobileOpen(false), [path]);
  const brand = useMemo(
    () => (
      <Link
        to="/crm"
        className="flex h-9 items-center gap-2 rounded-lg px-1"
        aria-label="Tipe, início do back office"
      >
        <TipeSymbol className="h-7 w-7 shrink-0" />
        {!collapsed && (
          <span className="min-w-0">
            <span className="block font-display text-sm font-bold leading-none tracking-tight text-sidebar-foreground">
              Tipe
            </span>
            <span className="block text-[0.62rem] leading-tight text-sidebar-foreground/50">
              Back office · CRM
            </span>
          </span>
        )}
      </Link>
    ),
    [collapsed],
  );

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-primary-foreground"
      >
        Pular para o conteúdo
      </a>
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-30 hidden flex-col border-r border-sidebar-border bg-sidebar transition-[width] duration-200 ease-out md:flex",
          collapsed ? "w-[60px]" : "w-[232px]",
        )}
      >
        <div
          className={cn(
            "flex h-14 items-center border-b border-sidebar-border px-3",
            collapsed && "justify-center px-2",
          )}
        >
          {brand}
        </div>
        <div className="flex-1 overflow-y-auto px-2.5 py-3">
          <NavLinks collapsed={collapsed} />
        </div>
        <button
          type="button"
          onClick={toggle}
          className="flex h-10 items-center justify-center gap-2 border-t border-sidebar-border text-xs text-sidebar-foreground/55 hover:text-sidebar-foreground"
          aria-label={collapsed ? "Expandir menu" : "Recolher menu"}
          aria-expanded={!collapsed}
        >
          {collapsed ? (
            <ChevronsRight className="h-4 w-4" />
          ) : (
            <>
              <ChevronsLeft className="h-4 w-4" />
              Recolher
            </>
          )}
        </button>
      </aside>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[272px] border-sidebar-border bg-sidebar p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-14 items-center border-b border-sidebar-border px-3">{brand}</div>
          <div className="h-[calc(100dvh-3.5rem)] overflow-y-auto px-2.5 py-3">
            <NavLinks collapsed={false} onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <div
        className={cn(
          "min-w-0 transition-[padding] duration-200 ease-out",
          collapsed ? "md:pl-[60px]" : "md:pl-[232px]",
        )}
      >
        <header className="sticky top-0 z-20 border-b border-border bg-background/85 backdrop-blur supports-[backdrop-filter]:bg-background/70">
          <div className="flex h-14 items-center gap-2 px-3 sm:px-5">
            <button
              type="button"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-lg text-muted-foreground hover:bg-muted md:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Abrir menu"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div className="hidden sm:block">
              <OrgSwitcher />
            </div>
            <div className="min-w-0 flex-1 sm:px-2">
              <GlobalSearch />
            </div>
            <ActivityIndicator />
            <QuickActions />
            <Notifications />
            <UserMenu />
          </div>
          <div className="flex items-center gap-2 border-t border-border px-3 py-1.5 sm:hidden">
            <OrgSwitcher />
          </div>
        </header>
        <div className="border-b border-info/15 bg-info/[0.06] px-3 py-1.5 text-center text-[0.68rem] text-muted-foreground sm:px-5">
          Ambiente de demonstração de{" "}
          <strong className="font-semibold text-foreground">{org.name}</strong>: dados fictícios,
          mensagens e cobranças simuladas.
        </div>
        <main id="conteudo" className="mx-auto w-full max-w-[1480px] px-3 py-5 sm:px-5 lg:px-6">
          {children}
        </main>
      </div>
      <QuickCreate />
    </div>
  );
}
