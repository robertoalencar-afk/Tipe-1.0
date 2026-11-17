/**
 * Studio de fotos (Gestão > Configurações): painel de produção das fotos do
 * cardápio. Mostra a fila de pratos sem foto ou com foto fraca (resolução
 * medida no navegador), leva direto ao editor do prato e ensina a fotografar.
 * O ensaio roda só no navegador e não salva nada.
 */
import { useEffect, useMemo, useState } from "react";
import {
  Box,
  Camera,
  Check,
  ImageOff,
  Images,
  Sparkles,
  TriangleAlert,
  UtensilsCrossed,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { CriarPratoDemo, DICAS } from "./site/order/CriarPratoDemo";
import { MIN_PHOTO_SIDE } from "@/lib/tipe/menu-review";

type Item = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  available: boolean;
};
type Midia = Record<string, { foto: string | null; profundidade: string | null }>;
type Status = "sem-foto" | "baixa" | "sem-3d" | "ok";

const ETAPAS = [
  { i: Camera, t: "Fotografe", d: "Uma foto por prato, na vertical, com luz de janela." },
  { i: Sparkles, t: "A Lebre ajusta a luz", d: "Brilho, contraste e cor, sem mudar o prato." },
  { i: Box, t: "Volume 3D automático", d: "Calculado no seu navegador, sem custo por prato." },
  { i: UtensilsCrossed, t: "Story no cardápio", d: "O prato aparece em tela cheia no celular." },
];
const STATUS: Record<Exclude<Status, "ok">, { label: string; tone: string }> = {
  "sem-foto": { label: "Sem foto", tone: "bg-red-50 text-red-800 ring-red-200" },
  baixa: { label: "Baixa resolução", tone: "bg-amber-50 text-amber-900 ring-amber-200" },
  "sem-3d": { label: "Sem volume 3D", tone: "bg-sky-50 text-sky-900 ring-sky-200" },
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export function StudioFotos({
  ir,
  items,
  categories,
  midia,
  onFotografar,
}: {
  ir: (k: string) => void;
  items: Item[];
  categories: { id: string; name: string }[];
  midia: Midia;
  onFotografar: (itemId: string) => void;
}) {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [filtro, setFiltro] = useState<Status | "todos">("todos");
  useEffect(() => {
    let alive = true;
    for (const i of items) {
      const src = midia[i.id]?.foto;
      if (!src || sizes[i.id] !== undefined) continue;
      const img = new Image();
      img.onload = () => {
        if (alive)
          setSizes((s) => ({ ...s, [i.id]: Math.min(img.naturalWidth, img.naturalHeight) }));
      };
      img.src = src;
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, midia]);

  const ativos = items.filter((i) => i.available);
  const status = useMemo(() => {
    const s: Record<string, Status> = {};
    for (const i of ativos) {
      const m = midia[i.id];
      s[i.id] = !m?.foto
        ? "sem-foto"
        : sizes[i.id] !== undefined && sizes[i.id]! < MIN_PHOTO_SIDE
          ? "baixa"
          : !m.profundidade
            ? "sem-3d"
            : "ok";
    }
    return s;
  }, [ativos, midia, sizes]);
  const count = (k: Status) => ativos.filter((i) => status[i.id] === k).length;
  const ok = count("ok");
  const pct = ativos.length ? Math.round((ok / ativos.length) * 100) : 0;
  const order: Status[] = ["sem-foto", "baixa", "sem-3d"];
  const fila = ativos
    .filter((i) => status[i.id] !== "ok" && (filtro === "todos" || status[i.id] === filtro))
    .sort((a, b) => order.indexOf(status[a.id]!) - order.indexOf(status[b.id]!));
  const catName = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <div className="space-y-8">
      <header className="rounded-3xl bg-[#071d2b] p-6 text-white sm:p-8">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">
              Studio de fotos
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              Cada prato com uma foto que dá vontade de pedir.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              Acompanhe o que falta, fotografe direto do celular e publique. A Lebre cuida da luz e
              do volume.
            </p>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => ir("banco")}
            >
              <Images className="size-4" /> Banco de imagens
            </Button>
          </div>
        </div>
        <div className="mt-6">
          <div className="flex items-baseline justify-between text-sm">
            <span className="text-white/80">
              {ativos.length
                ? `${ok} de ${ativos.length} pratos prontos para os stories`
                : "Nenhum prato disponível no cardápio"}
            </span>
            <span className="font-semibold tabular-nums">{pct}%</span>
          </div>
          <div
            className="mt-2 h-1.5 rounded-full bg-white/15"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Pratos prontos"
          >
            <div
              className="h-1.5 rounded-full bg-teal-400 transition-[width]"
              style={{ width: `${pct}%` }}
            />
          </div>
        </div>
        <dl className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {(
            [
              ["ok", "Prontos", Check],
              ["sem-foto", "Sem foto", ImageOff],
              ["baixa", "Baixa resolução", TriangleAlert],
              ["sem-3d", "Sem volume 3D", Box],
            ] as const
          ).map(([k, label, Icon]) => (
            <button
              key={k}
              type="button"
              onClick={() => setFiltro(k === "ok" || filtro === k ? "todos" : k)}
              aria-pressed={filtro === k}
              className={`rounded-2xl p-3 text-left ring-1 transition ${filtro === k ? "bg-white/15 ring-teal-300" : "bg-white/5 ring-white/10 hover:bg-white/10"}`}
            >
              <dt className="flex items-center gap-1.5 text-xs text-white/70">
                <Icon className="size-3.5" aria-hidden /> {label}
              </dt>
              <dd className="mt-1 text-2xl font-semibold tabular-nums">{count(k)}</dd>
            </button>
          ))}
        </dl>
      </header>

      <section aria-labelledby="studio-fila" className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h3 id="studio-fila" className="font-display text-lg font-semibold">
            Fila de fotos
          </h3>
          <p className="text-sm text-muted-foreground">
            {fila.length
              ? `${fila.length} prato(s) ${filtro === "todos" ? "precisam de atenção" : `com "${STATUS[filtro as Exclude<Status, "ok">]?.label.toLowerCase()}"`}`
              : "Tudo pronto por aqui."}
          </p>
        </div>
        {fila.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fila.map((item) => {
              const st = status[item.id] as Exclude<Status, "ok">;
              const foto = midia[item.id]?.foto;
              return (
                <li
                  key={item.id}
                  className="flex items-center gap-3 rounded-2xl border border-border bg-card p-3"
                >
                  <div className="grid h-20 w-16 shrink-0 place-items-center overflow-hidden rounded-xl bg-muted">
                    {foto ? (
                      <img src={foto} alt="" className="size-full object-cover" loading="lazy" />
                    ) : (
                      <Camera className="size-5 text-muted-foreground" aria-hidden />
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{item.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {catName.get(item.category_id ?? "") ?? "Sem categoria"} · {brl(item.price)}
                    </p>
                    <span
                      className={`mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[11px] font-medium ring-1 ${STATUS[st].tone}`}
                    >
                      {STATUS[st].label}
                      {st === "baixa" && sizes[item.id] ? ` · ${sizes[item.id]} px` : ""}
                    </span>
                  </div>
                  <Button size="sm" onClick={() => onFotografar(item.id)}>
                    <Camera className="size-3.5" /> {st === "sem-foto" ? "Fotografar" : "Trocar"}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            <Check className="size-5 text-teal-600" aria-hidden />
            {ativos.length
              ? "Todos os pratos disponíveis têm foto em boa resolução e volume 3D."
              : "Cadastre pratos no Cardápio para começar."}
          </div>
        )}
      </section>

      <section aria-labelledby="studio-etapas" className="grid gap-6 lg:grid-cols-[1fr_1.2fr]">
        <div>
          <h3 id="studio-etapas" className="font-display text-lg font-semibold">
            Como funciona
          </h3>
          <ol className="mt-4 space-y-3">
            {ETAPAS.map((e, n) => (
              <li key={e.t} className="flex gap-3">
                <span className="grid size-8 shrink-0 place-items-center rounded-full bg-teal-50 text-sm font-semibold text-teal-800">
                  {n + 1}
                </span>
                <div>
                  <p className="font-medium">{e.t}</p>
                  <p className="text-sm text-muted-foreground">{e.d}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
        <div>
          <h3 className="font-display text-lg font-semibold">Seis regras da foto perfeita</h3>
          <ul className="mt-4 grid gap-2 sm:grid-cols-2">
            {DICAS.map((d, n) => (
              <li key={d.titulo} className="rounded-2xl border border-border p-3">
                <p className="text-xs font-medium text-teal-700">Regra {n + 1}</p>
                <p className="mt-0.5 font-medium">{d.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d.texto}</p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section aria-labelledby="studio-ensaio" className="space-y-3">
        <div>
          <h3 id="studio-ensaio" className="font-display text-lg font-semibold">
            Ensaio
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Treine aqui e veja como a foto fica no celular do cliente. Nada é salvo nem publicado.
          </p>
        </div>
        <div className="rounded-3xl border border-border p-2 sm:p-4">
          <CriarPratoDemo />
        </div>
      </section>
    </div>
  );
}
