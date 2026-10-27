import { useState } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { suggestSplit } from "@/lib/tipe/split-ai.functions";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const LABELS = { 2: "Por dois", 3: "Por três", 4: "Por quatro" } as const;

export function SplitPicker({
  itemName,
  unitPrice,
  onPick,
}: {
  itemName: string;
  unitPrice: number;
  onPick: (choice: 2 | 3 | 4 | "rest") => void;
}) {
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<{ option: 2 | 3 | 4 | "rest"; reason: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const ask = async () => {
    if (text.trim().length < 3 || loading) return;
    setLoading(true);
    setError(null);
    setHint(null);
    try {
      const r = await suggestSplit({ data: { itemName, description: text } });
      if (r.ok)
        setHint({
          option: r.option === "rest" ? "rest" : (Number(r.option) as 2 | 3 | 4),
          reason: r.reason,
        });
      else setError(r.error);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Não foi possível sugerir agora.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full flex-col gap-2" role="group" aria-label={`Dividir ${itemName}`}>
      <div className="grid grid-cols-4 gap-1.5">
        {([2, 3, 4] as const).map((n) => (
          <Button
            key={n}
            type="button"
            size="sm"
            variant={hint?.option === n ? "default" : "outline"}
            onClick={() => onPick(n)}
            className="h-auto flex-col gap-0 py-1.5"
          >
            <span>{LABELS[n]}</span>
            <span className="text-[10px] font-normal opacity-80">{money(unitPrice / n)} cada</span>
          </Button>
        ))}
        <Button
          type="button"
          size="sm"
          variant={hint?.option === "rest" ? "default" : "ghost"}
          onClick={() => onPick("rest")}
          className="h-auto py-1.5"
        >
          Restante
        </Button>
      </div>
      <form
        className="flex gap-1.5"
        onSubmit={(e) => {
          e.preventDefault();
          void ask();
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          maxLength={300}
          placeholder="Ex.: dividi a jarra com um amigo"
          className="h-9 text-sm"
          aria-label="Descreva como o item foi compartilhado"
        />
        <Button
          type="submit"
          size="sm"
          variant="secondary"
          disabled={loading || text.trim().length < 3}
          className="h-9 shrink-0"
        >
          <Sparkles /> {loading ? "..." : "Sugerir"}
        </Button>
      </form>
      {hint && (
        <p className="text-xs text-primary">
          Sugestão: <strong>{hint.option === "rest" ? "Restante" : LABELS[hint.option]}</strong> —{" "}
          {hint.reason}. Toque para confirmar.
        </p>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  );
}
