import { Carregando } from "@/components/tipe/Carregando";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Check, Copy, ExternalLink, Lock, ShieldCheck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { connectPagarme, disconnectPagarme, getPayoutAccount, savePagarmeAccountId, validateRestaurantPaymentApi } from "@/lib/tipe/payout.functions";

function CopyField({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="mt-1 flex items-center gap-2 rounded-md border border-border bg-muted/40 px-3 py-2">
        <code className="min-w-0 flex-1 truncate text-xs">{value}</code>
        <button type="button" aria-label={`Copiar ${label}`} onClick={() => { void navigator.clipboard.writeText(value); toast.success("Copiado"); }}><Copy className="h-4 w-4 text-muted-foreground" /></button>
      </div>
    </div>
  );
}

function Passo({ n, titulo, children }: { n: number; titulo: string; children: React.ReactNode }) {
  return (
    <li className="flex gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-bold text-primary-foreground">{n}</span>
      <div className="min-w-0 flex-1"><p className="font-semibold">{titulo}</p><div className="mt-1 text-sm text-muted-foreground">{children}</div></div>
    </li>
  );
}

export function Recebimentos({ slug, podeDono }: { slug: string; podeDono: boolean }) {
  const fetchAcc = useServerFn(getPayoutAccount);
  const connect = useServerFn(connectPagarme);
  const disconnect = useServerFn(disconnectPagarme);
  const saveAccountId = useServerFn(savePagarmeAccountId);
  const validateApi = useServerFn(validateRestaurantPaymentApi);
  const qc = useQueryClient();
  const [accountId, setAccountId] = useState("");
  const q = useQuery({ queryKey: ["payout", slug], queryFn: () => fetchAcc({ data: { slug } }), enabled: podeDono });
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);
  if (!podeDono) return <p className="text-muted-foreground">Somente o dono vê os recebimentos.</p>;
  if (q.isLoading) return <Carregando tamanho="sm" texto="Carregando" />;
  const a = q.data;

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <div className="flex items-center gap-2"><ShieldCheck className="h-5 w-5 text-primary" /><h2 className="font-display text-xl font-bold">Recebimentos</h2></div>
        <p className="mt-2 text-sm text-muted-foreground">Os pagamentos digitais da conta caem direto na conta Pagar.me do seu restaurante. A TIPE não guarda seus dados bancários e não passa pelo seu dinheiro. Saques e cadastro você resolve com a própria Pagar.me.</p>
      </div>

      {a?.connected ? (
        <div className="space-y-4 rounded-2xl border border-border bg-card p-5">
          <p className="flex items-center gap-2 font-semibold text-primary"><Check className="h-5 w-5" />Conta Pagar.me conectada</p>
          <p className="text-sm text-muted-foreground">Chave {a.keyMasked}{a.mode === "test" ? " (modo de teste, nada é cobrado de verdade)" : ""}</p>
          <Button variant="outline" disabled={busy} onClick={async () => {
            setBusy(true);
            try { const result = await validateApi({ data: { slug } }); if (result.ok) toast.success(result.message); else toast.error(result.message); }
            catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
          }}>{busy ? "Validando…" : "Validar conexão sem cobrança"}</Button>
          {a.simulation && <p role="status" className="rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">Esta é uma empresa de demonstração. Os pagamentos são simulados mesmo com uma chave de produção conectada. Para receber de clientes, conecte a conta no cadastro do restaurante real.</p>}
          <div className="space-y-3 rounded-xl bg-muted/40 p-4">
            <p className="text-sm font-semibold">Aviso de pagamento (webhook)</p>
            <p className="text-xs text-muted-foreground">No painel da Pagar.me, vá em Configurações, Webhooks, e crie um novo com estes dados. Marque os eventos de pedido (order), cobrança (charge) e contestação (chargeback). Assim a mesa atualiza sozinha quando o cliente paga, e estornos ou contestações aparecem como pendência no caixa.</p>
            <CopyField label="URL" value={a.webhook.url} />
            <div className="grid gap-3 sm:grid-cols-2"><CopyField label="Usuário" value={a.webhook.user} /><CopyField label="Senha" value={a.webhook.password} /></div>
          </div>
          <div className="space-y-2 rounded-xl bg-muted/40 p-4">
            <p className="text-sm font-semibold">Google Pay e Apple Pay</p>
            {a.accountId ? (
              <p className="text-sm text-muted-foreground">ID {a.accountId} cadastrado. A habilitação das carteiras depende do provedor e da aprovação comercial; informar o ID não conclui essa validação.</p>
            ) : (
              <form className="space-y-2" onSubmit={async (e) => {
                e.preventDefault(); setBusy(true);
                try { await saveAccountId({ data: { slug, accountId } }); setAccountId(""); qc.invalidateQueries({ queryKey: ["payout", slug] }); toast.success("ID da conta salvo. Confirme a habilitação das carteiras com o provedor."); }
                catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
              }}>
                <label htmlFor="pagarme-account-id" className="text-xs text-muted-foreground">ID da conta Pagar.me (em Configurações, Conta; começa com acc_)</label>
                <Input id="pagarme-account-id" autoComplete="off" placeholder="acc_..." value={accountId} onChange={(e) => setAccountId(e.target.value.trim())} />
                <Button type="submit" variant="outline" disabled={busy || accountId.length < 12}>Salvar ID da conta</Button>
              </form>
            )}
          </div>
          <Button variant="outline" disabled={busy} onClick={async () => {
            if (!confirm("Desconectar a conta Pagar.me? Os clientes só poderão pagar no estabelecimento até você conectar de novo.")) return;
            setBusy(true);
            try { await disconnect({ data: { slug } }); qc.invalidateQueries({ queryKey: ["payout", slug] }); toast.success("Conta desconectada"); }
            catch (e) { toast.error((e as Error).message); } finally { setBusy(false); }
          }}>Desconectar conta</Button>
        </div>
      ) : (
        <div className="rounded-2xl border border-border bg-card p-5">
          <p role="status" className="mb-5 rounded-xl border border-warning/50 bg-warning/10 p-3 text-sm">Enquanto a conta Pagar.me não estiver conectada, seus clientes só conseguem pedir o pagamento no estabelecimento (dinheiro ou maquininha). O Pix depende da habilitação na Pagar.me; carteiras digitais exigem validação adicional.</p>
          <ol className="space-y-5">
            <Passo n={1} titulo="Crie sua conta na Pagar.me">
              É grátis. Use o CNPJ do restaurante. A própria Pagar.me confere seus documentos e cadastra a conta bancária.
              <a href="https://pagar.me" target="_blank" rel="noreferrer" className="mt-2 inline-flex items-center gap-1 font-semibold text-primary">Abrir Pagar.me<ExternalLink className="h-3.5 w-3.5" /></a>
            </Passo>
            <Passo n={2} titulo="Copie sua chave secreta">
              No painel da Pagar.me, vá em Desenvolvimento, Chaves, e copie a chave que começa com <code>sk_</code>.
            </Passo>
            <Passo n={3} titulo="Cole aqui para conectar">
              <form className="mt-2 space-y-2" onSubmit={async (e) => {
                e.preventDefault(); setBusy(true);
                try { await connect({ data: { slug, secretKey: key } }); setKey(""); qc.invalidateQueries({ queryKey: ["payout", slug] }); toast.success("Conta Pagar.me conectada"); }
                catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
              }}>
                <Input required type="password" autoComplete="off" placeholder="sk_..." value={key} onChange={(e) => setKey(e.target.value.trim())} />
                <Button type="submit" disabled={busy || key.length < 10} className="w-full">{busy ? "Conferindo com a Pagar.me…" : "Conectar conta"}</Button>
                <p className="flex items-center gap-1 text-xs"><Lock className="h-3 w-3" />A chave é guardada criptografada e nunca aparece de novo.</p>
              </form>
            </Passo>
          </ol>
        </div>
      )}
    </div>
  );
}
