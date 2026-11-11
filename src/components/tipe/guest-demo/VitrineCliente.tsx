/**
 * Tipe Guest · demonstração web do cliente (Projeto 4). Descobrir, buscar, filtrar, ver no mapa,
 * abrir o restaurante, reservar, acompanhar em "Minhas reservas", favoritar e perguntar à Lebre.
 * Tudo roda no navegador com restaurantes FICTÍCIOS; nada é enviado e nenhuma cobrança acontece.
 * Horários saem do motor real (src/lib/tipe/guest/reservas.ts via vitrine.ts).
 */
import { useMemo, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Heart,
  List,
  Map as MapIcon,
  MapPin,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import lebrePensando from "@/assets/lebre/avatar-pensando.webp";
import {
  addDays,
  guestCanChange,
  localDay,
  localInstant,
  localTime,
} from "@/lib/tipe/guest/reservas";
import { guaranteeAmountCents, guaranteePolicyLines } from "@/lib/tipe/guest/garantia";
import {
  colecoes,
  destaquePago,
  filtrar,
  horariosLivres,
  horariosPerto,
  ordenar,
  perguntarLebre,
  VITRINE,
  VITRINE_SETTINGS as S,
  type Cozinha,
  type Filtros,
  type Ordem,
  type RespostaLebre,
  type VitrineRestaurante as R,
} from "@/lib/tipe/guest/vitrine";
import { FOTO_RESTAURANTE, FOTOS_PRATOS } from "./fotos";

const NAVY = "#021E34";
const TURQ = "#0FC9BD";
const GARANTIA_PP = 2000;
const COZINHAS: Cozinha[] = [
  "Frutos do mar",
  "Regional",
  "Café e brunch",
  "Japonesa",
  "Italiana",
  "Bar",
];
const preco = (p: number) => "$".repeat(p);
const nota = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 1 });
const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

type Reserva = {
  codigo: string;
  r: R;
  inicio: Date;
  pessoas: number;
  status: "confirmada" | "concluida" | "cancelada" | "espera";
  pedidos: string[];
  garantia: number;
};

type Tela =
  | { k: "home" }
  | { k: "perfil"; r: R }
  | { k: "reservar"; r: R; inicio: Date }
  | { k: "ok"; res: Reserva }
  | { k: "minhas" };

export function VitrineCliente() {
  const agora = useMemo(() => new Date(), []);
  const hoje = localDay(agora, S);
  const [tela, setTela] = useState<Tela>({ k: "home" });
  const [dia, setDia] = useState(hoje);
  const [hora, setHora] = useState("20:00");
  const [pessoas, setPessoas] = useState(2);
  const [f, setF] = useState<Filtros>({});
  const [ordem, setOrdem] = useState<Ordem>("relevancia");
  const [modo, setModo] = useState<"lista" | "mapa">("lista");
  const [favs, setFavs] = useState<string[]>(["jangada-cafe"]);
  const [reservas, setReservas] = useState<Reserva[]>(() => [
    {
      codigo: "TG-4Q7K",
      r: VITRINE[1]!,
      inicio: localInstant(addDays(hoje, -12), "20:00", S),
      pessoas: 4,
      status: "concluida",
      pedidos: [],
      garantia: 0,
    },
  ]);

  const alvo = localInstant(dia, hora, S);
  const fav = (id: string) =>
    setFavs((x) => (x.includes(id) ? x.filter((y) => y !== id) : [...x, id]));
  const ctx: Ctx = {
    dia,
    pessoas,
    alvo,
    agora,
    favs,
    fav,
    abrir: (r) => setTela({ k: "perfil", r }),
    reservar: (r, inicio) => setTela({ k: "reservar", r, inicio }),
  };

  return (
    <div className="min-h-[720px] bg-[#F6F8FA] text-[#021E34]">
      <header className="sticky top-0 z-20 border-b border-[#021E34]/10 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={() => setTela({ k: "home" })}
            className="font-display text-lg font-semibold tracking-[-0.02em]"
          >
            Tipe <span style={{ color: TURQ }}>Guest</span>
          </button>
          <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[0.65rem] font-medium text-amber-900">
            Demonstração · restaurantes fictícios
          </span>
          <div className="ml-auto flex items-center gap-1">
            <button
              type="button"
              onClick={() => setTela({ k: "minhas" })}
              className="flex items-center gap-1.5 rounded-full px-3 py-2 text-sm hover:bg-[#021E34]/5"
            >
              <CalendarDays className="h-4 w-4" /> Minhas reservas
            </button>
          </div>
        </div>
      </header>

      {tela.k === "home" && (
        <Home
          ctx={ctx}
          hoje={hoje}
          hora={hora}
          setDia={setDia}
          setHora={setHora}
          setPessoas={setPessoas}
          f={f}
          setF={setF}
          ordem={ordem}
          setOrdem={setOrdem}
          modo={modo}
          setModo={setModo}
        />
      )}
      {tela.k === "perfil" && (
        <Perfil
          r={tela.r}
          ctx={ctx}
          voltar={() => setTela({ k: "home" })}
          setPessoas={setPessoas}
          setDia={setDia}
          hoje={hoje}
        />
      )}
      {tela.k === "reservar" && (
        <Reservar
          r={tela.r}
          inicio={tela.inicio}
          pessoas={pessoas}
          voltar={() => setTela({ k: "perfil", r: tela.r })}
          confirmar={(res) => {
            setReservas((x) => [res, ...x]);
            setTela({ k: "ok", res });
          }}
        />
      )}
      {tela.k === "ok" && <Confirmada res={tela.res} minhas={() => setTela({ k: "minhas" })} />}
      {tela.k === "minhas" && (
        <Minhas
          reservas={reservas}
          agora={agora}
          favs={favs}
          ctx={ctx}
          cancelar={(c) =>
            setReservas((x) => x.map((y) => (y.codigo === c ? { ...y, status: "cancelada" } : y)))
          }
          sairEspera={(c) => setReservas((x) => x.filter((y) => y.codigo !== c))}
          entrarEspera={(r) =>
            setReservas((x) => [
              {
                codigo: codigo(),
                r,
                inicio: alvo,
                pessoas,
                status: "espera",
                pedidos: [],
                garantia: 0,
              },
              ...x,
            ])
          }
        />
      )}
    </div>
  );
}

type Ctx = {
  dia: string;
  pessoas: number;
  alvo: Date;
  agora: Date;
  favs: string[];
  fav: (id: string) => void;
  abrir: (r: R) => void;
  reservar: (r: R, inicio: Date) => void;
};

const codigo = () => `TG-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;

// ---------------------------------------------------------------- home: busca, coleções, resultados

function Home(p: {
  ctx: Ctx;
  hoje: string;
  hora: string;
  setDia: (d: string) => void;
  setHora: (h: string) => void;
  setPessoas: (n: number) => void;
  f: Filtros;
  setF: (f: Filtros) => void;
  ordem: Ordem;
  setOrdem: (o: Ordem) => void;
  modo: "lista" | "mapa";
  setModo: (m: "lista" | "mapa") => void;
}) {
  const { ctx, f, setF } = p;
  const lista = ordenar(filtrar(VITRINE, f), p.ordem);
  const filtrando = Object.values(f).some((v) => (Array.isArray(v) ? v.length : v));
  const destaque = destaquePago(VITRINE);
  const toggle = <T,>(arr: T[] | undefined, v: T) =>
    arr?.includes(v) ? arr.filter((x) => x !== v) : [...(arr ?? []), v];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16">
      <section className="py-8 sm:py-10">
        <h1 className="font-display text-3xl font-semibold tracking-[-0.03em] sm:text-5xl">
          Sua mesa em Fortaleza, <span style={{ color: TURQ }}>sem fila</span>.
        </h1>
        <div className="mt-5 grid gap-2 rounded-[1.4rem] bg-white p-2 shadow-[0_1px_0_rgba(2,30,52,.06),0_12px_32px_-16px_rgba(2,30,52,.25)] sm:grid-cols-[1.6fr_1fr_.8fr_.8fr]">
          <label className="flex items-center gap-2 rounded-xl px-3 py-2.5 hover:bg-[#021E34]/[.03]">
            <Search className="h-4 w-4 shrink-0 opacity-60" />
            <span className="sr-only">Buscar</span>
            <input
              value={f.texto ?? ""}
              onChange={(e) => setF({ ...f, texto: e.target.value })}
              placeholder="Restaurante, cozinha ou bairro"
              className="w-full bg-transparent text-sm outline-none"
            />
          </label>
          <Campo rotulo="Dia">
            <select
              value={ctx.dia}
              onChange={(e) => p.setDia(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              {[0, 1, 2, 3, 4, 5, 6].map((i) => {
                const d = addDays(p.hoje, i);
                return (
                  <option key={d} value={d}>
                    {i === 0
                      ? "Hoje"
                      : i === 1
                        ? "Amanhã"
                        : new Date(`${d}T12:00:00Z`).toLocaleDateString("pt-BR", {
                            weekday: "short",
                            day: "2-digit",
                            timeZone: "UTC",
                          })}
                  </option>
                );
              })}
            </select>
          </Campo>
          <Campo rotulo="Hora">
            <select
              value={p.hora}
              onChange={(e) => p.setHora(e.target.value)}
              className="w-full bg-transparent text-sm outline-none"
            >
              {[
                "09:00",
                "12:00",
                "13:00",
                "19:00",
                "19:30",
                "20:00",
                "20:30",
                "21:00",
                "21:30",
              ].map((h) => (
                <option key={h}>{h}</option>
              ))}
            </select>
          </Campo>
          <Campo rotulo="Pessoas">
            <select
              value={ctx.pessoas}
              onChange={(e) => p.setPessoas(Number(e.target.value))}
              className="w-full bg-transparent text-sm outline-none"
            >
              {Array.from({ length: S.maxParty }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n} {n === 1 ? "pessoa" : "pessoas"}
                </option>
              ))}
            </select>
          </Campo>
        </div>
        <Lebre ctx={ctx} />
      </section>

      {!filtrando && destaque && (
        <section
          aria-label="A Lebre recomenda"
          className="mb-8 overflow-hidden rounded-[1.6rem] bg-[#021E34] text-white sm:grid sm:max-h-80 sm:grid-cols-[1.1fr_1fr]"
        >
          <img
            src={FOTO_RESTAURANTE[destaque.id]}
            alt=""
            className="h-48 w-full object-cover sm:h-full"
            loading="lazy"
          />
          <div className="p-5 sm:p-7">
            <div className="flex items-center gap-2 text-xs">
              <span
                className="flex items-center gap-1 rounded-full bg-white/10 px-2 py-0.5 font-medium"
                style={{ color: TURQ }}
              >
                <Sparkles className="h-3.5 w-3.5" /> A Lebre recomenda
              </span>
              <span className="rounded-full border border-white/25 px-2 py-0.5 text-white/70">
                Patrocinado
              </span>
            </div>
            <p className="mt-3 font-display text-2xl font-semibold tracking-[-0.02em]">
              {destaque.nome}
            </p>
            <p className="text-sm text-white/70">
              {destaque.cozinha} · {destaque.bairro} · {preco(destaque.preco)} ·{" "}
              <Star className="inline h-3.5 w-3.5 -translate-y-px fill-current" />{" "}
              {nota(destaque.nota)}
            </p>
            {destaque.experiencias[0] && (
              <p className="mt-3 text-sm">
                {destaque.experiencias[0].titulo}: {destaque.experiencias[0].desc}
              </p>
            )}
            <Horarios r={destaque} ctx={ctx} escuro />
          </div>
        </section>
      )}

      {!filtrando &&
        colecoes(VITRINE).map((c) => (
          <section key={c.id} className="mb-8">
            <h2 className="mb-3 font-display text-xl font-semibold tracking-[-0.02em]">
              {c.titulo}
            </h2>
            <div className="-mx-4 flex snap-x gap-3 overflow-x-auto px-4 pb-2">
              {c.itens.map((r) => (
                <Cartao key={r.id} r={r} ctx={ctx} compacto />
              ))}
            </div>
          </section>
        ))}

      <section aria-label="Resultados">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          <h2 className="mr-auto font-display text-xl font-semibold tracking-[-0.02em]">
            {lista.length} {lista.length === 1 ? "restaurante" : "restaurantes"}
          </h2>
          <select
            aria-label="Ordenar"
            value={p.ordem}
            onChange={(e) => p.setOrdem(e.target.value as Ordem)}
            className="rounded-full border border-[#021E34]/15 bg-white px-3 py-1.5 text-sm"
          >
            <option value="relevancia">Relevância</option>
            <option value="nota">Melhor avaliação</option>
            <option value="populares">Mais reservados</option>
            <option value="preco">Menor preço</option>
          </select>
          <div
            className="flex rounded-full border border-[#021E34]/15 bg-white p-0.5"
            role="group"
            aria-label="Ver como"
          >
            {(["lista", "mapa"] as const).map((m) => (
              <button
                key={m}
                type="button"
                aria-pressed={p.modo === m}
                onClick={() => p.setModo(m)}
                className={cn(
                  "flex items-center gap-1 rounded-full px-3 py-1 text-sm",
                  p.modo === m && "bg-[#021E34] text-white",
                )}
              >
                {m === "lista" ? <List className="h-4 w-4" /> : <MapIcon className="h-4 w-4" />}
                {m === "lista" ? "Lista" : "Mapa"}
              </button>
            ))}
          </div>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {COZINHAS.map((c) => (
            <Chip
              key={c}
              on={!!f.cozinhas?.includes(c)}
              onClick={() => setF({ ...f, cozinhas: toggle(f.cozinhas, c) })}
            >
              {c}
            </Chip>
          ))}
          {([1, 2, 3] as const).map((n) => (
            <Chip
              key={n}
              on={!!f.precos?.includes(n)}
              onClick={() => setF({ ...f, precos: toggle(f.precos, n) })}
            >
              {preco(n)}
            </Chip>
          ))}
          <Chip
            on={!!f.notaMin}
            onClick={() => setF({ ...f, notaMin: f.notaMin ? undefined : 4.5 })}
          >
            Nota 4,5+
          </Chip>
          <Chip on={!!f.fundador} onClick={() => setF({ ...f, fundador: !f.fundador })}>
            Fundador
          </Chip>
          {filtrando && (
            <button type="button" onClick={() => setF({})} className="px-2 text-sm underline">
              Limpar
            </button>
          )}
        </div>
        {lista.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#021E34]/20 bg-white p-8 text-center">
            <p className="font-medium">Nenhum restaurante com esses filtros.</p>
            <button
              type="button"
              onClick={() => setF({})}
              className="mt-3 rounded-full bg-[#021E34] px-4 py-2 text-sm text-white"
            >
              Limpar filtros
            </button>
          </div>
        ) : p.modo === "lista" ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {lista.map((r) => (
              <Cartao key={r.id} r={r} ctx={ctx} />
            ))}
          </div>
        ) : (
          <Mapa lista={lista} ctx={ctx} />
        )}
      </section>
    </main>
  );
}

function Campo({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <label className="block rounded-xl px-3 py-1.5 hover:bg-[#021E34]/[.03]">
      <span className="block text-[0.65rem] font-medium uppercase tracking-wide text-[#5b6b78]">
        {rotulo}
      </span>
      {children}
    </label>
  );
}

function Chip({
  on,
  onClick,
  children,
}: {
  on: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-full border px-3 py-1 text-sm transition-colors",
        on
          ? "border-[#021E34] bg-[#021E34] text-white"
          : "border-[#021E34]/15 bg-white hover:border-[#021E34]/40",
      )}
    >
      {children}
    </button>
  );
}

function Horarios({ r, ctx, escuro, n = 3 }: { r: R; ctx: Ctx; escuro?: boolean; n?: number }) {
  const livres = horariosLivres(r, ctx.dia, ctx.pessoas, ctx.agora);
  const perto = horariosPerto(livres, ctx.alvo, n);
  if (!perto.length)
    return (
      <p className={cn("mt-3 text-xs", escuro ? "text-white/60" : "text-[#5b6b78]")}>
        Sem horário livre neste dia para {ctx.pessoas}.
      </p>
    );
  return (
    <div className="mt-3 flex flex-wrap gap-1.5">
      {perto.map((d) => (
        <button
          key={d.getTime()}
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            ctx.reservar(r, d);
          }}
          className={cn(
            "rounded-full px-3 py-1.5 text-sm font-semibold tabular-nums",
            escuro ? "bg-[#0FC9BD] text-[#021E34]" : "bg-[#021E34] text-white hover:bg-[#0a2f4d]",
          )}
        >
          {localTime(d, S)}
        </button>
      ))}
    </div>
  );
}

function Cartao({ r, ctx, compacto }: { r: R; ctx: Ctx; compacto?: boolean }) {
  const favorito = ctx.favs.includes(r.id);
  return (
    <article
      className={cn(
        "group relative shrink-0 snap-start overflow-hidden rounded-[1.25rem] border border-[#021E34]/10 bg-white",
        compacto && "w-64",
      )}
    >
      <button type="button" onClick={() => ctx.abrir(r)} className="block w-full text-left">
        <img
          src={FOTO_RESTAURANTE[r.id]}
          alt=""
          loading="lazy"
          className="h-36 w-full object-cover transition-transform duration-700 group-hover:scale-[1.03]"
        />
        <div className="p-3.5 pb-0">
          <p className="font-semibold">{r.nome}</p>
          <p className="text-sm text-[#5b6b78]">
            <Star className="inline h-3.5 w-3.5 -translate-y-px fill-[#021E34]" /> {nota(r.nota)} (
            {r.avaliacoes}) · {r.cozinha} · {preco(r.preco)}
          </p>
          <p className="text-xs text-[#5b6b78]">
            {r.bairro} · reservado {r.reservasHoje} vezes hoje
          </p>
        </div>
      </button>
      <div className="px-3.5 pb-3.5">
        <Horarios r={r} ctx={ctx} />
      </div>
      <button
        type="button"
        aria-label={favorito ? `Tirar ${r.nome} dos favoritos` : `Favoritar ${r.nome}`}
        aria-pressed={favorito}
        onClick={() => ctx.fav(r.id)}
        className="absolute right-2.5 top-2.5 grid h-9 w-9 place-items-center rounded-full bg-white/90"
      >
        <Heart className={cn("h-4 w-4", favorito && "fill-[#e5484d] text-[#e5484d]")} />
      </button>
      {r.fundador && (
        <span className="absolute left-2.5 top-2.5 rounded-full bg-white/90 px-2 py-0.5 text-[0.65rem] font-medium">
          Fundador
        </span>
      )}
    </article>
  );
}

/** Mapa estilizado (sem provedor pago): orla de Fortaleza desenhada e pinos clicáveis. */
function Mapa({ lista, ctx }: { lista: R[]; ctx: Ctx }) {
  const [sel, setSel] = useState<R | null>(lista[0] ?? null);
  return (
    <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
      <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] border border-[#021E34]/10 bg-[#EAF3F5]">
        <svg viewBox="0 0 100 75" className="absolute inset-0 h-full w-full" aria-hidden>
          <path
            d="M0 0 H100 V8 C85 14 78 6 66 12 C55 18 45 10 30 14 C18 17 10 12 0 16 Z"
            fill="#BFE8EE"
          />
          <path
            d="M0 16 C10 12 18 17 30 14 C45 10 55 18 66 12 C78 6 85 14 100 8"
            fill="none"
            stroke="#0FC9BD"
            strokeWidth=".6"
          />
          {[25, 40, 55].map((y) => (
            <path key={y} d={`M0 ${y} H100`} stroke="#fff" strokeWidth=".8" />
          ))}
          {[20, 45, 70].map((x) => (
            <path key={x} d={`M${x} 10 V75`} stroke="#fff" strokeWidth=".8" />
          ))}
        </svg>
        {lista.map((r) => (
          <button
            key={r.id}
            type="button"
            onClick={() => setSel(r)}
            aria-label={r.nome}
            style={{ left: `${r.x}%`, top: `${r.y}%` }}
            className={cn(
              "absolute flex -translate-x-1/2 -translate-y-full items-center gap-1 rounded-full px-2 py-1 text-xs font-semibold shadow-md transition-transform",
              sel?.id === r.id ? "z-10 scale-110 bg-[#021E34] text-white" : "bg-white",
            )}
          >
            <MapPin className="h-3.5 w-3.5" /> {r.nome}
          </button>
        ))}
        <p className="absolute bottom-2 left-3 text-[0.65rem] text-[#5b6b78]">
          Mapa ilustrativo da demonstração
        </p>
      </div>
      {sel && <Cartao r={sel} ctx={ctx} />}
    </div>
  );
}

function Lebre({ ctx }: { ctx: Ctx }) {
  const [q, setQ] = useState("");
  const [resp, setResp] = useState<RespostaLebre | null>(null);
  return (
    <div className="mt-4 rounded-[1.4rem] border border-[#0FC9BD]/40 bg-white p-3">
      <form
        className="flex items-center gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) setResp(perguntarLebre(q));
        }}
      >
        <img src={lebrePensando} alt="" className="h-9 w-9 rounded-full" />
        <label className="sr-only" htmlFor="lebre-q">
          Pergunte à Lebre onde ir
        </label>
        <input
          id="lebre-q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Pergunte à Lebre onde ir: jantar romântico com vista para o mar"
          className="w-full bg-transparent text-sm outline-none"
        />
        <button
          type="submit"
          className="shrink-0 rounded-full bg-[#021E34] px-4 py-2 text-sm text-white"
        >
          Perguntar
        </button>
      </form>
      {resp && (
        <div className="mt-3 border-t border-[#021E34]/10 pt-3">
          <p className="text-sm">{resp.texto}</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-3">
            {resp.restaurantes.map((r) => (
              <button
                key={r.id}
                type="button"
                onClick={() => ctx.abrir(r)}
                className="rounded-xl border border-[#021E34]/10 p-2.5 text-left hover:border-[#021E34]/30"
              >
                <p className="text-sm font-semibold">{r.nome}</p>
                <p className="text-xs text-[#5b6b78]">
                  {r.cozinha} · {r.bairro} · {nota(r.nota)}
                </p>
              </button>
            ))}
          </div>
          <p className="mt-2 text-[0.7rem] text-[#5b6b78]">
            A Lebre só sugere restaurantes do Tipe Guest e nunca inventa horário, preço ou
            avaliação.
          </p>
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------- perfil do restaurante

const AVALIACOES = [
  {
    nome: "Camila R.",
    nota: 5,
    texto: "Atendimento atencioso e prato no ponto. Voltaremos.",
    resposta: "Obrigado, Camila! Esperamos vocês.",
  },
  {
    nome: "Rafael M.",
    nota: 4,
    texto: "Comida ótima, demorou um pouco para sair no sábado.",
    resposta: null,
  },
];

function Perfil({
  r,
  ctx,
  voltar,
  setPessoas,
  setDia,
  hoje,
}: {
  r: R;
  ctx: Ctx;
  voltar: () => void;
  setPessoas: (n: number) => void;
  setDia: (d: string) => void;
  hoje: string;
}) {
  const [aba, setAba] = useState<"sobre" | "cardapio" | "avaliacoes">("sobre");
  const livres = horariosLivres(r, ctx.dia, ctx.pessoas, ctx.agora);
  const painel = (
    <div className="rounded-[1.4rem] border border-[#021E34]/10 bg-white p-4">
      <p className="font-semibold">Faça uma reserva</p>
      <div className="mt-3 grid grid-cols-2 gap-2">
        <select
          aria-label="Pessoas"
          value={ctx.pessoas}
          onChange={(e) => setPessoas(Number(e.target.value))}
          className="rounded-xl border border-[#021E34]/15 px-2 py-2 text-sm"
        >
          {Array.from({ length: S.maxParty }, (_, i) => i + 1).map((n) => (
            <option key={n} value={n}>
              {n} {n === 1 ? "pessoa" : "pessoas"}
            </option>
          ))}
        </select>
        <select
          aria-label="Dia"
          value={ctx.dia}
          onChange={(e) => setDia(e.target.value)}
          className="rounded-xl border border-[#021E34]/15 px-2 py-2 text-sm"
        >
          {[0, 1, 2, 3, 4, 5, 6].map((i) => {
            const d = addDays(hoje, i);
            return (
              <option key={d} value={d}>
                {i === 0 ? "Hoje" : i === 1 ? "Amanhã" : d.slice(8) + "/" + d.slice(5, 7)}
              </option>
            );
          })}
        </select>
      </div>
      {livres.length ? (
        <div className="mt-3 grid grid-cols-4 gap-1.5">
          {livres.map((d) => (
            <button
              key={d.getTime()}
              type="button"
              onClick={() => ctx.reservar(r, d)}
              className="rounded-xl bg-[#021E34] py-2 text-xs font-semibold tabular-nums text-white"
            >
              {localTime(d, S)}
            </button>
          ))}
        </div>
      ) : (
        <p className="mt-3 rounded-xl border border-dashed border-[#021E34]/20 p-3 text-center text-sm text-[#5b6b78]">
          Sem horário livre. Tente outro dia.
        </p>
      )}
      <p className="mt-3 text-[0.7rem] leading-relaxed text-[#5b6b78]">
        Mesa por até {S.durationMin} min. Cancelamento pelo app até {S.cancelCutoffMin / 60} h
        antes.
        {r.aceitaGarantia
          ? ` Garantia de ${brl(GARANTIA_PP)} por pessoa, descontada da conta.`
          : " Sem garantia."}
      </p>
    </div>
  );
  return (
    <main className="pb-24 lg:pb-12">
      <div className="relative h-56 sm:h-72">
        <img src={FOTO_RESTAURANTE[r.id]} alt="" className="h-full w-full object-cover" />
        <button
          type="button"
          onClick={voltar}
          aria-label="Voltar"
          className="absolute left-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          onClick={() => ctx.fav(r.id)}
          aria-pressed={ctx.favs.includes(r.id)}
          aria-label="Favoritar"
          className="absolute right-4 top-4 grid h-10 w-10 place-items-center rounded-full bg-white/90"
        >
          <Heart
            className={cn("h-4 w-4", ctx.favs.includes(r.id) && "fill-[#e5484d] text-[#e5484d]")}
          />
        </button>
      </div>
      <div className="mx-auto grid max-w-6xl gap-6 px-4 pt-5 lg:grid-cols-[1fr_340px]">
        <div>
          <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">{r.nome}</h1>
          <p className="mt-1 text-sm text-[#5b6b78]">
            <Star className="inline h-3.5 w-3.5 -translate-y-px fill-[#021E34]" /> {nota(r.nota)} ·{" "}
            {r.avaliacoes} avaliações verificadas · {r.cozinha} · {preco(r.preco)} · {r.bairro}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {r.fundador && (
              <span className="flex items-center gap-1 rounded-full bg-[#0FC9BD]/15 px-2 py-0.5 text-xs font-medium">
                <BadgeCheck className="h-3.5 w-3.5" /> Restaurante Fundador
              </span>
            )}
            {r.tags.map((t) => (
              <span key={t} className="rounded-full border border-[#021E34]/15 px-2 py-0.5 text-xs">
                {t}
              </span>
            ))}
          </div>
          <div className="mt-5 flex gap-4 border-b border-[#021E34]/10" role="tablist">
            {(["sobre", "cardapio", "avaliacoes"] as const).map((a) => (
              <button
                key={a}
                role="tab"
                aria-selected={aba === a}
                type="button"
                onClick={() => setAba(a)}
                className={cn(
                  "-mb-px border-b-2 pb-2 text-sm",
                  aba === a
                    ? "border-[#021E34] font-semibold"
                    : "border-transparent text-[#5b6b78]",
                )}
              >
                {a === "sobre" ? "Sobre" : a === "cardapio" ? "Cardápio" : "Avaliações"}
              </button>
            ))}
          </div>
          {aba === "sobre" && (
            <div className="space-y-4 py-4 text-sm">
              <p>
                Restaurante fictício da demonstração do Tipe Guest, em {r.bairro}. A conta é paga
                pelo Tipe Pay: Pix, Apple Pay, Google Pay ou no estabelecimento.
              </p>
              {r.experiencias.length > 0 && (
                <div>
                  <p className="font-semibold">Experiências</p>
                  {r.experiencias.map((e) => (
                    <div
                      key={e.titulo}
                      className="mt-2 rounded-xl border border-[#021E34]/10 bg-white p-3"
                    >
                      <p className="font-medium">{e.titulo}</p>
                      <p className="text-[#5b6b78]">
                        {e.desc} Reserve um horário normal e peça a experiência; sem venda de
                        ingresso.
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {aba === "cardapio" && (
            <div className="grid grid-cols-2 gap-3 py-4 sm:grid-cols-3">
              {FOTOS_PRATOS.map((p) => (
                <figure key={p.nome} className="overflow-hidden rounded-xl bg-white">
                  <img
                    src={p.foto}
                    alt={p.nome}
                    loading="lazy"
                    className="aspect-square w-full object-cover"
                  />
                  <figcaption className="p-2 text-sm">{p.nome}</figcaption>
                </figure>
              ))}
            </div>
          )}
          {aba === "avaliacoes" && (
            <div className="space-y-3 py-4">
              <p className="text-xs text-[#5b6b78]">
                Só quem reservou e foi pode avaliar comida, serviço e ambiente.
              </p>
              {AVALIACOES.map((a) => (
                <div
                  key={a.nome}
                  className="rounded-xl border border-[#021E34]/10 bg-white p-3 text-sm"
                >
                  <p className="font-medium">
                    {a.nome} · {"★".repeat(a.nota)}
                    <span className="ml-1 text-xs font-normal text-[#5b6b78]">
                      visita verificada
                    </span>
                  </p>
                  <p className="mt-1">{a.texto}</p>
                  {a.resposta && (
                    <p className="mt-2 rounded-lg bg-[#021E34]/[.04] p-2 text-[#5b6b78]">
                      Resposta do restaurante: {a.resposta}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
        <aside className="hidden lg:block">
          <div className="sticky top-20">{painel}</div>
        </aside>
        <div className="lg:hidden">{painel}</div>
      </div>
      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[#021E34]/10 bg-white p-3 lg:hidden">
        <a
          href="#painel-reserva"
          onClick={(e) => {
            e.preventDefault();
            window.scrollTo({ top: document.body.scrollHeight, behavior: "smooth" });
          }}
          className="block rounded-full bg-[#021E34] py-3 text-center text-sm font-semibold text-white"
        >
          Ver horários
        </a>
      </div>
    </main>
  );
}

// ---------------------------------------------------------------- reservar e confirmação

const PEDIDOS = [
  "Mesa na varanda",
  "Cadeira para bebê",
  "Acessibilidade",
  "Aniversário",
  "Restrição alimentar",
];

function Reservar({
  r,
  inicio,
  pessoas,
  voltar,
  confirmar,
}: {
  r: R;
  inicio: Date;
  pessoas: number;
  voltar: () => void;
  confirmar: (res: Reserva) => void;
}) {
  const [pedidos, setPedidos] = useState<string[]>([]);
  const [aceito, setAceito] = useState(false);
  const g = r.aceitaGarantia
    ? { perPersonCents: GARANTIA_PP, refundCutoffMin: S.cancelCutoffMin }
    : null;
  const total = g ? guaranteeAmountCents(g, pessoas) : 0;
  return (
    <main className="mx-auto max-w-xl px-4 py-6">
      <button type="button" onClick={voltar} className="mb-4 flex items-center gap-1 text-sm">
        <ArrowLeft className="h-4 w-4" /> {r.nome}
      </button>
      <div className="rounded-[1.4rem] bg-[#021E34] p-5 text-white">
        <p className="text-sm text-white/70">{r.nome}</p>
        <p className="font-display text-4xl font-semibold tracking-[-0.03em]">
          {localTime(inicio, S)}
        </p>
        <p className="text-sm">
          {new Date(inicio).toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            timeZone: S.timeZone,
          })}{" "}
          · <Users className="inline h-4 w-4" /> {pessoas}
        </p>
        <p className="mt-2 text-xs text-white/70">
          Seguramos este horário por 5 minutos enquanto você confirma.
        </p>
      </div>
      <p className="mt-5 text-sm font-semibold">Pedidos ao restaurante</p>
      <p className="text-xs text-[#5b6b78]">
        São pedidos, não garantias. O restaurante faz o possível.
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {PEDIDOS.map((p) => (
          <Chip
            key={p}
            on={pedidos.includes(p)}
            onClick={() =>
              setPedidos((x) => (x.includes(p) ? x.filter((y) => y !== p) : [...x, p]))
            }
          >
            {p}
          </Chip>
        ))}
      </div>
      {g && (
        <div className="mt-5 rounded-xl border border-[#021E34]/10 bg-white p-4 text-sm">
          <p className="font-semibold">Garantia da reserva</p>
          <ul className="mt-2 list-disc space-y-1 pl-4 text-[#5b6b78]">
            {guaranteePolicyLines(g, pessoas).map((l) => (
              <li key={l}>{l}</li>
            ))}
          </ul>
          <label className="mt-3 flex items-start gap-2">
            <input
              type="checkbox"
              checked={aceito}
              onChange={(e) => setAceito(e.target.checked)}
              className="mt-0.5"
            />
            <span>Li e aceito a política. Na demonstração nada é cobrado.</span>
          </label>
        </div>
      )}
      <button
        type="button"
        disabled={!!g && !aceito}
        onClick={() =>
          confirmar({
            codigo: codigo(),
            r,
            inicio,
            pessoas,
            status: "confirmada",
            pedidos,
            garantia: total,
          })
        }
        className="mt-5 w-full rounded-full bg-[#021E34] py-3 text-sm font-semibold text-white disabled:opacity-40"
      >
        {g ? `Confirmar com garantia de ${brl(total)}` : "Confirmar reserva"}
      </button>
    </main>
  );
}

function Confirmada({ res, minhas }: { res: Reserva; minhas: () => void }) {
  return (
    <main className="mx-auto max-w-xl px-4 py-10 text-center">
      <BadgeCheck className="mx-auto h-12 w-12" style={{ color: TURQ }} />
      <h1 className="mt-3 font-display text-3xl font-semibold tracking-[-0.03em]">
        Reserva confirmada
      </h1>
      <p className="mt-1 text-sm text-[#5b6b78]">Código {res.codigo}</p>
      <div className="mt-5 rounded-[1.4rem] border border-[#021E34]/10 bg-white p-4 text-left text-sm">
        <p className="font-semibold">{res.r.nome}</p>
        <p>
          {new Date(res.inicio).toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            timeZone: S.timeZone,
          })}{" "}
          às {localTime(res.inicio, S)} · {res.pessoas} pessoas
        </p>
        <p className="text-[#5b6b78]">{res.r.bairro}, Fortaleza (endereço fictício)</p>
        {res.pedidos.length > 0 && <p className="mt-2">Pedidos: {res.pedidos.join(", ")}</p>}
        <p className="mt-2 text-[#5b6b78]">
          Cancele pelo app até {S.cancelCutoffMin / 60} horas antes. Na mesa, a conta é pelo Tipe
          Pay.
        </p>
      </div>
      <button
        type="button"
        onClick={minhas}
        className="mt-5 rounded-full bg-[#021E34] px-5 py-3 text-sm font-semibold text-white"
      >
        Ver minhas reservas
      </button>
    </main>
  );
}

// ---------------------------------------------------------------- minhas reservas e favoritos

function Minhas({
  reservas,
  agora,
  favs,
  ctx,
  cancelar,
  sairEspera,
  entrarEspera,
}: {
  reservas: Reserva[];
  agora: Date;
  favs: string[];
  ctx: Ctx;
  cancelar: (c: string) => void;
  sairEspera: (c: string) => void;
  entrarEspera: (r: R) => void;
}) {
  const [aba, setAba] = useState<"proximas" | "anteriores" | "canceladas" | "espera" | "favoritos">(
    "proximas",
  );
  const abas = {
    proximas: reservas.filter((r) => r.status === "confirmada" && r.inicio > agora),
    anteriores: reservas.filter(
      (r) => r.status === "concluida" || (r.status === "confirmada" && r.inicio <= agora),
    ),
    canceladas: reservas.filter((r) => r.status === "cancelada"),
    espera: reservas.filter((r) => r.status === "espera"),
  };
  const nomes = {
    proximas: "Próximas",
    anteriores: "Anteriores",
    canceladas: "Canceladas",
    espera: "Lista de espera",
    favoritos: "Favoritos",
  };
  const itens = aba === "favoritos" ? [] : abas[aba];
  return (
    <main className="mx-auto max-w-3xl px-4 py-6">
      <h1 className="font-display text-3xl font-semibold tracking-[-0.03em]">Minhas reservas</h1>
      <div className="-mx-4 mt-4 flex gap-1.5 overflow-x-auto px-4" role="tablist">
        {(Object.keys(nomes) as (keyof typeof nomes)[]).map((k) => (
          <Chip key={k} on={aba === k} onClick={() => setAba(k)}>
            {nomes[k]}
            {k !== "favoritos" && abas[k].length > 0 && ` ${abas[k].length}`}
          </Chip>
        ))}
      </div>
      <div className="mt-4 space-y-3">
        {aba === "favoritos" ? (
          favs.length ? (
            VITRINE.filter((r) => favs.includes(r.id)).map((r) => (
              <Cartao key={r.id} r={r} ctx={ctx} />
            ))
          ) : (
            <Vazio texto="Toque no coração de um restaurante para guardar aqui." />
          )
        ) : itens.length === 0 ? (
          <Vazio
            texto={
              aba === "espera"
                ? "Você não está em nenhuma lista de espera."
                : "Nada por aqui ainda."
            }
          />
        ) : (
          itens.map((res) => {
            const pode = guestCanChange({
              status: res.status === "confirmada" ? "confirmada" : "concluida",
              start: res.inicio,
              now: agora,
              settings: S,
            });
            return (
              <div
                key={res.codigo}
                className="flex gap-3 rounded-[1.25rem] border border-[#021E34]/10 bg-white p-3"
              >
                <img
                  src={FOTO_RESTAURANTE[res.r.id]}
                  alt=""
                  className="h-20 w-20 rounded-xl object-cover"
                />
                <div className="min-w-0 flex-1 text-sm">
                  <p className="font-semibold">{res.r.nome}</p>
                  <p>
                    {new Date(res.inicio).toLocaleDateString("pt-BR", {
                      day: "2-digit",
                      month: "short",
                      timeZone: S.timeZone,
                    })}{" "}
                    · {localTime(res.inicio, S)} · {res.pessoas} pessoas
                  </p>
                  <p className="text-xs text-[#5b6b78]">
                    {res.status === "espera"
                      ? "Posição estimada, avisamos se abrir mesa"
                      : `Código ${res.codigo}`}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {aba === "proximas" &&
                      (pode.ok ? (
                        <button
                          type="button"
                          onClick={() => cancelar(res.codigo)}
                          className="rounded-full border border-[#021E34]/20 px-3 py-1 text-xs"
                        >
                          Cancelar
                        </button>
                      ) : (
                        <span className="text-xs text-[#5b6b78]">{pode.reason}</span>
                      ))}
                    {aba === "espera" && (
                      <button
                        type="button"
                        onClick={() => sairEspera(res.codigo)}
                        className="rounded-full border border-[#021E34]/20 px-3 py-1 text-xs"
                      >
                        Sair da lista
                      </button>
                    )}
                    {aba === "anteriores" && (
                      <button
                        type="button"
                        onClick={() => ctx.abrir(res.r)}
                        className="rounded-full bg-[#021E34] px-3 py-1 text-xs text-white"
                      >
                        Reservar de novo
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
        {aba === "espera" && (
          <button
            type="button"
            onClick={() => entrarEspera(VITRINE[0]!)}
            className="w-full rounded-full border border-dashed border-[#021E34]/30 py-2.5 text-sm"
          >
            Entrar na lista de espera do Maré Alta (exemplo)
          </button>
        )}
      </div>
    </main>
  );
}

function Vazio({ texto }: { texto: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-[#021E34]/20 bg-white p-8 text-center text-sm text-[#5b6b78]">
      {texto}
    </div>
  );
}
