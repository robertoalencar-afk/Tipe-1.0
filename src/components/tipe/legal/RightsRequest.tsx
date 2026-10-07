import { useServerFn } from "@tanstack/react-start";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitPrivacyRequest } from "@/lib/tipe/legal.functions";

export const RIGHT_ACTIONS: Record<string, { label: string; type: RequestType }> = {
  "Confirmação e acesso": { label: "Quero acessar meus dados", type: "access" },
  "Correção": { label: "Quero corrigir", type: "correction" },
  "Anonimização, bloqueio ou eliminação": { label: "Quero anonimizar ou bloquear", type: "anonymization" },
  "Portabilidade": { label: "Quero levar meus dados", type: "portability" },
  "Eliminação dos dados tratados com consentimento": { label: "Quero excluir", type: "deletion" },
  "Informação sobre compartilhamento": { label: "Quero saber com quem", type: "sharing_info" },
  "Informação sobre o consentimento": { label: "Quero entender o consentimento", type: "consent_info" },
  "Revogação do consentimento": { label: "Quero revogar consentimento", type: "revoke_consent" },
  "Oposição": { label: "Quero me opor", type: "opposition" },
  "Revisão": { label: "Quero pedir revisão", type: "review" },
};
export type RequestType = "access" | "correction" | "anonymization" | "portability" | "deletion" | "sharing_info" | "consent_info" | "revoke_consent" | "opposition" | "review" | "other";
const TYPES: [RequestType, string][] = [
  ["access", "Acessar meus dados"], ["correction", "Corrigir dados"], ["anonymization", "Anonimizar, bloquear ou eliminar"], ["portability", "Portabilidade"],
  ["deletion", "Excluir dados tratados com consentimento"], ["sharing_info", "Saber com quem compartilham"], ["consent_info", "Informação sobre consentimento"],
  ["revoke_consent", "Revogar consentimento"], ["opposition", "Oposição"], ["review", "Revisão de decisão automatizada"], ["other", "Outro"],
];

export function RightsCards({ rows }: { rows: string[][] }) {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2">
      {rows.map(([right = "", meaning = ""]) => {
        const a = RIGHT_ACTIONS[right];
        return (
          <div key={right} className="flex flex-col rounded-2xl border border-border bg-card p-4">
            <p className="font-display text-sm font-bold">{right}</p>
            <p className="mt-1 flex-1 text-sm leading-6 text-muted-foreground">{meaning}</p>
            {a && <Button data-noprint variant="outline" size="sm" className="mt-3 self-start" onClick={() => window.dispatchEvent(new CustomEvent("tipe:right", { detail: a.type }))}>{a.label}</Button>}
          </div>
        );
      })}
    </div>
  );
}

const field = "mt-1 h-11";
export function RightsForm() {
  const enviar = useServerFn(submitPrivacyRequest);
  const [f, setF] = useState({ requestType: "access" as RequestType, holderCategory: "consumer" as "consumer" | "restaurant" | "staff" | "other", name: "", email: "", details: "", restaurant: "", date: "", amount: "" });
  const [state, setState] = useState<{ loading: boolean; error?: string; protocol?: string }>({ loading: false });
  useEffect(() => {
    const h = (e: Event) => { setF((x) => ({ ...x, requestType: (e as CustomEvent<RequestType>).detail })); document.getElementById("solicitacao")?.scrollIntoView({ behavior: "smooth", block: "start" }); setTimeout(() => document.getElementById("rq-name")?.focus(), 400); };
    window.addEventListener("tipe:right", h); return () => window.removeEventListener("tipe:right", h);
  }, []);
  async function submit(e: React.FormEvent) {
    e.preventDefault(); setState({ loading: true });
    try {
      const r = await enviar({ data: { ...f, details: f.details || undefined, restaurant: f.restaurant || undefined, date: f.date || undefined, amount: f.amount || undefined } });
      setState({ loading: false, protocol: r.protocol });
    } catch (err) { setState({ loading: false, error: err instanceof Error && err.message.length < 140 ? err.message : "Não foi possível enviar agora. Tente de novo ou escreva para contato@tipe.digital." }); }
  }
  return (
    <section id="solicitacao" data-noprint aria-labelledby="solicitacao-title" className="mt-10 scroll-mt-24 rounded-3xl border border-border bg-card p-5 sm:p-7">
      <h2 id="solicitacao-title" className="font-display text-xl font-bold">Fazer uma solicitação</h2>
      {state.protocol ? (
        <div role="status" className="mt-4 rounded-2xl border-l-4 border-primary bg-accent/40 p-5">
          <p className="font-semibold">Recebemos sua solicitação.</p>
          <p className="mt-2 text-sm leading-6">Protocolo: <strong className="font-mono">{state.protocol}</strong></p>
          <p className="mt-1 text-sm leading-6 text-muted-foreground">Respondemos em até 15 dias pelo e-mail informado. Guarde o número do protocolo.</p>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-medium sm:col-span-2">Tipo de pedido
            <select value={f.requestType} onChange={(e) => setF({ ...f, requestType: e.target.value as RequestType })} className={`${field} w-full rounded-md border border-input bg-background px-3 text-sm`}>
              {TYPES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
          </label>
          <label className="text-sm font-medium sm:col-span-2">Você é
            <select value={f.holderCategory} onChange={(e) => setF({ ...f, holderCategory: e.target.value as typeof f.holderCategory })} className={`${field} w-full rounded-md border border-input bg-background px-3 text-sm`}>
              <option value="consumer">Cliente de restaurante</option><option value="restaurant">Restaurante</option><option value="staff">Colaborador</option><option value="other">Outro</option>
            </select>
          </label>
          <label className="text-sm font-medium">Nome<Input id="rq-name" required minLength={2} maxLength={120} value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} className={field} /></label>
          <label className="text-sm font-medium">E-mail para resposta<Input required type="email" maxLength={200} value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} className={field} /></label>
          {f.holderCategory === "consumer" && <>
            <label className="text-sm font-medium">Restaurante<Input maxLength={120} value={f.restaurant} onChange={(e) => setF({ ...f, restaurant: e.target.value })} className={field} /></label>
            <label className="text-sm font-medium">Data do pagamento<Input type="date" value={f.date} onChange={(e) => setF({ ...f, date: e.target.value })} className={field} /></label>
            <label className="text-sm font-medium">Valor aproximado<Input inputMode="decimal" maxLength={20} placeholder="R$ 0,00" value={f.amount} onChange={(e) => setF({ ...f, amount: e.target.value })} className={field} /></label>
          </>}
          <label className="text-sm font-medium sm:col-span-2">Detalhes<Textarea maxLength={1500} rows={4} value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} className="mt-1" /></label>
          <p className="text-xs font-medium text-muted-foreground sm:col-span-2">Não envie documentos nem senhas.</p>
          {state.error && <p role="alert" className="text-sm text-destructive sm:col-span-2">{state.error}</p>}
          <Button type="submit" disabled={state.loading} className="h-11 sm:col-span-2 sm:justify-self-start">{state.loading ? "Enviando…" : "Enviar solicitação"}</Button>
        </form>
      )}
    </section>
  );
}
