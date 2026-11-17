import rosto from "@/assets/lebre/rosto-ola.webp";

/** Classes do botão flutuante da Lebre (compartilhadas entre o atalho leve e o chat completo). */
export function classeBotaoLebre(slug?: string | undefined) {
  return `group fixed right-3 z-40 grid place-items-center rounded-full bg-brand text-ink shadow-xl ring-white/70 transition-transform hover:-translate-y-1 hover:scale-105 active:scale-95 print:hidden ${slug ? "ring-4 bottom-[max(1rem,env(safe-area-inset-bottom))] h-12 w-12 sm:right-5 lg:bottom-5 lg:h-16 lg:w-16" : "bottom-4 h-11 w-11 ring-2 sm:bottom-6 sm:right-6 sm:h-12 sm:w-12"}`;
}

export function ConteudoBotaoLebre() {
  return (
    <>
      <img
        src={rosto}
        alt=""
        width={64}
        height={64}
        className="relative h-[88%] w-[88%] rounded-full object-cover"
      />
      <span className="lebre-rotulo pointer-events-none absolute right-full mr-3 hidden whitespace-nowrap rounded-full bg-foreground px-4 py-2 text-sm font-semibold text-background shadow-md transition-opacity group-hover:!opacity-100 group-focus-visible:!opacity-100 sm:block">
        Pergunte à Lebre
      </span>
    </>
  );
}
