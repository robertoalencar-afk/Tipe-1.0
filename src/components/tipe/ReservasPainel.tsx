// Tipe Reserva · Fase 5: seção "Reservas" do painel do restaurante.
// Só é montada quando a flag guest.reservations está ligada (ver RestaurantPanel). Equipe opera o dia;
// o dono configura. O check-in registra a mesa; a conta e o pagamento da mesa seguem iguais.
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Clock,
  History,
  LayoutGrid,
  ListOrdered,
  Phone,
  Plus,
  RefreshCw,
  Settings,
  Users,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, Panel, StatCard, StatusBadge, type Tone } from "@/components/tipe/ds";
import { cn } from "@/lib/utils";
import {
  addDays,
  localDay,
  localInstant,
  localTime,
  PANEL_ACTIONS,
  RESERVATION_STATUS_LABEL,
  type ReservationStatus,
} from "@/lib/tipe/guest/reservas";
import {
  agirReserva,
  chamarEspera,
  getReservaHistorico,
  getReservasPainel,
  novaReservaEquipe,
  removerExcecao,
  salvarArea,
  salvarConfigReservas,
  salvarExcecao,
  salvarExperiencia,
  salvarMesaReserva,
  salvarTurnos,
  sentarReserva,
  type PainelMesa,
  type PainelReserva,
} from "@/lib/tipe/guest/reservas.functions";

const TONE: Record<ReservationStatus, Tone> = {
  pendente: "warning",
  confirmada: "brand",
  chegou: "info",
  sentada: "success",
  concluida: "neutral",
  cancelada_cliente: "neutral",
  cancelada_restaurante: "neutral",
  nao_compareceu: "error",
};
const CANAL: Record<string, string> = {
  guest_app: "App",
  web: "Site",
  painel: "Painel",
  telefone: "Telefone",
};
const SEMANA = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const EXCECAO: Record<string, string> = {
  feriado: "Feriado",
  evento_privado: "Evento privado",
  bloqueio: "Bloqueio",
};
const EXPERIENCIA: Record<string, string> = {
  menu_degustacao: "Menu degustação",
  evento: "Evento",
  grupo: "Grupo",
};
const ESPERA: Record<string, { l: string; t: Tone }> = {
  aguardando: { l: "Aguardando", t: "warning" },
  convocado: { l: "Avisado", t: "info" },
  confirmado: { l: "Confirmou", t: "success" },
  expirado: { l: "Expirou", t: "neutral" },
  cancelado: { l: "Cancelou", t: "neutral" },
};
const selectCls = "h-10 w-full min-w-0 rounded-[0.9rem] border border-input bg-card px-3 text-sm";
const hoje = () => localDay(new Date());
const diaLongo = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
const diaCurto = (day: string) =>
  new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    timeZone: "UTC",
  });
const pct = (n: number | null) => (n === null ? undefined : `${Math.round(n * 100)}%`);
const uid = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random()}`;

type Vista = "dia" | "semana" | "espera" | "config";

export function ReservasPainel({ slug, podeDono }: { slug: string; podeDono: boolean }) {
  const fetchPainel = useServerFn(getReservasPainel);
  const qc = useQueryClient();
  const [day, setDay] = useState(hoje);
  const [vista, setVista] = useState<Vista>("dia");
  const [nova, setNova] = useState(false);
  const q = useQuery({
    queryKey: ["reservas", slug, day],
    queryFn: () => fetchPainel({ data: { slug, day } }),
    refetchInterval: 30000,
  });
  const refresh = () => qc.invalidateQueries({ queryKey: ["reservas", slug] });

  if (q.isLoading) return <p className="text-sm text-muted-foreground">Carregando reservas…</p>;
  if (q.error || !q.data)
    return (
      <EmptyState
        icon={X}
        title="Não foi possível carregar as reservas"
        text={(q.error as Error)?.message ?? "Tente de novo em instantes."}
        action={
          <Button variant="outline" onClick={refresh}>
            <RefreshCw />
            Tentar de novo
          </Button>
        }
      />
    );
  if (!q.data.enabled)
    return (
      <EmptyState
        icon={CalendarDays}
        title="Reservas não estão ligadas para este restaurante"
        text="Fale com a equipe Tipe para ativar o módulo."
      />
    );
  const d = q.data;
  const reservaveis = d.tables.filter((t) => t.reservable && t.active);
  const pronto = reservaveis.length > 0 && d.rules.some((r) => r.active);
  const esperaAtiva = d.waitlist.filter(
    (w) => w.status === "aguardando" || w.status === "convocado",
  ).length;
  const vistas: { k: Vista; l: string; i: typeof CalendarDays; n?: number }[] = [
    { k: "dia", l: "Dia", i: LayoutGrid },
    { k: "semana", l: "Semana", i: CalendarDays },
    { k: "espera", l: "Espera", i: ListOrdered, ...(esperaAtiva ? { n: esperaAtiva } : {}) },
    ...(podeDono ? [{ k: "config" as const, l: "Configurar", i: Settings }] : []),
  ];

  return (
    <section className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge
            tone={d.settings.accepting ? "success" : "neutral"}
            live={d.settings.accepting}
          >
            {d.settings.accepting ? "Recebendo reservas" : "Fechado para reservas do público"}
          </StatusBadge>
          {!pronto && <StatusBadge tone="warning">Falta configurar mesas e turnos</StatusBadge>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-full border border-border bg-surface p-0.5">
            <button
              type="button"
              aria-label="Dia anterior"
              onClick={() => setDay(addDays(day, -1))}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-background-muted"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <input
              type="date"
              aria-label="Dia"
              value={day}
              onChange={(e) => e.target.value && setDay(e.target.value)}
              className="h-8 bg-transparent px-1 text-sm font-medium tabular-nums"
            />
            <button
              type="button"
              aria-label="Próximo dia"
              onClick={() => setDay(addDays(day, 1))}
              className="grid h-8 w-8 place-items-center rounded-full hover:bg-background-muted"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          {day !== hoje() && (
            <Button size="sm" variant="ghost" onClick={() => setDay(hoje())}>
              Hoje
            </Button>
          )}
          <Button size="sm" variant="ink" onClick={() => setNova(true)} disabled={!pronto}>
            <Phone />
            Anotar reserva
          </Button>
        </div>
      </div>

      <nav
        aria-label="Visões de reservas"
        className="flex gap-1 overflow-x-auto rounded-full border border-border bg-surface p-1"
      >
        {vistas.map(({ k, l, i: Icon, n }) => (
          <button
            key={k}
            type="button"
            onClick={() => setVista(k)}
            aria-current={vista === k ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-sm sm:px-3.5",
              vista === k
                ? "bg-foreground font-medium text-background"
                : "text-foreground/75 hover:bg-background-muted",
            )}
          >
            <Icon className="h-4 w-4" />
            {l}
            {n ? (
              <span
                className={cn(
                  "rounded-full px-1.5 text-[11px] font-semibold",
                  vista === k ? "bg-white/15" : "bg-warning/25",
                )}
              >
                {n}
              </span>
            ) : null}
          </button>
        ))}
      </nav>

      {vista === "dia" && (
        <VistaDia
          slug={slug}
          day={day}
          data={d}
          pronto={pronto}
          podeDono={podeDono}
          onConfig={() => setVista("config")}
          onDone={refresh}
        />
      )}
      {vista === "semana" && (
        <VistaSemana
          data={d}
          onPick={(x) => {
            setDay(x);
            setVista("dia");
          }}
        />
      )}
      {vista === "espera" && <VistaEspera slug={slug} day={day} data={d} onDone={refresh} />}
      {vista === "config" && podeDono && <VistaConfig slug={slug} data={d} onDone={refresh} />}

      <NovaReserva
        open={nova}
        onOpenChange={setNova}
        slug={slug}
        day={day}
        data={d}
        onDone={refresh}
      />
    </section>
  );
}

type Dados = Extract<Awaited<ReturnType<typeof getReservasPainel>>, { enabled: true }>;

// ---------------------------------------------------------------- dia

function VistaDia({
  slug,
  day,
  data,
  pronto,
  podeDono,
  onConfig,
  onDone,
}: {
  slug: string;
  day: string;
  data: Dados;
  pronto: boolean;
  podeDono: boolean;
  onConfig: () => void;
  onDone: () => void;
}) {
  const agir = useServerFn(agirReserva);
  const sentar = useServerFn(sentarReserva);
  const [busy, setBusy] = useState<string | null>(null);
  const [cancelar, setCancelar] = useState<PainelReserva | null>(null);
  const [mesaPara, setMesaPara] = useState<PainelReserva | null>(null);
  const [hist, setHist] = useState<string | null>(null);
  const mesaNum = (id: string) => data.tables.find((t) => t.id === id)?.number ?? "?";
  const ativas = data.reservas.filter((r) => !r.status.startsWith("cancelada"));
  const canceladas = data.reservas.filter((r) => r.status.startsWith("cancelada"));
  const pessoas = ativas
    .filter((r) => r.status !== "nao_compareceu")
    .reduce((s, r) => s + r.party, 0);
  const chegaram = ativas.filter((r) =>
    ["chegou", "sentada", "concluida"].includes(r.status),
  ).length;

  async function mudar(
    r: PainelReserva,
    to: "confirmada" | "chegou" | "nao_compareceu" | "concluida",
  ) {
    setBusy(r.id);
    try {
      await agir({ data: { slug, id: r.id, to } });
      toast.success(`${r.name}: ${RESERVATION_STATUS_LABEL[to].toLowerCase()}`);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const porHora = useMemo(() => {
    const m = new Map<string, PainelReserva[]>();
    for (const r of ativas) {
      const h = localTime(new Date(r.start));
      m.set(h, [...(m.get(h) ?? []), r]);
    }
    return [...m.entries()];
  }, [ativas]);

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard
          label="Reservas"
          icon={CalendarDays}
          value={ativas.length || undefined}
          empty="Nenhuma neste dia"
          hint={diaLongo(day)}
        />
        <StatCard
          label="Pessoas esperadas"
          icon={Users}
          value={pessoas || undefined}
          empty="Sem grupos"
        />
        <StatCard
          label="Chegaram"
          icon={Clock}
          value={ativas.length ? `${chegaram}/${ativas.length}` : undefined}
          empty="Sem chegadas"
        />
        <StatCard
          label="Lista de espera"
          icon={ListOrdered}
          value={data.waitlist.length || undefined}
          empty="Ninguém"
        />
      </div>

      {!pronto ? (
        <EmptyState
          icon={Settings}
          title="Configure mesas e turnos para começar"
          text="Marque quais mesas aceitam reserva, quantos lugares cada uma tem e os horários de chegada da semana."
          action={
            podeDono ? (
              <Button variant="ink" onClick={onConfig}>
                Configurar reservas
              </Button>
            ) : (
              <span className="text-sm text-muted-foreground">Peça ao dono para configurar.</span>
            )
          }
        />
      ) : (
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px]">
          <Panel
            title="Reservas do dia"
            description="Em ordem de chegada. As ações seguem o fluxo: confirmar, chegou, levar à mesa e concluir."
            bodyClassName="p-0"
          >
            {ativas.length === 0 ? (
              <EmptyState
                className="m-5"
                icon={CalendarDays}
                title="Nenhuma reserva neste dia"
                text="As reservas do app e as anotadas pela equipe aparecem aqui."
              />
            ) : (
              <ol className="divide-y divide-border">
                {porHora.map(([h, rs]) => (
                  <li
                    key={h}
                    className="grid grid-cols-[56px_minmax(0,1fr)] gap-3 px-4 py-3 sm:px-5"
                  >
                    <p className="pt-1 font-display text-lg font-medium tabular-nums">{h}</p>
                    <ul className="space-y-3">
                      {rs.map((r) => (
                        <li key={r.id} className="min-w-0">
                          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <span className="font-medium">{r.name}</span>
                            <span className="text-sm text-muted-foreground">
                              {r.party} {r.party === 1 ? "pessoa" : "pessoas"}
                            </span>
                            <StatusBadge tone={TONE[r.status]}>
                              {RESERVATION_STATUS_LABEL[r.status]}
                            </StatusBadge>
                          </div>
                          <p className="mt-0.5 text-xs text-muted-foreground">
                            {r.seatedTableId
                              ? `Sentou na mesa ${mesaNum(r.seatedTableId)}`
                              : r.tableIds.length
                                ? `Mesa ${r.tableIds.map(mesaNum).join(" + ")}`
                                : "Sem mesa"}
                            {" · "}
                            {CANAL[r.channel] ?? r.channel}
                            {r.phone ? ` · ${r.phone}` : ""}
                            {r.occasion ? ` · ${r.occasion}` : ""}
                          </p>
                          {r.notes && (
                            <p className="mt-1 rounded-lg bg-background-muted px-2.5 py-1.5 text-xs">
                              {r.notes}
                            </p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {PANEL_ACTIONS[r.status].map((a) => (
                              <Button
                                key={a.to}
                                size="sm"
                                variant={
                                  a.to === "cancelar" || a.to === "nao_compareceu"
                                    ? "ghost"
                                    : "outline"
                                }
                                className="h-8 px-3"
                                disabled={busy === r.id}
                                onClick={() =>
                                  a.to === "cancelar"
                                    ? setCancelar(r)
                                    : a.to === "sentar"
                                      ? setMesaPara(r)
                                      : mudar(
                                          r,
                                          a.to as
                                            | "confirmada"
                                            | "chegou"
                                            | "nao_compareceu"
                                            | "concluida",
                                        )
                                }
                              >
                                {a.label}
                              </Button>
                            ))}
                            <Button
                              size="sm"
                              variant="ghost"
                              className="h-8 px-2.5"
                              aria-expanded={hist === r.id}
                              onClick={() => setHist(hist === r.id ? null : r.id)}
                            >
                              <History />
                              Histórico
                            </Button>
                          </div>
                          {hist === r.id && <Historico slug={slug} id={r.id} />}
                        </li>
                      ))}
                    </ul>
                  </li>
                ))}
              </ol>
            )}
            {canceladas.length > 0 && (
              <p className="border-t border-border px-5 py-3 text-xs text-muted-foreground">
                {canceladas.length} cancelada{canceladas.length > 1 ? "s" : ""} neste dia:{" "}
                {canceladas.map((r) => `${r.name} (${localTime(new Date(r.start))})`).join(", ")}
              </p>
            )}
          </Panel>
          <MapaMesas data={data} />
        </div>
      )}

      <CancelarDialog slug={slug} r={cancelar} onClose={() => setCancelar(null)} onDone={onDone} />
      <Dialog open={!!mesaPara} onOpenChange={(o) => !o && setMesaPara(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Levar {mesaPara?.name} à mesa</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            A reserva fica ligada à mesa escolhida. A conta da mesa e o pagamento continuam como
            sempre.
          </p>
          <div className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-4">
            {data.tables
              .filter((t) => t.active)
              .map((t) => {
                const reservada = mesaPara?.tableIds.includes(t.id);
                return (
                  <button
                    key={t.id}
                    type="button"
                    disabled={busy === mesaPara?.id}
                    onClick={async () => {
                      if (!mesaPara) return;
                      setBusy(mesaPara.id);
                      try {
                        await sentar({ data: { slug, id: mesaPara.id, tableId: t.id } });
                        toast.success(`${mesaPara.name} na mesa ${t.number}`);
                        setMesaPara(null);
                        onDone();
                      } catch (e) {
                        toast.error((e as Error).message);
                      } finally {
                        setBusy(null);
                      }
                    }}
                    className={cn(
                      "rounded-xl border px-2 py-2.5 text-center text-sm",
                      reservada
                        ? "border-foreground bg-foreground font-medium text-background"
                        : "border-border hover:border-foreground/40",
                    )}
                  >
                    Mesa {t.number}
                    {reservada && <span className="block text-[10px] opacity-80">reservada</span>}
                  </button>
                );
              })}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function MapaMesas({ data }: { data: Dados }) {
  const agora = Date.now();
  const mesas = data.tables.filter((t) => t.reservable && t.active);
  const ocup = (t: PainelMesa) => {
    const rs = data.reservas
      .filter(
        (r) =>
          !r.status.startsWith("cancelada") &&
          r.status !== "nao_compareceu" &&
          r.status !== "concluida",
      )
      .filter((r) => (r.seatedTableId ? r.seatedTableId === t.id : r.tableIds.includes(t.id)));
    const sentada = rs.find((r) => r.status === "sentada");
    const proxima = rs
      .filter((r) => r.status !== "sentada" && Date.parse(r.end) > agora)
      .sort((a, b) => a.start.localeCompare(b.start))[0];
    return { sentada, proxima, total: rs.length };
  };
  return (
    <Panel title="Mapa de mesas" description="Mesas que aceitam reserva neste dia.">
      <div className="grid grid-cols-3 gap-2 xl:grid-cols-2">
        {mesas.map((t) => {
          const o = ocup(t);
          return (
            <div
              key={t.id}
              className={cn(
                "rounded-xl border p-2.5 text-xs",
                o.sentada
                  ? "border-foreground bg-foreground text-background"
                  : o.proxima
                    ? "border-brand/40 bg-brand-soft"
                    : "border-border",
              )}
            >
              <p className="text-sm font-medium">Mesa {t.number}</p>
              <p className={o.sentada ? "opacity-70" : "text-muted-foreground"}>
                {t.seatsMin && t.seatsMin > 1 ? `${t.seatsMin}–` : "até "}
                {t.seatsMax} lugares
              </p>
              <p className="mt-1 truncate">
                {o.sentada
                  ? `${o.sentada.name.split(" ")[0]} à mesa`
                  : o.proxima
                    ? `${localTime(new Date(o.proxima.start))} ${o.proxima.name.split(" ")[0]}`
                    : "Livre"}
              </p>
            </div>
          );
        })}
      </div>
      <div className="mt-3 flex flex-wrap gap-3 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-foreground" />À mesa
        </span>
        <span className="flex items-center gap-1">
          <span className="h-2 w-2 rounded-full bg-brand" />
          Próxima reserva
        </span>
      </div>
    </Panel>
  );
}

function Historico({ slug, id }: { slug: string; id: string }) {
  const fetchHist = useServerFn(getReservaHistorico);
  const q = useQuery({
    queryKey: ["reserva-hist", slug, id],
    queryFn: () => fetchHist({ data: { slug, id } }),
  });
  const quem: Record<string, string> = {
    cliente: "Cliente",
    restaurante: "Equipe",
    sistema: "Sistema",
  };
  const label = (s: string | null) =>
    s && s in RESERVATION_STATUS_LABEL
      ? RESERVATION_STATUS_LABEL[s as ReservationStatus]
      : (s ?? "");
  if (q.isLoading) return <p className="mt-2 text-xs text-muted-foreground">Carregando…</p>;
  if (!q.data?.length) return <p className="mt-2 text-xs text-muted-foreground">Sem registros.</p>;
  return (
    <ol className="mt-2 space-y-1 border-l border-border pl-3 text-xs">
      {q.data.map((e, i) => (
        <li key={i}>
          <span className="tabular-nums text-muted-foreground">
            {new Date(e.at).toLocaleString("pt-BR", {
              day: "2-digit",
              month: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>{" "}
          {quem[e.actor] ?? e.actor}:{" "}
          {e.action === "criada"
            ? "criou"
            : e.action === "alterada"
              ? "alterou"
              : e.from
                ? `${label(e.from)} → ${label(e.to)}`
                : label(e.to) || e.action}
        </li>
      ))}
    </ol>
  );
}

function CancelarDialog({
  slug,
  r,
  onClose,
  onDone,
}: {
  slug: string;
  r: PainelReserva | null;
  onClose: () => void;
  onDone: () => void;
}) {
  const agir = useServerFn(agirReserva);
  const [motivo, setMotivo] = useState("");
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={!!r}
      onOpenChange={(o) => {
        if (!o) {
          onClose();
          setMotivo("");
        }
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Cancelar a reserva de {r?.name}</DialogTitle>
        </DialogHeader>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!r) return;
            setBusy(true);
            try {
              await agir({ data: { slug, id: r.id, to: "cancelar", reason: motivo } });
              toast.success("Reserva cancelada e mesa liberada");
              setMotivo("");
              onClose();
              onDone();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <label className="block text-sm font-medium" htmlFor="motivo-cancelamento">
            Motivo (o cliente vê)
          </label>
          <Input
            id="motivo-cancelamento"
            value={motivo}
            onChange={(e) => setMotivo(e.target.value)}
            maxLength={300}
            placeholder="Ex.: cozinha fechada para manutenção"
            required
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={onClose}>
              Manter reserva
            </Button>
            <Button type="submit" variant="destructive" disabled={busy || !motivo.trim()}>
              Cancelar reserva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// ---------------------------------------------------------------- semana e indicadores

function VistaSemana({ data, onPick }: { data: Dados; onPick: (day: string) => void }) {
  const m = data.metricas30;
  const max = Math.max(1, ...data.semana.map((x) => x.pessoas));
  return (
    <div className="space-y-5">
      <Panel title="Próximos 7 dias" description="Reservas ativas por dia. Toque para abrir o dia.">
        <div className="grid grid-cols-7 gap-1.5">
          {data.semana.map((x) => (
            <button
              key={x.day}
              type="button"
              onClick={() => onPick(x.day)}
              className="group flex flex-col items-center rounded-xl border border-border px-1 py-2.5 hover:border-foreground/40"
            >
              <span className="text-[11px] text-muted-foreground">
                {SEMANA[new Date(`${x.day}T12:00:00Z`).getUTCDay()]}
              </span>
              <span className="text-xs tabular-nums">{diaCurto(x.day)}</span>
              <span className="mt-2 flex h-16 w-full items-end justify-center">
                <span
                  className="w-3 rounded-full bg-brand"
                  style={{ height: `${Math.max(x.pessoas ? 8 : 0, (x.pessoas / max) * 64)}px` }}
                />
              </span>
              <span className="mt-1.5 text-sm font-medium tabular-nums">{x.reservas}</span>
              <span className="text-[10.5px] text-muted-foreground tabular-nums">
                {x.pessoas} pess.
              </span>
            </button>
          ))}
        </div>
      </Panel>
      <div>
        <p className="mb-2 text-sm font-medium">Últimos 30 dias</p>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Reservas" value={m.total || undefined} empty="Nenhuma ainda" />
          <StatCard label="Pessoas atendidas" value={m.covers || undefined} empty="Nenhuma ainda" />
          <StatCard
            label="Não vieram"
            value={pct(m.noShowRate)}
            empty="Sem base ainda"
            hint="Entre quem veio e quem não veio"
          />
          <StatCard label="Canceladas" value={pct(m.cancelRate)} empty="Sem base ainda" />
        </div>
        {m.total > 0 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Por canal:{" "}
            {Object.entries(m.byChannel)
              .map(([k, v]) => `${CANAL[k] ?? k} ${v}`)
              .join(" · ")}
          </p>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- lista de espera

function VistaEspera({
  slug,
  day,
  data,
  onDone,
}: {
  slug: string;
  day: string;
  data: Dados;
  onDone: () => void;
}) {
  const chamar = useServerFn(chamarEspera);
  const [busy, setBusy] = useState<string | null>(null);
  if (!data.waitlist.length)
    return (
      <EmptyState
        icon={ListOrdered}
        title="Ninguém na lista de espera"
        text={`Quem pedir um horário lotado em ${diaCurto(day)} pelo app entra aqui, por ordem de chegada.`}
      />
    );
  return (
    <Panel
      title="Lista de espera"
      description="Por ordem de entrada. Ao avisar, a pessoa tem 15 minutos para confirmar pelo app."
      bodyClassName="p-0"
    >
      <ol className="divide-y divide-border">
        {data.waitlist.map((w, i) => (
          <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-3">
            <div className="min-w-0">
              <p className="font-medium">
                <span className="mr-2 text-muted-foreground tabular-nums">{i + 1}.</span>
                {w.name} · {w.party} {w.party === 1 ? "pessoa" : "pessoas"}
              </p>
              <p className="text-xs text-muted-foreground">
                Quer entre {localTime(new Date(w.from))} e {localTime(new Date(w.to))}
                {w.respondBy && w.status === "convocado"
                  ? ` · responde até ${localTime(new Date(w.respondBy))}`
                  : ""}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <StatusBadge tone={ESPERA[w.status]?.t ?? "neutral"}>
                {ESPERA[w.status]?.l ?? w.status}
              </StatusBadge>
              {w.status === "aguardando" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="h-8"
                  disabled={busy === w.id}
                  onClick={async () => {
                    setBusy(w.id);
                    try {
                      await chamar({ data: { slug, id: w.id, minutes: 15 } });
                      toast.success(`${w.name} foi avisado`);
                      onDone();
                    } catch (e) {
                      toast.error((e as Error).message);
                    } finally {
                      setBusy(null);
                    }
                  }}
                >
                  Avisar
                </Button>
              )}
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

// ---------------------------------------------------------------- reserva pela equipe

function NovaReserva({
  open,
  onOpenChange,
  slug,
  day,
  data,
  onDone,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  slug: string;
  day: string;
  data: Dados;
  onDone: () => void;
}) {
  const criar = useServerFn(novaReservaEquipe);
  const [f, setF] = useState({ day, time: "20:00", party: 2, name: "", phone: "", notes: "" });
  const [req, setReq] = useState(uid);
  const [busy, setBusy] = useState(false);
  const set = <K extends keyof typeof f>(k: K, v: (typeof f)[K]) => setF((x) => ({ ...x, [k]: v }));
  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        onOpenChange(o);
        if (o) setF((x) => ({ ...x, day }));
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Anotar reserva</DialogTitle>
        </DialogHeader>
        <form
          className="grid grid-cols-2 gap-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              await criar({
                data: {
                  slug,
                  start: localInstant(f.day, f.time).toISOString(),
                  party: f.party,
                  name: f.name,
                  phone: f.phone.replace(/[^\d+]/g, ""),
                  notes: f.notes,
                  channel: "telefone",
                  requestId: req,
                },
              });
              toast.success(`Reserva de ${f.name} anotada`);
              setReq(uid());
              setF((x) => ({ ...x, name: "", phone: "", notes: "" }));
              onOpenChange(false);
              onDone();
            } catch (err) {
              toast.error((err as Error).message);
            } finally {
              setBusy(false);
            }
          }}
        >
          <Campo label="Dia" id="nr-dia">
            <Input
              id="nr-dia"
              type="date"
              value={f.day}
              onChange={(e) => set("day", e.target.value)}
              required
              className="h-10"
            />
          </Campo>
          <Campo label="Horário" id="nr-hora">
            <Input
              id="nr-hora"
              type="time"
              step={data.settings.slotIntervalMin * 60}
              value={f.time}
              onChange={(e) => set("time", e.target.value)}
              required
              className="h-10"
            />
          </Campo>
          <Campo label="Pessoas" id="nr-pessoas">
            <Input
              id="nr-pessoas"
              type="number"
              min={data.settings.minParty}
              max={data.settings.maxParty}
              value={f.party}
              onChange={(e) => set("party", Number(e.target.value))}
              required
              className="h-10"
            />
          </Campo>
          <Campo label="Telefone (opcional)" id="nr-fone">
            <Input
              id="nr-fone"
              inputMode="tel"
              value={f.phone}
              onChange={(e) => set("phone", e.target.value)}
              placeholder="85 99999-0000"
              className="h-10"
            />
          </Campo>
          <Campo label="Nome" id="nr-nome" wide>
            <Input
              id="nr-nome"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              maxLength={80}
              required
              className="h-10"
            />
          </Campo>
          <Campo label="Observação (opcional)" id="nr-obs" wide>
            <Input
              id="nr-obs"
              value={f.notes}
              onChange={(e) => set("notes", e.target.value)}
              maxLength={500}
              className="h-10"
            />
          </Campo>
          <p className="col-span-2 text-xs text-muted-foreground">
            Usa as mesmas regras do app: grade de {data.settings.slotIntervalMin} min, antecedência
            e mesas livres.
          </p>
          <div className="col-span-2 flex justify-end gap-2">
            <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>
              Fechar
            </Button>
            <Button type="submit" variant="ink" disabled={busy || !f.name.trim()}>
              Anotar reserva
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function Campo({
  label,
  id,
  wide,
  children,
}: {
  label: string;
  id: string;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <div className={cn("min-w-0 space-y-1", wide && "col-span-2")}>
      <label htmlFor={id} className="block text-xs font-medium text-muted-foreground">
        {label}
      </label>
      {children}
    </div>
  );
}

// ---------------------------------------------------------------- configuração (dono)

function VistaConfig({ slug, data, onDone }: { slug: string; data: Dados; onDone: () => void }) {
  return (
    <div className="space-y-5">
      <ConfigGeral slug={slug} data={data} onDone={onDone} />
      <ConfigTurnos slug={slug} data={data} onDone={onDone} />
      <ConfigMesas slug={slug} data={data} onDone={onDone} />
      <ConfigBloqueios slug={slug} data={data} onDone={onDone} />
      <ConfigExperiencias slug={slug} data={data} onDone={onDone} />
    </div>
  );
}

function useSalvar(onDone: () => void) {
  const [busy, setBusy] = useState(false);
  return {
    busy,
    run: async (fn: () => Promise<unknown>, ok: string) => {
      setBusy(true);
      try {
        await fn();
        toast.success(ok);
        onDone();
        return true;
      } catch (e) {
        toast.error((e as Error).message);
        return false;
      } finally {
        setBusy(false);
      }
    },
  };
}

function ConfigGeral({ slug, data, onDone }: { slug: string; data: Dados; onDone: () => void }) {
  const salvar = useServerFn(salvarConfigReservas);
  const [s, setS] = useState(data.settings);
  const { busy, run } = useSalvar(onDone);
  const num = (k: keyof typeof s) => (e: { target: { value: string } }) =>
    setS((x) => ({ ...x, [k]: Number(e.target.value) }));
  const save = (next: typeof s) =>
    run(
      () =>
        salvar({
          data: { slug, ...next, slotIntervalMin: next.slotIntervalMin as 10 | 15 | 20 | 30 | 60 },
        }),
      "Configuração salva",
    );
  return (
    <Panel
      title="Receber reservas"
      description="Ligado, o restaurante aparece com horários no app. Desligado, nada muda para quem já reservou."
      actions={
        <label className="flex items-center gap-2 text-sm font-medium">
          <Switch
            checked={s.accepting}
            disabled={busy}
            onCheckedChange={async (v) => {
              const next = { ...s, accepting: v };
              if (await save(next)) setS(next);
            }}
          />
          {s.accepting ? "Aberto" : "Fechado"}
        </label>
      }
    >
      <form
        className="grid grid-cols-2 gap-3 md:grid-cols-4"
        onSubmit={(e) => {
          e.preventDefault();
          void save(s);
        }}
      >
        <Campo label="Grade de horários" id="cg-grade">
          <select
            id="cg-grade"
            className={selectCls}
            value={s.slotIntervalMin}
            onChange={num("slotIntervalMin")}
          >
            {[10, 15, 20, 30, 60].map((v) => (
              <option key={v} value={v}>
                A cada {v} min
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Duração da mesa (min)" id="cg-dur">
          <Input
            id="cg-dur"
            type="number"
            min={15}
            max={480}
            value={s.durationMin}
            onChange={num("durationMin")}
            className="h-10"
          />
        </Campo>
        <Campo label="Arrumação entre grupos (min)" id="cg-buf">
          <Input
            id="cg-buf"
            type="number"
            min={0}
            max={120}
            value={s.bufferMin}
            onChange={num("bufferMin")}
            className="h-10"
          />
        </Campo>
        <Campo label="Antecedência mínima (min)" id="cg-min">
          <Input
            id="cg-min"
            type="number"
            min={0}
            max={10080}
            value={s.minAdvanceMin}
            onChange={num("minAdvanceMin")}
            className="h-10"
          />
        </Campo>
        <Campo label="Reservas até (dias à frente)" id="cg-max">
          <Input
            id="cg-max"
            type="number"
            min={1}
            max={365}
            value={s.maxAdvanceDays}
            onChange={num("maxAdvanceDays")}
            className="h-10"
          />
        </Campo>
        <Campo label="Grupo mínimo" id="cg-pmin">
          <Input
            id="cg-pmin"
            type="number"
            min={1}
            max={99}
            value={s.minParty}
            onChange={num("minParty")}
            className="h-10"
          />
        </Campo>
        <Campo label="Grupo máximo" id="cg-pmax">
          <Input
            id="cg-pmax"
            type="number"
            min={1}
            max={99}
            value={s.maxParty}
            onChange={num("maxParty")}
            className="h-10"
          />
        </Campo>
        <Campo label="Cliente cancela até (min antes)" id="cg-cut">
          <Input
            id="cg-cut"
            type="number"
            min={0}
            max={10080}
            value={s.cancelCutoffMin}
            onChange={num("cancelCutoffMin")}
            className="h-10"
          />
        </Campo>
        <label className="col-span-2 flex items-center gap-2 text-sm md:col-span-3">
          <Switch
            checked={s.autoConfirm}
            onCheckedChange={(v) => setS((x) => ({ ...x, autoConfirm: v }))}
          />
          Confirmar automaticamente (desligado, cada reserva entra como pendente)
        </label>
        <div className="col-span-2 flex justify-end md:col-span-1">
          <Button type="submit" size="sm" variant="ink" disabled={busy}>
            Salvar regras
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ConfigTurnos({ slug, data, onDone }: { slug: string; data: Dados; onDone: () => void }) {
  const salvar = useServerFn(salvarTurnos);
  const [rules, setRules] = useState(
    data.rules
      .filter((r) => r.active)
      .map(({ weekday, first, last }) => ({ weekday, first, last })),
  );
  const { busy, run } = useSalvar(onDone);
  const upd = (i: number, patch: Partial<(typeof rules)[number]>) =>
    setRules((rs) => rs.map((r, j) => (j === i ? { ...r, ...patch } : r)));
  return (
    <Panel
      title="Turnos da semana"
      description="Primeira e última chegada aceitas em cada dia. Um dia pode ter mais de um turno (almoço e jantar)."
      actions={
        <Button
          size="sm"
          variant="ink"
          disabled={busy}
          onClick={() => run(() => salvar({ data: { slug, rules } }), "Turnos salvos")}
        >
          Salvar turnos
        </Button>
      }
    >
      {rules.length === 0 && (
        <p className="mb-3 text-sm text-muted-foreground">
          Nenhum turno ainda. Sem turno, o app não mostra horários.
        </p>
      )}
      <ul className="space-y-2">
        {rules.map((r, i) => (
          <li
            key={i}
            className="grid max-w-lg grid-cols-[4.75rem_minmax(0,1fr)_auto_minmax(0,1fr)_2.25rem] items-center gap-1.5 sm:gap-2"
          >
            <select
              aria-label="Dia da semana"
              className={cn(selectCls, "w-full px-2")}
              value={r.weekday}
              onChange={(e) => upd(i, { weekday: Number(e.target.value) })}
            >
              {SEMANA.map((l, k) => (
                <option key={k} value={k}>
                  {l}
                </option>
              ))}
            </select>
            <Input
              aria-label="Primeira chegada"
              type="time"
              value={r.first}
              onChange={(e) => upd(i, { first: e.target.value })}
              className="h-10 px-2 sm:px-3"
            />
            <span className="text-xs text-muted-foreground sm:text-sm">até</span>
            <Input
              aria-label="Última chegada"
              type="time"
              value={r.last}
              onChange={(e) => upd(i, { last: e.target.value })}
              className="h-10 px-2 sm:px-3"
            />
            <Button
              size="sm"
              variant="ghost"
              className="h-9 w-9 px-0"
              aria-label="Remover turno"
              onClick={() => setRules((rs) => rs.filter((_, j) => j !== i))}
            >
              <X />
            </Button>
          </li>
        ))}
      </ul>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button
          size="sm"
          variant="outline"
          onClick={() =>
            setRules((rs) => [
              ...rs,
              {
                weekday: rs.length ? ((rs[rs.length - 1]?.weekday ?? 0) + 1) % 7 : 2,
                first: "19:00",
                last: "22:30",
              },
            ])
          }
        >
          <Plus />
          Adicionar turno
        </Button>
        {rules.length > 0 && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => {
              const b = rules[0];
              if (b)
                setRules(
                  [0, 1, 2, 3, 4, 5, 6].map((w) => ({ weekday: w, first: b.first, last: b.last })),
                );
            }}
          >
            Repetir o primeiro em todos os dias
          </Button>
        )}
      </div>
    </Panel>
  );
}

function ConfigMesas({ slug, data, onDone }: { slug: string; data: Dados; onDone: () => void }) {
  const salvar = useServerFn(salvarMesaReserva);
  const criarArea = useServerFn(salvarArea);
  const { busy, run } = useSalvar(onDone);
  const [area, setArea] = useState("");
  const mesas = data.tables.filter((t) => t.active);
  if (!mesas.length)
    return (
      <EmptyState
        icon={LayoutGrid}
        title="Nenhuma mesa cadastrada"
        text="Cadastre as mesas no Salão primeiro; depois marque aqui quais aceitam reserva."
      />
    );
  return (
    <Panel
      title="Mesas que aceitam reserva"
      description="Ligue a mesa e informe os lugares. Número, QR e conta da mesa não mudam."
      bodyClassName="p-0"
    >
      <ul className="divide-y divide-border">
        {mesas.map((t) => (
          <MesaLinha
            key={t.id}
            t={t}
            areas={data.areas}
            busy={busy}
            onSave={(v) =>
              run(() => salvar({ data: { slug, tableId: t.id, ...v } }), `Mesa ${t.number} salva`)
            }
          />
        ))}
      </ul>
      <form
        className="flex flex-wrap items-end gap-2 border-t border-border px-5 py-3"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => criarArea({ data: { slug, name: area } }), "Área criada"))
            setArea("");
        }}
      >
        <Campo label="Nova área (ex.: Varanda, Salão)" id="nova-area">
          <Input
            id="nova-area"
            value={area}
            onChange={(e) => setArea(e.target.value)}
            maxLength={60}
            className="h-10 w-56"
          />
        </Campo>
        <Button type="submit" size="sm" variant="outline" disabled={busy || !area.trim()}>
          <Plus />
          Criar área
        </Button>
        {data.combinations > 0 && (
          <p className="text-xs text-muted-foreground">
            {data.combinations} combinação(ões) de mesas para grupos grandes.
          </p>
        )}
      </form>
    </Panel>
  );
}

function MesaLinha({
  t,
  areas,
  busy,
  onSave,
}: {
  t: PainelMesa;
  areas: Dados["areas"];
  busy: boolean;
  onSave: (v: {
    reservable: boolean;
    seatsMin: number | null;
    seatsMax: number | null;
    areaId: string | null;
  }) => void;
}) {
  const [v, setV] = useState({
    reservable: t.reservable,
    seatsMin: t.seatsMin,
    seatsMax: t.seatsMax ?? (t.reservable ? 4 : null),
    areaId: t.areaId,
  });
  const mudou =
    v.reservable !== t.reservable ||
    v.seatsMin !== t.seatsMin ||
    v.seatsMax !== t.seatsMax ||
    v.areaId !== t.areaId;
  const n = (s: string) => (s === "" ? null : Number(s));
  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-2 px-5 py-2.5">
      <label className="flex w-28 items-center gap-2 text-sm font-medium">
        <Switch
          checked={v.reservable}
          onCheckedChange={(r) => setV((x) => ({ ...x, reservable: r, seatsMax: x.seatsMax ?? 4 }))}
          aria-label={`Mesa ${t.number} aceita reserva`}
        />
        Mesa {t.number}
      </label>
      <Input
        aria-label="Lugares mínimo"
        type="number"
        min={1}
        max={99}
        placeholder="mín."
        value={v.seatsMin ?? ""}
        onChange={(e) => setV((x) => ({ ...x, seatsMin: n(e.target.value) }))}
        className="h-9 w-20"
      />
      <Input
        aria-label="Lugares máximo"
        type="number"
        min={1}
        max={99}
        placeholder="lugares"
        value={v.seatsMax ?? ""}
        onChange={(e) => setV((x) => ({ ...x, seatsMax: n(e.target.value) }))}
        className="h-9 w-24"
      />
      <select
        aria-label="Área"
        className={cn(selectCls, "h-9 w-36")}
        value={v.areaId ?? ""}
        onChange={(e) => setV((x) => ({ ...x, areaId: e.target.value || null }))}
      >
        <option value="">Sem área</option>
        {areas.map((a) => (
          <option key={a.id} value={a.id}>
            {a.name}
          </option>
        ))}
      </select>
      {mudou && (
        <Button
          size="sm"
          variant="outline"
          className="h-9"
          disabled={busy}
          onClick={() => onSave(v)}
        >
          Salvar
        </Button>
      )}
    </li>
  );
}

function ConfigBloqueios({
  slug,
  data,
  onDone,
}: {
  slug: string;
  data: Dados;
  onDone: () => void;
}) {
  const salvar = useServerFn(salvarExcecao);
  const remover = useServerFn(removerExcecao);
  const { busy, run } = useSalvar(onDone);
  const [f, setF] = useState({
    kind: "feriado" as "feriado" | "evento_privado" | "bloqueio",
    day: hoje(),
    from: "00:00",
    to: "23:59",
    tableId: "",
    reason: "",
  });
  const mesaNum = (id: string | null) =>
    id ? `Mesa ${data.tables.find((t) => t.id === id)?.number ?? "?"}` : "Restaurante inteiro";
  return (
    <Panel
      title="Feriados, eventos e bloqueios"
      description="Fecha horários para novas reservas. Reservas já feitas continuam; cancele-as no dia, com motivo, se precisar."
    >
      {data.exceptions.length > 0 ? (
        <ul className="mb-4 divide-y divide-border rounded-xl border border-border">
          {data.exceptions.map((e) => (
            <li
              key={e.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span>
                <strong className="font-medium">{EXCECAO[e.kind] ?? e.kind}</strong> ·{" "}
                {mesaNum(e.tableId)} · {diaCurto(localDay(new Date(e.start)))}{" "}
                {localTime(new Date(e.start))}–{diaCurto(localDay(new Date(e.end)))}{" "}
                {localTime(new Date(e.end))}
                {e.reason ? ` · ${e.reason}` : ""}
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-8"
                disabled={busy}
                onClick={() =>
                  run(() => remover({ data: { slug, id: e.id } }), "Bloqueio removido")
                }
              >
                Remover
              </Button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mb-3 text-sm text-muted-foreground">Nenhum bloqueio nos próximos meses.</p>
      )}
      <form
        className="grid grid-cols-2 gap-3 md:grid-cols-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const start = localInstant(f.day, f.from);
          const end = new Date(localInstant(f.day, f.to).getTime() + 60_000);
          await run(
            () =>
              salvar({
                data: {
                  slug,
                  kind: f.kind,
                  start: start.toISOString(),
                  end: end.toISOString(),
                  tableId: f.tableId || null,
                  reason: f.reason,
                },
              }),
            "Bloqueio salvo",
          );
        }}
      >
        <Campo label="Tipo" id="bq-tipo">
          <select
            id="bq-tipo"
            className={selectCls}
            value={f.kind}
            onChange={(e) => setF((x) => ({ ...x, kind: e.target.value as typeof f.kind }))}
          >
            {Object.entries(EXCECAO).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Dia" id="bq-dia">
          <Input
            id="bq-dia"
            type="date"
            value={f.day}
            onChange={(e) => setF((x) => ({ ...x, day: e.target.value }))}
            className="h-10"
            required
          />
        </Campo>
        <Campo label="De" id="bq-de">
          <Input
            id="bq-de"
            type="time"
            value={f.from}
            onChange={(e) => setF((x) => ({ ...x, from: e.target.value }))}
            className="h-10"
            required
          />
        </Campo>
        <Campo label="Até" id="bq-ate">
          <Input
            id="bq-ate"
            type="time"
            value={f.to}
            onChange={(e) => setF((x) => ({ ...x, to: e.target.value }))}
            className="h-10"
            required
          />
        </Campo>
        <Campo label="Onde" id="bq-mesa">
          <select
            id="bq-mesa"
            className={selectCls}
            value={f.tableId}
            onChange={(e) => setF((x) => ({ ...x, tableId: e.target.value }))}
          >
            <option value="">Restaurante inteiro</option>
            {data.tables
              .filter((t) => t.reservable)
              .map((t) => (
                <option key={t.id} value={t.id}>
                  Mesa {t.number}
                </option>
              ))}
          </select>
        </Campo>
        <Campo label="Motivo (opcional)" id="bq-motivo">
          <Input
            id="bq-motivo"
            value={f.reason}
            onChange={(e) => setF((x) => ({ ...x, reason: e.target.value }))}
            maxLength={200}
            className="h-10"
          />
        </Campo>
        <div className="col-span-2 flex justify-end md:col-span-6">
          <Button type="submit" size="sm" variant="ink" disabled={busy}>
            Bloquear horário
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function ConfigExperiencias({
  slug,
  data,
  onDone,
}: {
  slug: string;
  data: Dados;
  onDone: () => void;
}) {
  const salvar = useServerFn(salvarExperiencia);
  const { busy, run } = useSalvar(onDone);
  const vazio = {
    kind: "menu_degustacao" as "menu_degustacao" | "evento" | "grupo",
    title: "",
    description: "",
    partyMin: 2,
    partyMax: 8,
    price: "",
  };
  const [f, setF] = useState(vazio);
  return (
    <Panel
      title="Experiências"
      description="Menu degustação, eventos e grupos. Pré-pagamento pelo app fica desligado nesta versão."
    >
      {data.experiences.length > 0 && (
        <ul className="mb-4 divide-y divide-border rounded-xl border border-border">
          {data.experiences.map((x) => (
            <li
              key={x.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-sm"
            >
              <span className="min-w-0">
                <strong className="font-medium">{x.title}</strong> · {EXPERIENCIA[x.kind] ?? x.kind}{" "}
                · {x.partyMin}–{x.partyMax} pessoas
                {x.priceCents !== null
                  ? ` · ${(x.priceCents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })} por pessoa`
                  : ""}
              </span>
              <label className="flex items-center gap-2 text-xs text-muted-foreground">
                <Switch
                  checked={x.active}
                  disabled={busy}
                  onCheckedChange={(v) =>
                    run(
                      () =>
                        salvar({
                          data: {
                            slug,
                            id: x.id,
                            kind: x.kind as typeof f.kind,
                            title: x.title,
                            description: x.description ?? "",
                            partyMin: x.partyMin,
                            partyMax: x.partyMax,
                            priceCents: x.priceCents,
                            active: v,
                          },
                        }),
                      v ? "Experiência ativada" : "Experiência pausada",
                    )
                  }
                />
                {x.active ? "Ativa" : "Pausada"}
              </label>
            </li>
          ))}
        </ul>
      )}
      <form
        className="grid grid-cols-2 gap-3 md:grid-cols-6"
        onSubmit={async (e) => {
          e.preventDefault();
          const priceCents = f.price.trim()
            ? Math.round(Number(f.price.replace(",", ".")) * 100)
            : null;
          if (priceCents !== null && !Number.isFinite(priceCents)) {
            toast.error("Preço inválido");
            return;
          }
          const ok = await run(
            () =>
              salvar({
                data: {
                  slug,
                  kind: f.kind,
                  title: f.title,
                  description: f.description,
                  partyMin: f.partyMin,
                  partyMax: f.partyMax,
                  priceCents,
                  active: true,
                },
              }),
            "Experiência criada",
          );
          if (ok) setF(vazio);
        }}
      >
        <Campo label="Tipo" id="ex-tipo">
          <select
            id="ex-tipo"
            className={selectCls}
            value={f.kind}
            onChange={(e) => setF((x) => ({ ...x, kind: e.target.value as typeof f.kind }))}
          >
            {Object.entries(EXPERIENCIA).map(([k, l]) => (
              <option key={k} value={k}>
                {l}
              </option>
            ))}
          </select>
        </Campo>
        <Campo label="Nome" id="ex-nome" wide>
          <Input
            id="ex-nome"
            value={f.title}
            onChange={(e) => setF((x) => ({ ...x, title: e.target.value }))}
            maxLength={80}
            required
            className="h-10"
          />
        </Campo>
        <Campo label="Pessoas (mín.)" id="ex-min">
          <Input
            id="ex-min"
            type="number"
            min={1}
            max={99}
            value={f.partyMin}
            onChange={(e) => setF((x) => ({ ...x, partyMin: Number(e.target.value) }))}
            className="h-10"
          />
        </Campo>
        <Campo label="Pessoas (máx.)" id="ex-max">
          <Input
            id="ex-max"
            type="number"
            min={1}
            max={99}
            value={f.partyMax}
            onChange={(e) => setF((x) => ({ ...x, partyMax: Number(e.target.value) }))}
            className="h-10"
          />
        </Campo>
        <Campo label="Preço por pessoa (R$)" id="ex-preco">
          <Input
            id="ex-preco"
            inputMode="decimal"
            value={f.price}
            onChange={(e) => setF((x) => ({ ...x, price: e.target.value }))}
            placeholder="opcional"
            className="h-10"
          />
        </Campo>
        <Campo label="Descrição (opcional)" id="ex-desc" wide>
          <Input
            id="ex-desc"
            value={f.description}
            onChange={(e) => setF((x) => ({ ...x, description: e.target.value }))}
            maxLength={600}
            className="h-10"
          />
        </Campo>
        <div className="col-span-2 flex items-end justify-end md:col-span-4">
          <Button type="submit" size="sm" variant="ink" disabled={busy || !f.title.trim()}>
            <Plus />
            Criar experiência
          </Button>
        </div>
      </form>
    </Panel>
  );
}
