import type { Accompaniments, MenuLanguage } from "@/lib/tipe/menu-intelligence";
const copy = {
  pt: {
    title: "Escolha os acompanhamentos",
    included: "Incluído",
    unavailable: "Indisponível",
    range: (min: number, max: number) =>
      min ? `Escolha de ${min} a ${max} por prato.` : `Opcional · até ${max} por prato.`,
    units:
      "As escolhas valem para todas as unidades deste prato. Para combinações diferentes, envie pedidos separados.",
  },
  en: {
    title: "Choose your sides",
    included: "Included",
    unavailable: "Unavailable",
    range: (min: number, max: number) =>
      min ? `Choose ${min}–${max} per dish.` : `Optional · up to ${max} per dish.`,
    units:
      "These choices apply to every unit of this dish. For different combinations, send separate orders.",
  },
  es: {
    title: "Elige los acompañamientos",
    included: "Incluido",
    unavailable: "No disponible",
    range: (min: number, max: number) =>
      min ? `Elige de ${min} a ${max} por plato.` : `Opcional · hasta ${max} por plato.`,
    units:
      "Las opciones se aplican a todas las unidades de este plato. Para combinaciones diferentes, envía pedidos separados.",
  },
};
export function AcompanhamentosCliente({
  config,
  items,
  selected,
  onChange,
  language,
  quantity,
}: {
  config: Accompaniments;
  items: { code: string; name: string; price: number }[];
  selected: string[];
  onChange: (codes: string[]) => void;
  language: MenuLanguage;
  quantity: number;
}) {
  const t = copy[language];
  return (
    <fieldset className="space-y-2 border-t border-border pt-3">
      <legend className="text-sm font-semibold">{t.title}</legend>
      <p className="text-xs text-muted-foreground">
        {t.range(config.min, config.max)} {selected.length}/{config.max}
      </p>
      {quantity > 1 && <p className="text-xs text-muted-foreground">{t.units}</p>}
      {config.choices.map((choice) => {
        const item = items.find((i) => i.code === choice.code);
        const checked = selected.includes(choice.code);
        return (
          <label
            key={choice.code}
            className={`flex min-h-11 items-center gap-3 rounded-xl border px-3 py-2 text-sm ${checked ? "border-primary bg-primary/10" : "border-border"}`}
          >
            <input
              type="checkbox"
              className="h-5 w-5 shrink-0 accent-primary"
              checked={checked}
              disabled={!item || (!checked && selected.length >= config.max)}
              onChange={(e) =>
                onChange(
                  e.target.checked
                    ? [...selected, choice.code]
                    : selected.filter((c) => c !== choice.code),
                )
              }
            />
            <span className="min-w-0 flex-1">{item?.name ?? choice.code}</span>
            <span className="shrink-0 text-xs font-medium">
              {!item
                ? t.unavailable
                : choice.included
                  ? t.included
                  : `+ ${item.price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}`}
            </span>
          </label>
        );
      })}
    </fieldset>
  );
}
