import { createFileRoute } from "@tanstack/react-router";
import { fotoSrc, type NomeFoto } from "@/components/tipe/site/Foto";
import { telaReal, type TelaReal } from "@/components/tipe/site/CelularReal";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/interno/videos")({
  head: () => ({
    meta: [
      { title: "Vídeos · storyboards · interno | Tipe" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: Pagina,
});

/** Um quadro: uma foto do casting ou ilustração, e opcionalmente a tela real que entra composta. */
type Quadro = {
  t: string;
  foto: NomeFoto;
  pos?: string;
  tela?: TelaReal;
  demo?: boolean;
  texto: string;
};
type Proposta = { nome: string; conceito: string; dur: string; quadros: Quadro[] };

const COMO: Proposta[] = [
  {
    nome: "1 · Mesa Viva",
    conceito: "A mesa ganha vida.",
    dur: "30 s",
    quadros: [
      {
        t: "0–4 s",
        foto: "cena-casal",
        texto: "Maré Alta à noite. Mesa 12, totem em primeiro plano.",
      },
      {
        t: "4–8 s",
        foto: "scan",
        texto: "O celular encosta no QR. Um anel turquesa contorna a mesa.",
      },
      {
        t: "8–13 s",
        foto: "cena-casal-larga",
        tela: "conta",
        texto: "A conta chega. Linhas ligam os pratos aos itens.",
      },
      {
        t: "13–17 s",
        foto: "cena-cozinha",
        tela: "cardapio",
        demo: true,
        texto: "Com Order: pediu, entrou no KDS.",
      },
      { t: "17–22 s", foto: "pix-mao", tela: "pago", texto: "Divide, Apple Pay, pago." },
      {
        t: "22–30 s",
        foto: "cena-mesa-liberada",
        texto: "Joyce é avisada. A mesa fica livre. Logotipo.",
      },
    ],
  },
  {
    nome: "2 · Um único movimento",
    conceito: "Do QR ao pagamento, sem interrupções.",
    dur: "25 s",
    quadros: [
      { t: "0–3 s", foto: "mesa", pos: "80% 75%", texto: "Macro no QR do totem." },
      {
        t: "3–8 s",
        foto: "mesa",
        tela: "conta",
        texto: "A câmera entra no QR e sai dentro do celular.",
      },
      {
        t: "8–16 s",
        foto: "mesa",
        tela: "dividir",
        texto: "Conta, dividir, métodos, Pix aprovado.",
      },
      { t: "16–21 s", foto: "salao", texto: "Recuo: a mesa, depois o salão." },
      { t: "21–25 s", foto: "cena-gerente", texto: "No tablet, a mesa 12 fica livre. Logotipo." },
    ],
  },
  {
    nome: "3 · Duas experiências, uma plataforma",
    conceito: "O cliente aproveita. O restaurante acompanha.",
    dur: "30 s",
    quadros: [
      { t: "0–4 s", foto: "cena-amigos-larga", texto: "Split: a mesa | a cozinha calma." },
      { t: "4–10 s", foto: "scan", texto: "Escaneia | a mesa 12 abre no salão." },
      {
        t: "10–16 s",
        foto: "cena-cozinha",
        tela: "pedido",
        demo: true,
        texto: "Com Order: pede | a comanda chega.",
      },
      { t: "16–22 s", foto: "cena-caixa", tela: "pix", texto: "Paga com Pix | o caixa recebe." },
      {
        t: "22–27 s",
        foto: "gorjetas-garcom",
        tela: "gorjeta",
        texto: "Gorjeta extra R$ 37,80 | R$ 26,46 no saldo.",
      },
      { t: "27–30 s", foto: "salao", texto: "As metades se fecham no símbolo." },
    ],
  },
];

const LEBRE: Proposta[] = [
  {
    nome: "1 · A corrida contra o tempo",
    conceito: "Desta vez, a lebre ganha.",
    dur: "18 s",
    quadros: [
      {
        t: "0–4 s",
        foto: "lebre-tartaruga-cliente",
        pos: "20% 50%",
        texto: "A tartaruga olha o relógio na parede.",
      },
      {
        t: "4–8 s",
        foto: "lebre-tartaruga-cliente",
        pos: "25% 50%",
        texto: "O tempo passa: o ponteiro dá uma volta.",
      },
      {
        t: "8–11 s",
        foto: "lebre-tartaruga-dono",
        pos: "20% 50%",
        texto: "Mão no queixo. Suspiro.",
      },
      {
        t: "11–15 s",
        foto: "lebre-tartaruga-cliente",
        pos: "80% 50%",
        texto: "A lebre: QR, divide, paga, aprovado.",
      },
      {
        t: "15–18 s",
        foto: "lebre-tartaruga-gorjeta",
        pos: "80% 50%",
        texto: "Ela acena. A tartaruga ainda espera.",
      },
    ],
  },
  {
    nome: "2 · O mesmo restaurante, dois tempos",
    conceito: "Seu tempo é para aproveitar. Não para esperar.",
    dur: "22 s",
    quadros: [
      {
        t: "0–6 s",
        foto: "lebre-tartaruga-familia",
        texto: "Duas mesas lado a lado, cada uma com um relógio.",
      },
      {
        t: "6–12 s",
        foto: "lebre-tartaruga-garcom",
        texto: "Tartaruga chama o garçom | lebre paga.",
      },
      {
        t: "12–18 s",
        foto: "lebre-tartaruga-amigos",
        texto: "Lebre aproveita o tempo que sobrou.",
      },
      {
        t: "18–22 s",
        foto: "lebre-tartaruga-gorjeta",
        texto: "Os relógios: 40 minutos de diferença.",
      },
    ],
  },
  {
    nome: "3 · A fábula reinventada",
    conceito: "Com a Tipe, quem chega depois pode pagar primeiro.",
    dur: "20 s",
    quadros: [
      {
        t: "0–5 s",
        foto: "lebre-tartaruga-dono",
        pos: "20% 50%",
        texto: "A tartaruga, confiante, quase pagando.",
      },
      {
        t: "5–9 s",
        foto: "lebre-tartaruga-garcom",
        pos: "80% 50%",
        texto: "A lebre chega depois e senta.",
      },
      {
        t: "9–14 s",
        foto: "lebre-tartaruga-cliente",
        pos: "80% 50%",
        texto: "Escaneia, paga, sai.",
      },
      {
        t: "14–20 s",
        foto: "lebre-tartaruga-gorjeta",
        pos: "20% 50%",
        texto: "Tartaruga de boca aberta. A lebre pisca.",
      },
    ],
  },
];

function Q({ q }: { q: Quadro }) {
  const f = fotoSrc(q.foto);
  const s = q.tela ? telaReal(q.tela) : null;
  return (
    <figure className="m-0 w-[15rem] shrink-0 snap-start">
      <div className="relative aspect-video overflow-hidden rounded-xl bg-[#ddd]">
        <img
          src={f.src}
          srcSet={f.srcSet}
          sizes="240px"
          alt=""
          className="h-full w-full object-cover"
          style={{ objectPosition: q.pos ?? "50% 45%" }}
          loading="lazy"
        />
        {s && (
          <img
            src={s.src}
            alt=""
            className="absolute bottom-2 right-2 w-[24%] rounded-md bg-white shadow-lg ring-2 ring-black"
            loading="lazy"
          />
        )}
        {q.demo && (
          <span className="absolute left-2 top-2 rounded-full bg-[#021E34] px-2 py-0.5 text-[0.6rem] text-white">
            Order · em desenvolvimento
          </span>
        )}
      </div>
      <figcaption className="mt-2 text-[0.82rem] leading-snug text-[#021E34]/75">
        <span className="tabular-nums text-[#087a72]">{q.t}</span> {q.texto}
      </figcaption>
    </figure>
  );
}

function Grupo({ titulo, itens }: { titulo: string; itens: Proposta[] }) {
  return (
    <section className="mt-12">
      <h2 className="font-display text-2xl tracking-[-0.02em] text-[#021E34]">{titulo}</h2>
      {itens.map((p) => (
        <div key={p.nome} className="mt-6 rounded-[1.5rem] bg-white p-5 ring-1 ring-black/5">
          <p className="flex flex-wrap items-baseline gap-x-3">
            <span className="text-lg font-semibold text-[#021E34]">{p.nome}</span>
            <span className="text-[#021E34]/60">"{p.conceito}"</span>
            <span className="ml-auto text-sm text-[#021E34]/50">{p.dur}</span>
          </p>
          <div className={cn("mt-4 flex snap-x gap-3 overflow-x-auto pb-2")}>
            {p.quadros.map((q, i) => (
              <Q key={i} q={q} />
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}

function Pagina() {
  return (
    <main className="min-h-dvh bg-[#f0efea] px-4 py-10 sm:px-8">
      <div className="mx-auto max-w-6xl">
        <p className="text-sm font-medium uppercase tracking-[0.14em] text-[#021E34]/50">
          Interno · V62
        </p>
        <h1 className="mt-2 font-display text-[clamp(2rem,1.4rem+2.4vw,3.2rem)] leading-[1.02] tracking-[-0.03em] text-[#021E34]">
          Storyboards dos vídeos
        </h1>
        <p className="mt-3 max-w-2xl text-[#021E34]/70">
          Rascunho de baixo custo, montado só com o casting, as ilustrações e as telas reais que já
          existem. A tela no canto de cada quadro é a que entra composta no vídeo final. Roteiros
          completos, narração, trilha e orçamento em docs/landing-v62/PROPOSTAS-VIDEO.md. Nada foi
          gerado com serviço pago.
        </p>
        <Grupo titulo={'Vídeo "Como funciona"'} itens={COMO} />
        <Grupo titulo="A lebre e a tartaruga" itens={LEBRE} />
      </div>
    </main>
  );
}
