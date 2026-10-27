import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowRight, CircleCheck, Globe, PlugZap, ReceiptText, Wrench } from "lucide-react";
import { useCrm, useOrgData } from "@/components/tipe/crm/context";
import { JourneyTimeline, LAYER, LayerTag } from "@/components/tipe/crm/eco";
import { brlShort, Btn, PageHeader, Panel, Pill, Select } from "@/components/tipe/crm/ui";
import { INTEGRATION_POINTS } from "@/lib/tipe/crm/adapters";
import { accountJourney, journeyCounts, stepDone } from "@/lib/tipe/crm/ecosystem";

// Mapa do processo: as três camadas do CRM e como um registro passa de uma para a outra.
export const Route = createFileRoute("/crm/jornada")({ component: Jornada });

type Stage = { label: string; value: string; hint: string; to: string };

function Jornada() {
  const { s, org, can, run } = useCrm();
  const d = useOrgData();
  const now = useMemo(() => new Date().toISOString(), [s]); // eslint-disable-line react-hooks/exhaustive-deps
  const j = useMemo(() => journeyCounts(s, org.id, now), [s, org.id, now]);

  const traceable = d.accounts.filter((a) => a.leadId && a.status === "ativa");
  const [pick, setPick] = useState("");
  const example = d.accounts.find((a) => a.id === pick) ?? traceable[0] ?? d.accounts[0];
  const billable = d.accounts.filter(
    (a) => a.status === "ativa" && stepDone(a, "mesas_qr") && stepDone(a, "pagamentos"),
  );

  const lanes: { layer: "A" | "B" | "C"; title: string; owner: string; stages: Stage[] }[] = [
    {
      layer: "A",
      title: "Comercial: vender a Tipe",
      owner: "Vendas e SDR",
      stages: [
        {
          label: "Lead do site",
          value: String(j.siteLeads),
          hint: "Lista de espera",
          to: "/crm/leads",
        },
        {
          label: "Qualificado",
          value: String(j.qualified),
          hint: `de ${j.leads} leads`,
          to: "/crm/leads",
        },
        {
          label: "Oportunidade",
          value: String(j.open),
          hint: "em negociação",
          to: "/crm/oportunidades",
        },
        { label: "Ganho", value: String(j.won), hint: "abre a conta", to: "/crm/oportunidades" },
      ],
    },
    {
      layer: "B",
      title: "Restaurante: implantar e cuidar",
      owner: "Sucesso do cliente",
      stages: [
        {
          label: "Conta criada",
          value: String(j.accounts),
          hint: "1 por negócio ganho",
          to: "/crm/contas",
        },
        { label: "Implantação", value: String(j.onboarding), hint: "8 etapas", to: "/crm/contas" },
        { label: "Ativa", value: String(j.active), hint: "1ª conta paga", to: "/crm/contas" },
        {
          label: "Uso em 30 dias",
          value: brlShort(j.gmv30),
          hint: `${j.bills30.toLocaleString("pt-BR")} contas`,
          to: "/crm/contas",
        },
      ],
    },
    {
      layer: "C",
      title: "Clientes: quem paga na mesa",
      owner: "Restaurante, com apoio da Tipe",
      stages: [
        {
          label: "Conta paga",
          value: j.bills30.toLocaleString("pt-BR"),
          hint: "Pix, Apple Pay, Google Pay",
          to: "/crm/clientes",
        },
        {
          label: "Identificado",
          value: j.consumers.toLocaleString("pt-BR"),
          hint: "telefone na conta",
          to: "/crm/clientes",
        },
        {
          label: "Gorjeta",
          value: brlShort(j.tips30),
          hint: "para a equipe, 30 dias",
          to: "/crm/clientes",
        },
        {
          label: "Aceita campanhas",
          value: j.optIn.toLocaleString("pt-BR"),
          hint: "consentimento LGPD",
          to: "/crm/clientes",
        },
      ],
    },
  ];

  const statusMeta = {
    pronto: { label: "Funciona", tone: "success" as const, icon: CircleCheck },
    adaptador: { label: "Adaptador pronto", tone: "info" as const, icon: PlugZap },
    depende: { label: "Depende de módulo externo", tone: "warning" as const, icon: Wrench },
  };

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Visão geral · Processo"
        title="Jornada integrada"
        description="Um restaurante entra pelo site, vira oportunidade, assina, é implantado e passa a receber contas dos clientes. Cada etapa abaixo é contada ao vivo e leva para a tela onde ela acontece."
        actions={
          can("leads.write") && (
            <Btn
              onClick={() =>
                run({ type: "simulateSiteLead" }, "Cadastro do site recebido e distribuído")
              }
            >
              <Globe className="h-3.5 w-3.5" />
              Simular cadastro no site
            </Btn>
          )
        }
      />

      <div className="space-y-3">
        {lanes.map((lane, li) => (
          <section key={lane.layer} className="crm-panel overflow-hidden" aria-label={lane.title}>
            <div className="grid lg:grid-cols-[15rem_1fr]">
              <header className={`flex items-center gap-3 px-5 py-4 ${LAYER[lane.layer].cls}`}>
                <span className="grid h-9 w-9 place-items-center rounded-full bg-white/20 font-display text-sm font-bold">
                  {lane.layer}
                </span>
                <span className="min-w-0">
                  <span className="block font-display text-sm font-semibold leading-tight">
                    {lane.title}
                  </span>
                  <span className="block text-xs opacity-75">{lane.owner}</span>
                </span>
              </header>
              <ol className="grid grid-cols-2 gap-px bg-border sm:grid-cols-4">
                {lane.stages.map((st, i) => (
                  <li key={st.label} className="relative bg-card">
                    <Link
                      to={st.to}
                      className="block h-full px-4 py-3.5 transition-colors hover:bg-muted/60"
                    >
                      <span className="text-[0.7rem] font-semibold uppercase tracking-wider text-muted-foreground">
                        {st.label}
                      </span>
                      <span className="mt-1 block font-display text-2xl font-semibold tracking-tight">
                        {st.value}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {st.hint}
                      </span>
                    </Link>
                    {i < lane.stages.length - 1 && (
                      <ArrowRight
                        aria-hidden
                        className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rounded-full bg-card text-muted-foreground ring-1 ring-border sm:block"
                      />
                    )}
                  </li>
                ))}
              </ol>
            </div>
            {li < lanes.length - 1 && (
              <p className="border-t border-border bg-muted/40 px-5 py-2 text-xs text-muted-foreground">
                {li === 0
                  ? "Negócio ganho → o CRM cria a conta do restaurante, escolhe o responsável de sucesso e agenda o kickoff, o cadastro de mesas e o treinamento."
                  : "Mesas, QR Codes e recebimentos prontos → cada conta paga pela Tipe vira uma visita; quem informa o telefone vira cliente do restaurante."}
              </p>
            )}
          </section>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-3 xl:items-start">
        <Panel
          title="Rastro de uma conta"
          description="Do lead que chegou pelo site às contas pagas pelos clientes"
          className="xl:col-span-2"
          actions={
            <Select
              aria-label="Restaurante do exemplo"
              value={example?.id ?? ""}
              onChange={(e) => setPick(e.target.value)}
              className="h-8 w-48 text-xs"
            >
              {d.accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          }
        >
          {example ? (
            <>
              <JourneyTimeline steps={accountJourney(s, example)} />
              <Link
                to="/crm/contas/$id"
                params={{ id: example.id }}
                className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline"
              >
                Abrir a conta de {example.name}
                <ArrowRight className="h-3 w-3" />
              </Link>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">Nenhuma conta ainda.</p>
          )}
        </Panel>
        <Panel title="Teste o fluxo" description="Ações que mexem nas três camadas">
          <ol className="space-y-3 text-sm">
            <li className="flex gap-2">
              <LayerTag layer="A" />
              <span>
                Simule um cadastro no site. O lead cai na fila do vendedor com menos leads abertos.
              </span>
            </li>
            <li className="flex gap-2">
              <LayerTag layer="A" />
              <span>
                Em{" "}
                <Link to="/crm/oportunidades" className="font-medium text-primary hover:underline">
                  Oportunidades
                </Link>
                , marque um negócio como ganho. A conta aparece em Contas, em implantação.
              </span>
            </li>
            <li className="flex gap-2">
              <LayerTag layer="B" />
              <span>Conclua as etapas da implantação na conta.</span>
            </li>
            <li className="flex gap-2">
              <LayerTag layer="C" />
              <span>Simule uma conta paga. A primeira ativa o restaurante.</span>
            </li>
          </ol>
          {can("accounts.manage") && billable.length > 0 && (
            <Btn
              variant="outline"
              className="mt-4 w-full"
              onClick={() => {
                const a = billable[Math.floor(Math.random() * billable.length)]!;
                run({ type: "simulateVisit", accountId: a.id }, `Conta paga em ${a.name}`);
              }}
            >
              <ReceiptText className="h-3.5 w-3.5" />
              Simular conta paga em um restaurante
            </Btn>
          )}
        </Panel>
      </div>

      <Panel
        title="Ligação com a plataforma Tipe"
        description="O que já funciona, o que tem adaptador pronto para o Supabase e o que depende de módulo externo"
        bodyClassName="p-0"
      >
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead>
              <tr className="text-left text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                <th className="px-5 py-2.5 font-semibold">Camada</th>
                <th className="px-3 py-2.5 font-semibold">O quê</th>
                <th className="px-3 py-2.5 font-semibold">Fonte real</th>
                <th className="px-3 py-2.5 font-semibold">Situação</th>
                <th className="px-3 py-2.5 font-semibold">Detalhe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {INTEGRATION_POINTS.map((p) => {
                const m = statusMeta[p.status];
                return (
                  <tr key={p.what}>
                    <td className="px-5 py-3">
                      <LayerTag layer={p.layer} withName />
                    </td>
                    <td className="px-3 py-3 font-medium">{p.what}</td>
                    <td className="px-3 py-3">
                      <code className="rounded bg-muted px-1.5 py-0.5 text-[0.7rem]">
                        {p.source}
                      </code>
                    </td>
                    <td className="px-3 py-3">
                      <Pill tone={m.tone}>
                        <m.icon className="h-3 w-3" />
                        {m.label}
                      </Pill>
                    </td>
                    <td className="max-w-sm px-3 py-3 text-xs text-muted-foreground">{p.note}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
