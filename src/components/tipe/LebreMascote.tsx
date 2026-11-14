import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMascotPreference } from "@/lib/tipe/mascot-preference";
import { getMenuAssistant } from "@/lib/tipe/menu-intelligence.functions";
import { MascoteVivo } from "./site/MascoteVivo";

export function LebreMascote({
  slug,
  onOpen,
  onSuggestions,
}: {
  slug: string;
  onOpen: () => void;
  onSuggestions?: (() => void) | undefined;
}) {
  const [dock, setDock] = useState<HTMLElement | null>(null);
  useEffect(() => {
    const sync = () =>
      setDock(
        window.matchMedia("(min-width: 1024px)").matches
          ? document.getElementById(`tipe-lebre-dock-${slug}`)
          : null,
      );
    sync();
    window.addEventListener("resize", sync);
    return () => window.removeEventListener("resize", sync);
  }, [slug]);
  const [visible, setVisible] = useMascotPreference(slug);
  const query = useQuery({
    queryKey: ["menu-assistant", slug],
    queryFn: () => getMenuAssistant({ data: { slug } }),
    enabled: !!onSuggestions,
    refetchInterval: 60000,
    staleTime: 15000,
    retry: false,
  });
  const count = query.data?.suggestions.length ?? 0;
  if (!visible) return null;
  const companion = (
    <aside
      aria-label="Mascote da Lebre"
      className={
        dock
          ? "flex w-full flex-col items-center gap-2 px-2 pt-2 print:hidden"
          : "fixed bottom-24 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-end gap-2 print:hidden sm:right-5 lg:bottom-5"
      }
    >
      {count > 0 && (
        <button
          type="button"
          onClick={onSuggestions}
          className={
            dock
              ? "hidden w-full rounded-xl border border-border bg-background px-3 py-2 text-left text-sm @[150px]:block"
              : "mb-3 max-w-36 rounded-xl border border-border bg-background px-3 py-2 text-left text-xs shadow-sm"
          }
        >
          <span className="block font-semibold">
            Tenho {count === 1 ? "uma ideia" : `${count} ideias`} para seu cardápio
          </span>
          <span className="mt-1 block text-xs text-muted-foreground underline underline-offset-4">
            Ver sugestões da Lebre
          </span>
        </button>
      )}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={() => setVisible(false)}
          aria-label="Ocultar mascote"
          title="Ocultar mascote"
          className="absolute -right-1 -top-1 z-10 grid size-7 place-items-center rounded-full border border-border bg-background text-muted-foreground hover:text-foreground"
        >
          <X className="size-3.5" />
        </button>
        <button
          type="button"
          onClick={onOpen}
          aria-label="Conversar com a Lebre"
          className="block rounded-2xl p-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <MascoteVivo
            className={dock ? "h-16 w-12 @[150px]:h-20 @[150px]:w-16" : "h-20 w-16"}
            alt="Lebre"
          />
        </button>
      </div>
    </aside>
  );
  return dock ? createPortal(companion, dock) : companion;
}
