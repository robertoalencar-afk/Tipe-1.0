import { LebreSuggestionButton } from "./LebreSuggestionButton";
import { useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { suggestDishAccompaniments } from "@/lib/tipe/menu-intelligence.functions";
import type { Accompaniments } from "@/lib/tipe/menu-intelligence";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function AcompanhamentosEditor({
  value,
  onChange,
  items,
  slug,
  code,
  name,
  description,
  disabled,
}: {
  value: Accompaniments;
  onChange: (value: Accompaniments) => void;
  items: { code: string; name: string; price: number; available: boolean }[];
  slug: string;
  code: string;
  name: string;
  description: string;
  disabled: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [proposal, setProposal] = useState<{
    codes: string[];
    reason: string;
    source: string;
  } | null>(null);
  const [error, setError] = useState("");
  const source = JSON.stringify([code, name, description]);
  const current = useRef(source);
  current.current = source;
  const choices = items.filter((i) => i.code !== code);
  async function suggest() {
    setBusy(true);
    setError("");
    setProposal(null);
    try {
      const result = await suggestDishAccompaniments({ data: { slug, code, name, description } });
      if (current.current === source) setProposal({ ...result, source });
    } catch (e) {
      setError(e instanceof Error ? e.message : "Tente novamente.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <fieldset
      aria-label="Acompanhamentos"
      disabled={disabled}
      className="space-y-4 border-t border-border pt-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-base font-semibold">Acompanhamentos</h3>
        <LebreSuggestionButton
          loading={busy}
          disabled={name.trim().length < 3 || !choices.length}
          onClick={() => void suggest()}
        >
          Sugerir acompanhamentos
        </LebreSuggestionButton>
      </div>
      <label className="flex min-h-11 items-center gap-3 text-sm font-medium">
        <input
          type="checkbox"
          className="h-5 w-5 accent-primary"
          checked={value.enabled}
          onChange={(e) => onChange({ ...value, enabled: e.target.checked })}
        />
        O cliente pode escolher acompanhamentos
      </label>
      {!value.enabled && (
        <p className="text-sm text-muted-foreground">
          Prato já montado: o cliente pede como está na descrição.
        </p>
      )}
      {proposal?.source === source && (
        <div role="status" className="space-y-2 bg-primary/10 p-4 text-sm rounded-xl">
          <p className="font-medium">A Lebre sugere</p>
          <p>{proposal.reason}</p>
          {!!proposal.codes.length && (
            <>
              <p>{proposal.codes.map((c) => items.find((i) => i.code === c)?.name).join(" · ")}</p>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onChange({
                    enabled: true,
                    min: 0,
                    max: 1,
                    choices: proposal.codes.map((code) => ({ code, included: false })),
                  });
                  setProposal(null);
                }}
              >
                Usar como rascunho
              </Button>
              <p className="text-xs">
                Confira opções, preços e limites abaixo. Só aparece para o cliente depois de salvar
                o prato.
              </p>
            </>
          )}
        </div>
      )}
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      {value.enabled && (
        <>
          <div className="flex flex-wrap gap-4">
            <label className="grid gap-1 text-sm">
              Mínimo por prato
              <select
                className="h-11 rounded-xl border bg-background px-3"
                value={value.min}
                onChange={(e) =>
                  onChange({
                    ...value,
                    min: Number(e.target.value),
                    max: Math.max(value.max, Number(e.target.value)),
                  })
                }
              >
                {[0, 1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n === 0 ? "0 · Opcional" : `${n} · Obrigatório`}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid gap-1 text-sm">
              Máximo por prato
              <select
                className="h-11 rounded-xl border bg-background px-3"
                value={value.max}
                onChange={(e) =>
                  onChange({
                    ...value,
                    max: Number(e.target.value),
                    min: Math.min(value.min, Number(e.target.value)),
                  })
                }
              >
                {[1, 2, 3, 4].map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <p className="text-sm text-muted-foreground">
            Escolha até 8 produtos cadastrados. Marque o que já está incluído no preço do prato; os
            demais usam o preço atual do próprio produto.
          </p>
          {!choices.length && (
            <p className="text-sm">
              Salve este prato e cadastre os acompanhamentos como produtos. Depois volte para
              escolher as opções.
            </p>
          )}
          <div className="max-h-72 overflow-y-auto divide-y divide-border">
            {choices.map((i) => {
              const selected = value.choices.find((c) => c.code === i.code);
              return (
                <div
                  key={i.code}
                  className="flex flex-wrap items-center justify-between gap-2 py-3"
                >
                  <label className="flex min-h-11 min-w-0 flex-1 items-center gap-3 text-sm">
                    <input
                      type="checkbox"
                      className="h-5 w-5 shrink-0 accent-primary"
                      checked={!!selected}
                      disabled={!selected && value.choices.length >= 8}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          choices: e.target.checked
                            ? [...value.choices, { code: i.code, included: false }]
                            : value.choices.filter((c) => c.code !== i.code),
                        })
                      }
                    />
                    <span>
                      {i.name}
                      {!i.available && (
                        <span className="block text-xs text-muted-foreground">
                          Indisponível para o cliente
                        </span>
                      )}
                    </span>
                  </label>
                  {selected && (
                    <select
                      aria-label={`Preço de ${i.name}`}
                      className="h-11 max-w-full rounded-xl border bg-background px-3 text-sm"
                      value={selected.included ? "included" : "extra"}
                      onChange={(e) =>
                        onChange({
                          ...value,
                          choices: value.choices.map((c) =>
                            c.code === i.code
                              ? { ...c, included: e.target.value === "included" }
                              : c,
                          ),
                        })
                      }
                    >
                      <option value="included">Incluído no prato</option>
                      <option value="extra">Adicional · {money(i.price)}</option>
                    </select>
                  )}
                </div>
              );
            })}
          </div>
          {value.choices.length < value.max && (
            <p role="status" className="text-sm text-destructive">
              Selecione pelo menos {value.max} opções ou diminua o máximo.
            </p>
          )}
        </>
      )}
    </fieldset>
  );
}
