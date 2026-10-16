import { useState } from "react";
import { Divide, Minus, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  billSubtotal,
  planShare,
  remainingSubtotal,
  type ShareItem,
  type ShareMode,
} from "@/lib/tipe/bill-math";
import { resolveServiceFee } from "@/lib/tipe/rules";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
type Modo = "iguais" | "valor" | "porcentagem";

function Contador({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (n: number) => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-sm">{label}</span>
      <div className="flex items-center gap-2">
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-full"
          disabled={value <= min}
          onClick={() => onChange(value - 1)}
          aria-label={`Diminuir ${label.toLowerCase()}`}
        >
          <Minus />
        </Button>
        <span className="w-6 text-center font-display text-lg font-bold" aria-live="polite">
          {value}
        </span>
        <Button
          type="button"
          size="icon"
          variant="outline"
          className="h-9 w-9 rounded-full"
          disabled={value >= max}
          onClick={() => onChange(value + 1)}
          aria-label={`Aumentar ${label.toLowerCase()}`}
        >
          <Plus />
        </Button>
      </div>
    </div>
  );
}

/**
 * Divide a conta sem escolher item por item: partes iguais, valor livre ou
 * porcentagem. O resultado vira frações dos itens em aberto (bill-math.ts),
 * então o servidor continua calculando o valor e o banco continua impedindo
 * que alguém pague o que já foi pago.
 */
export function DividirConta({
  items,
  serviceRate,
  onApply,
}: {
  items: ShareItem[];
  serviceRate: number;
  onApply: (quantities: Record<string, number>) => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [modo, setModo] = useState<Modo>("iguais");
  const [pessoas, setPessoas] = useState(2);
  const [partes, setPartes] = useState(1);
  const [valor, setValor] = useState("");
  const [pct, setPct] = useState("");
  const restante = remainingSubtotal(items);
  if (restante <= 0) return null;
  const total = billSubtotal(items);
  // Mesma conta do servidor: subtotal + taxa arredondada ao centavo.
  const comTaxa = (v: number) =>
    +(v + (resolveServiceFee(v, serviceRate, { kind: "suggested" })?.amount ?? 0)).toFixed(2);

  // "1.234,56" e "50,5" (padrão brasileiro) ou "50.5".
  const parse = (s: string) => Number(s.includes(",") ? s.replace(/\./g, "").replace(",", ".") : s);
  const mode: ShareMode | null =
    modo === "iguais"
      ? { kind: "equal", parts: Math.min(partes, pessoas), people: pessoas }
      : modo === "valor"
        ? parse(valor) > 0
          ? { kind: "amount", value: parse(valor) }
          : null
        : parse(pct) > 0
          ? { kind: "percent", value: parse(pct) }
          : null;
  const plano = mode ? planShare(items, mode, serviceRate) : null;

  if (!aberto) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={() => setAberto(true)}
        className="mb-3 h-12 w-full rounded-full font-display text-base font-bold"
      >
        <Divide /> Dividir a conta
      </Button>
    );
  }

  return (
    <section
      aria-labelledby="dividir-title"
      className="mb-4 rounded-2xl border-2 border-primary/40 bg-card p-4 shadow-sm"
    >
      <div className="flex items-center justify-between">
        <h2 id="dividir-title" className="font-display text-lg font-extrabold">
          Dividir a conta
        </h2>
        <button
          type="button"
          onClick={() => setAberto(false)}
          className="text-sm text-muted-foreground underline"
        >
          Fechar
        </button>
      </div>
      <p className="mt-1 text-xs text-muted-foreground">
        Conta da mesa {money(comTaxa(total))} · falta pagar {money(comTaxa(restante))}
      </p>
      <div
        className="mt-3 grid grid-cols-3 gap-1 rounded-full bg-muted p-1"
        role="tablist"
        aria-label="Forma de dividir"
      >
        {(
          [
            ["iguais", "Partes iguais"],
            ["valor", "Valor"],
            ["porcentagem", "%"],
          ] as const
        ).map(([k, l]) => (
          <button
            key={k}
            type="button"
            role="tab"
            aria-selected={modo === k}
            onClick={() => setModo(k)}
            className={`h-9 rounded-full text-sm font-semibold transition ${modo === k ? "bg-background shadow-sm" : "text-muted-foreground"}`}
          >
            {l}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        {modo === "iguais" && (
          <>
            <Contador
              label="Pessoas na mesa"
              value={pessoas}
              min={2}
              max={30}
              onChange={(n) => {
                setPessoas(n);
                setPartes((p) => Math.min(p, n));
              }}
            />
            <Contador
              label="Partes que você paga"
              value={Math.min(partes, pessoas)}
              min={1}
              max={pessoas}
              onChange={setPartes}
            />
          </>
        )}
        {modo === "valor" && (
          <label className="block text-sm">
            Quanto você quer pagar (já com a taxa de serviço)
            <Input
              inputMode="decimal"
              value={valor}
              onChange={(e) => setValor(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder="Ex.: 50,00"
              className="mt-1 h-11"
            />
          </label>
        )}
        {modo === "porcentagem" && (
          <label className="block text-sm">
            Porcentagem da conta
            <Input
              inputMode="decimal"
              value={pct}
              onChange={(e) => setPct(e.target.value.replace(/[^\d,.]/g, ""))}
              placeholder="Ex.: 25"
              className="mt-1 h-11"
            />
          </label>
        )}
      </div>

      {plano ? (
        <p className="mt-4 text-sm">
          Sua parte:{" "}
          <strong className="font-display text-base">{money(comTaxa(plano.subtotal))}</strong>
          {plano.clearsBill ? " · quita o restante da mesa" : ""}
        </p>
      ) : (
        <p className="mt-4 text-sm text-muted-foreground">
          {mode ? "Esse valor não está disponível para pagamento." : "Escolha como dividir."}
        </p>
      )}
      <Button
        type="button"
        disabled={!plano}
        onClick={() => {
          if (plano) {
            onApply(plano.quantities);
            setAberto(false);
          }
        }}
        className="mt-3 h-11 w-full rounded-full font-display font-bold"
      >
        Usar esta divisão
      </Button>
      <p className="mt-2 text-[11px] leading-4 text-muted-foreground">
        A sua parte é tirada proporcionalmente de cada item em aberto. O valor exato é conferido no
        pagamento.
      </p>
    </section>
  );
}
