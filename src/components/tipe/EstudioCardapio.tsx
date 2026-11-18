import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronRight } from "lucide-react";
import lebreAvatar from "@/assets/lebre/avatar-feliz.webp";
import { menuScore, reviewMenu, type ReviewItem } from "@/lib/tipe/menu-review";
import { readMenuConfig } from "@/lib/tipe/menu-intelligence";
import { getMenuPromos } from "@/lib/tipe/menu-promos.functions";
import { getMenuPosts } from "@/lib/tipe/menu-posts.functions";
import { WEAK_DAYS, daysWithoutPromo } from "@/lib/tipe/menu-promos";

export type AbaCardapio = "pratos" | "lebre" | "promocoes" | "banners" | "3d" | "importar";
export const ABAS_CARDAPIO: { id: AbaCardapio; label: string }[] = [
  { id: "pratos", label: "Pratos" },
  { id: "lebre", label: "Lebre" },
  { id: "promocoes", label: "Promoções" },
  { id: "banners", label: "Banners" },
  { id: "3d", label: "3D" },
  { id: "importar", label: "Importar" },
];

type Item = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  sector: string;
  description: string | null;
  available: boolean;
  menu_config: unknown;
  model_url?: string | null;
};
type Step = { text: string; aba: AbaCardapio };

/** Próximos passos da Lebre, do mais importante para o menos. Máximo de quatro. */
export function proximosPassos(input: {
  items: Item[];
  fotos: number;
  semFicha: number;
  indicados: number;
  promos: { enabled: boolean; days: number[] }[] | undefined;
  banners: number | undefined;
}): Step[] {
  const steps: Step[] = [];
  const disponiveis = input.items.filter((i) => i.available).length;
  if (!input.items.length)
    return [
      { text: "Importe seu cardápio: link, PDF ou foto. A Lebre lê para você.", aba: "importar" },
    ];
  const semFoto = disponiveis - input.fotos;
  if (semFoto > 0)
    steps.push({
      text: `${semFoto} ${semFoto === 1 ? "prato está" : "pratos estão"} sem foto`,
      aba: "pratos",
    });
  if (input.semFicha > 0)
    steps.push({
      text: `Complete a ficha (descrição, alergênicos, dietas) de ${input.semFicha} ${input.semFicha === 1 ? "prato" : "pratos"}`,
      aba: "lebre",
    });
  if (!input.indicados)
    steps.push({ text: "Peça à Lebre os pratos que ela indica aos clientes", aba: "lebre" });
  if (input.promos) {
    const fracos = daysWithoutPromo(input.promos).filter((d) => WEAK_DAYS.includes(d));
    if (fracos.length)
      steps.push({
        text: `${fracos.map((d) => (d === 1 ? "Segunda" : "Terça")).join(" e ")} sem promoção: são os dias mais fracos`,
        aba: "promocoes",
      });
  }
  if (input.banners === 0)
    steps.push({ text: "Crie banners para o topo do cardápio", aba: "banners" });
  return steps.slice(0, 4);
}

export function EstudioCardapio({
  slug,
  restaurantName,
  items,
  categories,
  midia,
  onAba,
}: {
  slug: string;
  restaurantName: string;
  items: Item[];
  categories: { id: string; name: string }[];
  midia: Record<string, { foto: string | null; profundidade: string | null }>;
  onAba: (aba: AbaCardapio) => void;
}) {
  const promos = useQuery({
    queryKey: ["menu-promos", slug],
    queryFn: () => getMenuPromos({ data: { slug } }),
  });
  const posts = useQuery({
    queryKey: ["menu-posts", slug],
    queryFn: () => getMenuPosts({ data: { slug } }),
  });
  const stats = useMemo(() => {
    const review: ReviewItem[] = items.map((i) => ({
      id: i.id,
      name: i.name,
      price: i.price,
      categoryId: i.category_id,
      sector: i.sector,
      description: i.description,
      available: i.available,
      photo: midia[i.id]?.foto ?? null,
      depth: midia[i.id]?.profundidade ?? null,
      translated: true,
    }));
    const live = items.filter((i) => i.available);
    const configs = live.map((i) => ({ i, c: readMenuConfig(i.menu_config) }));
    return {
      score: menuScore(review, reviewMenu(review, categories)),
      pratos: live.length,
      fotos: live.filter((i) => midia[i.id]?.foto).length,
      tresD: live.filter((i) => midia[i.id]?.profundidade || i.model_url).length,
      indicados: configs.filter(({ c }) => c.lebrePick).length,
      semFicha: configs.filter(
        ({ i, c }) =>
          i.sector === "kitchen" &&
          (!i.description || (i.description.length < 25 && !c.diets.length)),
      ).length,
    };
  }, [items, categories, midia]);
  const steps = proximosPassos({
    items,
    fotos: stats.fotos,
    semFicha: stats.semFicha,
    indicados: stats.indicados,
    promos: promos.data,
    banners: posts.data?.filter((p) => p.enabled).length,
  });
  const ativas = promos.data?.filter((p) => p.enabled).length;
  const ring = `conic-gradient(#2ED3B7 ${stats.score * 3.6}deg, rgba(255,255,255,0.12) 0)`;
  return (
    <section
      aria-label="Estúdio do cardápio"
      className="overflow-hidden rounded-3xl bg-gradient-to-br from-[#021E34] via-[#06304d] to-[#0b4a5e] text-white"
    >
      <div className="grid gap-6 p-5 sm:p-7 lg:grid-cols-[auto_1fr]">
        <div className="flex items-center gap-5">
          <div
            className="grid size-28 shrink-0 place-items-center rounded-full"
            style={{ background: ring }}
            role="img"
            aria-label={`Nota do cardápio: ${stats.score} de 100`}
          >
            <div className="grid size-[5.6rem] place-items-center rounded-full bg-[#021E34] text-center">
              <span className="font-display text-3xl font-semibold leading-none">
                {stats.score}
              </span>
              <span className="-mt-3 text-[10px] uppercase tracking-widest text-white/60">
                nota
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[#2ED3B7]">
              Estúdio do cardápio
            </p>
            <h2 className="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              {restaurantName}
            </h2>
            <dl className="mt-3 grid grid-cols-2 gap-x-5 gap-y-1 text-sm text-white/80 sm:grid-cols-4">
              <div>
                <dt className="sr-only">Pratos</dt>
                <dd>
                  <b className="text-white">{stats.pratos}</b> pratos
                </dd>
              </div>
              <div>
                <dt className="sr-only">Com foto</dt>
                <dd>
                  <b className="text-white">{stats.fotos}</b> com foto
                </dd>
              </div>
              <div>
                <dt className="sr-only">Em 3D</dt>
                <dd>
                  <b className="text-white">{stats.tresD}</b> em 3D
                </dd>
              </div>
              <div>
                <dt className="sr-only">Promoções ativas</dt>
                <dd>
                  <b className="text-white">{ativas ?? "–"}</b> promoções
                </dd>
              </div>
            </dl>
          </div>
        </div>
        <div className="rounded-2xl bg-white/[0.07] p-4 ring-1 ring-white/10">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <img src={lebreAvatar} alt="" className="size-7 rounded-full bg-[#2ED3B7]/25" />
            {steps.length
              ? "Próximos passos da Lebre"
              : "A Lebre não vê pendências. Cardápio no ponto."}
          </p>
          {steps.length > 0 && (
            <ul className="mt-2 divide-y divide-white/10">
              {steps.map((s) => (
                <li key={s.text}>
                  <button
                    type="button"
                    onClick={() => onAba(s.aba)}
                    className="flex min-h-11 w-full items-center justify-between gap-3 py-2 text-left text-sm text-white/90 hover:text-white"
                  >
                    {s.text}
                    <ChevronRight className="size-4 shrink-0 text-[#2ED3B7]" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
          {stats.indicados > 0 && (
            <p className="mt-2 text-xs text-white/60">
              {stats.indicados} {stats.indicados === 1 ? "prato leva" : "pratos levam"} o selo "A
              Lebre indica" no cardápio do cliente.
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
