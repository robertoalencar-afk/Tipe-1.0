import { useEffect, useState, type ReactNode } from "react";
import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { CrmLogo } from "./eco";
import {
  Bell,
  Building2,
  CalendarDays,
  ChartNoAxesCombined,
  Check,
  ChevronsUpDown,
  CircleDollarSign,
  Contact as ContactIcon,
  Filter,
  Gauge,
  HeartHandshake,
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
  Route as RouteIcon,
  Search,
  Settings,
  ShieldCheck,
  Store,
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
import { cn } from "@/lib/utils";
import { ROLE_LABEL, type Action } from "@/lib/tipe/crm/permissions";
import { resetDemo } from "@/lib/tipe/crm/store";
import { useCrm, useOrgData } from "./context";
import { QuickCreate } from "./forms";
import { Avatar, relative } from "./ui";

// Moldura do CRM: logotipo oficial da Tipe, navegação em pílula por camada do ecossistema
// (comercial, restaurantes, clientes) e, logo abaixo, as páginas da camada ativa.

type Badges = ReturnType<typeof useBadges>;
type NavItem = {
  to: string;
  label: string;
  icon: typeof Gauge;
  perm?: Action | undefined;
  platform?: boolean | undefined;
  exact?: boolean | undefined;
  badge?: ((b: Badges) => number) | undefined;
};
type Section = { key: string; label: string; items: NavItem[] };

export const SECTIONS: Section[] = [
  {
    key: "visao",
    label: "Visão geral",
    items: [
      { to: "/crm", label: "Painel", icon: Gauge, exact: true },
      { to: "/crm/jornada", label: "Jornada integrada", icon: RouteIcon },
    ],
  },
  {
    key: "comercial",
    label: "Comercial",
    items: [
      { to: "/crm/comercial", label: "Painel comercial", icon: ChartNoAxesCombined, exact: true },
      { to: "/crm/leads", label: "Leads", icon: Filter, badge: (b) => b.newLeads },
      { to: "/crm/oportunidades", label: "Oportunidades", icon: KanbanSquare },
      { to: "/crm/contatos", label: "Contatos", icon: ContactIcon },
      { to: "/crm/empresas", label: "Empresas", icon: Building2 },
      { to: "/crm/funis", label: "Funis", icon: Workflow },
    ],
  },
  {
    key: "restaurantes",
    label: "Restaurantes",
    items: [
      { to: "/crm/contas", label: "Contas", icon: Store, badge: (b) => b.onboarding },
      { to: "/crm/suporte", label: "Suporte", icon: LifeBuoy, badge: (b) => b.tickets },
    ],
  },
  {
    key: "clientes",
    label: "Clientes",
    items: [
      {
        to: "/crm/clientes",
        label: "Clientes dos restaurantes",
        icon: HeartHandshake,
        perm: "consumers.view",
      },
    ],
  },
  {
    key: "rotina",
    label: "Rotina",
    items: [
      { to: "/crm/tarefas", label: "Tarefas", icon: ListTodo, badge: (b) => b.overdue },
      { to: "/crm/calendario", label: "Agenda", icon: CalendarDays },
      { to: "/crm/atendimento", label: "Atendimento", icon: Inbox, badge: (b) => b.unread },
      { to: "/crm/whatsapp", label: "WhatsApp", icon: MessageCircle },
    ],
  },
  {
    key: "equipe",
    label: "Equipe",
    items: [
      { to: "/crm/equipe", label: "Equipe", icon: Users },
      { to: "/crm/gamificacao", label: "Metas e gamificação", icon: Trophy },
      {
        to: "/crm/relatorios",
        label: "Relatórios",
        icon: ChartNoAxesCombined,
        perm: "reports.view",
      },
    ],
  },
  {
    key: "gestao",
    label: "Gestão",
    items: [
      { to: "/crm/organizacoes", label: "Organizações", icon: Layers },
      { to: "/crm/planos", label: "Plano do CRM", icon: CircleDollarSign },
      { to: "/crm/financeiro", label: "Financeiro", icon: Wallet, perm: "finance.view" },
      { to: "/crm/configuracoes", label: "Configurações", icon: Settings },
      { to: "/crm/perfil", label: "Perfil", icon: UserRound },
      { to: "/crm/admin", label: "Administração", icon: ShieldCheck, platform: true },
    ],
  },
];

const isActive = (item: NavItem, path: string) =>
  item.exact ? path === item.to || path === `${item.to}/` : path.startsWith(item.to);

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
    onboarding: d.accounts.filter((a) => a.status === "implantacao").length,
    tickets: d.tickets.filter((t) => t.accountId && t.status !== "resolvido").length,
  };
}

function useSections() {
  const { me, can } = useCrm();
  return SECTIONS.map((s) => ({
    ...s,
    items: s.items.filter((i) => (!i.perm || can(i.perm)) && (!i.platform || me.platformAdmin)),
  })).filter((s) => s.items.length);
}

function SectionPills() {
  const sections = useSections();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = sections.find((s) => s.items.some((i) => isActive(i, path)));
  return (
    <nav
      aria-label="Camadas do CRM"
      className="hidden items-center gap-0.5 rounded-full bg-card p-1 shadow-xs ring-1 ring-border lg:flex"
    >
      {sections.map((s) => {
        const on = s === active;
        const first = s.items[0]!;
        return (
          <Link
            key={s.key}
            to={first.to}
            aria-current={on ? "page" : undefined}
            className={cn(
              "flex h-9 items-center rounded-full px-3.5 text-[0.8rem] font-medium text-muted-foreground transition-colors hover:text-foreground xl:px-4",
              on && "bg-secondary text-secondary-foreground hover:text-secondary-foreground",
            )}
          >
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}

function SubNav() {
  const sections = useSections();
  const badges = useBadges();
  const path = useRouterState({ select: (r) => r.location.pathname });
  const active = sections.find((s) => s.items.some((i) => isActive(i, path)));
  if (!active) return null;
  return (
    <nav aria-label={`Páginas de ${active.label}`} className="min-w-0 flex-1 overflow-x-auto">
      <ul className="flex items-center gap-1">
        {active.items.map((item) => {
          const on = isActive(item, path);
          const count = item.badge?.(badges) ?? 0;
          return (
            <li key={item.to}>
              <Link
                to={item.to}
                aria-current={on ? "page" : undefined}
                className={cn(
                  "flex h-8 items-center gap-1.5 whitespace-nowrap rounded-full px-3 text-xs font-medium text-muted-foreground transition-colors hover:bg-card hover:text-foreground",
                  on && "bg-card text-foreground shadow-xs ring-1 ring-border",
                )}
              >
                <item.icon className={cn("h-3.5 w-3.5", on ? "text-primary" : "")} aria-hidden />
                {item.label}
                {count > 0 && (
                  <span className="grid h-4 min-w-4 place-items-center rounded-full bg-primary px-1 text-[0.6rem] font-bold text-primary-foreground">
                    {count}
                  </span>
                )}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

function MobileNav({ onNavigate }: { onNavigate: () => void }) {
  const sections = useSections();
  const badges = useBadges();
  const path = useRouterState({ select: (r) => r.location.pathname });
  return (
    <nav aria-label="Menu do CRM" className="flex flex-col gap-4">
      {sections.map((s) => (
        <div key={s.key}>
          <p className="mb-1 px-2.5 text-[0.62rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            {s.label}
          </p>
          <ul className="space-y-0.5">
            {s.items.map((item) => {
              const on = isActive(item, path);
              const count = item.badge?.(badges) ?? 0;
              return (
                <li key={item.to}>
                  <Link
                    to={item.to}
                    onClick={onNavigate}
                    aria-current={on ? "page" : undefined}
                    className={cn(
                      "flex h-9 items-center gap-2.5 rounded-full px-3 text-[0.82rem] font-medium text-foreground/80 hover:bg-muted",
                      on && "bg-secondary text-secondary-foreground hover:bg-secondary",
                    )}
                  >
                    <item.icon className="h-4 w-4 shrink-0" aria-hidden />
                    <span className="truncate">{item.label}</span>
                    {count > 0 && (
                      <span className="ml-auto rounded-full bg-primary px-1.5 text-[0.65rem] font-semibold text-primary-foreground">
                        {count}
                      </span>
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

function OrgSwitcher({ className }: { className?: string | undefined }) {
  const { org, orgs, run, role } = useCrm();
  const navigate = useNavigate();
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className={cn(
          "flex h-8 min-w-0 max-w-[16rem] items-center gap-2 rounded-full bg-card px-1.5 pr-2.5 text-left shadow-xs ring-1 ring-border hover:bg-muted",
          className,
        )}
        aria-label="Trocar de organização"
      >
        <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-secondary font-display text-[0.55rem] font-bold text-secondary-foreground">
          {org.name.slice(0, 2).toUpperCase()}
        </span>
        <span className="min-w-0 truncate text-xs font-semibold">{org.name}</span>
        <span className="hidden truncate text-[0.68rem] text-muted-foreground sm:inline">
          · {ROLE_LABEL[role]}
        </span>
        <ChevronsUpDown className="ml-auto h-3.5 w-3.5 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64">
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
            <span className="grid h-6 w-6 place-items-center rounded-full bg-muted text-[0.6rem] font-bold">
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

/** Abre a busca global de qualquer lugar (o campo de busca do painel usa isto). */
export const openGlobalSearch = () => window.dispatchEvent(new Event("crm:busca"));

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
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("crm:busca", onOpen);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("crm:busca", onOpen);
    };
  }, []);
  const go = (to: string, search?: Record<string, string>) => {
    setOpen(false);
    navigate({ to, search } as never);
  };
  return (
    <>
      <Tooltip>
        <TooltipTrigger asChild>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="grid h-10 w-10 place-items-center rounded-full bg-card text-foreground shadow-xs ring-1 ring-border hover:bg-muted"
            aria-label="Busca global"
          >
            <Search className="h-4 w-4" />
          </button>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground ring-1 ring-border">
          Buscar (Ctrl K)
        </TooltipContent>
      </Tooltip>
      <CommandDialog open={open} onOpenChange={setOpen}>
        <CommandInput placeholder="Digite um nome, restaurante, e-mail ou telefone" />
        <CommandList className="max-h-[60vh]">
          <CommandEmpty>Nada encontrado nesta organização.</CommandEmpty>
          <CommandGroup heading="Restaurantes">
            {d.accounts.map((a) => (
              <CommandItem
                key={a.id}
                value={`restaurante conta ${a.name} ${a.neighborhood}`}
                onSelect={() => go(`/crm/contas/${a.id}`)}
              >
                <Store />
                {a.name}
                <span className="ml-auto text-xs text-muted-foreground">{a.neighborhood}</span>
              </CommandItem>
            ))}
          </CommandGroup>
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
        className="relative grid h-10 w-10 place-items-center rounded-full bg-card text-foreground shadow-xs ring-1 ring-border hover:bg-muted"
        aria-label={`Notificações${unread ? `, ${unread} não lidas` : ""}`}
      >
        <Bell className="h-4 w-4" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[0.6rem] font-bold text-destructive-foreground ring-2 ring-background">
            {unread}
          </span>
        )}
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 rounded-2xl p-0">
        <div className="flex items-center justify-between border-b border-border px-3.5 py-2.5">
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
                className="flex w-full gap-2 px-3.5 py-2.5 text-left hover:bg-muted"
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

function QuickActions() {
  const { openCreate, can } = useCrm();
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger asChild>
          <DropdownMenuTrigger
            className="grid h-10 w-10 place-items-center rounded-full bg-primary text-primary-foreground shadow-xs hover:bg-primary/90"
            aria-label="Ações rápidas"
          >
            <Plus className="h-4 w-4" />
          </DropdownMenuTrigger>
        </TooltipTrigger>
        <TooltipContent className="bg-popover text-popover-foreground ring-1 ring-border">
          Criar
        </TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-52">
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Ações rápidas
        </DropdownMenuLabel>
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
      <DropdownMenuTrigger
        className="rounded-full ring-2 ring-card shadow-xs"
        aria-label="Perfil e conta"
      >
        <Avatar name={me.name} className="h-10 w-10 text-xs" />
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

export function Shell({ children }: { children: ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const { org } = useCrm();
  const path = useRouterState({ select: (r) => r.location.pathname });
  useEffect(() => setMobileOpen(false), [path]);

  return (
    <div className="min-h-dvh bg-background text-foreground">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded-full focus:bg-secondary focus:px-3 focus:py-2 focus:text-xs focus:font-semibold focus:text-secondary-foreground"
      >
        Pular para o conteúdo
      </a>
      <header className="sticky top-0 z-30 bg-background/90 backdrop-blur supports-[backdrop-filter]:bg-background/75">
        <div className="mx-auto flex h-[4.25rem] w-full max-w-[1480px] items-center gap-2 px-3 sm:gap-3 sm:px-5 lg:px-6">
          <button
            type="button"
            className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-card shadow-xs ring-1 ring-border lg:hidden"
            onClick={() => setMobileOpen(true)}
            aria-label="Abrir menu"
          >
            <Menu className="h-4 w-4" />
          </button>
          <Link
            to="/crm"
            className="flex h-10 shrink-0 items-center rounded-full bg-card px-4 shadow-xs ring-1 ring-border"
            aria-label="Tipe, início do CRM"
          >
            <CrmLogo className="h-6" />
          </Link>
          <div className="flex min-w-0 flex-1 justify-center">
            <SectionPills />
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <GlobalSearch />
            <QuickActions />
            <Notifications />
            <UserMenu />
          </div>
        </div>
        <div className="mx-auto flex w-full max-w-[1480px] items-center gap-3 px-3 pb-2 sm:px-5 lg:px-6">
          <SubNav />
          <span
            className="hidden shrink-0 items-center gap-1.5 rounded-full bg-highlight/15 px-2.5 py-1 text-[0.65rem] font-semibold text-foreground md:inline-flex"
            title={`Ambiente de demonstração de ${org.name}: dados fictícios, mensagens e cobranças simuladas.`}
          >
            <span className="h-1.5 w-1.5 rounded-full bg-highlight" aria-hidden />
            Demonstração · dados fictícios
          </span>
          <OrgSwitcher className="shrink-0" />
        </div>
      </header>

      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-[280px] border-border bg-card p-0">
          <SheetTitle className="sr-only">Menu</SheetTitle>
          <div className="flex h-16 items-center border-b border-border px-4">
            <CrmLogo className="h-6" />
          </div>
          <div className="h-[calc(100dvh-4rem)] overflow-y-auto px-2.5 py-3">
            <MobileNav onNavigate={() => setMobileOpen(false)} />
          </div>
        </SheetContent>
      </Sheet>

      <main id="conteudo" className="mx-auto w-full max-w-[1480px] px-3 pb-10 pt-3 sm:px-5 lg:px-6">
        {children}
      </main>
      <QuickCreate />
    </div>
  );
}
