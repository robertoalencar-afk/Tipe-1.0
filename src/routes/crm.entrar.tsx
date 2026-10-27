import { useState, type FormEvent } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound } from "lucide-react";
import { TipeSymbol } from "@/components/tipe/Logo";
import { Btn, Field, TextInput } from "@/components/tipe/crm/ui";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/tipe/crm/seed";
import { runCommand, useCrmState } from "@/lib/tipe/crm/store";

export const Route = createFileRoute("/crm/entrar")({
  validateSearch: (s: Record<string, unknown>) => ({ voltar: typeof s.voltar === "string" && s.voltar.startsWith("/crm") ? s.voltar : undefined }),
  head: () => ({ meta: [{ title: "Entrar no back office | Tipe" }, { name: "robots", content: "noindex" }] }),
  component: Entrar,
});

function Entrar() {
  const { voltar } = Route.useSearch();
  const navigate = useNavigate();
  const s = useCrmState();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [touched, setTouched] = useState(false);
  const emailError = touched && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim()) ? "Digite o e-mail completo, por exemplo helena@tipe.demo." : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!s) return;
    const r = runCommand({ type: "login", email, password });
    if (!r.ok) return setError(r.error);
    navigate({ to: voltar && voltar !== "/crm/entrar" ? voltar : "/crm", replace: true });
  }

  return (
    <div className="crm-grid-bg grid min-h-dvh place-items-center px-4 py-10">
      <div className="w-full max-w-[920px] overflow-hidden rounded-2xl border border-border bg-card/90 shadow-2xl md:grid md:grid-cols-[1fr_1.05fr]">
        <section className="border-b border-border p-6 sm:p-8 md:border-b-0 md:border-r">
          <div className="flex items-center gap-2.5"><TipeSymbol className="h-8 w-8" /><div><p className="font-display text-base font-bold leading-none">Tipe</p><p className="text-xs text-muted-foreground">Back office comercial</p></div></div>
          <h1 className="mt-8 font-display text-2xl font-bold tracking-tight">Entrar</h1>
          <p className="mt-1 text-sm text-muted-foreground">Ambiente de demonstração com dados fictícios.</p>
          <form noValidate onSubmit={submit} className="mt-6 space-y-4">
            {error && <p role="alert" className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-[oklch(0.82_0.1_25)]">{error}</p>}
            <Field label="E-mail" error={emailError}>{(id, d) => <TextInput id={id} type="email" autoComplete="username" value={email} aria-describedby={d} aria-invalid={!!emailError || undefined} onBlur={() => setTouched(true)} onChange={(e) => { setEmail(e.target.value); setError(null); }} />}</Field>
            <Field label="Senha">{(id) => <TextInput id={id} type="password" autoComplete="current-password" value={password} onChange={(e) => { setPassword(e.target.value); setError(null); }} />}</Field>
            <Btn type="submit" size="default" className="h-10 w-full" disabled={!s}>Entrar no back office<ArrowRight className="h-4 w-4" /></Btn>
          </form>
        </section>
        <section className="p-6 sm:p-8">
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary"><KeyRound className="h-3.5 w-3.5" />Contas de demonstração</p>
          <p className="mt-2 text-xs text-muted-foreground">Senha de todas: <code className="rounded bg-muted px-1.5 py-0.5 text-foreground">{DEMO_PASSWORD}</code>. Cada papel vê e altera coisas diferentes.</p>
          <ul className="mt-4 divide-y divide-border rounded-lg border border-border">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button type="button" onClick={() => { setEmail(a.email); setPassword(DEMO_PASSWORD); setError(null); }} className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-muted" aria-label={`Usar a conta de ${a.name}`}>
                  <span className="min-w-0"><span className="block truncate text-sm font-medium">{a.name}</span><span className="block truncate text-xs text-muted-foreground">{a.email}</span></span>
                  <span className="shrink-0 rounded-md bg-muted px-2 py-0.5 text-[0.68rem] text-muted-foreground">{a.role}</span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
