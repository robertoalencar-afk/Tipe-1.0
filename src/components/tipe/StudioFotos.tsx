/**
 * Studio de fotos (Gestão > Configurações): a escola e a linha de produção das imagens do
 * cardápio.
 * - Painel: quantos pratos têm foto boa, volume (foto 3D) e modelo 3D do Scanner.
 * - Aulas: três trilhas em passos (foto do prato, foto com volume, vídeo 3D) com diagramas.
 * - Ensaio: o dono testa uma foto ou um vídeo e recebe nota, sem salvar nada.
 * - Fila: pratos sem foto, com foto fraca, sem volume ou sem modelo 3D, com o atalho certo.
 * O envio do vídeo 3D acontece no Scanner 3D do Cardápio; aqui só se ensina e testa.
 */
import { useEffect, useMemo, useRef, useState } from "react";
import { Box, Camera, Check, Images, Layers, ScanLine, type LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { MIN_PHOTO_SIDE } from "@/lib/tipe/menu-review";
import { Trilhas, type TrilhaId } from "./studio/Trilhas";
import { Ensaio } from "./studio/Ensaio";

type Item = {
  id: string;
  name: string;
  price: number;
  category_id: string | null;
  available: boolean;
  model_url?: string | null;
};
type Midia = Record<string, { foto: string | null; profundidade: string | null }>;
type Status = "sem-foto" | "baixa" | "sem-volume" | "ok";
type Filtro = Exclude<Status, "ok"> | "sem-modelo" | "todos";

const STATUS: Record<Exclude<Filtro, "todos">, { label: string; tone: string }> = {
  "sem-foto": { label: "Sem foto", tone: "bg-red-50 text-red-800 ring-red-200" },
  baixa: { label: "Baixa resolução", tone: "bg-amber-50 text-amber-900 ring-amber-200" },
  "sem-volume": { label: "Sem volume", tone: "bg-sky-50 text-sky-900 ring-sky-200" },
  "sem-modelo": { label: "Sem modelo 3D", tone: "bg-violet-50 text-violet-900 ring-violet-200" },
};
const brl = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function Etapa({
  icone: Icon,
  titulo,
  feito,
  total,
  ativo,
  onClick,
  dica,
}: {
  icone: LucideIcon;
  titulo: string;
  feito: number;
  total: number;
  ativo: boolean;
  onClick: () => void;
  dica: string;
}) {
  const pct = total ? Math.round((feito / total) * 100) : 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={ativo}
      className={cn(
        "group rounded-2xl p-4 text-left ring-1 transition",
        ativo ? "bg-white/15 ring-teal-300" : "bg-white/[0.04] ring-white/10 hover:bg-white/10",
      )}
    >
      <span className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2 text-sm font-medium text-white/85">
          <Icon className="size-4 text-teal-300" aria-hidden /> {titulo}
        </span>
        <span className="text-xs tabular-nums text-white/60">{pct}%</span>
      </span>
      <span className="mt-2 block font-display text-3xl font-semibold tabular-nums">
        {feito}
        <span className="text-base font-normal text-white/50"> / {total}</span>
      </span>
      <span className="mt-3 block h-1 overflow-hidden rounded-full bg-white/10">
        <span
          className="block h-full rounded-full bg-teal-400 transition-[width] duration-700"
          style={{ width: `${pct}%` }}
        />
      </span>
      <span className="mt-2 block text-xs text-white/55">{dica}</span>
    </button>
  );
}

export function StudioFotos({
  ir,
  items,
  categories,
  midia,
  onFotografar,
  onAbrirScanner,
  restaurante = "Seu restaurante",
}: {
  ir: (k: string) => void;
  items: Item[];
  categories: { id: string; name: string }[];
  midia: Midia;
  onFotografar: (itemId: string) => void;
  onAbrirScanner?: () => void;
  restaurante?: string;
}) {
  const [sizes, setSizes] = useState<Record<string, number>>({});
  const [filtro, setFiltro] = useState<Filtro>("todos");
  const [trilha, setTrilha] = useState<TrilhaId>("foto");
  const [ensaio, setEnsaio] = useState<"foto" | "video">("foto");
  const ensaioRef = useRef<HTMLElement>(null);
  const filaRef = useRef<HTMLElement>(null);
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
            ? "sem-volume"
            : "ok";
    }
    return s;
  }, [ativos, midia, sizes]);
  const comFoto = ativos.filter(
    (i) => status[i.id] !== "sem-foto" && status[i.id] !== "baixa",
  ).length;
  const comVolume = ativos.filter((i) => status[i.id] === "ok").length;
  const comModelo = ativos.filter((i) => i.model_url).length;
  const order: Status[] = ["sem-foto", "baixa", "sem-volume"];
  const fila =
    filtro === "sem-modelo"
      ? ativos.filter((i) => !i.model_url)
      : ativos
          .filter((i) => status[i.id] !== "ok" && (filtro === "todos" || status[i.id] === filtro))
          .sort((a, b) => order.indexOf(status[a.id]!) - order.indexOf(status[b.id]!));
  const catName = new Map(categories.map((c) => [c.id, c.name]));
  const abrirScanner = onAbrirScanner ?? (() => ir("cardapio"));
  const filtrar = (f: Filtro) => {
    setFiltro((atual) => (atual === f ? "todos" : f));
    requestAnimationFrame(() =>
      filaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
    );
  };
  const proximo =
    ativos.length === 0
      ? "Cadastre pratos no Cardápio para começar."
      : comFoto < ativos.length
        ? `Comece pela foto: ${ativos.length - comFoto} prato(s) ainda sem foto boa.`
        : comVolume < ativos.length
          ? "Fotos prontas. Abra cada prato para gerar o volume."
          : comModelo < ativos.length
            ? "Fotos e volume prontos. Próximo nível: vídeo 3D dos campeões de venda."
            : "Cardápio completo: foto, volume e 3D em todos os pratos.";

  return (
    <div className="space-y-10">
      <header className="relative overflow-hidden rounded-3xl bg-[#071d2b] p-6 text-white sm:p-8">
        <div
          className="pointer-events-none absolute -right-24 -top-24 size-80 rounded-full bg-teal-400/10 blur-3xl"
          aria-hidden
        />
        <div className="relative flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">
              Studio de fotos
            </p>
            <h2 className="mt-2 font-display text-2xl font-semibold leading-tight sm:text-3xl">
              Do celular ao cardápio em 3D, passo a passo.
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-white/70">{proximo}</p>
          </div>
          <Button
            variant="outline"
            className="h-11 rounded-full border-white/25 bg-transparent text-white hover:bg-white/10 hover:text-white"
            onClick={() => ir("banco")}
          >
            <Images className="size-4" /> Banco de imagens
          </Button>
        </div>
        <div className="relative mt-7 grid gap-3 sm:grid-cols-3">
          <Etapa
            icone={Camera}
            titulo="Foto"
            feito={comFoto}
            total={ativos.length}
            ativo={filtro === "sem-foto"}
            onClick={() => filtrar("sem-foto")}
            dica={`Lado menor com ${MIN_PHOTO_SIDE} px ou mais`}
          />
          <Etapa
            icone={Layers}
            titulo="Volume"
            feito={comVolume}
            total={ativos.length}
            ativo={filtro === "sem-volume"}
            onClick={() => filtrar("sem-volume")}
            dica="Foto que se mexe no story"
          />
          <Etapa
            icone={Box}
            titulo="Modelo 3D"
            feito={comModelo}
            total={ativos.length}
            ativo={filtro === "sem-modelo"}
            onClick={() => filtrar("sem-modelo")}
            dica="Gira e aparece na mesa do cliente"
          />
        </div>
      </header>

      <section aria-labelledby="studio-aulas" className="space-y-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700">Aprenda</p>
          <h3 id="studio-aulas" className="mt-1 font-display text-xl font-semibold">
            Três trilhas, do básico ao 3D
          </h3>
        </div>
        <Trilhas
          trilha={trilha}
          onTrilha={setTrilha}
          feitos={{
            foto: `${comFoto} de ${ativos.length} pratos`,
            volume: `${comVolume} de ${ativos.length} pratos`,
            video: `${comModelo} de ${ativos.length} pratos`,
          }}
          onEnsaiar={(t) => {
            setEnsaio(t === "video" ? "video" : "foto");
            requestAnimationFrame(() =>
              ensaioRef.current?.scrollIntoView({ behavior: "smooth", block: "start" }),
            );
          }}
        />
      </section>

      <section ref={ensaioRef} aria-labelledby="studio-ensaio" className="scroll-mt-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700">Teste</p>
            <h3 id="studio-ensaio" className="mt-1 font-display text-xl font-semibold">
              Ensaio antes de publicar
            </h3>
          </div>
          <p className="max-w-sm text-sm text-muted-foreground">
            Roda no seu aparelho. Nada é salvo nem aparece para o cliente.
          </p>
        </div>
        <Ensaio
          modo={ensaio}
          onModo={setEnsaio}
          restaurante={restaurante}
          onAbrirScanner={abrirScanner}
        />
      </section>

      <section ref={filaRef} aria-labelledby="studio-fila" className="scroll-mt-4 space-y-4">
        <div className="flex flex-wrap items-end justify-between gap-2">
          <div>
            <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-700">
              Produção
            </p>
            <h3 id="studio-fila" className="mt-1 font-display text-xl font-semibold">
              Fila de pratos
            </h3>
          </div>
          <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filtrar fila">
            {(["todos", "sem-foto", "baixa", "sem-volume", "sem-modelo"] as const).map((f) => (
              <button
                key={f}
                type="button"
                aria-pressed={filtro === f}
                onClick={() => setFiltro(f)}
                className={cn(
                  "min-h-9 rounded-full px-3 text-xs font-medium ring-1 transition",
                  filtro === f
                    ? "bg-[#071d2b] text-white ring-[#071d2b]"
                    : "ring-border hover:bg-muted",
                )}
              >
                {f === "todos" ? "Pendentes" : STATUS[f].label}
              </button>
            ))}
          </div>
        </div>
        {fila.length ? (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {fila.map((item) => {
              const st: Exclude<Filtro, "todos"> =
                filtro === "sem-modelo" ? "sem-modelo" : (status[item.id] as Exclude<Status, "ok">);
              const foto = midia[item.id]?.foto;
              const modelo = st === "sem-modelo";
              return (
                <li
                  key={item.id}
                  className="flex min-w-0 items-center gap-3 rounded-2xl border border-border bg-card p-3"
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
                  <Button
                    size="sm"
                    className="min-h-10 shrink-0 rounded-full"
                    variant={modelo ? "outline" : "default"}
                    onClick={() => (modelo ? abrirScanner() : onFotografar(item.id))}
                  >
                    {modelo ? <ScanLine className="size-3.5" /> : <Camera className="size-3.5" />}
                    {modelo
                      ? "Escanear"
                      : st === "sem-foto"
                        ? "Fotografar"
                        : st === "sem-volume"
                          ? "Abrir"
                          : "Trocar"}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="flex items-center gap-3 rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground">
            <Check className="size-5 text-teal-600" aria-hidden />
            {ativos.length
              ? filtro === "sem-modelo"
                ? "Todos os pratos disponíveis têm modelo 3D."
                : "Todos os pratos disponíveis têm foto em boa resolução e volume."
              : "Cadastre pratos no Cardápio para começar."}
          </div>
        )}
      </section>
    </div>
  );
}
