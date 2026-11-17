import { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import lebreOla from "@/assets/lebre/avatar-ola.webp";
import { OPEN_LEBRE } from "@/lib/tipe/mascot-preference";
import { classeBotaoLebre, ConteudoBotaoLebre } from "@/components/tipe/LebreBotao";
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
        className={classeBotaoLebre("central")}
        aria-label="Conversar com a Lebre"
      >
        <ConteudoBotaoLebre />
      </button>
      <Sheet open={aberta} onOpenChange={setAberta}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-md [&>button]:text-white [&>button]:opacity-90"
        >
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
