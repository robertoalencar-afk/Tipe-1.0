import { createFileRoute, Link } from "@tanstack/react-router";
import { MarcaRestaurante } from "@/components/tipe/MarcaRestaurante";
import { z } from "zod";
import { useCallback, useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  Copy,
  CreditCard,
  HandCoins,
  QrCode,
  ReceiptText,
  RefreshCw,
  Smartphone,
  Star,
  Users,
  UtensilsCrossed,
  Wallet,
  WalletCards,
  WifiOff,
} from "lucide-react";
import logoLight from "@/assets/marca/tipe-logo-branco.svg";
import logoDark from "@/assets/marca/tipe-logo.svg";
import { cn } from "@/lib/utils";
import { SplitPicker } from "@/components/tipe/SplitPicker";
import { remainingSubtotal, selectionSubtotal, type ShareItem } from "@/lib/tipe/bill-math";
import { PAYMENT_STATUS_LABEL } from "@/lib/tipe/payment-state";
import { MesaPedido } from "@/components/tipe/MesaPedido";
import { MesaLiberacao, lerTokenPedido } from "@/components/tipe/MesaLiberacao";
import { ChamarEquipe } from "@/components/tipe/ChamarEquipe";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getPublicTable } from "@/lib/tipe/pdv.functions";
import type { GooglePayConfig } from "@/lib/tipe/carteiras";
import { GooglePayCancelado, pedirTokenGooglePay } from "@/lib/tipe/google-pay";
import {
  createPayment,
  getPaymentByKey,
  getPaymentConfig,
  getPaymentStatus,
  reopenClosedTable,
  sendPaymentReceipt,
  submitRating,
  type SharedPayment,
} from "@/lib/tipe/payments.functions";
import { CardFields } from "@/components/tipe/CardFields";
import {
  gorjetaMaxima,
  lerValor,
  resolveServiceFee,
  suggestedTips,
  TIP_SPLIT,
  validarGorjeta,
} from "@/lib/tipe/rules";
import { cardValid, tokenizeCard, type CardInput } from "@/lib/tipe/pagarme-client";
import mascotThanks from "@/assets/lebre/rosto-feliz.webp";
import mascotRating from "@/assets/lebre/rosto-piscando.webp";
import mascotWaiting from "@/assets/lebre/rosto-ola.webp";
import mascotTableClosed from "@/assets/lebre/rosto-dormindo.webp";

export const Route = createFileRoute("/$restaurante/$mesa")({
  validateSearch: z.object({ t: z.string().max(64).optional() }),
  head: () => ({
    meta: [
      { title: "Sua mesa — TIPE" },
      {
        name: "description",
        content: "Confira os pedidos da mesa, pague sua parte e avalie o atendimento com TIPE.",
      },
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
  | "gorjeta-confirmada"
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

const formatPaymentDate = (value: string) =>
  new Intl.DateTimeFormat("pt-BR", {
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
  const fractionLabel =
    Math.abs(fraction - 0.5) < EPSILON
      ? "metade"
      : Math.abs(fraction - 1 / 3) < EPSILON
        ? "1/3"
        : Math.abs(fraction - 0.25) < EPSILON
          ? "1/4"
          : fraction > EPSILON
            ? `${Math.round(fraction * 100)}%`
            : "";
  if (!whole) return fractionLabel || "0";
  return fractionLabel
    ? `${whole} unidade${whole === 1 ? "" : "s"} + ${fractionLabel}`
    : `${whole} unidade${whole === 1 ? "" : "s"}`;
};

function MesaPage() {
  const { restaurante, mesa: codigoMesa } = Route.useParams();
  const { t: tokenMesa } = Route.useSearch();
  type ItemMesa = {
    id: string;
    nome: string;
    qtd: number;
    preco: number;
    data: string;
    hora: string;
  };
  const [metodosAceitos, setMetodosAceitos] = useState<Metodo[] | null>(null);
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [dados, setDados] = useState<{
    restaurante: string;
    mesa: string;
    garcom: string;
    itens: ItemMesa[];
  }>({ restaurante: "", mesa: "", garcom: "", itens: [] });
  const [erroMesa, setErroMesa] = useState<string | null>(null);
  const [etapa, setEtapa] = useState<Etapa>("carregando");
  const [nome, setNome] = useState("");
  const [aba, setAba] = useState<Aba>("conta");
  const [qtds, setQtds] = useState<Record<string, number>>(() =>
    Object.fromEntries(dados.itens.map((item) => [item.id, 0])),
  );
  const [dividindo, setDividindo] = useState<string | null>(null);
  const [metodoConta, setMetodoConta] = useState<Metodo | null>(null);
  const [metodoEstabelecimento, setMetodoEstabelecimento] = useState<MetodoEstabelecimento | null>(
    null,
  );
  const [valorDinheiro, setValorDinheiro] = useState("");
  const [metodoGorjeta, setMetodoGorjeta] = useState<Metodo | null>(null);
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [gorjetaExtra, setGorjetaExtra] = useState(0);
  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [disponiveis, setDisponiveis] = useState<Record<string, number>>(() =>
    Object.fromEntries(dados.itens.map((item) => [item.id, item.qtd])),
  );
  const [pagamentos, setPagamentos] = useState<SharedPayment[]>([]);
  const [mesaSincronizada, setMesaSincronizada] = useState(false);
  const [sessaoMesa, setSessaoMesa] = useState("");
  const [selfOrder, setSelfOrder] = useState(false);
  // Com o Tipe Order: a mesma tela ganha Pedir e Pagar, sem trocar de sessão.
  const [ordering, setOrdering] = useState<"open" | "closed" | "code" | null>(null);
  const [modo, setModo] = useState<"pedir" | "pagar" | null>(null);
  const [tokenPedido, setTokenPedido] = useState<string | undefined>(undefined);
  const [cartao, setCartao] = useState<CardInput>({ number: "", holder: "", exp: "", cvv: "" });
  const [chavePublica, setChavePublica] = useState<string | null>(null);
  const [googlePay, setGooglePay] = useState<GooglePayConfig | null>(null);
  const [pix, setPix] = useState<{
    id: string;
    code: string;
    qrUrl?: string | undefined;
    tipo: "conta" | "gorjeta";
  } | null>(null);
  const [gorjetaDisponivel, setGorjetaDisponivel] = useState(false);
  useEffect(() => {
    getPaymentConfig({ data: { slug: restaurante } })
      .then((c) => {
        setChavePublica(c.publicKey);
        setGorjetaDisponivel(c.tipsAvailable);
      })
      .catch(() => undefined);
  }, []);
  const chavePagamento = useRef<string | null>(null);
  const [valorPago, setValorPago] = useState(0);
  // Último pagamento confirmado da conta (para o comprovante por e-mail).
  const [ultimoPagamento, setUltimoPagamento] = useState<string | null>(null);
  const [emailRecibo, setEmailRecibo] = useState("");
  const [recibo, setRecibo] = useState<{
    estado: "idle" | "enviando" | "enviado" | "erro";
    msg?: string;
  }>({ estado: "idle" });
  // Comprovante é opcional: o campo de e-mail só aparece se o cliente pedir.
  const [querRecibo, setQuerRecibo] = useState(false);
  const [linkAvaliacao, setLinkAvaliacao] = useState<string | null>(null);
  const [gorjetaOutro, setGorjetaOutro] = useState("");
  // "Outro valor" é uma aba ao lado dos percentuais; o campo só aparece quando ela é escolhida.
  const [gorjetaOutroAberto, setGorjetaOutroAberto] = useState(false);
  const [gorjetaPaga, setGorjetaPaga] = useState(false);

  useEffect(() => {
    try {
      const nomeSalvo =
        window.localStorage.getItem(customerStorageKey(restaurante, codigoMesa))?.trim() ?? "";
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
      const device = lerTokenPedido(restaurante, codigoMesa);
      const estado = await getPublicTable({
        data: { slug: restaurante, code: codigoMesa, token: tokenMesa, ...(device ? { device } : {}) },
      });
      if ("error" in estado) {
        setErroMesa(
          estado.error === "invalid_token"
            ? "Este QR Code foi atualizado pelo restaurante. Leia o código que está na mesa agora."
            : estado.error === "inactive"
              ? "Esta mesa não está disponível no momento. Chame o garçom."
              : "Mesa não encontrada. Confira o QR Code da mesa.",
        );
        return;
      }
      const itensMesa: ItemMesa[] = estado.items.map((i) => {
        const d = new Date(i.ordered_at);
        return {
          id: i.item_code,
          nome: i.item_name,
          qtd: i.ordered_quantity,
          preco: i.unit_price,
          data: d.toLocaleDateString("pt-BR"),
          hora: d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" }),
        };
      });
      setMetodosAceitos(estado.billMethods as Metodo[]);
      setGooglePay(estado.googlePay ?? null);
      setTaxaSugerida(estado.serviceWaived ? 0 : estado.serviceRate);
      setTaxaRemovida(estado.serviceWaived);
      setLinkAvaliacao(estado.googleReviewUrl ?? null);
      setLogoUrl(estado.logoUrl ?? null);
      setDados({
        restaurante: estado.restaurantName,
        mesa: estado.tableNumber,
        garcom: estado.waiterName,
        itens: itensMesa,
      });
      setDisponiveis(
        Object.fromEntries(
          estado.items.map((item) => [
            item.item_code,
            roundPortion(
              Math.max(0, item.ordered_quantity - item.reserved_portion - item.paid_portion),
            ),
          ]),
        ),
      );
      setPagamentos(estado.payments);
      setSessaoMesa(estado.session);
      setSelfOrder(estado.selfOrder);
      setOrdering(estado.ordering);
      setTokenPedido(lerTokenPedido(restaurante, codigoMesa, estado.session));
      // Primeira leitura: mesa sem nada pedido abre em Pedir; com conta aberta, em Pagar.
      setModo((atual) => atual ?? (estado.selfOrder && estado.items.length === 0 ? "pedir" : "pagar"));
      setQtds((atuais) =>
        Object.fromEntries(
          itensMesa.map((item) => {
            const shared = estado.items.find((candidate) => candidate.item_code === item.id);
            const available = roundPortion(
              Math.max(
                0,
                (shared?.ordered_quantity ?? item.qtd) -
                  (shared?.reserved_portion ?? 0) -
                  (shared?.paid_portion ?? 0),
              ),
            );
            return [item.id, Math.min(atuais[item.id] ?? 0, available)];
          }),
        ),
      );
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

  // Mascotes só depois que a conta aparece e o celular fica ocioso, para não disputar o 4G fraco.
  useEffect(() => {
    if (!mesaSincronizada) return;
    const carregar = () => {
      for (const src of [mascotWaiting, mascotThanks, mascotRating, mascotTableClosed]) {
        const img = new Image();
        img.src = src;
      }
    };
    const w = window as Window & {
      requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number;
    };
    const id = w.requestIdleCallback
      ? w.requestIdleCallback(carregar, { timeout: 8000 })
      : window.setTimeout(carregar, 3000);
    return () => {
      if (!w.requestIdleCallback) window.clearTimeout(id);
    };
  }, [mesaSincronizada]);

  // Mesma matemática do servidor (arredondamento cumulativo por item).
  const itensDivisao = useMemo<ShareItem[]>(
    () =>
      dados.itens.map((item) => ({
        code: item.id,
        unitPrice: item.preco,
        ordered: item.qtd,
        available: disponiveis[item.id] ?? item.qtd,
      })),
    [dados.itens, disponiveis],
  );
  const subtotal = useMemo(() => selectionSubtotal(itensDivisao, qtds), [itensDivisao, qtds]);
  const [taxaSugerida, setTaxaSugerida] = useState(0.1);
  const [taxaRemovida, setTaxaRemovida] = useState(false);
  const servico = resolveServiceFee(subtotal, taxaSugerida, { kind: "suggested" })!.amount;
  const totalConta = +(subtotal + servico).toFixed(2);
  const mesaEncerrada =
    mesaSincronizada &&
    dados.itens.length > 0 &&
    dados.itens.every((item) => (disponiveis[item.id] ?? item.qtd) <= EPSILON) &&
    pagamentos.every((pagamento) => pagamento.status !== "pending");
  const pagamentoPresencialPendente = pagamentos.find(
    (pagamento) => pagamento.status === "pending" && pagamento.establishment_method,
  );
  // Enquanto a mesa está encerrada (até a nova conta abrir), o cliente ainda pode
  // voltar à mesa para ver a atividade: o botão "Voltar à mesa" libera a visão da conta.
  const [voltouParaMesa, setVoltouParaMesa] = useState(false);
  const etapaVisivel: Etapa =
    mesaEncerrada &&
    !voltouParaMesa &&
    ["carregando", "identificacao", "conta", "pagamento-conta", "conta-pendente"].includes(etapa)
      ? "mesa-encerrada"
      : etapa;

  useEffect(() => {
    if (!mesaEncerrada) return;
    let ativo = true;
    const verificar = async () => {
      try {
        const r = await reopenClosedTable({
          data: { restaurantId: restaurante, tableId: String(dados.mesa), session: sessaoMesa },
        });
        if (!ativo || !r.reopened) return;
      } catch {
        return;
      }
    };
    void verificar();
    const timer = window.setInterval(() => void verificar(), 15000);
    return () => {
      ativo = false;
      window.clearInterval(timer);
    };
  }, [mesaEncerrada, restaurante, dados.mesa, sessaoMesa]);

  const [estavaEncerrada, setEstavaEncerrada] = useState(false);
  useEffect(() => {
    if (mesaEncerrada) {
      setEstavaEncerrada(true);
      return;
    }
    if (estavaEncerrada && mesaSincronizada) {
      // Nova conta aberta: limpa a identificação e recomeça.
      setEstavaEncerrada(false);
      setVoltouParaMesa(false);
      try {
        window.localStorage.removeItem(customerStorageKey(restaurante, codigoMesa));
      } catch {
        /* ignora */
      }
      setNome("");
      setEstrelas(0);
      setComentario("");
      setGorjetaExtra(0);
      setAba("conta");
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

  // Fluxo: escolher o que pagar → pagar a conta → (opcional) gorjeta extra como segundo
  // pagamento → avaliação. A gorjeta é cobrada à parte porque vai para a TIPE e não para o restaurante.
  function irParaPagamento() {
    setErroPagamento(null);
    setEtapa("pagamento-conta");
  }

  async function processarPagamento(tipo: "conta" | "gorjeta") {
    const metodo = tipo === "conta" ? metodoConta : metodoGorjeta;
    const valor = tipo === "conta" ? totalConta : gorjetaExtra;
    if (!metodo || valor <= 0) return;
    setPagando(true);
    setErroPagamento(null);
    // Mesma chave em cliques repetidos/reenvios: o servidor não duplica o pagamento.
    if (!chavePagamento.current)
      chavePagamento.current = `${tipo}_${crypto.randomUUID().replace(/-/g, "")}`;
    try {
      const cardToken =
        metodo === "card" && chavePublica ? await tokenizeCard(chavePublica, cartao) : undefined;
      // Google Pay ativo no restaurante: a folha da carteira devolve o token que o servidor cobra.
      // Nas empresas virtuais não há token: o servidor aprova em simulação.
      const walletToken =
        tipo === "conta" && metodo === "google_pay" && googlePay
          ? await pedirTokenGooglePay(googlePay, valor)
          : undefined;
      const resultado = await createPayment({
        data: {
          cardToken,
          walletToken,
          method: metodo,
          tip: tipo === "gorjeta" ? gorjetaExtra : 0,
          billPaymentId:
            tipo === "gorjeta" && ultimoPagamento && /^[0-9a-f-]{36}$/.test(ultimoPagamento)
              ? ultimoPagamento
              : undefined,
          tableId: String(dados.mesa),
          restaurantId: restaurante,
          idempotencyKey: chavePagamento.current,
          session: sessaoMesa,
          customerName: nome.trim(),
          itemQuantities: tipo === "conta" ? qtds : {},
          target: tipo === "conta" ? "restaurant" : "tipe",
          establishmentMethod:
            tipo === "conta" && metodo === "at_establishment"
              ? (metodoEstabelecimento ?? undefined)
              : undefined,
          cashReceived:
            tipo === "conta" && metodo === "at_establishment" && metodoEstabelecimento === "cash"
              ? Number(valorDinheiro.replace(",", "."))
              : undefined,
        },
      });
      chavePagamento.current = null;
      if (tipo === "conta") {
        setValorPago(totalConta);
        setUltimoPagamento(resultado.id);
        setRecibo({ estado: "idle" });
        setQuerRecibo(false);
      } else setGorjetaPaga(resultado.status === "approved");
      setQtds({});
      await atualizarMesa();
      if (resultado.provider === "pagarme" && resultado.status === "pending" && resultado.pixCode) {
        setPix({ id: resultado.id, code: resultado.pixCode, qrUrl: resultado.pixQrUrl, tipo });
        setEtapa("pix");
        return;
      }
      setEtapa(
        tipo === "conta"
          ? resultado.status === "approved"
            ? "conta-confirmada"
            : "conta-pendente"
          : resultado.status === "approved"
            ? "gorjeta-confirmada"
            : "avaliacao",
      );
    } catch (error) {
      if (error instanceof GooglePayCancelado) return;
      const msg = error instanceof Error ? error.message : "";
      if (!navigator.onLine || error instanceof TypeError || /fetch|network|rede/i.test(msg)) {
        // Queda de conexão: mantém a mesma chave e só libera nova tentativa após consultar o servidor.
        tentativaOffline.current = tipo;
        setSemConexao("offline");
        return;
      }
      if (/não está mais disponível|acabou de ser pago|foi atualizada/.test(msg))
        chavePagamento.current = null;
      setErroPagamento(msg || "Não foi possível concluir o pagamento");
    } finally {
      setPagando(false);
    }
  }

  const [semConexao, setSemConexao] = useState<"offline" | "verificando" | null>(null);
  const tentativaOffline = useRef<"conta" | "gorjeta" | null>(null);
  useEffect(() => {
    const aoCair = () => {
      if (pagando || tentativaOffline.current) setSemConexao("offline");
    };
    const aoVoltar = async () => {
      const tipo = tentativaOffline.current;
      const chave = chavePagamento.current;
      if (!tipo || !chave) {
        setSemConexao(null);
        return;
      }
      setSemConexao("verificando");
      for (let tentativa = 0; tentativa < 5; tentativa++) {
        try {
          const r = await getPaymentByKey({
            data: {
              restaurantId: restaurante,
              tableId: String(dados.mesa),
              session: sessaoMesa,
              idempotencyKey: chave,
            },
          });
          await atualizarMesa();
          tentativaOffline.current = null;
          setSemConexao(null);
          if (!r.found || r.status === "failed" || r.status === "cancelled") {
            // Nada foi cobrado: pode tentar de novo. Se não chegou, a mesma chave segue protegendo contra duplicidade.
            if (r.found) chavePagamento.current = null;
            setErroPagamento(
              "Seu pagamento não foi concluído. Nenhum valor foi cobrado. Você pode tentar de novo.",
            );
            return;
          }
          chavePagamento.current = null;
          if (tipo === "conta") {
            setValorPago(totalConta);
            setUltimoPagamento(r.id);
            setRecibo({ estado: "idle" });
            setQuerRecibo(false);
          } else setGorjetaPaga(r.status === "approved");
          setQtds({});
          setEtapa(
            tipo === "conta"
              ? r.status === "approved"
                ? "conta-confirmada"
                : "conta-pendente"
              : r.status === "approved"
                ? "gorjeta-confirmada"
                : "avaliacao",
          );
          return;
        } catch {
          await new Promise((ok) => window.setTimeout(ok, 2000));
        }
      }
      setSemConexao("offline");
    };
    window.addEventListener("offline", aoCair);
    window.addEventListener("online", aoVoltar);
    if (semConexao === "offline" && navigator.onLine) void aoVoltar();
    return () => {
      window.removeEventListener("offline", aoCair);
      window.removeEventListener("online", aoVoltar);
    };
  }, [pagando, semConexao, restaurante, dados.mesa, sessaoMesa, atualizarMesa, totalConta]);

  useEffect(() => {
    if (etapa !== "pix" || !pix) return;
    const t = window.setInterval(async () => {
      try {
        const r = await getPaymentStatus({
          data: {
            restaurantId: restaurante,
            tableId: String(dados.mesa),
            session: sessaoMesa,
            paymentId: pix.id,
          },
        });
        if (r.status === "approved") {
          await atualizarMesa();
          if (pix.tipo === "gorjeta") setGorjetaPaga(true);
          setEtapa(pix.tipo === "conta" ? "conta-confirmada" : "gorjeta-confirmada");
        } else if (r.status !== "pending") {
          setErroPagamento("O Pix expirou ou não foi concluído. Tente novamente.");
          setEtapa(pix.tipo === "conta" ? "pagamento-conta" : "pagamento-gorjeta");
        }
      } catch {
        /* tenta de novo */
      }
    }, 4000);
    return () => window.clearInterval(t);
  }, [etapa, pix, restaurante, dados.mesa, sessaoMesa, atualizarMesa]);

  // Pix vem pré-selecionado quando o restaurante aceita: um toque a menos para pagar.
  useEffect(() => {
    if (etapa === "pagamento-conta" && !metodoConta && metodosAceitos?.includes("pix"))
      setMetodoConta("pix");
  }, [etapa, metodoConta, metodosAceitos]);

  const primeiroNome = nome.trim().split(/\s+/)[0] ?? "";
  const temItensEmAberto = dados.itens.some((item) => (disponiveis[item.id] ?? item.qtd) > 0);
  const mostrarTopo =
    etapaVisivel !== "identificacao" && etapaVisivel !== "carregando" && !erroMesa;
  // Recibo só com o que o servidor devolveu: o pagamento recém-criado ou, na falta dele, o aprovado mais recente desta pessoa.
  const pagamentoRecibo =
    pagamentos.find((pagamento) => pagamento.id === ultimoPagamento) ??
    pagamentos.find(
      (pagamento) => pagamento.customer_name === nome.trim() && pagamento.status === "approved",
    );

  return (
    <div className="customer-theme mx-auto flex min-h-svh max-w-md flex-col bg-background text-foreground">
      <MesaTopo
        restaurante={dados.restaurante}
        logoUrl={logoUrl}
        mesa={dados.mesa}
        etapa={etapaVisivel}
        mostrarMesa={mostrarTopo}
        aoVivo={mesaSincronizada}
      />

      {semConexao && (
        <div
          role="alertdialog"
          aria-live="assertive"
          aria-label="Sem conexão"
          className="fixed inset-0 z-50 flex items-end justify-center bg-background/80 p-4 backdrop-blur-sm sm:items-center"
        >
          <div className="w-full max-w-md rounded-3xl border border-border bg-card p-6 text-center shadow-lift">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-muted">
              <WifiOff className="h-6 w-6 text-foreground" aria-hidden />
            </span>
            <h2 className="mt-4 font-display text-xl font-medium tracking-heading">Sem conexão</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Seu pagamento não foi concluído ou está sendo confirmado.{" "}
              <strong className="text-foreground">Não pague de novo.</strong>
            </p>
            <p className="mt-4 flex items-center justify-center gap-2 text-xs font-semibold text-brand-strong">
              {semConexao === "verificando" && <Spinner />}
              {semConexao === "verificando"
                ? "Conexão de volta. Conferindo seu pagamento…"
                : "Assim que a internet voltar, vamos conferir o pagamento para você."}
            </p>
          </div>
        </div>
      )}

      {erroMesa && (
        <main className="flex flex-1 flex-col items-center justify-center px-6 pb-24 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-full bg-muted">
            <QrCode className="h-6 w-6" aria-hidden />
          </span>
          <h1 className="mt-5 font-display text-2xl font-medium tracking-heading">
            Não foi possível abrir a mesa
          </h1>
          <p className="mt-2 max-w-xs text-sm leading-6 text-muted-foreground">{erroMesa}</p>
          <Button variant="outline" onClick={() => window.location.reload()} className="mt-6 h-11">
            <RefreshCw /> Tentar de novo
          </Button>
        </main>
      )}

      {!erroMesa && etapaVisivel === "carregando" && <ContaCarregando />}

      {!erroMesa && etapaVisivel === "identificacao" && (
        <main className="flex flex-1 flex-col justify-center px-6 pb-24">
          {dados.mesa && (
            <p className="eyebrow text-brand-strong">
              {dados.restaurante ? `${dados.restaurante} · ` : ""}Mesa {dados.mesa}
            </p>
          )}
          <h1 className="mt-3 text-[2rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Olá! Qual é o seu nome?
          </h1>
          <p className="mt-3 text-[0.95rem] leading-6 text-muted-foreground">
            Seu nome identifica os itens que você escolher pagar nesta mesa. Sem cadastro e sem
            aplicativo.
          </p>
          <form onSubmit={identificar} className="mt-8">
            <label htmlFor="nome" className="text-sm font-semibold">
              Nome e sobrenome
            </label>
            <Input
              id="nome"
              autoFocus
              autoComplete="name"
              maxLength={40}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Ex.: Ana Souza"
              className="mt-2 h-13 rounded-2xl px-4 text-base"
            />
            <Button
              type="submit"
              disabled={!hasFirstAndLastName(nome)}
              className="mt-4 h-13 w-full font-display text-base"
            >
              Ver minha mesa <ChevronRight />
            </Button>
          </form>
        </main>
      )}

      {!erroMesa && etapaVisivel === "conta" && (
        <main className="flex flex-1 flex-col px-5">
          <h1 className="text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Olá, {primeiroNome}.
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {dados.garcom ? (
              <>
                Você está sendo atendido por{" "}
                <strong className="font-semibold text-foreground">{dados.garcom}</strong>.
              </>
            ) : (
              "Seus pedidos aparecem aqui assim que forem lançados."
            )}
          </p>

          {sessaoMesa && (
            <ChamarEquipe slug={restaurante} mesa={String(dados.mesa)} session={sessaoMesa} />
          )}

          {selfOrder && (
            <div
              role="tablist"
              aria-label="Pedir ou pagar"
              className="mt-5 grid grid-cols-2 gap-1 rounded-2xl border border-border bg-card p-1 shadow-xs"
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
                  aria-selected={modo === id}
                  onClick={() => setModo(id)}
                  className={`flex h-12 items-center justify-center gap-2 rounded-xl text-[0.95rem] font-semibold transition-colors ${modo === id ? "bg-foreground text-background" : "text-muted-foreground hover:text-foreground"}`}
                >
                  <Icone className="h-4 w-4" aria-hidden /> {rotulo}
                </button>
              ))}
            </div>
          )}

          {selfOrder && ordering && (
            <div className={modo === "pedir" ? "mt-5 pb-8" : "hidden"}>
              {ordering !== "open" && (
                <MesaLiberacao
                  estado={ordering}
                  slug={restaurante}
                  code={codigoMesa}
                  session={sessaoMesa}
                  garcom={dados.garcom}
                  onLiberado={(token) => {
                    setTokenPedido(token);
                    void atualizarMesa();
                  }}
                  onAtualizar={atualizarMesa}
                />
              )}
              <MesaPedido
                slug={restaurante}
                code={codigoMesa}
                session={sessaoMesa}
                nome={nome}
                device={tokenPedido}
                podeEnviar={ordering === "open"}
                onPlaced={atualizarMesa}
                onBlocked={(motivo) => setOrdering(motivo)}
              />
            </div>
          )}

          {(!selfOrder || modo !== "pedir") && (
          <>
          <div role="tablist" aria-label="Conta da mesa" className="mt-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {([["conta", "Conta", ReceiptText], ["atividade", "Atividade", ClipboardList]] as const).map(([id, rotulo, Icone]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={aba === id}
                onClick={() => setAba(id)}
                className={`flex h-10 items-center justify-center gap-2 rounded-full text-sm font-semibold transition-colors ${aba === id ? "bg-card text-foreground shadow-xs" : "text-muted-foreground hover:text-foreground"}`}
              >
                <Icone className="h-4 w-4" /> {rotulo}
              </button>
            ))}
          </div>

          {aba === "conta" && (
            <>
              {temItensEmAberto &&
                (() => {
                  // Atalho principal: o valor em aberto em destaque e "pagar tudo" em um toque.
                  const emAberto = remainingSubtotal(itensDivisao);
                  const emAbertoComTaxa = +(
                    emAberto +
                    resolveServiceFee(emAberto, taxaSugerida, { kind: "suggested" })!.amount
                  ).toFixed(2);
                  const tudo = Object.fromEntries(
                    dados.itens.map((item) => [
                      item.id,
                      Math.max(0, disponiveis[item.id] ?? item.qtd),
                    ]),
                  );
                  const algumPago = pagamentos.some((pagamento) => pagamento.status !== "failed");
                  return (
                    <section
                      aria-labelledby="em-aberto-title"
                      className="mt-5 rounded-[1.75rem] bg-background-muted p-5"
                    >
                      <p id="em-aberto-title" className="text-sm text-muted-foreground">
                        {algumPago ? "Ainda em aberto na mesa" : "Total da mesa"}
                      </p>
                      <p className="money mt-1 text-[2.75rem] font-medium leading-none tracking-[-0.045em]">
                        {money(emAbertoComTaxa)}
                      </p>
                      <p className="mt-2 text-xs text-muted-foreground">
                        {taxaRemovida || taxaSugerida <= 0
                          ? "Sem taxa de serviço nesta conta."
                          : `Inclui a taxa de serviço de ${Math.round(taxaSugerida * 1000) / 10}%.`}
                      </p>
                      <Button
                        onClick={() => {
                          setQtds(tudo);
                          irParaPagamento();
                        }}
                        className="mt-5 h-13 w-full justify-between px-6 font-display text-base"
                      >
                        <span>Pagar tudo</span>
                        <span className="money">{money(emAbertoComTaxa)}</span>
                      </Button>
                    </section>
                  );
                })()}

              {temItensEmAberto && (
                <div
                  id="itens-da-conta"
                  className="mt-8 flex scroll-mt-4 items-baseline justify-between gap-3"
                >
                  <h2 className="font-display text-lg font-medium tracking-heading">
                    Ou escolha o que você vai pagar
                  </h2>
                </div>
              )}
              <ul className="mt-3 flex flex-col gap-2.5">
                {dados.itens
                  .filter((item) => (disponiveis[item.id] ?? item.qtd) > 0)
                  .map((item) => {
                    const quantidade = qtds[item.id] ?? 0;
                    const disponivel = disponiveis[item.id] ?? item.qtd;
                    const escolhido = quantidade > 0;
                    return (
                      <li
                        key={item.id}
                        className={`rounded-2xl border bg-card p-4 transition-colors ${escolhido ? "border-foreground bg-card ring-1 ring-foreground" : "border-border"}`}
                      >
                        <div className="flex items-start gap-3">
                          <button
                            type="button"
                            onClick={() =>
                              setQtd(
                                item.id,
                                quantidade >= Math.floor(disponivel)
                                  ? 0
                                  : Math.floor(quantidade) + 1,
                                disponivel,
                              )
                            }
                            aria-label={`Adicionar uma unidade de ${item.nome}`}
                            className={`mt-0.5 grid h-6 w-6 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors ${escolhido ? "border-primary bg-primary text-primary-foreground" : "border-input hover:border-primary"}`}
                          >
                            {escolhido && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                          </button>
                          <div className="min-w-0 flex-1">
                            <p className="font-semibold leading-snug">{item.nome}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              <span className="money">{money(item.preco)}</span> cada ·{" "}
                              {formatPortion(disponivel)}{" "}
                              {disponivel > 1 ? "disponíveis" : "disponível"}
                            </p>
                          </div>
                          <span
                            className={`money shrink-0 text-sm font-semibold ${escolhido ? "text-foreground" : "text-muted-foreground"}`}
                          >
                            {money(item.preco * quantidade)}
                          </span>
                        </div>
                        <div className="mt-3 flex items-center justify-between gap-2 border-t border-border pt-3">
                          {dividindo === item.id ? (
                            <span className="text-xs font-semibold text-muted-foreground">
                              Como dividir?
                            </span>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDividindo(item.id)}
                              className="-ml-1 rounded-full px-1 py-1 text-sm font-semibold text-brand-strong hover:underline"
                            >
                              Dividir este item
                            </button>
                          )}
                          <label className="flex items-center gap-2 text-xs text-muted-foreground">
                            Quantidade
                            <select
                              value={quantidade}
                              onChange={(event) =>
                                setQtd(item.id, Number(event.target.value), disponivel)
                              }
                              className="h-10 min-w-[4.5rem] rounded-xl border border-input bg-background px-3 text-sm font-semibold text-foreground outline-none focus-visible:ring-2 focus-visible:ring-focus-ring/40"
                              aria-label={`Quantidade de ${item.nome}`}
                            >
                              {Math.abs(quantidade - Math.round(quantidade)) > EPSILON && (
                                <option value={quantidade}>{formatPortion(quantidade)}</option>
                              )}
                              {Array.from({ length: Math.floor(disponivel) + 1 }, (_, numero) => (
                                <option key={numero} value={numero}>
                                  {numero}
                                </option>
                              ))}
                            </select>
                          </label>
                        </div>
                        {dividindo === item.id && (
                          <div className="mt-3">
                            <SplitPicker
                              itemName={item.nome}
                              unitPrice={item.preco}
                              onPick={(c) => {
                                if (c === "rest") {
                                  setQtd(item.id, disponivel, disponivel);
                                  setDividindo(null);
                                } else setFracao(item.id, c, disponivel);
                              }}
                            />
                          </div>
                        )}
                        {escolhido && (
                          <p className="mt-2 text-xs font-semibold text-brand-strong">
                            Você paga {formatPortion(quantidade)}
                          </p>
                        )}
                      </li>
                    );
                  })}
              </ul>
              {dados.itens.every((item) => (disponiveis[item.id] ?? item.qtd) <= 0) && (
                <div className="mt-6 rounded-2xl border border-dashed border-border px-6 py-10 text-center">
                  <ReceiptText className="mx-auto h-6 w-6 text-muted-foreground" aria-hidden />
                  <p className="mt-3 font-semibold">
                    {dados.itens.length === 0 ? "Nenhum pedido ainda" : "Nada em aberto"}
                  </p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {dados.itens.length === 0
                      ? "Chame o garçom para fazer seu pedido. Ele aparece aqui na hora."
                      : "Não há itens disponíveis para pagamento."}
                  </p>
                </div>
              )}

              {subtotal > 0 && (
                <>
                  <div className="mt-6 rounded-2xl border border-border bg-card p-5 text-sm">
                    <ResumoLinha label="Subtotal selecionado" valor={subtotal} />
                    {taxaRemovida ? (
                      <ResumoLinha
                        label="Taxa de serviço removida pelo restaurante"
                        valor={0}
                        className="mt-2"
                      />
                    ) : (
                      <ResumoLinha
                        label={`Taxa de serviço (${Math.round(taxaSugerida * 1000) / 10}%)`}
                        valor={servico}
                        className="mt-2"
                      />
                    )}
                    <ResumoLinha
                      label="Total da sua parte"
                      valor={totalConta}
                      destaque
                      className="mt-3 border-t border-border pt-3"
                    />
                    {(() => {
                      // Saldo da mesa sempre visível: ninguém sai achando que pagou tudo.
                      const falta = remainingSubtotal(itensDivisao);
                      const faltaDepois = Math.max(0, +(falta - subtotal).toFixed(2));
                      return falta > 0 && subtotal > 0 ? (
                        <p className="mt-3 rounded-xl bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                          {faltaDepois <= 0 ? (
                            "Com este pagamento, a conta da mesa fica quitada."
                          ) : (
                            <>
                              Depois do seu pagamento, ainda faltarão{" "}
                              <strong className="money text-foreground">
                                {money(faltaDepois)}
                              </strong>{" "}
                              (sem taxa) para fechar a mesa.
                            </>
                          )}
                        </p>
                      ) : null;
                    })()}
                  </div>
                  <BarraAcao>
                    <Button
                      disabled={subtotal <= 0}
                      onClick={irParaPagamento}
                      className="h-13 w-full justify-between px-6 font-display text-base"
                    >
                      <span>Continuar para pagamento</span>
                      <span className="money">{money(totalConta)}</span>
                    </Button>
                  </BarraAcao>
                </>
              )}
            </>
          )}

          {aba === "atividade" && (
            <section aria-labelledby="atividade-title" className="mt-6 pb-8">
              <h2
                id="atividade-title"
                className="flex items-center gap-2 font-display text-base font-semibold"
              >
                <Users className="h-4 w-4 text-brand-strong" /> Registro dos pedidos
              </h2>
              {dados.itens.length === 0 && (
                <p className="mt-3 text-sm text-muted-foreground">Nenhum pedido lançado ainda.</p>
              )}
              <ol className="mt-3 border-l border-border pl-4">
                {dados.itens.map((item) => (
                  <li
                    key={item.id}
                    className="relative border-b border-border py-3.5 first:pt-1 last:border-0"
                  >
                    <span className="absolute -left-[1.2rem] top-[1.15rem] h-2 w-2 rounded-full bg-primary first:top-2" />
                    <div className="flex justify-between gap-3">
                      <p className="font-medium">
                        {item.qtd}× {item.nome}
                      </p>
                      <div className="shrink-0 text-right text-xs text-muted-foreground">
                        <p>{item.data}</p>
                        <p>{item.hora}</p>
                      </div>
                    </div>
                  </li>
                ))}
              </ol>
              {pagamentos.length > 0 && (
                <div className="mt-6 border-t border-border pt-5">
                  <h3 className="font-display text-base font-semibold">Pagamentos</h3>
                  <ul className="mt-2">
                    {pagamentos.map((pagamento) => (
                      <li
                        key={pagamento.id}
                        className="border-b border-border py-4 text-sm last:border-0"
                      >
                        <div className="flex justify-between gap-3">
                          <div>
                            <p className="font-semibold">{pagamento.customer_name}</p>
                            <p className="mt-0.5 text-xs text-muted-foreground">
                              {formatPaymentDate(pagamento.created_at)}
                            </p>
                            {pagamento.establishment_method && (
                              <p className="mt-1 text-xs font-medium text-foreground">
                                {pagamento.establishment_method === "cash"
                                  ? `Dinheiro${pagamento.change_due ? ` · Troco ${money(pagamento.change_due)}` : " · Sem troco"}`
                                  : "Maquininha"}
                              </p>
                            )}
                          </div>
                          <div className="text-right">
                            <p className="money font-semibold">{money(pagamento.amount)}</p>
                            <EstadoPagamento status={pagamento.status} />
                          </div>
                        </div>
                        <ul className="mt-3 space-y-1 border-l-2 border-primary/30 pl-3 text-xs text-muted-foreground">
                          {Object.entries(pagamento.item_quantities ?? {})
                            .filter(([, quantidade]) => quantidade > 0)
                            .map(([itemId, quantidade]) => (
                              <li key={itemId}>
                                {formatPortion(quantidade)} de{" "}
                                {dados.itens.find((item) => item.id === itemId)?.nome ??
                                  "Item da conta"}
                              </li>
                            ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
          </>
          )}
        </main>
      )}

      {etapaVisivel === "pagamento-conta" && (
        <Pagamento
          titulo="Como você quer pagar?"
          descricao={
            gorjetaExtra > 0 && !gorjetaPaga
              ? `Primeiro a conta. Logo depois vem a gorjeta de ${money(gorjetaExtra)}, cobrada à parte.`
              : "Este pagamento cobre só os itens que você escolheu. Depois da confirmação, a conta da mesa é atualizada sozinha."
          }
          rotuloValor="Sua parte da conta"
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
        <PixPagamento
          codigo={pix.code}
          qrUrl={pix.qrUrl}
          valor={pix.tipo === "conta" ? valorPago : gorjetaExtra}
        />
      )}

      {etapaVisivel === "conta-pendente" && (
        <TelaCentral>
          <img
            src={mascotWaiting}
            alt="Lebre da TIPE aguardando"
            width={176}
            height={176}
            className="mx-auto h-32 w-32 object-contain"
          />
          <span className="mt-2 inline-flex items-center gap-1.5 rounded-full bg-highlight/15 px-3 py-1 text-xs font-semibold text-foreground">
            <span className="h-1.5 w-1.5 rounded-full bg-highlight" aria-hidden />
            Aguardando confirmação
          </span>
          <h1 className="mt-4 text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Pagamento no estabelecimento
          </h1>
          <p className="mt-3 max-w-xs text-center text-sm leading-6 text-muted-foreground">
            {pagamentoPresencialPendente?.establishment_method === "cash"
              ? `Prepare o dinheiro. O garçom tratará do seu troco${pagamentoPresencialPendente.change_due !== null && pagamentoPresencialPendente.change_due !== undefined ? ` de ${money(pagamentoPresencialPendente.change_due)}` : ""} em breve.`
              : "O garçom irá em instantes até sua mesa com a maquininha."}
          </p>
          <div className="mt-8 w-full space-y-2">
            {gorjetaDisponivel && !gorjetaPaga && (
              <Button
                onClick={() => {
                  setErroPagamento(null);
                  setEtapa("gorjeta");
                }}
                className="h-12 w-full font-display text-base"
              >
                {dados.garcom ? `Agradecer ${dados.garcom.split(" ")[0]} com gorjeta` : "Deixar uma gorjeta"} <ChevronRight />
              </Button>
            )}
            <Button
              variant={gorjetaDisponivel && !gorjetaPaga ? "outline" : "default"}
              onClick={() => setEtapa("avaliacao")}
              className="h-12 w-full font-display text-base"
            >
              Avaliar atendimento <ChevronRight />
            </Button>
            <Button
              variant="ghost"
              onClick={() => {
                setEtapa("conta");
                setAba("atividade");
              }}
              className="h-11 w-full"
            >
              Ver atividade da mesa
            </Button>
          </div>
        </TelaCentral>
      )}

      {etapaVisivel === "conta-confirmada" && (
        <TelaCentral>
          <img
            src={mascotThanks}
            alt="Lebre da TIPE sorrindo com o pagamento aprovado"
            className="bob mx-auto mb-1 h-32 w-32 object-contain"
          />
          <p className="eyebrow text-brand-strong">Conta paga</p>
          <h1 className="mt-2 text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Pagamento realizado!
          </h1>
          <p className="mt-2 text-[0.95rem] text-muted-foreground">
            Obrigado, {primeiroNome}, por pagar com o TIPE.
          </p>
          <dl className="mt-7 w-full rounded-2xl border border-border bg-card p-4 text-left text-sm">
            <LinhaRecibo rotulo="Valor pago">
              <span className="money font-display text-base font-semibold">{money(valorPago)}</span>
            </LinhaRecibo>
            {pagamentoRecibo && (
              <LinhaRecibo rotulo="Forma de pagamento">
                {metodoNome(pagamentoRecibo.payment_method)}
              </LinhaRecibo>
            )}
            <LinhaRecibo rotulo="Restaurante">{dados.restaurante}</LinhaRecibo>
            <LinhaRecibo rotulo="Mesa">{dados.mesa}</LinhaRecibo>
            {pagamentoRecibo && (
              <LinhaRecibo rotulo="Data e hora">
                {formatPaymentDate(pagamentoRecibo.created_at)}
              </LinhaRecibo>
            )}
          </dl>
          {mesaEncerrada && (
            <p className="mt-4 rounded-xl bg-brand-soft px-3 py-2 text-center text-sm font-semibold text-brand-strong">
              Este foi o último pagamento: a mesa está encerrada.
            </p>
          )}
          {ultimoPagamento &&
            /^[0-9a-f-]{36}$/.test(ultimoPagamento) &&
            !querRecibo &&
            recibo.estado !== "enviado" && (
              <button
                type="button"
                onClick={() => setQuerRecibo(true)}
                className="mt-4 text-sm font-semibold text-brand-strong underline-offset-2 hover:underline"
              >
                Receber comprovante por e-mail (opcional)
              </button>
            )}
          {ultimoPagamento &&
            /^[0-9a-f-]{36}$/.test(ultimoPagamento) &&
            recibo.estado === "enviado" &&
            !querRecibo && (
              <p role="status" className="mt-4 text-sm text-primary">
                {recibo.msg}
              </p>
            )}
          {ultimoPagamento && /^[0-9a-f-]{36}$/.test(ultimoPagamento) && querRecibo && (
            <form
              className="mt-6 w-full rounded-2xl border border-border bg-card p-4 text-left"
              onSubmit={async (e) => {
                e.preventDefault();
                if (!emailRecibo.includes("@") || recibo.estado === "enviando") return;
                setRecibo({ estado: "enviando" });
                try {
                  const r = await sendPaymentReceipt({
                    data: {
                      restaurantId: restaurante,
                      tableId: String(dados.mesa),
                      session: sessaoMesa,
                      paymentId: ultimoPagamento,
                      email: emailRecibo,
                    },
                  });
                  setRecibo({ estado: "enviado", msg: `Comprovante enviado para ${r.sentTo}.` });
                  setEmailRecibo("");
                  setQuerRecibo(false);
                } catch (err) {
                  setRecibo({
                    estado: "erro",
                    msg: err instanceof Error ? err.message : "Não foi possível enviar agora.",
                  });
                }
              }}
            >
              <div className="flex items-center justify-between gap-2">
                <label htmlFor="email-recibo" className="text-sm font-semibold">
                  Comprovante por e-mail
                </label>
                <button
                  type="button"
                  onClick={() => setQuerRecibo(false)}
                  className="text-xs text-muted-foreground underline"
                >
                  Agora não
                </button>
              </div>
              <div className="mt-2 flex gap-2">
                <Input
                  id="email-recibo"
                  autoFocus
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  maxLength={160}
                  value={emailRecibo}
                  onChange={(e) => setEmailRecibo(e.target.value)}
                  placeholder="seu@email.com"
                  className="h-11"
                />
                <Button
                  type="submit"
                  variant="outline"
                  disabled={recibo.estado === "enviando" || !emailRecibo.includes("@")}
                  className="h-11 shrink-0"
                >
                  {recibo.estado === "enviando" ? "Enviando…" : "Enviar"}
                </Button>
              </div>
              {recibo.msg && (
                <p
                  role="status"
                  className={`mt-2 text-xs ${recibo.estado === "erro" ? "text-destructive" : "text-primary"}`}
                >
                  {recibo.msg}
                </p>
              )}
              <p className="mt-2 text-[11px] text-muted-foreground">
                Usamos o e-mail só para este envio. Não é nota fiscal.
              </p>
            </form>
          )}
          <div className="mt-7 w-full space-y-2">
            {gorjetaDisponivel && !gorjetaPaga && (
              <Button
                onClick={() => {
                  setErroPagamento(null);
                  setEtapa("gorjeta");
                }}
                className="h-12 w-full font-display text-base"
              >
                {dados.garcom ? `Agradecer ${dados.garcom.split(" ")[0]} com gorjeta` : "Deixar uma gorjeta"} <ChevronRight />
              </Button>
            )}
            <Button
              variant={gorjetaDisponivel && !gorjetaPaga ? "outline" : "default"}
              onClick={() => setEtapa("avaliacao")}
              className="h-12 w-full font-display text-base"
            >
              Avaliar atendimento <ChevronRight />
            </Button>
            {mesaEncerrada && (
              <Button
                variant="outline"
                onClick={() => setEtapa("mesa-encerrada")}
                className="h-12 w-full"
              >
                Ver mesa encerrada
              </Button>
            )}
          </div>
        </TelaCentral>
      )}

      {etapaVisivel === "avaliacao" && (
        <main className="flex flex-1 flex-col px-5">
          <img
            src={mascotRating}
            alt="Lebre da TIPE piscando"
            width={112}
            height={112}
            className="mx-auto h-24 w-24 object-contain"
          />
          <h1 className="mt-2 text-center text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Como foi seu atendimento?
          </h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">
            Sua avaliação ajuda {dados.garcom ? `o ${dados.garcom}` : "a equipe"} e o restaurante.
          </p>
          <div
            className="mt-7 flex justify-center gap-1.5"
            role="radiogroup"
            aria-label="Nota do atendimento"
          >
            {[1, 2, 3, 4, 5].map((numero) => (
              <button
                key={numero}
                type="button"
                role="radio"
                aria-checked={estrelas === numero}
                onClick={() => setEstrelas(numero)}
                aria-label={`${numero} ${numero === 1 ? "estrela" : "estrelas"}`}
                className="grid h-12 w-12 place-items-center rounded-full transition-transform hover:scale-105 active:scale-95"
              >
                <Star
                  className={`h-9 w-9 transition-colors ${numero <= estrelas ? "fill-highlight text-highlight" : "text-border"}`}
                />
              </button>
            ))}
          </div>
          <label htmlFor="comentario" className="mt-8 text-sm font-semibold">
            Comentário <span className="font-normal text-muted-foreground">(opcional)</span>
          </label>
          <Textarea
            id="comentario"
            value={comentario}
            onChange={(event) => setComentario(event.target.value)}
            placeholder="Conte como foi sua experiência"
            maxLength={400}
            className="mt-2 min-h-28"
          />
          <BarraAcao>
            <Button
              onClick={() => {
                if (estrelas > 0)
                  void submitRating({
                    data: {
                      restaurantId: restaurante,
                      tableId: String(dados.mesa),
                      session: sessaoMesa,
                      stars: estrelas,
                      comment: comentario.trim() || undefined,
                    },
                  }).catch(() => undefined);
                setEtapa("fim");
              }}
              className="h-12 w-full font-display text-base"
            >
              {estrelas > 0 ? "Enviar avaliação" : "Continuar"} <ChevronRight />
            </Button>
          </BarraAcao>
        </main>
      )}

      {etapaVisivel === "gorjeta" &&
        (() => {
          // Antes de pagar, a base é a parte da conta escolhida; depois, o que foi pago.
          const contaPaga = ultimoPagamento !== null;
          const base = contaPaga ? valorPago : totalConta;
          const opcoes = suggestedTips(base);
          const valorOutro = lerValor(gorjetaOutro);
          const erroOutro =
            gorjetaOutroAberto && gorjetaOutro ? validarGorjeta(valorOutro, base) : null;
          const seguir = (valor: number) => {
            setGorjetaExtra(valor);
            setErroPagamento(null);
            if (contaPaga) {
              if (valor > 0) {
                setMetodoGorjeta((m) => m ?? "pix");
                setEtapa("pagamento-gorjeta");
              } else setEtapa("avaliacao");
            } else setEtapa("pagamento-conta");
          };
          const garcom = dados.garcom?.split(" ")[0];
          return (
            <main className="flex flex-1 flex-col px-5 pb-8">
              <h1 className="mt-4 text-center text-[2.1rem] font-medium leading-[1.04] tracking-[-0.04em]">
                {garcom
                  ? `Agradeça ao ${garcom} com uma gorjeta`
                  : "Quer deixar uma gorjeta extra?"}
              </h1>
              <p className="mt-3 text-center text-[0.95rem] leading-6 text-muted-foreground">
                É opcional e vai além da taxa de serviço da conta.
              </p>
              <div
                className="mt-8 grid grid-cols-2 gap-2.5"
                role="radiogroup"
                aria-label="Valor da gorjeta"
              >
                {opcoes.map((s) => {
                  const ativo = gorjetaExtra === s.amount && !gorjetaOutroAberto;
                  return (
                    <button
                      key={s.label}
                      type="button"
                      role="radio"
                      aria-checked={ativo}
                      onClick={() => {
                        setGorjetaOutroAberto(false);
                        setGorjetaOutro("");
                        setGorjetaExtra(s.amount);
                      }}
                      className={`relative flex h-24 flex-col items-center justify-center gap-1 rounded-[1.25rem] border bg-card transition-[border-color,transform] active:scale-[0.98] ${ativo ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40"}`}
                    >
                      {s.sugerida && (
                        <span className="absolute left-2 top-2 rounded-full bg-brand-soft px-2 py-0.5 text-[0.68rem] font-semibold text-brand-strong">
                          Sugerida
                        </span>
                      )}
                      {ativo && (
                        <span className="absolute right-2 top-2 grid h-5 w-5 place-items-center rounded-full bg-foreground text-background">
                          <Check className="h-3 w-3" strokeWidth={3} />
                        </span>
                      )}
                      <span className="text-xl font-medium">{s.label}</span>
                      {s.label.endsWith("%") && (
                        <span className="money text-xs text-muted-foreground">
                          {money(s.amount)}
                        </span>
                      )}
                    </button>
                  );
                })}
                <button
                  type="button"
                  role="radio"
                  aria-checked={gorjetaOutroAberto}
                  onClick={() => {
                    setGorjetaOutroAberto(true);
                    const v = lerValor(gorjetaOutro);
                    setGorjetaExtra(v !== null && !validarGorjeta(v, base) ? v : 0);
                  }}
                  className={`relative flex h-24 flex-col items-center justify-center gap-1 rounded-[1.25rem] border bg-card transition-[border-color,transform] active:scale-[0.98] ${gorjetaOutroAberto ? "border-foreground ring-1 ring-foreground" : "border-border hover:border-foreground/40"}`}
                >
                  <span className="text-xl font-medium">Outro valor</span>
                  <span className="text-xs text-muted-foreground">você escolhe</span>
                </button>
              </div>
              {gorjetaOutroAberto && (
                <div className="mt-4">
                  <label htmlFor="gorjeta-outro" className="text-sm font-semibold">
                    Digite o valor
                  </label>
                  <Input
                    id="gorjeta-outro"
                    inputMode="decimal"
                    maxLength={10}
                    autoFocus
                    value={gorjetaOutro}
                    placeholder="R$ 0,00"
                    aria-invalid={!!erroOutro}
                    aria-describedby="gorjeta-outro-ajuda"
                    className="mt-1 h-11"
                    onChange={(e) => {
                      const t = e.target.value.replace(/[^\d,.]/g, "");
                      setGorjetaOutro(t);
                      const v = lerValor(t);
                      setGorjetaExtra(v !== null && !validarGorjeta(v, base) ? v : 0);
                    }}
                  />
                  <p
                    id="gorjeta-outro-ajuda"
                    className={`mt-1.5 text-xs ${erroOutro ? "text-destructive" : "text-muted-foreground"}`}
                  >
                    {erroOutro ??
                      `De ${money(2)} até ${money(gorjetaMaxima(base))}, o valor da sua conta.`}
                  </p>
                </div>
              )}
              {gorjetaExtra > 0 && (
                <p className="mt-4 rounded-xl bg-muted px-3 py-2.5 text-xs leading-5 text-muted-foreground">
                  Dos <strong className="money text-foreground">{money(gorjetaExtra)}</strong>,{" "}
                  <strong className="money text-foreground">
                    {money(+(gorjetaExtra * TIP_SPLIT.waiter).toFixed(2))}
                  </strong>{" "}
                  vão para {garcom ? `o ${garcom}` : "a equipe"} e{" "}
                  <span className="money">
                    {money(+(gorjetaExtra * TIP_SPLIT.tipe).toFixed(2))}
                  </span>{" "}
                  ficam com a TIPE. É cobrada à parte, logo depois da conta.
                </p>
              )}
              <div className="mt-6 grid gap-2">
                <Button
                  disabled={gorjetaExtra <= 0}
                  onClick={() => seguir(gorjetaExtra)}
                  className="h-12 w-full font-display text-base"
                >
                  {gorjetaExtra > 0 ? `Continuar com ${money(gorjetaExtra)}` : "Escolha um valor"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => {
                    setGorjetaOutroAberto(false);
                    setGorjetaOutro("");
                    seguir(0);
                  }}
                  className="h-12 w-full"
                >
                  Sem gorjeta
                </Button>
              </div>
              <Link
                to="/legal/$livro"
                params={{ livro: "termos-de-uso" }}
                hash="gorjeta-extra"
                target="_blank"
                className="mt-4 block text-center text-sm font-semibold text-brand-strong underline-offset-2 hover:underline"
              >
                Como funciona a gorjeta?
              </Link>
            </main>
          );
        })()}

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

      {etapaVisivel === "gorjeta-confirmada" && (
        <TelaCentral>
          <img
            src={mascotThanks}
            alt="Lebre da TIPE sorrindo agradecendo a gorjeta"
            className="bob mx-auto mb-1 h-32 w-32 object-contain"
          />
          <p className="eyebrow text-brand-strong">Gorjeta recebida</p>
          <h1 className="mt-2 text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            {dados.garcom ? `${dados.garcom.split(" ")[0]} e a equipe agradecem!` : "A equipe agradece!"}
          </h1>
          <p className="mt-2 text-[0.95rem] text-muted-foreground">
            Sua gorjeta de <span className="money font-semibold">{money(gorjetaExtra)}</span> foi
            confirmada. Obrigado, {primeiroNome}.
          </p>
          <div className="mt-8 w-full">
            <Button
              onClick={() => setEtapa("avaliacao")}
              className="h-12 w-full font-display text-base"
            >
              Avaliar o atendimento <ChevronRight />
            </Button>
          </div>
        </TelaCentral>
      )}

      {etapaVisivel === "mesa-encerrada" && (
        <TelaCentral>
          <img
            src={mascotTableClosed}
            alt="Lebre da TIPE dormindo: a conta está encerrada"
            loading="lazy"
            width={1024}
            height={1024}
            className="mx-auto h-36 w-36 object-contain"
          />
          <span className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1 text-xs font-semibold text-brand-strong">
            <Check className="h-3.5 w-3.5" strokeWidth={3} />
            Tudo confirmado
          </span>
          <h1 className="mt-4 text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Mesa encerrada
          </h1>
          <p className="mt-3 max-w-xs text-center text-sm leading-6 text-muted-foreground">
            Todos os itens desta mesa foram pagos e não há pagamentos pendentes.
          </p>
          <p className="mt-2 max-w-xs text-center text-xs text-muted-foreground">
            Uma nova conta será aberta nesta mesa automaticamente em até 2 minutos.
          </p>
          {linkAvaliacao && (
            <a
              href={linkAvaliacao}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-6 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:border-primary"
            >
              <Star className="h-4 w-4 text-highlight" aria-hidden /> Avaliar {dados.restaurante} no
              Google
            </a>
          )}
          <Button
            variant="outline"
            onClick={() => {
              setVoltouParaMesa(true);
              setEtapa("conta");
              setAba("atividade");
            }}
            className="mt-3 h-12 w-full"
          >
            Voltar à mesa
          </Button>
        </TelaCentral>
      )}

      {etapaVisivel === "fim" && (
        <TelaCentral>
          <img
            src={mascotThanks}
            alt="Lebre da TIPE sorrindo"
            width={176}
            height={176}
            className="mx-auto h-32 w-32 object-contain"
          />
          <p className="mt-4 eyebrow text-brand-strong">Tudo certo, {primeiroNome}!</p>
          <h1 className="mt-2 text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
            Obrigado pela sua visita.
          </h1>
          <p className="mt-3 max-w-xs text-center text-sm leading-6 text-muted-foreground">
            Sua conta foi paga e sua avaliação foi registrada.
          </p>
          {gorjetaPaga && gorjetaExtra > 0 && (
            <p className="mt-4 rounded-xl bg-brand-soft px-4 py-2.5 text-center text-sm font-semibold text-brand-strong">
              Gorjeta de <span className="money">{money(gorjetaExtra)}</span> recebida. A equipe
              agradece!
            </p>
          )}
          {linkAvaliacao && (
            // Mostrado a todos os clientes, sem filtrar por nota (as regras do Google proíbem pedir avaliação só de quem gostou).
            <a
              href={linkAvaliacao}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl border border-border bg-card px-5 text-sm font-semibold hover:border-primary"
            >
              <Star className="h-4 w-4 text-highlight" aria-hidden /> Avaliar {dados.restaurante} no
              Google
            </a>
          )}
          <div className="mt-8 w-full space-y-2">
            {mesaEncerrada && (
              <Button
                onClick={() => setEtapa("mesa-encerrada")}
                className="h-12 w-full font-display text-base"
              >
                Ver mesa encerrada <ChevronRight />
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => {
                setVoltouParaMesa(true);
                setEtapa("conta");
                setAba("atividade");
              }}
              className="h-12 w-full"
            >
              Voltar à mesa
            </Button>
          </div>
        </TelaCentral>
      )}
    </div>
  );
}

/* ----------------------------------------------------------------------------
 * Peças visuais da conta. Nenhuma delas tem regra de negócio: só apresentação.
 * -------------------------------------------------------------------------- */

const PASSOS = ["Conta", "Pagamento", "Pronto"] as const;
function passoDaEtapa(etapa: Etapa) {
  if (etapa === "conta") return 0;
  if (
    etapa === "gorjeta" ||
    etapa === "pagamento-conta" ||
    etapa === "pix" ||
    etapa === "conta-pendente"
  )
    return 1;
  return 2;
}

/** Topo leve: logo, restaurante, mesa e progresso em três passos. */
function MesaTopo({
  restaurante,
  logoUrl,
  mesa,
  etapa,
  mostrarMesa,
  aoVivo,
}: {
  restaurante: string;
  logoUrl: string | null;
  mesa: string;
  etapa: Etapa;
  mostrarMesa: boolean;
  aoVivo: boolean;
}) {
  const passo = passoDaEtapa(etapa);
  return (
    <header className="px-5 pb-5 pt-5">
      <div className="flex items-center justify-between gap-3">
        <span className="inline-flex">
          <img
            src={logoDark}
            alt="TIPE"
            width={92}
            height={28}
            className="h-7 w-auto [@media(prefers-color-scheme:dark)]:hidden"
          />
          <img
            src={logoLight}
            alt="TIPE"
            width={92}
            height={28}
            className="hidden h-7 w-auto [@media(prefers-color-scheme:dark)]:block"
          />
        </span>
        {mostrarMesa && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-3 py-1 text-xs font-semibold">
            <span
              className={`h-1.5 w-1.5 rounded-full ${aoVivo ? "tipe-live bg-primary" : "bg-muted-foreground/40"}`}
              aria-hidden
            />
            Mesa {mesa}
          </span>
        )}
      </div>
      {mostrarMesa && (
        <>
          {restaurante && (
            <div className="mt-5 rounded-2xl border border-border bg-card p-3">
              <MarcaRestaurante nome={restaurante} logoUrl={logoUrl} detalhe={`Mesa ${mesa}`} tamanho={52} />
            </div>
          )}
          <ol className="mt-4 grid grid-cols-3 gap-2" aria-label="Etapas do pagamento">
            {PASSOS.map((rotulo, indice) => (
              <li key={rotulo} aria-current={indice === passo ? "step" : undefined}>
                <span
                  className={`block h-1 rounded-full transition-colors ${indice <= passo ? "bg-primary" : "bg-border"}`}
                />
                <span
                  className={`mt-1.5 block text-[11px] font-semibold ${indice === passo ? "text-foreground" : "text-muted-foreground"}`}
                >
                  {rotulo}
                </span>
              </li>
            ))}
          </ol>
        </>
      )}
    </header>
  );
}

/** Esqueleto da conta enquanto a mesa carrega (sem saltos de layout). */
function ContaCarregando() {
  return (
    <main className="flex flex-1 flex-col px-5" aria-busy="true" aria-label="Carregando mesa">
      <div className="h-8 w-40 animate-pulse rounded-lg bg-muted motion-reduce:animate-none" />
      <div className="mt-2 h-4 w-56 animate-pulse rounded bg-muted motion-reduce:animate-none" />
      <div className="mt-6 h-12 animate-pulse rounded-full bg-muted motion-reduce:animate-none" />
      <div className="mt-6 space-y-2.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="h-[104px] animate-pulse rounded-2xl bg-muted motion-reduce:animate-none"
          />
        ))}
      </div>
      <span className="sr-only">Carregando a conta da mesa…</span>
    </main>
  );
}

/** Ação principal fixa no rodapé, sempre ao alcance do polegar. */
function BarraAcao({ children }: { children: React.ReactNode }) {
  return (
    <div className="sticky bottom-0 z-10 -mx-5 mt-6 border-t border-border bg-background/90 px-5 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur-md">
      {children}
    </div>
  );
}

function Spinner({ className = "" }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block h-3.5 w-3.5 animate-spin rounded-full border-2 border-muted border-t-primary motion-reduce:animate-none",
        className,
      )}
    />
  );
}

function EstadoPagamento({ status }: { status: SharedPayment["status"] }) {
  const cls =
    status === "approved"
      ? "bg-brand-soft text-brand-strong"
      : status === "pending"
        ? "bg-highlight/15 text-foreground"
        : "bg-destructive/12 text-destructive";
  return (
    <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-semibold ${cls}`}>
      {PAYMENT_STATUS_LABEL[status] ?? "Pendente"}
    </span>
  );
}

function LinhaRecibo({ rotulo, children }: { rotulo: string; children: React.ReactNode }) {
  return (
    <div className="flex items-baseline justify-between gap-4 border-b border-border py-2.5 first:pt-0 last:border-0 last:pb-0">
      <dt className="text-muted-foreground">{rotulo}</dt>
      <dd className="text-right font-semibold">{children}</dd>
    </div>
  );
}

const metodoNome = (id: string) =>
  metodos.find((m) => m.id === id)?.label ?? (id === "card" ? "Cartão" : "Pagamento");

function PixPagamento({
  codigo,
  qrUrl,
  valor,
}: {
  codigo: string;
  qrUrl?: string | undefined;
  valor: number;
}) {
  const [copiado, setCopiado] = useState(false);
  useEffect(() => {
    if (!copiado) return;
    const t = window.setTimeout(() => setCopiado(false), 2500);
    return () => window.clearTimeout(t);
  }, [copiado]);
  return (
    <main className="flex flex-1 flex-col px-5 pb-8">
      <p className="eyebrow text-brand-strong">Pix gerado</p>
      <h1 className="mt-2 text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">
        Pague com Pix
      </h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">
        Abra o app do seu banco e use o QR Code ou o código copia e cola. A confirmação aparece aqui
        sozinha.
      </p>
      <div className="mt-6 rounded-3xl border border-border bg-card p-5 text-center">
        <p className="text-xs text-muted-foreground">Valor</p>
        <p className="money mt-0.5 font-display text-3xl font-semibold tracking-heading">
          {money(valor)}
        </p>
        {qrUrl && (
          <img
            src={qrUrl}
            alt="QR Code do Pix"
            width={208}
            height={208}
            className="mx-auto mt-5 h-52 w-52 rounded-2xl bg-white p-2"
          />
        )}
        <p className="mt-5 break-all rounded-xl bg-muted p-3 text-left font-mono text-[11px] leading-relaxed text-muted-foreground">
          {codigo}
        </p>
        <Button
          onClick={() => {
            void navigator.clipboard
              .writeText(codigo)
              .then(() => setCopiado(true))
              .catch(() => undefined);
          }}
          variant={copiado ? "soft" : "default"}
          className="mt-4 h-12 w-full font-display text-base"
        >
          {copiado ? (
            <>
              <Check /> Código copiado
            </>
          ) : (
            <>
              <Copy /> Copiar código Pix
            </>
          )}
        </Button>
      </div>
      <p
        role="status"
        className="mt-5 flex items-center justify-center gap-2 text-sm text-muted-foreground"
      >
        <Spinner />
        Aguardando a confirmação do banco…
      </p>
    </main>
  );
}

function ResumoLinha({
  label,
  valor,
  className = "",
  destaque = false,
}: {
  label: string;
  valor: number;
  className?: string;
  destaque?: boolean;
}) {
  return (
    <div className={`flex items-baseline justify-between gap-4 ${className}`}>
      <span className={destaque ? "font-display text-base font-semibold" : "text-muted-foreground"}>
        {label}
      </span>
      <span className={`money ${destaque ? "font-display text-lg font-semibold" : ""}`}>
        {money(valor)}
      </span>
    </div>
  );
}

function Pagamento({
  extra,
  titulo,
  descricao,
  rotuloValor,
  valor,
  metodo,
  setMetodo,
  pagando,
  erro,
  voltar,
  pagar,
  permitirEstabelecimento = false,
  metodosAceitos,
  metodoEstabelecimento,
  setMetodoEstabelecimento,
  valorDinheiro = "",
  setValorDinheiro,
  cartao,
  setCartao,
}: {
  extra?: React.ReactNode;
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
    ? metodos.filter(
        (opcao) => opcao.id !== "card" && (!metodosAceitos || metodosAceitos.includes(opcao.id)),
      )
    : // Na gorjeta, cartão só aparece quando o provedor está configurado para tokenizar.
      metodos.filter(
        (opcao) => opcao.id !== "at_establishment" && (opcao.id !== "card" || !!cartao),
      );
  // Decisão do Roberto (15/10): Apple Pay e Google Pay aparecem como meios disponíveis.
  const ativas = opcoes;
  // Se o servidor recusar a carteira, o Pix fica a um toque.
  const carteiraRecusada =
    !!erro && /Apple Pay|Google Pay/.test(erro) && opcoes.some((opcao) => opcao.id === "pix");
  const dinheiro = Number(valorDinheiro.replace(",", "."));
  const bloqueado =
    !metodo ||
    pagando ||
    (permitirEstabelecimento && !aceitouTermos) ||
    (metodo === "at_establishment" &&
      (!metodoEstabelecimento || (metodoEstabelecimento === "cash" && dinheiro < valor))) ||
    (metodo === "card" && !!cartao && !cardValid(cartao));
  return (
    <main className="flex flex-1 flex-col px-5">
      <button
        type="button"
        onClick={voltar}
        className="-ml-2 mb-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2 py-1.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar
      </button>
      <h1 className="text-[1.9rem] font-medium leading-[1.06] tracking-[-0.035em]">{titulo}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{descricao}</p>
      <div className="my-6 rounded-3xl bg-secondary px-5 py-6 text-center text-secondary-foreground">
        <p className="text-xs text-secondary-foreground/65">{rotuloValor}</p>
        <p className="money mt-1 font-display text-[2.4rem] font-semibold leading-none tracking-heading">
          {money(valor)}
        </p>
        {extra}
      </div>
      <h2 className="text-sm font-semibold">Forma de pagamento</h2>
      <div className="mt-3 flex flex-col gap-2.5" role="radiogroup" aria-label="Forma de pagamento">
        {ativas.map((opcao) => {
          const { descricao: descricaoMetodo, Icone } = metodoDetalhes[opcao.id];
          const selecionado = metodo === opcao.id;
          return (
            <button
              key={opcao.id}
              type="button"
              role="radio"
              aria-checked={selecionado}
              onClick={() => {
                setMetodo(opcao.id);
                if (opcao.id !== "at_establishment") setMetodoEstabelecimento?.(null);
              }}
              className={`flex min-h-16 w-full items-center gap-3 rounded-2xl border bg-card px-4 py-3.5 text-left transition-colors ${selecionado ? "border-foreground bg-card ring-1 ring-foreground" : "border-border hover:border-foreground/25"}`}
            >
              <span
                className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${selecionado ? "bg-secondary text-secondary-foreground" : "bg-muted text-foreground"}`}
              >
                <Icone className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block font-semibold">{opcao.label}</span>
                <span className="block text-xs text-muted-foreground">{descricaoMetodo}</span>
              </span>
              {selecionado ? (
                <span
                  className="grid h-5 w-5 shrink-0 place-items-center rounded-full bg-foreground"
                  aria-hidden="true"
                >
                  <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
                </span>
              ) : (
                <span
                  className="h-5 w-5 shrink-0 rounded-full border-2 border-input"
                  aria-hidden="true"
                />
              )}
            </button>
          );
        })}
      </div>
      {metodo === "at_establishment" && permitirEstabelecimento && setMetodoEstabelecimento && (
        <div className="mt-4 rounded-2xl border border-border bg-muted/50 p-4">
          <h3 className="text-sm font-semibold">Como você vai pagar no estabelecimento?</h3>
          <div
            className="mt-3 grid grid-cols-2 gap-1 rounded-full bg-muted p-1"
            role="radiogroup"
            aria-label="Pagamento no estabelecimento"
          >
            {(
              [
                ["cash", "Dinheiro"],
                ["card_terminal", "Maquininha"],
              ] as const
            ).map(([id, rotulo]) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={metodoEstabelecimento === id}
                onClick={() => setMetodoEstabelecimento(id)}
                className={`h-10 rounded-full text-sm font-semibold transition-colors ${metodoEstabelecimento === id ? "bg-card text-foreground shadow-xs" : "text-muted-foreground"}`}
              >
                {rotulo}
              </button>
            ))}
          </div>
          {metodoEstabelecimento === "cash" && setValorDinheiro && (
            <div className="mt-4">
              <label htmlFor="cash-received" className="text-sm font-semibold">
                Quanto você vai entregar em dinheiro?
              </label>
              <Input
                id="cash-received"
                type="number"
                inputMode="decimal"
                min={valor}
                max={100000}
                step="0.01"
                value={valorDinheiro}
                onChange={(event) => setValorDinheiro(event.target.value)}
                placeholder={money(valor)}
                className="money mt-2 h-12"
              />
              {dinheiro >= valor && (
                <p className="mt-2 text-sm font-semibold text-brand-strong">
                  Troco:{" "}
                  <span className="money">{money(Math.round((dinheiro - valor) * 100) / 100)}</span>
                </p>
              )}
              {valorDinheiro && dinheiro < valor && (
                <p role="alert" className="mt-2 text-xs text-destructive">
                  O valor precisa cobrir o total da conta.
                </p>
              )}
            </div>
          )}
          {metodoEstabelecimento && (
            <p className="mt-4 text-sm leading-6 text-muted-foreground">
              {metodoEstabelecimento === "cash"
                ? "Prepare o dinheiro. O garçom tratará do seu troco em breve."
                : "O garçom irá em instantes até sua mesa com a maquininha."}
            </p>
          )}
        </div>
      )}
      {metodo === "card" && cartao && setCartao && (
        <div className="mt-5">
          <CardFields value={cartao} onChange={setCartao} />
        </div>
      )}
      {erro && (
        <div
          role="alert"
          className="mt-4 rounded-xl bg-destructive/10 px-3 py-2.5 text-sm text-destructive"
        >
          {carteiraRecusada
            ? "Este restaurante ainda não recebe Apple Pay e Google Pay pela TIPE. O Pix é instantâneo e já está disponível."
            : erro}
          {carteiraRecusada && metodo !== "pix" && (
            <Button
              type="button"
              variant="outline"
              onClick={() => setMetodo("pix")}
              className="mt-2 h-10 w-full bg-card text-foreground"
            >
              <QrCode /> Pagar com Pix
            </Button>
          )}
        </div>
      )}
      <BarraAcao>
        {permitirEstabelecimento && (
          <div className="mb-3 flex items-start gap-3">
            <Checkbox
              id="aceite-termos"
              checked={aceitouTermos}
              onCheckedChange={(checked) => setAceitouTermos(checked === true)}
              className="mt-0.5 h-5 w-5"
            />
            <label htmlFor="aceite-termos" className="text-xs leading-5 text-muted-foreground">
              Confirmo que revisei e me responsabilizo pelos itens selecionados. Aceito os{" "}
              <Dialog>
                <DialogTrigger asChild>
                  <button
                    type="button"
                    className="font-semibold text-brand-strong underline-offset-2 hover:underline"
                  >
                    Termos de Uso
                  </button>
                </DialogTrigger>
                <DialogContent className="max-h-[85svh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Termos de Uso do pagamento</DialogTitle>
                    <DialogDescription>
                      Leia antes de confirmar sua parte da conta.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 text-sm leading-6 text-muted-foreground">
                    <p>
                      Ao continuar, você declara que conferiu os itens e as quantidades escolhidas e
                      reconhece que este pagamento cobre somente essa seleção.
                    </p>
                    <p>
                      Após a confirmação, os itens pagos serão retirados do saldo disponível da
                      mesa. Valores ainda não pagos permanecerão na conta.
                    </p>
                    <p>
                      Pagamentos digitais são confirmados automaticamente. Pagamentos em dinheiro ou
                      maquininha permanecem pendentes até a confirmação manual do restaurante.
                    </p>
                    <p>
                      Em caso de divergência, procure o restaurante antes de concluir o pagamento.
                    </p>
                  </div>
                </DialogContent>
              </Dialog>
              .
            </label>
          </div>
        )}
        <Button disabled={bloqueado} onClick={pagar} className="h-13 w-full font-display text-base">
          {pagando ? (
            <>
              <Spinner className="border-primary-foreground/30 border-t-primary-foreground" />{" "}
              Processando…
            </>
          ) : (
            <>
              Pagar <span className="money">{money(valor)}</span>
            </>
          )}
        </Button>
        {metodo === "at_establishment" && metodoEstabelecimento && (
          <p className="mt-2 text-center text-xs text-muted-foreground">
            O garçom verá{" "}
            {metodoEstabelecimento === "cash"
              ? "o valor entregue e o troco"
              : "que o pagamento será na maquininha"}{" "}
            antes de confirmar.
          </p>
        )}
        <p className="mt-2 text-center text-[11px] leading-4 text-muted-foreground">
          Ao continuar, você concorda com os{" "}
          <Link
            to="/legal/$livro"
            params={{ livro: "termos-de-uso" }}
            target="_blank"
            className="underline underline-offset-2"
          >
            Termos de Uso
          </Link>{" "}
          e a{" "}
          <Link
            to="/legal/$livro"
            params={{ livro: "privacidade" }}
            target="_blank"
            className="underline underline-offset-2"
          >
            Política de Privacidade
          </Link>
          .
        </p>
      </BarraAcao>
    </main>
  );
}

function TelaCentral({ children }: { children: React.ReactNode }) {
  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
      {children}
    </main>
  );
}
