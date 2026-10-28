import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { Building2, CircleDollarSign, Hourglass, ShieldAlert, UserX, Users } from "lucide-react";
import { NoAccess, useCrm } from "@/components/tipe/crm/context";
import {
  brl,
  dateBR,
  dateTimeBR,
  DemoNote,
  Kpi,
  PageHeader,
  Panel,
  Pill,
  SearchInput,
  Segmented,
} from "@/components/tipe/crm/ui";
import { usage } from "@/lib/tipe/crm/engine";
import { PLANS, ROLE_LABEL } from "@/lib/tipe/crm/permissions";

export const Route = createFileRoute("/crm/admin")({ component: Admin });

const SUB_LABEL = {
  teste: "Em teste",
  ativa: "Ativa",
  em_atraso: "Em atraso",
  cancelada: "Cancelada",
} as const;
const SUB_TONE = {
  teste: "info",
  ativa: "success",
  em_atraso: "warning",
  cancelada: "danger",
} as const;

/** Administração global da plataforma: só a equipe Tipe (platformAdmin) enxerga todas as organizações. */
function Admin() {
  const { s, me } = useCrm();
  const now = useMemo(() => new Date().toISOString(), []);
  const [tab, setTab] = useState<"orgs" | "usuarios" | "auditoria">("orgs");
  const [q, setQ] = useState("");
  const [onlyDenied, setOnlyDenied] = useState(false);
  if (!me.platformAdmin) return <NoAccess what="administração da plataforma" />;

  const subs = s.subscriptions;
  const mrr = subs
    .filter((x) => x.status === "ativa" || x.status === "em_atraso")
    .reduce((a, x) => a + PLANS[x.planId].priceMonthly, 0);
  const trials = subs.filter((x) => x.status === "teste");
  const canceled = subs.filter((x) => x.status === "cancelada");
  const overdue = s.invoices.filter((i) => i.status === "vencida");
  const denied = s.audit.filter((a) => a.result === "negado");
  const term = q.trim().toLowerCase();
  const orgName = (id: string | null) =>
    id ? (s.orgs.find((o) => o.id === id)?.name ?? "Organização removida") : "Plataforma";
  const userName = (id: string | null) =>
    id ? (s.users.find((u) => u.id === id)?.name ?? "Usuário removido") : "Sistema";

  return (
    <div className="space-y-4">
      <PageHeader
        eyebrow="Plataforma"
        title="Administração"
        description="Visão de todas as organizações, assinaturas, uso e auditoria. Só a equipe Tipe tem acesso."
      />
      <DemoNote>
        Em produção esta área lê os dados por uma função do servidor que confere o papel de
        administrador da plataforma; aqui ela lê o estado de demonstração deste navegador.
      </DemoNote>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <Kpi
          icon={CircleDollarSign}
          label="Receita recorrente (MRR)"
          value={brl(mrr)}
          hint={`${subs.filter((x) => x.status === "ativa").length} assinaturas ativas`}
        />
        <Kpi
          icon={Building2}
          label="Organizações"
          value={String(s.orgs.length)}
          hint={`${s.orgs.filter((o) => o.status === "ativa").length} ativas`}
        />
        <Kpi
          icon={Hourglass}
          label="Em teste"
          value={String(trials.length)}
          hint={
            trials[0]?.trialEndsAt
              ? `Próximo fim: ${dateBR(trials.map((t) => t.trialEndsAt ?? "").sort()[0] ?? now)}`
              : undefined
          }
        />
        <Kpi
          icon={UserX}
          label="Cancelamentos"
          value={String(canceled.length)}
          tone={canceled.length ? "warning" : "default"}
          hint={`${overdue.length} faturas vencidas`}
        />
        <Kpi
          icon={ShieldAlert}
          label="Acessos negados"
          value={String(denied.length)}
          tone={denied.length ? "warning" : "default"}
          hint="Tentativas barradas pelas permissões"
        />
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Segmented
          label="Seção"
          value={tab}
          onChange={setTab}
          options={[
            { value: "orgs", label: "Organizações" },
            { value: "usuarios", label: "Usuários" },
            { value: "auditoria", label: "Auditoria" },
          ]}
        />
        <SearchInput value={q} onChange={setQ} placeholder="Buscar" className="sm:w-64" />
      </div>

      {tab === "orgs" && (
        <Panel bodyClassName="overflow-x-auto p-0">
          <table className="w-full min-w-[46rem] text-xs">
            <thead className="text-left text-muted-foreground">
              <tr className="border-b border-border">
                <th className="px-4 py-2 font-medium">Organização</th>
                <th className="px-2 py-2 font-medium">Plano</th>
                <th className="px-2 py-2 font-medium">Assinatura</th>
                <th className="px-2 py-2 text-right font-medium">Usuários</th>
                <th className="px-2 py-2 text-right font-medium">Contatos</th>
                <th className="px-2 py-2 text-right font-medium">Oportunidades</th>
                <th className="px-2 py-2 text-right font-medium">Conversas</th>
                <th className="px-4 py-2 font-medium">Criada</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {s.orgs
                .filter((o) => !term || o.name.toLowerCase().includes(term))
                .map((o) => {
                  const sub = subs.find((x) => x.orgId === o.id);
                  const u = usage(s, o.id);
                  const plan = sub ? PLANS[sub.planId] : undefined;
                  return (
                    <tr key={o.id}>
                      <td className="px-4 py-2">
                        <span className="font-medium">{o.name}</span>
                        <span className="block text-muted-foreground">{o.segment}</span>
                      </td>
                      <td className="px-2 py-2">
                        {plan ? `${plan.name} · ${brl(plan.priceMonthly)}` : "Sem plano"}
                      </td>
                      <td className="px-2 py-2">
                        {sub ? (
                          <Pill tone={SUB_TONE[sub.status]}>{SUB_LABEL[sub.status]}</Pill>
                        ) : (
                          "–"
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {u.users}
                        {plan && (
                          <span className="text-muted-foreground">/{plan.limits.users}</span>
                        )}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">{u.contacts}</td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {s.deals.filter((d) => d.orgId === o.id).length}
                      </td>
                      <td className="px-2 py-2 text-right tabular-nums">
                        {s.conversations.filter((c) => c.orgId === o.id).length}
                      </td>
                      <td className="px-4 py-2">{dateBR(o.createdAt)}</td>
                    </tr>
                  );
                })}
            </tbody>
          </table>
        </Panel>
      )}

      {tab === "usuarios" && (
        <Panel bodyClassName="p-0">
          <ul className="divide-y divide-border">
            {s.users
              .filter(
                (u) =>
                  !term ||
                  u.name.toLowerCase().includes(term) ||
                  u.email.toLowerCase().includes(term),
              )
              .map((u) => {
                const ms = s.memberships.filter((m) => m.userId === u.id);
                return (
                  <li
                    key={u.id}
                    className="grid gap-1 px-4 py-2.5 sm:grid-cols-[minmax(0,1fr)_minmax(0,1.4fr)] sm:items-center"
                  >
                    <span className="min-w-0">
                      <span className="block truncate text-sm">
                        {u.name}
                        {u.platformAdmin && (
                          <Pill tone="primary" className="ml-1.5">
                            Equipe Tipe
                          </Pill>
                        )}
                      </span>
                      <span className="text-xs text-muted-foreground">{u.email}</span>
                    </span>
                    <span className="flex flex-wrap gap-1">
                      {ms.map((m) => (
                        <Pill key={m.id} tone={m.status === "ativo" ? "neutral" : "danger"}>
                          {orgName(m.orgId)} · {ROLE_LABEL[m.role]}
                          {m.status !== "ativo" ? " (sem acesso)" : ""}
                        </Pill>
                      ))}
                      {!ms.length && (
                        <span className="text-xs text-muted-foreground">Sem organização</span>
                      )}
                    </span>
                  </li>
                );
              })}
          </ul>
          <p className="border-t border-border px-4 py-2 text-xs text-muted-foreground">
            <Users className="mr-1 inline h-3.5 w-3.5" aria-hidden />
            {s.users.length} usuários na plataforma
          </p>
        </Panel>
      )}

      {tab === "auditoria" && (
        <Panel
          actions={
            <label className="flex items-center gap-1.5 text-xs">
              <input
                type="checkbox"
                checked={onlyDenied}
                onChange={(e) => setOnlyDenied(e.target.checked)}
                className="accent-[var(--primary)]"
              />
              Só acessos negados
            </label>
          }
          bodyClassName="p-0"
        >
          <ul className="divide-y divide-border">
            {s.audit
              .filter(
                (a) =>
                  (!onlyDenied || a.result === "negado") &&
                  (!term ||
                    `${a.action} ${a.target} ${userName(a.actorId)} ${orgName(a.orgId)}`
                      .toLowerCase()
                      .includes(term)),
              )
              .slice(0, 150)
              .map((a) => (
                <li
                  key={a.id}
                  className="grid gap-1 px-4 py-2 text-xs sm:grid-cols-[9rem_minmax(0,1fr)_auto] sm:items-center sm:gap-3"
                >
                  <span className="text-muted-foreground">{dateTimeBR(a.at)}</span>
                  <span className="min-w-0">
                    <code className="text-primary">{a.action}</code>{" "}
                    <span className="break-words">{a.target}</span>
                    <span className="block text-muted-foreground">
                      {userName(a.actorId)} · {orgName(a.orgId)}
                    </span>
                  </span>
                  <Pill tone={a.result === "ok" ? "success" : "danger"}>
                    {a.result === "ok" ? "Permitido" : "Negado"}
                  </Pill>
                </li>
              ))}
          </ul>
        </Panel>
      )}
    </div>
  );
}
