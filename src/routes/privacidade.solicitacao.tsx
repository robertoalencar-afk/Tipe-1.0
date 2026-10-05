import { createFileRoute, Link } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { submitPrivacyRequest } from "@/lib/tipe/legal.functions";
import logo from "@/assets/logo-dark.png.asset.json";

export const Route = createFileRoute("/privacidade/solicitacao")({
  head: () => ({
    meta: [
      { title: "Solicitação de privacidade (LGPD) — TIPE" },
      { name: "description", content: "Peça acesso, correção, exclusão ou revogação de consentimento dos seus dados no TIPE." },
      { property: "og:title", content: "Solicitação de privacidade — TIPE" },
      { property: "og:description", content: "Exerça seus direitos de titular previstos na LGPD." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Solicitacao,
});

const TIPOS = [
  ["access", "Acesso aos meus dados"], ["correction", "Corrigir meus dados"], ["deletion", "Excluir/anonimizar dados"],
  ["revoke_consent", "Revogar consentimento"], ["other", "Outra solicitação de privacidade"],
] as const;
const PERFIS = [["consumer", "Cliente de restaurante"], ["restaurant", "Restaurante / responsável"], ["staff", "Garçom / colaborador"], ["other", "Outro"]] as const;

function Solicitacao() {
  const enviar = useServerFn(submitPrivacyRequest);
  const [f, setF] = useState({ requestType: "access", holderCategory: "consumer", name: "", email: "", details: "" });
  const [ok, setOk] = useState(false);
  const [busy, setBusy] = useState(false);
  const sel = "mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm";

  async function submit(e: React.FormEvent) {
    e.preventDefault(); setBusy(true);
    try { await enviar({ data: { ...f, details: f.details || undefined } as never }); setOk(true); }
    catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-xl px-4 py-10">
        <Link to="/privacidade" className="text-sm text-muted-foreground hover:text-foreground">← Política de Privacidade</Link>
        <div className="mt-6 rounded-3xl border bg-card p-5 shadow-sm sm:p-8">
          <img src={logo.url} alt="TIPE" className="h-10 w-auto" />
          <h1 className="mt-5 font-display text-2xl font-bold">Solicitação de privacidade</h1>
          {ok ? (
            <p role="status" className="mt-4 text-sm leading-relaxed">Recebemos sua solicitação. Antes de qualquer acesso ou alteração, confirmaremos sua identidade pelo e-mail informado. Nenhum dado é exibido nesta página.</p>
          ) : (
            <form onSubmit={submit} className="mt-5 space-y-4">
              <p className="text-sm text-muted-foreground">Por segurança, nenhum dado é mostrado aqui. Responderemos pelo e-mail informado após verificar sua identidade. Não envie documentos.</p>
              <label className="block text-sm font-semibold">O que você deseja?
                <select className={sel} value={f.requestType} onChange={(e) => setF({ ...f, requestType: e.target.value })}>{TIPOS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label className="block text-sm font-semibold">Você é
                <select className={sel} value={f.holderCategory} onChange={(e) => setF({ ...f, holderCategory: e.target.value })}>{PERFIS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}</select>
              </label>
              <label className="block text-sm font-semibold">Nome<Input required minLength={2} maxLength={120} className="mt-1" value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} /></label>
              <label className="block text-sm font-semibold">E-mail para resposta<Input required type="email" maxLength={200} className="mt-1" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
              <label className="block text-sm font-semibold">Detalhes (opcional)<Textarea maxLength={2000} className="mt-1" placeholder="Ex.: restaurante, data aproximada da visita" value={f.details} onChange={(e) => setF({ ...f, details: e.target.value })} /></label>
              <p className="text-xs text-muted-foreground">Alguns dados podem precisar ser mantidos por obrigação legal, fiscal ou de prevenção a fraudes.</p>
              <Button type="submit" className="w-full" disabled={busy}>{busy ? "Enviando…" : "Enviar solicitação"}</Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
