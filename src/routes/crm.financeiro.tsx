import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { AlertTriangle, CalendarClock, Receipt, Wallet } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { NoAccess, useCrm, useOrgData } from "@/components/tipe/crm/context";
import {
  brl,
  Btn,
  dateBR,
  DemoNote,
  Empty,
  Kpi,
  PageHeader,
  Panel,
  Pill,
  Segmented,
} from "@/components/tipe/crm/ui";
import { PLANS } from "@/lib/tipe/crm/permissions";
import type { Invoice } from "@/lib/tipe/crm/types";

export const Route = createFileRoute("/crm/financeiro")({ component: Financeiro });

const STATUS: Record<
  Invoice["status"],
  { label: string; tone: "success" | "info" | "danger" | "neutral" }
> = {
  paga: { label: "Paga", tone: "success" },
  aberta: { label: "Em aberto", tone: "info" },
  vencida: { label: "Vencida", tone: "danger" },
  cancelada: { label: "Cancelada", tone: "neutral" },
};

function Financeiro() {
  const { org, can, run } = useCrm();
  const { invoices, subscription: sub } = useOrgData();
  const now = useMemo(() => new Date().toISOString(), []);
  const [filter, setFilter] = useState<"todas" | "pendentes" | "pagas">("todas");
  const [open, setOpen] = useState<Invoice | null>(null);
  if (!can("finance.view")) return <NoAccess what="financeiro" />;

  const billing = can("org.billing");
  const sorted = [...invoices].sort((a, b) => b.issuedAt.localeCompare(a.issuedAt));
  const list = sorted.filter(
    (i) =>
      filter === "todas" ||
      (filter === "pagas" ? i.status === "paga" : i.status === "aberta" || i.status === "vencida"),
  );
  const year = now.slice(0, 4);
  const paidYear = invoices
    .filter((i) => i.status === "paga" && i.paidAt?.startsWith(year))
    .reduce((a, i) => a + i.amount, 0);
  const pending = invoices.filter((i) => i.status === "aberta" || i.status === "vencida");
  const overdue = invoices.filter((i) => i.status === "vencida");
  const mrr =
    sub && (sub.status === "ativa" || sub.status === "em_atraso")
      ? PLANS[sub.planId].priceMonthly
      : 0;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Financeiro"
        description="Assinatura e faturas da organização no CRM."
        actions={
          <Btn asChild variant="outline">
            <Link to="/crm/planos">Mudar de plano</Link>
          </Btn>
        }
      />
      <DemoNote>
        Faturas fictícias, geradas pela contratação simulada. Nenhum valor é cobrado e nenhum dado
        de cartão é pedido.
      </DemoNote>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Kpi
          icon={Wallet}
          label="Mensalidade atual"
          value={mrr ? brl(mrr) : "Sem cobrança"}
          hint={
            sub
              ? `${PLANS[sub.planId].name}${sub.status === "teste" ? " em teste" : ""}`
              : undefined
          }
        />
        <Kpi
          icon={Receipt}
          label={`Pago em ${year}`}
          value={brl(paidYear)}
          hint={`${invoices.filter((i) => i.status === "paga" && i.paidAt?.startsWith(year)).length} faturas`}
        />
        <Kpi
          icon={AlertTriangle}
          label="Em aberto"
          value={brl(pending.reduce((a, i) => a + i.amount, 0))}
          tone={overdue.length ? "danger" : "default"}
          hint={overdue.length ? `${overdue.length} vencida(s)` : "Nada vencido"}
        />
        <Kpi
          icon={CalendarClock}
          label="Próxima renovação"
          value={sub && sub.status !== "cancelada" ? dateBR(sub.renewsAt) : "Sem renovação"}
          hint={sub?.status === "cancelada" ? "Assinatura cancelada" : undefined}
        />
      </div>

      <Panel
        title="Faturas"
        actions={
          <Segmented
            label="Filtrar faturas"
            value={filter}
            onChange={setFilter}
            options={[
              { value: "todas", label: "Todas" },
              { value: "pendentes", label: `Pendentes (${pending.length})` },
              { value: "pagas", label: "Pagas" },
            ]}
          />
        }
        bodyClassName="p-0"
      >
        {list.length === 0 ? (
          <div className="p-4">
            <Empty
              icon={Receipt}
              title="Nenhuma fatura aqui"
              text="As faturas aparecem quando a organização contrata ou renova um plano."
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {list.map((i) => (
              <li
                key={i.id}
                className="grid gap-1 px-4 py-3 sm:grid-cols-[minmax(0,1fr)_7rem_6rem_auto] sm:items-center sm:gap-3"
              >
                <button
                  type="button"
                  onClick={() => setOpen(i)}
                  className="min-w-0 text-left hover:underline"
                >
                  <span className="block truncate text-sm font-medium">{i.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {i.number} · emitida em {dateBR(i.issuedAt)} · vence {dateBR(i.dueAt)}
                  </span>
                </button>
                <span className="text-sm font-semibold tabular-nums sm:text-right">
                  {brl(i.amount)}
                </span>
                <span>
                  <Pill tone={STATUS[i.status].tone}>{STATUS[i.status].label}</Pill>
                </span>
                <span className="flex justify-end">
                  {billing && (i.status === "aberta" || i.status === "vencida") ? (
                    <Btn onClick={() => run({ type: "payInvoice", id: i.id })}>
                      Pagar (simulado)
                    </Btn>
                  ) : (
                    <Btn variant="ghost" onClick={() => setOpen(i)}>
                      Detalhes
                    </Btn>
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <Dialog open={!!open} onOpenChange={(o) => !o && setOpen(null)}>
        <DialogContent className="max-w-md rounded-xl">
          {open && (
            <>
              <DialogHeader>
                <DialogTitle className="font-display text-base">Fatura {open.number}</DialogTitle>
                <DialogDescription className="text-xs">
                  Documento fictício, sem valor fiscal.
                </DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                <dt className="text-muted-foreground">Organização</dt>
                <dd>{org.name}</dd>
                <dt className="text-muted-foreground">Descrição</dt>
                <dd>{open.description}</dd>
                <dt className="text-muted-foreground">Valor</dt>
                <dd className="font-semibold">{brl(open.amount)}</dd>
                <dt className="text-muted-foreground">Emissão</dt>
                <dd>{dateBR(open.issuedAt)}</dd>
                <dt className="text-muted-foreground">Vencimento</dt>
                <dd>{dateBR(open.dueAt)}</dd>
                <dt className="text-muted-foreground">Situação</dt>
                <dd>
                  <Pill tone={STATUS[open.status].tone}>{STATUS[open.status].label}</Pill>
                </dd>
                {open.paidAt && (
                  <>
                    <dt className="text-muted-foreground">Pagamento</dt>
                    <dd>{dateBR(open.paidAt)} (simulado)</dd>
                  </>
                )}
              </dl>
              <div className="flex justify-end gap-2">
                <Btn variant="ghost" onClick={() => setOpen(null)}>
                  Fechar
                </Btn>
                <Btn variant="outline" onClick={() => window.print()}>
                  Imprimir
                </Btn>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
