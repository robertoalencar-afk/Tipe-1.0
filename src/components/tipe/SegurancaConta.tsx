import { Carregando } from "@/components/tipe/Carregando";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { KeyRound, ShieldCheck, ShieldOff } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SenhaForteInput } from "@/components/tipe/SenhaForte";
import { generateRecoveryCodes } from "@/lib/tipe/mfa.functions";
import { avaliarSenha, mensagemErroSenha } from "@/lib/tipe/senha";

type Estado =
  | { k: "carregando" }
  | { k: "desligado" }
  | { k: "cadastrando"; factorId: string; qr: string; secret: string }
  | { k: "codigos"; codes: string[] }
  | { k: "ligado"; factorId: string };

/** Verificação em duas etapas e troca de senha da própria conta (dono, gerente, caixa, garçom). */
export function SegurancaConta() {
  const [estado, setEstado] = useState<Estado>({ k: "carregando" });
  const [codigo, setCodigo] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const [email, setEmail] = useState<string>("");
  const genCodes = useServerFn(generateRecoveryCodes);

  async function carregar() {
    const { data: u } = await supabase.auth.getUser();
    setEmail(u.user?.email ?? "");
    const { data } = await supabase.auth.mfa.listFactors();
    const ok = data?.totp?.find((f) => f.status === "verified");
    setEstado(ok ? { k: "ligado", factorId: ok.id } : { k: "desligado" });
  }
  useEffect(() => { void carregar(); }, []);

  async function iniciar() {
    setOcupado(true);
    const { data: f } = await supabase.auth.mfa.listFactors();
    for (const u of f?.all?.filter((x) => x.status !== "verified") ?? []) await supabase.auth.mfa.unenroll({ factorId: u.id });
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: "totp", friendlyName: `Tipe ${new Date().toISOString().slice(0, 10)}` });
    setOcupado(false);
    if (error || !data) { toast.error("Não foi possível iniciar agora. Tente de novo em instantes."); return; }
    setCodigo("");
    setEstado({ k: "cadastrando", factorId: data.id, qr: data.totp.qr_code, secret: data.totp.secret });
  }

  async function confirmar() {
    if (estado.k !== "cadastrando") return;
    setOcupado(true);
    const { error } = await supabase.auth.mfa.challengeAndVerify({ factorId: estado.factorId, code: codigo.trim() });
    if (error) { setOcupado(false); toast.error("Código incorreto. Confira o aplicativo e tente de novo."); return; }
    await supabase.auth.refreshSession();
    try { const r = await genCodes(); setEstado({ k: "codigos", codes: r.codes }); }
    catch { await carregar(); }
    setOcupado(false);
    toast.success("Verificação em duas etapas ativada");
  }

  async function novosCodigos() {
    setOcupado(true);
    try { const r = await genCodes(); setEstado({ k: "codigos", codes: r.codes }); }
    catch { toast.error("Confirme o código do aplicativo antes de gerar novos códigos."); }
    setOcupado(false);
  }

  async function desligar() {
    if (estado.k !== "ligado") return;
    if (!window.confirm("Desligar a verificação em duas etapas? Sua conta fica protegida só pela senha.")) return;
    setOcupado(true);
    const { error } = await supabase.auth.mfa.unenroll({ factorId: estado.factorId });
    setOcupado(false);
    if (error) { toast.error("Não foi possível desligar. Entre de novo com o código do aplicativo e tente outra vez."); return; }
    await supabase.auth.refreshSession();
    toast.success("Verificação em duas etapas desligada");
    await carregar();
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10">
            {estado.k === "desligado" ? <ShieldOff className="h-5 w-5 text-muted-foreground" /> : <ShieldCheck className="h-5 w-5 text-primary" />}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="font-semibold">Verificação em duas etapas</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Além da senha, a Tipe pede um código de 6 dígitos do aplicativo autenticador do seu celular
              (Google Authenticator, Microsoft Authenticator, 1Password ou Authy). Recomendado para quem confirma pagamentos e mexe em recebimentos.
            </p>

            {estado.k === "carregando" && <Carregando tamanho="sm" texto="Carregando" className="mt-4" />}

            {estado.k === "desligado" && (
              <Button className="mt-4" disabled={ocupado} onClick={iniciar}>Ativar verificação em duas etapas</Button>
            )}

            {estado.k === "cadastrando" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm">1. Leia o QR Code com o aplicativo autenticador.</p>
                <img src={estado.qr} alt="QR Code para o aplicativo autenticador" className="h-44 w-44 rounded-xl border border-border bg-white p-2" />
                <p className="text-xs text-muted-foreground">Ou digite a chave: <span className="select-all break-all font-mono">{estado.secret}</span></p>
                <label htmlFor="seg-codigo" className="block text-sm">2. Digite o código de 6 dígitos que apareceu</label>
                <div className="flex max-w-xs gap-2">
                  <Input id="seg-codigo" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={codigo} onChange={(e) => setCodigo(e.target.value.replace(/\D/g, ""))} className="text-center tracking-widest" />
                  <Button disabled={ocupado || codigo.length !== 6} onClick={confirmar}>Ativar</Button>
                </div>
                <button type="button" className="text-sm text-muted-foreground underline" onClick={() => void carregar()}>Cancelar</button>
              </div>
            )}

            {estado.k === "codigos" && (
              <div className="mt-4 space-y-3">
                <p className="text-sm font-medium">Guarde estes códigos de recuperação num lugar seguro. Cada um libera o acesso uma vez se você perder o celular, e eles não aparecem de novo.</p>
                <ul className="grid max-w-sm grid-cols-2 gap-2 rounded-xl border border-border bg-background p-3 font-mono text-sm">{estado.codes.map((c) => <li key={c} className="select-all">{c}</li>)}</ul>
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void navigator.clipboard?.writeText(estado.codes.join("\n")).then(() => toast.success("Códigos copiados"))}>Copiar códigos</Button>
                  <Button onClick={() => void carregar()}>Já guardei</Button>
                </div>
              </div>
            )}

            {estado.k === "ligado" && (
              <div className="mt-4 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary">Ativa</span>
                <Button variant="outline" size="sm" disabled={ocupado} onClick={novosCodigos}>Gerar novos códigos de recuperação</Button>
                <Button variant="ghost" size="sm" disabled={ocupado} onClick={desligar}>Desligar</Button>
              </div>
            )}
          </div>
        </div>
      </section>

      <TrocarSenha email={email} />
    </div>
  );
}

function TrocarSenha({ email }: { email: string }) {
  const [senha, setSenha] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const valida = avaliarSenha(senha, { email }).ok;

  async function salvar(e: React.FormEvent) {
    e.preventDefault();
    if (!valida) return;
    setOcupado(true);
    const { error } = await supabase.auth.updateUser({ password: senha });
    setOcupado(false);
    if (error) { toast.error(mensagemErroSenha(error.message) ?? "Não foi possível trocar a senha agora. Tente de novo."); return; }
    setSenha("");
    toast.success("Senha atualizada");
  }

  return (
    <section className="rounded-2xl border border-border bg-card p-5">
      <div className="flex items-start gap-3">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10"><KeyRound className="h-5 w-5 text-primary" /></div>
        <form onSubmit={salvar} className="min-w-0 flex-1 space-y-3">
          <h2 className="font-semibold">Trocar senha</h2>
          <SenhaForteInput id="seg-nova-senha" label="Nova senha" value={senha} onChange={setSenha} contexto={{ email }} />
          <Button type="submit" disabled={ocupado || !valida}>Salvar nova senha</Button>
        </form>
      </div>
    </section>
  );
}
