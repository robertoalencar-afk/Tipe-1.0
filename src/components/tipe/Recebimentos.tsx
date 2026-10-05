import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPayoutAccount, savePayoutAccount } from "@/lib/tipe/payout.functions";

const STATUS: Record<string, string> = { pending: "Aguardando ativação", active: "Recebimento ativo", error: "Dados recusados" };
const vazio = { holderName: "", holderType: "company" as "company" | "individual", holderDocument: "", email: "", bank: "", branchNumber: "", branchCheckDigit: "", accountNumber: "", accountCheckDigit: "", accountType: "checking" as "checking" | "savings" };

export function Recebimentos({ slug, podeDono }: { slug: string; podeDono: boolean }) {
  const fetchAcc = useServerFn(getPayoutAccount);
  const save = useServerFn(savePayoutAccount);
  const qc = useQueryClient();
  const q = useQuery({ queryKey: ["payout", slug], queryFn: () => fetchAcc({ data: { slug } }), enabled: podeDono });
  const [f, setF] = useState(vazio);
  const [editando, setEditando] = useState(false);
  const [busy, setBusy] = useState(false);
  if (!podeDono) return <p className="text-muted-foreground">Somente o dono vê os dados de recebimento.</p>;
  if (q.isLoading) return <p className="text-muted-foreground">Carregando…</p>;
  const a = q.data?.account;
  const dig = (v: string, n: number) => v.replace(/\D/g, "").slice(0, n);
  const lbl = "block text-sm";

  return (
    <div className="max-w-xl space-y-4">
      <div className="rounded-2xl border border-border bg-card p-5">
        <h2 className="font-display text-xl font-bold">Recebimentos</h2>
        <p className="mt-1 text-sm text-muted-foreground">Conta bancária onde o restaurante recebe os pagamentos digitais (Pix e cartão) feitos pelos clientes na mesa. O repasse é feito pelo Pagar.me.</p>
        {!q.data?.live && <p className="mt-3 rounded-lg bg-muted p-3 text-xs">Os pagamentos digitais estão em modo de teste. Seus dados ficam salvos e o recebimento é ativado assim que a TIPE concluir a configuração com o Pagar.me.</p>}
        {a && !editando && (
          <div className="mt-4 space-y-1 text-sm">
            <p><span className="font-semibold">{STATUS[a.status] ?? a.status}</span>{a.statusDetail && <span className="text-muted-foreground"> — {a.statusDetail}</span>}</p>
            <p>{a.holderName} · {a.documentMasked}</p>
            <p>Banco {a.bank} · Agência {a.branch} · Conta {a.accountMasked} ({a.accountType === "checking" ? "corrente" : "poupança"})</p>
            <Button variant="outline" className="mt-3" onClick={() => { setF({ ...vazio, holderName: a.holderName, email: a.email, holderType: a.holderType as never, bank: a.bank, accountType: a.accountType as never }); setEditando(true); }}>Alterar conta</Button>
          </div>
        )}
      </div>

      {(!a || editando) && (
        <form className="space-y-3 rounded-2xl border border-border bg-card p-5" onSubmit={async (e) => {
          e.preventDefault(); setBusy(true);
          try {
            const r = await save({ data: { slug, ...f } });
            if (r.status === "error") toast.error(r.detail ?? "Dados recusados"); else toast.success("Dados de recebimento salvos");
            setEditando(false); setF(vazio); qc.invalidateQueries({ queryKey: ["payout", slug] });
          } catch (err) { toast.error((err as Error).message); } finally { setBusy(false); }
        }}>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className={lbl}>Titular é
              <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.holderType} onChange={(e) => setF({ ...f, holderType: e.target.value as never })}>
                <option value="company">Empresa (CNPJ)</option><option value="individual">Pessoa física (CPF)</option>
              </select>
            </label>
            <label className={lbl}>{f.holderType === "company" ? "CNPJ" : "CPF"}<Input required inputMode="numeric" className="mt-1" value={f.holderDocument} onChange={(e) => setF({ ...f, holderDocument: dig(e.target.value, f.holderType === "company" ? 14 : 11) })} /></label>
          </div>
          <label className={lbl}>Nome do titular da conta<Input required minLength={3} maxLength={120} className="mt-1" value={f.holderName} onChange={(e) => setF({ ...f, holderName: e.target.value })} /></label>
          <label className={lbl}>E-mail financeiro<Input required type="email" className="mt-1" value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} /></label>
          <div className="grid grid-cols-3 gap-3">
            <label className={lbl}>Banco (código)<Input required inputMode="numeric" placeholder="341" className="mt-1" value={f.bank} onChange={(e) => setF({ ...f, bank: dig(e.target.value, 3) })} /></label>
            <label className={lbl}>Agência<Input required inputMode="numeric" className="mt-1" value={f.branchNumber} onChange={(e) => setF({ ...f, branchNumber: dig(e.target.value, 4) })} /></label>
            <label className={lbl}>Dígito ag.<Input inputMode="numeric" placeholder="opcional" className="mt-1" value={f.branchCheckDigit} onChange={(e) => setF({ ...f, branchCheckDigit: dig(e.target.value, 1) })} /></label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className={`${lbl} col-span-2`}>Conta<Input required inputMode="numeric" className="mt-1" value={f.accountNumber} onChange={(e) => setF({ ...f, accountNumber: dig(e.target.value, 13) })} /></label>
            <label className={lbl}>Dígito<Input required className="mt-1" value={f.accountCheckDigit} onChange={(e) => setF({ ...f, accountCheckDigit: e.target.value.replace(/[^0-9xX]/g, "").slice(0, 2) })} /></label>
          </div>
          <label className={lbl}>Tipo de conta
            <select className="mt-1 h-10 w-full rounded-md border border-input bg-background px-3 text-sm" value={f.accountType} onChange={(e) => setF({ ...f, accountType: e.target.value as never })}>
              <option value="checking">Corrente</option><option value="savings">Poupança</option>
            </select>
          </label>
          <div className="flex gap-2">
            <Button type="submit" disabled={busy}>{busy ? "Salvando…" : "Salvar dados de recebimento"}</Button>
            {editando && <Button type="button" variant="ghost" onClick={() => setEditando(false)}>Cancelar</Button>}
          </div>
        </form>
      )}
    </div>
  );
}
