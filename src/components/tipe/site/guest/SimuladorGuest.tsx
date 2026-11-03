/**
 * Simulador do Tipe Guest (/produtos/guest#simulador). O visitante faz o papel do cliente no
 * celular (descobrir, reservar, chegar, pagar, agradecer e avaliar) e vê ao lado o que o
 * restaurante vê no painel de reservas. Tudo roda só no navegador, com restaurantes fictícios
 * de Fortaleza; nada é enviado e nenhuma cobrança acontece.
 *
 * Os horários livres saem do mesmo cálculo do motor de reservas (src/lib/tipe/guest/reservas.ts):
 * grade, turnos, antecedência, menor mesa que cabe e mesa ocupada não oferecida. A conta segue as
 * regras do Tipe Pay: Pix, Apple Pay, Google Pay ou no estabelecimento (sem cartão digitado); a
 * gorjeta extra é um segundo pagamento depois da conta (3/5/8%, 5% sugerida e não marcada,
 * "outro valor" de R$ 2,00 até o valor pago, 70% para o garçom). Valores em centavos inteiros.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  CalendarDays,
  Clock,
  Heart,
  MapPin,
  Minus,
  Plus,
  RotateCcw,
  Search,
  Smartphone,
  Star,
  Store,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Secao, Titulo } from "../Site";
import {
  addDays,
  availableSlots,
  DEFAULT_RESERVATION_SETTINGS,
  guestCanChange,
  localDay,
  localInstant,
  localTime,
  occupiedRange,
  RESERVATION_STATUS_LABEL,
  type AvailabilityRule,
  type Occupation,
  type ReservableTable,
  type ReservationSettings,
  type ReservationStatus,
} from "@/lib/tipe/guest/reservas";

type Restaurante = {
  id: string;
  nome: string;
  tipo: string;
  bairro: string;
  preco: string;
  nota: string;
  fundador?: boolean;
  garcom: string;
  turnos: [string, string][];
  mesas: (ReservableTable & { numero: string })[];
  /** Reservas fictícias que já existem todo dia (mesa, HH:MM): deixam alguns horários lotados. */
  ocupadas: [string, string][];
  cardapio: { nome: string; preco: number }[];
};

const RESTAURANTES: Restaurante[] = [
  {
    id: "mare",
    nome: "Maré Alta",
    tipo: "Frutos do mar",
    bairro: "Meireles",
    preco: "$$$",
    nota: "4,8",
    fundador: true,
    garcom: "Joyce",
    turnos: [
      ["12:00", "15:00"],
      ["19:00", "22:30"],
    ],
    mesas: [
      { id: "m1", numero: "1", seatsMin: 1, seatsMax: 2 },
      { id: "m2", numero: "2", seatsMin: 1, seatsMax: 2 },
      { id: "m4", numero: "4", seatsMin: 2, seatsMax: 4 },
      { id: "m7", numero: "7", seatsMin: 2, seatsMax: 4 },
      { id: "m9", numero: "9", seatsMin: 4, seatsMax: 8 },
    ],
    ocupadas: [
      ["m1", "19:00"],
      ["m2", "20:30"],
      ["m4", "19:30"],
      ["m7", "21:00"],
      ["m9", "20:00"],
    ],
    cardapio: [
      { nome: "Pastel de camarão", preco: 3400 },
      { nome: "Peixe na brasa", preco: 6800 },
      { nome: "Suco de caju", preco: 950 },
    ],
  },
  {
    id: "brasa",
    nome: "Brasa do Sertão",
    tipo: "Carnes e regional",
    bairro: "Aldeota",
    preco: "$$",
    nota: "4,6",
    garcom: "Davi",
    turnos: [["18:00", "23:00"]],
    mesas: [
      { id: "b3", numero: "3", seatsMin: 1, seatsMax: 4 },
      { id: "b5", numero: "5", seatsMin: 2, seatsMax: 6 },
    ],
    ocupadas: [
      ["b3", "20:00"],
      ["b5", "21:30"],
    ],
    cardapio: [
      { nome: "Paçoca de carne de sol", preco: 4600 },
      { nome: "Baião de dois", preco: 4200 },
      { nome: "Cajuína", preco: 900 },
    ],
  },
  {
    id: "jangada",
    nome: "Jangada Café",
    tipo: "Café e brunch",
    bairro: "Praia de Iracema",
    preco: "$",
    nota: "4,7",
    garcom: "Lia",
    turnos: [["08:00", "13:30"]],
    mesas: [
      { id: "j1", numero: "1", seatsMin: 1, seatsMax: 2 },
      { id: "j6", numero: "6", seatsMin: 2, seatsMax: 4 },
    ],
    ocupadas: [
      ["j1", "09:00"],
      ["j6", "10:30"],
    ],
    cardapio: [
      { nome: "Tapioca de queijo coalho", preco: 2200 },
      { nome: "Cuscuz com ovo", preco: 2600 },
      { nome: "Café coado", preco: 800 },
    ],
  },
];

const SETTINGS: ReservationSettings = {
  ...DEFAULT_RESERVATION_SETTINGS,
  slotIntervalMin: 30,
  maxParty: 8,
};
const METODOS = [
  { id: "pix", nome: "Pix", desc: "Copia e cola ou QR Code" },
  { id: "apple_pay", nome: "Apple Pay", desc: "Com Face ID ou Touch ID" },
  { id: "google_pay", nome: "Google Pay", desc: "Com a carteira do Google" },
  { id: "estabelecimento", nome: "Pagar no estabelecimento", desc: "O garçom confirma no caixa" },
] as const;
type Metodo = (typeof METODOS)[number]["id"];
const OCASIOES = ["Sem ocasião", "Aniversário", "Negócios", "Romântico", "Comemoração"];
const HOLD_SEG = 5 * 60;
const SERVICO = 0.1;

const brl = (c: number) =>
  (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const hhmm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};
const relogio = () =>
  new Date().toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
const diaRotulo = (day: string, hoje: string) =>
  day === hoje
    ? "Hoje"
    : day === addDays(hoje, 1)
      ? "Amanhã"
      : new Date(`${day}T12:00:00Z`).toLocaleDateString("pt-BR", {
          weekday: "short",
          day: "2-digit",
          timeZone: "UTC",
        });

function regras(r: Restaurante): AvailabilityRule[] {
  return [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    r.turnos.map(([a, b]) => ({ weekday, firstSeatingMin: hhmm(a), lastSeatingMin: hhmm(b) })),
  );
}

/** Ocupações fictícias: as mesmas reservas existentes em cada um dos próximos dias. */
function ocupacoes(r: Restaurante, hoje: string): Occupation[] {
  return Array.from({ length: 8 }, (_, i) => addDays(hoje, i)).flatMap((day) =>
    r.ocupadas.map(([tableId, h]) => ({
      tableId,
      ...occupiedRange(localInstant(day, h), SETTINGS),
    })),
  );
}

type Tela =
  | "descobrir"
  | "restaurante"
  | "hold"
  | "confirmada"
  | "espera"
  | "mesa"
  | "metodos"
  | "gorjeta"
  | "avaliar"
  | "fim";
type Reserva = {
  codigo: string;
  restaurante: Restaurante;
  inicio: Date;
  pessoas: number;
  mesa: string;
  nome: string;
  ocasiao: string;
  status: ReservationStatus;
};

export function SimuladorGuest() {
  const hoje = localDay(new Date());
  const [tela, setTela] = useState<Tela>("descobrir");
  const [busca, setBusca] = useState("");
  const [rest, setRest] = useState<Restaurante>(RESTAURANTES[0]!);
  const [dia, setDia] = useState(addDays(hoje, 1));
  const [pessoas, setPessoas] = useState(2);
  const [horario, setHorario] = useState<Date | null>(null);
  const [restante, setRestante] = useState(HOLD_SEG);
  const [nome, setNome] = useState("Lucas");
  const [ocasiao, setOcasiao] = useState(OCASIOES[0]!);
  const [reserva, setReserva] = useState<Reserva | null>(null);
  const [espera, setEspera] = useState<{ hora: string; status: "aguardando" | "avisado" } | null>(
    null,
  );
  const [metodo, setMetodo] = useState<Metodo | null>(null);
  const [pago, setPago] = useState(0);
  const [gorjeta, setGorjeta] = useState<number | null>(null);
  const [outro, setOutro] = useState("");
  const [nota, setNota] = useState(0);
  const [consentiu, setConsentiu] = useState(false);
  const [favorito, setFavorito] = useState(false);
  const [aviso, setAviso] = useState<string | null>(null);
  const [eventos, setEventos] = useState<{ hora: string; texto: string }[]>([]);
  const anotar = (texto: string) =>
    setEventos((e) => [{ hora: relogio(), texto }, ...e].slice(0, 7));
  const seq = useRef(4821);

  const now = useMemo(() => new Date(), [tela, dia]); // eslint-disable-line react-hooks/exhaustive-deps
  const occ = useMemo(() => ocupacoes(rest, hoje), [rest, hoje]);
  const base = {
    settings: SETTINGS,
    rules: regras(rest),
    exceptions: [],
    tables: rest.mesas,
    combinations: [],
  };
  const livres = availableSlots({ ...base, now, occupations: occ, day: dia, party: pessoas });
  // Todos os horários da grade do dia, para mostrar os lotados e oferecer a lista de espera.
  const grade = rest.turnos
    .flatMap(([a, b]) => {
      const out: Date[] = [];
      for (let m = hhmm(a); m <= hhmm(b); m += SETTINGS.slotIntervalMin)
        out.push(
          localInstant(
            dia,
            `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`,
          ),
        );
      return out;
    })
    .filter((d) => d.getTime() >= now.getTime() + SETTINGS.minAdvanceMin * 60_000);

  // Hold de 5 minutos: o horário fica segurado enquanto o cliente confirma.
  useEffect(() => {
    if (tela !== "hold") return;
    const t = setInterval(() => setRestante((s) => Math.max(0, s - 1)), 1000);
    return () => clearInterval(t);
  }, [tela]);
  useEffect(() => {
    if (tela === "hold" && restante === 0) {
      setAviso("O tempo acabou e o horário foi liberado para outras pessoas.");
      anotar(`Hold de ${horario ? localTime(horario) : ""} expirou e a mesa voltou a ficar livre`);
      setTela("restaurante");
    }
  }, [restante, tela]); // eslint-disable-line react-hooks/exhaustive-deps

  const conta =
    rest.cardapio.reduce((s, i) => s + i.preco, 0) * Math.max(1, Math.ceil(pessoas / 2));
  const servico = Math.round(conta * SERVICO);
  const total = conta + servico;

  function abrir(r: Restaurante) {
    setRest(r);
    setHorario(null);
    setAviso(null);
    setTela("restaurante");
  }
  function segurar(d: Date) {
    setHorario(d);
    setRestante(HOLD_SEG);
    setAviso(null);
    setTela("hold");
    anotar(`Horário ${localTime(d)} segurado por 5 minutos para ${pessoas} pessoas`);
  }
  function confirmar() {
    if (!horario) return;
    const range = occupiedRange(horario, SETTINGS);
    const livresMesa = rest.mesas.filter(
      (m) =>
        pessoas >= (m.seatsMin ?? 1) &&
        pessoas <= m.seatsMax &&
        !occ.some((o) => o.tableId === m.id && o.start < range.end && range.start < o.end),
    );
    const mesa =
      livresMesa.sort((a, b) => a.seatsMax - b.seatsMax)[0]?.numero ?? rest.mesas[0]!.numero;
    const r: Reserva = {
      codigo: `TG-${seq.current++}`,
      restaurante: rest,
      inicio: horario,
      pessoas,
      mesa,
      nome: nome.trim() || "Cliente",
      ocasiao,
      status: "confirmada",
    };
    setReserva(r);
    setTela("confirmada");
    anotar(
      `Nova reserva pelo app: ${r.nome}, ${pessoas} pessoas, ${localTime(horario)}, mesa ${mesa}`,
    );
  }
  function mudarStatus(s: ReservationStatus, texto: string) {
    setReserva((r) => (r ? { ...r, status: s } : r));
    anotar(texto);
  }
  function entrarEspera(d: Date) {
    setEspera({ hora: localTime(d), status: "aguardando" });
    setTela("espera");
    anotar(
      `${nome || "Cliente"} entrou na lista de espera para ${localTime(d)} (${pessoas} pessoas)`,
    );
  }
  function pagar() {
    if (!metodo) return;
    setPago(total);
    setTela("gorjeta");
    const m = METODOS.find((x) => x.id === metodo)!.nome;
    anotar(
      metodo === "estabelecimento"
        ? `Mesa ${reserva?.mesa}: pagamento no estabelecimento aguardando o caixa (${brl(total)})`
        : `Mesa ${reserva?.mesa}: conta paga com ${m} (${brl(total)}), aprovado na simulação`,
    );
  }
  function recomecar() {
    setTela("descobrir");
    setBusca("");
    setRest(RESTAURANTES[0]!);
    setDia(addDays(hoje, 1));
    setPessoas(2);
    setHorario(null);
    setReserva(null);
    setEspera(null);
    setMetodo(null);
    setPago(0);
    setGorjeta(null);
    setOutro("");
    setNota(0);
    setConsentiu(false);
    setFavorito(false);
    setAviso(null);
    setEventos([]);
  }

  const passo =
    tela === "descobrir" || tela === "restaurante"
      ? 0
      : tela === "hold" || tela === "espera"
        ? 1
        : tela === "confirmada"
          ? 2
          : tela === "mesa" || tela === "metodos"
            ? 3
            : 4;
  const DICAS = [
    "Escolha um restaurante, o dia e quantas pessoas. Os horários livres saem do mesmo cálculo do motor de reservas.",
    "O horário fica segurado por 5 minutos enquanto você confirma. Horário lotado oferece a lista de espera.",
    "Reserva confirmada. Agora faça o papel do restaurante: marque a chegada e leve o grupo à mesa.",
    "Na mesa, a conta abre no mesmo app. Pague com Pix, Apple Pay, Google Pay ou no estabelecimento.",
    "Depois de pagar: gorjeta extra opcional para quem atendeu e a avaliação, com o seu consentimento.",
  ];
  const filtrados = RESTAURANTES.filter((r) =>
    `${r.nome} ${r.tipo} ${r.bairro}`.toLowerCase().includes(busca.trim().toLowerCase()),
  );

  return (
    <Secao tema="claro" id="simulador">
      <div className="container-page">
        <Titulo
          rotulo="Simulador"
          titulo="Experimente o Tipe Guest."
          texto="Faça o papel do cliente no celular e veja ao lado o painel do restaurante. Prévia de um produto em desenvolvimento, com restaurantes fictícios: nada é enviado e nenhuma cobrança acontece."
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
          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Smartphone className="h-4 w-4" aria-hidden /> Celular do cliente
            </p>
            <div className="mx-auto w-full max-w-[22rem] rounded-[2.6rem] bg-[#021E34] p-2.5 shadow-[0_40px_80px_-30px_rgb(2_30_52/0.55)]">
              <div className="flex h-[40rem] flex-col overflow-hidden rounded-[2.1rem] bg-white text-[#021E34]">
                {tela === "descobrir" && (
                  <Tela titulo="Onde vamos comer?" sub="Fortaleza">
                    <label className="flex items-center gap-2 rounded-2xl border border-[#021E34]/12 px-3">
                      <Search className="h-4 w-4 text-[#5b6b78]" aria-hidden />
                      <span className="sr-only">Buscar restaurante</span>
                      <input
                        value={busca}
                        onChange={(e) => setBusca(e.target.value)}
                        placeholder="Restaurante, cozinha ou bairro"
                        className="h-11 min-w-0 flex-1 bg-transparent text-sm outline-none"
                      />
                    </label>
                    <ul className="mt-3 grid gap-2.5">
                      {filtrados.map((r) => {
                        const prox = availableSlots({
                          settings: SETTINGS,
                          rules: regras(r),
                          exceptions: [],
                          tables: r.mesas,
                          combinations: [],
                          now,
                          occupations: ocupacoes(r, hoje),
                          day: addDays(hoje, 1),
                          party: 2,
                        }).slice(0, 3);
                        return (
                          <li key={r.id}>
                            <button
                              type="button"
                              onClick={() => abrir(r)}
                              className="w-full rounded-2xl border border-[#021E34]/10 p-3 text-left hover:border-[#021E34]/30"
                            >
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-semibold">{r.nome}</p>
                                  <p className="text-xs text-[#5b6b78]">
                                    {r.tipo} · {r.bairro} · {r.preco}
                                  </p>
                                </div>
                                <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                                  <Star
                                    className="h-3.5 w-3.5 fill-[#f5b301] text-[#f5b301]"
                                    aria-hidden
                                  />
                                  {r.nota}
                                </span>
                              </div>
                              {r.fundador && (
                                <span className="mt-1.5 inline-block rounded-full bg-[#e6faf8] px-2 py-0.5 text-[0.65rem] font-medium text-[#03665f]">
                                  Restaurante Fundador
                                </span>
                              )}
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {prox.map((d) => (
                                  <span
                                    key={d.getTime()}
                                    className="rounded-full bg-[#021E34] px-2.5 py-1 text-[0.7rem] font-semibold text-white"
                                  >
                                    {localTime(d)}
                                  </span>
                                ))}
                                <span className="py-1 text-[0.7rem] text-[#5b6b78]">
                                  amanhã, 2 pessoas
                                </span>
                              </div>
                            </button>
                          </li>
                        );
                      })}
                      {filtrados.length === 0 && (
                        <li className="rounded-2xl border border-dashed border-[#021E34]/15 px-3 py-6 text-center text-sm text-[#5b6b78]">
                          Nenhum restaurante com esse nome. Tente “mar”, “café” ou “Aldeota”.
                        </li>
                      )}
                    </ul>
                    <p className="mt-3 text-center text-[0.7rem] text-[#5b6b78]">
                      Notas e restaurantes fictícios.
                    </p>
                  </Tela>
                )}

                {tela === "restaurante" && (
                  <Tela
                    titulo={rest.nome}
                    sub={`${rest.tipo} · ${rest.bairro}`}
                    voltar={() => setTela("descobrir")}
                  >
                    <div className="flex items-center justify-between rounded-2xl border border-[#021E34]/10 px-3 py-2">
                      <span className="flex items-center gap-2 text-sm">
                        <Users className="h-4 w-4" aria-hidden /> Pessoas
                      </span>
                      <div className="flex items-center gap-3">
                        <Redondo
                          rotulo="Menos pessoas"
                          onClick={() => setPessoas((p) => Math.max(1, p - 1))}
                        >
                          <Minus className="h-4 w-4" />
                        </Redondo>
                        <span className="w-4 text-center font-semibold tabular-nums">
                          {pessoas}
                        </span>
                        <Redondo
                          rotulo="Mais pessoas"
                          onClick={() => setPessoas((p) => Math.min(SETTINGS.maxParty, p + 1))}
                        >
                          <Plus className="h-4 w-4" />
                        </Redondo>
                      </div>
                    </div>
                    <div
                      className="sem-barra -mx-4 mt-3 flex gap-1.5 overflow-x-auto px-4"
                      role="listbox"
                      aria-label="Dia"
                    >
                      {Array.from({ length: 7 }, (_, i) => addDays(hoje, i)).map((d) => (
                        <button
                          key={d}
                          type="button"
                          role="option"
                          aria-selected={dia === d}
                          onClick={() => setDia(d)}
                          className={cn(
                            "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium capitalize",
                            dia === d
                              ? "border-[#021E34] bg-[#021E34] text-white"
                              : "border-[#021E34]/15",
                          )}
                        >
                          {diaRotulo(d, hoje)}
                        </button>
                      ))}
                    </div>
                    {aviso && (
                      <p className="mt-3 rounded-xl bg-amber-50 px-3 py-2 text-xs text-amber-900">
                        {aviso}
                      </p>
                    )}
                    <p className="mt-4 text-xs font-medium text-[#5b6b78]">Horários</p>
                    {grade.length === 0 ? (
                      <p className="mt-2 rounded-xl border border-dashed border-[#021E34]/15 px-3 py-5 text-center text-sm text-[#5b6b78]">
                        Sem horários neste dia. Escolha outro dia.
                      </p>
                    ) : (
                      <div className="mt-2 grid grid-cols-4 gap-1.5">
                        {grade.map((d) => {
                          const livre = livres.some((x) => x.getTime() === d.getTime());
                          return (
                            <button
                              key={d.getTime()}
                              type="button"
                              onClick={() => (livre ? segurar(d) : entrarEspera(d))}
                              aria-label={
                                livre
                                  ? `Reservar às ${localTime(d)}`
                                  : `${localTime(d)} lotado, entrar na lista de espera`
                              }
                              className={cn(
                                "rounded-xl py-2 text-xs font-semibold tabular-nums",
                                livre
                                  ? "bg-[#021E34] text-white"
                                  : "border border-dashed border-[#021E34]/25 text-[#5b6b78]",
                              )}
                            >
                              {localTime(d)}
                              {!livre && (
                                <span className="block text-[0.6rem] font-normal">espera</span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    )}
                    <p className="mt-4 text-[0.7rem] leading-relaxed text-[#5b6b78]">
                      Mesa por até {SETTINGS.durationMin} minutos. Cancelamento pelo app até{" "}
                      {SETTINGS.cancelCutoffMin / 60} horas antes.
                    </p>
                  </Tela>
                )}

                {tela === "hold" && horario && (
                  <Tela
                    titulo="Confirme sua reserva"
                    sub={rest.nome}
                    voltar={() => setTela("restaurante")}
                  >
                    <div className="rounded-2xl bg-[#021E34] p-4 text-white">
                      <p className="text-sm capitalize opacity-80">
                        {diaRotulo(dia, hoje)} · {pessoas} pessoas
                      </p>
                      <p className="font-display text-3xl tracking-[-0.03em]">
                        {localTime(horario)}
                      </p>
                      <p className="mt-2 flex items-center gap-1.5 text-xs" aria-live="polite">
                        <Clock className="h-3.5 w-3.5" aria-hidden />
                        Seguramos este horário por {Math.floor(restante / 60)}:
                        {String(restante % 60).padStart(2, "0")}
                      </p>
                    </div>
                    <label
                      className="mt-4 block text-xs font-medium text-[#5b6b78]"
                      htmlFor="sg-nome"
                    >
                      Nome da reserva
                    </label>
                    <input
                      id="sg-nome"
                      value={nome}
                      onChange={(e) => setNome(e.target.value)}
                      maxLength={40}
                      className="mt-1 h-11 w-full rounded-xl border border-[#021E34]/15 px-3 text-sm"
                    />
                    <label
                      className="mt-3 block text-xs font-medium text-[#5b6b78]"
                      htmlFor="sg-ocasiao"
                    >
                      Ocasião
                    </label>
                    <select
                      id="sg-ocasiao"
                      value={ocasiao}
                      onChange={(e) => setOcasiao(e.target.value)}
                      className="mt-1 h-11 w-full rounded-xl border border-[#021E34]/15 bg-white px-3 text-sm"
                    >
                      {OCASIOES.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </select>
                    <div className="mt-auto pt-4">
                      <button
                        type="button"
                        onClick={confirmar}
                        disabled={!nome.trim()}
                        className="min-h-12 w-full rounded-full bg-[#0FC9BD] font-semibold text-[#021E34] disabled:opacity-50"
                      >
                        Confirmar reserva
                      </button>
                      <p className="mt-2 text-center text-[0.7rem] text-[#5b6b78]">
                        Reservar é grátis. Sem cartão.
                      </p>
                    </div>
                  </Tela>
                )}

                {tela === "espera" && espera && (
                  <Tela
                    titulo="Lista de espera"
                    sub={rest.nome}
                    voltar={() => setTela("restaurante")}
                  >
                    <div className="rounded-2xl border border-[#021E34]/10 p-4">
                      <p className="text-sm text-[#5b6b78]">
                        {diaRotulo(dia, hoje)} por volta das {espera.hora} · {pessoas} pessoas
                      </p>
                      {espera.status === "aguardando" ? (
                        <>
                          <p className="mt-1 font-display text-xl tracking-[-0.02em]">
                            Você está na fila
                          </p>
                          <p className="mt-1 text-sm">
                            Cerca de 2 grupos na sua frente (estimativa)
                          </p>
                          <p className="mt-3 text-xs text-[#5b6b78]">
                            Avisamos aqui quando uma mesa liberar. A posição é uma estimativa, não
                            uma garantia.
                          </p>
                        </>
                      ) : (
                        <>
                          <p className="mt-1 flex items-center gap-2 font-display text-xl tracking-[-0.02em]">
                            <Bell className="h-5 w-5" aria-hidden /> Uma mesa liberou!
                          </p>
                          <p className="mt-1 text-sm">Confirme em até 15 minutos para garantir.</p>
                          <button
                            type="button"
                            onClick={() => {
                              const d = localInstant(dia, espera.hora);
                              setHorario(d);
                              setEspera(null);
                              const r: Reserva = {
                                codigo: `TG-${seq.current++}`,
                                restaurante: rest,
                                inicio: d,
                                pessoas,
                                mesa: rest.mesas[rest.mesas.length - 1]!.numero,
                                nome: nome.trim() || "Cliente",
                                ocasiao,
                                status: "confirmada",
                              };
                              setReserva(r);
                              setTela("confirmada");
                              anotar(
                                `${r.nome} confirmou a vaga da lista de espera: ${espera.hora}, mesa ${r.mesa}`,
                              );
                            }}
                            className="mt-3 min-h-11 w-full rounded-full bg-[#0FC9BD] text-sm font-semibold"
                          >
                            Confirmar a mesa
                          </button>
                        </>
                      )}
                    </div>
                    <p className="mt-3 text-xs text-[#5b6b78]">
                      No painel ao lado, faça o papel do restaurante e avise o próximo da fila.
                    </p>
                  </Tela>
                )}

                {tela === "confirmada" && reserva && (
                  <Tela titulo="Reserva confirmada" sub={reserva.restaurante.nome}>
                    <div className="rounded-2xl bg-[#e6faf8] p-4">
                      <BadgeCheck className="h-7 w-7 text-[#03665f]" aria-hidden />
                      <p className="mt-2 font-display text-2xl tracking-[-0.03em]">
                        {diaRotulo(localDay(reserva.inicio), hoje)}, {localTime(reserva.inicio)}
                      </p>
                      <p className="text-sm">
                        {reserva.pessoas} pessoas · em nome de {reserva.nome}
                        {reserva.ocasiao !== OCASIOES[0] ? ` · ${reserva.ocasiao}` : ""}
                      </p>
                      <p className="mt-2 text-xs text-[#5b6b78]">Código {reserva.codigo}</p>
                    </div>
                    <p className="mt-3 flex items-center gap-2 text-sm">
                      <MapPin className="h-4 w-4" aria-hidden /> {reserva.restaurante.bairro},
                      Fortaleza
                    </p>
                    <p className="mt-1 flex items-center gap-2 text-sm">
                      <CalendarDays className="h-4 w-4" aria-hidden /> Status:{" "}
                      {RESERVATION_STATUS_LABEL[reserva.status]}
                    </p>
                    {reserva.status === "confirmada" && (
                      <button
                        type="button"
                        onClick={() => {
                          const pode = guestCanChange({
                            status: reserva.status,
                            start: reserva.inicio,
                            now: new Date(),
                            settings: SETTINGS,
                          });
                          if (!pode.ok) {
                            setAviso(pode.reason);
                            return;
                          }
                          anotar(
                            `${reserva.nome} cancelou pelo app; a mesa ${reserva.mesa} voltou a ficar livre`,
                          );
                          setReserva(null);
                          setAviso("Reserva cancelada. Nenhuma cobrança.");
                          setTela("restaurante");
                        }}
                        className="mt-4 min-h-11 w-full rounded-full border border-[#021E34]/20 text-sm font-medium"
                      >
                        Cancelar reserva
                      </button>
                    )}
                    {aviso && <p className="mt-2 text-xs text-amber-800">{aviso}</p>}
                    <p className="mt-auto rounded-xl bg-[#f4f6f8] px-3 py-2.5 text-xs text-[#5b6b78]">
                      {reserva.status === "confirmada"
                        ? "Chegou ao restaurante? No painel ao lado, marque a chegada e leve o grupo à mesa."
                        : reserva.status === "chegou"
                          ? "A equipe já viu que você chegou. Agora é só levar à mesa no painel."
                          : "Bom apetite!"}
                    </p>
                  </Tela>
                )}

                {(tela === "mesa" || tela === "metodos") && reserva && (
                  <Tela
                    titulo={`Mesa ${reserva.mesa}`}
                    sub={`${reserva.restaurante.nome} · atendida por ${reserva.restaurante.garcom}`}
                  >
                    <p className="text-sm">Olá, {reserva.nome}! A conta da mesa abre aqui.</p>
                    <ul className="mt-3 divide-y divide-[#021E34]/8 rounded-2xl border border-[#021E34]/10 text-sm">
                      {reserva.restaurante.cardapio.map((i) => (
                        <li key={i.nome} className="flex justify-between gap-2 px-3 py-2">
                          <span>
                            {Math.max(1, Math.ceil(reserva.pessoas / 2))}× {i.nome}
                          </span>
                          <span className="tabular-nums">
                            {brl(i.preco * Math.max(1, Math.ceil(reserva.pessoas / 2)))}
                          </span>
                        </li>
                      ))}
                      <li className="flex justify-between gap-2 px-3 py-2 text-[#5b6b78]">
                        <span>Serviço (10%)</span>
                        <span className="tabular-nums">{brl(servico)}</span>
                      </li>
                      <li className="flex justify-between gap-2 px-3 py-2 font-semibold">
                        <span>Total</span>
                        <span className="tabular-nums">{brl(total)}</span>
                      </li>
                    </ul>
                    {tela === "mesa" ? (
                      <button
                        type="button"
                        onClick={() => setTela("metodos")}
                        className="mt-auto min-h-12 w-full rounded-full bg-[#021E34] font-semibold text-white"
                      >
                        Pagar {brl(total)}
                      </button>
                    ) : (
                      <div className="mt-3 grid gap-1.5">
                        {METODOS.map((m) => (
                          <button
                            key={m.id}
                            type="button"
                            onClick={() => setMetodo(m.id)}
                            aria-pressed={metodo === m.id}
                            className={cn(
                              "flex items-center justify-between rounded-xl border px-3 py-2 text-left",
                              metodo === m.id
                                ? "border-[#021E34] bg-[#021E34] text-white"
                                : "border-[#021E34]/12",
                            )}
                          >
                            <span className="text-sm font-semibold">{m.nome}</span>
                            <span
                              className={cn(
                                "text-[0.65rem]",
                                metodo === m.id ? "text-white/70" : "text-[#5b6b78]",
                              )}
                            >
                              {m.desc}
                            </span>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={pagar}
                          disabled={!metodo}
                          className="mt-1 min-h-12 w-full rounded-full bg-[#0FC9BD] font-semibold text-[#021E34] disabled:opacity-50"
                        >
                          {metodo === "estabelecimento" ? "Avisar o garçom" : "Pagar (simulação)"}
                        </button>
                      </div>
                    )}
                  </Tela>
                )}

                {tela === "gorjeta" && reserva && (
                  <Gorjeta
                    garcom={reserva.restaurante.garcom}
                    pago={pago}
                    gorjeta={gorjeta}
                    setGorjeta={setGorjeta}
                    outro={outro}
                    setOutro={setOutro}
                    concluir={(valor) => {
                      if (valor > 0)
                        anotar(
                          `Gorjeta extra de ${brl(valor)}: ${brl(Math.round(valor * 0.7))} para ${reserva.restaurante.garcom}, aprovada na simulação`,
                        );
                      setTela("avaliar");
                    }}
                  />
                )}

                {tela === "avaliar" && reserva && (
                  <Tela
                    titulo="Como foi?"
                    sub={`${reserva.restaurante.nome} · ${reserva.restaurante.garcom}`}
                  >
                    <div
                      className="flex justify-center gap-1.5"
                      role="radiogroup"
                      aria-label="Nota do atendimento"
                    >
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button
                          key={n}
                          type="button"
                          role="radio"
                          aria-checked={nota === n}
                          aria-label={`${n} estrelas`}
                          onClick={() => setNota(n)}
                        >
                          <Star
                            className={cn(
                              "h-9 w-9",
                              n <= nota ? "fill-[#f5b301] text-[#f5b301]" : "text-[#021E34]/20",
                            )}
                          />
                        </button>
                      ))}
                    </div>
                    <label className="mt-5 flex items-start gap-2 text-xs leading-relaxed">
                      <input
                        type="checkbox"
                        checked={consentiu}
                        onChange={(e) => setConsentiu(e.target.checked)}
                        className="mt-0.5 h-4 w-4"
                      />
                      Autorizo mostrar minha nota (sem meu nome completo) para outras pessoas que
                      procuram este restaurante.
                    </label>
                    <p className="mt-2 text-[0.7rem] text-[#5b6b78]">
                      Sem autorização, a nota fica só com o restaurante.
                    </p>
                    <button
                      type="button"
                      disabled={nota === 0}
                      onClick={() => {
                        anotar(
                          `Avaliação ${nota}★ para ${reserva.restaurante.garcom}${consentiu ? ", com permissão para publicar" : ", só interna"}`,
                        );
                        mudarStatus(
                          "concluida",
                          `Reserva ${reserva.codigo} concluída e mesa ${reserva.mesa} liberada`,
                        );
                        setTela("fim");
                      }}
                      className="mt-auto min-h-12 w-full rounded-full bg-[#021E34] font-semibold text-white disabled:opacity-50"
                    >
                      Enviar avaliação
                    </button>
                  </Tela>
                )}

                {tela === "fim" && reserva && (
                  <Tela titulo="Até a próxima!" sub={reserva.restaurante.nome}>
                    <div className="rounded-2xl bg-[#e6faf8] p-4 text-sm">
                      <BadgeCheck className="h-7 w-7 text-[#03665f]" aria-hidden />
                      <p className="mt-2">Conta paga, gorjeta enviada e avaliação registrada.</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setFavorito((f) => !f);
                        if (!favorito)
                          anotar(
                            `${reserva.nome} salvou ${reserva.restaurante.nome} nos favoritos`,
                          );
                      }}
                      aria-pressed={favorito}
                      className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-full border border-[#021E34]/20 text-sm font-medium"
                    >
                      <Heart
                        className={cn("h-4 w-4", favorito && "fill-[#e5484d] text-[#e5484d]")}
                        aria-hidden
                      />
                      {favorito ? "Salvo nos favoritos" : "Salvar nos favoritos"}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setReserva(null);
                        setPago(0);
                        setMetodo(null);
                        setGorjeta(null);
                        setNota(0);
                        setConsentiu(false);
                        setHorario(null);
                        setTela("restaurante");
                      }}
                      className="mt-2 min-h-11 w-full rounded-full bg-[#021E34] text-sm font-semibold text-white"
                    >
                      Reservar de novo
                    </button>
                    <p className="mt-auto text-center text-[0.7rem] text-[#5b6b78]">
                      Na próxima visita, o app já lembra o seu nome.
                    </p>
                  </Tela>
                )}
              </div>
            </div>
          </div>

          <div>
            <p className="mb-3 flex items-center gap-2 text-sm font-medium text-muted-foreground">
              <Store className="h-4 w-4" aria-hidden /> O que o restaurante vê
            </p>
            <div className="grid gap-4 sm:grid-cols-2">
              <Painel titulo={`Reservas · ${(reserva?.restaurante ?? rest).nome}`}>
                {!reserva ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    A reserva aparece aqui assim que o cliente confirma no app.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border p-3">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-semibold">
                        {localTime(reserva.inicio)} · {reserva.nome}
                      </span>
                      <span className="rounded-full bg-[#e6faf8] px-2 py-0.5 text-xs font-medium text-[#03665f]">
                        {RESERVATION_STATUS_LABEL[reserva.status]}
                      </span>
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {reserva.pessoas} pessoas · mesa {reserva.mesa} · App
                      {reserva.ocasiao !== OCASIOES[0] ? ` · ${reserva.ocasiao}` : ""}
                    </p>
                    {reserva.status === "confirmada" && (
                      <BotaoPainel
                        onClick={() =>
                          mudarStatus(
                            "chegou",
                            `${reserva.nome} chegou (${reserva.pessoas} pessoas)`,
                          )
                        }
                        destaque
                      >
                        Marcar chegada
                      </BotaoPainel>
                    )}
                    {reserva.status === "chegou" && (
                      <BotaoPainel
                        destaque
                        onClick={() => {
                          mudarStatus(
                            "sentada",
                            `${reserva.nome} levado à mesa ${reserva.mesa}; a conta da mesa abriu no app`,
                          );
                          setTela("mesa");
                        }}
                      >
                        Levar à mesa {reserva.mesa}
                      </BotaoPainel>
                    )}
                  </div>
                )}
              </Painel>

              <Painel titulo="Lista de espera">
                {!espera ? (
                  <p className="rounded-xl border border-dashed border-border px-3 py-6 text-center text-sm text-muted-foreground">
                    Quem tocar num horário lotado entra aqui, por ordem de chegada.
                  </p>
                ) : (
                  <div className="rounded-xl border border-border p-3">
                    <p className="font-semibold">
                      {nome || "Cliente"} · {pessoas} pessoas
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Quer por volta das {espera.hora}
                    </p>
                    {espera.status === "aguardando" ? (
                      <BotaoPainel
                        destaque
                        onClick={() => {
                          setEspera({ ...espera, status: "avisado" });
                          anotar(
                            `Mesa liberou: ${nome || "Cliente"} avisado, tem 15 minutos para confirmar`,
                          );
                        }}
                      >
                        Mesa liberou: avisar
                      </BotaoPainel>
                    ) : (
                      <p className="mt-2 text-xs text-muted-foreground">
                        Avisado. Aguardando a confirmação no app.
                      </p>
                    )}
                  </div>
                )}
              </Painel>

              <Painel titulo="Avisos do turno" className="sm:col-span-2">
                {eventos.length === 0 ? (
                  <p className="text-sm text-muted-foreground">
                    Cada passo do cliente aparece aqui, na hora.
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
              </Painel>
            </div>
          </div>
        </div>
      </div>
    </Secao>
  );
}

function Tela({
  titulo,
  sub,
  voltar,
  children,
}: {
  titulo: string;
  sub?: string;
  voltar?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center gap-2 px-5 pb-3 pt-5">
        {voltar && (
          <button
            type="button"
            onClick={voltar}
            aria-label="Voltar"
            className="grid h-9 w-9 place-items-center rounded-full border border-[#021E34]/12"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
        )}
        <div className="min-w-0">
          {sub && <p className="truncate text-[0.7rem] text-[#5b6b78]">{sub}</p>}
          <p className="truncate font-display text-lg leading-tight tracking-[-0.02em]">{titulo}</p>
        </div>
      </div>
      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-5">{children}</div>
    </div>
  );
}

function Redondo({
  rotulo,
  onClick,
  children,
}: {
  rotulo: string;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-label={rotulo}
      onClick={onClick}
      className="grid h-8 w-8 place-items-center rounded-full border border-[#021E34]/15"
    >
      {children}
    </button>
  );
}

function Painel({
  titulo,
  children,
  className,
}: {
  titulo: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      aria-label={titulo}
      className={cn("rounded-[1.4rem] border border-border bg-card p-4 sm:p-5", className)}
    >
      <h3 className="mb-3 text-[0.95rem] font-semibold">{titulo}</h3>
      {children}
    </section>
  );
}

function BotaoPainel({
  onClick,
  destaque,
  children,
}: {
  onClick: () => void;
  destaque?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "mt-3 min-h-10 w-full rounded-full text-sm font-medium",
        destaque
          ? "bg-[#021E34] text-white"
          : "border border-foreground/20 hover:bg-background-muted",
      )}
    >
      {children}
    </button>
  );
}

/** Gorjeta extra: segundo pagamento, opcional, depois da conta. 5% sugerida, nunca pré-marcada. */
function Gorjeta({
  garcom,
  pago,
  gorjeta,
  setGorjeta,
  outro,
  setOutro,
  concluir,
}: {
  garcom: string;
  pago: number;
  gorjeta: number | null;
  setGorjeta: (n: number | null) => void;
  outro: string;
  setOutro: (s: string) => void;
  concluir: (valor: number) => void;
}) {
  const outroCent = Math.round(Number(outro.replace(",", ".")) * 100);
  const outroOk = Number.isFinite(outroCent) && outroCent >= 200 && outroCent <= pago;
  const valor =
    gorjeta === -1 ? (outroOk ? outroCent : 0) : gorjeta ? Math.round((pago * gorjeta) / 100) : 0;
  return (
    <Tela titulo={`Agradecer ${garcom}?`} sub="Conta paga">
      <div className="rounded-2xl bg-[#e6faf8] p-3 text-sm">
        <BadgeCheck className="mb-1 h-5 w-5 text-[#03665f]" aria-hidden />
        Pagamento de {brl(pago)} aprovado na simulação.
      </div>
      <p className="mt-4 text-sm">Gorjeta extra, opcional, para quem atendeu:</p>
      <div className="mt-2 grid grid-cols-3 gap-1.5">
        {[3, 5, 8].map((pct) => (
          <button
            key={pct}
            type="button"
            aria-pressed={gorjeta === pct}
            onClick={() => setGorjeta(gorjeta === pct ? null : pct)}
            className={cn(
              "rounded-xl border px-2 py-2 text-sm font-semibold",
              gorjeta === pct ? "border-[#021E34] bg-[#021E34] text-white" : "border-[#021E34]/15",
            )}
          >
            {pct}%
            <span className="block text-[0.65rem] font-normal">
              {pct === 5 ? "Sugerida" : brl(Math.round((pago * pct) / 100))}
            </span>
          </button>
        ))}
      </div>
      <button
        type="button"
        aria-pressed={gorjeta === -1}
        onClick={() => setGorjeta(gorjeta === -1 ? null : -1)}
        className={cn(
          "mt-1.5 rounded-xl border px-3 py-2 text-sm",
          gorjeta === -1 ? "border-[#021E34]" : "border-[#021E34]/15",
        )}
      >
        Outro valor
      </button>
      {gorjeta === -1 && (
        <>
          <label className="sr-only" htmlFor="sg-outro">
            Valor da gorjeta em reais
          </label>
          <input
            id="sg-outro"
            inputMode="decimal"
            value={outro}
            onChange={(e) => setOutro(e.target.value)}
            placeholder="Ex.: 10,00"
            className="mt-1.5 h-11 rounded-xl border border-[#021E34]/15 px-3 text-sm"
          />
          {outro && !outroOk && (
            <p className="mt-1 text-xs text-amber-800">De R$ 2,00 até {brl(pago)}.</p>
          )}
        </>
      )}
      <p className="mt-3 text-[0.7rem] text-[#5b6b78]">
        70% vai para {garcom}. É um segundo pagamento, separado da conta.
      </p>
      <div className="mt-auto grid gap-1.5 pt-3">
        <button
          type="button"
          disabled={valor === 0}
          onClick={() => concluir(valor)}
          className="min-h-12 w-full rounded-full bg-[#0FC9BD] font-semibold text-[#021E34] disabled:opacity-50"
        >
          {valor ? `Enviar ${brl(valor)} (simulação)` : "Escolha um valor"}
        </button>
        <button
          type="button"
          onClick={() => concluir(0)}
          className="min-h-10 text-sm text-[#5b6b78] underline-offset-4 hover:underline"
        >
          Agora não
        </button>
      </div>
    </Tela>
  );
}
