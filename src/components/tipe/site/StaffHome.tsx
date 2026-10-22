/**
 * Tipe Staff na home, na linguagem da página Staff app da sunday: foto de um
 * garçom no salão com avisos do celular empilhados por cima. Os avisos são os
 * que o Tipe Staff mostra de verdade (mesa paga, gorjeta extra com os 70% do
 * garçom, avaliação e saque quinzenal por Pix) e vão se renovando enquanto a
 * seção está na tela.
 */
import { useEffect, useState, type ReactNode } from "react";
import { Banknote, Check, HandCoins, Star } from "lucide-react";
import { useInView } from "@/components/tipe/landing/motion";
import { cn } from "@/lib/utils";
import { Foto } from "./Foto";
import { reduzMovimento } from "./movimento";
import { BotaoSecundario, Secao, Titulo } from "./Site";

type Aviso = { id: string; icone: ReactNode; titulo: string; texto: ReactNode; quando: string };

const AVISOS: Aviso[] = [
  {
    id: "paga",
    icone: <Check className="h-3.5 w-3.5" strokeWidth={3} />,
    titulo: "Mesa 5 · conta paga",
    texto: <>Quitada pela Tipe · <span className="money">R$ 310,20</span></>,
    quando: "agora",
  },
  {
    id: "gorjeta",
    icone: <HandCoins className="h-3.5 w-3.5" />,
    titulo: "Gorjeta extra · Mesa 5",
    texto: <><span className="money">+ R$ 5,60</span> no seu saldo (70%)</>,
    quando: "1 min",
  },
  {
    id: "avaliacao",
    icone: <Star className="h-3.5 w-3.5 fill-current" />,
    titulo: "Nova avaliação · Mesa 12",
    texto: <>5 estrelas para o seu atendimento</>,
    quando: "4 min",
  },
  {
    id: "saque",
    icone: <Banknote className="h-3.5 w-3.5" />,
    titulo: "Saque da quinzena",
    texto: <><span className="money">R$ 241,30</span> enviado por Pix</>,
    quando: "16/10",
  },
];

export function StaffHome() {
  const [ref, visivel] = useInView<HTMLDivElement>("0px 0px -20% 0px");
  const [inicio, setInicio] = useState(0);

  useEffect(() => {
    if (!visivel || reduzMovimento()) return;
    const t = window.setInterval(() => setInicio((i) => (i + 1) % AVISOS.length), 3400);
    return () => window.clearInterval(t);
  }, [visivel]);

  const pilha = [2, 1, 0].map((k) => AVISOS[(inicio + k) % AVISOS.length]!);

  return (
    <Secao tema="claro" id="equipe">
      <div className="container-page grid items-center gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:gap-20">
        <div>
          <Titulo
            rotulo="Tipe Staff"
            titulo="A equipe sabe de tudo, na hora."
            texto="O garçom vê no celular qual mesa já pagou, recebe a gorjeta extra com o nome dele e saca o saldo por Pix a cada quinzena."
          />
          <BotaoSecundario href="/produtos/staff" className="mt-8">
            Conhecer o Tipe Staff
          </BotaoSecundario>
        </div>
        <div ref={ref} className="relative">
          <div className="relative overflow-hidden rounded-[2rem]">
            <Foto
              nome="garcom"
              alt="Garçom no salão sorrindo ao ver um aviso no celular"
              posicao="55% 35%"
              sizes="(min-width: 1024px) 50vw, 100vw"
              className="aspect-[4/5] sm:aspect-[5/5.2]"
            />
            <div aria-hidden className="pointer-events-none absolute inset-x-0 top-0 h-2/3 bg-gradient-to-b from-black/45 to-transparent" />
          </div>
          <ul
            aria-label="Avisos do Tipe Staff"
            className="absolute inset-x-3 top-3 space-y-2 sm:inset-x-auto sm:left-5 sm:top-5 sm:w-[min(23rem,80%)]"
          >
            {pilha.map((a, k) => (
              <li
                key={a.id}
                className={cn(
                  "aviso-staff flex items-start gap-3 rounded-[1.1rem] border border-white/20 bg-[oklch(0.97_0_0/0.86)] p-3 text-[oklch(0.17_0_0)] shadow-[0_24px_40px_-24px_rgb(0_0_0/0.7)] backdrop-blur-xl",
                  k === 1 && "scale-[0.98] opacity-95",
                  k === 2 && "scale-[0.96] opacity-80",
                )}
              >
                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-[0.6rem] bg-[#021E34] text-[#0FC9BD]">
                  {a.icone}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[0.88rem] font-medium">{a.titulo}</span>
                    <span className="shrink-0 text-[0.72rem] text-[oklch(0.5_0_0)]">{["agora", "2 min", "6 min"][k]}</span>
                  </span>
                  <span className="block text-[0.85rem] text-[oklch(0.38_0_0)]">{a.texto}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </Secao>
  );
}
