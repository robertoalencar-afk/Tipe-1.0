import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, CreditCard } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  brl,
  Btn,
  ConfirmAction,
  dateBR,
  DemoNote,
  PageHeader,
  Panel,
  Pill,
  Progress,
} from "@/components/tipe/crm/ui";
import { usage } from "@/lib/tipe/crm/engine";
import { PLAN_ORDER, PLANS } from "@/lib/tipe/crm/permissions";
import type { PlanId } from "@/lib/tipe/crm/types";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/crm/planos")({ component: Planos });

const LIMIT_LABEL = {
  users: "Usuários",
  contacts: "Contatos",
  pipelines: "Funis",
  whatsappInstances: "Números de WhatsApp",
} as const;
const SUB_LABEL = {
  teste: "Em teste grátis",
  ativa: "Ativa",
  em_atraso: "Pagamento em atraso",
  cancelada: "Cancelada",
} as const;

function Planos() {
  const { s, org, can, run } = useCrm();
  const { subscription: sub } = useOrgData();
  const billing = can("org.billing");
  const used = usage(s, org.id);
  const current = sub ? PLANS[sub.planId] : undefined;

  function fits(id: PlanId) {
    const p = PLANS[id];
    return (Object.keys(p.limits) as (keyof typeof p.limits)[])
      .filter((k) => used[k] > p.limits[k])
      .map((k) => LIMIT_LABEL[k].toLowerCase().replace("whatsapp", "WhatsApp"));
  }

  return (
    <div className="space-y-4">
      <PageHeader
        title="Planos"
        description="Escolha o plano da organização. Os limites valem na hora para convites, contatos, funis e números de WhatsApp."
      />
      <DemoNote>
        Contratação simulada: nenhuma cobrança real é feita e as faturas geradas são fictícias.{" "}
        {billing ? "" : "Só o proprietário pode mudar o plano."}
      </DemoNote>

      {sub && current && (
        <Panel
          title={`Plano atual: ${current.name}`}
          description={
            sub.status === "teste" && sub.trialEndsAt
              ? `Teste grátis até ${dateBR(sub.trialEndsAt)}`
              : sub.status === "cancelada" && sub.canceledAt
                ? `Cancelado em ${dateBR(sub.canceledAt)}`
                : `Renova em ${dateBR(sub.renewsAt)}`
          }
          actions={
            <Pill
              tone={
                sub.status === "ativa" ? "success" : sub.status === "teste" ? "info" : "warning"
              }
            >
              {SUB_LABEL[sub.status]}
            </Pill>
          }
        >
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {(Object.keys(LIMIT_LABEL) as (keyof typeof LIMIT_LABEL)[]).map((k) => {
              const max = current.limits[k];
              const pct = Math.min(100, Math.round((used[k] / max) * 100));
              return (
                <div key={k}>
                  <p className="flex justify-between text-xs">
                    <span className="text-muted-foreground">{LIMIT_LABEL[k]}</span>
                    <span className="tabular-nums">
                      {used[k].toLocaleString("pt-BR")} de {max.toLocaleString("pt-BR")}
                    </span>
                  </p>
                  <Progress
                    value={pct}
                    tone={pct >= 90 ? "warning" : "primary"}
                    className="mt-1.5"
                    label={`${LIMIT_LABEL[k]}: ${pct}%`}
                  />
                </div>
              );
            })}
          </div>
          <div className="mt-4 flex flex-wrap gap-2 border-t border-border pt-3">
            <Btn asChild variant="outline">
              <Link to="/crm/financeiro">
                <CreditCard className="h-4 w-4" />
                Ver faturas
              </Link>
            </Btn>
            {billing && sub.status !== "cancelada" && (
              <ConfirmAction
                title="Cancelar assinatura?"
                description="Com a assinatura cancelada, a equipe continua vendo os dados, mas não consegue criar contatos, convites, funis nem números novos até reativar."
                confirmLabel="Cancelar assinatura"
                onConfirm={() =>
                  run({ type: "cancelSubscription" }, "Assinatura cancelada (simulação)")
                }
                trigger={
                  <Btn variant="ghost" className="text-destructive">
                    Cancelar assinatura
                  </Btn>
                }
              />
            )}
            {billing && sub.status === "cancelada" && (
              <Btn
                onClick={() =>
                  run({ type: "reactivateSubscription" }, `Assinatura ${current.name} reativada`)
                }
              >
                Reativar {current.name}
              </Btn>
            )}
          </div>
        </Panel>
      )}

      <ul className="grid gap-3 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => {
          const p = PLANS[id];
          const isCurrent = sub?.planId === id;
          const blockers = fits(id);
          const up = current ? PLAN_ORDER.indexOf(id) > PLAN_ORDER.indexOf(current.id) : true;
          const label = isCurrent
            ? sub?.status === "ativa"
              ? "Plano atual"
              : `Assinar ${p.name}`
            : up
              ? `Fazer upgrade para ${p.name}`
              : `Mudar para ${p.name}`;
          const disabled =
            !billing || (isCurrent && sub?.status === "ativa") || blockers.length > 0;
          return (
            <li
              key={id}
              className={cn(
                "crm-panel flex flex-col p-4",
                isCurrent && "ring-1 ring-primary/60",
                id === "professional" && !isCurrent && "border-primary/30",
              )}
            >
              <div className="flex items-center justify-between">
                <h2 className="font-display text-base font-semibold">{p.name}</h2>
                {id === "professional" && <Pill tone="primary">Mais escolhido</Pill>}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">{p.description}</p>
              <p className="mt-3 font-display text-2xl font-semibold tabular-nums">
                {brl(p.priceMonthly)}
                <span className="text-xs font-normal text-muted-foreground"> por mês</span>
              </p>
              <ul className="mt-3 space-y-1.5 text-xs">
                {p.features.map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" aria-hidden />
                    {f}
                  </li>
                ))}
                <li className="pt-1 text-muted-foreground">
                  {p.limits.users} usuários · {p.limits.contacts.toLocaleString("pt-BR")} contatos ·{" "}
                  {p.limits.pipelines} {p.limits.pipelines > 1 ? "funis" : "funil"} ·{" "}
                  {p.limits.whatsappInstances}{" "}
                  {p.limits.whatsappInstances > 1 ? "números" : "número"}
                </li>
              </ul>
              <div className="mt-auto pt-4">
                {blockers.length > 0 && !isCurrent && (
                  <p className="mb-2 text-[0.7rem] text-warning">
                    O uso atual passa do limite em {blockers.join(", ")}.
                  </p>
                )}
                <ConfirmAction
                  destructive={false}
                  title={`${label}?`}
                  description={`Contratação simulada de ${brl(p.priceMonthly)} por mês. Uma fatura fictícia paga é gerada e os novos limites valem na hora.`}
                  confirmLabel={label}
                  onConfirm={() => run({ type: "changePlan", planId: id })}
                  trigger={
                    <Btn
                      className="w-full"
                      variant={isCurrent ? "outline" : "default"}
                      disabled={disabled}
                    >
                      {label}
                    </Btn>
                  }
                />
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
