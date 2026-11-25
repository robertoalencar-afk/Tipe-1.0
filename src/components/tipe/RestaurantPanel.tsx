import { IdentidadeLebre } from "./IdentidadeLebre";
import { CardapioGestao } from "./CardapioGestao";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { chaveLancamento, type ChaveLancamento } from "@/lib/tipe/pdv/comanda";
import { toast } from "sonner";
import { QRCodeSVG } from "qrcode.react";
import {
  ArrowRightLeft,
  CalendarDays,
  BarChart3,
  ChefHat,
  Check,
  FileText,
  History,
  Home,
  LayoutGrid,
  Minus,
  MoreHorizontal,
  Plug,
  Plus,
  Printer,
  QrCode,
  RefreshCw,
  CreditCard,
  Settings,
  Star,
  ShoppingCart,
  UtensilsCrossed,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  getPanelData,
  inviteStaff,
  removeStaff,
  resolvePayment,
  type StaffRole,
} from "@/lib/tipe/staff.functions";
import {
  addTable,
  addTablesBulk,
  closeTable,
  waiveServiceFee,
  getTablePlan,
  getPdvData,
  launchOrder,
  saveWaiter,
  updateTable,
  editTable,
  voidItem,
} from "@/lib/tipe/pdv.functions";
import { transferTable } from "@/lib/tipe/admin.functions";
import {
  getPdvIntegration,
  getTopItems,
} from "@/lib/tipe/pdv-integrations.functions";
import { PixGarcons } from "@/components/tipe/PixGarcons";
import { SegurancaConta } from "@/components/tipe/SegurancaConta";
import { Atendimento } from "@/components/tipe/Atendimento";
import { Caixa, Configuracoes, Inicio, Integracoes, Relatorios, useOps } from "@/components/tipe/AdminSections";
import { Cozinha } from "@/components/tipe/Kds";
import { Shell, type GrupoNav } from "@/components/tipe/painel/Shell";
import { UploadImagem } from "@/components/tipe/UploadImagem";
import { BancoImagens } from "@/components/tipe/BancoImagens";
import { ComoFuncionaGestao } from "@/components/tipe/ComoFuncionaGestao";
import { PerfilConta, useMeuPerfil } from "@/components/tipe/PerfilConta";
import { avisoDasPendencias, type Pendencia } from "@/lib/tipe/pendencias";
import { getMidia, saveLogo } from "@/lib/tipe/midia.functions";
import { Image as ImagemIcon, Images, BookOpen, Camera } from "lucide-react";
import { StudioFotos } from "@/components/tipe/StudioFotos";
import { EquipePermissoes } from "@/components/tipe/EquipePermissoes";
import { Fiscal } from "@/components/tipe/Fiscal";
import { TotemStudio } from "@/components/tipe/TotemStudio";
import { LiberarPedidosMesa } from "@/components/tipe/LiberarPedidosMesa";
import { EstacoesConfig } from "@/components/tipe/EstacoesConfig";
import { DesignarGarcom } from "@/components/tipe/DesignarGarcom";
import { BotaoPreConta } from "@/components/tipe/PreConta";
import { linkMesa } from "@/lib/tipe/imprimir";
import { Assinatura, AvisoAssinatura, ContaBloqueada } from "@/components/tipe/Assinatura";
import { getAccountAccess } from "@/lib/tipe/subscription.functions";
import { abaLiberada } from "@/lib/tipe/assinatura";
import { Recebimentos } from "@/components/tipe/Recebimentos";
import { AvisoPendencias, PendenciasFinanceiras } from "@/components/tipe/PendenciasFinanceiras";
import { grantWaiterAccess } from "@/lib/tipe/waiter.functions";
import { Landmark, ShieldCheck } from "lucide-react";
import { DesempenhoGarcons } from "@/components/tipe/DesempenhoGarcons";
import { ReservasPainel } from "@/components/tipe/ReservasPainel";
import { getReservasAcesso } from "@/lib/tipe/guest/reservas.functions";
import { OnboardingPdv } from "@/components/tipe/OnboardingPdv";
import { PrecisaDeVoce } from "@/components/tipe/PrecisaDeVoce";
import { LazyLebreAssistant } from "@/components/tipe/LazyLebreAssistant";
import { BalcaoCheckout, VendasBalcao } from "@/components/tipe/Balcao";
import { EmptyState, PageHeader, StatusBadge, type Tone } from "@/components/tipe/ds";
import { cn } from "@/lib/utils";

const brl = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hora = (s: string) =>
  new Date(s).toLocaleString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
const cargoLabel: Record<StaffRole, string> = {
  founder: "Fundador",
  owner: "Administrador",
  manager: "Gerente",
  cashier: "Caixa",
  waiter: "Garçom",
};
const metodoLabel: Record<string, string> = {
  pix: "Pix",
  card: "Cartão",
  apple_pay: "Apple Pay",
  google_pay: "Google Pay",
  at_establishment: "No estabelecimento",
};
const acaoLabel: Record<string, string> = {
  confirm: "Pagamento confirmado",
  cancel: "Pagamento cancelado",
  table_reopened: "Mesa encerrada e liberada",
};
const formatPortion = (value: number) => {
  const rounded = Math.round(value * 10000) / 10000;
  const whole = Math.floor(rounded + 0.0001);
  const fraction = rounded - whole;
  const fractionLabel =
    Math.abs(fraction - 0.5) < 0.0001
      ? "metade"
      : Math.abs(fraction - 1 / 3) < 0.0001
        ? "1/3"
        : Math.abs(fraction - 0.25) < 0.0001
          ? "1/4"
          : fraction > 0.0001
            ? `${Math.round(fraction * 100)}%`
            : "";
  if (!whole) return fractionLabel || "0";
  return fractionLabel ? `${whole} + ${fractionLabel}` : `${whole}×`;
};

type Status = "livre" | "ocupada" | "aguardando" | "encerrada" | "inativa";
const statusInfo: Record<Status, { label: string; tone: Tone; card: string }> = {
  livre: { label: "Livre", tone: "neutral", card: "border-dashed border-border bg-surface/60" },
  ocupada: { label: "Ocupada", tone: "brand", card: "border-border bg-surface" },
  aguardando: {
    label: "Aguardando confirmação",
    tone: "warning",
    card: "border-warning/60 bg-surface ring-1 ring-warning/40",
  },
  encerrada: { label: "Encerrada", tone: "success", card: "border-border bg-surface" },
  inativa: {
    label: "Desativada",
    tone: "neutral",
    card: "border-dashed border-border bg-transparent opacity-60",
  },
};
const selectCls =
  "h-10 w-full rounded-xl border border-input bg-card px-3 text-sm shadow-xs outline-none transition-colors hover:border-foreground/25 focus-visible:ring-2 focus-visible:ring-focus-ring/30";

const secoes = [
  {
    k: "inicio",
    l: "Início",
    i: Home,
    g: "Operação",
    d: "O resumo do dia e os atalhos mais usados.",
  },
  {
    k: "comofunciona",
    l: "Como funciona",
    i: BookOpen,
    g: "Operação",
    d: "Passo a passo do Tipe Gestão, do cardápio ao fechamento do caixa.",
  },
  {
    k: "salao",
    l: "Salão",
    i: LayoutGrid,
    g: "Operação",
    d: "Cada mesa ao vivo: o que foi pedido, pago e o que falta.",
  },
  {
    k: "pdv",
    l: "Lançamento e balcão",
    i: ShoppingCart,
    g: "Operação",
    d: "Lance pedidos nas mesas ou venda no balcão com senha.",
  },
  {
    k: "cozinha",
    l: "Cozinha e bar",
    i: ChefHat,
    g: "Operação",
    d: "Pedidos por setor, do recebido ao entregue, e o painel de senhas.",
  },
  {
    k: "reservas",
    l: "Reservas",
    i: CalendarDays,
    g: "Operação",
    // Só aparece com a flag guest.reservations ligada para o restaurante (Tipe Reserva).
    flag: "reservas",
    d: "Reservas do dia, chegadas, mesas, lista de espera e regras de horário.",
  },
  {
    k: "caixa",
    l: "Caixa",
    i: Wallet,
    g: "Financeiro",
    d: "Abertura, movimentos, fechamento e pagamentos a confirmar.",
  },
  {
    k: "historico",
    l: "Histórico",
    i: History,
    g: "Financeiro",
    d: "Confirmações, cancelamentos e reaberturas com data e hora.",
  },
  {
    k: "relatorios",
    l: "Relatórios",
    i: BarChart3,
    g: "Financeiro",
    d: "Vendas, pagamentos, gorjetas e estornos por período.",
  },
  {
    k: "fiscal",
    l: "Fiscal",
    i: FileText,
    g: "Financeiro",
    fiscal: true,
    d: "Emitente, conexão fiscal, perfis tributários e documentos do restaurante.",
  },
  {
    k: "recebimentos",
    l: "Recebimentos",
    i: Landmark,
    g: "Financeiro",
    dono: true,
    d: "Conta que recebe os pagamentos digitais.",
  },
  {
    k: "equipe",
    l: "Equipe e garçons",
    i: Users,
    g: "Equipe",
    dono: true,
    d: "Pessoas com acesso, garçons e chaves Pix.",
  },
  {
    k: "garcons",
    l: "Garçons: avaliações",
    i: Star,
    g: "Equipe",
    dono: true,
    d: "Avaliações e gorjetas por garçom.",
  },
  {
    k: "cardapio",
    l: "Cardápio",
    i: UtensilsCrossed,
    g: "Configurações",
    dono: true,
    d: "Produtos, categorias e disponibilidade.",
  },
  {
    k: "studio",
    l: "Estúdio de fotos",
    i: Camera,
    g: "Configurações",
    dono: true,
    d: "Passo a passo para fotos bonitas e em 3D no cardápio.",
  },
  {
    k: "banco",
    l: "Banco de imagens",
    i: Images,
    g: "Biblioteca",
    dono: true,
    d: "Fotos do restaurante para usar no cardápio e em outras telas.",
  },
  {
    k: "qr",
    l: "Mesas e QR Codes",
    i: QrCode,
    g: "Configurações",
    d: "Mesas, códigos de cada mesa e material para impressão.",
  },
  {
    k: "identidade",
    l: "Perfil",
    i: ImagemIcon,
    g: "Configurações",
    d: "Seu nome e conta, logomarca do restaurante e fotos do cardápio.",
  },
  {
    k: "integracoes",
    l: "Integrações",
    i: Plug,
    g: "Configurações",
    dono: true,
    d: "Conexão com o seu PDV.",
  },
  {
    k: "config",
    l: "Configurações",
    i: Settings,
    g: "Configurações",
    d: "Dados do restaurante, taxa de serviço e formas de pagamento.",
  },
  {
    k: "atendimento",
    l: "Atendimento",
    i: UtensilsCrossed,
    g: "Configurações",
    dono: true,
    d: "Modalidades do Tipe Order, totens e pulseiras.",
  },
  {
    k: "seguranca",
    l: "Segurança da conta",
    i: ShieldCheck,
    g: "Configurações",
    d: "Verificação em duas etapas e troca de senha.",
  },
  {
    k: "assinatura",
    l: "Assinatura",
    i: CreditCard,
    g: "Configurações",
    dono: true,
    d: "Seu plano TIPE.",
  },
] as const;
const GRUPOS = ["Operação", "Financeiro", "Equipe", "Biblioteca", "Configurações"] as const;
const PRINCIPAIS_MOBILE = ["inicio", "salao", "caixa", "pdv"] as const;

/** Esqueleto do painel enquanto os dados chegam. */
export function PainelCarregando() {
  return (
    <div
      className="lg:grid lg:grid-cols-[232px_1fr] lg:gap-8"
      aria-busy="true"
      aria-label="Carregando painel"
    >
      <div className="hidden h-[480px] animate-pulse rounded-2xl bg-surface lg:block motion-reduce:animate-none" />
      <div>
        <div className="h-8 w-48 animate-pulse rounded-lg bg-surface motion-reduce:animate-none" />
        <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none"
            />
          ))}
        </div>
        <div className="mt-4 h-64 animate-pulse rounded-2xl bg-surface motion-reduce:animate-none" />
      </div>
    </div>
  );
}

export function RestaurantPanel({
  slug,
  myRoles,
  isFounder,
  topoAcoes,
  rodape,
  email,
  onSair,
}: {
  slug: string;
  myRoles: StaffRole[];
  isFounder: boolean;
  topoAcoes?: ReactNode;
  rodape?: ReactNode;
  email?: string | undefined;
  onSair?: (() => void) | undefined;
}) {
  const fetchPanel = useServerFn(getPanelData);
  const fetchPdv = useServerFn(getPdvData);
  const resolve = useServerFn(resolvePayment);
  const qc = useQueryClient();
  // O perfil participa de toda renderização, inclusive carregamento, erro e onboarding.
  const meuPerfil = useMeuPerfil();
  const q = useQuery({
    queryKey: ["panel", slug],
    queryFn: () => fetchPanel({ data: { slug } }),
    refetchInterval: 15000,
  });
  const pdv = useQuery({ queryKey: ["pdv", slug], queryFn: () => fetchPdv({ data: { slug } }) });
  const fetchMidia = useServerFn(getMidia);
  const midia = useQuery({ queryKey: ["midia", slug], queryFn: () => fetchMidia({ data: { slug } }), staleTime: 60_000 });
  const fetchInteg = useServerFn(getPdvIntegration);
  const integ = useQuery({
    queryKey: ["pdv-integ", slug],
    queryFn: () => fetchInteg({ data: { slug } }),
    refetchInterval: 30000,
  });
  const fetchReservas = useServerFn(getReservasAcesso);
  const reservas = useQuery({
    queryKey: ["reservas-acesso", slug],
    queryFn: () => fetchReservas({ data: { slug } }),
    staleTime: 5 * 60_000,
  });
  const reservasOn = reservas.data?.enabled === true;
  // Conta vinculada à assinatura: o banco já trava mesas e pedidos novos; aqui só explicamos.
  const fetchAcesso = useServerFn(getAccountAccess);
  const acesso = useQuery({
    queryKey: ["account-access", slug],
    queryFn: () => fetchAcesso({ data: { slug } }),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });
  const [mesaAberta, setMesaAberta] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState<string | null>(null);
  const [aba, setAba] = useState("inicio");
  const [mesaPedido, setMesaPedido] = useState<string>("");
  const [maisAberto, setMaisAberto] = useState(false);

  useEffect(() => {
    const inv = () => qc.invalidateQueries({ queryKey: ["panel", slug] });
    const ch = supabase
      .channel(`painel-${slug}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_payment_requests",
          filter: `restaurant_slug=eq.${slug}`,
        },
        inv,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "table_bill_items",
          filter: `restaurant_slug=eq.${slug}`,
        },
        inv,
      )
      .subscribe();
    return () => {
      supabase.removeChannel(ch);
    };
  }, [slug, qc]);

  const podeConfirmar = isFounder || myRoles.includes("owner") || myRoles.includes("manager") || myRoles.includes("cashier");
  const podeDono = isFounder || myRoles.includes("owner");
  const podeFiscal = myRoles.some((role) => ["owner", "manager", "cashier"].includes(role));
  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["panel", slug] });
    qc.invalidateQueries({ queryKey: ["pdv", slug] });
    qc.invalidateQueries({ queryKey: ["ops", slug] });
  };

  const mesas = useMemo(() => {
    if (!q.data || !pdv.data) return [];
    return pdv.data.tables.map((t) => {
      const itens = q.data.items.filter((i) => i.table_number === t.number);
      const pend = q.data.payments.filter(
        (p) => p.table_number === t.number && p.status === "pending",
      );
      const total = itens.reduce((s, i) => s + i.unit_price * i.ordered_quantity, 0);
      const pago = itens.reduce((s, i) => s + i.unit_price * i.paid_portion, 0);
      const disponivel = itens.reduce(
        (s, i) => s + (i.ordered_quantity - i.reserved_portion - i.paid_portion),
        0,
      );
      const status: Status = !t.active
        ? "inativa"
        : itens.length === 0
          ? "livre"
          : pend.length
            ? "aguardando"
            : disponivel <= 0
              ? "encerrada"
              : "ocupada";
      const garcom = pdv.data.waiters.find((w) => w.id === t.waiter_id)?.name;
      return { ...t, itens, total, pago, status, garcom };
    });
  }, [q.data, pdv.data]);

  async function agir(id: string, action: "confirm" | "cancel") {
    setOcupado(id);
    try {
      await resolve({ data: { paymentId: id, action } });
      toast.success(
        action === "confirm" ? "Recebimento confirmado" : "Pagamento cancelado e itens liberados",
      );
      refresh();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(null);
    }
  }

  const [editarPrato, setEditarPrato] = useState<string | null>(null);
  if (q.isLoading || pdv.isLoading) return <PainelCarregando />;
  if (q.error || !q.data || pdv.error || !pdv.data)
    return (
      <EmptyState
        icon={X}
        title="Não foi possível carregar o painel"
        text={((q.error ?? pdv.error) as Error)?.message ?? "Tente atualizar a página."}
        action={
          <Button variant="outline" onClick={refresh}>
            <RefreshCw />
            Tentar de novo
          </Button>
        }
      />
    );
  const d = q.data;
  if (d.restaurant.onboarding_step === "pos" && podeDono) {
    const nome = d.staff.find((x) => x.roles.includes("owner"))?.display_name?.split(" ")[0] ?? "";
    return <OnboardingPdv slug={slug} nome={nome} onDone={refresh} />;
  }
  const pendentes = d.payments.filter((p) => p.status === "pending");
  const itemNome = (mesa: string, code: string) =>
    d.items.find((i) => i.table_number === mesa && i.item_code === code)?.item_name ?? code;
  const mesaSel = mesas.find((m) => m.number === mesaAberta);
  const abertas = mesas.filter((m) => m.status === "ocupada" || m.status === "aguardando");
  // O Lançamento TIPE fica sempre disponível, inclusive como reserva de uma integração.
  const visiveis = secoes.filter(
    (x) => (!("dono" in x) || podeDono) && (!("flag" in x) || reservasOn) && (!("fiscal" in x) || podeFiscal),
  );
  const pdvLabel =
    !integ.data || integ.data.adapter === "lancamento_tipe"
      ? "Lançamento TIPE"
      : `Integração: ${integ.data.adapterName}`;
  const syncErro =
    integ.data && integ.data.adapter !== "lancamento_tipe" && integ.data.status === "error";

  const secaoAtual = visiveis.find((x) => x.k === aba) ?? visiveis[0]!;
  const ir = (k: string) => {
    setAba(k);
    setMaisAberto(false);
    if (typeof window !== "undefined") window.scrollTo({ top: 0 });
  };

  const confirmacoes = (
    <>
      {pendentes.length === 0 && (
        <EmptyState
          icon={Check}
          title="Nada para confirmar"
          text="Pagamentos em dinheiro ou maquininha aparecem aqui para o caixa confirmar."
        />
      )}
      <ul className="space-y-3">
        {pendentes.map((p) => (
          <li key={p.id} className="surface-card p-4 sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-display font-semibold">Mesa {p.table_number}</span>
                  <StatusBadge tone="warning">Aguardando</StatusBadge>
                </div>
                <p className="mt-1 text-sm">{p.customer_name}</p>
                <p className="text-xs text-muted-foreground">
                  {metodoLabel[p.payment_method] ?? p.payment_method} · {hora(p.created_at)}
                </p>
              </div>
              <p className="money font-display text-2xl font-semibold tracking-heading">
                {brl(p.amount)}
              </p>
            </div>
            {p.establishment_method && (
              <p className="mt-3 rounded-xl bg-background-muted px-3 py-2 text-sm font-medium">
                {p.establishment_method === "cash"
                  ? `Dinheiro: cliente entregará ${brl(p.cash_received ?? p.amount)}${p.change_due ? ` · Troco ${brl(p.change_due)}` : " · Sem troco"}`
                  : "Maquininha"}
              </p>
            )}
            <p className="mt-3 text-sm text-muted-foreground">
              {Object.entries(p.item_quantities)
                .filter(([, n]) => n > 0)
                .map(([c, n]) => `${formatPortion(n)} de ${itemNome(p.table_number, c)}`)
                .join(" · ")}
            </p>
            {podeConfirmar ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="ink"
                  disabled={ocupado === p.id}
                  onClick={() => agir(p.id, "confirm")}
                >
                  <Check />
                  Confirmar recebimento
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={ocupado === p.id}
                  onClick={() => agir(p.id, "cancel")}
                >
                  <X />
                  Cancelar
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-xs text-muted-foreground">
                Somente caixa, gerente ou dono confirmam.
              </p>
            )}
          </li>
        ))}
      </ul>
    </>
  );

  const contagem = (s: Status) => mesas.filter((m) => m.status === s).length;

  // Pendências por aba: bolinha vermelha no menu e a Lebre explica cada uma.
  const abaVisivel = (k: string) => (visiveis.some((x) => x.k === k) ? k : "inicio");
  const rotuloDe = (k: string) => (k === "pdv" ? "Lançar pedido" : (visiveis.find((x) => x.k === k)?.l ?? "Início"));
  const pendencia = (k: string, n: number, texto: string, solucao?: string): Pendencia => ({ aba: abaVisivel(k), rotulo: rotuloDe(abaVisivel(k)), texto, n, solucao });
  const pendencias: Pendencia[] = [
    pendentes.length > 0 &&
      pendencia(
        "caixa",
        pendentes.length,
        pendentes.length === 1
          ? "Um pagamento no balcão espera você confirmar ou recusar."
          : `${pendentes.length} pagamentos no balcão esperam você confirmar ou recusar.`,
        "Confira o valor recebido e toque em Confirmar recebimento ou Cancelar.",
      ),
    d.pdvAlerts.length > 0 &&
      pendencia(
        "pdv",
        d.pdvAlerts.length,
        d.pdvAlerts.length === 1 ? "Um cancelamento no PDV precisa da sua conferência." : `${d.pdvAlerts.length} cancelamentos no PDV precisam da sua conferência.`,
        "Confira se o cancelamento foi combinado com a equipe; o detalhe fica nos Alertas do PDV.",
      ),
    syncErro && pendencia("integracoes", 1, "A sincronização com o seu sistema está com erro. Os pedidos seguem pelo Lançamento TIPE.", "Abra Integrações para ver o erro e reconectar o sistema."),
  ].filter((p): p is Pendencia => Boolean(p));
  const pendenciaDa = (k: string) => pendencias.filter((p) => p.aba === k).reduce((t, p) => t + p.n, 0);

  const grupos: GrupoNav[] = GRUPOS.map((g) => ({
    l: g,
    itens: visiveis
      .filter((x) => x.g === g)
      .map((x) => ({
        k: x.k,
        l: x.k === "pdv" ? "Lançar pedido" : x.l,
        i: x.i,
        busca: x.d,
        ...(pendenciaDa(x.k) > 0 ? { badge: pendenciaDa(x.k), badgeTone: "warning" as const } : {}),
      })),
  })).filter((g) => g.itens.length > 0);

  const eu = d.staff.find((x) => x.email.toLowerCase() === (email ?? "").toLowerCase());
  const papel = myRoles.includes("owner") ? "owner" : myRoles.includes("manager") ? "manager" : myRoles.includes("cashier") ? "cashier" : "waiter";
  const usuario = {
    nome: meuPerfil.data?.nome || eu?.display_name || (email ? email.split("@")[0]! : "Você"),
    funcao: cargoLabel[papel],
    detalhe: d.restaurant.name,
    avatarUrl: meuPerfil.data?.avatarUrl,
  };
  const logoUrl = midia.data?.logoUrl ?? null;

  return (
    <Shell
      ambiente="Tipe Gestão"
      mascotScope={slug}
      usuario={usuario}
      onSair={onSair}
      menuConta={[
        { l: "Perfil", i: ImagemIcon, onSelect: () => ir("identidade") },
        { l: "Segurança da conta", i: ShieldCheck, onSelect: () => ir("seguranca") },
        { l: "Como funciona", i: BookOpen, onSelect: () => ir("comofunciona") },
      ]}
      contexto={
        <span className="flex items-center gap-2.5">
          {logoUrl ? (
            <img src={logoUrl} alt={`Logomarca de ${d.restaurant.name}`} className="size-9 shrink-0 rounded-lg bg-white object-contain p-0.5" />
          ) : (
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-muted text-sm font-semibold text-foreground">{d.restaurant.name.slice(0, 1).toUpperCase()}</span>
          )}
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-sm font-semibold text-foreground">{d.restaurant.name}</span>
            <span className="block truncate text-[11px] text-muted-foreground">tipe.digital/{slug}</span>
          </span>
        </span>
      }
      grupos={grupos}
      ativo={secaoAtual.k}
      onNavegar={ir}
      titulo={secaoAtual.l}
      descricao={secaoAtual.d}
      acoes={
        <>
          <StatusBadge tone={syncErro ? "error" : "neutral"} className="hidden md:inline-flex print:hidden">
            {pdvLabel}
          </StatusBadge>
              <PrecisaDeVoce modo="sininho"
                slug={slug}
                podeConfirmar={podeConfirmar}
                entrada={{
                  pendentes,
                  syncErro: !!syncErro,
                  alertasCancelamento: d.pdvAlerts,
                  quitadas: mesas
                    .filter((m) => m.status === "encerrada" && m.pago >= m.total - 0.005)
                    .map((m) => ({ number: m.number, total: m.total })),
                }}
                ocupado={ocupado}
                onConfirmar={(id) => agir(id, "confirm")}
                onGo={ir}
                onMesa={setMesaAberta}
              />
          {topoAcoes}
        </>
      }
      rodape={rodape}
    >
      <div className="min-w-0">
        {syncErro && aba !== "inicio" && (
          <div
            role="alert"
            className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-destructive/30 bg-destructive/[0.06] p-4 text-sm"
          >
            <span>
              Sincronização com o seu sistema com problema. Os pedidos podem ser lançados pelo
              Lançamento TIPE enquanto isso.
            </span>
            <Button size="sm" variant="outline" onClick={() => ir("pdv")}>
              Abrir Lançamento TIPE
            </Button>
          </div>
        )}
        {d.pdvAlerts[0] && aba !== "inicio" && (
          <div
            role="alert"
            className="mb-4 rounded-2xl border border-warning/50 bg-warning/10 p-4 text-sm"
          >
            <strong>Atenção no cancelamento:</strong> {d.pdvAlerts[0].detail}
          </div>
        )}
        {acesso.data && (
          <AvisoAssinatura access={acesso.data} podeDono={podeDono} onOpen={() => ir("assinatura")} />
        )}
        {aba !== "caixa" && aba !== "inicio" && (
          <AvisoPendencias slug={slug} enabled={podeConfirmar} onOpen={() => ir("caixa")} />
        )}
        {acesso.data && !abaLiberada(aba, acesso.data) ? (
          <ContaBloqueada podeDono={podeDono} onOpen={() => ir("assinatura")} />
        ) : (
        <>
        {aba === "inicio" && (
          <section className="relative mb-5 overflow-hidden rounded-2xl bg-ink p-5 text-white sm:p-6" aria-label="Boas-vindas">
            <div className="pointer-events-none absolute -right-10 -top-16 size-56 rounded-full bg-brand/25 blur-3xl" aria-hidden />
            <div className="relative flex flex-wrap items-center gap-4">
              {logoUrl ? (
                <img src={logoUrl} alt="" className="size-14 rounded-xl bg-white object-contain p-1" />
              ) : (
                <span className="grid size-14 place-items-center rounded-xl bg-white/10 font-display text-2xl font-semibold">{d.restaurant.name.slice(0, 1).toUpperCase()}</span>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm text-white/65">{new Date().getHours() < 12 ? "Bom dia" : new Date().getHours() < 18 ? "Boa tarde" : "Boa noite"},</p>
                <h2 className="truncate font-display text-2xl font-medium tracking-heading">{usuario.nome.split(" ")[0]}</h2>
                <p className="mt-0.5 text-sm text-white/65">{usuario.funcao} · {d.restaurant.name}</p>
              </div>
              <div className="flex gap-6 text-right">
                <div><p className="font-display text-3xl font-medium leading-none">{abertas.length}</p><p className="mt-1 text-xs text-white/60">mesas abertas</p></div>
                <div><p className="font-display text-3xl font-medium leading-none">{pendentes.length}</p><p className="mt-1 text-xs text-white/60">a confirmar</p></div>
              </div>
            </div>
          </section>
        )}
        {aba === "inicio" && (
          <Inicio
            slug={slug}
            mesasAbertas={abertas.length}
            emAberto={abertas.reduce((s, m) => s + m.total - m.pago, 0)}
            pendentes={pendentes.length}
            onGo={ir}
            papel={papel}
            agora={
              <PrecisaDeVoce
                slug={slug}
                podeConfirmar={podeConfirmar}
                entrada={{
                  pendentes,
                  syncErro: !!syncErro,
                  alertasCancelamento: d.pdvAlerts,
                  quitadas: mesas
                    .filter((m) => m.status === "encerrada" && m.pago >= m.total - 0.005)
                    .map((m) => ({ number: m.number, total: m.total })),
                }}
                ocupado={ocupado}
                onConfirmar={(id) => agir(id, "confirm")}
                onGo={ir}
                onMesa={setMesaAberta}
              />
            }
          />
        )}

        {aba === "salao" && (
          <>
            <div className="mb-4 flex flex-wrap gap-2">
              {(["ocupada", "aguardando", "encerrada", "livre"] as Status[]).map((st) => (
                <StatusBadge key={st} tone={statusInfo[st].tone} className="px-3 py-1.5 text-xs">
                  {statusInfo[st].label} · {contagem(st)}
                </StatusBadge>
              ))}
            </div>
            {mesas.length === 0 ? (
              <EmptyState
                icon={LayoutGrid}
                title="Nenhuma mesa cadastrada"
                text="Cadastre as mesas em Mesas e QR Codes para acompanhar o salão aqui."
                action={
                  <Button variant="outline" onClick={() => ir("qr")}>
                    Ir para Mesas e QR Codes
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 2xl:grid-cols-6">
                {mesas.map((m) => {
                  const temItens = m.itens.length > 0;
                  const pct =
                    temItens && m.total > 0
                      ? Math.min(100, Math.round((m.pago / m.total) * 100))
                      : 0;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setMesaAberta(m.number)}
                      className={cn(
                        "group flex min-h-[152px] flex-col rounded-2xl border p-4 text-left transition-[box-shadow,border-color] hover:border-foreground/25 hover:shadow-soft",
                        statusInfo[m.status].card,
                      )}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <span className="font-display text-lg font-semibold leading-tight tracking-heading">
                          Mesa {m.number}
                        </span>
                        {m.status === "aguardando" && (
                          <span
                            className="tipe-live mt-1.5 h-2 w-2 shrink-0 rounded-full bg-warning"
                            aria-hidden
                          />
                        )}
                      </div>
                      <StatusBadge
                        tone={statusInfo[m.status].tone}
                        className="mt-1.5 w-fit px-2 py-0.5 text-[10.5px]"
                      >
                        {statusInfo[m.status].label}
                      </StatusBadge>
                      {temItens ? (
                        <div className="mt-auto pt-3">
                          <div className="flex items-baseline justify-between gap-2">
                            <span className="money text-base font-semibold">{brl(m.total)}</span>
                            <span className="text-[11px] text-muted-foreground">{pct}%</span>
                          </div>
                          <div className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-background-muted">
                            <div
                              className="h-full rounded-full bg-brand"
                              style={{ width: `${pct}%` }}
                            />
                          </div>
                          <div className="mt-1.5 flex justify-between gap-2 text-[11px] text-muted-foreground">
                            <span className="money">Pago {brl(m.pago)}</span>
                            {m.garcom && <span className="truncate">{m.garcom}</span>}
                          </div>
                        </div>
                      ) : (
                        <div className="mt-auto pt-3 text-xs text-muted-foreground">
                          {m.status === "inativa" ? "Mesa desativada" : "Sem itens"}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            )}
          </>
        )}

        {aba === "pdv" && <LancarPedido slug={slug} pdv={pdv.data} mesa={mesaPedido} setMesa={setMesaPedido} podeBalcao={podeConfirmar} onDone={refresh} />}
        {aba === "cozinha" && (
          <div className="space-y-4">
            <Cozinha slug={slug} podePainel={podeConfirmar} />
            {(podeDono || myRoles.includes("manager")) && <EstacoesConfig slug={slug} />}
          </div>
        )}
        {aba === "reservas" && reservasOn && <ReservasPainel slug={slug} podeDono={podeDono} />}
        {aba === "caixa" && <><PendenciasFinanceiras slug={slug} enabled={podeConfirmar} /><Caixa slug={slug} podeCaixa={podeConfirmar} confirmacoes={confirmacoes} /></>}

        {aba === "historico" && (
          <div className="space-y-4">
            {d.pdvAlerts.length > 0 && (
              <section className="rounded-2xl border border-warning/40 bg-warning/10">
                <h2 className="border-b border-warning/30 px-4 py-3 text-sm font-semibold">
                  Alertas do PDV
                </h2>
                <ul className="divide-y divide-warning/20">
                  {d.pdvAlerts.map((a) => (
                    <li key={a.id} className="flex justify-between gap-3 px-4 py-3 text-sm">
                      <span>{a.detail}</span>
                      <span className="shrink-0 text-muted-foreground">{hora(a.created_at)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}
            {d.audit.length === 0 ? (
              <EmptyState
                icon={History}
                title="Sem registros ainda"
                text="Confirmações, cancelamentos e reaberturas de mesa aparecem aqui com data e hora."
              />
            ) : (
              <ul className="surface-card divide-y divide-border">
                {d.audit.map((a) => (
                  <li
                    key={a.id}
                    className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 px-4 py-3 text-sm"
                  >
                    <span className="flex items-center gap-2.5">
                      <StatusBadge
                        tone={
                          a.action === "confirm"
                            ? "success"
                            : a.action === "cancel"
                              ? "error"
                              : "neutral"
                        }
                      >
                        {acaoLabel[a.action] ?? a.action}
                      </StatusBadge>
                      <span className="font-medium">Mesa {a.table_number}</span>
                    </span>
                    <span className="flex items-center gap-3 text-muted-foreground">
                      {a.amount ? (
                        <span className="money font-semibold text-foreground">{brl(a.amount)}</span>
                      ) : null}
                      <span>{hora(a.created_at)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {aba === "garcons" && <DesempenhoGarcons slug={slug} />}
        {aba === "qr" && (
          <MesasQr
            slug={slug}
            restaurante={d.restaurant.name}
            logoUrl={logoUrl}
            tables={pdv.data.tables}
            podeDono={podeDono}
            onDone={refresh}
          />
        )}
        {aba === "cardapio" && podeDono && <Cardapio restaurantName={d.restaurant.name} slug={slug} pdv={pdv.data} onDone={refresh} midia={midia.data?.itens ?? {}} editarId={editarPrato} onEditarAberto={() => setEditarPrato(null)} />}
        {aba === "equipe" && podeDono && (
          <div className="space-y-6">
            <Garcons slug={slug} pdv={pdv.data} onDone={refresh} />
            <PixGarcons slug={slug} />
            <EquipePermissoes slug={slug} />
          </div>
        )}
        {aba === "comofunciona" && <ComoFuncionaGestao ir={ir} />}
        {aba === "studio" && podeDono && (
          <StudioFotos
            ir={ir}
            items={pdv.data?.items ?? []}
            categories={pdv.data?.categories ?? []}
            midia={midia.data?.itens ?? {}}
            restaurante={d.restaurant.name}
            onFotografar={(id) => {
              setEditarPrato(id);
              ir("cardapio");
            }}
            onAbrirScanner={() => {
              // O Cardápio abre direto na aba 3D quando o hash é #scanner-3d.
              window.location.hash = "scanner-3d";
              ir("cardapio");
              // A seção do Scanner 3D (Cardápio) tem id="scanner-3d"; espera a aba montar.
              const rolar = (n: number) => {
                const el = document.getElementById("scanner-3d");
                if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
                else if (n > 0) setTimeout(() => rolar(n - 1), 120);
              };
              requestAnimationFrame(() => rolar(15));
            }}
          />
        )}
        {aba === "banco" && podeDono && <BancoImagens slug={slug} podeDono={podeDono} itens={(pdv.data?.items ?? []).map((i) => ({ id: i.id, name: i.name, code:i.code }))} onAplicada={() => void qc.invalidateQueries({ queryKey: ["midia", slug] })} />}
        {aba === "relatorios" && <Relatorios slug={slug} papel={papel} />}
        {aba === "identidade" && <Identidade slug={slug} podeDono={podeDono} funcao={usuario.funcao} onSair={onSair} />}
        {aba === "integracoes" && <Integracoes slug={slug} podeDono={podeDono} />}
        {aba === "config" && <Configuracoes slug={slug} podeDono={podeDono} />}
        {aba === "atendimento" && <Atendimento slug={slug} podeDono={podeDono} irParaConfig={() => ir("config")} />}
        {aba === "fiscal" && podeFiscal && <Fiscal slug={slug} canConfigure={myRoles.includes("owner")} />}
        {aba === "recebimentos" && podeDono && <Recebimentos slug={slug} podeDono={podeDono} />}
        {aba === "assinatura" && podeDono && <Assinatura slug={slug} />}
        {aba === "seguranca" && <SegurancaConta />}
        </>
        )}
      </div>

      <Dialog open={!!mesaSel} onOpenChange={(o) => !o && setMesaAberta(null)}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          {mesaSel && (
            <MesaDetalhe
              slug={slug}
              mesa={mesaSel}
              outras={mesas
                .filter((m) => m.active && m.number !== mesaSel.number)
                .map((m) => m.number)}
              payments={d.payments.filter((p) => p.table_number === mesaSel.number)}
              podeConfirmar={podeConfirmar}
              qrLink={linkMesa(slug, (mesaSel as { code?: string }).code ?? "", (mesaSel as { access_token?: string }).access_token ?? "", typeof window !== "undefined" ? window.location.origin : undefined)}
              onLancar={() => {
                setMesaPedido(mesaSel.number);
                setMesaAberta(null);
                setAba("pdv");
              }}
              onDone={() => {
                refresh();
              }}
              onClose={() => setMesaAberta(null)}
            />
          )}
        </DialogContent>
      </Dialog>
      <LazyLebreAssistant slug={slug} notice={avisoDasPendencias(pendencias)} onNotices={(k) => ir(k ?? "inicio")} onSuggestions={podeDono ? () => {
        ir("cardapio");
        window.setTimeout(() => document.getElementById("lebre-menu-title")?.scrollIntoView({ block: "center", behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" }), 150);
      } : undefined} />
    </Shell>
  );
}

type PdvData = Awaited<ReturnType<typeof getPdvData>>;
type PanelData = Awaited<ReturnType<typeof getPanelData>>;

function MesaDetalhe({
  slug,
  mesa,
  outras,
  payments,
  podeConfirmar,
  qrLink,
  onLancar,
  onDone,
  onClose,
}: {
  slug: string;
  outras: string[];
  podeConfirmar: boolean;
  qrLink?: string | undefined;
  onLancar: () => void;
  onDone: () => void;
  onClose: () => void;
  mesa: {
    number: string;
    status: Status;
    garcom?: string | undefined;
    total: number;
    itens: PanelData["items"];
  };
  payments: PanelData["payments"];
}) {
  const ops = useOps(slug);
  const estornar = useServerFn(voidItem);
  const fechar = useServerFn(closeTable);
  const transferir = useServerFn(transferTable);
  const removerTaxa = useServerFn(waiveServiceFee);
  const [ocupado, setOcupado] = useState(false);
  const [destino, setDestino] = useState("");
  async function run(fn: () => Promise<unknown>, ok: string) {
    setOcupado(true);
    try {
      await fn();
      toast.success(ok);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  return (
    <>
      <DialogHeader>
        <DialogTitle className="flex flex-wrap items-center gap-2">
          Mesa {mesa.number}{" "}
          <StatusBadge tone={statusInfo[mesa.status].tone}>
            {statusInfo[mesa.status].label}
          </StatusBadge>
        </DialogTitle>
        {mesa.garcom && <p className="text-sm text-muted-foreground">Garçom: {mesa.garcom}</p>}
      </DialogHeader>
      {podeConfirmar && <DesignarGarcom slug={slug} table={mesa.number} onDone={onDone} />}
      <BotaoPreConta
        slug={slug}
        restaurante={ops.data?.restaurant.name ?? ""}
        razaoSocial={ops.data?.restaurant.legal_name ?? null}
        cnpj={ops.data?.restaurant.cnpj ?? null}
        endereco={ops.data?.restaurant.address ?? null}
        telefone={ops.data?.restaurant.phone ?? null}
        pagoItens={mesa.itens.reduce((s, i) => s + i.unit_price * i.paid_portion, 0)}
        mesa={mesa.number}
        garcom={mesa.garcom ?? null}
        taxa={ops.data?.restaurant.service_rate ?? 0}
        link={qrLink ?? null}
        linhas={mesa.itens.map((i) => ({ qty: i.ordered_quantity, nome: i.item_name, unit: i.unit_price }))}
      />
      <LiberarPedidosMesa slug={slug} table={mesa.number} />
      {mesa.itens.length === 0 ? (
        <p className="rounded-xl bg-background-muted px-4 py-6 text-center text-sm text-muted-foreground">
          Nenhum pedido nesta mesa.
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <table className="w-full text-sm">
            <thead className="bg-background-muted text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Item</th>
                <th className="px-2 py-2 text-right font-medium">Qtd</th>
                <th className="px-2 py-2 text-right font-medium">Reserv.</th>
                <th className="px-2 py-2 text-right font-medium">Pago</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {mesa.itens.map((i) => {
                const livre = i.ordered_quantity - i.reserved_portion - i.paid_portion;
                return (
                  <tr key={i.item_code} className="border-t border-border">
                    <td className="px-3 py-2">
                      {i.item_name}
                      <div className="money text-xs text-muted-foreground">{brl(i.unit_price)}</div>
                    </td>
                    <td className="money px-2 text-right">{i.ordered_quantity}</td>
                    <td className="px-2 text-right">{formatPortion(i.reserved_portion)}</td>
                    <td className="px-2 text-right">{formatPortion(i.paid_portion)}</td>
                    <td className="pr-1 text-right">
                      {podeConfirmar && livre > 0 && (
                        <Button
                          size="icon-sm"
                          variant="ghost"
                          disabled={ocupado}
                          title="Estornar 1 unidade"
                          aria-label={`Estornar 1 unidade de ${i.item_name}`}
                          onClick={() => {
                            const reason = window.prompt(`Motivo do estorno de 1× ${i.item_name}:`);
                            if (!reason || reason.trim().length < 3) {
                              if (reason !== null) toast.error("Informe o motivo (mín. 3 letras)");
                              return;
                            }
                            void run(
                              () =>
                                estornar({
                                  data: {
                                    slug,
                                    table: mesa.number,
                                    code: i.item_code,
                                    qty: 1,
                                    reason,
                                  },
                                }),
                              "Item estornado",
                            );
                          }}
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      {mesa.itens.length > 0 && (
        <p className="text-right text-sm">
          <span className="text-muted-foreground">Total</span>{" "}
          <span className="money font-display text-base font-semibold">{brl(mesa.total)}</span>{" "}
          <span className="text-muted-foreground">+ 10% serviço</span>
        </p>
      )}
      <div>
        <h3 className="mb-2 text-sm font-semibold">Pagamentos</h3>
        <ul className="space-y-2 text-sm">
          {payments.length === 0 && (
            <li className="text-muted-foreground">Nenhum pagamento ainda.</li>
          )}
          {payments.map((p) => (
            <li
              key={p.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl bg-background-muted px-3 py-2.5"
            >
              <span>
                <span className="font-medium">{p.customer_name}</span>
                <span className="block text-xs text-muted-foreground">
                  {metodoLabel[p.payment_method] ?? p.payment_method} · {hora(p.created_at)}
                </span>
              </span>
              <span className="flex items-center gap-2">
                <span className="money font-semibold">{brl(p.amount)}</span>
                <StatusBadge
                  tone={
                    p.status === "pending"
                      ? "warning"
                      : p.status === "approved"
                        ? "success"
                        : "error"
                  }
                >
                  {p.status === "pending"
                    ? "Pendente"
                    : p.status === "approved"
                      ? "Confirmado"
                      : "Cancelado"}
                </StatusBadge>
              </span>
            </li>
          ))}
        </ul>
      </div>
      <div className="flex flex-wrap gap-2 border-t border-border pt-4">
        {mesa.status !== "inativa" && (
          <Button size="sm" variant="ink" onClick={onLancar}>
            <Plus />
            Lançar pedido
          </Button>
        )}
        {podeConfirmar && mesa.itens.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={ocupado}
            onClick={() => {
              if (
                !window.confirm(
                  `Fechar a mesa ${mesa.number}? Os pagamentos serão arquivados e a mesa ficará livre para uma nova conta.`,
                )
              )
                return;
              void run(
                () => fechar({ data: { slug, table: mesa.number } }),
                "Mesa fechada e liberada",
              );
            }}
          >
            Fechar e liberar mesa
          </Button>
        )}
        {podeConfirmar && mesa.itens.length > 0 && (
          <Button
            size="sm"
            variant="outline"
            disabled={ocupado}
            onClick={() => {
              const reason = window.prompt(
                `Motivo para remover a taxa de serviço da mesa ${mesa.number}:`,
              );
              if (!reason || reason.trim().length < 3) {
                if (reason !== null) toast.error("Informe o motivo (mín. 3 letras)");
                return;
              }
              void run(
                () => removerTaxa({ data: { slug, table: mesa.number, reason } }),
                "Taxa de serviço removida desta mesa",
              );
            }}
          >
            Remover taxa desta mesa
          </Button>
        )}
        {mesa.itens.length > 0 && payments.length === 0 && mesa.status !== "inativa" && (
          <div className="flex w-full items-center gap-2 pt-1">
            <ArrowRightLeft className="h-4 w-4 shrink-0 text-muted-foreground" />
            <select
              className={cn(selectCls, "flex-1")}
              value={destino}
              onChange={(e) => setDestino(e.target.value)}
              aria-label="Mesa de destino"
            >
              <option value="">Transferir / juntar com a mesa…</option>
              {outras.map((n) => (
                <option key={n} value={n}>
                  Mesa {n}
                </option>
              ))}
            </select>
            <Button
              size="sm"
              variant="outline"
              disabled={!destino || ocupado}
              onClick={() => {
                if (
                  !window.confirm(
                    `Mover todos os itens da mesa ${mesa.number} para a mesa ${destino}? Se a mesa ${destino} já tiver itens, as contas serão juntadas.`,
                  )
                )
                  return;
                void run(
                  () => transferir({ data: { slug, from: mesa.number, to: destino } }),
                  `Itens movidos para a mesa ${destino}`,
                ).then(onClose);
              }}
            >
              Mover
            </Button>
          </div>
        )}
      </div>
    </>
  );
}

function LancarPedido({ slug, pdv, mesa, setMesa, podeBalcao, onDone }: { slug: string; pdv: PdvData; mesa: string; setMesa: (m: string) => void; podeBalcao: boolean; onDone: () => void }) {
  const launch = useServerFn(launchOrder);
  const fetchTop = useServerFn(getTopItems);
  const top = useQuery({
    queryKey: ["top-items", slug],
    queryFn: () => fetchTop({ data: { slug } }),
    staleTime: 300000,
  });
  const [garcom, setGarcom] = useState("");
  const [carrinho, setCarrinho] = useState<Record<string, number>>({});
  const [busca, setBusca] = useState("");
  const [obs, setObs] = useState<Record<string, string>>({});
  const [cat, setCat] = useState<string>("");
  const [enviando, setEnviando] = useState(false);
  const chave = useRef<ChaveLancamento | null>(null);
  // Mesa: lança na conta da mesa. Balcão: cobra na hora e gera senha (fast-food, retirada).
  const [modo, setModo] = useState<"mesa" | "balcao">("mesa");
  const balcao = modo === "balcao" && podeBalcao;
  const ativos = pdv.waiters.filter((w) => w.active);
  const mesasAtivas = pdv.tables.filter((t) => t.active);

  useEffect(() => {
    const t = pdv.tables.find((x) => x.number === mesa);
    if (t?.waiter_id) setGarcom(t.waiter_id);
  }, [mesa, pdv.tables]);

  const itens = pdv.items.filter(
    (i) =>
      i.available &&
      (busca || !cat || i.category_id === cat) &&
      (!busca ||
        i.name.toLowerCase().includes(busca.toLowerCase()) ||
        i.code.toLowerCase() === busca.toLowerCase()),
  );
  const linhas = Object.entries(carrinho).filter(([, n]) => n > 0);
  const total = linhas.reduce(
    (s, [c, n]) => s + (pdv.items.find((i) => i.code === c)?.price ?? 0) * n,
    0,
  );
  const add = (code: string, delta: number) =>
    setCarrinho((c) => ({ ...c, [code]: Math.max(0, Math.min(99, (c[code] ?? 0) + delta)) }));

  async function enviar() {
    if (!mesa || !garcom || linhas.length === 0) return;
    setEnviando(true);
    const items = linhas.map(([code, qty]) => ({
      code,
      qty,
      ...(obs[code]?.trim() ? { notes: obs[code]!.trim() } : {}),
    }));
    // Mesmo pedido reenviado (toque duplo, rede caiu) usa a mesma chave e não duplica.
    chave.current = chaveLancamento(chave.current, { mesa, garcom, items });
    try {
      await launch({ data: { slug, table: mesa, waiterId: garcom, items, requestId: chave.current.id } });
      chave.current = null;
      toast.success(`Pedido lançado na mesa ${mesa}`);
      setCarrinho({});
      setObs({});
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[1fr_320px]">
      <div>
        <Input
          placeholder="Buscar item ou código (ex.: P01)"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          className="mb-3"
        />
        <div className="mb-3 flex flex-wrap gap-2">
          <Button size="sm" variant={!cat ? "default" : "outline"} onClick={() => setCat("")}>
            Todos
          </Button>
          {pdv.categories.map((c) => (
            <Button
              key={c.id}
              size="sm"
              variant={cat === c.id ? "default" : "outline"}
              onClick={() => setCat(c.id)}
            >
              {c.name}
            </Button>
          ))}
        </div>
        {!busca && !cat && (top.data?.length ?? 0) > 0 && (
          <section className="mb-4">
            <h3 className="mb-2 text-sm font-semibold text-brand-strong">Mais vendidos</h3>
            <div className="grid gap-2 sm:grid-cols-2">
              {top
                .data!.map((code) => pdv.items.find((i) => i.code === code && i.available))
                .filter(Boolean)
                .map((i) => (
                  <button
                    key={`top-${i!.id}`}
                    onClick={() => add(i!.code, 1)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-primary/50 bg-brand-soft/40 p-3 text-left text-sm transition-colors hover:border-primary active:scale-[0.99]"
                  >
                    <span>
                      {i!.name}
                      {carrinho[i!.code] ? (
                        <span className="ml-2 rounded-full bg-primary px-1.5 text-xs text-primary-foreground">
                          {carrinho[i!.code]}
                        </span>
                      ) : null}
                    </span>
                    <span className="font-semibold">{brl(i!.price)}</span>
                  </button>
                ))}
            </div>
          </section>
        )}
        {pdv.categories.map((cat) => {
          const lista = itens.filter((i) => i.category_id === cat.id);
          if (!lista.length) return null;
          return (
            <section key={cat.id} className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-muted-foreground">{cat.name}</h3>
              <div className="grid gap-2 sm:grid-cols-2">
                {lista.map((i) => (
                  <button
                    key={i.id}
                    onClick={() => add(i.code, 1)}
                    className="flex items-center justify-between gap-3 rounded-xl border border-border bg-surface p-3 text-left text-sm transition-colors hover:border-foreground/25 hover:shadow-xs active:scale-[0.99]"
                  >
                    <span>
                      <span className="mr-2 text-xs text-muted-foreground">{i.code}</span>
                      {i.name}
                    </span>
                    <span className="font-semibold">{brl(i.price)}</span>
                  </button>
                ))}
              </div>
            </section>
          );
        })}
      </div>
      <aside className="h-fit space-y-3 surface-card p-4 sm:p-5 lg:sticky lg:top-4">
        {podeBalcao ? (
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-muted p-1" role="tablist" aria-label="Tipo de venda">
            {([["mesa", "Mesa"], ["balcao", "Balcão / senha"]] as const).map(([k, l]) => (
              <button key={k} role="tab" aria-selected={modo === k} onClick={() => setModo(k)} className={cn("rounded-lg px-2 py-1.5 text-sm transition-colors", modo === k ? "bg-card font-semibold shadow-xs" : "text-muted-foreground hover:text-foreground")}>{l}</button>
            ))}
          </div>
        ) : <h3 className="font-display font-semibold">Comanda</h3>}
        {!balcao && (
          <>
            <select className={selectCls} value={mesa} onChange={(e) => setMesa(e.target.value)}>
              <option value="">Escolha a mesa</option>
              {mesasAtivas.map((t) => <option key={t.id} value={t.number}>Mesa {t.number}</option>)}
            </select>
            <select className={selectCls} value={garcom} onChange={(e) => setGarcom(e.target.value)}>
              <option value="">Escolha o garçom</option>
              {ativos.map((w) => <option key={w.id} value={w.id}>{w.code} · {w.name}</option>)}
            </select>
          </>
        )}
        {linhas.length === 0 ? <p className="text-sm text-muted-foreground">Toque nos itens do cardápio para adicionar.</p> : (
          <ul className="space-y-2 text-sm">
            {linhas.map(([code, n]) => {
              const it = pdv.items.find((i) => i.code === code);
              return (
                <li key={code} className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="flex-1">{it?.name}</span>
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => add(code, -1)}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-6 text-center">{n}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => add(code, 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                  <Input
                    className="h-7 text-xs"
                    placeholder="Observação (ex.: sem cebola)"
                    maxLength={140}
                    value={obs[code] ?? ""}
                    onChange={(e) => setObs({ ...obs, [code]: e.target.value })}
                  />
                </li>
              );
            })}
          </ul>
        )}
        <div className="flex items-baseline justify-between border-t border-border pt-3"><span className="font-semibold">Total</span><span className="money font-display text-lg font-semibold">{brl(total)}</span></div>
        {balcao ? (
          <BalcaoCheckout slug={slug} total={total}
            linhas={linhas.map(([code, qty]) => ({ code, qty, ...(obs[code]?.trim() ? { notes: obs[code]!.trim() } : {}) }))}
            onSold={() => { setCarrinho({}); setObs({}); onDone(); }} />
        ) : (
          <Button variant="ink" className="h-11 w-full" disabled={!mesa || !garcom || !linhas.length || enviando} onClick={enviar}>{enviando ? "Enviando…" : "Enviar pedido"}</Button>
        )}
      </aside>
      {balcao && <div className="lg:col-span-2"><VendasBalcao slug={slug} podeCancelar={podeBalcao} /></div>}
    </div>
  );
}

function UsoMesas({
  active,
  limit,
  plan,
  upgradeUrl,
  pdvTotal,
}: {
  active: number;
  limit: number;
  plan: string | null;
  upgradeUrl: string | null;
  pdvTotal: number | null;
}) {
  const pct = Math.min(100, Math.round((active / Math.max(1, limit)) * 100));
  const cheio = active >= limit;
  return (
    <section
      aria-label="Uso de mesas do plano"
      className="mb-4 surface-card p-4 sm:p-5 print:hidden"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="font-display font-semibold">
          {active} de {limit} mesas do seu plano
        </p>
        {plan && <span className="text-xs text-muted-foreground">Plano {plan}</span>}
      </div>
      <div
        className="mt-2 h-2 overflow-hidden rounded-full bg-muted"
        role="progressbar"
        aria-valuenow={active}
        aria-valuemin={0}
        aria-valuemax={limit}
      >
        <div
          className={`h-full rounded-full ${cheio ? "bg-destructive" : pct >= 80 ? "bg-highlight" : "bg-primary"}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      {active > limit && (
        <p className="mt-2 text-sm">
          Há {active - limit} mesa(s) ativa(s) acima do plano. Desative as que não vai usar. Até lá,
          essas mesas não abrem contas novas, mas as contas já abertas podem ser pagas normalmente.
        </p>
      )}
      {cheio ? (
        <p className="mt-2 text-sm font-semibold">
          Você atingiu o limite de mesas do seu plano. Fale com a TIPE para fazer upgrade.
        </p>
      ) : (
        pct >= 80 && (
          <p className="mt-2 text-xs text-muted-foreground">
            Você está perto do limite de mesas do seu plano.
          </p>
        )
      )}
      {pdvTotal && (
        <p className="mt-2 text-sm">
          Seu sistema tem {pdvTotal} mesas, mas seu plano permite {limit}. Fale com a TIPE para
          ativar as demais.
        </p>
      )}
      {upgradeUrl && (cheio || pct >= 80 || pdvTotal) && (
        <Button asChild size="sm" className="mt-3">
          <a href={upgradeUrl} target="_blank" rel="noreferrer">
            Falar com a TIPE no WhatsApp
          </a>
        </Button>
      )}
    </section>
  );
}

function MesasQr({
  logoUrl,
  slug,
  restaurante,
  tables,
  podeDono,
  onDone,
}: {
  slug: string;
  restaurante: string;
  logoUrl?:string|null|undefined;
  tables: PdvData["tables"];
  podeDono: boolean;
  onDone: () => void;
}) {
  const add = useServerFn(addTable);
  const upd = useServerFn(updateTable);
  const edit = useServerFn(editTable);
  const [editing,setEditing]=useState<string|null>(null);
  const [number,setNumber]=useState("");
  const bulk = useServerFn(addTablesBulk);
  const [nova, setNova] = useState("");
  const [lote, setLote] = useState({ from: "", to: "" });
  const fetchPlan = useServerFn(getTablePlan);
  const ativas = tables.filter((t) => t.active).length;
  const plano = useQuery({
    queryKey: ["table-plan", slug, ativas, tables.length],
    queryFn: () => fetchPlan({ data: { slug } }),
  });
  const noLimite = !!plano.data && plano.data.active >= plano.data.limit;
  const base =
    typeof window !== "undefined" &&
    !window.location.hostname.endsWith(".workers.dev") &&
    !window.location.hostname.includes("localhost")
      ? window.location.origin
      : "https://tipe.digital";
  const link = (t: PdvData["tables"][number]) => `${base}/${slug}/${t.code}?t=${t.access_token}`;
  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    }
  }
  return (
    <div>
      {plano.data && <UsoMesas {...plano.data} />}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2 print:hidden">
        {podeDono && (
          <form
            className="flex gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (nova.trim())
                void run(
                  () => add({ data: { slug, number: nova.trim() } }),
                  "Mesa cadastrada",
                ).then(() => setNova(""));
            }}
          >
            <Input
              className="w-32"
              placeholder="Nº da mesa"
              value={nova}
              onChange={(e) => setNova(e.target.value)}
            />
            <Button type="submit" variant="outline" disabled={noLimite}>
              Nova mesa
            </Button>
          </form>
        )}
        {podeDono && (
          <form
            className="flex items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              void run(async () => {
                const r = await bulk({
                  data: { slug, from: Number(lote.from), to: Number(lote.to) },
                });
                if (r.limited) toast.warning(r.limited);
                else toast.info(`${r.created} mesa(s) nova(s)`);
              }, "Mesas cadastradas").then(() => setLote({ from: "", to: "" }));
            }}
          >
            <span className="text-sm text-muted-foreground">Em lote:</span>
            <Input
              required
              type="number"
              min={1}
              className="w-20"
              placeholder="de"
              value={lote.from}
              onChange={(e) => setLote({ ...lote, from: e.target.value })}
            />
            <Input
              required
              type="number"
              min={1}
              className="w-20"
              placeholder="até"
              value={lote.to}
              onChange={(e) => setLote({ ...lote, to: e.target.value })}
            />
            <Button type="submit" variant="outline" disabled={noLimite}>
              Criar
            </Button>
          </form>
        )}
        <Button variant="outline" onClick={() => window.print()}>
          <Printer className="mr-1 h-4 w-4" />
          Imprimir QR Codes
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 print:grid-cols-2 print:gap-6">
        {tables.map((t) => (
          <div
            key={t.id}
            className={`surface-card p-4 sm:p-5 text-center print:break-inside-avoid print:rounded-2xl print:border print:border-neutral-300 print:p-6 print:shadow-none ${t.active ? "" : "opacity-50 print:hidden"}`}
          >
            <div className="flex items-center justify-center gap-2">
              <span className="font-display text-lg font-semibold print:text-2xl">Mesa {t.number}</span>
              {!t.active && (
                <StatusBadge tone="neutral" className="print:hidden">
                  Desativada
                </StatusBadge>
              )}
            </div>
            <div className="mx-auto my-3 w-fit rounded-xl border border-border bg-white p-2.5">
              <QRCodeSVG value={link(t)} size={132} className="print:size-48!" />
            </div>
            <div className="break-all text-xs text-muted-foreground">
              {base.replace(/^https?:\/\//, "")}/{slug}/{t.code}
            </div>
            <div className="mt-3 flex flex-wrap justify-center gap-1 print:hidden">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => {
                  void navigator.clipboard.writeText(link(t));
                  toast.success("Link copiado");
                }}
              >
                Copiar link
              </Button>
              {podeDono && (
                <>
                  {editing===t.id ? <form className="flex max-w-full flex-wrap gap-1" onSubmit={e=>{e.preventDefault();void run(()=>edit({data:{id:t.id,number}}),"Mesa atualizada. O link e o QR acompanham o novo número; substitua o QR impresso.").then(()=>setEditing(null))}}><Input aria-label="Novo número da mesa" className="w-24" value={number} maxLength={12} onChange={e=>setNumber(e.target.value)}/><Button size="sm" type="submit">Salvar</Button><Button size="sm" variant="ghost" onClick={()=>setEditing(null)}>Cancelar</Button></form> : <Button size="sm" variant="ghost" onClick={()=>{setEditing(t.id);setNumber(t.number)}}>Editar</Button>}
                  {!t.active && <Button size="sm" variant="ghost" onClick={()=>{if(window.confirm(`Excluir a mesa ${t.number}? Só mesas sem movimentação podem ser apagadas.`))void run(()=>edit({data:{id:t.id,remove:true}}),"Mesa excluída")}}>Excluir</Button>}
                  <Button
                    size="sm"
                    variant="ghost"
                    title="Gerar novo código (o QR antigo deixa de funcionar)"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Gerar novo QR para a mesa ${t.number}? O QR impresso atual deixará de funcionar.`,
                        )
                      )
                        void run(
                          () => upd({ data: { id: t.id, regenerate: true } }),
                          "Novo QR gerado",
                        );
                    }}
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() =>
                      run(
                        () => upd({ data: { id: t.id, active: !t.active } }),
                        t.active ? "Mesa desativada" : "Mesa ativada",
                      )
                    }
                  >
                    {t.active ? "Desativar" : "Ativar"}
                  </Button>
                </>
              )}
            </div>
          </div>
        ))}
      </div>
      <TotemStudio tables={tables} link={link} restaurante={restaurante} logoUrl={logoUrl} />
    </div>
  );
}

function Identidade({ slug, podeDono, funcao, onSair }: { slug: string; podeDono: boolean; funcao: string; onSair?: (() => void) | undefined }) {
  const qc = useQueryClient();
  const fetchMidia = useServerFn(getMidia);
  const salvar = useServerFn(saveLogo);
  const q = useQuery({ queryKey: ["midia", slug], queryFn: () => fetchMidia({ data: { slug } }) });
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <PerfilConta funcao={funcao} onSair={onSair} />
      {podeDono && <IdentidadeLebre slug={slug} />}
      {podeDono && <section className="surface-card space-y-3 p-4 sm:p-5">
        <h2 className="font-display font-semibold">Logomarca</h2>
        <p className="text-xs text-muted-foreground">Aparece no menu do painel e, depois, nas telas do cliente. PNG, JPG ou WebP, fundo transparente fica melhor.</p>
        <UploadImagem
          url={q.data?.logoUrl}
          rotulo="Logomarca"
          maxLado={800}
          onSalvar={async (imagem) => {
            await salvar({ data: { slug, imagem } });
            await qc.invalidateQueries({ queryKey: ["midia", slug] });
          }}
        />
      </section>}
      {podeDono && <section className="surface-card space-y-2 p-4 sm:p-5">
        <h2 className="font-display font-semibold">Fotos do cardápio</h2>
        <p className="text-sm text-muted-foreground">Envie a foto de cada prato em <strong>Cardápio</strong>, ao lado do produto. O motor prepara o efeito 3D automaticamente a partir da foto, sem arquivos extras.</p>
      </section>}
    </div>
  );
}

function Cardapio(props: { restaurantName: string; slug: string; pdv: PdvData; onDone: () => void; midia: Record<string, { foto: string | null; profundidade: string | null }>; editarId?: string | null; onEditarAberto?: () => void }) {
  return <CardapioGestao {...props} />;
}

function Garcons({ slug, pdv, onDone }: { slug: string; pdv: PdvData; onDone: () => void }) {
  const saveW = useServerFn(saveWaiter);
  const grant = useServerFn(grantWaiterAccess);
  const [acesso, setAcesso] = useState<{ id: string; email: string } | null>(null);
  const [w, setW] = useState({ code: "", name: "" });
  async function run(fn: () => Promise<unknown>, ok: string) {
    try {
      await fn();
      toast.success(ok);
      onDone();
      return true;
    } catch (e) {
      toast.error((e as Error).message);
      return false;
    }
  }
  return (
    <div className="space-y-3 surface-card p-4 sm:p-5">
      <h3 className="font-display font-semibold">Garçons</h3>
      <p className="text-xs text-muted-foreground">
        Garçons aparecem no lançamento de pedidos e na conta do cliente. Libere o acesso para o
        garçom acompanhar gorjetas e sacar pela área do garçom.
      </p>
      <ul className="grid gap-1 text-sm sm:grid-cols-2">
        {pdv.waiters.map((x) => (
          <li
            key={x.id}
            className="flex items-center justify-between rounded-xl bg-background-muted px-3 py-1"
          >
            <span className={x.active ? "" : "line-through opacity-60"}>
              {x.code} · {x.name}
            </span>
            <span className="flex items-center">
              {x.active &&
                (x.user_id ? (
                  <span title={x.email ?? ""} className="mx-1">
                    <StatusBadge tone="success">Com acesso</StatusBadge>
                  </span>
                ) : (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => setAcesso({ id: x.id, email: "" })}
                  >
                    Dar acesso
                  </Button>
                ))}
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  run(
                    () =>
                      saveW({
                        data: { slug, id: x.id, code: x.code, name: x.name, active: !x.active },
                      }),
                    "Garçom atualizado",
                  )
                }
              >
                {x.active ? "Desativar" : "Ativar"}
              </Button>
            </span>
          </li>
        ))}
      </ul>
      {acesso && (
        <form
          className="flex max-w-md flex-wrap gap-2 rounded-lg bg-muted/50 p-2"
          onSubmit={async (e) => {
            e.preventDefault();
            if (
              await run(async () => {
                const r = await grant({ data: { slug, waiterId: acesso.id, email: acesso.email } });
                if (!r.invited)
                  toast.info(
                    "Esse e-mail já tinha conta: enviamos um link para o garçom definir a senha.",
                  );
              }, "E-mail enviado: o garçom define a senha pelo link")
            )
              setAcesso(null);
          }}
        >
          <Input
            required
            type="email"
            className="flex-1"
            placeholder="E-mail do garçom"
            value={acesso.email}
            onChange={(e) => setAcesso({ ...acesso, email: e.target.value })}
          />
          <Button type="submit" size="sm">
            Enviar convite
          </Button>
          <Button type="button" size="sm" variant="ghost" onClick={() => setAcesso(null)}>
            Cancelar
          </Button>
        </form>
      )}
      <form
        className="flex max-w-md gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          if (await run(() => saveW({ data: { slug, ...w, active: true } }), "Garçom cadastrado"))
            setW({ code: "", name: "" });
        }}
      >
        <Input
          required
          className="w-20"
          placeholder="G06"
          value={w.code}
          onChange={(e) => setW({ ...w, code: e.target.value })}
        />
        <Input
          required
          placeholder="Nome do garçom"
          value={w.name}
          onChange={(e) => setW({ ...w, name: e.target.value })}
        />
        <Button type="submit" size="icon" variant="outline">
          <Plus className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}

function Equipe({
  slug,
  staff,
}: {
  slug: string;
  staff: { user_id: string; display_name: string; email: string; roles: StaffRole[] }[];
}) {
  const invite = useServerFn(inviteStaff);
  const remove = useServerFn(removeStaff);
  const qc = useQueryClient();
  const [f, setF] = useState({
    name: "",
    email: "",
    role: "cashier" as "owner" | "cashier" | "waiter",
  });
  return (
    <div className="grid gap-4 md:grid-cols-2">
      <form
        className="space-y-3 surface-card p-4 sm:p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          try {
            await invite({ data: { slug, ...f } });
            toast.success("Pessoa adicionada à equipe");
            setF({ ...f, name: "", email: "" });
            qc.invalidateQueries({ queryKey: ["panel", slug] });
          } catch (err) {
            toast.error((err as Error).message);
          }
        }}
      >
        <h2 className="font-display font-semibold">Adicionar pessoa</h2>
        <p className="text-xs text-muted-foreground">
          A pessoa precisa criar a conta antes neste mesmo endereço, com o mesmo e-mail.
        </p>
        <Input
          required
          placeholder="Nome"
          value={f.name}
          onChange={(e) => setF({ ...f, name: e.target.value })}
        />
        <Input
          required
          type="email"
          placeholder="E-mail"
          value={f.email}
          onChange={(e) => setF({ ...f, email: e.target.value })}
        />
        <select
          className={selectCls}
          value={f.role}
          onChange={(e) => setF({ ...f, role: e.target.value as typeof f.role })}
        >
          <option value="cashier">Caixa / gerente</option>
          <option value="waiter">Garçom</option>
          <option value="owner">Dono</option>
        </select>
        <Button type="submit" className="w-full">
          Adicionar
        </Button>
      </form>
      <ul className="surface-card divide-y divide-border">
        {staff.length === 0 && (
          <li className="p-4 text-center text-muted-foreground">Nenhuma pessoa na equipe ainda.</li>
        )}
        {staff.map((s) => (
          <li key={s.user_id} className="flex items-center justify-between gap-2 p-3 text-sm">
            <div>
              <div className="font-semibold">{s.display_name}</div>
              <div className="text-xs text-muted-foreground">
                {s.email} · {s.roles.map((r) => cargoLabel[r]).join(", ")}
              </div>
            </div>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                try {
                  await remove({ data: { slug, userId: s.user_id } });
                  toast.success("Removido");
                  qc.invalidateQueries({ queryKey: ["panel", slug] });
                } catch (err) {
                  toast.error((err as Error).message);
                }
              }}
            >
              Remover
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
