import { createFileRoute } from "@tanstack/react-router";
import {
  Proposta1Ecossistema,
  Proposta2Jornada,
  Proposta3TempoReal,
} from "@/components/tipe/site/interno/PropostasEcossistema";

export const Route = createFileRoute("/interno/propostas-ecossistema")({
  head: () => ({
    meta: [
      { title: "Ecossistema · três propostas · interno | Tipe" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pagina,
});

const PROPOSTAS = [
  {
    id: "p1",
    nome: "Proposta 1 · Tipe Ecosystem",
    texto:
      "O símbolo no centro, os oito módulos em volta. Tocar num módulo mostra o que ele faz, com a tela e o status real. As integrações externas ficam numa faixa separada.",
    C: Proposta1Ecossistema,
  },
  {
    id: "p2",
    nome: "Proposta 2 · A jornada da mesa",
    texto:
      "Sete etapas, do QR à gestão. Cada uma mostra o produto responsável e o que se atualiza sozinho. Avança sozinha e pausa com o mouse em cima.",
    C: Proposta2Jornada,
  },
  {
    id: "p3",
    nome: "Proposta 3 · O restaurante em tempo real",
    texto:
      "Quatro telas pequenas (mesa, cozinha, garçonete e gestor) reagem ao mesmo evento. Poucas palavras, cara de produto.",
    C: Proposta3TempoReal,
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
          Ecossistema e integrações: três propostas
        </h1>
        <p className="mt-3 max-w-2xl text-[#021E34]/70">
          O hub atual continua na home até você escolher. Produtos Tipe e integrações externas ficam
          separados, e cada item mostra o status real: disponível, em demonstração ou planejado.
          "Tipe Connect" é um nome provisório para a API e os conectores de PDV.
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
