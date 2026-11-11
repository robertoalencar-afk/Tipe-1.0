import { HareOutline } from "@/components/tipe/HareOutline";

/** Classes do botão flutuante da Lebre (compartilhadas entre o atalho leve e o chat completo). */
export function classeBotaoLebre(slug?: string | undefined) {
  return `group fixed right-3 z-40 grid place-items-center rounded-full bg-primary text-primary-foreground shadow-xl transition-transform hover:-translate-y-0.5 print:hidden ${slug ? "bottom-24 h-12 w-12 sm:right-5 lg:bottom-5 lg:h-14 lg:w-14" : "bottom-4 h-11 w-11 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12"}`;
}

export function ConteudoBotaoLebre() {
  return (
    <>
      <HareOutline className="h-7 w-6" />
      <span className="pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-foreground px-3 py-1.5 text-xs font-semibold text-background opacity-0 shadow-md transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100 sm:block">
        Pergunte à Lebre
      </span>
    </>
  );
}
