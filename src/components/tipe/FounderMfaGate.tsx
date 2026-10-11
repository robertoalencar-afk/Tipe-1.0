import { useEffect, useState, type ReactNode } from "react";
import { useServerFn } from "@tanstack/react-start";
import { ShieldCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { generateRecoveryCodes, recordFounderDevice, redeemRecoveryCode } from "@/lib/tipe/mfa.functions";

type State = "loading" | "ok" | "verify" | "enroll" | "codes";

function deviceId() {
  const k = "tipe-device-id";
  let v = window.localStorage.getItem(k);
  if (!v) { v = crypto.randomUUID(); window.localStorage.setItem(k, v); }
  return v;
}

/** Áreas de founder só abrem com verificação em duas etapas (aplicativo autenticador). */
export function FounderMfaGate({ children }: { children: ReactNode }) {
  const [state, setState] = useState<State>("loading");
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qr, setQr] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [code, setCode] = useState("");
  const [recovery, setRecovery] = useState("");
  const [useRecovery, setUseRecovery] = useState(false);
  const [codes, setCodes] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const genCodes = useServerFn(generateRecoveryCodes);
  const redeem = useServerFn(redeemRecoveryCode);
  const record = useServerFn(recordFounderDevice);

  async function refresh() {
    const { data: aal } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aal?.currentLevel === "aal2") { setState("ok"); return; }
    const { data: f } = await supabase.auth.mfa.listFactors();
    const verified = f?.totp?.find((x) => x.status === "verified");
    if (verified) { setFactorId(verified.id); setState("verify"); return; }
    for (const u of f?.all?.filter((x) => x.status !== "verified") ?? []) await supabase.auth.mfa.unenroll({ factorId: u.id });
    const { data, error: e } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `TIPE ${new Date().toISOString().slice(0, 10)}` });
    if (e || !data) { setError("Não foi possível iniciar a verificação em duas etapas."); setState("enroll"); return; }
    setFactorId(data.id); setQr(data.totp.qr_code); setSecret(data.totp.secret); setState("enroll");
  }

  useEffect(() => { void refresh(); }, []);
  useEffect(() => {
    if (state === "ok") void record({ data: { device: deviceId(), ua: navigator.userAgent } }).catch(() => undefined);
  }, [state, record]);

  async function verify(enrolling: boolean) {
    if (!factorId) return;
    setBusy(true); setError(null);
    const { error: e } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: code.trim() });
    if (e) { setBusy(false); setError("Código incorreto. Confira o aplicativo e tente de novo."); return; }
    await supabase.auth.refreshSession();
    if (enrolling) {
      try { const r = await genCodes(); setCodes(r.codes); setState("codes"); } catch { setState("ok"); }
    } else setState("ok");
    setBusy(false);
  }

  async function redeemCode() {
    setBusy(true); setError(null);
    try { await redeem({ data: { code: recovery } }); setUseRecovery(false); setCode(""); await refresh(); }
    catch (e) { setError((e as Error).message); }
    setBusy(false);
  }

  if (state === "ok") return <>{children}</>;
  return (
    <main className="mx-auto flex min-h-screen max-w-md flex-col justify-center px-6 py-10">
      <TipeLogo variant="dark" className="mb-8 h-8 w-auto" />
      <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-primary/15"><ShieldCheck className="h-6 w-6 text-primary" /></div>
      {state === "loading" && <p className="text-sm text-muted-foreground">Verificando sua segurança…</p>}

      {state === "enroll" && (
        <>
          <h1 className="font-display text-2xl font-extrabold">Ative a verificação em duas etapas</h1>
          <p className="mt-2 text-sm text-muted-foreground">Ela é obrigatória para acessar o backoffice. Abra um aplicativo autenticador (Google Authenticator, Microsoft Authenticator, 1Password ou Authy) e leia o QR Code.</p>
          {qr && <img src={qr} alt="QR Code para o aplicativo autenticador" className="mx-auto my-5 h-48 w-48 rounded-xl bg-card p-2" />}
          {secret && <p className="text-center text-xs text-muted-foreground">Ou digite a chave: <span className="select-all font-mono">{secret}</span></p>}
          <label htmlFor="mfa-code" className="mt-5 text-sm font-semibold">Código de 6 dígitos</label>
          <Input id="mfa-code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="mt-2 h-12 text-center text-lg tracking-widest" />
          <Button disabled={busy || code.length !== 6} onClick={() => verify(true)} className="mt-4 h-12">Ativar</Button>
        </>
      )}

      {state === "verify" && !useRecovery && (
        <>
          <h1 className="font-display text-2xl font-extrabold">Verificação em duas etapas</h1>
          <p className="mt-2 text-sm text-muted-foreground">Digite o código que aparece no seu aplicativo autenticador.</p>
          <Input aria-label="Código de 6 dígitos" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} className="mt-5 h-12 text-center text-lg tracking-widest" />
          <Button disabled={busy || code.length !== 6} onClick={() => verify(false)} className="mt-4 h-12">Entrar</Button>
          <button type="button" onClick={() => setUseRecovery(true)} className="mt-4 text-sm text-primary underline">Perdi o acesso ao aplicativo</button>
        </>
      )}

      {state === "verify" && useRecovery && (
        <>
          <h1 className="font-display text-2xl font-extrabold">Usar código de recuperação</h1>
          <p className="mt-2 text-sm text-muted-foreground">Cada código funciona uma vez. Depois você cadastra o autenticador de novo.</p>
          <Input aria-label="Código de recuperação" value={recovery} onChange={(e) => setRecovery(e.target.value)} placeholder="XXXXX-XXXXX" className="mt-5 h-12 text-center font-mono" />
          <Button disabled={busy || recovery.length < 6} onClick={redeemCode} className="mt-4 h-12">Usar código</Button>
          <button type="button" onClick={() => setUseRecovery(false)} className="mt-4 text-sm text-muted-foreground underline">Voltar</button>
        </>
      )}

      {state === "codes" && (
        <>
          <h1 className="font-display text-2xl font-extrabold">Guarde seus códigos de recuperação</h1>
          <p className="mt-2 text-sm text-muted-foreground">Se perder o celular, cada código libera o acesso uma vez. Eles não aparecem de novo.</p>
          <ul className="my-5 grid grid-cols-2 gap-2 rounded-xl border border-border bg-card p-4 font-mono text-sm">{codes.map((c) => <li key={c} className="select-all">{c}</li>)}</ul>
          <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(codes.join("\n"))}>Copiar códigos</Button>
          <Button onClick={() => setState("ok")} className="mt-3 h-12">Já guardei, continuar</Button>
        </>
      )}

      {error && <p role="alert" className="mt-3 text-sm text-destructive">{error}</p>}
    </main>
  );
}
