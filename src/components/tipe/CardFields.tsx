import { Input } from "@/components/ui/input";
import type { CardInput } from "@/lib/tipe/pagarme-client";

const maskNumber = (v: string) => v.replace(/\D/g, "").slice(0, 19).replace(/(\d{4})(?=\d)/g, "$1 ");
const maskExp = (v: string) => v.replace(/\D/g, "").slice(0, 4).replace(/^(\d{2})(\d)/, "$1/$2");

export function CardFields({ value, onChange }: { value: CardInput; onChange: (v: CardInput) => void }) {
  return (
    <div className="space-y-3 rounded-lg border border-border bg-card p-4">
      <label className="block text-xs font-semibold">Número do cartão
        <Input inputMode="numeric" autoComplete="cc-number" placeholder="0000 0000 0000 0000" className="mt-1" value={value.number} onChange={(e) => onChange({ ...value, number: maskNumber(e.target.value) })} />
      </label>
      <label className="block text-xs font-semibold">Nome impresso no cartão
        <Input autoComplete="cc-name" className="mt-1" value={value.holder} onChange={(e) => onChange({ ...value, holder: e.target.value.toUpperCase().slice(0, 60) })} />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label className="block text-xs font-semibold">Validade
          <Input inputMode="numeric" autoComplete="cc-exp" placeholder="MM/AA" className="mt-1" value={value.exp} onChange={(e) => onChange({ ...value, exp: maskExp(e.target.value) })} />
        </label>
        <label className="block text-xs font-semibold">CVV
          <Input inputMode="numeric" autoComplete="cc-csc" placeholder="123" className="mt-1" value={value.cvv} onChange={(e) => onChange({ ...value, cvv: e.target.value.replace(/\D/g, "").slice(0, 4) })} />
        </label>
      </div>
      <p className="text-[11px] text-muted-foreground">Os dados do cartão vão direto para o Pagar.me e não ficam guardados na TIPE.</p>
    </div>
  );
}
