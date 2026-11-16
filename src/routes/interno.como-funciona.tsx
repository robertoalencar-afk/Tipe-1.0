import { createFileRoute } from "@tanstack/react-router";
import {
  Proposta1PalcoFixo,
  Proposta2FioContinuo,
  Proposta3DuasPerspectivas,
} from "@/components/tipe/site/interno/PropostasComoFunciona";

export const Route = createFileRoute("/interno/como-funciona")({
  head: () => ({
    meta: [
      { title: "Como funciona · três propostas · interno | Tipe" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pagina,
});

const PROPOSTAS = [
  {
    id: "p1",
    nome: "Proposta 1 · Palco fixo",
    texto:
      "Rolagem editorial: as quatro palavras passam à esquerda e o celular fica parado, trocando de tela. No celular, cada etapa traz o seu aparelho.",
    C: Proposta1PalcoFixo,
  },
  {
    id: "p2",
    nome: "Proposta 2 · Fio contínuo",
    texto:
      "Um bloco só, escuro, que avança sozinho como stories. Pausa com o mouse em cima, responde a toque e para com movimento reduzido.",
    C: Proposta2FioContinuo,
  },
  {
    id: "p3",
    nome: "Proposta 3 · Duas perspectivas",
    texto:
      "A frase vira a navegação. O cliente à esquerda, o restaurante à direita: cada toque no celular acende um evento do salão.",
    C: Proposta3DuasPerspectivas,
  },
];

function Pagina() {
  return (
    <main className="min-h-dvh bg-[#e9e8e3]">
      <header className="mx-auto max-w-6xl px-4 pb-6 pt-10 sm:px-8">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#021E34]/50">
          Interno · V62
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,1.4rem+2.4vw,3.2rem)] leading-[1.02] tracking-[-0.03em] text-[#021E34]">
          "Como funciona": três propostas
        </h1>
        <p className="mt-3 max-w-2xl text-[#021E34]/70">
          Mesma história nas três, em quatro momentos, com telas reais do app. O seletor troca entre
          um restaurante só com Tipe Pay e um com Pay + Order. As telas do Order aparecem marcadas
          como em demonstração. A seção atual da home não foi trocada.
        </p>
        <nav className="mt-5 flex flex-wrap gap-2 text-sm">
          {PROPOSTAS.map((p) => (
            <a
              key={p.id}
              href={`#${p.id}`}
              className="rounded-full bg-white px-4 py-2 text-[#021E34] ring-1 ring-black/5"
            >
              {p.nome}
            </a>
          ))}
        </nav>
      </header>
      {PROPOSTAS.map(({ id, nome, texto, C }) => (
        <div key={id} id={id} className="scroll-mt-4 pt-10">
          <div className="mx-auto mb-4 max-w-6xl px-4 sm:px-8">
            <h2 className="text-lg font-semibold text-[#021E34]">{nome}</h2>
            <p className="max-w-2xl text-sm text-[#021E34]/65">{texto}</p>
          </div>
          <C />
        </div>
      ))}
    </main>
  );
}
