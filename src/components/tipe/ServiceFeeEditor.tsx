import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { SERVICE_FEE_MAX, SERVICE_FEE_QUICK, resolveServiceFee, type ServiceFeeChoice } from "@/lib/tipe/rules";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

/** Taxa de serviço da própria parte: já vem com o sugerido e pode ser alterada. */
export function ServiceFeeEditor({ subtotal, suggestedRate, choice, onChange }: {
  subtotal: number;
  suggestedRate: number;
  choice: ServiceFeeChoice;
  onChange: (c: ServiceFeeChoice) => void;
}) {
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const fee = resolveServiceFee(subtotal, suggestedRate, choice) ?? { amount: 0, changed: true };
  const label = choice.kind === "suggested" ? `${Math.round(suggestedRate * 1000) / 10}%` : choice.kind === "percent" ? `${choice.value}%` : "valor escolhido";
  const max = Math.round(subtotal * SERVICE_FEE_MAX * 100) / 100;
  const typedValue = Number(typed.replace(",", "."));
  const typedValid = typed !== "" && Number.isFinite(typedValue) && typedValue >= 0 && typedValue <= max;

  return (
    <div className="mt-4 rounded-2xl border border-border bg-card p-4 text-left">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold">Taxa de serviço ({label})</p>
          <p className="text-xs text-muted-foreground">A taxa de serviço é opcional.</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="font-semibold">{money(fee.amount)}</span>
          <Button type="button" size="sm" variant="ghost" className="text-primary" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
            {open ? "Fechar" : "Alterar"}
          </Button>
        </div>
      </div>
      {open && (
        <div className="mt-3 border-t border-border pt-3">
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" variant={choice.kind === "suggested" ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ kind: "suggested" })}>Manter</Button>
            {SERVICE_FEE_QUICK.map((p) => (
              <Button key={p} type="button" size="sm" variant={choice.kind === "percent" && choice.value === p ? "default" : "outline"} className="rounded-full" onClick={() => onChange({ kind: "percent", value: p })}>{p}%</Button>
            ))}
          </div>
          <label htmlFor="fee-amount" className="mt-3 block text-xs font-semibold">Ou digite um valor em reais</label>
          <div className="mt-1 flex gap-2">
            <Input id="fee-amount" type="number" inputMode="decimal" min={0} max={max} step="0.01" value={typed} onChange={(e) => setTyped(e.target.value)} placeholder="0,00" className="h-10 bg-background" />
            <Button type="button" variant="outline" disabled={!typedValid} onClick={() => onChange({ kind: "amount", value: Math.round(typedValue * 100) / 100 })}>Aplicar</Button>
          </div>
          {typed !== "" && !typedValid && <p className="mt-1 text-xs text-destructive">Use um valor entre {money(0)} e {money(max)}.</p>}
        </div>
      )}
    </div>
  );
}
