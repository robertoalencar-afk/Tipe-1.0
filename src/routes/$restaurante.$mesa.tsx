import { createFileRoute, Link } from "@tanstack/react-router";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HandCoins,
  Heart,
  QrCode,
  ReceiptText,
  Smartphone,
  Star,
  Users,
  WalletCards,
} from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { SplitPicker } from "@/components/tipe/SplitPicker";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPublicTable } from "@/lib/tipe/pdv.functions";
import { createPayment, getPaymentConfig, getPaymentStatus, reopenClosedTable, type SharedPayment } from "@/lib/tipe/payments.functions";
import { CardFields } from "@/components/tipe/CardFields";
import { cardValid, tokenizeCard, type CardInput } from "@/lib/tipe/pagarme-client";
import mascotThanks from "@/assets/mascot-thanks.webp";
import mascotRating from "@/assets/mascot-rating.webp";
import mascotWaiting from "@/assets/mascot-waiting.webp";
import mascotTableClosed from "@/assets/mascot-table-closed.webp";

export const Route = createFileRoute("/$restaurante/$mesa")({
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({
    meta: [
      { title: "Sua mesa — TIPE" },
      { name: "description", content: "Confira os pedidos da mesa, pague sua parte e avalie o atendimento com TIPE." },
      { property: "og:title", content: "Sua mesa — TIPE" },
      { property: "og:description", content: "Confira os pedidos da mesa e pague pelo celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MesaPage,
});

type Etapa =
  | "carregando"
  | "identificacao"
  | "conta"
  | "pagamento-conta"
  | "conta-confirmada"
  | "conta-pendente"
  | "pix"
  | "avaliacao"
  | "gorjeta"
  | "pagamento-gorjeta"
  | "mesa-encerrada"
  | "fim";
type Aba = "conta" | "atividade";
type Metodo = "pix" | "card" | "apple_pay" | "google_pay" | "at_establishment";
type MetodoEstabelecimento = "cash" | "card_terminal";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const metodos: Array<{ id: Metodo; label: string }> = [
  { id: "pix", label: "Pix" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "google_pay", label: "Google Pay" },
  { id: "card", label: "Cartão" },
  { id: "at_establishment", label: "Pagar no estabelecimento" },
];

const metodoDetalhes: Record<Metodo, { descricao: string; Icone: typeof CreditCard }> = {
  pix: { descricao: "Confirmação rápida pelo seu banco", Icone: QrCode },
  apple_pay: { descricao: "Use a carteira do seu dispositivo Apple", Icone: Smartphone },
  google_pay: { descricao: "Use a carteira do seu dispositivo Android", Icone: WalletCards },
  card: { descricao: "Crédito ou débito", Icone: CreditCard },
  at_establishment: { descricao: "Dinheiro ou maquininha", Icone: HandCoins },
};

const formatPaymentDate = (value: string) => new Intl.DateTimeFormat("pt-BR", {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
}).format(new Date(value));

const customerStorageKey = (restaurantId: string, tableId: string) =>
  `tipe:cliente:${restaurantId}:${tableId}`;
const hasFirstAndLastName = (value: string) => value.trim().split(/\s+/).length >= 2;
const EPSILON = 0.0001;
const roundPortion = (value: number) => Math.round(value * 10000) / 10000;
const formatPortion = (value: number) => {
  const rounded = roundPortion(value);
  const whole = Math.floor(rounded + EPSILON);
  const fraction = rounded - whole;
  const fractionLabel = Math.abs(fraction - 0.5) < EPSILON ? "metade" : Math.abs(fraction - 1 / 3) < EPSILON ? "1/3" : Math.abs(fraction - 0.25) < EPSILON ? "1/4" : fraction > EPSILON ? `${Math.round(fraction * 100)}%` : "";
  if (!whole) return fractionLabel || "0";
  return fractionLabel ? `${whole} unidade${whole === 1 ? "" : "s"} + ${fractionLabel}` : `${whole} unidade${whole === 1 ? "" : "s"}`;
};

function MesaPage() {
  useEffect(() => {
    for (const src of [mascotWaiting, mascotThanks, mascotRating, mascotTableClosed]) { const img = new Image(); img.src = src; }
  }, []);
  const { restaurante, mesa: codigoMesa } = Route.useParams();
  const { t: tokenMesa } = Route.useSearch();
  type ItemMesa = { id: string; nome: string; qtd: number; preco: number; data: string; hora: string };
  const [metodosAceitos, setMetodosAceitos] = useState<Metodo[] | null>(null);
  const [dados, setDados] = useState<{ restaurante: string; mesa: string; garcom: string; itens: ItemMesa[] }>({ restaurante: "", mesa: "", garcom: "", itens: [] });
  const [erroMesa, setErroMesa] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [nome, setNome] = useState("");
  const [aba, setAba] = useState<Aba>("conta");
  const [qtds, setQtds] = useState<Record<string, number>>(() =>
    Object.fromEntries(dados.itens.map((item) => [item.id, 0])),
  );
  const [dividindo, setDividindo] = useState<string | null>(null);
  const [metodoConta, setMetodoConta] = useState<Metodo | null>(null);
  const [metodoEstabelecimento, setMetodoEstabelecimento] = useState<MetodoEstabelecimento | null>(null);
  const [valorDinheiro, setValorDinheiro] = useState("");
  const [metodoGorjeta, setMetodoGorjeta] = useState<Metodo | null>(null);
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [gorjetaExtra, setGorjetaExtra] = useState(0);
  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [disponiveis, setDisponiveis] = useState<Record<string, number>>(() => Object.fromEntries(dados.itens.map((item) => [item.id, item.qtd])));
  const [pagamentos, setPagamentos] = useState<SharedPayment[]>([]);
  const [mesaSincronizada, setMesaSincronizada] = useState(false);
  const [sessaoMesa, setSessaoMesa] = useState("");
  const [cartao, setCartao] = useState<CardInput>({ number: "", holder: "", exp: "", cvv: "" });
  const [chavePublica, setChavePublica] = useState<string | null>(null);
  const [pix, setPix] = useState<{ id: string; code: string; qrUrl?: string | undefined; tipo: "conta" | "gorjeta" } | null>(null);
  useEffect(() => { getPaymentConfig().then((c) => setChavePublica(c.publicKey)).catch(() => undefined); }, []);
  const chavePagamento = useRef<string | null>(null);

  useEffect(() => {
    try {
      const nomeSalvo = window.localStorage.getItem(customerStorageKey(restaurante, codigoMesa))?.trim() ?? "";
      if (hasFirstAndLastName(nomeSalvo)) {
        setNome(nomeSalvo);
        setEtapa("conta");
        return;
      }
    } catch {
      // Se o armazenamento do navegador estiver indisponível, a identificação segue normalmente.
    }
    setEtapa("identificacao");
  }, [codigoMesa, restaurante]);

  const atualizarMesa = useCallback(async () => {
    try {
      const estado = await getPublicTable({ data: { slug: restaurante, code: codigoMesa, token: tokenMesa } });
      if ("error" in estado) {
        setErroMesa(estado.error === "invalid_token" ? "Este QR Code foi atualizado pelo restaurante. Leia o código que está na mesa agora." : estado.error === "inactive" ? "Esta mesa está desativada no momento. Chame o garçom." : "Mesa não encontrada. Confira o QR Code da mesa.");
        return;
      }
      const itensMesa: ItemMesa[] = estado.items.map((i) => {
        const d = new Date(i.ordered_at);
        return { id: i.item_code, nome: i.item_name, qtd: i.ordered_quantity, preco: i.unit_price, data: d.toLocaleDateString("pt-BR"), hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }) };
      });
      setMetodosAceitos(estado.billMethods as Metodo[]);
      setDados({ restaurante: estado.restaurantName, mesa: estado.tableNumber, garcom: estado.waiterName, itens: itensMesa });
      setDisponiveis(Object.fromEntries(estado.items.map((item) => [item.item_code, roundPortion(Math.max(0, item.ordered_quantity - item.reserved_portion - item.paid_portion))])));
      setPagamentos(estado.payments);
      setSessaoMesa(estado.session);
      setQtds((atuais) => Object.fromEntries(itensMesa.map((item) => {
        const shared = estado.items.find((candidate) => candidate.item_code === item.id);
        const available = roundPortion(Math.max(0, (shared?.ordered_quantity ?? item.qtd) - (shared?.reserved_portion ?? 0) - (shared?.paid_portion ?? 0)));
        return [item.id, Math.min(atuais[item.id] ?? 0, available)];
      })));
      setMesaSincronizada(true);
    } catch {
      setErroPagamento("Não foi possível atualizar a mesa agora.");
    }
  }, [codigoMesa, tokenMesa, restaurante]);

  useEffect(() => {
    void atualizarMesa();
    const intervalo = window.setInterval(() => void atualizarMesa(), 5000);
    return () => window.clearInterval(intervalo);
  }, [atualizarMesa]);

  const subtotal = useMemo(
    () => dados.itens.reduce((soma, item) => soma + item.preco * (qtds[item.id] ?? 0), 0),
    [dados.itens, qtds],
  );
  const servico = +(subtotal * 0.1).toFixed(2);
  const totalConta = +(subtotal + servico).toFixed(2);
  const mesaEncerrada = mesaSincronizada
    && dados.itens.length > 0
    && dados.itens.every((item) => (disponiveis[item.id] ?? item.qtd) <= EPSILON)
    && pagamentos.every((pagamento) => pagamento.status !== "pending");
  const pagamentoPresencialPendente = pagamentos.find((pagamento) => pagamento.status === "pending" && pagamento.establishment_method);
  const etapaVisivel: Etapa = mesaEncerrada && ["carregando", "identificacao", "conta", "pagamento-conta", "conta-pendente"].includes(etapa)
    ? "mesa-encerrada"
    : etapa;

  useEffect(() => {
    if (!mesaEncerrada) return;
    let ativo = true;
    const verificar = async () => {
      try {
        const r = await reopenClosedTable({ data: { restaurantId: restaurante, tableId: String(dados.mesa), session: sessaoMesa } });
        if (!ativo || !r.reopened) return;
      } catch { return; }
    };
    void verificar();
    const timer = window.setInterval(() => void verificar(), 15000);
    return () => { ativo = false; window.clearInterval(timer); };
  }, [mesaEncerrada, restaurante, dados.mesa, sessaoMesa]);

  const [estavaEncerrada, setEstavaEncerrada] = useState(false);
  useEffect(() => {
    if (mesaEncerrada) { setEstavaEncerrada(true); return; }
    if (estavaEncerrada && mesaSincronizada) {
      // Nova conta aberta: limpa a identificação e recomeça.
      setEstavaEncerrada(false);
      try { window.localStorage.removeItem(customerStorageKey(restaurante, codigoMesa)); } catch { /* ignora */ }
      setNome(""); setEstrelas(0); setComentario(""); setGorjetaExtra(0); setAba("conta");
      setEtapa("identificacao");
    }
  }, [mesaEncerrada, estavaEncerrada, mesaSincronizada, restaurante, dados.mesa]);

  function identificar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nomeIdentificado = nome.trim();
    if (!hasFirstAndLastName(nomeIdentificado)) return;
    window.localStorage.setItem(customerStorageKey(restaurante, codigoMesa), nomeIdentificado);
    setNome(nomeIdentificado);
    setEtapa("conta");
  }

  function setQtd(id: string, valor: number, maximo: number) {
    setQtds((atuais) => ({ ...atuais, [id]: roundPortion(Math.max(0, Math.min(maximo, valor))) }));
  }

  function setFracao(id: string, divisor: 2 | 3 | 4, maximo: number) {
    const inteiros = Math.floor(qtds[id] ?? 0);
    setQtd(id, inteiros + Math.min(1 / divisor, Math.max(0, maximo - inteiros)), maximo);
    setDividindo(null);
  }

  async function processarPagamento(tipo: "conta" | "gorjeta") {
    const metodo = tipo === "conta" ? metodoConta : metodoGorjeta;
    const valor = tipo === "conta" ? totalConta : gorjetaExtra;
    if (!metodo || valor <= 0) return;
    setPagando(true);
    setErroPagamento(null);
    // Mesma chave em cliques repetidos/reenvios: o servidor não duplica o pagamento.
    if (!chavePagamento.current) chavePagamento.current = `${tipo}_${crypto.randomUUID().replace(/-/g, "")}`;
    try {
      const cardToken = metodo === "card" && chavePublica ? await tokenizeCard(chavePublica, cartao) : undefined;
      const resultado = await createPayment({
        data: {
          cardToken,
          method: metodo,
          tip: tipo === "gorjeta" ? gorjetaExtra : 0,
          tableId: String(dados.mesa),
          restaurantId: restaurante,
          idempotencyKey: chavePagamento.current,
          session: sessaoMesa,
          customerName: nome.trim(),
          itemQuantities: tipo === "conta" ? qtds : {},
          target: tipo === "conta" ? "restaurant" : "tipe",
          establishmentMethod: tipo === "conta" && metodo === "at_establishment" ? metodoEstabelecimento ?? undefined : undefined,
          cashReceived: tipo === "conta" && metodo === "at_establishment" && metodoEstabelecimento === "cash" ? Number(valorDinheiro.replace(",", ".")) : undefined,
        },
      });
      chavePagamento.current = null;
      await atualizarMesa();
      if (resultado.provider === "pagarme" && resultado.status === "pending" && resultado.pixCode) {
        setPix({ id: resultado.id, code: resultado.pixCode, qrUrl: resultado.pixQrUrl, tipo });
        setEtapa("pix");
        return;
      }
      setEtapa(tipo === "conta" ? (resultado.status === "approved" ? "conta-confirmada" : "conta-pendente") : "fim");
    } catch (error) {
      const msg = error instanceof Error ? error.message : "";
      if (/não está mais disponível|acabou de ser pago|foi atualizada/.test(msg)) chavePagamento.current = null;
      setErroPagamento(msg || "Não foi possível concluir o pagamento");
    } finally {
      setPagando(false);
    }
  }

  useEffect(() => {
    if (etapa !== "pix" || !pix) return;
    const t = window.setInterval(async () => {
      try {
        const r = await getPaymentStatus({ data: { restaurantId: restaurante, tableId: String(dados.mesa), session: sessaoMesa, paymentId: pix.id } });
        if (r.status === "approved") { await atualizarMesa(); setEtapa(pix.tipo === "conta" ? "conta-confirmada" : "fim"); }
        else if (r.status !== "pending") { setErroPagamento("O Pix expirou ou não foi concluído. Tente novamente."); setEtapa(pix.tipo === "conta" ? "pagamento-conta" : "pagamento-gorjeta"); }
      } catch { /* tenta de novo */ }
    }, 4000);
    return () => window.clearInterval(t);
  }, [etapa, pix, restaurante, dados.mesa, sessaoMesa, atualizarMesa]);

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-background">
      <header className="mb-5 bg-secondary px-5 pb-5 pt-6 text-secondary-foreground">
        <div className="flex items-center justify-between"><TipeLogo className="h-10" />{etapaVisivel !== "identificacao" && etapaVisivel !== "carregando" && <span className="rounded-full bg-primary/15 px-3 py-1 text-xs font-bold text-primary">Mesa {dados.mesa}</span>}</div>
        {etapaVisivel !== "identificacao" && etapaVisivel !== "carregando" && <p className="mt-4 text-sm text-secondary-foreground/70">{dados.restaurante}</p>}
        {etapaVisivel !== "identificacao" && etapaVisivel !== "carregando" && <div className="mt-4 flex gap-2" aria-hidden>{["conta", "pagamento-conta", "fim"].map((passo, indice) => <span key={passo} className={`h-1.5 flex-1 rounded-full ${(["conta", "pagamento-conta", "pix", "conta-pendente", "conta-confirmada", "avaliacao", "gorjeta", "pagamento-gorjeta", "fim"].indexOf(etapaVisivel) >= indice) ? "bg-primary" : "bg-secondary-foreground/20"}`} />)}</div>}
      </header>

      {erroMesa && (
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <h1 className="font-display text-2xl font-bold">Não foi possível abrir a mesa</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{erroMesa}</p>
        </main>
      )}

      {!erroMesa && etapaVisivel === "carregando" && (
        <main className="flex flex-1 items-center justify-center px-6 pb-24" aria-label="Carregando mesa">
          <span className="h-8 w-8 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none" />
        </main>
      )}

      {etapaVisivel === "identificacao" && (
        <main className="flex flex-1 flex-col justify-center px-6 pb-24">
          <p className="text-sm font-semibold text-primary">Mesa {dados.mesa}</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Olá! Qual é o seu nome?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Seu nome identifica os itens que você escolher pagar nesta mesa.
          </p>
          <form onSubmit={identificar} className="mt-8">
            <label htmlFor="nome" className="text-sm font-semibold">Nome e sobrenome</label>
            <Input
              id="nome"
              autoFocus
              autoComplete="name"
              maxLength={40}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Digite seu nome e sobrenome"
              className="mt-2 h-12 rounded-full bg-card px-5"
            />
            <Button type="submit" disabled={!hasFirstAndLastName(nome)} className="mt-5 h-12 w-full rounded-full font-display text-base font-bold">
              Ver minha mesa <ChevronRight />
            </Button>
          </form>
        </main>
      )}

      {etapaVisivel === "conta" && (
        <main className="flex flex-1 flex-col px-5 pb-8">
           <p className="text-xs font-semibold text-primary">SUA MESA</p>
           <h1 className="mt-1 font-display text-2xl font-extrabold">Olá, {nome.trim()}.</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {dados.garcom ? <>Você está sendo atendido por <strong className="text-foreground">{dados.garcom}</strong>.</> : "Bem-vindo! Seus pedidos aparecem aqui assim que forem lançados."}
            </p>

          <div className="mb-6 mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            <Button variant={aba === "conta" ? "outline" : "ghost"} onClick={() => setAba("conta")} className="h-10 rounded-full shadow-none">
              <ReceiptText /> Conta
             </Button>
            <Button variant={aba === "atividade" ? "outline" : "ghost"} onClick={() => setAba("atividade")} className="h-10 rounded-full shadow-none">
              <ClipboardList /> Atividade
            </Button>
          </div>

          {aba === "conta" && (
            <>
              {dados.itens.some((item) => (disponiveis[item.id] ?? item.qtd) > 0) && (() => {
                const tudoSelecionado = dados.itens.every((item) => Math.abs((qtds[item.id] ?? 0) - (disponiveis[item.id] ?? item.qtd)) < EPSILON);
                return (
                  <Button
                    variant={tudoSelecionado ? "default" : "outline"}
                    onClick={() => setQtds(Object.fromEntries(dados.itens.map((item) => [item.id, tudoSelecionado ? 0 : Math.max(0, disponiveis[item.id] ?? item.qtd)])))}
                    className="mb-3 h-12 w-full rounded-full font-display text-base font-bold"
                  >
                    <ReceiptText /> {tudoSelecionado ? "Limpar seleção" : "Pagar a conta inteira"}
                  </Button>
                );
              })()}
              {dados.itens.some((item) => (disponiveis[item.id] ?? item.qtd) > 0) && <><h2 className="font-display text-lg font-extrabold">O que você vai pagar?</h2><p className="mb-4 mt-1 text-sm text-muted-foreground">Escolha quanto de cada item ficará com você.</p></>}
              <ul className="flex flex-col gap-3">
                {dados.itens.filter((item) => (disponiveis[item.id] ?? item.qtd) > 0).map((item) => {
                  const quantidade = qtds[item.id] ?? 0;
                  const disponivel = disponiveis[item.id] ?? item.qtd;
                  return (
                    <li key={item.id} className={`rounded-2xl border bg-card p-4 shadow-sm transition ${quantidade > 0 ? "border-2 border-primary bg-primary/10" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <span className={`mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full border ${quantidade > 0 ? "border-primary bg-primary text-primary-foreground" : "border-border"}`}>{quantidade > 0 && <Check className="h-3.5 w-3.5" />}</span>
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{item.nome}</p>
                           <p className="mt-1 text-xs text-muted-foreground">{money(item.preco)} cada · {formatPortion(disponivel)} disponível</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold">{money(item.preco * quantidade)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <span className="text-xs text-muted-foreground">Quantidade a pagar</span>
                        <select
                          value={quantidade}
                          onChange={(event) => setQtd(item.id, Number(event.target.value), disponivel)}
                          className="h-10 min-w-20 rounded-md border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-1 focus:ring-ring"
                          aria-label={`Quantidade de ${item.nome}`}
                        >
                          {Math.abs(quantidade - Math.round(quantidade)) > EPSILON && <option value={quantidade}>{formatPortion(quantidade)}</option>}
                          {Array.from({ length: Math.floor(disponivel) + 1 }, (_, numero) => (
                            <option key={numero} value={numero}>{numero}</option>
                          ))}
                        </select>
                      </div>
                      <div className="mt-2 flex min-h-9 items-center justify-end">
                        {dividindo === item.id ? (
                          <SplitPicker itemName={item.nome} unitPrice={item.preco} onPick={(c) => { if (c === "rest") { setQtd(item.id, disponivel, disponivel); setDividindo(null); } else setFracao(item.id, c, disponivel); }} />
                        ) : (
                          <Button type="button" size="sm" variant="ghost" onClick={() => setDividindo(item.id)} className="text-primary">Dividir este item</Button>
                        )}
                      </div>
                      {quantidade > 0 && <p className="mt-1 text-right text-xs font-semibold text-primary">Você paga {formatPortion(quantidade)}</p>}
                    </li>
                  );
                })}
              </ul>
              {dados.itens.every((item) => (disponiveis[item.id] ?? item.qtd) <= 0) && <p className="py-10 text-center text-sm text-muted-foreground">{dados.itens.length === 0 ? "Nenhum pedido ainda. Chame o garçom para fazer seu pedido." : "Não há itens disponíveis para pagamento."}</p>}

              <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm shadow-sm">
                <ResumoLinha label="Subtotal selecionado" valor={subtotal} />
                <ResumoLinha label="Serviço do restaurante (10%)" valor={servico} className="mt-2" />
                <ResumoLinha label="Total da conta" valor={totalConta} className="mt-3 border-t border-border pt-3 font-display text-base font-extrabold" />
              </div>
              <Button disabled={subtotal <= 0} onClick={() => setEtapa("pagamento-conta")} className="mt-5 h-12 w-full rounded-full font-display text-base font-bold">
                Continuar para pagamento <ChevronRight />
              </Button>
            </>
          )}

          {aba === "atividade" && (
            <section aria-labelledby="atividade-title">
              <h2 id="atividade-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Registro dos pedidos</h2>
              <ol className="border-l border-border pl-4">
                {dados.itens.map((item) => (
                  <li key={item.id} className="relative border-b border-border py-4 first:pt-1 last:border-0">
                    <span className="absolute -left-[1.18rem] top-5 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex justify-between gap-3">
                      <div><p className="font-medium">{item.qtd}× {item.nome}</p></div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground"><p>{item.data}</p><p>{item.hora}</p></div>
                    </div>
                  </li>
                ))}
              </ol>
               {pagamentos.length > 0 && (
                 <div className="mt-6 border-t border-border pt-5">
                   <h3 className="mb-2 text-sm font-semibold">Pagamentos</h3>
                    {pagamentos.map((pagamento) => (
                      <div key={pagamento.id} className="border-b border-border py-4 text-sm last:border-0">
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold">{pagamento.customer_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">{formatPaymentDate(pagamento.created_at)}</p>
                             {pagamento.establishment_method && <p className="mt-1 text-xs font-semibold text-foreground">{pagamento.establishment_method === "cash" ? `Dinheiro${pagamento.change_due ? ` · Troco ${money(pagamento.change_due)}` : " · Sem troco"}` : "Maquininha"}</p>}
                          </div>
                          <div className="text-right">
                            <p className="font-semibold">{money(pagamento.amount)}</p>
                            <p className={pagamento.status === "pending" ? "text-xs font-semibold text-highlight" : "text-xs font-semibold text-primary"}>{pagamento.status === "pending" ? "Pendente" : "Confirmado"}</p>
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
                          {Object.entries(pagamento.item_quantities ?? {}).filter(([, quantidade]) => quantidade > 0).map(([itemId, quantidade]) => (
                             <li key={itemId}>{formatPortion(quantidade)} de {dados.itens.find((item) => item.id === itemId)?.nome ?? "Item da conta"}</li>
                          ))}
                        </ul>
                     </div>
                   ))}
                 </div>
               )}
            </section>
          )}
        </main>
      )}

      {etapaVisivel === "pagamento-conta" && (
        <Pagamento
          titulo="Pagamento da conta"
          descricao="Este pagamento corresponde apenas aos itens que você escolheu. Após a confirmação, a conta da mesa será atualizada automaticamente."
          rotuloValor="Total da conta"
          valor={totalConta}
          metodo={metodoConta}
          setMetodo={setMetodoConta}
          pagando={pagando}
          erro={erroPagamento}
          voltar={() => setEtapa("conta")}
          pagar={() => processarPagamento("conta")}
           permitirEstabelecimento
          metodosAceitos={metodosAceitos ?? undefined}
          metodoEstabelecimento={metodoEstabelecimento}
          setMetodoEstabelecimento={setMetodoEstabelecimento}
          valorDinheiro={valorDinheiro}
          setValorDinheiro={setValorDinheiro}
        />
      )}

      {etapa === "pix" && pix && (
        <TelaCentral>
          <p className="text-sm font-semibold text-primary">Pix gerado</p>
          <h1 className="mt-2 text-2xl font-bold">Pague com Pix</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Abra o app do seu banco e use o QR Code ou o código copia e cola. A confirmação aparece aqui sozinha.</p>
          {pix.qrUrl && <img src={pix.qrUrl} alt="QR Code do Pix" className="mx-auto mt-5 h-52 w-52 rounded-lg bg-card p-2" />}
          <p className="mt-4 w-full break-all rounded-lg border border-border bg-card p-3 text-xs">{pix.code}</p>
          <Button onClick={() => { void navigator.clipboard.writeText(pix.code); }} className="mt-4 h-12 w-full rounded-lg text-base font-bold">Copiar código Pix</Button>
          <p className="mt-3 flex items-center gap-2 text-xs text-muted-foreground"><span className="h-3 w-3 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none" />Aguardando o pagamento…</p>
        </TelaCentral>
      )}

      {etapaVisivel === "conta-pendente" && (
        <TelaCentral>
          <img src={mascotWaiting} alt="Mascote TIPE aguardando" className="mx-auto mb-3 h-44 w-44 object-contain" />
          <p className="text-sm font-semibold text-highlight">Aguardando confirmação</p>
          <h1 className="mt-2 text-2xl font-bold">Pagamento no estabelecimento</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{pagamentoPresencialPendente?.establishment_method === "cash" ? `Prepare o dinheiro. O garçom tratará do seu troco${pagamentoPresencialPendente.change_due !== null && pagamentoPresencialPendente.change_due !== undefined ? ` de ${money(pagamentoPresencialPendente.change_due)}` : ""} em breve.` : "O garçom irá em instantes até sua mesa com a maquininha."}</p>
          <Button onClick={() => setEtapa("avaliacao")} className="mt-8 h-12 w-full rounded-lg text-base font-bold">Avaliar atendimento <ChevronRight /></Button>
          <Button variant="ghost" onClick={() => { setEtapa("conta"); setAba("atividade"); }} className="mt-2 h-11">Ver atividade da mesa</Button>
        </TelaCentral>
      )}

      {etapaVisivel === "conta-confirmada" && (
        <TelaCentral>
          <IconeSucesso />
          <p className="text-sm font-semibold text-primary">Conta paga</p>
          <h1 className="mt-2 text-2xl font-bold">Pagamento confirmado!</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{money(totalConta)} enviados ao {dados.restaurante}.</p>
          {mesaEncerrada && <p className="mt-2 text-center text-sm font-semibold text-primary">Este foi o último pagamento: a mesa está encerrada.</p>}
          <Button onClick={() => setEtapa("avaliacao")} className="mt-8 h-12 w-full rounded-lg text-base font-bold">Avaliar atendimento <ChevronRight /></Button>
          {mesaEncerrada && <Button variant="outline" onClick={() => setEtapa("mesa-encerrada")} className="mt-3 h-12 w-full rounded-lg text-base font-bold">Ver mesa encerrada</Button>}
        </TelaCentral>
      )}

      {etapaVisivel === "avaliacao" && (
        <main className="flex flex-1 flex-col px-6 pb-10">
          <img src={mascotRating} alt="Mascote TIPE com uma estrela" className="mx-auto mb-3 h-28 w-28 object-contain" />
          <h1 className="text-center text-2xl font-bold">Como foi seu atendimento?</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Sua avaliação ajuda {dados.garcom ? `o ${dados.garcom}` : "a equipe"} e o restaurante.</p>
          <div className="mt-8 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((numero) => (
              <Button key={numero} variant="ghost" size="icon" onClick={() => setEstrelas(numero)} aria-label={`${numero} estrelas`} className="h-11 w-11">
                <Star className={`h-8 w-8 ${numero <= estrelas ? "fill-highlight text-highlight" : "text-border"}`} />
              </Button>
            ))}
          </div>
          <label htmlFor="comentario" className="mt-8 text-sm font-semibold">Comentário <span className="font-normal text-muted-foreground">(opcional)</span></label>
          <Textarea id="comentario" value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="Conte como foi sua experiência" maxLength={400} className="mt-2 min-h-28 rounded-lg bg-card" />
          <Button onClick={() => setEtapa("gorjeta")} className="mt-6 h-12 rounded-lg text-base font-bold">Continuar <ChevronRight /></Button>
        </main>
      )}

      {etapaVisivel === "gorjeta" && (
        <main className="flex flex-1 flex-col px-6 pb-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15"><Heart className="h-7 w-7 text-primary" /></div>
          <h1 className="mt-5 text-center text-2xl font-bold">Quer deixar uma gorjeta extra?</h1>
           <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">Uma forma opcional de agradecer pelo atendimento.</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[5, 10, 15, 20].map((valor) => (
              <Button key={valor} variant={gorjetaExtra === valor ? "default" : "outline"} onClick={() => setGorjetaExtra(valor)} className="h-14 rounded-lg text-base font-bold">{money(valor)}</Button>
            ))}
          </div>
          <Button disabled={gorjetaExtra <= 0} onClick={() => setEtapa("pagamento-gorjeta")} className="mt-6 h-12 rounded-lg text-base font-bold">Continuar com gorjeta <ChevronRight /></Button>
          <Button variant="ghost" onClick={() => setEtapa("fim")} className="mt-2 h-11">Agora não, obrigado</Button>
        </main>
      )}

      {etapaVisivel === "pagamento-gorjeta" && (
        <Pagamento
          titulo="Pagamento da gorjeta"
           descricao="Cobrança opcional e separada da conta."
          rotuloValor="Gorjeta extra"
          valor={gorjetaExtra}
          metodo={metodoGorjeta}
          setMetodo={setMetodoGorjeta}
          pagando={pagando}
          erro={erroPagamento}
          voltar={() => setEtapa("gorjeta")}
          pagar={() => processarPagamento("gorjeta")}
          cartao={chavePublica ? cartao : undefined}
          setCartao={setCartao}
        />
      )}

      {etapaVisivel === "mesa-encerrada" && (
        <TelaCentral>
          <img
            src={mascotTableClosed}
            alt="Mascote TIPE ao lado da conta encerrada"
            loading="lazy"
            width={1024}
            height={1024}
            className="mx-auto h-52 w-52 object-contain"
          />
          <p className="mt-4 text-sm font-semibold text-primary">Tudo confirmado</p>
          <h1 className="mt-2 text-2xl font-bold">Mesa encerrada</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">Todos os itens desta mesa foram pagos e não há pagamentos pendentes.</p>
          <p className="mt-2 text-center text-xs text-muted-foreground">Uma nova conta será aberta nesta mesa automaticamente em até 2 minutos.</p>
          <Link to="/" className="mt-8 text-sm font-semibold text-primary">Voltar ao início</Link>
        </TelaCentral>
      )}

      {etapaVisivel === "fim" && (
        <TelaCentral>
          <img src={mascotThanks} alt="Mascote TIPE agradecendo" className="mx-auto h-48 w-48 object-contain" />
          <p className="mt-5 text-sm font-semibold text-primary">Tudo certo, {nome.trim()}!</p>
          <h1 className="mt-2 text-2xl font-bold">Obrigado pela sua visita.</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">Sua conta foi paga e sua avaliação foi registrada.</p>
          {gorjetaExtra > 0 && <p className="mt-2 text-center text-sm font-semibold">Gorjeta de {money(gorjetaExtra)} enviada pela TIPE.</p>}
          {mesaEncerrada && (
            <Button onClick={() => setEtapa("mesa-encerrada")} className="mt-8 h-12 w-full rounded-lg text-base font-bold">Ver mesa encerrada <ChevronRight /></Button>
          )}
          <Link to="/" className="mt-6 text-sm font-semibold text-primary">Voltar ao início</Link>
        </TelaCentral>
      )}
    </div>
  );
}

function ResumoLinha({ label, valor, className = "" }: { label: string; valor: number; className?: string }) {
  return <div className={`flex justify-between gap-4 ${className}`}><span className="text-muted-foreground">{label}</span><span>{money(valor)}</span></div>;
}

function Pagamento({ titulo, descricao, rotuloValor, valor, metodo, setMetodo, pagando, erro, voltar, pagar, permitirEstabelecimento = false, metodosAceitos, metodoEstabelecimento, setMetodoEstabelecimento, valorDinheiro = "", setValorDinheiro, cartao, setCartao }: {
  cartao?: CardInput | undefined;
  setCartao?: (c: CardInput) => void;
  titulo: string;
  descricao: string;
  rotuloValor: string;
  valor: number;
  metodo: Metodo | null;
  setMetodo: (metodo: Metodo) => void;
  pagando: boolean;
  erro: string | null;
  voltar: () => void;
  pagar: () => void;
  permitirEstabelecimento?: boolean;
  metodosAceitos?: Metodo[] | undefined;
  metodoEstabelecimento?: MetodoEstabelecimento | null;
  setMetodoEstabelecimento?: (metodo: MetodoEstabelecimento | null) => void;
  valorDinheiro?: string;
  setValorDinheiro?: (valor: string) => void;
}) {
  const [aceitouTermos, setAceitouTermos] = useState(false);
  const opcoes = permitirEstabelecimento
    ? metodos.filter((opcao) => opcao.id !== "card" && (!metodosAceitos || metodosAceitos.includes(opcao.id)))
    : metodos.filter((opcao) => opcao.id !== "at_establishment");
  return (
    <main className="flex flex-1 flex-col px-5 pb-8">
      <Button variant="ghost" onClick={voltar} className="mb-4 w-fit px-2 text-muted-foreground"><ArrowLeft /> Voltar</Button>
      <h1 className="font-display text-2xl font-extrabold">{titulo}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{descricao}</p>
      <div className="my-6 rounded-2xl bg-muted/60 p-5 text-center">
         <p className="text-xs text-muted-foreground">{rotuloValor}</p>
        <p className="mt-1 font-display text-3xl font-extrabold">{money(valor)}</p>
      </div>
       <h2 className="text-sm font-semibold">Como deseja pagar?</h2>
       <div className="mt-3 flex flex-col gap-2.5">
         {opcoes.map((opcao) => {
           const { descricao: descricaoMetodo, Icone } = metodoDetalhes[opcao.id];
           const selecionado = metodo === opcao.id;
           return (
             <Button
                key={opcao.id}
               variant="outline"
                onClick={() => { setMetodo(opcao.id); if (opcao.id !== "at_establishment") setMetodoEstabelecimento?.(null); }}
               className={`h-auto min-h-16 justify-start rounded-2xl px-4 py-3.5 text-left shadow-none transition-all ${selecionado ? "border-2 border-primary bg-primary/10" : "bg-card"}`}
             >
               <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl ${selecionado ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground"}`}><Icone className="h-4 w-4" /></span>
               <span className="min-w-0 flex-1">
                 <span className="block font-bold">{opcao.label}</span>
                 <span className="block text-xs font-normal text-muted-foreground">{descricaoMetodo}</span>
               </span>
                {selecionado
                  ? <span className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-primary" aria-hidden="true"><Check className="h-3 w-3 text-primary-foreground" /></span>
                  : <span className="h-5 w-5 shrink-0 rounded-full border-2 border-input" aria-hidden="true" />}
             </Button>
           );
         })}
      </div>
       {metodo === "at_establishment" && permitirEstabelecimento && setMetodoEstabelecimento && (
         <div className="mt-4 rounded-2xl border border-border bg-muted/40 p-4">
           <h3 className="text-sm font-semibold">Como você pagará no estabelecimento?</h3>
           <div className="mt-3 grid grid-cols-2 gap-2">
             <Button type="button" variant={metodoEstabelecimento === "cash" ? "default" : "outline"} onClick={() => setMetodoEstabelecimento("cash")} className="h-11 rounded-full">Dinheiro</Button>
              <Button type="button" variant={metodoEstabelecimento === "card_terminal" ? "default" : "outline"} onClick={() => setMetodoEstabelecimento("card_terminal")} className="h-11 rounded-full">Maquininha</Button>
           </div>
           {metodoEstabelecimento === "cash" && setValorDinheiro && (
             <div className="mt-4">
               <label htmlFor="cash-received" className="text-sm font-semibold">Quanto você entregará em dinheiro?</label>
               <Input id="cash-received" type="number" inputMode="decimal" min={valor} max={100000} step="0.01" value={valorDinheiro} onChange={(event) => setValorDinheiro(event.target.value)} placeholder={money(valor)} className="mt-2 h-12 bg-card" />
               {Number(valorDinheiro.replace(",", ".")) >= valor && <p className="mt-2 text-sm font-semibold text-primary">Troco: {money(Math.round((Number(valorDinheiro.replace(",", ".")) - valor) * 100) / 100)}</p>}
               {valorDinheiro && Number(valorDinheiro.replace(",", ".")) < valor && <p role="alert" className="mt-2 text-xs text-destructive">O valor precisa cobrir o total da conta.</p>}
             </div>
           )}
           {metodoEstabelecimento && <p className="mt-4 text-sm leading-6 text-muted-foreground">{metodoEstabelecimento === "cash" ? "Prepare o dinheiro. O garçom tratará do seu troco em breve." : "O garçom irá em instantes até sua mesa com a maquininha."}</p>}
         </div>
       )}
       {permitirEstabelecimento && (
         <div className="mt-5 flex items-start gap-3 rounded-lg border border-border bg-card p-4">
           <Checkbox id="aceite-termos" checked={aceitouTermos} onCheckedChange={(checked) => setAceitouTermos(checked === true)} className="mt-0.5 h-5 w-5" />
           <label htmlFor="aceite-termos" className="text-xs leading-5 text-muted-foreground">
             Confirmo que revisei e me responsabilizo pelos itens selecionados. Aceito os{" "}
             <Dialog>
               <DialogTrigger asChild><Button type="button" variant="link" className="h-auto p-0 text-xs font-semibold align-baseline">Termos de Uso</Button></DialogTrigger>
               <DialogContent className="max-h-[85svh] max-w-[calc(100%-2rem)] overflow-y-auto rounded-lg">
                 <DialogHeader>
                   <DialogTitle>Termos de Uso do pagamento</DialogTitle>
                   <DialogDescription>Leia antes de confirmar sua parte da conta.</DialogDescription>
                 </DialogHeader>
                 <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                   <p>Ao continuar, você declara que conferiu os itens e as quantidades escolhidas e reconhece que este pagamento cobre somente essa seleção.</p>
                   <p>Após a confirmação, os itens pagos serão retirados do saldo disponível da mesa. Valores ainda não pagos permanecerão na conta.</p>
                   <p>Pagamentos digitais são confirmados automaticamente. Pagamentos em dinheiro ou maquininha permanecem pendentes até a confirmação manual do restaurante.</p>
                   <p>Em caso de divergência, procure o restaurante antes de concluir o pagamento.</p>
                 </div>
               </DialogContent>
             </Dialog>.
           </label>
         </div>
       )}
      {metodo === "card" && cartao && setCartao && <div className="mt-5"><CardFields value={cartao} onChange={setCartao} /></div>}
      {erro && <p role="alert" className="mt-4 text-sm text-destructive">{erro}</p>}
        <Button disabled={!metodo || pagando || (permitirEstabelecimento && !aceitouTermos) || (metodo === "at_establishment" && (!metodoEstabelecimento || (metodoEstabelecimento === "cash" && Number(valorDinheiro.replace(",", ".")) < valor))) || (metodo === "card" && !!cartao && !cardValid(cartao))} onClick={pagar} className="mt-6 h-12 rounded-full font-display text-base font-bold">{pagando ? "Processando…" : `Pagar ${money(valor)}`}</Button>
         {metodo === "at_establishment" && metodoEstabelecimento && <p className="mt-3 text-center text-xs text-muted-foreground">O garçom verá {metodoEstabelecimento === "cash" ? "o valor entregue e o troco" : "que o pagamento será na maquininha"} antes de confirmar.</p>}
    </main>
  );
}

function IconeSucesso() {
  return <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"><Check className="h-10 w-10 text-primary" /></div>;
}

function TelaCentral({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">{children}</main>;
}