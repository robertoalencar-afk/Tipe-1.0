import { useState } from "react";
import { BANDEIRAS_FISCAIS, ManualPagamentoFiscal } from "@/lib/tipe/fiscal/payments";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
const fieldClass = "mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm";
export function FiscalMaquininha({
  payments,
  busy,
  onClose,
  onContinue,
}: {
  payments: { id: string; customer: string; amountCents: number; createdAt: string }[];
  busy: boolean;
  onClose: () => void;
  onContinue: (values: ManualPagamentoFiscal[]) => void;
}) {
  const [values, setValues] = useState<
    Record<string, { cardType: string; brand: string; authorization: string; acquirerCnpj: string }>
  >({});
  const [error, setError] = useState("");
  function update(id: string, field: string, value: string) {
    setValues((previous) => ({
      ...previous,
      [id]: {
        cardType: "",
        brand: "",
        authorization: "",
        acquirerCnpj: "",
        ...previous[id],
        [field]: value,
      },
    }));
  }
  function submit() {
    try {
      const result = payments.map((p) => {
        const value = values[p.id];
        return ManualPagamentoFiscal.parse({
          paymentId: p.id,
          cardType: value?.cardType,
          brand: value?.brand,
          ...(value?.authorization.trim() ? { authorization: value.authorization.trim() } : {}),
          ...(value?.acquirerCnpj.trim() ? { acquirerCnpj: value.acquirerCnpj.trim() } : {}),
        });
      });
      setError("");
      onContinue(result);
    } catch {
      setError(
        "Selecione crédito ou débito e a bandeira de cada comprovante. Confira o CNPJ se informado.",
      );
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !busy) onClose();
      }}
    >
      <DialogContent className="max-h-[90vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Dados fiscais da maquininha</DialogTitle>
          <DialogDescription>
            Use os dados do comprovante do pagamento já confirmado. A nota identifica a maquininha
            externa como pagamento não integrado.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-5">
          {payments.map((p) => (
            <fieldset key={p.id} disabled={busy} className="rounded-xl border border-border p-4">
              <legend className="px-1 text-sm font-semibold">
                {p.customer} ·{" "}
                {(p.amountCents / 100).toLocaleString("pt-BR", {
                  style: "currency",
                  currency: "BRL",
                })}
              </legend>
              <p className="mb-3 text-xs text-muted-foreground">
                {new Date(p.createdAt).toLocaleString("pt-BR")} · {p.id.slice(-8)}
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                <label className="text-sm font-medium">
                  Tipo do cartão
                  <select
                    className={fieldClass}
                    value={values[p.id]?.cardType ?? ""}
                    onChange={(e) => update(p.id, "cardType", e.target.value)}
                  >
                    <option value="">Selecione no comprovante</option>
                    <option value="credit">Crédito</option>
                    <option value="debit">Débito</option>
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Bandeira
                  <select
                    className={fieldClass}
                    value={values[p.id]?.brand ?? ""}
                    onChange={(e) => update(p.id, "brand", e.target.value)}
                  >
                    <option value="">Selecione no comprovante</option>
                    {Object.entries(BANDEIRAS_FISCAIS)
                      .sort(([a], [b]) => Number(a) - Number(b))
                      .map(([code, label]) => (
                        <option key={code} value={code}>
                          {label}
                        </option>
                      ))}
                  </select>
                </label>
                <label className="text-sm font-medium">
                  Autorização · se disponível
                  <Input
                    className="mt-1"
                    maxLength={128}
                    value={values[p.id]?.authorization ?? ""}
                    onChange={(e) => update(p.id, "authorization", e.target.value)}
                  />
                </label>
                <label className="text-sm font-medium">
                  CNPJ da credenciadora · se disponível
                  <Input
                    className="mt-1"
                    maxLength={24}
                    value={values[p.id]?.acquirerCnpj ?? ""}
                    onChange={(e) => update(p.id, "acquirerCnpj", e.target.value)}
                  />
                </label>
              </div>
            </fieldset>
          ))}
        </div>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <Button disabled={busy} onClick={submit}>
          {busy ? "Conferindo…" : "Conferir e continuar"}
        </Button>
      </DialogContent>
    </Dialog>
  );
}
