/**
 * Conversas da Lebre (Tipe AI) desenhadas em HTML, no lugar de fotos repetidas.
 * Os textos seguem o que a Lebre faz de verdade no painel (src/lib/tipe/lebre.functions.ts):
 * resume o salão (mesas com conta aberta, pagamentos esperando o caixa, equipe),
 * propõe ações que só acontecem depois do "Confirmar" (mesas, equipe e cardápio),
 * aceita voz e anexos (foto e PDF). Dados demonstrativos. O celular da faixa simula uma
 * conversa acontecendo: perguntas e respostas entram uma a uma, com a Lebre "digitando".
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, FileText, Mic, Sparkles } from "lucide-react";
import { reduzMovimento } from "../movimento";
import "./produto.css";
import avatarLebre from "@/assets/lebre/avatar-ola.webp";
import { cn } from "@/lib/utils";

export type ConversaId = "salao" | "acao" | "anexo";

function Voce({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <p
      className={cn(
        "ml-auto w-fit max-w-[85%] rounded-[1.2rem] rounded-br-md bg-white px-3.5 py-2.5 text-[0.9rem] leading-snug text-[#021E34] shadow-[0_10px_24px_-14px_rgb(0_0_0/0.45)]",
        className,
      )}
    >
      {children}
    </p>
  );
}

function Lebre({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn("flex items-end gap-2", className)}>
      <img
        src={avatarLebre}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="h-8 w-8 shrink-0 rounded-full bg-white sm:h-9 sm:w-9"
      />
      <div className="max-w-[85%] rounded-[1.2rem] rounded-bl-md bg-[#0b2f4c] px-3.5 py-2.5 text-[0.9rem] leading-snug text-white shadow-[0_10px_24px_-14px_rgb(0_0_0/0.6)] ring-1 ring-white/10">
        {children}
      </div>
    </div>
  );
}

function Proposta() {
  return (
    <div className="ml-10 rounded-[1.1rem] bg-white p-3.5 text-[#021E34] shadow-[0_16px_32px_-18px_rgb(0_0_0/0.55)] sm:ml-11">
      <p className="text-[0.88rem] font-semibold">Pausar “Moqueca de peixe”</p>
      <p className="mt-1 text-[0.82rem] leading-snug text-[#021E34]/70">
        Vou marcar “Moqueca de peixe” como indisponível até você reativar.
      </p>
      <div aria-hidden className="mt-3 flex gap-2 text-[0.8rem] font-medium">
        <span className="inline-flex items-center gap-1 rounded-full bg-[#021E34] px-3 py-1.5 text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} /> Confirmar
        </span>
        <span className="inline-flex items-center rounded-full border border-[#021E34]/20 px-3 py-1.5">
          Cancelar
        </span>
      </div>
    </div>
  );
}

/** Uma conversa curta. `compacta` mostra só a pergunta e a resposta. */
export function ConversaLebre({
  id,
  compacta = false,
  className,
}: {
  id: ConversaId;
  compacta?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("space-y-2.5", className)}>
      {id === "salao" && (
        <>
          <Voce>Resuma a situação do salão.</Voce>
          <Lebre>
            Agora são 6 mesas com conta aberta. A mesa 9 tem um pagamento no caixa esperando a sua
            confirmação.
          </Lebre>
          {!compacta && <Voce>E quem está atendendo hoje?</Voce>}
          {!compacta && (
            <Lebre>
              Joyce, Caio e Rafael estão ativos. O Rafael ainda não tem acesso ao Tipe Staff.
            </Lebre>
          )}
        </>
      )}
      {id === "acao" && (
        <>
          <Voce className="flex items-center gap-2">
            <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]">
              <Mic className="h-3.5 w-3.5" aria-hidden />
            </span>
            Acabou o peixe. Pausa a moqueca, por favor.
          </Voce>
          <Lebre>Posso pausar. Confere e confirma?</Lebre>
          <Proposta />
        </>
      )}
      {id === "anexo" && (
        <>
          <Voce className="flex items-center gap-2.5">
            <span className="grid h-9 w-8 shrink-0 place-items-center rounded-md bg-[#021E34]/8 text-[#021E34]">
              <FileText className="h-4 w-4" aria-hidden />
            </span>
            <span>
              <span className="block text-[0.8rem] font-semibold">cardapio-novembro.pdf</span>
              Quais pratos do PDF não estão no cardápio de hoje?
            </span>
          </Voce>
          <Lebre>
            No PDF tem 3 pratos que não aparecem hoje: Baião de dois, Peixada e Cartola. Quer que eu
            reative algum?
          </Lebre>
        </>
      )}
    </div>
  );
}

const LEGENDA: Record<ConversaId, string> = {
  salao: "Lebre no painel do restaurante",
  acao: "Nada muda sem o seu Confirmar",
  anexo: "Lê foto e PDF",
};

/** Palco escuro com a conversa, para as abas e o mosaico da página Tipe AI. */
export function PainelLebre({ id, className }: { id: ConversaId; className?: string }) {
  return (
    <div
      className={cn(
        "relative flex h-full w-full flex-col justify-end overflow-hidden bg-[#021E34] p-5 sm:p-8 lg:p-10",
        className,
      )}
    >
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(70%_55%_at_80%_10%,rgb(15_201_189/0.35),transparent_65%),radial-gradient(60%_50%_at_0%_100%,rgb(155_231_196/0.18),transparent_70%)]"
      />
      <p className="relative mb-auto flex w-fit items-center gap-1.5 rounded-full bg-white/10 px-3 py-1.5 text-[0.78rem] font-medium text-white/85 ring-1 ring-white/15">
        <Sparkles className="h-3.5 w-3.5 text-[#0FC9BD]" aria-hidden /> {LEGENDA[id]}
      </p>
      <ConversaLebre id={id} className="relative mx-auto mt-6 w-full max-w-md" />
      <p className="relative mt-5 text-center text-[0.72rem] text-white/45">
        Conversa demonstrativa
      </p>
    </div>
  );
}

/** Roteiro da conversa ao vivo do celular: o gerente pergunta e a Lebre responde. */
const ROTEIRO: { quem: "voce" | "lebre"; texto: string; voz?: boolean }[] = [
  { quem: "voce", texto: "Como está o salão agora?" },
  {
    quem: "lebre",
    texto: "6 mesas com conta aberta. A mesa 9 tem um pagamento esperando o caixa.",
  },
  { quem: "voce", texto: "Quanto falta pagar na mesa 12?" },
  { quem: "lebre", texto: "R$ 118,80. Duas pessoas já pagaram a parte delas." },
  { quem: "voce", texto: "Acabou o peixe. Pausa a moqueca.", voz: true },
  { quem: "lebre", texto: "Preparei: pausar “Moqueca de peixe”. Confere e toca em Confirmar?" },
  { quem: "voce", texto: "Quem está atendendo hoje?" },
  { quem: "lebre", texto: "Joyce, Caio e Rafael. O Rafael ainda não entrou no Tipe Staff." },
];

function Digitando() {
  return (
    <div className="flex items-end gap-2">
      <img
        src={avatarLebre}
        alt=""
        width={36}
        height={36}
        loading="lazy"
        className="h-7 w-7 shrink-0 rounded-full bg-white"
      />
      <div className="flex gap-1 rounded-[1.1rem] rounded-bl-md bg-[#0b2f4c] px-3.5 py-3">
        {[0, 1, 2].map((i) => (
          <i
            key={i}
            className="lebre-digitando h-1.5 w-1.5 rounded-full bg-white/70"
            style={{ animationDelay: `${i * 160}ms` }}
          />
        ))}
      </div>
    </div>
  );
}

/** Conversa que acontece sozinha, em loop, enquanto o celular está na tela. */
function ConversaAoVivo() {
  const caixa = useRef<HTMLDivElement>(null);
  const [n, setN] = useState(0);
  const [digitando, setDigitando] = useState(false);
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (reduzMovimento()) {
      setN(ROTEIRO.length);
      return;
    }
    const el = caixa.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisivel(!!e?.isIntersecting), {
      threshold: 0.3,
    });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visivel) return;
    let t: ReturnType<typeof setTimeout>;
    if (n >= ROTEIRO.length) {
      t = setTimeout(() => setN(0), 4200);
    } else if (ROTEIRO[n]!.quem === "lebre" && !digitando) {
      t = setTimeout(() => setDigitando(true), 450);
    } else if (digitando) {
      t = setTimeout(() => {
        setDigitando(false);
        setN((x) => x + 1);
      }, 1300);
    } else {
      t = setTimeout(() => setN((x) => x + 1), n === 0 ? 700 : 1500);
    }
    return () => clearTimeout(t);
  }, [n, digitando, visivel]);

  useEffect(() => {
    const el = caixa.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: reduzMovimento() ? "auto" : "smooth" });
  }, [n, digitando]);

  return (
    <div
      ref={caixa}
      aria-live="off"
      className="flex flex-1 flex-col gap-2 overflow-hidden px-[5%] pb-[6%] pt-3 [&_div]:text-[0.74rem] [&_p]:text-[0.74rem]"
    >
      <div className="mt-auto" />
      {ROTEIRO.slice(0, n).map((m, i) =>
        m.quem === "voce" ? (
          <Voce key={i} className="lebre-entra flex items-center gap-1.5 px-3 py-2">
            {m.voz && (
              <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]">
                <Mic className="h-3 w-3" aria-hidden />
              </span>
            )}
            {m.texto}
          </Voce>
        ) : (
          <Lebre key={i} className="lebre-entra [&_img]:h-7 [&_img]:w-7 [&>div]:px-3 [&>div]:py-2">
            {m.texto}
          </Lebre>
        ),
      )}
      {digitando && <Digitando />}
    </div>
  );
}

/** Celular com a conversa da Lebre acontecendo, para a faixa na cor da marca. */
export function CelularLebre({ className }: { className?: string }) {
  return (
    <figure
      className={cn(
        "relative w-full rounded-[13%/6%] bg-[oklch(0.17_0_0)] p-[2.6%] shadow-[0_50px_80px_-40px_oklch(0.2_0.05_250/0.55),0_0_0_1px_oklch(0.42_0_0/0.55)]",
        className,
      )}
    >
      <div className="relative flex aspect-[390/844] flex-col overflow-hidden rounded-[11%/5%] bg-[#f4f7f8]">
        <div className="flex items-center gap-2 border-b border-[#021E34]/10 bg-white px-[7%] pb-3 pt-[16%]">
          <img
            src={avatarLebre}
            alt=""
            width={36}
            height={36}
            loading="lazy"
            className="h-8 w-8 rounded-full"
          />
          <span className="leading-tight">
            <span className="block text-[0.85rem] font-semibold text-[#021E34]">Lebre</span>
            <span className="block text-[0.65rem] text-[#03665f]">online no painel</span>
          </span>
          <span className="ml-auto rounded-full bg-[#0FC9BD]/15 px-2 py-0.5 text-[0.65rem] font-medium text-[#03665f]">
            Painel
          </span>
        </div>
        <ConversaAoVivo />
        <div
          aria-hidden
          className="mx-[5%] mb-[7%] flex items-center gap-2 rounded-full bg-white px-3 py-2 text-[0.7rem] text-[#021E34]/45 ring-1 ring-[#021E34]/10"
        >
          Pergunte à Lebre
          <span className="ml-auto grid h-6 w-6 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]">
            <Mic className="h-3 w-3" />
          </span>
        </div>
      </div>
      <figcaption className="sr-only">
        Conversa demonstrativa com a Lebre no painel: o gerente pergunta como está o salão, quanto
        falta na mesa 12, pede para pausar um prato e quem está atendendo.
      </figcaption>
    </figure>
  );
}
