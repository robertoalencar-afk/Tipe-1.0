import { useMemo, useState } from "react";
import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Handshake, X } from "lucide-react";
import { NoAccess, useCrm, useOrgData } from "@/components/tipe/crm/context";
import { LayerTag } from "@/components/tipe/crm/eco";
import {
  EnrollmentDetail,
  FpStatusPill,
  InviteForm,
  RulesSummary,
} from "@/components/tipe/crm/fundador";
import {
  dateBR,
  DemoNote,
  Empty,
  IconBtn,
  PageHeader,
  Panel,
  relative,
  SearchInput,
  Select,
} from "@/components/tipe/crm/ui";
import {
  FP_STATUS,
  FP_STATUS_ORDER,
  isActiveMember,
  statusCounts,
} from "@/lib/tipe/crm/founding-partner";
import type { FoundingPartnerStatus } from "@/lib/tipe/crm/types";

// Camada B: programa Restaurante Fundador. Lista filtrável por estado, ficha de cada adesão
// com mudança de estado confirmada pelo nome do restaurante e trilha de auditoria.
// Regras comerciais nascem vazias: nada de vaga, prazo, preço ou vantagem sem aprovação.
export const Route = createFileRoute("/crm/fundador")({
  validateSearch: z.object({
    estado: z.enum(FP_STATUS_ORDER as [FoundingPartnerStatus, ...FoundingPartnerStatus[]]).optional().catch(undefined),
    conta: z.string().optional().catch(undefined),
  }),
  head: () => ({ meta: [{ title: "Restaurante Fundador | Tipe" }] }),
  component: Fundador,
});

function Fundador() {
  const { s, org, can, user } = useCrm();
  const d = useOrgData();
  const { estado, conta } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [q, setQ] = useState("");

  const list = useMemo(
    () => s.foundingPartners.filter((e) => e.orgId === org.id),
    [s.foundingPartners, org.id],
  );
  const accountsById = useMemo(() => new Map(d.accounts.map((a) => [a.id, a])), [d.accounts]);

  if (!can("founding.view")) return <NoAccess what="o programa Restaurante Fundador" />;
  if (!org.tipePlatform)
    return (
      <div className="space-y-5">
        <PageHeader eyebrow="Camada B · Restaurantes" title="Restaurante Fundador" />
        <Empty
          icon={Handshake}
          title="Programa da organização Tipe"
          text="O Restaurante Fundador é operado pela equipe da Tipe. Troque para a organização Tipe Comercial para ver as adesões."
        />
      </div>
    );

  const counts = statusCounts(list);
  const term = q.trim().toLowerCase();
  const rows = list
    .map((e) => ({ e, a: accountsById.get(e.accountId) }))
    .filter((r): r is { e: (typeof list)[number]; a: NonNullable<typeof r.a> } => !!r.a)
    .filter((r) => !estado || r.e.status === estado)
    .filter((r) => !term || r.a.name.toLowerCase().includes(term) || r.a.neighborhood.toLowerCase().includes(term))
    .sort(
      (x, y) =>
        FP_STATUS_ORDER.indexOf(x.e.status) - FP_STATUS_ORDER.indexOf(y.e.status) ||
        y.e.statusChangedAt.localeCompare(x.e.statusChangedAt),
    );
  const selected = conta ? list.find((e) => e.accountId === conta) : undefined;
  const selectedAccount = selected ? accountsById.get(selected.accountId) : undefined;
  const invitable = d.accounts
    .filter((a) => a.status !== "cancelada")
    .filter((a) => {
      const e = list.find((x) => x.accountId === a.id);
      return !e || e.status === "encerrado";
    })
    .sort((x, y) => x.name.localeCompare(y.name, "pt-BR"));
  const active = list.filter((e) => isActiveMember(e.status)).length;

  const setEstado = (v: FoundingPartnerStatus | undefined) =>
    navigate({ search: (p) => ({ ...p, estado: v }) });
  const open = (accountId: string | undefined) =>
    navigate({ search: (p) => ({ ...p, conta: accountId }) });

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Camada B · Restaurantes"
        title="Restaurante Fundador"
        description="Parceria com os primeiros restaurantes que usam a Tipe: convite, aceite dos termos, participação e piloto, com cada mudança registrada."
      />

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel
          title="Regras comerciais"
          description="Vazias até a aprovação comercial. Nada aqui é prometido ao restaurante."
          className="xl:col-span-2"
        >
          <RulesSummary />
        </Panel>
        <Panel title="Registrar convite" description="Contas sem adesão em andamento">
          {can("founding.manage") ? (
            invitable.length ? (
              <InviteForm accounts={invitable} onDone={() => undefined} />
            ) : (
              <p className="text-sm text-muted-foreground">
                Todas as contas ativas ou em implantação já estão no programa.
              </p>
            )
          ) : (
            <p className="text-sm text-muted-foreground">
              Seu papel permite consultar o programa, sem convidar nem mudar estados.
            </p>
          )}
        </Panel>
      </div>

      <div
        role="radiogroup"
        aria-label="Filtrar por estado"
        className="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1"
      >
        <StateChip on={!estado} onClick={() => setEstado(undefined)} label="Todos" n={list.length} />
        {FP_STATUS_ORDER.map((st) => (
          <StateChip
            key={st}
            on={estado === st}
            onClick={() => setEstado(estado === st ? undefined : st)}
            label={FP_STATUS[st].label}
            n={counts[st]}
          />
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5 xl:items-start">
        <Panel bodyClassName="p-0" className="xl:col-span-3">
          <div className="flex flex-col gap-2 border-b border-border p-4 sm:flex-row sm:items-center">
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Buscar restaurante ou bairro"
              className="sm:max-w-xs sm:flex-1"
            />
            <Select
              aria-label="Estado"
              value={estado ?? ""}
              onChange={(e) => setEstado((e.target.value || undefined) as FoundingPartnerStatus | undefined)}
              className="sm:w-52"
            >
              <option value="">Todos os estados</option>
              {FP_STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {FP_STATUS[st].label}
                </option>
              ))}
            </Select>
            <span className="text-xs text-muted-foreground sm:ml-auto">
              {rows.length} de {list.length} · {active} participando
            </span>
          </div>
          {rows.length === 0 ? (
            <div className="p-5">
              <Empty
                icon={Handshake}
                title={list.length ? "Nenhuma adesão com esses filtros" : "Nenhum restaurante convidado ainda"}
                text={
                  list.length
                    ? "Limpe a busca ou escolha outro estado."
                    : "Registre o primeiro convite ao lado. A adesão começa como Convidado e cada passo fica na trilha."
                }
                action={
                  list.length && (estado || term) ? (
                    <button
                      type="button"
                      className="text-xs font-semibold text-primary hover:underline"
                      onClick={() => {
                        setQ("");
                        setEstado(undefined);
                      }}
                    >
                      Limpar filtros
                    </button>
                  ) : undefined
                }
              />
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {rows.map(({ e, a }) => (
                <li key={e.id}>
                  <button
                    type="button"
                    onClick={() => open(a.id)}
                    aria-current={conta === a.id ? "true" : undefined}
                    className="flex w-full flex-col gap-2 px-4 py-3 text-left hover:bg-muted/50 aria-[current=true]:bg-accent/60 sm:flex-row sm:items-center"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-semibold">{a.name}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {[a.segment, a.neighborhood].filter(Boolean).join(" · ")} ·{" "}
                        {user(a.csmId)?.name ?? "sem responsável"}
                      </span>
                    </span>
                    <span className="flex items-center gap-2 sm:w-72 sm:justify-end">
                      {e.pilotEligible && e.status !== "selecionado_piloto" && (
                        <span className="text-[0.68rem] text-muted-foreground">elegível ao piloto</span>
                      )}
                      <FpStatusPill status={e.status} />
                      <span className="w-20 text-right text-[0.7rem] tabular-nums text-muted-foreground">
                        {relative(e.statusChangedAt)}
                      </span>
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel
          className="xl:col-span-2 xl:sticky xl:top-4"
          title="Ficha da adesão"
          description={
            selected && selectedAccount
              ? `Desde ${dateBR(selected.createdAt)}`
              : "Escolha um restaurante na lista"
          }
          actions={
            selected ? (
              <IconBtn label="Fechar ficha" icon={X} onClick={() => open(undefined)} />
            ) : undefined
          }
        >
          {selected && selectedAccount ? (
            <EnrollmentDetail enrollment={selected} account={selectedAccount} />
          ) : conta ? (
            <Empty
              icon={Handshake}
              title="Esta conta não está no programa"
              text="Ela pode nunca ter sido convidada ou pertencer a outra organização."
              action={
                <Link to="/crm/contas/$id" params={{ id: conta }} className="text-xs font-semibold text-primary hover:underline">
                  Abrir a conta
                </Link>
              }
            />
          ) : (
            <p className="text-sm text-muted-foreground">
              A ficha mostra estado, termos, elegibilidade para o piloto, convites, benefícios
              concedidos, comunicações, feedback e a trilha de auditoria.
            </p>
          )}
        </Panel>
      </div>

      <DemoNote>
        Demonstração · dados fictícios. Convites e comunicações ficam só registrados no CRM. No
        banco, o programa é a migração 0041 (proposta, não aplicada).
      </DemoNote>
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <LayerTag layer="B" />
        Restaurante Fundador é um programa de parceria, não um selo de qualidade nem uma
        recomendação.
      </p>
    </div>
  );
}

function StateChip({
  on,
  onClick,
  label,
  n,
}: {
  on: boolean;
  onClick: () => void;
  label: string;
  n: number;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={on}
      onClick={onClick}
      className={
        "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors " +
        (on
          ? "border-secondary bg-secondary text-secondary-foreground"
          : "border-border bg-card text-muted-foreground hover:text-foreground")
      }
    >
      {label}
      <span className="tabular-nums opacity-70">{n}</span>
    </button>
  );
}
