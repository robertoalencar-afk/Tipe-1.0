// Modo demonstração: restaurantes fictícios de Fortaleza. Nada é enviado e nenhuma cobrança acontece.
// Quando o app for ligado à API do Tipe, estes dados saem e entram os restaurantes reais com o módulo
// Guest ativo pela assinatura.
import {
  addDays,
  availableSlots,
  DEFAULT_RESERVATION_SETTINGS,
  localInstant,
  occupiedRange,
  type AvailabilityRule,
  type Occupation,
  type ReservableTable,
  type ReservationSettings,
} from "@core/reservas";

export type Restaurante = {
  id: string;
  nome: string;
  tipo: string;
  bairro: string;
  preco: string;
  nota: string;
  avaliacoes: number;
  fundador?: boolean;
  garcom: string;
  garantiaPorPessoa: number;
  descricao: string;
  /** Clima do lugar, como as etiquetas do OpenTable. */
  clima: string[];
  /** Destaque pago "A Lebre recomenda" (sempre marcado como patrocinado). */
  destaque?: { motivo: string };
  foto: number;
  turnos: [string, string][];
  mesas: (ReservableTable & { numero: string })[];
  ocupadas: [string, string][];
  cardapio: { nome: string; preco: number }[];
  /** Coordenadas fictícias da porta (demo da fila presencial). */
  porta: { lat: number; lng: number; raio: number };
};

export const SETTINGS: ReservationSettings = {
  ...DEFAULT_RESERVATION_SETTINGS,
  slotIntervalMin: 30,
  maxParty: 8,
};

export const RESTAURANTES: Restaurante[] = [
  {
    id: "mare",
    nome: "Maré Alta",
    tipo: "Frutos do mar",
    bairro: "Meireles",
    preco: "$$$",
    nota: "4,8",
    avaliacoes: 312,
    fundador: true,
    garcom: "Joyce",
    garantiaPorPessoa: 2500,
    descricao: "Peixe do dia na brasa, vista para o mar e caipirinha de caju.",
    clima: ["Vista para o mar", "Romântico", "Bom para grupos"],
    foto: require("../../assets/restaurantes/casal.webp"),
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
    porta: { lat: -3.7251, lng: -38.4926, raio: 150 },
  },
  {
    id: "brasa",
    nome: "Brasa do Sertão",
    tipo: "Carnes e regional",
    bairro: "Aldeota",
    preco: "$$",
    nota: "4,6",
    avaliacoes: 198,
    garcom: "Davi",
    garantiaPorPessoa: 1500,
    descricao: "Carne de sol, baião de dois e música ao vivo às sextas.",
    destaque: { motivo: "A carne de sol mais pedida da semana, com forró ao vivo na sexta." },
    clima: ["Animado", "Música ao vivo", "Bom para grupos"],
    foto: require("../../assets/restaurantes/amigos.webp"),
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
    porta: { lat: -3.7389, lng: -38.5013, raio: 150 },
  },
  {
    id: "jangada",
    nome: "Jangada Café",
    tipo: "Café e brunch",
    bairro: "Praia de Iracema",
    preco: "$",
    nota: "4,7",
    avaliacoes: 241,
    garcom: "Lia",
    garantiaPorPessoa: 0,
    descricao: "Tapioca na hora, cuscuz e café coado de torra local.",
    clima: ["Tranquilo", "Café da manhã", "Bom para crianças"],
    foto: require("../../assets/restaurantes/familia.webp"),
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
    porta: { lat: -3.7203, lng: -38.5181, raio: 150 },
  },
];

export const restaurante = (id: string) => RESTAURANTES.find((r) => r.id === id) ?? RESTAURANTES[0]!;

export const hhmm = (s: string) => {
  const [h, m] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
};

export function regras(r: Restaurante): AvailabilityRule[] {
  return [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    r.turnos.map(([a, b]) => ({ weekday, firstSeatingMin: hhmm(a), lastSeatingMin: hhmm(b) })),
  );
}

export function ocupacoes(r: Restaurante, hoje: string): Occupation[] {
  return Array.from({ length: 8 }, (_, i) => addDays(hoje, i)).flatMap((day) =>
    r.ocupadas.map(([tableId, h]) => ({ tableId, ...occupiedRange(localInstant(day, h), SETTINGS) })),
  );
}

export const METODOS = [
  { id: "pix", nome: "Pix", desc: "Copia e cola ou QR Code", icone: "qr-code" },
  { id: "apple_pay", nome: "Apple Pay", desc: "Face ID ou Touch ID", icone: "logo-apple" },
  { id: "google_pay", nome: "Google Pay", desc: "Carteira do Google", icone: "logo-google" },
  { id: "estabelecimento", nome: "Pagar no estabelecimento", desc: "O garçom confirma no caixa", icone: "storefront" },
] as const;
export type Metodo = (typeof METODOS)[number]["id"];

export const brl = (c: number) => (c / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export const SERVICO = 0.1;
export const OCASIOES = ["Sem ocasião", "Aniversário", "Negócios", "Romântico", "Comemoração"];

/** Cinco horários da grade em volta do horário desejado, livres ou não (o lotado aparece apagado). */
export function horariosCartao(r: Restaurante, dia: string, pessoas: number, alvo: string, n = 5) {
  const livres = horariosPerto(r, dia, pessoas, alvo, 99).map((d) => d.getTime());
  const grade = r.turnos.flatMap(([a, b]) => {
    const out: Date[] = [];
    for (let m = hhmm(a); m <= hhmm(b); m += SETTINGS.slotIntervalMin)
      out.push(localInstant(dia, `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`));
    return out;
  });
  const a = localInstant(dia, alvo).getTime();
  const perto = grade
    .slice()
    .sort((x, y) => Math.abs(x.getTime() - a) - Math.abs(y.getTime() - a))
    .slice(0, n)
    .sort((x, y) => x.getTime() - y.getTime());
  return { slots: perto.map((d) => ({ d, livre: livres.includes(d.getTime()) })), livresNoDia: livres.length };
}

/** Próximos horários livres a partir de um horário desejado (cartões da busca, como no OpenTable). */
export function horariosPerto(r: Restaurante, dia: string, pessoas: number, alvo: string, n = 3): Date[] {
  const hoje = dia;
  const livres = availableSlots({
    settings: SETTINGS,
    rules: regras(r),
    exceptions: [],
    tables: r.mesas,
    combinations: [],
    now: new Date(),
    occupations: ocupacoes(r, hoje),
    day: dia,
    party: pessoas,
  });
  const a = localInstant(dia, alvo).getTime();
  return livres
    .slice()
    .sort((x, y) => Math.abs(x.getTime() - a) - Math.abs(y.getTime() - a))
    .slice(0, n)
    .sort((x, y) => x.getTime() - y.getTime());
}

/** Prova social fictícia do modo demonstração. */
export const RESERVADO_HOJE: Record<string, number> = { mare: 23, brasa: 14, jangada: 9 };

/** Pergunte à Lebre (modo demonstração): regras simples sobre tipo, clima e descrição, sem IA paga. */
export const SUGESTOES_LEBRE = [
  "Frutos do mar com vista",
  "Jantar romântico a dois",
  "Música ao vivo com a turma",
  "Café da manhã com crianças",
];

export function perguntarLebre(pergunta: string): Restaurante[] {
  const termos = pergunta
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .split(/[^a-z]+/)
    .filter((t) => t.length > 3);
  const pontua = (r: Restaurante) => {
    const txt = `${r.tipo} ${r.clima.join(" ")} ${r.descricao}`.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    return termos.filter((t) => txt.includes(t.slice(0, 5))).length;
  };
  return RESTAURANTES.map((r) => [r, pontua(r)] as const)
    .filter(([, n]) => n > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([r]) => r);
}
