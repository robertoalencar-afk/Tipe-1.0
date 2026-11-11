import { useMemo, useState } from "react";
import { z } from "zod";
import { createFileRoute, Link } from "@tanstack/react-router";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { HeartHandshake, Megaphone, ReceiptText, ShieldCheck, Users, Wallet } from "lucide-react";
import { NoAccess, useCrm, useOrgData } from "@/components/tipe/crm/context";
import { LayerTag } from "@/components/tipe/crm/eco";
import { Sheet, SheetContent, SheetDescription, SheetTitle } from "@/components/ui/sheet";
import {
  axis,
  brl,
  brlShort,
  Btn,
  chartTooltip,
  dateBR,
  dateTimeBR,
  DemoNote,
  Empty,
  Field,
  Kpi,
  PageHeader,
  Panel,
  Pill,
  relative,
  SearchInput,
  Segmented,
  Select,
  TextArea,
  TextInput,
} from "@/components/tipe/crm/ui";
import {
  campaignAudience,
  consumerProfiles,
  type ConsumerProfile,
  maskPhone,
  METHOD_LABEL,
  SEGMENT_HINT,
  SEGMENT_LABEL,
  segmentCounts,
  topItems,
  visitsByHour,
} from "@/lib/tipe/crm/ecosystem";
import type { ConsumerSegment } from "@/lib/tipe/crm/types";

// Camada C: quem paga a conta na mesa dos restaurantes que usam a Tipe.
export const Route = createFileRoute("/crm/clientes")({
  validateSearch: z.object({ conta: z.string().optional().catch(undefined) }),
  component: Clientes,
});

type Tab = "clientes" | "campanhas" | "insights";
const SEGMENTS: ConsumerSegment[] = ["todos", "novos", "recorrentes", "fieis", "em_risco"];

function Clientes() {
  const { s, org, can, user } = useCrm();
  const d = useOrgData();
  const { conta } = Route.useSearch();
  const navigate = Route.useNavigate();
  const [tab, setTab] = useState<Tab>("clientes");
  const [segment, setSegment] = useState<ConsumerSegment>("todos");
  const [q, setQ] = useState("");
  const [open, setOpen] = useState<string | null>(null);
  const now = useMemo(() => new Date().toISOString(), [s]); // eslint-disable-line react-hooks/exhaustive-deps

  const accountId = d.accounts.some((a) => a.id === conta) ? conta : undefined;
  const profiles = useMemo(
    () => consumerProfiles(s, org.id, now, accountId),
    [s, org.id, now, accountId],
  );
  if (!can("consumers.view")) return <NoAccess what="clientes dos restaurantes" />;

  const visits = d.visits.filter((v) => !accountId || v.accountId === accountId);
  const counts = segmentCounts(profiles);
  const term = q.trim().toLowerCase();
  const list = profiles
    .filter((p) => segment === "todos" || p.segment === segment)
    .filter((p) => !term || p.consumer.name.toLowerCase().includes(term));
  const optIn = profiles.filter((p) => p.consumer.marketingOptIn).length;
  const identified = visits.filter((v) => v.consumerId).length;
  const returning = profiles.filter((p) => p.count >= 2).length;
  const accName = (id: string) => d.accounts.find((a) => a.id === id)?.name ?? "—";
  const selected = profiles.find((p) => p.consumer.id === open);
  const campaigns = d.campaigns
    .filter((c) => !accountId || c.accountId === accountId)
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt));

  return (
    <div className="space-y-5">
      <PageHeader
        eyebrow="Camada C · Clientes dos restaurantes"
        title="Clientes"
        description="Quem paga a conta pela Tipe e se identifica vira cliente do restaurante: frequência, gasto, gorjetas, avaliações e campanhas com consentimento."
        actions={
          <Select
            aria-label="Restaurante"
            value={accountId ?? ""}
            onChange={(e) => navigate({ search: { conta: e.target.value || undefined } })}
            className="sm:w-64"
          >
            <option value="">Todos os restaurantes</option>
            {d.accounts
              .filter((a) => a.status !== "implantacao")
              .map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
          </Select>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          icon={Users}
          label="Clientes identificados"
          value={profiles.length.toLocaleString("pt-BR")}
          hint={
            visits.length
              ? `${Math.round((identified / visits.length) * 100)}% das contas pagas`
              : "Sem contas pagas"
          }
        />
        <Kpi
          icon={HeartHandshake}
          label="Voltaram mais de uma vez"
          value={profiles.length ? `${Math.round((returning / profiles.length) * 100)}%` : "—"}
          hint={`${counts.fieis} fiéis, com 5 visitas ou mais`}
        />
        <Kpi
          icon={Wallet}
          label="Gasto médio por cliente"
          value={
            profiles.length ? brl(profiles.reduce((a, p) => a + p.total, 0) / profiles.length) : "—"
          }
          hint="Soma das contas de cada cliente"
        />
        <Kpi
          icon={ShieldCheck}
          label="Aceitam receber campanhas"
          value={optIn.toLocaleString("pt-BR")}
          hint="Consentimento registrado (LGPD)"
        />
      </div>

      <Segmented
        label="Seções de clientes"
        value={tab}
        onChange={setTab}
        options={[
          { value: "clientes", label: "Clientes" },
          { value: "campanhas", label: `Campanhas (${campaigns.length})` },
          { value: "insights", label: "Hábitos" },
        ]}
      />

      {tab === "clientes" && (
        <Panel bodyClassName="p-0">
          <div className="flex flex-col gap-3 border-b border-border p-4">
            <div className="flex flex-wrap gap-2" role="radiogroup" aria-label="Segmento">
              {SEGMENTS.map((sg) => (
                <button
                  key={sg}
                  type="button"
                  role="radio"
                  aria-checked={segment === sg}
                  title={SEGMENT_HINT[sg]}
                  onClick={() => setSegment(sg)}
                  className={`inline-flex h-8 items-center gap-1.5 rounded-full border px-3 text-xs font-medium transition-colors ${segment === sg ? "border-secondary bg-secondary text-secondary-foreground" : "border-border bg-card text-muted-foreground hover:text-foreground"}`}
                >
                  {SEGMENT_LABEL[sg]}
                  <span className="tabular-nums opacity-70">{counts[sg]}</span>
                </button>
              ))}
            </div>
            <SearchInput
              value={q}
              onChange={setQ}
              placeholder="Buscar cliente pelo nome"
              className="sm:max-w-xs"
            />
          </div>
          {list.length === 0 ? (
            <div className="p-5">
              <Empty
                icon={Users}
                title="Nenhum cliente aqui"
                text="Troque o segmento ou o restaurante. Clientes aparecem quando pagam a conta pela Tipe e informam o telefone."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-sm">
                <thead>
                  <tr className="text-left text-[0.7rem] uppercase tracking-wider text-muted-foreground">
                    <th className="px-4 py-2.5 font-semibold">Cliente</th>
                    {!accountId && <th className="px-3 py-2.5 font-semibold">Restaurante</th>}
                    <th className="px-3 py-2.5 font-semibold">Segmento</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Visitas</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Gasto total</th>
                    <th className="px-3 py-2.5 text-right font-semibold">Gorjetas</th>
                    <th className="px-3 py-2.5 font-semibold">Última visita</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {list.slice(0, 60).map((p) => (
                    <tr
                      key={p.consumer.id}
                      className="cursor-pointer hover:bg-muted/50"
                      onClick={() => setOpen(p.consumer.id)}
                    >
                      <td className="px-4 py-2.5">
                        <button
                          type="button"
                          className="text-left font-medium hover:underline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpen(p.consumer.id);
                          }}
                        >
                          {p.consumer.name}
                        </button>
                        <span className="block text-xs text-muted-foreground">
                          {maskPhone(p.consumer.phoneLast4)}
                          {p.consumer.marketingOptIn ? " · aceita campanhas" : ""}
                        </span>
                      </td>
                      {!accountId && (
                        <td className="px-3 py-2.5 text-xs">{accName(p.consumer.accountId)}</td>
                      )}
                      <td className="px-3 py-2.5">
                        <Pill
                          tone={
                            p.segment === "em_risco"
                              ? "warning"
                              : p.segment === "fieis"
                                ? "success"
                                : "neutral"
                          }
                        >
                          {SEGMENT_LABEL[p.segment]}
                        </Pill>
                      </td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{p.count}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{brl(p.total)}</td>
                      <td className="px-3 py-2.5 text-right tabular-nums">{brl(p.tips, 2)}</td>
                      <td className="px-3 py-2.5 text-xs text-muted-foreground">
                        {relative(p.last)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {list.length > 60 && (
                <p className="px-4 py-3 text-xs text-muted-foreground">
                  Mostrando 60 de {list.length}. Use a busca ou os segmentos para achar alguém.
                </p>
              )}
            </div>
          )}
        </Panel>
      )}

      {tab === "campanhas" && (
        <div className="grid gap-4 xl:grid-cols-3">
          <Panel
            title="Campanhas"
            description="Mensagens do restaurante para os próprios clientes, só para quem aceitou"
            className="xl:col-span-2"
            bodyClassName="p-0"
          >
            {campaigns.length === 0 ? (
              <div className="p-5">
                <Empty
                  icon={Megaphone}
                  title="Nenhuma campanha"
                  text="Crie a primeira escolhendo um restaurante e um segmento de clientes."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {campaigns.map((c) => (
                  <li key={c.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-semibold">{c.name}</p>
                      <Pill tone="info">Simulada · {c.audience} clientes</Pill>
                    </div>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {accName(c.accountId)} · {SEGMENT_LABEL[c.segment]} ·{" "}
                      {dateTimeBR(c.createdAt)} · {user(c.createdBy)?.name}
                    </p>
                    <p className="mt-1.5 rounded-xl bg-muted px-3 py-2 text-xs">{c.message}</p>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
          {can("campaigns.manage") ? (
            <NewCampaign
              key={accountId ?? "all"}
              defaultAccount={accountId}
              profilesFor={(id) => consumerProfiles(s, org.id, now, id)}
            />
          ) : (
            <Panel title="Nova campanha">
              <p className="text-sm text-muted-foreground">
                Campanhas são criadas por gestores e pelo time de sucesso do cliente.
              </p>
            </Panel>
          )}
        </div>
      )}

      {tab === "insights" && <Insights visits={visits} profiles={profiles} />}

      <DemoNote>
        Clientes e contas fictícios. Na plataforma, cada conta paga vem de table_payment_requests;
        identificar o cliente exige telefone e consentimento no momento do pagamento.
      </DemoNote>

      <Sheet open={!!selected} onOpenChange={(o) => !o && setOpen(null)}>
        <SheetContent className="w-full overflow-y-auto border-border bg-card sm:max-w-md">
          {selected && <Profile p={selected} accName={accName(selected.consumer.accountId)} />}
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Profile({ p, accName }: { p: ConsumerProfile; accName: string }) {
  return (
    <div className="space-y-5">
      <div>
        <p className="mb-1 flex items-center gap-2 text-xs text-muted-foreground">
          <LayerTag layer="C" /> Cliente de{" "}
          <Link
            to="/crm/contas/$id"
            params={{ id: p.consumer.accountId }}
            className="font-medium text-foreground hover:underline"
          >
            {accName}
          </Link>
        </p>
        <SheetTitle className="font-display text-xl">{p.consumer.name}</SheetTitle>
        <SheetDescription className="text-xs">
          {maskPhone(p.consumer.phoneLast4)} · cliente desde {dateBR(p.first)}
        </SheetDescription>
      </div>
      <div className="grid grid-cols-2 gap-2">
        {[
          ["Visitas", String(p.count)],
          ["Gasto total", brl(p.total)],
          ["Ticket médio", brl(p.avgTicket)],
          ["Gorjetas dadas", brl(p.tips, 2)],
          ["Nota média", p.rating ? p.rating.toFixed(1).replace(".", ",") : "—"],
          ["Paga com", METHOD_LABEL[p.method]],
        ].map(([k, v]) => (
          <div key={k} className="rounded-2xl bg-muted px-3 py-2">
            <p className="text-[0.68rem] text-muted-foreground">{k}</p>
            <p className="font-display text-base font-semibold">{v}</p>
          </div>
        ))}
      </div>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Pede sempre</p>
        <div className="flex flex-wrap gap-1.5">
          {p.favorite.length ? (
            p.favorite.map((f) => <Pill key={f}>{f}</Pill>)
          ) : (
            <span className="text-xs text-muted-foreground">Sem itens registrados</span>
          )}
        </div>
      </div>
      <p className="rounded-2xl border border-border px-3 py-2 text-xs">
        {p.consumer.marketingOptIn
          ? `Aceitou receber campanhas${p.consumer.optInAt ? ` em ${dateBR(p.consumer.optInAt)}` : ""}.`
          : "Não aceitou campanhas: fica fora de qualquer envio."}
      </p>
      <div>
        <p className="mb-1.5 text-xs font-semibold text-muted-foreground">Visitas</p>
        <ul className="divide-y divide-border">
          {[...p.visits]
            .reverse()
            .slice(0, 10)
            .map((v) => (
              <li key={v.id} className="flex justify-between gap-2 py-2 text-xs">
                <span>
                  <span className="block font-medium">{dateTimeBR(v.at)}</span>
                  <span className="text-muted-foreground">
                    Mesa {v.table} · {v.waiter} · {METHOD_LABEL[v.method]}
                  </span>
                </span>
                <span className="text-right tabular-nums">
                  <span className="block font-semibold">{brl(v.amount)}</span>
                  {v.tip > 0 && <span className="text-success">+{brl(v.tip, 2)}</span>}
                </span>
              </li>
            ))}
        </ul>
      </div>
    </div>
  );
}

function NewCampaign({
  defaultAccount,
  profilesFor,
}: {
  defaultAccount?: string | undefined;
  profilesFor: (accountId: string) => ConsumerProfile[];
}) {
  const { run } = useCrm();
  const d = useOrgData();
  const active = d.accounts.filter((a) => a.status === "ativa");
  const [accountId, setAccountId] = useState(defaultAccount ?? active[0]?.id ?? "");
  const [segment, setSegment] = useState<ConsumerSegment>("em_risco");
  const [name, setName] = useState("");
  const [message, setMessage] = useState("");
  const audience = accountId ? campaignAudience(profilesFor(accountId), segment).length : 0;

  return (
    <Panel title="Nova campanha" description="Envio simulado pelo WhatsApp do restaurante">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          const r = run(
            { type: "createCampaign", accountId, name, segment, message },
            "Campanha registrada",
          );
          if (r.ok) {
            setName("");
            setMessage("");
          }
        }}
      >
        <Field label="Restaurante">
          {(fid) => (
            <Select id={fid} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
              {active.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Para quem" hint={SEGMENT_HINT[segment]}>
          {(fid, desc) => (
            <Select
              id={fid}
              aria-describedby={desc}
              value={segment}
              onChange={(e) => setSegment(e.target.value as ConsumerSegment)}
            >
              {SEGMENTS.map((sg) => (
                <option key={sg} value={sg}>
                  {SEGMENT_LABEL[sg]}
                </option>
              ))}
            </Select>
          )}
        </Field>
        <Field label="Nome da campanha">
          {(fid) => <TextInput id={fid} value={name} onChange={(e) => setName(e.target.value)} />}
        </Field>
        <Field label="Mensagem">
          {(fid) => (
            <TextArea
              id={fid}
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
          )}
        </Field>
        <p className="rounded-xl bg-accent px-3 py-2 text-xs">
          Vai para <strong>{audience}</strong> cliente{audience === 1 ? "" : "s"} que aceitaram
          receber mensagens. Quem não aceitou fica de fora.
        </p>
        <Btn type="submit" className="w-full" disabled={!accountId || audience === 0}>
          <Megaphone className="h-3.5 w-3.5" />
          Registrar campanha
        </Btn>
      </form>
    </Panel>
  );
}

function Insights({
  visits,
  profiles,
}: {
  visits: ReturnType<typeof useOrgData>["visits"];
  profiles: ConsumerProfile[];
}) {
  const hours = visitsByHour(visits);
  const items = topItems(visits, 6);
  const freq = [1, 2, 3, 4, 5].map((n) => ({
    visitas: n === 5 ? "5+" : String(n),
    clientes: profiles.filter((p) => (n === 5 ? p.count >= 5 : p.count === n)).length,
  }));
  const tipped = visits.filter((v) => v.tip > 0);
  return (
    <div className="grid gap-4 xl:grid-cols-3">
      <Panel title="Quantas vezes voltam" description="Clientes por número de visitas">
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={freq} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="visitas" {...axis} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="clientes" name="Clientes" fill="var(--chart-3)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Horário das contas" description="Quando os clientes pagam">
        <div className="h-48">
          <ResponsiveContainer>
            <BarChart data={hours} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
              <XAxis dataKey="hora" {...axis} interval={1} />
              <YAxis {...axis} allowDecimals={false} />
              <Tooltip {...chartTooltip} cursor={{ fill: "var(--muted)" }} />
              <Bar dataKey="contas" name="Contas" fill="var(--chart-2)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </Panel>
      <Panel title="Gorjeta e itens" description="O que mais aparece nas contas">
        <p className="text-sm">
          <ReceiptText className="mr-1 inline h-4 w-4 text-primary" />
          {visits.length ? Math.round((tipped.length / visits.length) * 100) : 0}% das contas
          tiveram gorjeta extra, média de{" "}
          {brl(tipped.length ? tipped.reduce((a, v) => a + v.tip, 0) / tipped.length : 0, 2)}.
        </p>
        <ul className="mt-3 space-y-1.5">
          {items.map((i) => (
            <li key={i.item} className="flex justify-between text-xs">
              <span>{i.item}</span>
              <span className="tabular-nums text-muted-foreground">{i.count}</span>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Volume total: {brlShort(visits.reduce((a, v) => a + v.amount, 0))}
        </p>
      </Panel>
    </div>
  );
}
