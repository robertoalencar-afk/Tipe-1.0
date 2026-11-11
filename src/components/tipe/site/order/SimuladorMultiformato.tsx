/**
 * Simulador multiformato do Tipe Order (/produtos/order#simulador). Uma arquitetura só para
 * as sete modalidades: o estado e as regras ficam em src/lib/tipe/order/simulacao.ts; aqui
 * só o aparelho do cliente (celular, totem ou tela do balcão), o que o restaurante vê
 * (garçom, caixa, cozinha, painel de senhas, expedição) e os eventos.
 *
 * Tudo roda no navegador com o restaurante fictício "Maré Alta": nada é enviado, nenhum
 * pagamento é real. Regras preservadas: a mesa só pede depois que a equipe libera; conta
 * paga com Pix, Apple Pay, Google Pay ou no estabelecimento (sem cartão digitado); gorjeta
 * extra como segundo pagamento (3/5/8%, 5% sugerida e não marcada, 70% para quem atendeu);
 * balcão, retirada e totem pagam antes de produzir; delivery chega de canal externo.
 */
import { useEffect, useReducer, useRef, useState, type ReactNode } from "react";
import {
  BadgeCheck,
  ChefHat,
  HandCoins,
  MapPin,
  Minus,
  MonitorSmartphone,
  Nfc,
  Plus,
  ReceiptText,
  RotateCcw,
  ShoppingBag,
  Smartphone,
  Store,
  Truck,
  Tv,
  UserRound,
  UtensilsCrossed,
  Wallet,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  conta as calcularConta,
  estadoInicial,
  exigeLiberacao,
  linhasDoCarrinho,
  pagaAntes,
  pagaPeloPay,
  passoAtual,
  PASSOS_STATUS,
  reduzir,
  totalLinhas,
  type Acao,
  type Contexto,
  type EstadoSim,
  type MetodoPay,
  type PedidoSim,
} from "@/lib/tipe/order/simulacao";
import { DEFINICOES, ORDEM_SELETOR, type Modalidade } from "@/lib/tipe/order/modalidades";
import { markSimulatorUsed } from "@/lib/tipe/tracking";
import { Secao, Titulo } from "../Site";
import { useMovimentoReduzido } from "../produto/useVisivel";
import { AneisCategorias, StoryCardapio } from "./StoryCardapio";
import {
  brl,
  CARDAPIO,
  CATEGORIAS,
  CLIENTE,
  GARCOM,
  METODOS_CAIXA,
  METODOS_PAY,
  PEDIDOS_EXTERNOS,
  POR_CODE,
  RESTAURANTE,
  SETORES_EVENTO,
} from "./simulador/dados";

const agora = () => new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });

const LOCAL: Record<Modalidade, string> = {
  mesas: "Mesa 12",
  balcao: "Balcão",
  comanda: "Comanda 37",
  retirada: "Balcão",
  delivery: "Expedição",
  totem: "Totem 1",
  pulseira: "Pulseira 0421",
};

const TOM_STATUS: Record<string, string> = {
  aguardando_pagamento: "bg-amber-100 text-amber-800",
  recebido: "bg-[#e6faf8] text-[#03665f]",
  preparando: "bg-amber-100 text-amber-800",
  pronto: "bg-[#0FC9BD] text-[#021E34]",
  entregue: "bg-background-muted text-muted-foreground",
  expedido: "bg-background-muted text-muted-foreground",
};

const DICAS: Record<Modalidade, string[]> = {
  mesas: [
    `Comece pelo restaurante: ${GARCOM} precisa liberar a Mesa 12. Enquanto isso, já dá para escolher no cardápio.`,
    "Mesa liberada. Escolha os itens no celular e toque em Enviar.",
    "O pedido chegou na cozinha. Acompanhe o preparo e, quando quiser, vá em Pagar no celular.",
    "Tudo pronto. Em Pagar, a conta da mesa já tem o que foi pedido pelo celular.",
    "Conta paga. Se quiser, peça mais: o pedido novo entra na mesma conta.",
  ],
  comanda: [
    `Comece pelo restaurante: ${GARCOM} abre a comanda de ${CLIENTE}.`,
    "Comanda aberta. Peça pelo celular: tudo entra na mesma comanda.",
    "O pedido chegou na cozinha com o número da comanda.",
    "Em Pagar, a comanda mostra só o consumo de quem a carrega.",
    "Comanda paga. A equipe encerra e ela volta a ficar livre.",
  ],
  pulseira: [
    `Comece pelo restaurante: ${GARCOM} ativa a pulseira 0421 e vincula à comanda de ${CLIENTE}.`,
    "Pulseira ativa. Aproxime o celular (aqui, só toque em Pedir) e envie o pedido.",
    "O pedido chegou na cozinha. Informe seu setor ou, se quiser, compartilhe a localização para a equipe entregar.",
    "Em Pagar, a comanda da pulseira já tem tudo. Pague pelo Tipe Pay.",
    "Comanda paga. A equipe encerra a pulseira, que volta ao estoque para o próximo cliente.",
  ],
  balcao: [
    "",
    "A atendente monta o pedido na tela do balcão: toque nos produtos e em Cobrar.",
    "Pedido com senha, aguardando o caixa cobrar. Escolha a forma de pagamento no caixa.",
    "Pago: foi para a cozinha. Acompanhe o preparo até a senha ser chamada.",
    "Senha retirada. Faça outra venda: a senha seguinte sai sozinha.",
  ],
  retirada: [
    "",
    "Registre o pedido para retirada: produtos, nome do cliente e Cobrar.",
    "Pedido com senha, aguardando o caixa. Cobre para liberar a produção.",
    "Preparando. Quando ficar pronto, a senha aparece no painel da TV.",
    "Retirado. O próximo pedido ganha a senha seguinte.",
  ],
  totem: [
    "",
    "Você é o cliente no totem: toque em Começar pedido, escolha comer aqui ou levar e monte o pedido.",
    "Pedido com senha, aguardando pagamento. O caixa confirma o pagamento feito no estabelecimento.",
    "Pago: a cozinha recebeu. A senha aparece no painel quando ficar pronta.",
    "Senha retirada. O totem limpa a sessão e volta ao início.",
  ],
  delivery: [
    "",
    "Toque em Receber pedido: um pedido externo chega com a origem identificada.",
    "O pedido está na mesma cozinha do salão. Avance o preparo até a expedição.",
    "",
    "Expedido. Receba outro pedido para ver a fila crescer.",
  ],
};

/* ------------------------------------------------------------------ componente */

export function SimuladorMultiformato({
  modalidade,
  onModalidade,
}: {
  modalidade: Modalidade;
  onModalidade: (m: Modalidade) => void;
}) {
  const reduzido = useMovimentoReduzido();
  const ctx = useRef<Contexto>({ cardapio: POR_CODE, agora, atendente: GARCOM, local: LOCAL[modalidade], servico: 0.1 });
  ctx.current.local = LOCAL[modalidade];
  const [estado, despachar] = useReducer(
    (e: EstadoSim, a: Acao | { tipo: "trocar"; modalidade: Modalidade }) =>
      a.tipo === "trocar" ? estadoInicial(a.modalidade) : reduzir(e, a, ctx.current),
    modalidade,
    estadoInicial,
  );
  const chave = useRef(1);
  const novaChave = () => `sim-${estado.modalidade}-${chave.current++}`;

  useEffect(() => {
    if (estado.modalidade !== modalidade) despachar({ tipo: "trocar", modalidade });
  }, [modalidade, estado.modalidade]);

  const marcou = useRef(false);
  const agir = (a: Acao) => {
    if (!marcou.current) {
      marcou.current = true;
      markSimulatorUsed();
    }
    despachar(a);
  };

  // Fora do movimento reduzido, a cozinha anda sozinha; os botões continuam valendo.
  useEffect(() => {
    if (reduzido) return;
    const ativo = estado.pedidos.find((p) => p.status === "recebido" || p.status === "preparando");
    if (!ativo) return;
    const t = setTimeout(() => despachar({ tipo: "avancar", pedidoId: ativo.id }), 4200);
    return () => clearTimeout(t);
  }, [estado.pedidos, reduzido]);

  const def = DEFINICOES[estado.modalidade];
  const passo = passoAtual(estado, ctx.current);
  const dica = DICAS[estado.modalidade][passo] || DICAS[estado.modalidade].find((d, i) => i >= passo && d) || "";
  const comSenha = pagaAntes(estado.modalidade);
  const comPay = pagaPeloPay(estado.modalidade);

  return (
    <Secao tema="claro" id="simulador">
      <div className="container-page">
        <Titulo
          rotulo="Veja funcionando"
          titulo="Experimente a Tipe no seu formato."
          texto="Faça o papel do cliente e do restaurante ao lado. É uma simulação com dados de exemplo: nada é enviado e nenhum pagamento é real."
        />

        <p className="mt-6 text-[0.95rem] text-muted-foreground">
          Modalidade: <span className="font-medium text-foreground">{DEFINICOES[estado.modalidade].nome}</span>.{" "}
          <a href="#atendimento" className="underline underline-offset-4 hover:text-foreground">Trocar de modalidade</a>
        </p>

        <div className="mt-5 flex flex-wrap items-center justify-between gap-3">
          <p aria-live="polite" className="max-w-2xl rounded-2xl bg-[#e6faf8] px-4 py-3 text-[0.95rem] text-[#021E34]">
            <span className="font-semibold">{def.nome} · </span>
            {dica}
          </p>
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-[#0FC9BD] px-3 py-1.5 text-xs font-medium text-[#021E34]">Demonstração interativa</span>
            <button
              type="button"
              onClick={() => despachar({ tipo: "reiniciar" })}
              className="inline-flex min-h-11 items-center gap-2 rounded-full border border-foreground/20 px-5 text-sm font-medium hover:bg-background-muted"
            >
              <RotateCcw className="h-4 w-4" aria-hidden /> Recomeçar
            </button>
          </div>
        </div>

        <div
          className={cn(
            "mt-6 grid items-start gap-6 lg:gap-10",
            estado.modalidade === "totem"
              ? "lg:grid-cols-[minmax(0,24rem)_minmax(0,1fr)]"
              : estado.modalidade === "balcao" || estado.modalidade === "retirada" || estado.modalidade === "delivery"
                ? "lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"
                : "lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]",
          )}
        >
          {/* ------------------------------------------------ lado do cliente / origem do pedido */}
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              {estado.modalidade === "totem" ? (
                <><MonitorSmartphone className="h-4 w-4" aria-hidden /> Totem de autoatendimento</>
              ) : estado.modalidade === "balcao" || estado.modalidade === "retirada" ? (
                <><Store className="h-4 w-4" aria-hidden /> Tela do balcão (Lançamento Tipe)</>
              ) : estado.modalidade === "delivery" ? (
                <><Truck className="h-4 w-4" aria-hidden /> Pedidos de fora</>
              ) : (
                <><Smartphone className="h-4 w-4" aria-hidden /> Celular do cliente</>
              )}
            </p>
            {estado.modalidade === "totem" ? (
              <Totem estado={estado} agir={agir} novaChave={novaChave} />
            ) : estado.modalidade === "balcao" || estado.modalidade === "retirada" ? (
              <TelaBalcao estado={estado} agir={agir} novaChave={novaChave} />
            ) : estado.modalidade === "delivery" ? (
              <Recebimento estado={estado} agir={agir} novaChave={novaChave} />
            ) : (
              <Celular estado={estado} agir={agir} novaChave={novaChave} />
            )}
          </div>

          {/* ------------------------------------------------ o que o restaurante vê */}
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Store className="h-4 w-4" aria-hidden /> O que o restaurante vê
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              {exigeLiberacao(estado.modalidade) && <PainelEquipe estado={estado} agir={agir} passo={passo} reduzido={reduzido} />}
              {comSenha && <PainelCaixa estado={estado} agir={agir} />}
              <PainelCozinha estado={estado} agir={agir} />
              {comSenha && <PainelSenhas estado={estado} />}
              {estado.modalidade === "delivery" && <PainelExpedicao estado={estado} />}
              <PainelEventos estado={estado} comPay={comPay} />
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}

/* ------------------------------------------------------------------ painéis do restaurante */

function Painel({ icone, titulo, children, className }: { icone: ReactNode; titulo: string; children: ReactNode; className?: string }) {
  return (
    <section aria-label={titulo} className={cn("rounded-[1.4rem] border border-border bg-card p-4 sm:p-5", className)}>
      <h3 className="mb-3 flex items-center gap-2 text-[0.95rem] font-semibold [&_svg]:h-4 [&_svg]:w-4">
        <span aria-hidden>{icone}</span> {titulo}
      </h3>
      {children}
    </section>
  );
}

function PainelEquipe({ estado, agir, passo, reduzido }: { estado: EstadoSim; agir: (a: Acao) => void; passo: number; reduzido: boolean }) {
  const m = estado.modalidade;
  const local = LOCAL[m];
  const nomeAcao = m === "pulseira" ? "Ativar pulseira e vincular" : m === "comanda" ? "Abrir comanda" : "Liberar pedidos pelo celular";
  const nomeFim = m === "pulseira" ? "Encerrar comanda e liberar pulseira" : m === "comanda" ? "Encerrar comanda" : "Encerrar pedidos desta mesa";
  return (
    <Painel icone={<UserRound />} titulo={`Tipe Equipe · ${GARCOM}`}>
      <div className="flex items-center justify-between gap-3 rounded-xl bg-background-muted px-3 py-2.5">
        <span className="font-medium">{local}</span>
        <span className={cn("rounded-full px-2.5 py-0.5 text-xs font-medium", estado.liberada ? "bg-[#0FC9BD] text-[#021E34]" : "bg-white text-muted-foreground")}>
          {estado.liberada ? (m === "mesas" ? "Pedidos liberados" : "Ativa") : m === "mesas" ? "Pedidos fechados" : "Livre"}
        </span>
      </div>
      <p className="mt-3 text-sm text-muted-foreground">
        {m === "pulseira"
          ? "A pulseira vem pré-gravada pela Tipe. Só o número não autoriza nada: a equipe ativa e vincula à comanda."
          : m === "comanda"
            ? "A comanda nasce quando a equipe abre; o cliente pede em qualquer ponto e tudo entra nela."
            : "O QR Code da mesa é fixo. Por segurança, a mesa só envia pedido depois que alguém da equipe libera."}
      </p>
      {estado.liberada ? (
        <button type="button" onClick={() => agir({ tipo: "encerrar" })} className="mt-3 min-h-11 w-full rounded-full border border-foreground/20 text-sm font-medium hover:bg-background-muted">
          {nomeFim}
        </button>
      ) : (
        <button
          type="button"
          onClick={() => agir({ tipo: "liberar" })}
          className={cn("mt-3 min-h-11 w-full rounded-full bg-[#021E34] text-sm font-medium text-white", passo === 0 && !reduzido && "animate-pulse")}
        >
          {nomeAcao}
        </button>
      )}
      {m === "pulseira" && estado.liberada && (
        <div className="mt-3 rounded-xl border border-border p-3 text-sm">
          <p className="flex items-center gap-1.5 font-semibold"><MapPin className="h-4 w-4 text-[#03665f]" aria-hidden /> Tipe Localiza</p>
          {estado.localizacao ? (
            <p className="mt-1 text-muted-foreground">
              {CLIENTE} está em <span className="font-medium text-foreground">{estado.localizacao.setor}</span> · precisão ~{estado.localizacao.precisaoM} m · atualizado {estado.localizacao.hora}
            </p>
          ) : (
            <p className="mt-1 text-muted-foreground">Sem localização ainda. O cliente compartilha no celular, só durante o atendimento.</p>
          )}
          <MapaEvento setor={estado.localizacao?.setor ?? null} />
        </div>
      )}
    </Painel>
  );
}

function MapaEvento({ setor }: { setor: string | null }) {
  return (
    <ul aria-label="Mapa do evento" className="mt-2 grid grid-cols-5 gap-1 text-[0.6rem]">
      {SETORES_EVENTO.map((s) => (
        <li key={s} className={cn("flex h-11 items-center justify-center rounded-md border px-1 text-center leading-tight", s === setor ? "border-[#0FC9BD] bg-[#e6faf8] font-semibold" : "border-border text-muted-foreground")}>
          {s}
        </li>
      ))}
    </ul>
  );
}

function PainelCaixa({ estado, agir }: { estado: EstadoSim; agir: (a: Acao) => void }) {
  const pendentes = estado.pedidos.filter((p) => p.status === "aguardando_pagamento");
  return (
    <Painel icone={<Wallet />} titulo="Caixa · a cobrar">
      {pendentes.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          Pedidos com senha aparecem aqui até o caixa cobrar. Só depois vão para a cozinha.
        </p>
      ) : (
        <ul className="grid gap-2.5">
          {pendentes.map((p) => (
            <li key={p.id} className="rounded-xl border border-border p-3 text-sm">
              <div className="flex items-center justify-between">
                <span className="font-semibold">Senha {p.senha}{p.cliente ? ` · ${p.cliente}` : ""}</span>
                <span className="tabular-nums">{brl(totalLinhas(p.itens, POR_CODE))}</span>
              </div>
              <div className="mt-2 grid grid-cols-3 gap-1.5">
                {METODOS_CAIXA.map((mc) => (
                  <button key={mc.id} type="button" onClick={() => agir({ tipo: "cobrar", pedidoId: p.id, metodo: mc.id })} className="min-h-9 rounded-full bg-[#021E34] text-xs font-medium text-white">
                    {mc.nome}
                  </button>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

function PainelCozinha({ estado, agir }: { estado: EstadoSim; agir: (a: Acao) => void }) {
  const fila = estado.pedidos.filter((p) => p.status !== "aguardando_pagamento");
  return (
    <Painel icone={<ChefHat />} titulo="Tipe Cozinha">
      {fila.length === 0 ? (
        <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
          {pagaAntes(estado.modalidade) ? "Os pedidos entram aqui depois de pagos." : "Os pedidos aparecem aqui assim que são enviados."}
        </p>
      ) : (
        <ul className="grid max-h-[17rem] gap-2.5 overflow-y-auto pr-1">
          {[...fila].reverse().map((p) => {
            const s = PASSOS_STATUS[p.status];
            const titulo = p.senha ? `Senha ${p.senha}` : p.origemExterna ? `${p.origemExterna}` : `${LOCAL[estado.modalidade]} · #${p.id}`;
            return (
              <li key={p.id} className="rounded-xl border border-border p-3">
                <div className="flex items-center justify-between gap-2 text-sm">
                  <span className="font-semibold">{titulo}</span>
                  <span className={cn("rounded-full px-2 py-0.5 text-xs font-medium", TOM_STATUS[p.status])}>{s.rotulo}</span>
                </div>
                <ul className="mt-1.5 text-sm text-muted-foreground">
                  {p.itens.map((i) => (
                    <li key={i.code}>
                      {i.qtd}× {POR_CODE[i.code]?.nome}
                      {i.obs ? <span className="italic"> · {i.obs}</span> : null}
                    </li>
                  ))}
                </ul>
                {s.acao && (
                  <button type="button" onClick={() => agir({ tipo: "avancar", pedidoId: p.id })} className="mt-2 min-h-9 w-full rounded-full border border-foreground/20 text-xs font-medium hover:bg-background-muted">
                    {estado.modalidade === "delivery" && s.proximo === "entregue" ? "Expedir" : s.acao}
                  </button>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </Painel>
  );
}

function PainelSenhas({ estado }: { estado: EstadoSim }) {
  const prontas = estado.pedidos.filter((p) => p.status === "pronto");
  const preparando = estado.pedidos.filter((p) => p.status === "recebido" || p.status === "preparando");
  return (
    <Painel icone={<Tv />} titulo="Painel de senhas (TV)" className="bg-[#021E34] text-white [&_h3]:text-white">
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-[0.7rem] uppercase tracking-wide text-white/60">Prontas</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {prontas.length ? prontas.map((p) => <span key={p.id} className="rounded-lg bg-[#0FC9BD] px-2.5 py-1 font-display text-xl text-[#021E34] tabular-nums">{p.senha}</span>) : <span className="text-sm text-white/50">—</span>}
          </div>
        </div>
        <div>
          <p className="text-[0.7rem] uppercase tracking-wide text-white/60">Preparando</p>
          <div className="mt-1 flex flex-wrap gap-1.5">
            {preparando.length ? preparando.map((p) => <span key={p.id} className="rounded-lg bg-white/10 px-2.5 py-1 font-display text-xl tabular-nums">{p.senha}</span>) : <span className="text-sm text-white/50">—</span>}
          </div>
        </div>
      </div>
      <p className="mt-3 text-[0.7rem] text-white/60">Aviso só pela TV e pela equipe: a Tipe não envia SMS nem WhatsApp ao cliente nesta modalidade.</p>
    </Painel>
  );
}

function PainelExpedicao({ estado }: { estado: EstadoSim }) {
  const expedidos = estado.pedidos.filter((p) => p.status === "expedido");
  return (
    <Painel icone={<Truck />} titulo="Expedição">
      {expedidos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Pedidos prontos saem daqui para o entregador do canal de origem. A Tipe não faz logística.</p>
      ) : (
        <ul className="grid gap-1.5 text-sm">
          {expedidos.map((p) => (
            <li key={p.id} className="flex justify-between gap-2"><span>#{p.id} · {p.cliente}</span><span className="text-muted-foreground">{p.origemExterna}</span></li>
          ))}
        </ul>
      )}
    </Painel>
  );
}

function PainelEventos({ estado, comPay }: { estado: EstadoSim; comPay: boolean }) {
  const c = calcularConta(estado, { cardapio: POR_CODE, agora, atendente: GARCOM, local: LOCAL[estado.modalidade], servico: 0.1 });
  const vendido = estado.pedidos.filter((p) => p.status !== "aguardando_pagamento").reduce((s, p) => s + totalLinhas(p.itens, POR_CODE), 0);
  return (
    <Painel icone={<ReceiptText />} titulo={comPay ? "Caixa e avisos" : "Avisos"} className="sm:col-span-2">
      {estado.eventos.length === 0 ? (
        <p className="text-sm text-muted-foreground">Cada passo aparece aqui, na hora.</p>
      ) : (
        <ul aria-live="polite" className="grid gap-1.5 text-sm">
          {estado.eventos.map((e, i) => (
            <li key={`${e.hora}-${i}-${e.texto}`} className={cn("flex gap-3", i > 0 && "text-muted-foreground")}>
              <span className="tabular-nums text-muted-foreground">{e.hora}</span>
              <span>{e.texto}</span>
            </li>
          ))}
        </ul>
      )}
      <dl className="mt-4 grid grid-cols-3 gap-2 border-t border-border pt-3 text-sm">
        {comPay ? (
          <>
            <div><dt className="text-xs text-muted-foreground">Conta</dt><dd className="font-semibold tabular-nums">{brl(c.total)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Pago</dt><dd className="font-semibold tabular-nums">{brl(estado.pagoCentavos)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">Em aberto</dt><dd className="font-semibold tabular-nums">{brl(c.aPagar)}</dd></div>
          </>
        ) : (
          <>
            <div><dt className="text-xs text-muted-foreground">Pedidos</dt><dd className="font-semibold tabular-nums">{estado.pedidos.length}</dd></div>
            <div><dt className="text-xs text-muted-foreground">{estado.modalidade === "delivery" ? "Recebido" : "Vendido"}</dt><dd className="font-semibold tabular-nums">{brl(vendido)}</dd></div>
            <div><dt className="text-xs text-muted-foreground">A cobrar</dt><dd className="font-semibold tabular-nums">{estado.pedidos.filter((p) => p.status === "aguardando_pagamento").length}</dd></div>
          </>
        )}
      </dl>
    </Painel>
  );
}

/* ------------------------------------------------------------------ celular (mesas, comanda, pulseira) */

function Celular({ estado, agir, novaChave }: { estado: EstadoSim; agir: (a: Acao) => void; novaChave: () => string }) {
  const [aba, setAba] = useState<"pedir" | "pagar">("pedir");
  const m = estado.modalidade;
  const ctx: Contexto = { cardapio: POR_CODE, agora, atendente: GARCOM, local: LOCAL[m], servico: 0.1 };
  const c = calcularConta(estado, ctx);
  useEffect(() => setAba("pedir"), [m]);
  return (
    <div className="mx-auto w-full max-w-[22rem] rounded-[2.6rem] bg-[#021E34] p-2.5 shadow-[0_40px_80px_-30px_rgb(2_30_52/0.55)]">
      <div className="relative flex h-[40rem] flex-col overflow-hidden rounded-[2.1rem] bg-white text-[#021E34]">
        <div className="flex items-center justify-between px-5 pb-2 pt-5">
          <div className="flex items-center gap-2.5">
            <span aria-hidden className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-[#021E34] font-display text-[0.95rem] font-semibold text-[#0FC9BD] ring-2 ring-[#0FC9BD]/40">M</span>
            <div>
              <p className="text-[0.7rem] text-[#5b6b78]">{RESTAURANTE}</p>
              <p className="flex items-center gap-1.5 font-display text-lg leading-tight tracking-[-0.02em]">
                {m === "pulseira" && <Nfc className="h-4 w-4 text-[#03665f]" aria-hidden />}
                {LOCAL[m]}
              </p>
            </div>
          </div>
          <span className="rounded-full border border-[#021E34]/15 px-2.5 py-1 text-[0.7rem]">
            {m === "mesas" ? `Atendida por ${GARCOM}` : CLIENTE}
          </span>
        </div>
        <div role="tablist" aria-label="Pedir ou pagar" className="mx-4 grid grid-cols-2 gap-1 rounded-2xl border border-[#021E34]/10 p-1">
          {([["pedir", "Pedir", UtensilsCrossed], ["pagar", "Pagar", Wallet]] as const).map(([id, rotulo, Icone]) => (
            <button key={id} type="button" role="tab" aria-selected={aba === id} onClick={() => setAba(id)} className={cn("flex h-10 items-center justify-center gap-1.5 rounded-xl text-sm font-semibold transition-colors", aba === id ? "bg-[#021E34] text-white" : "text-[#5b6b78]")}>
              <Icone className="h-4 w-4" aria-hidden /> {rotulo}
            </button>
          ))}
        </div>
        {aba === "pedir" ? (
          <TelaPedir estado={estado} agir={agir} novaChave={novaChave} />
        ) : (
          <TelaPagar estado={estado} agir={agir} conta={c} irPedir={() => setAba("pedir")} />
        )}
      </div>
    </div>
  );
}

function TelaPedir({ estado, agir, novaChave }: { estado: EstadoSim; agir: (a: Acao) => void; novaChave: () => string }) {
  const [cat, setCat] = useState(CATEGORIAS[0]!);
  const [story, setStory] = useState<string | null>(null);
  const [enviado, setEnviado] = useState<number | null>(null);
  const [setor, setSetor] = useState(SETORES_EVENTO[0]!);
  const m = estado.modalidade;
  const linhas = linhasDoCarrinho(estado);
  const qtd = linhas.reduce((s, l) => s + l.qtd, 0);
  const bloqueado = exigeLiberacao(m) && !estado.liberada;
  const mudar = (code: string, delta: number) => {
    setEnviado(null);
    agir({ tipo: "item", code, delta });
  };
  useEffect(() => setEnviado(null), [m]);

  if (enviado !== null)
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <span className="grid h-14 w-14 place-items-center rounded-full bg-[#e6faf8] text-[#03665f]"><BadgeCheck className="h-7 w-7" aria-hidden /></span>
        <p className="mt-4 font-display text-xl tracking-[-0.02em]">Pedido enviado!</p>
        <p className="mt-1 text-sm text-[#5b6b78]">
          {enviado} {enviado === 1 ? "item foi" : "itens foram"} para a cozinha e já {enviado === 1 ? "está" : "estão"} na {m === "mesas" ? "conta da mesa" : "sua comanda"}.
        </p>
        {m === "pulseira" && (
          <div className="mt-5 w-full rounded-2xl border border-[#021E34]/10 p-3 text-left text-sm">
            <p className="flex items-center gap-1.5 font-semibold"><MapPin className="h-4 w-4 text-[#03665f]" aria-hidden /> Ajude a equipe a te encontrar</p>
            <p className="mt-0.5 text-xs text-[#5b6b78]">Opcional. Só durante este atendimento. O GPS não é preciso em lugar fechado: escolha também o setor.</p>
            <select aria-label="Onde você está" value={setor} onChange={(e) => setSetor(e.target.value)} className="mt-2 h-10 w-full rounded-xl border border-[#021E34]/20 px-3 text-sm">
              {SETORES_EVENTO.map((s) => <option key={s}>{s}</option>)}
            </select>
            <button type="button" onClick={() => agir({ tipo: "localizar", setor, precisaoM: 8 + Math.floor(Math.random() * 20) })} className="mt-2 min-h-10 w-full rounded-full bg-[#0FC9BD] text-sm font-semibold text-[#021E34]">
              Compartilhar minha localização
            </button>
          </div>
        )}
        <button type="button" onClick={() => setEnviado(null)} className="mt-4 min-h-11 w-full rounded-full bg-[#021E34] text-sm font-semibold text-white">Pedir mais</button>
      </div>
    );

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 pb-3 pt-3">
        {bloqueado && (
          <div role="status" className="mb-3 rounded-2xl border border-[#021E34]/10 bg-[#f6f8f9] p-3 text-sm">
            <p className="font-semibold">{m === "pulseira" ? "Pulseira ainda não ativada" : m === "comanda" ? "Comanda ainda não aberta" : "Pedidos pelo celular ainda não liberados"}</p>
            <p className="mt-0.5 text-[#5b6b78]">Chame {GARCOM}. Enquanto isso, você já pode escolher.</p>
          </div>
        )}
        <AneisCategorias itens={CARDAPIO} categorias={CATEGORIAS} abrir={(c) => setStory(CARDAPIO.find((i) => i.cat === c)?.code ?? null)} />
        <div className="-mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4 pb-1">
          {CATEGORIAS.map((c) => (
            <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", cat === c ? "border-[#0FC9BD] bg-[#0FC9BD] text-[#021E34]" : "border-[#021E34]/15")}>
              {c}
            </button>
          ))}
        </div>
        <ListaItens cat={cat} carrinho={estado.carrinho} mudar={mudar} abrir={setStory} />
      </div>
      {qtd > 0 && (
        <div className="border-t border-[#021E34]/10 p-3">
          <button
            type="button"
            disabled={bloqueado}
            onClick={() => {
              agir({ tipo: "enviar", chave: novaChave() });
              setEnviado(qtd);
            }}
            className="flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#021E34] text-sm font-semibold text-white disabled:bg-[#9aa6af]"
          >
            <UtensilsCrossed className="h-4 w-4" aria-hidden /> Enviar {qtd} {qtd === 1 ? "item" : "itens"} · {brl(totalLinhas(linhas, POR_CODE))}
          </button>
          <p className="mt-1 text-center text-[0.68rem] text-[#5b6b78]">
            {bloqueado ? "Seu pedido fica guardado aqui até a liberação." : "O pedido vai direto para a cozinha e entra na sua conta."}
          </p>
        </div>
      )}
      {story && (
        <StoryCardapio
          itens={CARDAPIO}
          categorias={CATEGORIAS}
          inicio={story}
          restaurante={RESTAURANTE}
          carrinho={estado.carrinho}
          mudar={mudar}
          onFechar={() => {
            const it = POR_CODE[story];
            if (it) setCat(it.cat);
            setStory(null);
          }}
        />
      )}
    </>
  );
}

/** Lista rápida do cardápio (alternativa aos stories): usada no celular e no totem. */
function ListaItens({ cat, carrinho, mudar, abrir, grande = false }: { cat: string; carrinho: Record<string, number>; mudar: (code: string, d: number) => void; abrir?: (code: string) => void; grande?: boolean }) {
  return (
    <ul className={cn("mt-3 grid gap-2", grande && "sm:grid-cols-2")}>
      {CARDAPIO.filter((i) => i.cat === cat).map((i) => {
        const q = carrinho[i.code] ?? 0;
        return (
          <li key={i.code} className={cn("flex items-center gap-3 rounded-2xl border p-3", q ? "border-[#0FC9BD] bg-[#f2fcfb]" : "border-[#021E34]/10")}>
            <button type="button" onClick={() => abrir?.(i.code)} aria-label={`Ver ${i.nome}`} className="flex min-w-0 flex-1 items-center gap-3 text-left">
              <span className={cn("relative shrink-0 overflow-hidden rounded-xl bg-[radial-gradient(circle_at_30%_20%,#0FC9BD,#021E34_80%)]", grande ? "h-20 w-20" : "h-14 w-14")}>
                {i.foto ? <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-[0.6rem] font-bold text-white">{i.modelo ? "3D" : i.nome.slice(0, 2)}</span>}
              </span>
              <span className="min-w-0">
                <span className={cn("block font-semibold", grande ? "text-base" : "text-sm")}>{i.nome}</span>
                {i.desc && <span className="block truncate text-xs text-[#5b6b78]">{i.desc}</span>}
                {i.alergenicos?.length ? <span className="block truncate text-[0.65rem] text-[#5b6b78]">Contém: {i.alergenicos.join(", ")}</span> : null}
                <span className="mt-0.5 block text-sm font-semibold tabular-nums">{brl(i.preco)}</span>
              </span>
            </button>
            {q > 0 ? (
              <div className="flex items-center gap-2">
                <button type="button" aria-label={`Menos um ${i.nome}`} onClick={() => mudar(i.code, -1)} className={cn("grid place-items-center rounded-full border border-[#021E34]/20", grande ? "h-11 w-11" : "h-9 w-9")}><Minus className="h-4 w-4" aria-hidden /></button>
                <span className="w-4 text-center text-sm font-semibold tabular-nums">{q}</span>
                <button type="button" aria-label={`Mais um ${i.nome}`} onClick={() => mudar(i.code, 1)} className={cn("grid place-items-center rounded-full bg-[#021E34] text-white", grande ? "h-11 w-11" : "h-9 w-9")}><Plus className="h-4 w-4" aria-hidden /></button>
              </div>
            ) : (
              <button type="button" aria-label={`Adicionar ${i.nome}`} onClick={() => mudar(i.code, 1)} className={cn("grid shrink-0 place-items-center rounded-full bg-[#021E34] text-white", grande ? "h-12 w-12" : "h-10 w-10")}><Plus className="h-5 w-5" aria-hidden /></button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function TelaPagar({ estado, agir, conta: c, irPedir }: { estado: EstadoSim; agir: (a: Acao) => void; conta: ReturnType<typeof calcularConta>; irPedir: () => void }) {
  const [etapa, setEtapa] = useState<"conta" | "metodos" | "gorjeta">("conta");
  const [outro, setOutro] = useState<string | null>(null);
  const ultimo = estado.ultimoPagamento;
  const outroCentavos = outro ? Math.round(Number(outro.replace(",", ".")) * 100) : 0;
  const outroErro =
    outro === null || outro === ""
      ? null
      : !Number.isFinite(outroCentavos) || outroCentavos < 200
        ? "O mínimo é R$ 2,00."
        : ultimo && outroCentavos > ultimo.valor
          ? `O máximo é ${brl(ultimo.valor)}, o valor pago.`
          : null;
  const itens = estado.pedidos.flatMap((p) => p.itens.map((i) => ({ ...i, status: p.status, pedido: p.id })));
  const nomeConta = estado.modalidade === "mesas" ? "conta da mesa" : "comanda";
  const pagar = (metodo: MetodoPay) => {
    agir({ tipo: "pagar_conta", metodo });
    setEtapa("gorjeta");
  };
  const gorjeta = (v: number | null) => {
    agir({ tipo: "gorjeta", valor: v });
    setOutro(null);
    setEtapa("conta");
  };

  if (!estado.pedidos.length)
    return (
      <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <ReceiptText className="h-8 w-8 text-[#5b6b78]" aria-hidden />
        <p className="mt-3 font-semibold">A {nomeConta} ainda está vazia</p>
        <p className="mt-1 text-sm text-[#5b6b78]">O que você pedir pelo celular entra aqui na hora.</p>
        <button type="button" onClick={irPedir} className="mt-5 min-h-11 w-full rounded-full border border-[#021E34]/20 text-sm font-semibold">Ver o cardápio</button>
      </div>
    );

  if (etapa === "metodos")
    return (
      <div className="flex flex-1 flex-col px-4 pt-4">
        <p className="text-sm text-[#5b6b78]">Pagar a {nomeConta}</p>
        <p className="font-display text-3xl tracking-[-0.03em] tabular-nums">{brl(c.aPagar)}</p>
        <ul className="mt-4 grid gap-2">
          {METODOS_PAY.map((mp) => (
            <li key={mp.id}>
              <button type="button" onClick={() => pagar(mp.id)} className="flex min-h-14 w-full items-center justify-between rounded-2xl border border-[#021E34]/12 px-4 text-left hover:border-[#0FC9BD]">
                <span><span className="block text-sm font-semibold">{mp.nome}</span><span className="block text-xs text-[#5b6b78]">{mp.desc}</span></span>
                <span aria-hidden>›</span>
              </button>
            </li>
          ))}
        </ul>
        <button type="button" onClick={() => setEtapa("conta")} className="mt-auto mb-4 min-h-11 text-sm font-medium text-[#5b6b78]">Voltar para a conta</button>
      </div>
    );

  if (etapa === "gorjeta" && ultimo)
    return (
      <div className="flex flex-1 flex-col px-4 pt-6">
        <div className="text-center">
          <span className="mx-auto grid h-12 w-12 place-items-center rounded-full bg-[#e6faf8] text-[#03665f]"><BadgeCheck className="h-6 w-6" aria-hidden /></span>
          <p className="mt-3 font-display text-xl tracking-[-0.02em]">{ultimo.metodo === "estabelecimento" ? "Pagamento no estabelecimento" : "Conta paga"}</p>
          <p className="text-sm text-[#5b6b78]">
            {ultimo.metodo === "estabelecimento" ? `${GARCOM} confirma ${brl(ultimo.valor)} no caixa.` : `${brl(ultimo.valor)} com ${METODOS_PAY.find((x) => x.id === ultimo.metodo)?.nome}. Simulação, nada foi cobrado.`}
          </p>
        </div>
        <div className="mt-5 rounded-2xl border border-[#021E34]/10 p-4">
          <p className="flex items-center gap-2 text-sm font-semibold"><HandCoins className="h-4 w-4" aria-hidden /> Quer deixar uma gorjeta extra para {GARCOM}?</p>
          <p className="mt-0.5 text-xs text-[#5b6b78]">Opcional e separada da conta. 70% vai para {GARCOM}.</p>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {[3, 5, 8].map((pct) => (
              <button key={pct} type="button" onClick={() => gorjeta(Math.round((ultimo.valor * pct) / 100))} className="relative min-h-14 rounded-xl border border-[#021E34]/15 text-sm font-semibold hover:border-[#0FC9BD]">
                {pct}%
                <span className="block text-[0.68rem] font-normal tabular-nums text-[#5b6b78]">{brl(Math.round((ultimo.valor * pct) / 100))}</span>
                {pct === 5 && <span className="absolute -top-2 left-1/2 -translate-x-1/2 rounded-full bg-[#0FC9BD] px-1.5 text-[0.6rem] font-semibold text-[#021E34]">Sugerida</span>}
              </button>
            ))}
          </div>
          {outro === null ? (
            <button type="button" onClick={() => setOutro("")} className="mt-2 min-h-11 w-full rounded-xl border border-dashed border-[#021E34]/20 text-sm font-medium">Outro valor</button>
          ) : (
            <form className="mt-2" onSubmit={(e) => { e.preventDefault(); if (!outroErro && outroCentavos >= 200) gorjeta(outroCentavos); }}>
              <label htmlFor="sim-outro" className="block text-xs font-medium text-[#5b6b78]">Outro valor (R$ 2,00 até {brl(ultimo.valor)})</label>
              <div className="mt-1 flex gap-2">
                <input id="sim-outro" inputMode="decimal" autoComplete="off" value={outro} onChange={(e) => setOutro(e.target.value.replace(/[^0-9,.]/g, ""))} aria-invalid={!!outroErro} aria-describedby={outroErro ? "sim-outro-erro" : undefined} placeholder="10,00" className="min-h-11 min-w-0 flex-1 rounded-xl border border-[#021E34]/20 px-3 text-sm tabular-nums" />
                <button type="submit" disabled={!!outroErro || outroCentavos < 200} className="min-h-11 rounded-xl bg-[#021E34] px-4 text-sm font-semibold text-white disabled:bg-[#9aa6af]">Dar gorjeta</button>
              </div>
              {outroErro && <p id="sim-outro-erro" className="mt-1 text-xs text-[#b42318]">{outroErro}</p>}
            </form>
          )}
        </div>
        <button type="button" onClick={() => gorjeta(null)} className="mt-3 min-h-11 text-sm font-medium text-[#5b6b78]">Agora não</button>
      </div>
    );

  return (
    <div className="flex flex-1 flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto px-4 pt-3">
        {c.aPagar === 0 && (
          <p role="status" className="mb-3 rounded-2xl bg-[#e6faf8] p-3 text-sm text-[#021E34]">Obrigado! A {nomeConta} está paga. Se pedir mais, o novo pedido entra nela.</p>
        )}
        <ul className="divide-y divide-[#021E34]/8">
          {itens.map((i) => (
            <li key={`${i.pedido}-${i.code}`} className="flex items-center justify-between gap-3 py-2.5 text-sm">
              <span className="min-w-0"><span className="block font-medium">{i.qtd}× {POR_CODE[i.code]?.nome}</span><span className="text-xs text-[#5b6b78]">Cozinha: {PASSOS_STATUS[i.status].rotulo.toLowerCase()}</span></span>
              <span className="tabular-nums">{brl((POR_CODE[i.code]?.preco ?? 0) * i.qtd)}</span>
            </li>
          ))}
        </ul>
      </div>
      <div className="border-t border-[#021E34]/10 bg-[#f6f8f9] p-4">
        <dl className="grid gap-1 text-sm">
          <div className="flex justify-between text-[#5b6b78]"><dt>Itens</dt><dd className="tabular-nums">{brl(c.subtotal)}</dd></div>
          <div className="flex justify-between text-[#5b6b78]"><dt>Serviço (10%)</dt><dd className="tabular-nums">{brl(c.servico)}</dd></div>
          {estado.pagoCentavos > 0 && <div className="flex justify-between text-[#5b6b78]"><dt>Já pago</dt><dd className="tabular-nums">− {brl(estado.pagoCentavos)}</dd></div>}
          <div className="flex justify-between pt-1 text-base font-semibold"><dt>{estado.pagoCentavos > 0 ? "Em aberto" : "Total"}</dt><dd className="tabular-nums">{brl(c.aPagar)}</dd></div>
        </dl>
        <button type="button" disabled={c.aPagar <= 0} onClick={() => setEtapa("metodos")} className="mt-3 min-h-12 w-full rounded-full bg-[#021E34] text-sm font-semibold text-white disabled:bg-[#9aa6af]">
          {c.aPagar > 0 ? `Pagar ${brl(c.aPagar)}` : `Paga · ${brl(c.total)}`}
        </button>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ balcão e retirada (tela da equipe) */

function TelaBalcao({ estado, agir, novaChave }: { estado: EstadoSim; agir: (a: Acao) => void; novaChave: () => string }) {
  const [cat, setCat] = useState(CATEGORIAS[0]!);
  const [nome, setNome] = useState("");
  const [ultima, setUltima] = useState<PedidoSim | null>(null);
  const linhas = linhasDoCarrinho(estado);
  const qtd = linhas.reduce((s, l) => s + l.qtd, 0);
  useEffect(() => {
    const u = estado.pedidos[estado.pedidos.length - 1];
    if (u && u !== ultima && qtd === 0 && estado.pedidos.length) setUltima(u);
  }, [estado.pedidos, qtd, ultima]);
  useEffect(() => setUltima(null), [estado.modalidade]);
  return (
    <div className="mx-auto w-full max-w-[36rem] rounded-[1.6rem] bg-[#021E34] p-2 shadow-[0_40px_80px_-40px_rgb(2_30_52/0.55)]">
      <div className="flex min-h-[34rem] flex-col rounded-[1.1rem] bg-white p-4 text-[#021E34]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[0.7rem] text-[#5b6b78]">{RESTAURANTE} · Lançamento Tipe</p>
            <p className="font-display text-lg tracking-[-0.02em]">{estado.modalidade === "retirada" ? "Balcão · retirada" : "Balcão / senha"}</p>
          </div>
          <span className="rounded-full bg-[#e6faf8] px-2.5 py-1 text-[0.7rem] font-medium text-[#03665f]">Caixa aberto</span>
        </div>
        {ultima && qtd === 0 ? (
          <div className="my-auto rounded-2xl border border-[#021E34]/10 p-5 text-center">
            <p className="text-sm text-[#5b6b78]">Senha</p>
            <p className="font-display text-6xl tabular-nums">{ultima.senha}</p>
            <p className="mt-1 text-sm">{ultima.cliente ? `${ultima.cliente} · ` : ""}{brl(totalLinhas(ultima.itens, POR_CODE))}</p>
            <p className="mt-2 text-xs text-[#5b6b78]">{ultima.status === "aguardando_pagamento" ? "Aguardando o caixa cobrar." : "Pago. A cozinha já recebeu."}</p>
            <button type="button" onClick={() => setUltima(null)} className="mt-4 min-h-11 w-full rounded-full bg-[#021E34] text-sm font-semibold text-white">Nova venda</button>
          </div>
        ) : (
          <>
            <div className="mt-3 flex gap-1.5 overflow-x-auto pb-1">
              {CATEGORIAS.map((c) => (
                <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={cn("shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold", cat === c ? "border-[#0FC9BD] bg-[#0FC9BD]" : "border-[#021E34]/15")}>{c}</button>
              ))}
            </div>
            <ListaItens cat={cat} carrinho={estado.carrinho} mudar={(code, d) => agir({ tipo: "item", code, delta: d })} grande />
            <div className="mt-auto border-t border-[#021E34]/10 pt-3">
              <label className="block text-xs font-medium text-[#5b6b78]">
                Nome do cliente (opcional)
                <input value={nome} onChange={(e) => setNome(e.target.value.slice(0, 40))} className="mt-1 h-10 w-full rounded-xl border border-[#021E34]/20 px-3 text-sm" />
              </label>
              <button
                type="button"
                disabled={qtd === 0}
                onClick={() => { agir({ tipo: "enviar", chave: novaChave(), cliente: nome.trim() || undefined }); setNome(""); }}
                className="mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#021E34] text-sm font-semibold text-white disabled:bg-[#9aa6af]"
              >
                <ShoppingBag className="h-4 w-4" aria-hidden /> Gerar senha e cobrar · {brl(totalLinhas(linhas, POR_CODE))}
              </button>
              <p className="mt-1 text-center text-[0.68rem] text-[#5b6b78]">A senha nasce agora; o caixa cobra e só então a cozinha recebe.</p>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ totem de autoatendimento */

type TelaTotem = "inicio" | "consumo" | "cardapio" | "revisao" | "pagamento" | "senha";

export function Totem({ estado, agir, novaChave, compacto = false }: { estado: EstadoSim; agir: (a: Acao) => void; novaChave: () => string; compacto?: boolean }) {
  const [tela, setTela] = useState<TelaTotem>("inicio");
  const [cat, setCat] = useState(CATEGORIAS[0]!);
  const [ultima, setUltima] = useState<PedidoSim | null>(null);
  const reduzido = useMovimentoReduzido();
  const linhas = linhasDoCarrinho(estado);
  const qtd = linhas.reduce((s, l) => s + l.qtd, 0);
  const total = totalLinhas(linhas, POR_CODE);
  const atual = ultima ? estado.pedidos.find((p) => p.id === ultima.id) ?? ultima : null;

  // Depois da senha, o totem limpa a sessão e volta ao início sozinho (inatividade).
  useEffect(() => {
    if (tela !== "senha" || reduzido) return;
    const t = setTimeout(() => { setTela("inicio"); setUltima(null); }, 15000);
    return () => clearTimeout(t);
  }, [tela, reduzido]);
  useEffect(() => { setTela("inicio"); setUltima(null); }, [estado.modalidade]);

  const reiniciar = () => {
    for (const l of linhas) agir({ tipo: "item", code: l.code, delta: -l.qtd });
    setTela("inicio");
    setUltima(null);
  };
  const B = ({ children, onClick, secundario = false, disabled = false, className }: { children: ReactNode; onClick: () => void; secundario?: boolean; disabled?: boolean; className?: string }) => (
    <button type="button" onClick={onClick} disabled={disabled} className={cn("min-h-14 rounded-2xl px-5 text-base font-semibold transition-colors disabled:opacity-50", secundario ? "border border-white/30 text-white hover:bg-white/10" : "bg-[#0FC9BD] text-[#021E34] hover:bg-[#3ad6cc]", className)}>
      {children}
    </button>
  );

  return (
    <div className={cn("mx-auto w-full", compacto ? "max-w-[16rem]" : "max-w-[24rem]")}>
      {/* Moldura do terminal vertical: identidade Tipe, sem marca de fabricante. */}
      <div className="rounded-[2rem] bg-[#0b1620] p-3 shadow-[0_50px_90px_-40px_rgb(2_30_52/0.7)] ring-1 ring-white/10">
        <div className={cn("relative flex flex-col overflow-hidden rounded-[1.4rem] bg-[#021E34] text-white", compacto ? "h-[28rem]" : "h-[42rem]")}>
          <div className="flex items-center justify-between px-5 pt-4 text-[0.7rem] text-white/60">
            <span>{RESTAURANTE}</span>
            <span className="rounded-full border border-white/20 px-2 py-0.5">Demonstração</span>
          </div>

          {tela === "inicio" && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              <span className="grid h-16 w-16 place-items-center rounded-full bg-[#0FC9BD] text-[#021E34]"><UtensilsCrossed className="h-8 w-8" aria-hidden /></span>
              <p className="mt-6 font-display text-3xl leading-tight tracking-[-0.03em]">Bem-vindo ao {RESTAURANTE}</p>
              <p className="mt-2 text-sm text-white/70">Toque para montar o seu pedido. Pagamento no caixa, em dinheiro ou na maquininha do estabelecimento.</p>
              <B onClick={() => setTela("consumo")} className="mt-8 w-full">Começar pedido</B>
              <p className="mt-6 text-[0.65rem] text-white/40">Tipe Order · Autoatendimento</p>
            </div>
          )}

          {tela === "consumo" && (
            <div className="flex flex-1 flex-col justify-center gap-3 px-6">
              <p className="font-display text-2xl tracking-[-0.03em]">Onde você vai comer?</p>
              <B onClick={() => { agir({ tipo: "consumo", valor: "aqui" }); setTela("cardapio"); }}>Comer aqui</B>
              <B onClick={() => { agir({ tipo: "consumo", valor: "levar" }); setTela("cardapio"); }} secundario>Para levar</B>
              <button type="button" onClick={reiniciar} className="mt-4 text-sm text-white/60">Cancelar</button>
            </div>
          )}

          {tela === "cardapio" && (
            <div className="flex flex-1 flex-col overflow-hidden">
              <div className="flex gap-1.5 overflow-x-auto px-4 pb-1 pt-3">
                {CATEGORIAS.map((c) => (
                  <button key={c} type="button" onClick={() => setCat(c)} aria-pressed={cat === c} className={cn("shrink-0 rounded-full px-4 py-2 text-sm font-semibold", cat === c ? "bg-[#0FC9BD] text-[#021E34]" : "bg-white/10 text-white")}>{c}</button>
                ))}
              </div>
              <ul className="flex-1 space-y-2 overflow-y-auto px-4 pb-2 pt-2">
                {CARDAPIO.filter((i) => i.cat === cat).map((i) => {
                  const q = estado.carrinho[i.code] ?? 0;
                  return (
                    <li key={i.code} className={cn("flex items-center gap-3 rounded-2xl bg-white p-2.5 text-[#021E34]", q && "ring-2 ring-[#0FC9BD]")}>
                      <span className="h-16 w-16 shrink-0 overflow-hidden rounded-xl bg-[#e6faf8]">{i.foto ? <img src={i.foto} alt="" loading="lazy" className="h-full w-full object-cover" /> : <span className="grid h-full w-full place-items-center text-xs font-bold text-[#03665f]">3D</span>}</span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-semibold leading-tight">{i.nome}</span>
                        {i.alergenicos?.length ? <span className="block truncate text-[0.62rem] text-[#5b6b78]">Contém: {i.alergenicos.join(", ")}</span> : null}
                        <span className="block text-sm font-semibold tabular-nums">{brl(i.preco)}</span>
                      </span>
                      {q > 0 ? (
                        <span className="flex items-center gap-1.5">
                          <button type="button" aria-label={`Menos um ${i.nome}`} onClick={() => agir({ tipo: "item", code: i.code, delta: -1 })} className="grid h-11 w-11 place-items-center rounded-full border border-[#021E34]/20"><Minus className="h-4 w-4" aria-hidden /></button>
                          <span className="w-4 text-center text-sm font-semibold tabular-nums">{q}</span>
                          <button type="button" aria-label={`Mais um ${i.nome}`} onClick={() => agir({ tipo: "item", code: i.code, delta: 1 })} className="grid h-11 w-11 place-items-center rounded-full bg-[#021E34] text-white"><Plus className="h-4 w-4" aria-hidden /></button>
                        </span>
                      ) : (
                        <button type="button" aria-label={`Adicionar ${i.nome}`} onClick={() => agir({ tipo: "item", code: i.code, delta: 1 })} className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-[#021E34] text-white"><Plus className="h-5 w-5" aria-hidden /></button>
                      )}
                    </li>
                  );
                })}
              </ul>
              <div className="flex items-center gap-2 border-t border-white/10 p-3">
                <button type="button" onClick={reiniciar} className="min-h-12 rounded-2xl px-4 text-sm text-white/70">Cancelar</button>
                <B onClick={() => setTela("revisao")} disabled={qtd === 0} className="flex-1">
                  <span className="flex items-center justify-center gap-2"><ShoppingBag className="h-5 w-5" aria-hidden /> Ver pedido ({qtd}) · {brl(total)}</span>
                </B>
              </div>
            </div>
          )}

          {tela === "revisao" && (
            <div className="flex flex-1 flex-col px-5 pt-3">
              <p className="font-display text-2xl tracking-[-0.03em]">Confira o pedido</p>
              <p className="text-xs text-white/60">{estado.consumo === "levar" ? "Para levar" : "Comer aqui"}</p>
              <ul className="mt-3 flex-1 space-y-2 overflow-y-auto">
                {linhas.map((l) => (
                  <li key={l.code} className="flex items-center justify-between gap-2 rounded-xl bg-white/10 px-3 py-2 text-sm">
                    <span>{l.qtd}× {POR_CODE[l.code]?.nome}</span>
                    <span className="flex items-center gap-2">
                      <span className="tabular-nums">{brl((POR_CODE[l.code]?.preco ?? 0) * l.qtd)}</span>
                      <button type="button" aria-label={`Remover ${POR_CODE[l.code]?.nome}`} onClick={() => agir({ tipo: "item", code: l.code, delta: -l.qtd })} className="grid h-9 w-9 place-items-center rounded-full bg-white/10"><Minus className="h-4 w-4" aria-hidden /></button>
                    </span>
                  </li>
                ))}
              </ul>
              <div className="border-t border-white/10 py-3">
                <div className="flex items-center justify-between text-lg font-semibold"><span>Total</span><span className="tabular-nums">{brl(total)}</span></div>
                <div className="mt-3 grid grid-cols-[auto_1fr] gap-2">
                  <B onClick={() => setTela("cardapio")} secundario>Voltar</B>
                  <B onClick={() => setTela("pagamento")} disabled={qtd === 0}>Confirmar</B>
                </div>
              </div>
            </div>
          )}

          {tela === "pagamento" && (
            <div className="flex flex-1 flex-col px-5 pt-3">
              <p className="font-display text-2xl tracking-[-0.03em]">Como você quer pagar?</p>
              <p className="text-sm text-white/70">Total <span className="font-semibold tabular-nums">{brl(total)}</span></p>
              <div className="mt-4 grid gap-2">
                <B onClick={() => { agir({ tipo: "enviar", chave: novaChave() }); setTela("senha"); }}>Pagar no caixa com a senha</B>

              </div>
              <p className="mt-3 text-xs text-white/50">O pedido fica registrado e aguardando pagamento. Só vai para a cozinha depois de pago.</p>
              <button type="button" onClick={() => setTela("revisao")} className="mt-auto mb-4 text-sm text-white/60">Voltar</button>
            </div>
          )}

          {tela === "senha" && (
            <div className="flex flex-1 flex-col items-center justify-center px-6 text-center">
              {(() => {
                const p = atual ?? estado.pedidos[estado.pedidos.length - 1];
                if (p && !ultima) setUltima(p);
                return p ? (
                  <>
                    <p className="text-sm text-white/70">Sua senha</p>
                    <p className="font-display text-7xl tabular-nums text-[#0FC9BD]">{p.senha}</p>
                    <p className="mt-2 text-sm">{brl(totalLinhas(p.itens, POR_CODE))} · {p.consumo === "levar" ? "para levar" : "comer aqui"}</p>
                    <p className={cn("mt-4 rounded-full px-3 py-1 text-xs font-medium", TOM_STATUS[p.status])}>
                      {p.status === "aguardando_pagamento" ? "Pague no caixa para começar o preparo" : PASSOS_STATUS[p.status].rotulo}
                    </p>
                    <p className="mt-5 text-xs text-white/50">Acompanhe pelo painel. A tela volta ao início sozinha e nenhum dado seu fica no totem.</p>
                  </>
                ) : null;
              })()}
              <B onClick={() => { setTela("inicio"); setUltima(null); }} secundario className="mt-6 w-full">Novo pedido</B>
            </div>
          )}
        </div>
      </div>
      <div aria-hidden className="mx-auto h-6 w-24 rounded-b-xl bg-[#0b1620]/80" />
    </div>
  );
}

/* ------------------------------------------------------------------ delivery (pedidos externos) */

function Recebimento({ estado, agir, novaChave }: { estado: EstadoSim; agir: (a: Acao) => void; novaChave: () => string }) {
  const n = estado.pedidos.length;
  const prox = PEDIDOS_EXTERNOS[n % PEDIDOS_EXTERNOS.length]!;
  return (
    <div className="rounded-[1.6rem] border border-border bg-card p-5">
      <p className="font-display text-xl tracking-[-0.02em]">Canais de entrada</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Simule um pedido para entrega: confira a origem, acompanhe o preparo na cozinha e veja a passagem para a expedição.
      </p>

      <button
        type="button"
        onClick={() => agir({ tipo: "receber_externo", chave: novaChave(), origem: prox.origem, cliente: prox.cliente, itens: prox.itens })}
        className="mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-full bg-[#021E34] text-sm font-semibold text-white"
      >
        <Truck className="h-4 w-4" aria-hidden /> Receber pedido de exemplo ({prox.origem})
      </button>
    </div>
  );
}
