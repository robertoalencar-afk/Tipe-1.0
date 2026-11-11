import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Busca, Campo, Esqueleto, Kpi, Painel, PainelLateral, Segmentado, StatusBadge, Tabela, brl, dataBR, horaBR, inputCls, type Tone } from "@/components/tipe/painel/ui";
import { ModuloOrder } from "@/components/tipe/ModulosFundador";
import { PlansAdmin } from "@/components/tipe/PlansAdmin";
import { getRestaurantesCentral, updateImplantationStep } from "@/lib/tipe/central.functions";
import { createRestaurant } from "@/lib/tipe/staff.functions";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["lista", "Restaurantes"], ["assinaturas", "Assinaturas"], ["implantacoes", "Implantações"], ["integracoes", "Integrações"]] as const;
const SUB_LABEL: Record<string, string> = { trialing: "Teste grátis", active: "Ativa", past_due: "Em atraso", canceled: "Cancelada", "sem assinatura": "Sem assinatura" };
const SUB_TONE: Record<string, Tone> = { trialing: "info", active: "success", past_due: "error", canceled: "neutral" };

export function Restaurantes({ aba, id, ir }: Props) {
  const atual = ABAS.some(([k]) => k === aba) ? (aba as (typeof ABAS)[number][0]) : "lista";
  const fetchR = useServerFn(getRestaurantesCentral);
  const q = useQuery({ queryKey: ["central-rest"], queryFn: () => fetchR(), refetchInterval: 60_000 });
  const [busca, setBusca] = useState("");
  const [novo, setNovo] = useState(false);
  if (q.isPending || !q.data) return <Esqueleto linhas={6} />;
  const todos = q.data.restaurantes;
  const lista = todos.filter((r) => !busca || r.nome.toLowerCase().includes(busca.toLowerCase()) || r.slug.includes(busca.toLowerCase()));
  const abrir = (rid: string) => ir("restaurantes", atual, rid);
  const sel = id ? todos.find((r) => r.id === id) : undefined;
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <Segmentado label="Seção" value={atual} onChange={(a) => ir("restaurantes", a)} options={ABAS} />
        <div className="flex gap-2"><Busca value={busca} onChange={setBusca} placeholder="Nome ou slug" /><Button variant="brand" onClick={() => setNovo(true)}><Plus className="size-4" /> Novo restaurante</Button></div>
      </div>
      {atual === "lista" && (
        <Painel semPadding titulo="Clientes" descricao={`${todos.length} restaurantes · volume e gorjetas dos últimos 30 dias`}>
          <Tabela linhas={lista} chave={(r) => r.id} onLinha={(r) => abrir(r.id)} vazio="Nenhum restaurante." colunas={[
            { k: "n", l: "Restaurante", c: (r) => <span className="font-medium">{r.nome}<span className="block text-xs text-muted-foreground">/{r.slug}</span></span> },
            { k: "a", l: "Assinatura", c: (r) => <StatusBadge tone={SUB_TONE[r.assinatura] ?? "neutral"}>{r.isento ? "Isento" : SUB_LABEL[r.assinatura] ?? r.assinatura}</StatusBadge> },
            { k: "p", l: "Plano", md: true, c: (r) => String(r.plano ?? "—") },
            { k: "i", l: "Implantação", md: true, c: (r) => r.onboarding === "done" ? <StatusBadge tone="success">Operando</StatusBadge> : <StatusBadge tone="warning">{r.implantacaoPct != null ? `${r.implantacaoPct}%` : "Pendente"}</StatusBadge> },
            { k: "m", l: "Mesas", num: true, md: true, c: (r) => r.mesas },
            { k: "e", l: "Equipe", md: true, c: (r) => `${r.equipe.admin} adm · ${r.equipe.gerente} ger · ${r.equipe.caixa} cx · ${r.equipe.garcom} gç` },
            { k: "v", l: "Volume 30 d", num: true, c: (r) => brl(r.volume30) },
            { k: "pdv", l: "PDV", md: true, c: (r) => r.errosPdv.length ? <StatusBadge tone="error">{r.pdv ?? "—"} · erro</StatusBadge> : (r.pdv ?? "—") },
          ]} />
        </Painel>
      )}
      {atual === "assinaturas" && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            <Kpi label="Ativas" value={todos.filter((r) => r.assinatura === "active").length} tone="brand" />
            <Kpi label="Em teste" value={todos.filter((r) => r.assinatura === "trialing").length} />
            <Kpi label="Em atraso" value={todos.filter((r) => r.assinatura === "past_due").length} tone={todos.some((r) => r.assinatura === "past_due") ? "error" : undefined} />
            <Kpi label="Isentas" value={todos.filter((r) => r.isento).length} />
          </div>
          <Painel semPadding titulo="Assinaturas por restaurante">
            <Tabela linhas={lista} chave={(r) => r.id} onLinha={(r) => abrir(r.id)} colunas={[
              { k: "n", l: "Restaurante", c: (r) => r.nome },
              { k: "s", l: "Status", c: (r) => <StatusBadge tone={SUB_TONE[r.assinatura] ?? "neutral"}>{r.isento ? "Isento" : SUB_LABEL[r.assinatura] ?? r.assinatura}</StatusBadge> },
              { k: "p", l: "Plano", c: (r) => r.plano ?? "—" },
              { k: "t", l: "Teste até", md: true, c: (r) => r.testeAte ? dataBR(r.testeAte) : "—" },
              { k: "d", l: "Atraso desde", md: true, c: (r) => r.atrasoDesde ? dataBR(r.atrasoDesde) : "—" },
              { k: "r", l: "Recebimentos", md: true, c: (r) => String(r.recebimentos) },
            ]} />
          </Painel>
          <PlansAdmin />
        </div>
      )}
      {atual === "implantacoes" && (
        <Painel semPadding titulo="Implantações" descricao="Checklist por restaurante, semeado ao fechar o contrato ou vincular o lead.">
          <Tabela linhas={lista.filter((r) => r.onboarding !== "done" || (r.implantacaoPct != null && r.implantacaoPct < 100))} chave={(r) => r.id} onLinha={(r) => abrir(r.id)} vazio="Nenhuma implantação em andamento." colunas={[
            { k: "n", l: "Restaurante", c: (r) => r.nome },
            { k: "c", l: "Desde", c: (r) => dataBR(r.criadoEm) },
            { k: "p", l: "Progresso", c: (r) => r.implantacaoPct != null ? <span className="flex items-center gap-2"><span className="h-2 w-24 overflow-hidden rounded-full bg-muted"><span className="block h-full bg-brand" style={{ width: `${r.implantacaoPct}%` }} /></span>{r.implantacaoPct}%</span> : <StatusBadge tone="neutral">Sem checklist</StatusBadge> },
            { k: "ct", l: "Contato", md: true, c: (r) => r.contatos[0]?.contact_name ?? "—" },
          ]} />
        </Painel>
      )}
      {atual === "integracoes" && (
        <Painel semPadding titulo="Integrações" descricao="PDV, recebimentos e módulos por restaurante. Erros dos últimos 7 dias.">
          <Tabela linhas={lista} chave={(r) => r.id} onLinha={(r) => abrir(r.id)} colunas={[
            { k: "n", l: "Restaurante", c: (r) => r.nome },
            { k: "pdv", l: "PDV", c: (r) => r.pdv ?? "—" },
            { k: "st", l: "Estado", c: (r) => r.errosPdv.length ? <StatusBadge tone="error">{r.errosPdv.length} erro(s)</StatusBadge> : r.integracao ? <StatusBadge tone="success">{r.integracao.status}</StatusBadge> : <StatusBadge tone="neutral">Sem integração</StatusBadge> },
            { k: "sy", l: "Última sincronização", md: true, c: (r) => r.integracao?.last_sync_at ? horaBR(r.integracao.last_sync_at) : "—" },
            { k: "rc", l: "Pagar.me", md: true, c: (r) => String(r.recebimentos) },
            { k: "m", l: "Módulos", md: true, c: (r) => r.modulos.join(", ") || "—" },
          ]} />
        </Painel>
      )}
      {sel && <FichaRestaurante r={sel} onFechar={() => ir("restaurantes", atual)} />}
      <NovoRestaurante aberto={novo} onFechar={() => setNovo(false)} />
    </div>
  );
}

type R = Awaited<ReturnType<typeof getRestaurantesCentral>>["restaurantes"][number];

function FichaRestaurante({ r, onFechar }: { r: R; onFechar: () => void }) {
  const qc = useQueryClient();
  const etapa = useServerFn(updateImplantationStep);
  const m = useMutation({ mutationFn: (v: { id: string; done: boolean }) => etapa({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["central-rest"] }), onError: (e: Error) => toast.error(e.message) });
  return (
    <PainelLateral aberto onFechar={onFechar} largo titulo={r.nome} descricao={`/${r.slug} · desde ${dataBR(r.criadoEm)}`}>
      <div className="space-y-5">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Kpi label="Volume 30 d" value={brl(r.volume30)} hint={`${r.pagamentos30} pagamentos`} />
          <Kpi label="Gorjetas 30 d" value={brl(r.gorjetas30)} hint="70% ao garçom, 30% Tipe" />
          <Kpi label="Mesas ativas" value={r.mesas} />
        </div>
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          {[["CNPJ", r.cnpj], ["Telefone", r.telefone], ["Endereço", r.endereco], ["PDV", r.pdv], ["Plano", r.plano], ["Assinatura", r.isento ? "Isento" : SUB_LABEL[r.assinatura] ?? r.assinatura], ["Recebimentos", r.recebimentos], ["Módulos", r.modulos.join(", ")]].filter(([, v]) => v).map(([k, v]) => <div key={String(k)}><dt className="text-xs text-muted-foreground">{k}</dt><dd className="font-medium">{String(v)}</dd></div>)}
        </dl>
        <section>
          <h3 className="mb-1 text-sm font-semibold">Equipe</h3>
          <p className="text-sm text-muted-foreground">{r.equipe.admin} administrador(es), {r.equipe.gerente} gerente(s), {r.equipe.caixa} caixa(s), {r.equipe.garcom} garçom(ns)</p>
        </section>
        {r.contatos.length > 0 && <section><h3 className="mb-1 text-sm font-semibold">Contatos comerciais</h3><ul className="text-sm">{r.contatos.map((c: any) => <li key={c.id}>{c.contact_name} · {c.email} · {c.phone}</li>)}</ul></section>}
        <section>
          <h3 className="mb-2 text-sm font-semibold">Implantação {r.implantacaoPct != null ? `· ${r.implantacaoPct}%` : ""}</h3>
          {r.implantacao.length === 0 ? <p className="text-sm text-muted-foreground">Checklist ainda não semeado. Vincule o lead na ficha comercial ou mova a oportunidade para "Implantação".</p> : (
            <ul className="space-y-1">{r.implantacao.map((s: any) => <li key={s.id}><label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={!!s.done_at} onChange={(e) => m.mutate({ id: s.id, done: e.target.checked })} /><span className={s.done_at ? "text-muted-foreground line-through" : ""}>{s.label}</span></label></li>)}</ul>
          )}
        </section>
        {r.errosPdv.length > 0 && <section><h3 className="mb-1 text-sm font-semibold text-destructive">Erros de PDV (7 dias)</h3><ul className="text-sm">{r.errosPdv.slice(0, 10).map((e: any, i: number) => <li key={i}>{horaBR(e.created_at)} · {e.detail ?? "erro"}</li>)}</ul></section>}
        <section><h3 className="mb-2 text-sm font-semibold">Tipe Order</h3><ModuloOrder restaurantId={r.id} nome={r.nome} /></section>
      </div>
    </PainelLateral>
  );
}

function NovoRestaurante({ aberto, onFechar }: { aberto: boolean; onFechar: () => void }) {
  const qc = useQueryClient();
  const criar = useServerFn(createRestaurant);
  const [nome, setNome] = useState("");
  const [slug, setSlug] = useState("");
  const m = useMutation({
    mutationFn: () => criar({ data: { name: nome.trim(), slug: slug.trim() } as any }),
    onSuccess: () => { toast.success("Restaurante criado"); qc.invalidateQueries({ queryKey: ["central-rest"] }); setNome(""); setSlug(""); onFechar(); },
    onError: (e: Error) => toast.error(e.message),
  });
  return (
    <Dialog open={aberto} onOpenChange={(o) => !o && onFechar()}>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo restaurante</DialogTitle></DialogHeader>
        <form className="space-y-3" onSubmit={(e) => { e.preventDefault(); m.mutate(); }}>
          <Campo label="Nome"><input className={inputCls} value={nome} onChange={(e) => { setNome(e.target.value); setSlug(e.target.value.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "")); }} required maxLength={80} /></Campo>
          <Campo label="Slug (endereço)" ajuda="Só letras minúsculas, números e hífen."><input className={inputCls} value={slug} onChange={(e) => setSlug(e.target.value)} required pattern="[a-z0-9-]{3,40}" /></Campo>
          <Button type="submit" variant="brand" className="w-full" disabled={m.isPending}>Criar restaurante</Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
