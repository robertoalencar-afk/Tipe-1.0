import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Aviso, Esqueleto, Painel, Segmentado, StatusBadge, Tabela, horaBR, inputCls, type Tone } from "@/components/tipe/painel/ui";
import { LebreLimits } from "@/components/tipe/LebreLimits";
import { askFounderAssistant, getAssistantHistory, getAutomacoes, toggleAutomacao } from "@/lib/tipe/central.functions";
import type { SecaoCentral } from "@/routes/_authenticated/central";

type Props = { aba?: string | undefined; id?: string | undefined; ir: (s: SecaoCentral, aba?: string, id?: string) => void };
const ABAS = [["lebre", "Lebre"], ["automacoes", "Automações"], ["limites", "Limites de IA"]] as const;
const SUGESTOES = ["Quais restaurantes precisam de atenção hoje?", "Quais leads estão sem resposta?", "Resumo executivo da semana", "Qual a receita da Tipe nos últimos 30 dias?", "Quais clientes estão em implantação?", "Houve falha de integração?"];
const RUN_TONE: Record<string, Tone> = { ok: "success", failed: "error", skipped: "neutral" };

export function Inteligencia({ aba, ir }: Props) {
  const atual = ABAS.some(([k]) => k === aba) ? (aba as (typeof ABAS)[number][0]) : "lebre";
  return (
    <div className="space-y-5">
      <Segmentado label="Seção" value={atual} onChange={(a) => ir("inteligencia", a)} options={ABAS} />
      {atual === "lebre" && <Assistente />}
      {atual === "automacoes" && <Automacoes />}
      {atual === "limites" && <LebreLimits />}
    </div>
  );
}

function Assistente() {
  const qc = useQueryClient();
  const hist = useQuery({ queryKey: ["central-lebre"], queryFn: useServerFn(getAssistantHistory) });
  const perguntar = useServerFn(askFounderAssistant);
  const [p, setP] = useState("");
  const fim = useRef<HTMLDivElement>(null);
  const m = useMutation({ mutationFn: (pergunta: string) => perguntar({ data: { pergunta } }), onSuccess: () => { setP(""); qc.invalidateQueries({ queryKey: ["central-lebre"] }); }, onError: (e: Error) => toast.error(e.message) });
  useEffect(() => { fim.current?.scrollIntoView({ block: "end" }); }, [hist.data, m.isPending]);
  const enviar = (t: string) => { if (t.trim().length >= 2 && !m.isPending) m.mutate(t.trim()); };
  return (
    <Painel titulo="Lebre do fundador" descricao="Consulta só dados autorizados do banco. Não envia nada, não altera contratos, dinheiro nem permissões: entrega rascunhos para você aprovar." semPadding>
      <div className="flex h-[65vh] flex-col">
        <div className="flex-1 space-y-4 overflow-y-auto p-4">
          {hist.isPending && <Esqueleto linhas={3} />}
          {hist.data?.historico.length === 0 && !m.isPending && (
            <div className="space-y-3"><Aviso tone="neutral">Pergunte sobre restaurantes, leads, WhatsApp, implantações, receita ou integrações.</Aviso>
              <div className="flex flex-wrap gap-2">{SUGESTOES.map((s) => <button key={s} type="button" className="rounded-full border border-border px-3 py-1.5 text-sm hover:bg-muted" onClick={() => enviar(s)}>{s}</button>)}</div></div>
          )}
          {hist.data?.historico.map((h: any) => (
            <div key={h.id} className="space-y-2">
              <p className="ml-auto w-fit max-w-[85%] rounded-2xl bg-ink px-3 py-2 text-sm text-white">{h.question}</p>
              <div className="max-w-[90%] rounded-2xl bg-muted px-3 py-2 text-sm"><p className="whitespace-pre-wrap">{h.answer}</p><p className="mt-1 text-[10px] text-muted-foreground">{horaBR(h.created_at)} · {h.provider === "ia" ? "IA" : "dados diretos"} · fontes: {(h.tools ?? []).join(", ")}</p></div>
            </div>
          ))}
          {m.isPending && <p className="text-sm text-muted-foreground">Consultando os dados…</p>}
          <div ref={fim} />
        </div>
        <form className="flex gap-2 border-t border-border p-3" onSubmit={(e) => { e.preventDefault(); enviar(p); }}>
          <input className={`${inputCls} h-10 flex-1`} value={p} onChange={(e) => setP(e.target.value)} placeholder="Pergunte à Lebre" maxLength={2000} />
          <Button type="submit" variant="brand" disabled={m.isPending} aria-label="Enviar"><Send className="size-4" /></Button>
        </form>
      </div>
    </Painel>
  );
}

function Automacoes() {
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["central-auto"], queryFn: useServerFn(getAutomacoes) });
  const alternar = useServerFn(toggleAutomacao);
  const m = useMutation({ mutationFn: (v: { key: string; enabled: boolean }) => alternar({ data: v }), onSuccess: () => qc.invalidateQueries({ queryKey: ["central-auto"] }), onError: (e: Error) => toast.error(e.message) });
  if (q.isPending || !q.data) return <Esqueleto linhas={5} />;
  return (
    <div className="space-y-5">
      <Aviso tone="neutral">Automações só criam registros, tarefas e rascunhos. Nenhuma mensagem ou e-mail sai sozinho.</Aviso>
      <Painel titulo="Regras" semPadding>
        <ul className="divide-y divide-border">
          {q.data.regras.map((r: any) => (
            <li key={r.key} className="flex items-center justify-between gap-4 px-4 py-3">
              <div><p className="text-sm font-medium">{r.label ?? r.key}</p><p className="text-xs text-muted-foreground">{r.description ?? ""}</p></div>
              <Switch checked={r.enabled} onCheckedChange={(v) => m.mutate({ key: r.key, enabled: v })} aria-label={`Ligar ${r.label ?? r.key}`} />
            </li>
          ))}
        </ul>
      </Painel>
      <Painel titulo="Execuções recentes" semPadding>
        <Tabela densa linhas={q.data.execucoes} chave={(e: any) => e.id} vazio="Nenhuma execução ainda." colunas={[
          { k: "q", l: "Quando", c: (e: any) => horaBR(e.created_at) }, { k: "r", l: "Regra", c: (e: any) => e.rule_key },
          { k: "s", l: "Resultado", c: (e: any) => <StatusBadge tone={RUN_TONE[e.status] ?? "neutral"}>{e.status}</StatusBadge> }, { k: "d", l: "Detalhe", md: true, c: (e: any) => e.detail ?? "—" },
        ]} />
      </Painel>
    </div>
  );
}
