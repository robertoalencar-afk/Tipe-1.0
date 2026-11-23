import { Tag } from "lucide-react";
import { hoursLabel, PROMO_KIND_LABELS, PROMO_TODAY } from "@/lib/tipe/menu-i18n";
import type { MenuLanguage } from "@/lib/tipe/menu-intelligence";
import { promoActiveOn, promoHoursLabel, type MenuPromo } from "@/lib/tipe/menu-promos";

/** Promoções que valem hoje, com a regra inteira à vista (sem letras miúdas). */
export function PromocoesHoje({
  promos,
  items,
  onOpen,
  language = "pt",
}: {
  promos: Omit<MenuPromo, "why">[];
  items: { code: string; name: string; imageUrl: string | null }[];
  onOpen: (code: string) => void;
  language?: MenuLanguage;
}) {
  const now = new Date();
  const today = promos.filter((p) => promoActiveOn(p as MenuPromo, now));
  if (!today.length) return null;
  return (
    <section aria-labelledby="promos-hoje" className="mb-5">
      <h3
        id="promos-hoje"
        className="mb-2 flex items-center gap-1.5 font-display text-sm font-bold text-muted-foreground"
      >
        <Tag className="size-4" aria-hidden /> {PROMO_TODAY[language]}
      </h3>
      <ul className="space-y-2">
        {today.map((p) => {
          const hours = language === "pt" ? promoHoursLabel(p) : hoursLabel(p, language);
          const photo = p.itemCodes
            .map((c) => items.find((i) => i.code === c))
            .find((i) => i?.imageUrl);
          return (
            <li key={p.id}>
              <button
                type="button"
                onClick={() => onOpen(photo?.code ?? p.itemCodes[0]!)}
                className="flex w-full items-center gap-3 rounded-2xl border border-primary/30 bg-primary/5 p-2.5 text-left"
              >
                {photo?.imageUrl && (
                  <img
                    src={photo.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-16 shrink-0 rounded-xl object-cover"
                  />
                )}
                <span className="min-w-0 flex-1">
                  <span className="text-[10px] font-bold uppercase tracking-wide text-primary">
                    {PROMO_KIND_LABELS[language][p.kind]}
                    {hours ? ` · ${hours}` : ""}
                  </span>
                  <span className="block font-semibold leading-tight">{p.name}</span>
                  <span className="mt-0.5 block text-xs leading-snug text-muted-foreground">
                    {p.rule}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
