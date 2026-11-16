/**
 * Hub de integrações: a Tipe no centro, ligada por linhas a pagamentos, salão,
 * cozinha, caixa, PDV e gestão. Pulsos de luz percorrem as linhas em ordem
 * (o pagamento chega, a Tipe distribui), param e recomeçam. Tudo em SVG e CSS,
 * sem vídeo. Cada nó mostra o status real (ver dados.ts). No celular a
 * composição vira uma coluna com uma espinha vertical. Com movimento reduzido
 * fica parada e completa. A versão `compacto` serve para a home.
 */
import { useEffect, useId, useRef, type CSSProperties } from "react";
import { Check, ChefHat, ConciergeBell, FileSpreadsheet, Plug, QrCode, Truck } from "lucide-react";
import logoBranco from "@/assets/marca/tipe-logo-branco.svg";
import { cn } from "@/lib/utils";
import { ehParcial, NOS_HUB, STATUS_ROTULO, type NoHub, type StatusIntegracao } from "./dados";

const ICONES = {
  pagamento: QrCode,
  salao: ConciergeBell,
  cozinha: ChefHat,
  caixa: FileSpreadsheet,
  pdv: Plug,
  fiscal: Truck,
} as const;

/** Ciclo completo (s) e início de cada pulso. O pagamento entra; a Tipe distribui para os outros. */
const CICLO = 10;
const ATRASO: Record<string, number> = { pag: 0, salao: 1.5, cozinha: 2.4, caixa: 3.3, pdv: 4.4 };
/** Fração do ciclo que um pulso leva para percorrer a linha. */
const VIAGEM = 0.12;

/** Posição (% da largura, % da altura) de cada nó na versão larga. */
const POS: Record<string, [number, number]> = {
  pag: [16.5, 19],
  salao: [13, 50],
  cozinha: [16.5, 81],
  caixa: [83.5, 19],
  pdv: [87, 50],
  fiscal: [83.5, 81],
};

const CSS = `
.hub-wide { display: none; }
.hub-stack { display: block; }
@container (min-width: 1120px) { .hub-wide { display: block; } .hub-stack { display: none; } }

.hub { --ciclo: ${CICLO}s; }
.hub-pulso { stroke-dasharray: 16 140; stroke-dashoffset: 16; animation: hub-sai var(--ciclo) cubic-bezier(.45,0,.2,1) var(--d) infinite both; }
.hub-pulso[data-entra] { animation-name: hub-entra; }
@keyframes hub-sai { 0% { stroke-dashoffset: 16; } ${VIAGEM * 100}% { stroke-dashoffset: -100; } 100% { stroke-dashoffset: -100; } }
@keyframes hub-entra { 0% { stroke-dashoffset: -100; } ${VIAGEM * 100}% { stroke-dashoffset: 16; } 100% { stroke-dashoffset: 16; } }
.hub-trilha { animation: hub-trilha var(--ciclo) ease-out var(--d) infinite both; }
@keyframes hub-trilha { 0% { stroke-opacity: .22; } 8% { stroke-opacity: .75; } 35% { stroke-opacity: .3; } 100% { stroke-opacity: .22; } }
.hub-no { transition: box-shadow .6s, border-color .6s; animation: hub-no var(--ciclo) ease-out var(--dn) infinite both; }
@keyframes hub-no {
  0%, 10% { box-shadow: 0 0 0 0 rgb(15 201 189 / 0); border-color: rgb(255 255 255 / .12); }
  14% { box-shadow: 0 0 0 4px rgb(15 201 189 / .22), 0 18px 50px -12px rgb(15 201 189 / .55); border-color: rgb(15 201 189 / .9); }
  42%, 100% { box-shadow: 0 0 0 0 rgb(15 201 189 / 0); border-color: rgb(255 255 255 / .12); }
}
.hub-no[data-status="piloto"], .hub-no[data-status="desenvolvimento"] { animation-name: hub-no-dev; }
@keyframes hub-no-dev {
  0%, 10% { border-color: rgb(15 201 189 / .35); }
  15% { border-color: rgb(15 201 189 / .8); }
  42%, 100% { border-color: rgb(15 201 189 / .35); }
}
.hub-no[data-status="planejada"] { animation: none; }
.hub-cartao { animation: hub-cartao var(--ciclo) cubic-bezier(.16,1,.3,1) var(--dn) infinite both; }
@keyframes hub-cartao { 0%, 11% { transform: translateY(0); } 15% { transform: translateY(-4px) scale(1.02); } 30%, 100% { transform: translateY(0); } }
.hub-check { animation: hub-check var(--ciclo) ease-out var(--dn) infinite both; }
@keyframes hub-check { 0%, 11% { transform: scale(1); } 14% { transform: scale(1.25); } 22%, 100% { transform: scale(1); } }
.hub-centro { animation: hub-centro var(--ciclo) ease-out ${CICLO * VIAGEM - 0.15}s infinite both; }
@keyframes hub-centro {
  0% { box-shadow: 0 0 0 0 rgb(15 201 189 / .5), 0 30px 80px -20px rgb(15 201 189 / .55); }
  12% { box-shadow: 0 0 0 26px rgb(15 201 189 / 0), 0 30px 90px -10px rgb(15 201 189 / .8); }
  100% { box-shadow: 0 0 0 0 rgb(15 201 189 / 0), 0 30px 80px -20px rgb(15 201 189 / .55); }
}
.hub-anel { animation: hub-gira 60s linear infinite; }
@keyframes hub-gira { to { transform: rotate(360deg); } }
.hub-desce { animation: hub-desce var(--ciclo) cubic-bezier(.45,0,.2,1) var(--d) infinite both; }
@keyframes hub-desce { 0% { top: 0; opacity: 0; } 2% { opacity: 1; } 46% { top: calc(100% - 3rem); opacity: 1; } 50%, 100% { top: calc(100% - 3rem); opacity: 0; } }
.hub[data-visivel="nao"] *, .hub[data-visivel="nao"] *::before { animation-play-state: paused !important; }
@media (prefers-reduced-motion: reduce) {
  .hub-pulso, .hub-desce { display: none; }
  .hub-trilha { animation: none; stroke-opacity: .45; }
  .hub-no, .hub-cartao, .hub-check, .hub-centro, .hub-anel { animation: none; }
}
`;

function Selo({ status, pequeno }: { status: StatusIntegracao; pequeno?: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1.5 whitespace-nowrap rounded-full font-medium",
        pequeno ? "px-2 py-0.5 text-[0.66rem]" : "px-2.5 py-1 text-[0.7rem]",
        status === "disponivel" && "bg-[#0FC9BD] text-[#021E34]",
        ehParcial(status) && "border border-dashed border-[#0FC9BD]/70 text-[#7fe9e1]",
        status === "planejada" && "border border-white/20 text-white/60",
      )}
    >
      <span
        className={cn(
          "h-1.5 w-1.5 rounded-full",
          status === "disponivel" && "bg-[#021E34]",
          ehParcial(status) && "border border-[#7fe9e1]",
          status === "planejada" && "bg-white/35",
        )}
      />
      {STATUS_ROTULO[status]}
    </span>
  );
}

function No({ no, compacto, className, style }: { no: NoHub; compacto: boolean; className?: string; style?: CSSProperties }) {
  const Icone = ICONES[no.icone];
  const atraso = ATRASO[no.id];
  const dn = atraso === undefined ? 0 : no.id === "pag" ? atraso - CICLO * VIAGEM : atraso;
  return (
    <div
      data-status={no.status}
      className={cn(
        "hub-no rounded-[1.35rem] border bg-[#08304d] text-left",
        compacto ? "p-3" : "p-3.5 sm:p-4",
        no.status === "disponivel" && "border-white/12",
        ehParcial(no.status) && "border-dashed border-[#0FC9BD]/40 bg-[#062a43]",
        no.status === "planejada" && "border-dashed border-white/15 bg-[#04233a] opacity-80",
        className,
      )}
      style={{ ...style, "--dn": `${dn}s` } as CSSProperties}
    >
      <div className={cn("flex", compacto ? "flex-col gap-2.5 sm:flex-row sm:items-start sm:gap-3" : "items-start gap-3")}>
        <span
          className={cn(
            "grid shrink-0 place-items-center rounded-xl",
            compacto ? "h-9 w-9" : "h-10 w-10",
            no.status === "disponivel" ? "bg-[#0FC9BD]/15 text-[#5fe3d9]" : "bg-white/[0.06] text-white/55",
          )}
        >
          <Icone className="h-[1.15rem] w-[1.15rem]" strokeWidth={1.8} />
        </span>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1">
            <p className={cn("font-display font-medium leading-tight tracking-[-0.02em] text-white", compacto ? "text-[0.98rem]" : "text-[1.05rem]")}>
              {no.titulo}
            </p>
            <Selo status={no.status} pequeno />
          </div>
          <p className={cn("mt-1 leading-snug text-white/60", compacto ? "hidden text-[0.78rem] lg:block" : "text-[0.82rem]")}>{no.sub}</p>
        </div>
      </div>
      {no.cartao && !compacto && (
        <div className="hub-cartao mt-3 flex items-center gap-2.5 rounded-2xl bg-white px-3 py-2.5 text-[#021E34] shadow-[0_14px_30px_-14px_rgb(0_0_0/0.6)]">
          <span className="hub-check grid h-7 w-7 shrink-0 place-items-center rounded-full bg-[#0FC9BD]">
            <Check className="h-4 w-4" strokeWidth={2.6} />
          </span>
          <span className="min-w-0 leading-tight">
            <span className="block text-[0.82rem] font-semibold">{no.cartao.titulo}</span>
            <span className="block truncate text-[0.74rem] text-[#021E34]/65">{no.cartao.linha}</span>
          </span>
        </div>
      )}
    </div>
  );
}

function Centro({ tamanho }: { tamanho: "g" | "m" | "p" }) {
  const dim = tamanho === "g" ? "h-48 w-48 xl:h-52 xl:w-52" : tamanho === "m" ? "h-36 w-36" : "h-28 w-28";
  return (
    <div className={cn("relative grid place-items-center", dim)}>
      <svg viewBox="0 0 100 100" aria-hidden className="hub-anel absolute -inset-5 h-[calc(100%+2.5rem)] w-[calc(100%+2.5rem)] text-[#0FC9BD]">
        <circle cx="50" cy="50" r="48" fill="none" stroke="currentColor" strokeOpacity=".35" strokeWidth=".4" strokeDasharray="1 3.2" />
      </svg>
      <div className="absolute inset-0 rounded-full border border-[#0FC9BD]/25" />
      <div className="hub-centro relative grid h-[82%] w-[82%] place-items-center rounded-full bg-[radial-gradient(circle_at_35%_28%,#11466b,#021E34_70%)] ring-1 ring-[#0FC9BD]/50">
        <img src={logoBranco} alt="" width={462} height={141} className="w-[62%]" draggable={false} />
      </div>
    </div>
  );
}

/** Pausa a animação quando o hub sai da tela. */
function useVisivel() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el || typeof IntersectionObserver === "undefined") return;
    const io = new IntersectionObserver(([e]) => el.setAttribute("data-visivel", e?.isIntersecting ? "sim" : "nao"), {
      rootMargin: "120px",
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return ref;
}

export function HubIntegracoes({ compacto = false, className }: { compacto?: boolean; className?: string }) {
  const ref = useVisivel();
  const uid = useId().replace(/:/g, "");
  const W = 1000;
  const H = compacto ? 560 : 660;
  const cx = W / 2;
  const cy = H / 2;

  const caminho = (id: string) => {
    const [px, py] = POS[id]!;
    const x = (px / 100) * W;
    const y = (py / 100) * H;
    const lado = x < cx ? -1 : 1;
    return `M ${cx} ${cy} C ${cx + lado * 150} ${cy}, ${x - lado * 170} ${y}, ${x} ${y}`;
  };

  const descricao = NOS_HUB.map((n) => `${n.titulo}: ${STATUS_ROTULO[n.status].toLowerCase()}`).join("; ");

  return (
    <figure
      ref={ref}
      className={cn(
        "hub @container relative isolate overflow-hidden rounded-[2rem] bg-[#021E34] text-white sm:rounded-[2.5rem]",
        className,
      )}
    >
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <figcaption className="sr-only">
        A plataforma Tipe no centro, ligada a: {descricao}.
      </figcaption>
      {/* Fundo em camadas: brilho turquesa atrás do centro e grade fina. */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(42%_48%_at_50%_50%,rgb(15_201_189/0.22),transparent_70%),radial-gradient(60%_60%_at_100%_0%,rgb(17_70_107/0.7),transparent_70%),radial-gradient(50%_50%_at_0%_100%,rgb(15_201_189/0.12),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-[0.07] [background-image:linear-gradient(rgb(255_255_255)_1px,transparent_1px),linear-gradient(90deg,rgb(255_255_255)_1px,transparent_1px)] [background-size:44px_44px] [mask-image:radial-gradient(70%_70%_at_50%_50%,#000,transparent)]"
      />

      {/* ---------- Versão larga (lg+) ---------- */}
      <div aria-hidden className="hub-wide relative" style={{ aspectRatio: `${W} / ${H}` }}>
        <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full" fill="none">
          <defs>
            <filter id={`brilho-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
              <feGaussianBlur stdDeviation="3.5" />
            </filter>
          </defs>
          {NOS_HUB.map((no) => {
            const d = caminho(no.id);
            const atraso = ATRASO[no.id];
            const estilo = { "--d": `${atraso ?? 0}s` } as CSSProperties;
            if (no.status === "planejada") {
              return <path key={no.id} d={d} stroke="#ffffff" strokeOpacity=".16" strokeWidth="1.2" strokeDasharray="1 7" strokeLinecap="round" />;
            }
            const dev = ehParcial(no.status);
            return (
              <g key={no.id} style={estilo}>
                <path
                  className="hub-trilha"
                  d={d}
                  stroke="#0FC9BD"
                  strokeOpacity=".22"
                  strokeWidth={dev ? 1.4 : 1.8}
                  strokeDasharray={dev ? "6 7" : undefined}
                />
                <path
                  className="hub-pulso"
                  data-entra={no.id === "pag" ? "" : undefined}
                  d={d}
                  pathLength={100}
                  stroke="#5fe3d9"
                  strokeOpacity={dev ? 0.55 : 1}
                  strokeWidth="9"
                  strokeLinecap="round"
                  filter={`url(#brilho-${uid})`}
                />
                <path
                  className="hub-pulso"
                  data-entra={no.id === "pag" ? "" : undefined}
                  d={d}
                  pathLength={100}
                  stroke="#ffffff"
                  strokeOpacity={dev ? 0.6 : 1}
                  strokeWidth="2.6"
                  strokeLinecap="round"
                />
              </g>
            );
          })}
        </svg>
        <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
          <Centro tamanho={compacto ? "m" : "g"} />
        </div>
        {NOS_HUB.map((no) => {
          const [px, py] = POS[no.id]!;
          return (
            <No
              key={no.id}
              no={no}
              compacto={compacto}
              className={cn("absolute -translate-x-1/2 -translate-y-1/2", compacto ? "w-[15.5rem]" : "w-[16.5rem] xl:w-[17.5rem]")}
              style={{ left: `${px}%`, top: `${py}%` }}
            />
          );
        })}
      </div>

      {/* ---------- Versão em coluna (celular e tablet) ---------- */}
      <div aria-hidden className={cn("hub-stack relative px-4 pb-6 pt-8 sm:px-8 sm:pb-10 sm:pt-12")}>
        <div className="flex justify-center">
          <Centro tamanho={compacto ? "p" : "m"} />
        </div>
        <div className="relative mt-8">
          {/* Espinha vertical com pulsos descendo. */}
          <div className={cn("absolute bottom-6 left-[1.1rem] top-0 w-px bg-[linear-gradient(#0FC9BD80,#0FC9BD33_70%,#ffffff1a)] sm:hidden", compacto && "hidden")}>
            {[0, 1.5, 3].map((d) => (
              <span
                key={d}
                className="hub-desce absolute -left-[3px] h-12 w-[7px] rounded-full bg-[linear-gradient(transparent,#5fe3d9,#fff)] shadow-[0_0_14px_2px_rgb(15_201_189/0.7)]"
                style={{ "--d": `${d}s` } as CSSProperties}
              />
            ))}
          </div>
          <ul className={cn("relative grid", compacto ? "grid-cols-2 gap-2.5 sm:grid-cols-3 sm:gap-3" : "gap-3 sm:grid-cols-2 sm:gap-4")}>
            {NOS_HUB.map((no) => (
              <li key={no.id} className={cn("relative", compacto ? "" : "pl-10 sm:pl-0")}>
                <span
                  className={cn(
                    "absolute left-[1.1rem] top-7 h-px w-6 sm:hidden", compacto && "hidden",
                    no.status === "planejada" ? "border-t border-dashed border-white/20" : ehParcial(no.status) ? "border-t border-dashed border-[#0FC9BD]/60" : "bg-[#0FC9BD]/70",
                  )}
                />
                <span
                  className={cn(
                    "absolute left-[calc(1.1rem-4px)] top-[calc(1.75rem-4px)] h-2 w-2 rounded-full sm:hidden", compacto && "hidden",
                    no.status === "disponivel" ? "bg-[#5fe3d9] shadow-[0_0_10px_2px_rgb(15_201_189/0.7)]" : "border border-white/30 bg-[#021E34]",
                  )}
                />
                <No no={no} compacto={compacto} className="h-full" />
              </li>
            ))}
          </ul>
        </div>
      </div>

      {!compacto && (
        <p aria-hidden className="relative px-6 pb-5 text-center text-[0.72rem] text-white/45 lg:absolute lg:inset-x-0 lg:bottom-0">
          Dados demonstrativos do restaurante fictício Maré Alta.
        </p>
      )}
    </figure>
  );
}
