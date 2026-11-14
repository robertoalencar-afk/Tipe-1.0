import { useState } from "react";

import { useQuery } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useMascotPreference } from "@/lib/tipe/mascot-preference";
import { getMenuAssistant } from "@/lib/tipe/menu-intelligence.functions";
import lebreCorpo from "@/assets/mascot-waiting.webp";
import { classeBotaoLebre, ConteudoBotaoLebre } from "./LebreBotao";

export function LebreMascote({
  slug,
  onOpen,
  onSuggestions,
}: {
  slug: string;
  onOpen: () => void;
  onSuggestions?: (() => void) | undefined;
}) {
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
  const [tipHidden, setTipHidden] = useState(false);
  if (!visible)
    return (
      <button
        type="button"
        onClick={onOpen}
        className={classeBotaoLebre(slug)}
        aria-label="Conversar com a Lebre"
      >
        <ConteudoBotaoLebre />
      </button>
    );
  const companion = (
    <aside
      aria-label="Mascote da Lebre"
      className="pointer-events-none fixed bottom-24 right-3 z-40 flex max-w-[calc(100vw-1.5rem)] items-center gap-1 print:hidden sm:right-5 lg:bottom-5"
    >
      {!tipHidden && (
        <div className="pointer-events-auto relative mb-6 w-44 rounded-2xl border border-border bg-background p-3 pr-7 text-sm shadow-lg sm:w-56">
          <span
            aria-hidden="true"
            className="absolute -right-2 top-1/2 size-3 rotate-45 border-r border-t border-border bg-background"
          />
          <button
            type="button"
            onClick={() => setTipHidden(true)}
            aria-label="Fechar dica"
            className="absolute right-1 top-1 grid size-7 place-items-center rounded-full hover:bg-muted"
          >
            <X className="size-3.5" />
          </button>
          <button type="button" onClick={count > 0 ? onSuggestions : onOpen} className="text-left">
            <span className="block font-semibold">
              {count > 0
                ? `Tenho ${count === 1 ? "uma ideia" : `${count} ideias`} para seu cardápio`
                : "Quer uma ajuda? Estou por aqui."}
            </span>
            <span className="mt-1 block text-xs text-muted-foreground underline underline-offset-4">
              {count > 0
                ? "Ver sugestões da Lebre"
                : "Peça um resumo do salão ou ajuda com um prato."}
            </span>
          </button>
        </div>
      )}
      <div className="pointer-events-auto relative shrink-0">
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
          <img
            src={lebreCorpo}
            alt="Lebre de corpo inteiro"
            className="lebre-companheira h-40 w-24 object-cover sm:h-48 sm:w-28"
          />
        </button>
      </div>
    </aside>
  );
  return companion;
}
