import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import lebreOla from "@/assets/lebre/avatar-ola.webp";
import { OPEN_LEBRE } from "@/lib/tipe/mascot-preference";
import { Assistente } from "./Inteligencia";

/** Lebre flutuante da Central, igual à da Gestão: abre de qualquer tela, com sugestões prontas. */
export function LebreCentral() {
  const [aberta, setAberta] = useState(false);
  useEffect(() => {
    const abrir = () => setAberta(true);
    window.addEventListener(OPEN_LEBRE, abrir);
    return () => window.removeEventListener(OPEN_LEBRE, abrir);
  }, []);
  return (
    <>
      <button
        type="button"
        onClick={() => setAberta(true)}
        aria-label="Conversar com a Lebre"
        title="Conversar com a Lebre"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-ink py-1.5 pl-1.5 pr-4 text-sm font-medium text-white shadow-lg transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring motion-reduce:transition-none sm:bottom-6 sm:right-6"
      >
        <img src={lebreOla} alt="" className="size-9 rounded-full bg-white object-cover" />
        Lebre
      </button>
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent side="right" className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:text-white [&>button]:opacity-90">
          <SheetHeader className="border-b border-border bg-ink px-4 py-3 text-left text-white">
            <SheetTitle className="flex items-center gap-2 text-white">
              <img src={lebreOla} alt="" className="size-8 rounded-full bg-white object-cover" />
              Lebre, a inteligência da Tipe
            </SheetTitle>
            <SheetDescription className="text-white/70">
              Consulta dados autorizados e entrega rascunhos. Nada sai sem a sua aprovação.
            </SheetDescription>
          </SheetHeader>
          <div className="min-h-0 flex-1">
            <Assistente embutido />
          </div>
        </SheetContent>
      </Sheet>
    </>
  );
}
