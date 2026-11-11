import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { CheckCircle2, Circle, Link2, MessageCircle, Plus, Settings2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Aviso, Busca, Campo, Esqueleto, Kpi, Painel, PainelLateral, Segmentado, StatusBadge, Tabela, dataBR, horaBR, inputCls, relativo, usePaginacao, type Tone,
} from "@/components/tipe/painel/ui";
import {
  addCrmNote, getCrm, getLeadFicha, linkLeadRestaurant, moveOpportunity, saveCrmStages, saveCrmTask, updateImplantationStep,
} from "@/lib/tipe/central.functions";
import { leadScore, ROLE_LABEL, SOURCES } from "@/lib/tipe/leads-score";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["funil", "Funil"], ["leads", "Leads"], ["tarefas", "Tarefas"], ["etapas", "Etapas"]] as const;
type Aba = (typeof ABAS)[number][0];

const KIND_TONE: Record<string, Tone> = { open: "brand", won: "success", lost: "error" };

export function Comercial({ aba, id, ir }: Props) {
  const atual = (ABAS.some(([k]) => k === aba) ? aba : "funil") as Aba;
  const fetchCrm = useServerFn(getCrm);
  const crm = useQuery({ queryKey: ["central-crm"], queryFn: () => fetchCrm(), refetchInterval: 60_000 });
  const abrir = (leadId: string) => ir("comercial", atual, leadId);
  const fechar = () => ir("comercial", atual);
  if (crm.isPending || !crm.data) return <Esqueleto linhas={6} />;
  const d = crm.data;
  return (
    <div className="space-y-5">
      <Segmentado label="Seção do comercial" value={atual} onChange={(a) => ir("comercial", a)} options={ABAS} />
      {atual === "funil" && <Funil d={d} abrir={abrir} />}
      {atual === "leads" && <Leads d={d} abrir={abrir} />}
      {atual === "tarefas" && <Tarefas d={d} abrir={abrir} />}
      {atual === "etapas" && <Etapas d={d} />}
      {id && <Ficha leadId={id} d={d} onFechar={fechar} />}
    </div>
  );
}

type Crm = Awaited<ReturnType<typeof getCrm>>;

function nomeEtapa(d: Crm, key: string) {
  return d.stages.find((s: any) => s.key === key)?.label ?? key;
}

function useInvalidar() {
  const qc = useQueryClient();
  return () => Promise.all([qc.invalidateQueries({ queryKey: ["central-crm"] }), qc.invalidateQueries({ queryKey: ["central-ficha"] }), qc.invalidateQueries({ queryKey: ["central-dash"] })]);
}

function Funil({ d, abrir }: { d: Crm; abrir: (id: string) => void }) {
  const mover = useServerFn(moveOpportunity);
  const inv = useInvalidar();
  const mut = useMutation({
    mutationFn: (v: { id: string; stageKey: string; lostReason?: string | null }) => mover({ data: v }),
    onSuccess: () => { toast.success("Oportunidade movida"); inv(); },
    onError: (e: Error) => toast.error(e.message),
  });
  const lead = new Map<string, any>(d.leads.map((l: any) => [l.id, l]));
  const etapas = d.stages.filter((s: any) => s.active);
  const abertas = d.oportunidades.filter((o: any) => o.status === "open" || o.updated_at > new Date(Date.now() - 30 * 864e5).toISOString());
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Abertas" value={d.oportunidades.filter((o: any) => o.status === "open").length} />
        <Kpi label="Demos agendadas" value={d.oportunidades.filter((o: any) => o.stage_key === "demo_agendada").length} />
        <Kpi label="Em negociação" value={d.oportunidades.filter((o: any) => ["proposta", "negociacao"].includes(o.stage_key)).length} />
        <Kpi label="Ganhas (30 d)" value={d.oportunidades.filter((o: any) => o.status === "won" && o.updated_at > new Date(Date.now() - 30 * 864e5).toISOString()).length} tone="brand" />
      </div>
      <div className="-mx-4 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        <div className="flex min-w-max gap-3">
          {etapas.map((s: any) => {
            const cards = abertas.filter((o: any) => o.stage_key === s.key);
            return (
              <section key={s.key} className="w-64 shrink-0 rounded-xl border border-border bg-muted/40">
                <header className="flex items-center justify-between px-3 py-2">
                  <span className="text-sm font-semibold">{s.label}</span>
                  <StatusBadge tone={KIND_TONE[s.kind] ?? "neutral"}>{cards.length}</StatusBadge>
                </header>
                <ul className="max-h-[60vh] space-y-2 overflow-y-auto px-2 pb-2">
                  {cards.length === 0 && <li className="px-1 py-6 text-center text-xs text-muted-foreground">Nenhuma oportunidade</li>}
                  {cards.map((o: any) => {
                    const l = lead.get(o.lead_id);
                    const parado = Date.now() - new Date(o.updated_at).getTime() > 5 * 864e5;
                    return (
                      <li key={o.id} className="surface-card p-3 text-sm">
                        <button type="button" className="w-full text-left" onClick={() => o.lead_id && abrir(o.lead_id)}>
                          <p className="font-semibold leading-tight">{o.title}</p>
                          <p className="mt-0.5 text-xs text-muted-foreground">{l ? `${l.contact_name} · ${l.city ?? ""}` : "sem lead"}</p>
                          <p className="mt-1 text-xs text-muted-foreground">{relativo(o.updated_at)}{parado && s.kind === "open" ? " · parado" : ""}</p>
                        </button>
                        <label className="mt-2 block">
                          <span className="sr-only">Mover para</span>
                          <select className={`${inputCls} h-8 text-xs`} value={o.stage_key} onChange={(e) => mut.mutate({ id: o.id, stageKey: e.target.value, lostReason: etapas.find((x: any) => x.key === e.target.value)?.kind === "lost" ? "outro" : null })}>
                            {etapas.map((x: any) => <option key={x.key} value={x.key}>{x.label}</option>)}
                          </select>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      </div>
    </div>
  );
}

function Leads({ d, abrir }: { d: Crm; abrir: (id: string) => void }) {
  const [q, setQ] = useState("");
  const [etapa, setEtapa] = useState<string>("todas");
  const oppDoLead = new Map<string, any>(d.oportunidades.filter((o: any) => o.status === "open").map((o: any) => [o.lead_id, o]));
  const linhas = useMemo(() => {
    const t = q.trim().toLowerCase();
    return d.leads
      .map((l: any) => ({ ...l, score: leadScore(l), etapa: oppDoLead.get(l.id)?.stage_key ?? (l.restaurant_id ? "cliente_ativo" : l.status === "perdido" ? "perdido" : "novo_lead") }))
      .filter((l: any) => (etapa === "todas" || l.etapa === etapa) && (!t || [l.restaurant_name, l.contact_name, l.email, l.phone, l.city].some((v) => String(v ?? "").toLowerCase().includes(t))));
  }, [d, q, etapa]);
  const pag = usePaginacao(linhas, 25);
  return (
    <Painel titulo="Leads" descricao={`${d.leads.length} na lista de espera; dados reais de restaurant_leads`} semPadding acoes={
      <div className="flex flex-wrap items-center gap-2">
        <select className={`${inputCls} h-9 w-auto text-sm`} value={etapa} onChange={(e) => { setEtapa(e.target.value); pag.reset(); }} aria-label="Etapa">
          <option value="todas">Todas as etapas</option>
          {d.stages.map((s: any) => <option key={s.key} value={s.key}>{s.label}</option>)}
        </select>
        <Busca value={q} onChange={(v) => { setQ(v); pag.reset(); }} placeholder="Restaurante, contato, e-mail…" />
      </div>
    }>
      <Tabela
        linhas={pag.fatia}
        chave={(l: any) => l.id}
        onLinha={(l: any) => abrir(l.id)}
        rodape={pag.controles}
        vazio="Nenhum lead com esse filtro."
        colunas={[
          { k: "r", l: "Restaurante", c: (l: any) => <span className="font-medium">{l.restaurant_name}</span> },
          { k: "c", l: "Contato", c: (l: any) => <span>{l.contact_name}<span className="block text-xs text-muted-foreground">{ROLE_LABEL[l.contact_role] ?? l.contact_role ?? ""}</span></span> },
          { k: "ci", l: "Cidade", md: true, c: (l: any) => `${l.city ?? ""}${l.state ? `/${l.state}` : ""}` },
          { k: "e", l: "Etapa", c: (l: any) => <StatusBadge tone={l.etapa === "cliente_ativo" ? "success" : l.etapa === "perdido" ? "error" : "brand"}>{nomeEtapa(d, l.etapa)}</StatusBadge> },
          { k: "s", l: "Score", num: true, md: true, c: (l: any) => l.score },
          { k: "o", l: "Origem", md: true, c: (l: any) => l.utm_source ?? (l.referred_by_code ? "indicação" : SOURCES[l.discovery_source] ?? "direto") },
          { k: "d", l: "Entrou", num: true, c: (l: any) => dataBR(l.created_at) },
        ]}
      />
    </Painel>
  );
}

function Tarefas({ d, abrir }: { d: Crm; abrir: (id: string) => void }) {
  const salvar = useServerFn(saveCrmTask);
  const inv = useInvalidar();
  const [titulo, setTitulo] = useState("");
  const [quando, setQuando] = useState("");
  const mut = useMutation({ mutationFn: (v: any) => salvar({ data: v }), onSuccess: () => { inv(); setTitulo(""); }, onError: (e: Error) => toast.error(e.message) });
  const lead = new Map<string, any>(d.leads.map((l: any) => [l.id, l]));
  const pend = d.tarefas.filter((t: any) => !t.done_at);
  const feitas = d.tarefas.filter((t: any) => t.done_at).slice(0, 30);
  const Linha = ({ t }: { t: any }) => (
    <li className="flex items-start gap-3 py-2.5">
      <button type="button" aria-label={t.done_at ? "Reabrir" : "Concluir"} onClick={() => mut.mutate({ op: "done", id: t.id, done: !t.done_at })} className="mt-0.5 text-brand-strong">
        {t.done_at ? <CheckCircle2 className="size-5" /> : <Circle className="size-5 text-muted-foreground" />}
      </button>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${t.done_at ? "text-muted-foreground line-through" : "font-medium"}`}>{t.title}</p>
        <p className="text-xs text-muted-foreground">
          {t.due_at ? `${new Date(t.due_at) < new Date() && !t.done_at ? "Atrasada · " : ""}${horaBR(t.due_at)}` : "Sem prazo"}
          {t.lead_id && lead.get(t.lead_id) ? <> · <button type="button" className="underline" onClick={() => abrir(t.lead_id)}>{lead.get(t.lead_id).restaurant_name}</button></> : null}
        </p>
      </div>
    </li>
  );
  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_320px]">
      <Painel titulo="Tarefas" descricao={`${pend.length} pendente(s)`}>
        <ul className="divide-y divide-border">{pend.map((t: any) => <Linha key={t.id} t={t} />)}</ul>
        {pend.length === 0 && <p className="py-6 text-center text-sm text-muted-foreground">Nenhuma tarefa pendente.</p>}
        {feitas.length > 0 && <details className="mt-4"><summary className="cursor-pointer text-sm text-muted-foreground">Concluídas ({feitas.length})</summary><ul className="divide-y divide-border">{feitas.map((t: any) => <Linha key={t.id} t={t} />)}</ul></details>}
      </Painel>
      <Painel titulo="Nova tarefa">
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); if (titulo.trim().length < 2) return; mut.mutate({ op: "create", leadId: null, title: titulo.trim(), dueAt: quando ? new Date(quando).toISOString() : null }); }}>
          <Campo label="O que fazer"><input className={inputCls} value={titulo} onChange={(e) => setTitulo(e.target.value)} maxLength={200} required /></Campo>
          <Campo label="Prazo"><input className={inputCls} type="datetime-local" value={quando} onChange={(e) => setQuando(e.target.value)} /></Campo>
          <Button type="submit" variant="brand" className="w-full" disabled={mut.isPending}><Plus className="size-4" /> Criar tarefa</Button>
        </form>
      </Painel>
    </div>
  );
}

function Etapas({ d }: { d: Crm }) {
  const salvar = useServerFn(saveCrmStages);
  const inv = useInvalidar();
  const [etapas, setEtapas] = useState<any[]>(() => d.stages.map((s: any) => ({ ...s })));
  const mut = useMutation({ mutationFn: () => salvar({ data: { stages: etapas.map((s, i) => ({ key: s.key, label: s.label, position: i, kind: s.kind, active: s.active })) } }), onSuccess: () => { toast.success("Funil salvo"); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mover = (i: number, dir: -1 | 1) => setEtapas((l) => { const n = [...l]; const j = i + dir; if (j < 0 || j >= n.length) return l; [n[i], n[j]] = [n[j], n[i]]; return n; });
  return (
    <Painel titulo="Etapas do funil" descricao="Renomeie, reordene ou desative. Uma etapa de ganho e uma de perda são obrigatórias." acoes={<Button variant="brand" onClick={() => mut.mutate()} disabled={mut.isPending}><Settings2 className="size-4" /> Salvar funil</Button>}>
      <ul className="divide-y divide-border">
        {etapas.map((s, i) => (
          <li key={s.key} className="flex flex-wrap items-center gap-2 py-2">
            <div className="flex gap-1"><Button variant="ghost" size="sm" onClick={() => mover(i, -1)} aria-label="Subir">↑</Button><Button variant="ghost" size="sm" onClick={() => mover(i, 1)} aria-label="Descer">↓</Button></div>
            <input className={`${inputCls} h-9 flex-1`} value={s.label} maxLength={60} onChange={(e) => setEtapas((l) => l.map((x, k) => (k === i ? { ...x, label: e.target.value } : x)))} aria-label={`Nome da etapa ${i + 1}`} />
            <select className={`${inputCls} h-9 w-auto`} value={s.kind} onChange={(e) => setEtapas((l) => l.map((x, k) => (k === i ? { ...x, kind: e.target.value } : x)))} aria-label="Tipo"><option value="open">Em aberto</option><option value="won">Ganho</option><option value="lost">Perda</option></select>
            <label className="flex items-center gap-1 text-sm"><input type="checkbox" checked={s.active} onChange={(e) => setEtapas((l) => l.map((x, k) => (k === i ? { ...x, active: e.target.checked } : x)))} /> Ativa</label>
          </li>
        ))}
      </ul>
      <Button variant="outline" className="mt-3" onClick={() => { const key = `etapa_${etapas.length + 1}`; setEtapas((l) => [...l.slice(0, -2), { key, label: "Nova etapa", kind: "open", active: true }, ...l.slice(-2)]); }}><Plus className="size-4" /> Nova etapa</Button>
    </Painel>
  );
}

function Ficha({ leadId, d, onFechar }: { leadId: string; d: Crm; onFechar: () => void }) {
  const fetchFicha = useServerFn(getLeadFicha);
  const q = useQuery({ queryKey: ["central-ficha", leadId], queryFn: () => fetchFicha({ data: { leadId } }) });
  const inv = useInvalidar();
  const nota = useServerFn(addCrmNote);
  const vincular = useServerFn(linkLeadRestaurant);
  const etapaImpl = useServerFn(updateImplantationStep);
  const tarefa = useServerFn(saveCrmTask);
  const [texto, setTexto] = useState("");
  const [tipo, setTipo] = useState<"note" | "call" | "meeting" | "whatsapp" | "email">("note");
  const mNota = useMutation({ mutationFn: () => nota({ data: { leadId, kind: tipo, title: texto.slice(0, 120), body: texto } }), onSuccess: () => { setTexto(""); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mVinc = useMutation({ mutationFn: (restaurantId: string | null) => vincular({ data: { leadId, restaurantId } }), onSuccess: () => { toast.success("Vínculo salvo"); inv(); }, onError: (e: Error) => toast.error(e.message) });
  const mImpl = useMutation({ mutationFn: (v: { id: string; done: boolean }) => etapaImpl({ data: v }), onSuccess: () => inv(), onError: (e: Error) => toast.error(e.message) });
  const mTarefa = useMutation({ mutationFn: (title: string) => tarefa({ data: { op: "create", leadId, title, dueAt: new Date(Date.now() + 864e5).toISOString() } }), onSuccess: () => { toast.success("Tarefa criada para amanhã"); inv(); } });
  const f = q.data;
  const l = f?.lead;
  const opp = f?.oportunidades?.[0];
  const fone = String(l?.phone ?? "").replace(/\D/g, "");
  return (
    <PainelLateral aberto onFechar={onFechar} largo titulo={l?.restaurant_name ?? "Lead"} descricao={l ? `${l.contact_name} · ${ROLE_LABEL[l.contact_role] ?? ""} · entrou em ${dataBR(l.created_at)}` : undefined}>
      {!f ? <Esqueleto linhas={8} /> : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center gap-2">
            <StatusBadge tone={opp?.status === "won" ? "success" : opp?.status === "lost" ? "error" : "brand"}>{opp ? nomeEtapa(d, opp.stage_key) : "Sem oportunidade"}</StatusBadge>
            {f.restaurante && <StatusBadge tone="success">Restaurante: {f.restaurante.name}</StatusBadge>}
            {f.whatsapp && <StatusBadge tone={f.whatsapp.unread ? "warning" : "neutral"}>WhatsApp {f.whatsapp.unread ? `${f.whatsapp.unread} sem ler` : f.whatsapp.status}</StatusBadge>}
            <span className="ml-auto text-xs text-muted-foreground">Score {leadScore(l)}</span>
          </div>

          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
            {[["E-mail", l.email], ["Telefone", l.phone], ["Cidade", `${l.city ?? ""}${l.state ? `/${l.state}` : ""}`], ["Mesas", l.tables_range], ["PDV", l.pdv_system], ["Adquirente", l.acquirer], ["Pagar.me", l.has_pagarme ? "Sim" : "Não"], ["Origem", l.utm_source ?? SOURCES[l.discovery_source] ?? "direto"], ["Indicado por", l.referred_by_code]].filter(([, v]) => v).map(([k, v]) => (
              <div key={String(k)}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{String(v)}</dd></div>
            ))}
          </dl>

          <div className="flex flex-wrap gap-2">
            {fone && <Button asChild variant="outline" size="sm"><a href={`https://wa.me/${fone.startsWith("55") ? fone : `55${fone}`}`} target="_blank" rel="noreferrer"><MessageCircle className="size-4" /> WhatsApp</a></Button>}
            <Button variant="outline" size="sm" onClick={() => mTarefa.mutate(`Retornar contato: ${l.restaurant_name}`)}><Plus className="size-4" /> Tarefa de retorno</Button>
            <label className="flex items-center gap-2 text-sm">
              <Link2 className="size-4 text-muted-foreground" />
              <select className={`${inputCls} h-9 w-auto`} value={l.restaurant_id ?? ""} onChange={(e) => mVinc.mutate(e.target.value || null)} aria-label="Vincular restaurante">
                <option value="">Vincular a um restaurante…</option>
                {d.restaurantes.map((r: any) => <option key={r.id} value={r.id}>{r.name}</option>)}
              </select>
            </label>
          </div>

          {f.implantacao.length > 0 && (
            <section>
              <h3 className="mb-2 text-sm font-semibold">Implantação · {Math.round((f.implantacao.filter((s: any) => s.done_at).length / f.implantacao.length) * 100)}%</h3>
              <ul className="space-y-1">
                {f.implantacao.map((s: any) => (
                  <li key={s.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.done_at} onChange={(e) => mImpl.mutate({ id: s.id, done: e.target.checked })} /><span className={s.done_at ? "text-muted-foreground line-through" : ""}>{s.label}</span></label></li>
                ))}
              </ul>
            </section>
          )}

          {f.tarefas.filter((t: any) => !t.done_at).length > 0 && (
            <section><h3 className="mb-1 text-sm font-semibold">Tarefas abertas</h3><ul className="text-sm">{f.tarefas.filter((t: any) => !t.done_at).map((t: any) => <li key={t.id}>• {t.title}{t.due_at ? ` (${horaBR(t.due_at)})` : ""}</li>)}</ul></section>
          )}

          <section>
            <h3 className="mb-2 text-sm font-semibold">Registrar</h3>
            <form className="space-y-2" onSubmit={(e) => { e.preventDefault(); if (texto.trim()) mNota.mutate(); }}>
              <div className="flex gap-2">
                <select className={`${inputCls} h-9 w-auto`} value={tipo} onChange={(e) => setTipo(e.target.value as typeof tipo)} aria-label="Tipo"><option value="note">Nota</option><option value="call">Ligação</option><option value="meeting">Reunião</option><option value="whatsapp">WhatsApp</option><option value="email">E-mail</option></select>
                <input className={`${inputCls} h-9 flex-1`} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder="O que aconteceu" maxLength={2000} />
                <Button type="submit" variant="ink" size="sm" disabled={mNota.isPending}>Salvar</Button>
              </div>
            </form>
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold">Histórico</h3>
            <ol className="space-y-3 border-l border-border pl-4 text-sm">
              {[...f.atividades.map((a: any) => ({ k: `a${a.id}`, em: a.created_at, t: a.title, b: a.body, tipo: a.kind })), ...f.emails.map((e: any) => ({ k: `e${e.id}`, em: e.created_at, t: `E-mail ${e.template}: ${e.status}`, b: e.subject, tipo: "email" }))]
                .sort((a, b) => b.em.localeCompare(a.em)).slice(0, 80).map((h) => (
                  <li key={h.k} className="relative"><span className="absolute -left-[21px] top-1.5 size-2.5 rounded-full bg-brand" /><p className="font-medium">{h.t}</p>{h.b && <p className="whitespace-pre-wrap text-muted-foreground">{h.b}</p>}<p className="text-xs text-muted-foreground">{horaBR(h.em)} · {h.tipo}</p></li>
                ))}
              {f.atividades.length === 0 && f.emails.length === 0 && <li className="text-muted-foreground">Sem registros ainda.</li>}
            </ol>
          </section>
          {opp?.status === "open" && opp.stage_key === "novo_lead" && <Aviso tone="warning">Lead ainda sem primeiro contato. Mova a etapa no funil quando responder.</Aviso>}
        </div>
      )}
    </PainelLateral>
  );
}
