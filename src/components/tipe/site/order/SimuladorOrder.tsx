/**
 * Simulador do Tipe Order (/produtos/order#simulador). O visitante faz os dois papéis:
 * o cliente no celular (cardápio, pedido, conta) e o restaurante ao lado (garçom que libera
 * a mesa, cozinha que prepara, caixa que vê o pagamento). Tudo roda só no navegador, com
 * dados de exemplo do restaurante fictício "Maré Alta"; nada é enviado.
 *
 * Segue as regras do produto: a mesa só pede depois que a equipe libera; a conta se paga
 * com Pix, Apple Pay, Google Pay ou no estabelecimento (sem cartão digitado); a gorjeta
 * extra é um segundo pagamento depois da conta (3/5/8%, 5% sugerida e não marcada,
 * 70% para o garçom da mesa). Valores em centavos inteiros.
 */
import { useEffect, useRef, useState } from "react";
import {
  BadgeCheck,
  ChefHat,
  HandCoins,
  Minus,
  Plus,
  ReceiptText,
  RotateCcw,
  Smartphone,
  Store,
  UserRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Secao, Titulo } from "../Site";
import { useMovimentoReduzido } from "../produto/useVisivel";
import { AneisCategorias, StoryCardapio, type ItemStory } from "./StoryCardapio";
import fotoPastel from "@/assets/cardapio/pastel-1080.webp";
import profPastel from "@/assets/cardapio/pastel-depth.png";
import fotoIsca from "@/assets/cardapio/isca-1080.webp";
import profIsca from "@/assets/cardapio/isca-depth.png";
import fotoBaiao from "@/assets/cardapio/baiao-1080.webp";
import profBaiao from "@/assets/cardapio/baiao-depth.png";
import fotoCartola from "@/assets/cardapio/cartola-1080.webp";
import profCartola from "@/assets/cardapio/cartola-depth.png";
import fotoPeixe from "@/assets/cardapio/peixe-720.webp";
import fotoCaju from "@/assets/cardapio/caju-1080.webp";
import profCaju from "@/assets/cardapio/caju-depth.png";
import fotoCoco from "@/assets/cardapio/coco-720.webp";

type Item = ItemStory;
type Status = "recebido" | "preparando" | "pronto" | "entregue";
type Pedido = { id: number; itens: { code: string; qtd: number }[]; status: Status; hora: string };
type Metodo = "pix" | "apple_pay" | "google_pay" | "estabelecimento";
type Etapa = "conta" | "metodos" | "pago" | "gorjeta" | "fim";

const GARCOM = "Joyce";
const SERVICO = 0.1;
const CATEGORIAS = ["Petiscos", "Pratos", "Bebidas", "Sobremesas"];
const CARDAPIO: Item[] = [
  {
    code: "pastel",
    nome: "Pastel de camarão",
    desc: "Porção com 6 unidades",
    preco: 3400,
    cat: "Petiscos",
    foto: fotoPastel,
    profundidade: profPastel,
    modelo: "/modelos/pastel-triposr.glb",
  },
  {
    code: "isca",
    nome: "Isca de peixe",
    desc: "Com molho tártaro da casa",
    preco: 5400,
    cat: "Petiscos",
    foto: fotoIsca,
    profundidade: profIsca,
    selo: "Mais pedido",
    alergenicos: ["peixe", "ovo", "glúten"],
  },
  {
    code: "baiao",
    nome: "Baião de dois",
    desc: "Feijão-verde, queijo coalho e nata",
    preco: 4200,
    cat: "Pratos",
    foto: fotoBaiao,
    profundidade: profBaiao,
    alergenicos: ["leite"],
  },
  {
    code: "peixe",
    nome: "Peixe na brasa",
    desc: "Pargo com pirão e salada",
    preco: 6800,
    cat: "Pratos",
    foto: fotoPeixe,
    selo: "Saindo da brasa",
    alergenicos: ["peixe"],
  },
  {
    code: "caju",
    nome: "Suco de caju",
    desc: "Copo de 400 ml",
    preco: 950,
    cat: "Bebidas",
    foto: fotoCaju,
    profundidade: profCaju,
  },
  {
    code: "coco",
    nome: "Água de coco",
    desc: "Servida no coco, bem gelada",
    preco: 800,
    cat: "Bebidas",
    foto: fotoCoco,
  },
  {
    code: "cartola",
    nome: "Cartola",
    desc: "Banana, queijo coalho e canela",
    preco: 1900,
    cat: "Sobremesas",
    foto: fotoCartola,
    profundidade: profCartola,
    alergenicos: ["leite"],
  },
  {
    code: "abacate",
    nome: "Creme de abacate",
    desc: "Com limão e raspas de rapadura. Gire o abacate em 3D.",
    preco: 1600,
    cat: "Sobremesas",
    modelo: "/modelos/abacate.glb",
    selo: "Em 3D",
  },
];
const PRECO = Object.fromEntries(CARDAPIO.map((i) => [i.code, i])) as Record<string, Item>;
const METODOS: { id: Metodo; nome: string; desc: string }[] = [
  { id: "pix", nome: "Pix", desc: "Copia e cola ou QR Code" },
  { id: "apple_pay", nome: "Apple Pay", desc: "Com Face ID ou Touch ID" },
  { id: "google_pay", nome: "Google Pay", desc: "Com a carteira do Google" },
  { id: "estabelecimento", nome: "Pagar no estabelecimento", desc: "O garçom confirma no caixa" },
];
const STATUS: Record<Status, { rotulo: string; tom: string; proximo?: Status; acao?: string }> = {
  recebido: {
    rotulo: "Recebido",
    tom: "bg-[#e6faf8] text-[#03665f]",
    proximo: "preparando",
    acao: "Começar preparo",
  },
  preparando: {
    rotulo: "Preparando",
    tom: "bg-amber-100 text-amber-800",
    proximo: "pronto",
    acao: "Marcar pronto",
  },
  pronto: {
    rotulo: "Pronto",
    tom: "bg-[#0FC9BD] text-[#021E34]",
    proximo: "entregue",
    acao: "Entregue na mesa",
  },
  entregue: { rotulo: "Entregue", tom: "bg-background-muted text-muted-foreground" },
};

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const agora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const totalItens = (itens: { code: string; qtd: number }[]) =>
  itens.reduce((s, i) => s + PRECO[i.code]!.preco * i.qtd, 0);

export function SimuladorOrder() {
  const reduzido = useMovimentoReduzido();
  const [liberada, setLiberada] = useState(false);
  const [aba, setAba] = useState<"pedir" | "pagar">("pedir");
  const [cat, setCat] = useState("Petiscos");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [enviado, setEnviado] = useState<number | null>(null);
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [pagoCentavos, setPagoCentavos] = useState(0);
  const [etapa, setEtapa] = useState<Etapa>("conta");
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [eventos, setEventos] = useState<{ hora: string; texto: string }[]>([]);
  const proximoId = useRef(1);

  const anotar = (texto: string) => setEventos((e) => [{ hora: agora(), texto }, ...e].slice(0, 6));

  // Fora do movimento reduzido, a cozinha anda sozinha; os botões continuam valendo.
  useEffect(() => {
    if (reduzido) return;
    const ativo = pedidos.find((p) => p.status === "recebido" || p.status === "preparando");
    if (!ativo) return;
    const t = setTimeout(() => avancar(ativo.id), 4200);
    return () => clearTimeout(t);
  }, [pedidos, reduzido]); // eslint-disable-line react-hooks/exhaustive-deps

  const linhas = Object.entries(carrinho)
    .filter(([, q]) => q > 0)
    .map(([code, qtd]) => ({ code, qtd }));
  const qtdCarrinho = linhas.reduce((s, l) => s + l.qtd, 0);
  const subtotal = pedidos.reduce((s, p) => s + totalItens(p.itens), 0);
  const servico = Math.round(subtotal * SERVICO);
  const total = subtotal + servico;
  const aPagar = total - pagoCentavos;

  function mudar(code: string, d: number) {
    setEnviado(null);
    setCarrinho((c) => ({ ...c, [code]: Math.max(0, Math.min(20, (c[code] ?? 0) + d)) }));
  }

  function liberar() {
    setLiberada(true);
    anotar(`${GARCOM} liberou os pedidos pelo celular na Mesa 12`);
  }
  function encerrar() {
    setLiberada(false);
    anotar(`${GARCOM} encerrou os pedidos pelo celular na Mesa 12`);
  }

  function enviar() {
    if (!liberada || !linhas.length) return;
    const id = proximoId.current++;
    setPedidos((p) => [...p, { id, itens: linhas, status: "recebido", hora: agora() }]);
    anotar(
      `Pedido #${id} da Mesa 12: ${qtdCarrinho} ${qtdCarrinho === 1 ? "item" : "itens"} · ${brl(totalItens(linhas))}`,
    );
    setEnviado(qtdCarrinho);
    setCarrinho({});
    if (etapa === "fim") setEtapa("conta");
  }

  function avancar(id: number) {
    const atual = pedidos.find((p) => p.id === id);
    const prox = atual && STATUS[atual.status].proximo;
    if (!prox) return;
    if (prox === "pronto") anotar(`Pedido #${id} pronto para servir`);
    setPedidos((ps) =>
      ps.map((p) => (p.id === id && p.status === atual.status ? { ...p, status: prox } : p)),
    );
  }

  function pagar(m: Metodo) {
    setMetodo(m);
    setPagoCentavos((v) => v + aPagar);
    anotar(
      m === "estabelecimento"
        ? `Mesa 12 vai pagar ${brl(aPagar)} no estabelecimento`
        : `Mesa 12 pagou ${brl(aPagar)} com ${METODOS.find((x) => x.id === m)!.nome}`,
    );
    setEtapa("pago");
  }

  function gorjeta(valor: number | null) {
    if (valor) {
      const garcom = Math.round(valor * 0.7);
      anotar(`Gorjeta extra de ${brl(valor)}: ${brl(garcom)} para ${GARCOM}`);
    }
    setEtapa("fim");
  }

  function recomecar() {
    setLiberada(false);
    setAba("pedir");
    setCat("Petiscos");
    setCarrinho({});
    setEnviado(null);
    setPedidos([]);
    setPagoCentavos(0);
    setEtapa("conta");
    setMetodo(null);
    setEventos([]);
    proximoId.current = 1;
  }

  const passo =
    !liberada && !pedidos.length
      ? 0
      : !pedidos.length
        ? 1
        : pedidos.some((p) => p.status !== "entregue") && pagoCentavos === 0
          ? 2
          : aPagar > 0
            ? 3
            : 4;
  const DICAS = [
    `Comece pelo restaurante: ${GARCOM} precisa liberar a Mesa 12. Enquanto isso, já dá para escolher no cardápio.`,
    "Mesa liberada. Escolha os itens no celular e toque em Enviar.",
    "O pedido chegou na cozinha. Acompanhe o preparo e, quando quiser, vá em Pagar no celular.",
    "Tudo pronto. Em Pagar, a conta da mesa já tem o que foi pedido pelo celular.",
    "Conta paga. Se quiser, peça mais: o pedido novo entra na mesma conta.",
  ];

  return (
    <Secao tema="claro" id="simulador">
      <div className="container-page">
        <Titulo
          rotulo="Simulador"
          titulo="Experimente o Tipe Order."
          texto="Faça o papel do cliente no celular e do restaurante ao lado. É uma simulação com dados de exemplo: nada é enviado."
        />
        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 lg:mt-12">
          <p
            aria-live="polite"
            className="max-w-2xl rounded-2xl bg-[#e6faf8] px-4 py-3 text-[0.95rem] text-[#021E34]"
          >
            <span className="font-semibold">Passo {passo + 1} de 5.</span> {DICAS[passo]}
          </p>
          <button
            type="button"
            onClick={recomecar}
            className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/20 px-5 text-sm font-medium hover:bg-background-muted"
          >
            <RotateCcw className="h-4 w-4" aria-hidden /> Recomeçar
          </button>
        </div>

        <div className="mt-6 grid items-start gap-6 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-10">
          {/* ---------------------------------------------------------- Celular do cliente */}
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Smartphone className="h-4 w-4" aria-hidden /> Celular do cliente
            </p>
            <div className="mx-auto w-full max-w-[22rem] rounded-[2.6rem] bg-[#021E34] p-2.5 shadow-[0_40px_80px_-30px_rgb(2_30_52/0.55)]">
              <div className="relative flex h-[40rem] flex-col overflow-hidden rounded-[2.1rem] bg-white text-[#021E34]">
                <div className="flex items-center justify-between px-5 pb-2 pt-5">
                  <div>
                    <p className="text-[0.7rem] text-[#5b6b78]">Maré Alta</p>
                    <p className="font-display text-lg leading-tight tracking-[-0.02em]">Mesa 12</p>
                  </div>
                  <span className="rounded-full border border-[#021E34]/15 px-2.5 py-1 text-[0.7rem]">
                    Atendida por {GARCOM}
                  </span>
                </div>
                <div
                  role="tablist"
                  aria-label="Pedir ou pagar"
                  className="mx-4 grid grid-cols-2 gap-1 rounded-2xl border border-[#021E34]/10 p-1"
                >
                  {(
                    [
                      ["pedir", "Pedir", UtensilsCrossed],
                      ["pagar", "Pagar", Wallet],
                    ] as const
                  ).map(([id, rotulo, Icone]) => (
                    <button
                      key={id}
                      type="button"
                      role="tab"
                      aria-selected={aba === id}
                      onClick={() => setAba(id)}
                      className={cn(
                        "flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors",
                        aba === id ? "bg-[#021E34] text-white" : "text-[#5b6b78]",
                      )}
                    >
                      <Icone className="h-4 w-4" aria-hidden /> {rotulo}
                    </button>
                  ))}
                </div>

                {aba === "pedir" ? (
                  <TelaPedir
                    liberada={liberada}
                    cat={cat}
                    setCat={setCat}
                    carrinho={carrinho}
                    mudar={mudar}
                    enviado={enviado}
                    pedirMais={() => setEnviado(null)}
                    qtd={qtdCarrinho}
                    totalCarrinho={totalItens(linhas)}
                    enviar={enviar}
                  />
                ) : (
                  <TelaPagar
                    pedidos={pedidos}
                    subtotal={subtotal}
                    servico={servico}
                    total={total}
                    aPagar={aPagar}
                    pagoCentavos={pagoCentavos}
                    etapa={etapa}
                    setEtapa={setEtapa}
                    metodo={metodo}
                    pagar={pagar}
                    gorjeta={gorjeta}
                    irPedir={() => setAba("pedir")}
                  />
                )}
              </div>
            </div>
          </div>

          {/* ---------------------------------------------------------- O que o restaurante vê */}
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Store className="h-4 w-4" aria-hidden /> O que o restaurante vê
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Painel icone={<UserRound />} titulo={`App do garçom · ${GARCOM}`}>
                <div className="flex items-center justify-between gap-3 rounded-xl bg-background-muted px-3 py-2.5">
                  <span className="font-medium">Mesa 12</span>
                  <span
                    className={cn(
                      "rounded-full px-2.5 py-0.5 text-xs font-medium",
                      liberada ? "bg-[#0FC9BD] text-[#021E34]" : "bg-white text-muted-foreground",
                    )}
                  >
                    {liberada ? "Pedidos liberados" : "Pedidos fechados"}
                  </span>
                </div>
                <p className="mt-3 text-sm text-muted-foreground">
                  O QR Code da mesa é fixo. Por segurança, a mesa só envia pedido depois que alguém
                  da equipe libera.
                </p>
                {liberada ? (
                  <button
                    type="button"
                    onClick={encerrar}
                    className="mt-3 min-h-11 w-full rounded-full border border-foreground/20 text-sm font-medium hover:bg-background-muted"
                  >
                    Encerrar pedidos desta mesa
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={liberar}
                    className={cn(
                      "mt-3 min-h-11 w-full rounded-full bg-[#021E34] text-sm font-medium text-white",
                      passo === 0 && !reduzido && "animate-pulse",
                    )}
                  >
                    Liberar pedidos pelo celular
                  </button>
                )}
              </Painel>

              <Painel icone={<ChefHat />} titulo="Cozinha">
                {pedidos.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    Os pedidos da mesa aparecem aqui assim que o cliente envia.
                  </p>
                ) : (
                  <ul className="grid max-h-[17rem] gap-2.5 overflow-y-auto pr-1">
                    {[...pedidos].reverse().map((p) => {
                      const s = STATUS[p.status];
                      return (
                        <li key={p.id} className="rounded-xl border border-border p-3">
                          <div className="flex items-center justify-between gap-2 text-sm">
                            <span className="font-semibold">Mesa 12 · #{p.id}</span>
                            <span
                              className={cn("rounded-full px-2 py-0.5 text-xs font-medium", s.tom)}
                            >
                              {s.rotulo}
                            </span>
                          </div>
                          <ul className="mt-1.5 text-sm text-muted-foreground">
                            {p.itens.map((i) => (
                              <li key={i.code}>
                                {i.qtd}× {PRECO[i.code]!.nome}
                              </li>
                            ))}
                          </ul>
                          {s.acao && (
                            <button
                              type="button"
                              onClick={() => avancar(p.id)}
                              className="mt-2 min-h-9 w-full rounded-full border border-foreground/20 text-xs font-medium hover:bg-background-muted"
                            >
                              {s.acao}
                            </button>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                )}
              </Painel>

              <Painel icone={<ReceiptText />} titulo="Caixa e avisos" className="sm:col-span-2">
                {eventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Cada passo da mesa aparece aqui, na hora.
                  </p>
                ) : (
                  <ul aria-live="polite" className="grid gap-1.5 text-sm">
                    {eventos.map((e, i) => (
                      <li
                        key={`${e.hora}-${i}-${e.texto}`}
                        className={cn("flex gap-3", i > 0 && "text-muted-foreground")}
                      >
                        <span className="tabular-nums text-muted-foreground">{e.hora}</span>
                        <span>{e.texto}</span>
                      </li>
                    ))}
                  </ul>
                )}
                <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-muted-foreground">Conta da mesa</dt>
                    <dd className="font-semibold tabular-nums">{brl(total)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Pago</dt>
                    <dd className="font-semibold tabular-nums">{brl(pagoCentavos)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-muted-foreground">Em aberto</dt>
                    <dd className="font-semibold tabular-nums">{brl(aPagar)}</dd>
                  </div>
                </dl>
              </Painel>
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}

function Painel({
  icone,
  titulo,
  children,
  className,
}: {
  icone: React.ReactNode;
  titulo: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titulo}
      className={cn("rounded-[1.4rem] border border-border bg-card p-4 sm:p-5", className)}
    >
      <h3 className="mb-3 flex items-center gap-2 text-[0.95rem] font-semibold [&_svg]:h-4 [&_svg]:w-4">
        <span aria-hidden>{icone}</span> {titulo}
      </h3>
      {children}
    </section>
  );
}

function TelaPedir({
  liberada,
  cat,
  setCat,
  carrinho,
  mudar,
  enviado,
  pedirMais,
  qtd,
  totalCarrinho,
  enviar,
}: {
  liberada: boolean;
  cat: string;
  setCat: (c: string) => void;
  carrinho: Record<string, number>;
  mudar: (code: string, d: number) => void;
  enviado: number | null;
  pedirMais: () => void;
  qtd: number;
  totalCarrinho: number;
  enviar: () => void;
}) {
  const [story, setStory] = useState<string | null>(null);
  if (enviado !== null)
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e6faf8] text-[#03665f]">
          <BadgeCheck className="h-7 w-7" aria-hidden />
        </span>
        <p className="mt-4 font-display text-xl tracking-[-0.02em]">Pedido enviado!</p>
        <p className="mt-1 text-sm text-[#5b6b78]">
          {enviado} {enviado === 1 ? "item foi" : "itens foram"} para a cozinha e já{" "}
          {enviado === 1 ? "está" : "estão"} na conta da mesa.
        </p>
        <button
          type="button"
          onClick={pedirMais}
          className="mt-5 min-h-11 w-full rounded-full bg-[#021E34] text-sm font-semibold text-white"
        >
          Pedir mais
        </button>
      </div>
    );
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3">
        {!liberada && (
          <div
            role="status"
            className="mb-3 rounded-2xl border border-[#021E34]/10 bg-[#f6f8f9] p-3 text-sm"
          >
            <p className="font-semibold">Pedidos pelo celular ainda não liberados</p>
            <p className="mt-0.5 text-[#5b6b78]">
              Chame {GARCOM} e peça para liberar esta mesa. Enquanto isso, você já pode escolher.
            </p>
          </div>
        )}
        <AneisCategorias itens={CARDAPIO} categorias={CATEGORIAS} abrir={setStory} />
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {CATEGORIAS.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCat(c)}
              aria-pressed={cat === c}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold",
                cat === c ? "border-[#0FC9BD] bg-[#0FC9BD] text-[#021E34]" : "border-[#021E34]/15",
              )}
            >
              {c}
            </button>
          ))}
        </div>
        <ul className="mt-3 grid gap-2">
          {CARDAPIO.filter((i) => i.cat === cat).map((i) => {
            const q = carrinho[i.code] ?? 0;
            return (
              <li
                key={i.code}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border p-3",
                  q ? "border-[#0FC9BD] bg-[#f2fcfb]" : "border-[#021E34]/10",
                )}
              >
                <button
                  type="button"
                  onClick={() => setStory(i.code)}
                  aria-label={`Ver ${i.nome} em tela cheia`}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  <span className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,#0FC9BD,#021E34_80%)]">
                    {i.foto ? (
                      <img
                        src={i.foto}
                        alt=""
                        loading="lazy"
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-[0.6rem] font-bold text-white">
                        {i.modelo ? "3D" : i.nome.slice(0, 2)}
                      </span>
                    )}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-semibold">{i.nome}</span>
                    {i.desc && (
                      <span className="block truncate text-xs text-[#5b6b78]">{i.desc}</span>
                    )}
                    <span className="mt-0.5 block text-sm font-semibold tabular-nums">
                      {brl(i.preco)}
                    </span>
                  </span>
                </button>
                {q > 0 ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      aria-label={`Menos um ${i.nome}`}
                      onClick={() => mudar(i.code, -1)}
                      className="grid h-9 w-9 place-items-center rounded-full border border-[#021E34]/20"
                    >
                      <Minus className="h-4 w-4" aria-hidden />
                    </button>
                    <span className="w-4 text-center text-sm font-semibold tabular-nums">{q}</span>
                    <button
                      type="button"
                      aria-label={`Mais um ${i.nome}`}
                      onClick={() => mudar(i.code, 1)}
                      className="grid h-9 w-9 place-items-center rounded-full bg-[#021E34] text-white"
                    >
                      <Plus className="h-4 w-4" aria-hidden />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    aria-label={`Adicionar ${i.nome}`}
                    onClick={() => mudar(i.code, 1)}
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-[#021E34] text-white"
                  >
                    <Plus className="h-5 w-5" aria-hidden />
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      </div>
      {qtd > 0 && (
        <div className="border-t border-[#021E34]/10 p-3">
          <button
            type="button"
            onClick={enviar}
            disabled={!liberada}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#021E34] text-sm font-semibold text-white disabled:bg-[#9aa6af]"
          >
            <UtensilsCrossed className="h-4 w-4" aria-hidden /> Enviar {qtd}{" "}
            {qtd === 1 ? "item" : "itens"} · {brl(totalCarrinho)}
          </button>
          <p className="mt-1 text-center text-[0.68rem] text-[#5b6b78]">
            {liberada
              ? "O pedido vai direto para a cozinha e entra na sua conta."
              : "Seu pedido fica guardado aqui até a mesa ser liberada."}
          </p>
        </div>
      )}
      {story && (
        <StoryCardapio
          itens={CARDAPIO}
          categorias={CATEGORIAS}
          inicio={story}
          restaurante="Maré Alta"
          carrinho={carrinho}
          mudar={mudar}
          onFechar={() => {
            const it = PRECO[story];
            if (it) setCat(it.cat);
            setStory(null);
          }}
        />
      )}
    </>
  );
}

function TelaPagar({
  pedidos,
  subtotal,
  servico,
  total,
  aPagar,
  pagoCentavos,
  etapa,
  setEtapa,
  metodo,
  pagar,
  gorjeta,
  irPedir,
}: {
  pedidos: Pedido[];
  subtotal: number;
  servico: number;
  total: number;
  aPagar: number;
  pagoCentavos: number;
  etapa: Etapa;
  setEtapa: (e: Etapa) => void;
  metodo: Metodo | null;
  pagar: (m: Metodo) => void;
  gorjeta: (valor: number | null) => void;
  irPedir: () => void;
}) {
  const [ultimoPago, setUltimoPago] = useState(0);
  const [outro, setOutro] = useState<string | null>(null);
  const outroCentavos = outro ? Math.round(Number(outro.replace(",", ".")) * 100) : 0;
  const outroErro =
    outro === null || outro === ""
      ? null
      : !Number.isFinite(outroCentavos) || outroCentavos < 200
        ? "O mínimo é R$ 2,00."
        : outroCentavos > ultimoPago
          ? `O máximo é ${brl(ultimoPago)}, o valor pago.`
          : null;
  const itens = pedidos.flatMap((p) =>
    p.itens.map((i) => ({ ...i, status: p.status, pedido: p.id })),
  );

  if (!pedidos.length)
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <ReceiptText className="h-8 w-8 text-[#5b6b78]" aria-hidden />
        <p className="mt-3 font-semibold">A conta ainda está vazia</p>
        <p className="mt-1 text-sm text-[#5b6b78]">
          O que você pedir pelo celular entra aqui na hora.
        </p>
        <button
          type="button"
          onClick={irPedir}
          className="mt-5 min-h-11 w-full rounded-full border border-[#021E34]/20 text-sm font-semibold"
        >
          Ver o cardápio
        </button>
      </div>
    );

  if (etapa === "metodos")
    return (
      <div className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-sm text-[#5b6b78]">Pagar a conta da mesa</p>
        <p className="font-display text-3xl tracking-[-0.03em] tabular-nums">{brl(aPagar)}</p>
        <ul className="mt-4 grid gap-2">
          {METODOS.map((m) => (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => {
                  setUltimoPago(aPagar);
                  pagar(m.id);
                }}
                className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-[#021E34]/12 px-4 text-left hover:border-[#0FC9BD]"
              >
                <span>
                  <span className="block text-sm font-semibold">{m.nome}</span>
                  <span className="block text-xs text-[#5b6b78]">{m.desc}</span>
                </span>
                <span aria-hidden>›</span>
              </button>
            </li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => setEtapa("conta")}
          className="mt-auto mb-4 min-h-11 text-sm font-medium text-[#5b6b78]"
        >
          Voltar para a conta
        </button>
      </div>
    );

  if (etapa === "pago" || etapa === "gorjeta")
    return (
      <div className="flex flex-1 flex-col px-4 pt-6">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e6faf8] text-[#03665f]">
            <BadgeCheck className="h-6 w-6" aria-hidden />
          </span>
          <p className="mt-3 font-display text-xl tracking-[-0.02em]">
            {metodo === "estabelecimento" ? "Pagamento no estabelecimento" : "Conta paga"}
          </p>
          <p className="text-sm text-[#5b6b78]">
            {metodo === "estabelecimento"
              ? `${GARCOM} confirma ${brl(ultimoPago)} no caixa.`
              : `${brl(ultimoPago)} com ${METODOS.find((m) => m.id === metodo)?.nome}. Simulação, nada foi cobrado.`}
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-[#021E34]/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold">
            <HandCoins className="h-4 w-4" aria-hidden /> Quer deixar uma gorjeta extra para{" "}
            {GARCOM}?
          </p>
          <p className="mt-0.5 text-xs text-[#5b6b78]">
            Opcional e separada da conta. 70% vai para {GARCOM}.
          </p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[3, 5, 8].map((pct) => (
              <button
                key={pct}
                type="button"
                onClick={() => gorjeta(Math.round((ultimoPago * pct) / 100))}
                className="relative min-h-14 rounded-xl border border-[#021E34]/15 text-sm font-semibold hover:border-[#0FC9BD]"
              >
                {pct}%
                <span className="block text-[0.68rem] font-normal tabular-nums text-[#5b6b78]">
                  {brl(Math.round((ultimoPago * pct) / 100))}
                </span>
                {pct === 5 && (
                  <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#0FC9BD] px-1.5 text-[0.6rem] font-semibold text-[#021E34]">
                    Sugerida
                  </span>
                )}
              </button>
            ))}
          </div>
          {outro === null ? (
            <button
              type="button"
              onClick={() => setOutro("")}
              className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-[#021E34]/20 text-sm font-medium"
            >
              Outro valor
            </button>
          ) : (
            <form
              className="mt-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!outroErro && outroCentavos >= 200) gorjeta(outroCentavos);
              }}
            >
              <label htmlFor="sim-outro" className="block text-xs font-medium text-[#5b6b78]">
                Outro valor (R$ 2,00 até {brl(ultimoPago)})
              </label>
              <div className="mt-1 flex gap-2">
                <input
                  id="sim-outro"
                  inputMode="decimal"
                  autoComplete="off"
                  value={outro}
                  onChange={(e) => setOutro(e.target.value.replace(/[^0-9,.]/g, ""))}
                  aria-invalid={!!outroErro}
                  aria-describedby={outroErro ? "sim-outro-erro" : undefined}
                  placeholder="10,00"
                  className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#021E34]/20 px-3 text-sm tabular-nums"
                />
                <button
                  type="submit"
                  disabled={!!outroErro || outroCentavos < 200}
                  className="min-h-11 rounded-xl bg-[#021E34] px-4 text-sm font-semibold text-white disabled:bg-[#9aa6af]"
                >
                  Dar gorjeta
                </button>
              </div>
              {outroErro && (
                <p id="sim-outro-erro" className="mt-1 text-xs text-[#b42318]">
                  {outroErro}
                </p>
              )}
            </form>
          )}
        </div>
        <button
          type="button"
          onClick={() => gorjeta(null)}
          className="mt-3 min-h-11 text-sm font-medium text-[#5b6b78]"
        >
          Agora não
        </button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-3">
        {etapa === "fim" && aPagar === 0 && (
          <p role="status" className="mb-3 rounded-2xl bg-[#e6faf8] p-3 text-sm text-[#021E34]">
            Obrigado! A conta está paga. Se pedir mais, o novo pedido entra nesta conta.
          </p>
        )}
        <ul className="divide-y divide-[#021E34]/8">
          {itens.map((i) => (
            <li
              key={`${i.pedido}-${i.code}`}
              className="flex items-center justify-between gap-3 py-2.5 text-sm"
            >
              <span className="min-w-0">
                <span className="block font-medium">
                  {i.qtd}× {PRECO[i.code]!.nome}
                </span>
                <span className="text-xs text-[#5b6b78]">
                  Cozinha: {STATUS[i.status].rotulo.toLowerCase()}
                </span>
              </span>
              <span className="tabular-nums">{brl(PRECO[i.code]!.preco * i.qtd)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-[#021E34]/10 bg-[#f6f8f9] p-4">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between text-[#5b6b78]">
            <dt>Itens</dt>
            <dd className="tabular-nums">{brl(subtotal)}</dd>
          </div>
          <div className="flex justify-between text-[#5b6b78]">
            <dt>Serviço (10%)</dt>
            <dd className="tabular-nums">{brl(servico)}</dd>
          </div>
          {pagoCentavos > 0 && (
            <div className="flex justify-between text-[#5b6b78]">
              <dt>Já pago</dt>
              <dd className="tabular-nums">− {brl(pagoCentavos)}</dd>
            </div>
          )}
          <div className="flex justify-between pt-1 text-base font-semibold">
            <dt>{pagoCentavos > 0 ? "Em aberto" : "Total da mesa"}</dt>
            <dd className="tabular-nums">{brl(aPagar)}</dd>
          </div>
        </dl>
        <button
          type="button"
          disabled={aPagar <= 0}
          onClick={() => setEtapa("metodos")}
          className="mt-3 min-h-12 w-full rounded-full bg-[#021E34] text-sm font-semibold text-white disabled:bg-[#9aa6af]"
        >
          {aPagar > 0 ? `Pagar ${brl(aPagar)}` : `Conta paga · ${brl(total)}`}
        </button>
      </div>
    </div>
  );
}
