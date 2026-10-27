import { useMemo, useState } from "react";
import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowUpRight, ListChecks, Store } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { AccountStatusPill, HealthPill, LayerTag } from "@/components/tipe/crm/eco";
import {
  Avatar,
  brlShort,
  DeltaBadge,
  Empty,
  PageHeader,
  Panel,
  Pill,
  Progress,
  relative,
  SearchInput,
  Segmented,
  Select,
} from "@/components/tipe/crm/ui";
import {
  accountHealth,
  accountVisits,
  lastDays,
  onboardingProgress,
  restaurantPlan,
  usageSummary,
} from "@/lib/tipe/crm/ecosystem";
import type { AccountStatus } from "@/lib/tipe/crm/types";

// Camada B: carteira de restaurantes que já assinaram a Tipe.
export const Route = createFileRoute("/crm/contas/")({
  validateSearch: z.object({
    visao: z.enum(["carteira", "implantacao"]).optional().catch(undefined),
  }),
  component: Contas,
});

const DAY = 864e5;
type StatusFilter = "todas" | AccountStatus;

function Contas() {
  const { s, user } = useCrm();
  const d = useOrgData();
  const { visao = "carteira" } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<StatusFilter>("todas");
  const [csm, setCsm] = useState("");
  const now = useMemo(() => new Date().toISOString(), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const t = new Date(now).getTime();

  const rows = useMemo(
    () =>
      d.accounts.map((a) => {
        const u30 = usageSummary(accountVisits(s, a.id, lastDays(30, now)));
        // Variação: últimos 14 dias contra os 14 anteriores, só para contas ativas há 28 dias ou mais.
        const cur14 = accountVisits(s, a.id, lastDays(14, now)).length;
        const prev14 = accountVisits(s, a.id, { from: t - 28 * DAY, to: t - 14 * DAY }).length;
        const comparable =
          !!a.activatedAt && new Date(a.activatedAt).getTime() <= t - 28 * DAY && prev14 > 0;
        return {
          a,
          h: accountHealth(s, a, now),
          u30,
          trend: comparable ? Math.round(((cur14 - prev14) / prev14) * 100) : null,
          prog: onboardingProgress(a),
          tickets: d.tickets.filter((x) => x.accountId === a.id && x.status !== "resolvido").length,
        };
      }),
    [s, d.accounts, d.tickets, now, t],
  );

  const csms = [...new Set(d.accounts.map((a) => a.csmId))];
  const term = q.trim().toLowerCase();
  const filtered = rows
    .filter((r) => (visao === "implantacao" ? r.a.status === "implantacao" : true))
    .filter((r) => status === "todas" || r.a.status === status)
    .filter((r) => !csm || r.a.csmId === csm)
    .filter(
      (r) =>
        !term ||
        r.a.name.toLowerCase().includes(term) ||
        r.a.neighborhood.toLowerCase().includes(term) ||
        r.a.segment.toLowerCase().includes(term),
    )
    .sort((x, y) =>
      visao === "implantacao"
        ? x.a.createdAt.localeCompare(y.a.createdAt)
        : (x.h.score ?? 200) - (y.h.score ?? 200),
    );

  const count = (st: AccountStatus) => d.accounts.filter((a) => a.status === st).length;
  const mrr = d.accounts
    .filter((a) => a.status === "ativa")
    .reduce((acc, a) => acc + restaurantPlan(a.plan).price, 0);
  const risky = rows.filter((r) => r.h.label === "Em risco").length;

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Camada B · Restaurantes"
        title="Contas de restaurante"
        description="Cada negócio ganho no comercial vira uma conta aqui. Implantação, módulos, uso e saúde de cada restaurante que usa a Tipe."
        actions={
          <Segmented
            label="Visão"
            value={visao}
            onChange={(v) => navigate({ search: { visao: v === "carteira" ? undefined : v } })}
            options={[
              { value: "carteira", label: "Carteira" },
              { value: "implantacao", label: `Implantação (${count("implantacao")})` },
            ]}
          />
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Ativas"
          value={String(count("ativa"))}
          hint={`${brlShort(mrr)} por mês em planos`}
        />
        <Stat
          label="Em implantação"
          value={String(count("implantacao"))}
          hint="Do contrato à primeira conta paga"
        />
        <Stat
          label="Em risco"
          value={String(risky)}
          hint="Uso caindo, nota baixa ou chamados"
          danger={risky > 0}
        />
        <Stat
          label="Pausadas ou canceladas"
          value={String(count("pausada") + count("cancelada"))}
          hint="Com motivo registrado"
        />
      </div>

      <Panel bodyClassName="p-0">
        <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
          <SearchInput
            value={q}
            onChange={setQ}
            placeholder="Buscar restaurante, bairro ou segmento"
            className="sm:max-w-xs sm:flex-1"
          />
          <Select
            aria-label="Status"
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusFilter)}
            className="sm:w-44"
          >
            <option value="todas">Todos os status</option>
            <option value="ativa">Ativas</option>
            <option value="implantacao">Em implantação</option>
            <option value="pausada">Pausadas</option>
            <option value="cancelada">Canceladas</option>
          </Select>
          <Select
            aria-label="Responsável"
            value={csm}
            onChange={(e) => setCsm(e.target.value)}
            className="sm:w-52"
          >
            <option value="">Todos os responsáveis</option>
            {csms.map((id) => (
              <option key={id} value={id}>
                {user(id)?.name ?? "Sem nome"}
              </option>
            ))}
          </Select>
          <span className="text-xs text-muted-foreground sm:ml-auto">
            {filtered.length} de {d.accounts.length}
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-5">
            <Empty
              icon={Store}
              title={d.accounts.length ? "Nenhuma conta com esses filtros" : "Nenhuma conta ainda"}
              text={
                d.accounts.length
                  ? "Limpe a busca ou troque o status para ver mais restaurantes."
                  : "Quando uma oportunidade é ganha no comercial, a conta do restaurante aparece aqui com a implantação já iniciada."
              }
            />
          </div>
        ) : visao === "implantacao" ? (
          <ul className="divide-y divide-border">
            {filtered.map(({ a, prog }) => (
              <li key={a.id}>
                <Link
                  to="/crm/contas/$id"
                  params={{ id: a.id }}
                  className="flex flex-col gap-3 px-4 py-3.5 hover:bg-muted/50 sm:flex-row sm:items-center"
                >
                  <div className="min-w-0 sm:w-64">
                    <p className="truncate text-sm font-semibold">{a.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {[a.segment, a.neighborhood].filter(Boolean).join(" · ")} · desde{" "}
                      {relative(a.createdAt)}
                    </p>
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center justify-between text-xs">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <ListChecks className="h-3.5 w-3.5" />
                        Próximo passo:{" "}
                        <span className="font-medium text-foreground">
                          {prog.next?.label ?? "Concluída"}
                        </span>
                      </span>
                      <span className="tabular-nums text-muted-foreground">
                        {prog.done}/{prog.total}
                      </span>
                    </div>
                    <Progress value={prog.pct} label={`Implantação de ${a.name}`} />
                  </div>
                  <span className="flex items-center gap-2 sm:w-44 sm:justify-end">
                    <Avatar name={user(a.csmId)?.name ?? "?"} className="h-6 w-6 text-[0.6rem]" />
                    <span className="truncate text-xs">{user(a.csmId)?.name}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <thead>
                <tr className="text-left text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                  <th className="px-4 py-2.5 font-semibold">Restaurante</th>
                  <th className="px-3 py-2.5 font-semibold">Status</th>
                  <th className="px-3 py-2.5 font-semibold">Saúde</th>
                  <th className="px-3 py-2.5 font-semibold">Plano</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Contas 30d</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Volume 30d</th>
                  <th className="px-3 py-2.5 font-semibold">Responsável</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map(({ a, h, u30, trend, prog, tickets }) => (
                  <tr key={a.id} className="hover:bg-muted/50">
                    <td className="px-4 py-3">
                      <Link
                        to="/crm/contas/$id"
                        params={{ id: a.id }}
                        className="group flex items-center gap-2"
                      >
                        <span className="min-w-0">
                          <span className="flex items-center gap-1 font-semibold group-hover:underline">
                            {a.name}
                            <ArrowUpRight className="h-3 w-3 opacity-0 group-hover:opacity-60" />
                          </span>
                          <span className="block text-xs text-muted-foreground">
                            {[a.segment, a.neighborhood].filter(Boolean).join(" · ")}
                            {tickets > 0 && ` · ${tickets} chamado${tickets > 1 ? "s" : ""}`}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-3 py-3">
                      <AccountStatusPill status={a.status} />
                      {a.status === "implantacao" && (
                        <span className="mt-1 block text-[0.68rem] text-muted-foreground">
                          {prog.done}/{prog.total} etapas
                        </span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      {h.score !== null ? (
                        <HealthPill h={h} />
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <Pill>
                        {restaurantPlan(a.plan).name} · {a.tables} mesas
                      </Pill>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">
                      <span
                        className="inline-flex items-center gap-1.5"
                        title="Variação: últimos 14 dias contra os 14 anteriores"
                      >
                        {u30.bills.toLocaleString("pt-BR")}
                        {trend !== null && <DeltaBadge value={trend} good={trend >= 0} />}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{brlShort(u30.gmv)}</td>
                    <td className="px-3 py-3">
                      <span className="flex items-center gap-2">
                        <Avatar
                          name={user(a.csmId)?.name ?? "?"}
                          className="h-6 w-6 text-[0.6rem]"
                        />
                        <span className="truncate text-xs">{user(a.csmId)?.name}</span>
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LayerTag layer="B" />
        Saúde de 0 a 100: tendência de uso em 14 dias, avaliação média, chamados abertos e dias com
        movimento na semana.
      </p>
    </div>
  );
}

function Stat({
  label,
  value,
  hint,
  danger,
}: {
  label: string;
  value: string;
  hint: string;
  danger?: boolean | undefined;
}) {
  return (
    <div className="crm-panel p-4">
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p
        className={`mt-1.5 font-display text-[1.9rem] font-semibold leading-none tracking-tight ${danger ? "text-destructive" : ""}`}
      >
        {value}
      </p>
      <p className="mt-2 truncate text-[0.72rem] text-muted-foreground">{hint}</p>
    </div>
  );
}
