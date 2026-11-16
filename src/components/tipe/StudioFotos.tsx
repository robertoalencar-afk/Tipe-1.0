/**
 * Studio de fotos (Gestão > Cardápio): ensina o restaurante a fotografar os pratos
 * e leva cada foto ao cardápio com luz ajustada pela Lebre e volume (foto 3D)
 * calculado no navegador, sem custo por prato. O ensaio abaixo roda só no
 * navegador e não salva nada; a publicação acontece no Cardápio.
 */
import { Camera, Images, Sparkles, Box, UtensilsCrossed, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CriarPratoDemo, DICAS } from "./site/order/CriarPratoDemo";

const ETAPAS = [
  {
    i: Camera,
    t: "Fotografe",
    d: "Uma foto por prato, com o celular, seguindo as seis dicas abaixo.",
  },
  {
    i: Sparkles,
    t: "A Lebre ajusta a luz",
    d: "Brilho, contraste e cor corrigidos sem mudar o prato. Você compara antes e depois.",
  },
  {
    i: Box,
    t: "Ganha volume",
    d: "O efeito de foto 3D é calculado no seu navegador, sem custo por prato.",
  },
  {
    i: UtensilsCrossed,
    t: "Vai para o cardápio",
    d: "A foto vira o story do prato no celular do cliente, com nome, preço e descrição.",
  },
];

export function StudioFotos({
  ir,
  total,
  comFoto,
}: {
  ir: (k: string) => void;
  total: number;
  comFoto: number;
}) {
  const faltam = Math.max(total - comFoto, 0);
  const pct = total ? Math.round((comFoto / total) * 100) : 0;
  return (
    <div className="space-y-8">
      <header className="overflow-hidden rounded-3xl bg-[#071d2b] p-6 text-white sm:p-8">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-teal-300">
          Studio de fotos
        </p>
        <h2 className="mt-2 max-w-xl font-display text-2xl font-semibold leading-tight sm:text-3xl">
          Fotos que dão vontade de pedir, feitas com o seu celular.
        </h2>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-white/75">
          Siga o passo a passo, treine no ensaio e publique pelo Cardápio. A Lebre cuida da luz e do
          volume.
        </p>
        <div className="mt-6 max-w-md">
          <div className="flex items-baseline justify-between text-sm">
            <span>
              {total ? `${comFoto} de ${total} pratos com foto` : "Nenhum prato cadastrado ainda"}
            </span>
            <span className="font-semibold">{pct}%</span>
          </div>
          <div
            className="mt-2 h-2 rounded-full bg-white/15"
            role="progressbar"
            aria-valuenow={pct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Pratos com foto"
          >
            <div className="h-2 rounded-full bg-teal-400" style={{ width: `${pct}%` }} />
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button
              className="bg-teal-400 text-[#071d2b] hover:bg-teal-300"
              onClick={() => ir("cardapio")}
            >
              <UtensilsCrossed className="size-4" />{" "}
              {faltam ? `Fotografar ${faltam} prato(s) sem foto` : "Abrir o cardápio"}
            </Button>
            <Button
              variant="outline"
              className="border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white"
              onClick={() => ir("banco")}
            >
              <Images className="size-4" /> Banco de imagens
            </Button>
          </div>
        </div>
      </header>

      <section aria-labelledby="studio-etapas">
        <h3 id="studio-etapas" className="font-display text-lg font-semibold">
          Como funciona
        </h3>
        <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          {ETAPAS.map((e, n) => (
            <li key={e.t} className="rounded-2xl border border-border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="grid size-8 place-items-center rounded-full bg-teal-50 text-teal-700">
                  <e.i className="size-4" aria-hidden />
                </span>
                <span className="text-xs font-medium text-muted-foreground">Passo {n + 1}</span>
              </div>
              <p className="mt-3 font-medium">{e.t}</p>
              <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{e.d}</p>
            </li>
          ))}
        </ol>
      </section>

      <section aria-labelledby="studio-dicas">
        <h3 id="studio-dicas" className="font-display text-lg font-semibold">
          Seis dicas para a foto perfeita
        </h3>
        <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {DICAS.map((d) => (
            <li key={d.titulo} className="flex gap-3 rounded-2xl border border-border p-4">
              <Check className="mt-0.5 size-4 shrink-0 text-teal-600" aria-hidden />
              <div>
                <p className="font-medium">{d.titulo}</p>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{d.texto}</p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="studio-ensaio" className="space-y-3">
        <div>
          <h3 id="studio-ensaio" className="font-display text-lg font-semibold">
            Ensaio
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Treine aqui: tire uma foto e veja como ela fica no celular do cliente. Nada é salvo nem
            publicado. Quando gostar do resultado, cadastre o prato no Cardápio.
          </p>
        </div>
        <div className="rounded-3xl border border-border p-2 sm:p-4">
          <CriarPratoDemo />
        </div>
      </section>
    </div>
  );
}
