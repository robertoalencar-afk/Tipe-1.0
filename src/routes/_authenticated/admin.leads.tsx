import { FounderMfaGate } from "@/components/tipe/FounderMfaGate";
import { createFileRoute, Link, redirect } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Download, MessageCircle, Search } from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { listLeads, updateLead, type Lead } from "@/lib/tipe/leads.functions";
import { CLOSE_TIMES, LEAD_STATUS, LOST_REASONS, PAINS, PEAKS, QUEUES, ROLE_LABEL, SOURCES, TABLES, TICKETS, VENUE, WAITERS, PAGARME, leadScore } from "@/lib/tipe/leads-score";

export const Route = createFileRoute("/_authenticated/admin/leads")({
  beforeLoad: () => { throw redirect({ to: "/central", search: { s: "comercial", aba: "leads" } }); },
  head: () => ({ meta: [
    { title: "Leads da lista de espera | TIPE" },
    { name: "description", content: "Área interna da TIPE para acompanhar os restaurantes da lista de espera." },
    { property: "og:title", content: "Leads | TIPE" },
    { property: "og:description", content: "Mini-CRM interno da TIPE." },
    { property: "og:type", content: "website" },
    { name: "twitter:card", content: "summary" },
    { name: "robots", content: "noindex" },
  ] }),
  component: () => <FounderMfaGate><LeadsPage /></FounderMfaGate>,
});

const dt = (s: string) => new Date(s).toLocaleDateString("pt-BR");
const origemDe = (l: Lead) => l.utm_source ? `${l.utm_source}${l.utm_campaign ? ` / ${l.utm_campaign}` : ""}` : l.referred_by_code ? "indicação" : l.discovery_source ? (SOURCES[l.discovery_source] ?? l.discovery_source) : "direto";
const pdvDe = (l: Lead) => (l.pdv_system ?? "").trim();

function waLink(l: Lead) {
  const n = (l.phone ?? "").replace(/\D/g, "");
  const msg = `Olá, ${l.contact_name.split(" ")[0]}! Aqui é da TIPE. Vi que o ${l.restaurant_name} entrou na nossa lista de espera. Podemos agendar uma demonstração rápida?`;
  return `https://wa.me/55${n}?text=${encodeURIComponent(msg)}`;
}

const CSV_COLS: (keyof Lead)[] = ["created_at", "restaurant_name", "contact_name", "email", "phone", "city", "state", "contact_role", "marketing_opt_in", "neighborhood", "instagram", "venue_type", "tables_range", "waiters_range", "peak_times", "ticket_range", "close_time", "peak_queue", "pains", "pdv_system", "acquirer", "has_pagarme", "discovery_source", "referrer_name", "stage2_completed_at", "utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term", "ref_code", "referred_by_code", "origin_page", "used_simulator", "calculator", "status", "notes", "next_contact_at", "lost_reason"];
function exportCsv(rows: (Lead & { score: number })[]) {
  const esc = (v: unknown) => { const s = v == null ? "" : typeof v === "object" ? JSON.stringify(v) : String(v); return `"${s.replace(/"/g, '""')}"`; };
  const body = [["score", ...CSV_COLS].join(";"), ...rows.map((r) => [r.score, ...CSV_COLS.map((c) => r[c])].map(esc).join(";"))].join("\n");
  const url = URL.createObjectURL(new Blob(["\ufeff" + body], { type: "text/csv;charset=utf-8" }));
  const a = document.createElement("a"); a.href = url; a.download = `leads-tipe-${new Date().toISOString().slice(0, 10)}.csv`; a.click(); URL.revokeObjectURL(url);
}

function LeadsPage() {
  const fetchLeads = useServerFn(listLeads);
  const q = useQuery({ queryKey: ["admin-leads"], queryFn: () => fetchLeads(), retry: false });
  const [busca, setBusca] = useState("");
  const [fil, setFil] = useState({ city: "", neighborhood: "", venue: "", tables: "", pdv: "", origem: "", status: "", etapa2: "" });
  const [aberto, setAberto] = useState<string | null>(null);

  const leads = useMemo(() => (q.data ?? []).map((l) => ({ ...l, score: leadScore(l) })).sort((a, b) => b.score - a.score || b.created_at.localeCompare(a.created_at)), [q.data]);
  const uniq = (fn: (l: Lead) => string) => [...new Set(leads.map(fn).filter(Boolean))].sort();
  const filtrados = leads.filter((l) => {
    const t = busca.toLowerCase();
    if (t && ![l.restaurant_name, l.contact_name, l.email, l.phone, l.city].some((x) => x?.toLowerCase().includes(t))) return false;
    if (fil.city && l.city !== fil.city) return false;
    if (fil.neighborhood && l.neighborhood !== fil.neighborhood) return false;
    if (fil.venue && l.venue_type !== fil.venue) return false;
    if (fil.tables && l.tables_range !== fil.tables) return false;
    if (fil.pdv && pdvDe(l) !== fil.pdv) return false;
    if (fil.origem && origemDe(l) !== fil.origem) return false;
    if (fil.status && l.status !== fil.status) return false;
    if (fil.etapa2 && (fil.etapa2 === "sim") !== !!l.stage2_completed_at) return false;
    return true;
  });

  if (q.isLoading) return <p className="p-8 text-muted-foreground">Carregando…</p>;
  if (q.error) return (
    <div className="mx-auto max-w-md p-8 text-center">
      <p className="font-display text-xl font-bold">Acesso restrito</p>
      <p className="mt-2 text-muted-foreground">Esta área é só para administradores TIPE.</p>
      <Link to="/" className="mt-4 inline-block text-primary underline">Voltar ao site</Link>
    </div>
  );

  const semana = leads.filter((l) => Date.now() - Date.parse(l.created_at) < 7 * 86400000).length;
  const contar = (fn: (l: Lead) => string) => { const m = new Map<string, number>(); leads.forEach((l) => { const k = fn(l); if (k) m.set(k, (m.get(k) ?? 0) + 1); }); return [...m.entries()].sort((a, b) => b[1] - a[1]); };
  const pdvRank = contar((l) => pdvDe(l).toLowerCase() ? pdvDe(l) : "");
  const refRank = contar((l) => l.referred_by_code ?? "").map(([code, n]) => [leads.find((x) => x.ref_code === code)?.restaurant_name ?? code, n] as const);
  const sel = "h-9 rounded-md border border-input bg-background px-2 text-sm";
  const Box = ({ t, children }: { t: string; children: React.ReactNode }) => <div className="rounded-2xl border bg-card p-4"><p className="text-xs font-semibold text-muted-foreground">{t}</p>{children}</div>;
  const Lista = ({ rows }: { rows: readonly (readonly [string, number])[] }) => rows.length ? <ul className="mt-2 space-y-1 text-sm">{rows.slice(0, 8).map(([k, n]) => <li key={k} className="flex justify-between gap-2"><span className="truncate">{k}</span><strong>{n}</strong></li>)}</ul> : <p className="mt-2 text-sm text-muted-foreground">Sem dados ainda.</p>;

  return (
    <div className="min-h-screen bg-background">
      <header className="flex items-center justify-between border-b px-6 py-3"><TipeLogo variant="dark" className="h-9" /><nav className="flex items-center gap-4"><Link to="/crm" className="text-sm text-muted-foreground hover:text-foreground">CRM comercial</Link><Link to="/backoffice" className="text-sm text-muted-foreground hover:text-foreground">Backoffice</Link></nav></header>
      <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <h1 className="font-display text-2xl font-extrabold">Leads da lista de espera</h1>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
          <Box t="Total de leads"><p className="font-display text-3xl font-bold">{leads.length}</p></Box>
          <Box t="Leads da semana"><p className="font-display text-3xl font-bold">{semana}</p></Box>
          <Box t="Por status"><Lista rows={contar((l) => LEAD_STATUS[l.status] ?? l.status)} /></Box>
          <Box t="Por origem / UTM"><Lista rows={contar(origemDe)} /></Box>
          <Box t="Ranking de indicações"><Lista rows={refRank} /></Box>
        </div>
        <div className="rounded-2xl border-2 border-primary/40 bg-primary/5 p-4">
          <p className="font-display font-bold">PDVs mais citados</p>
          <p className="text-xs text-muted-foreground">Quantidade de leads por sistema informado. Use para decidir quais integrações fazer primeiro.</p>
          <Lista rows={pdvRank} />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-56 flex-1"><Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" /><Input className="pl-8" placeholder="Buscar nome, restaurante, e-mail, telefone" value={busca} onChange={(e) => setBusca(e.target.value)} /></div>
          <select className={sel} value={fil.city} onChange={(e) => setFil({ ...fil, city: e.target.value })}><option value="">Cidade</option>{uniq((l) => l.city ?? "").map((c) => <option key={c}>{c}</option>)}</select>
          <select className={sel} value={fil.neighborhood} onChange={(e) => setFil({ ...fil, neighborhood: e.target.value })}><option value="">Bairro</option>{uniq((l) => l.neighborhood ?? "").map((c) => <option key={c}>{c}</option>)}</select>
          <select className={sel} value={fil.venue} onChange={(e) => setFil({ ...fil, venue: e.target.value })}><option value="">Tipo</option>{Object.entries(VENUE).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={sel} value={fil.tables} onChange={(e) => setFil({ ...fil, tables: e.target.value })}><option value="">Mesas</option>{Object.entries(TABLES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={sel} value={fil.pdv} onChange={(e) => setFil({ ...fil, pdv: e.target.value })}><option value="">PDV</option>{uniq(pdvDe).map((c) => <option key={c}>{c}</option>)}</select>
          <select className={sel} value={fil.origem} onChange={(e) => setFil({ ...fil, origem: e.target.value })}><option value="">Origem</option>{uniq(origemDe).map((c) => <option key={c}>{c}</option>)}</select>
          <select className={sel} value={fil.status} onChange={(e) => setFil({ ...fil, status: e.target.value })}><option value="">Status</option>{Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
          <select className={sel} value={fil.etapa2} onChange={(e) => setFil({ ...fil, etapa2: e.target.value })}><option value="">Etapa 2</option><option value="sim">Preenchida</option><option value="nao">Não preenchida</option></select>
          <Button variant="outline" size="sm" onClick={() => exportCsv(filtrados)}><Download className="mr-1 h-4 w-4" />Exportar CSV</Button>
        </div>
        <p className="text-xs text-muted-foreground">{filtrados.length} lead(s), ordenados por prioridade.</p>
        <ul className="space-y-2">
          {filtrados.map((l) => (
            <li key={l.id} className="rounded-2xl border bg-card">
              <button type="button" className="flex w-full flex-wrap items-center gap-3 p-4 text-left" onClick={() => setAberto(aberto === l.id ? null : l.id)}>
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-full font-display font-bold ${l.score >= 60 ? "bg-primary text-primary-foreground" : "bg-muted"}`}>{l.score}</span>
                <span className="min-w-0 flex-1"><span className="block truncate font-semibold">{l.restaurant_name}</span><span className="block truncate text-xs text-muted-foreground">{l.contact_name} · {l.city ?? "-"}{l.state ? `/${l.state}` : ""} · {dt(l.created_at)}</span></span>
                <span className="rounded-full border px-2 py-0.5 text-xs">{LEAD_STATUS[l.status] ?? l.status}</span>
                {!l.stage2_completed_at && <span className="text-xs text-muted-foreground">Etapa 2 pendente</span>}
              </button>
              {aberto === l.id && <LeadDetalhe lead={l} />}
            </li>
          ))}
        </ul>
      </main>
    </div>
  );
}

function LeadDetalhe({ lead: l }: { lead: Lead }) {
  const save = useServerFn(updateLead);
  const qc = useQueryClient();
  const [f, setF] = useState({ status: l.status, notes: l.notes ?? "", next: l.next_contact_at ?? "", lost: l.lost_reason ?? "" });
  const lab = (map: Record<string, string>, v: string | null) => (v ? map[v] ?? v : "-");
  const many = (map: Record<string, string>, v: string[] | null) => (v?.length ? v.map((x) => map[x] ?? x).join(", ") : "-");
  const linhas: [string, string][] = [
    ["E-mail", l.email], ["WhatsApp", l.phone ?? "-"], ["Cargo", lab(ROLE_LABEL, l.contact_role)], ["Aceita novidades", l.marketing_opt_in ? "Sim" : "Não"],
    ["Bairro", l.neighborhood ?? "-"], ["Instagram", l.instagram ?? "-"], ["Tipo", lab(VENUE, l.venue_type)], ["Mesas", lab(TABLES, l.tables_range)], ["Garçons", lab(WAITERS, l.waiters_range)],
    ["Pico", many(PEAKS, l.peak_times)], ["Ticket médio", lab(TICKETS, l.ticket_range)], ["Tempo para liberar a mesa", lab(CLOSE_TIMES, l.close_time)], ["Fila no pico", lab(QUEUES, l.peak_queue)],
    ["Dores", many(PAINS, l.pains)], ["PDV", l.pdv_system ?? "-"], ["Maquininha", l.acquirer ?? "-"], ["Pagar.me", lab(PAGARME, l.has_pagarme)],
    ["Como conheceu", lab(SOURCES, l.discovery_source)], ["Quem indicou", l.referrer_name ?? "-"], ["Código de indicação", l.ref_code ?? "-"], ["Indicado pelo código", l.referred_by_code ?? "-"],
    ["UTM", [l.utm_source, l.utm_medium, l.utm_campaign, l.utm_content, l.utm_term].filter(Boolean).join(" / ") || "-"], ["Página de origem", l.origin_page ?? "-"],
    ["Usou o simulador", l.used_simulator ? "Sim" : "Não"], ["Calculadora", l.calculator ? Object.entries(l.calculator).map(([k, v]) => `${k}: ${v}`).join(" · ") : "-"],
  ];
  if (l.message) linhas.push(["Mensagem antiga", l.message]);
  async function salvar() {
    try {
      await save({ data: { id: l.id, status: f.status as "novo", notes: f.notes || null, nextContactAt: f.next || null, lostReason: f.status === "perdido" && f.lost ? (f.lost as "preco") : null } });
      toast.success("Lead atualizado"); qc.invalidateQueries({ queryKey: ["admin-leads"] });
    } catch (e) { toast.error((e as Error).message); }
  }
  return (
    <div className="grid gap-4 border-t p-4 lg:grid-cols-[1.3fr_1fr]">
      <dl className="grid gap-x-4 gap-y-1 text-sm sm:grid-cols-2">{linhas.map(([k, v]) => <div key={k}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="break-words">{v}</dd></div>)}</dl>
      <div className="space-y-3">
        <a href={waLink(l)} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center gap-2 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground"><MessageCircle className="h-4 w-4" />Chamar no WhatsApp</a>
        <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.status} onChange={(e) => setF({ ...f, status: e.target.value })}>{Object.entries(LEAD_STATUS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>
        {f.status === "perdido" && <select className="h-10 w-full rounded-md border border-input bg-background px-2 text-sm" value={f.lost} onChange={(e) => setF({ ...f, lost: e.target.value })}><option value="">Motivo da perda</option>{Object.entries(LOST_REASONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select>}
        <label className="block text-xs text-muted-foreground">Próximo contato<Input type="date" value={f.next} onChange={(e) => setF({ ...f, next: e.target.value })} /></label>
        <textarea className="min-h-24 w-full rounded-md border border-input bg-background p-2 text-sm" maxLength={4000} placeholder="Observações" value={f.notes} onChange={(e) => setF({ ...f, notes: e.target.value })} />
        <Button className="w-full" onClick={salvar}>Salvar</Button>
      </div>
    </div>
  );
}
