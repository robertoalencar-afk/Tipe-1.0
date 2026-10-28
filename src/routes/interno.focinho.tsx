import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { FocinhoCta, type VarianteFocinho } from "@/components/tipe/site/Bigode";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interno/focinho")({
  head: () => ({
    meta: [
      { title: "Focinho dos botões · interno | Tipe" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: PaginaFocinho,
});

const VARIACOES: { v: VarianteFocinho; nome: string; texto: string }[] = [
  {
    v: 1,
    nome: "1. Focinho limpo",
    texto:
      "Só o nariz turquesa e a boca em Y. É a forma mais compacta e a que melhor lê a 44 px. Sem bigodes, o movimento fica todo no nariz.",
  },
  {
    v: 2,
    nome: "2. Focinho com bigodes curtos",
    texto:
      "Nariz, boca e dois bigodes curtos de cada lado, finos e mais claros que a boca. É o meio-termo entre A e B: a lebre aparece sem o desenho ficar largo.",
  },
  {
    v: 3,
    nome: "3. Focinho com um bigode",
    texto:
      "Um bigode só de cada lado, um pouco mais longo e quase reto. Fica mais gráfico e horizontal, com cara de assinatura.",
  },
];

const FUNDOS = [
  {
    id: "claro",
    nome: "Fundo claro · botão preto",
    fundo: "bg-white ring-1 ring-black/10",
    botao: "bg-[#0b0b0c] text-white",
  },
  {
    id: "escuro",
    nome: "Fundo escuro · botão branco",
    fundo: "bg-[#021E34]",
    botao: "bg-white text-[#021E34]",
  },
  {
    id: "turq",
    nome: "Botão turquesa",
    fundo: "bg-[#f4f3ef]",
    botao: "cta-turquesa bg-[#0FC9BD] text-[#021E34]",
  },
] as const;

function Botao({
  v,
  classe,
  pequeno,
  children,
}: {
  v: VarianteFocinho;
  classe: string;
  pequeno?: boolean;
  children: string;
}) {
  return (
    <a
      href="#"
      onClick={(e) => e.preventDefault()}
      className={cn(
        "com-fios inline-flex items-center gap-2.5 whitespace-nowrap rounded-full font-medium focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0FC9BD]",
        pequeno ? "h-11 pl-6 pr-5 text-[0.95rem]" : "h-13 pl-7 pr-6 text-[1rem]",
        classe,
      )}
    >
      {children}
      <FocinhoCta variante={v} />
    </a>
  );
}

function PaginaFocinho() {
  const [parado, setParado] = useState(false);
  return (
    <main
      className={cn(
        "min-h-dvh bg-[#f6f5f1] px-4 py-10 text-[#021E34] sm:px-8",
        parado && "sem-movimento",
      )}
    >
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#021E34]/50">
          Interno · V62
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,1.4rem+2.4vw,3.2rem)] leading-[1.02] tracking-[-0.03em]">
          Focinho dos botões: três microvariações entre A e B
        </h1>
        <p className="mt-4 max-w-2xl leading-relaxed text-[#021E34]/70">
          Todas usam o mesmo nariz e a mesma boca. Paradas, farejam de leve a cada seis segundos.
          Passe o mouse, toque ou navegue com Tab para ver a resposta. O ícone tem tamanho fixo,
          então o botão não muda de largura. No site está aplicada a variação 2, como prévia.
        </p>
        <label className="mt-5 inline-flex cursor-pointer items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={parado}
            onChange={(e) => setParado(e.target.checked)}
            className="h-4 w-4 accent-[#0FC9BD]"
          />
          Simular movimento reduzido
        </label>

        <div className="mt-10 grid gap-6 lg:grid-cols-3">
          {VARIACOES.map(({ v, nome, texto }) => (
            <section
              key={v}
              data-variacao={v}
              className={cn(
                "rounded-[1.75rem] bg-white p-5 ring-1 ring-black/5 sm:p-6",
                v === 2 && "ring-2 ring-[#0FC9BD]",
              )}
            >
              <h2 className="text-lg font-semibold tracking-[-0.01em]">
                {nome}
                {v === 2 && (
                  <span className="ml-2 rounded-full bg-[#0FC9BD] px-2 py-0.5 align-[2px] text-[11px] font-semibold text-[#021E34]">
                    No site
                  </span>
                )}
              </h2>
              <p className="mt-2 text-[0.92rem] leading-relaxed text-[#021E34]/65">{texto}</p>
              <div className="mt-5 flex items-center justify-center gap-6 rounded-2xl bg-[#f2f1ec] py-6">
                <FocinhoCta variante={v} className="text-[72px] text-[#021E34]" />
                <span className="grid place-items-center rounded-xl bg-[#021E34] p-2 text-white">
                  <FocinhoCta variante={v} className="text-[60px]" />
                </span>
              </div>
              <div className="mt-4 space-y-3">
                {FUNDOS.map((f) => (
                  <div key={f.id} className={cn("rounded-2xl p-4", f.fundo)}>
                    <p
                      className={cn(
                        "mb-3 text-xs font-medium",
                        f.id === "escuro" ? "text-white/60" : "text-[#021E34]/55",
                      )}
                    >
                      {f.nome}
                    </p>
                    <div className="flex flex-wrap items-center gap-2.5">
                      <Botao v={v} classe={f.botao}>
                        Teste grátis
                      </Botao>
                      <Botao v={v} classe={f.botao} pequeno>
                        Ver a Tipe Pay
                      </Botao>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))}
        </div>
        <p className="mt-10 text-sm text-[#021E34]/55">
          As opções anteriores (A, B e a seta C) continuam em{" "}
          <a className="underline" href="/interno/focinho-botoes.html">
            /interno/focinho-botoes.html
          </a>
          .
        </p>
      </div>
    </main>
  );
}
