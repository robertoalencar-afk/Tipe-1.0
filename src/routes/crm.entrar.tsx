import { useState, type FormEvent } from "react";
import { z } from "zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { ArrowRight, KeyRound } from "lucide-react";
import { CrmLogo } from "@/components/tipe/crm/eco";
import { Btn, Field, TextInput } from "@/components/tipe/crm/ui";
import { useTurnstile } from "@/components/tipe/Turnstile";
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from "@/lib/tipe/crm/seed";
import { runCommand, useCrmState } from "@/lib/tipe/crm/store";

export const Route = createFileRoute("/crm/entrar")({
  validateSearch: z.object({ voltar: z.string().startsWith("/crm").optional().catch(undefined) }),
  head: () => ({
    meta: [{ title: "Entrar no CRM | Tipe" }, { name: "robots", content: "noindex" }],
  }),
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
  const captcha = useTurnstile();
  const emailError =
    touched && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email.trim())
      ? "Digite o e-mail completo, por exemplo helena@tipe.demo."
      : undefined;

  function submit(e: FormEvent) {
    e.preventDefault();
    setTouched(true);
    if (!s) return;
    const destino = voltar && voltar !== "/crm/entrar" ? voltar : "/crm";
    const r = runCommand({ type: "login", email, password });
    if (r.ok) {
      void navigate({ to: destino, replace: true });
      return;
    }
    // 04/11 (Roberto): o mesmo login da Tipe entra no CRM de demonstração. A senha é
    // conferida pela conta real (Supabase); dentro do CRM a pessoa entra como a proprietária.
    void (async () => {
      const { supabase } = await import("@/integrations/supabase/client");
      const { error: e } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
        options: captcha.opcoes,
      });
      captcha.reset();
      if (e?.status === 429) {
        setError("Muitas tentativas de login. Aguarde alguns minutos e tente de novo.");
        return;
      }
      if (e) {
        setError(r.error);
        return;
      }
      const dono = runCommand({
        type: "login",
        email: DEMO_ACCOUNTS[0]!.email,
        password: DEMO_PASSWORD,
      });
      if (!dono.ok) {
        setError(dono.error);
        return;
      }
      void navigate({ to: destino, replace: true });
    })();
  }

  return (
    <div className="grid min-h-dvh place-items-center bg-background px-4 py-10">
      <div className="crm-panel w-full max-w-[960px] overflow-hidden md:grid md:grid-cols-[1fr_1.05fr]">
        <section className="p-6 sm:p-9">
          <CrmLogo className="h-8" />
          <h1 className="mt-10 font-display text-[1.75rem] font-semibold tracking-tight">
            Entrar no CRM
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Vendas, restaurantes e clientes da Tipe no mesmo lugar. Ambiente de demonstração com
            dados fictícios.
          </p>
          <form noValidate onSubmit={submit} className="mt-6 space-y-4">
            {error && (
              <p
                role="alert"
                className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive"
              >
                {error}
              </p>
            )}
            <Field label="E-mail" error={emailError}>
              {(id, d) => (
                <TextInput
                  id={id}
                  type="email"
                  autoComplete="username"
                  value={email}
                  aria-describedby={d}
                  aria-invalid={!!emailError || undefined}
                  onBlur={() => setTouched(true)}
                  onChange={(e) => {
                    setEmail(e.target.value);
                    setError(null);
                  }}
                />
              )}
            </Field>
            <Field label="Senha">
              {(id) => (
                <TextInput
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setError(null);
                  }}
                />
              )}
            </Field>
            {captcha.elemento}
            <Btn type="submit" size="default" className="h-11 w-full" disabled={!s}>
              Entrar no CRM da Tipe
              <ArrowRight className="h-4 w-4" />
            </Btn>
          </form>
        </section>
        <section className="bg-secondary p-6 text-secondary-foreground sm:p-9">
          <ol className="mb-7 grid grid-cols-3 gap-2 text-[0.68rem]">
            {[
              ["A", "Comercial", "Vender a Tipe"],
              ["B", "Restaurantes", "Implantar e cuidar"],
              ["C", "Clientes", "Quem paga na mesa"],
            ].map(([k, t, d]) => (
              <li key={k} className="rounded-2xl bg-white/[0.06] p-3 ring-1 ring-white/10">
                <span className="grid h-6 w-6 place-items-center rounded-full bg-primary font-display text-[0.7rem] font-bold text-primary-foreground">
                  {k}
                </span>
                <span className="mt-2 block font-display text-[0.8rem] font-semibold">{t}</span>
                <span className="block text-white/60">{d}</span>
              </li>
            ))}
          </ol>
          <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/90">
            <KeyRound className="h-3.5 w-3.5 text-[var(--brand-primary)]" />
            Contas de demonstração
          </p>
          <p className="mt-2 text-xs text-white/65">
            Senha de todas:{" "}
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-white">{DEMO_PASSWORD}</code>.
            Cada papel vê e altera coisas diferentes.
          </p>
          <ul className="mt-4 divide-y divide-white/10 overflow-hidden rounded-2xl ring-1 ring-white/10">
            {DEMO_ACCOUNTS.map((a) => (
              <li key={a.email}>
                <button
                  type="button"
                  onClick={() => {
                    setEmail(a.email);
                    setPassword(DEMO_PASSWORD);
                    setError(null);
                  }}
                  className="flex w-full items-center justify-between gap-3 px-3.5 py-2.5 text-left hover:bg-white/[0.06]"
                  aria-label={`Usar a conta de ${a.name}`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">{a.name}</span>
                    <span className="block truncate text-xs text-white/55">{a.email}</span>
                  </span>
                  <span className="shrink-0 rounded-full bg-white/10 px-2 py-0.5 text-[0.68rem] text-white/75">
                    {a.role}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
