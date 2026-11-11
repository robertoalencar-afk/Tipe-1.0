// Tipe Guest · vitrine do cliente e salão do Guest Manager (Projeto 4). Regras puras, sem rede,
// usadas pela demonstração web (/guest-demo) e prontas para o app (apps/guest). Os restaurantes
// daqui são FICTÍCIOS e rotulados como demonstração: nunca se misturam com dados de produção.

import {
  availableSlots,
  DEFAULT_RESERVATION_SETTINGS,
  localInstant,
  occupiedRange,
  type AvailabilityRule,
  type Occupation,
  type ReservableTable,
  type ReservationSettings,
} from "./reservas";

export type Cozinha =
  "Frutos do mar" | "Regional" | "Café e brunch" | "Japonesa" | "Italiana" | "Bar";
export type Preco = 1 | 2 | 3 | 4;

export type VitrineRestaurante = {
  id: string;
  nome: string;
  cozinha: Cozinha;
  bairro: string;
  preco: Preco;
  /** Média verificada (0 a 5) e quantidade de avaliações de quem foi de verdade. */
  nota: number;
  avaliacoes: number;
  /** Posição no mapa estilizado, 0 a 100 (não é coordenada real). */
  x: number;
  y: number;
  fundador: boolean;
  /** Restaurante pagou destaque: aparece como "A Lebre recomenda", sempre rotulado "Patrocinado". */
  patrocinado: boolean;
  aceitaGarantia: boolean;
  tags: string[];
  experiencias: { titulo: string; desc: string }[];
  turnos: [string, string][];
  mesas: (ReservableTable & { numero: string })[];
  /** Reservas fictícias fixas (mesa, HH:MM) para deixar alguns horários lotados. */
  ocupadas: [string, string][];
  reservasHoje: number;
};

const m = (id: string, numero: string, seatsMin: number, seatsMax: number) => ({
  id,
  numero,
  seatsMin,
  seatsMax,
});

export const VITRINE: VitrineRestaurante[] = [
  {
    id: "mare-alta",
    nome: "Maré Alta",
    cozinha: "Frutos do mar",
    bairro: "Meireles",
    preco: 3,
    nota: 4.8,
    avaliacoes: 312,
    x: 62,
    y: 30,
    fundador: true,
    patrocinado: true,
    aceitaGarantia: true,
    tags: ["Vista para o mar", "Varanda", "Romântico"],
    experiencias: [{ titulo: "Menu do pôr do sol", desc: "Cinco etapas na varanda, às sextas." }],
    turnos: [
      ["12:00", "15:00"],
      ["19:00", "22:30"],
    ],
    mesas: [
      m("m1", "1", 1, 2),
      m("m2", "2", 1, 2),
      m("m4", "4", 2, 4),
      m("m7", "7", 2, 4),
      m("m9", "9", 4, 8),
    ],
    ocupadas: [
      ["m1", "19:00"],
      ["m2", "20:30"],
      ["m4", "19:30"],
      ["m7", "21:00"],
      ["m9", "20:00"],
    ],
    reservasHoje: 23,
  },
  {
    id: "brasa-do-sertao",
    nome: "Brasa do Sertão",
    cozinha: "Regional",
    bairro: "Aldeota",
    preco: 2,
    nota: 4.6,
    avaliacoes: 204,
    x: 48,
    y: 55,
    fundador: true,
    patrocinado: false,
    aceitaGarantia: true,
    tags: ["Família", "Grupos", "Carne de sol"],
    experiencias: [{ titulo: "Noite do baião", desc: "Forró pé de serra aos sábados." }],
    turnos: [["18:00", "23:00"]],
    mesas: [m("b3", "3", 1, 4), m("b5", "5", 2, 6), m("b8", "8", 6, 10)],
    ocupadas: [
      ["b3", "20:00"],
      ["b5", "21:30"],
    ],
    reservasHoje: 14,
  },
  {
    id: "jangada-cafe",
    nome: "Jangada Café",
    cozinha: "Café e brunch",
    bairro: "Praia de Iracema",
    preco: 1,
    nota: 4.7,
    avaliacoes: 158,
    x: 36,
    y: 22,
    fundador: false,
    patrocinado: false,
    aceitaGarantia: false,
    tags: ["Brunch", "Pet friendly", "Ao ar livre"],
    experiencias: [],
    turnos: [["08:00", "13:30"]],
    mesas: [m("j1", "1", 1, 2), m("j6", "6", 2, 4)],
    ocupadas: [
      ["j1", "09:00"],
      ["j6", "10:30"],
    ],
    reservasHoje: 9,
  },
  {
    id: "kazoku",
    nome: "Kazoku",
    cozinha: "Japonesa",
    bairro: "Varjota",
    preco: 3,
    nota: 4.5,
    avaliacoes: 97,
    x: 70,
    y: 44,
    fundador: false,
    patrocinado: false,
    aceitaGarantia: true,
    tags: ["Balcão", "Omakase"],
    experiencias: [{ titulo: "Omakase no balcão", desc: "Oito lugares, duas sessões." }],
    turnos: [["19:00", "23:00"]],
    mesas: [m("k1", "B1", 1, 2), m("k2", "B2", 1, 2), m("k5", "5", 2, 4)],
    ocupadas: [["k5", "20:30"]],
    reservasHoje: 11,
  },
  {
    id: "trattoria-dona-lia",
    nome: "Trattoria Dona Lia",
    cozinha: "Italiana",
    bairro: "Cocó",
    preco: 2,
    nota: 4.4,
    avaliacoes: 141,
    x: 80,
    y: 70,
    fundador: false,
    patrocinado: false,
    aceitaGarantia: false,
    tags: ["Massas frescas", "Família"],
    experiencias: [],
    turnos: [
      ["12:00", "15:00"],
      ["19:00", "23:00"],
    ],
    mesas: [m("t2", "2", 2, 4), m("t6", "6", 2, 6)],
    ocupadas: [["t2", "20:00"]],
    reservasHoje: 8,
  },
  {
    id: "boteco-do-farol",
    nome: "Boteco do Farol",
    cozinha: "Bar",
    bairro: "Mucuripe",
    preco: 1,
    nota: 4.3,
    avaliacoes: 266,
    x: 88,
    y: 26,
    fundador: true,
    patrocinado: false,
    aceitaGarantia: false,
    tags: ["Petiscos", "Música ao vivo", "Grupos"],
    experiencias: [],
    turnos: [["17:00", "23:30"]],
    mesas: [m("f1", "1", 2, 4), m("f4", "4", 4, 8)],
    ocupadas: [["f4", "21:00"]],
    reservasHoje: 19,
  },
];

export const VITRINE_SETTINGS: ReservationSettings = {
  ...DEFAULT_RESERVATION_SETTINGS,
  timeZone: "America/Fortaleza",
  slotIntervalMin: 30,
  maxParty: 10,
  minAdvanceMin: 30,
};

const hhmm = (s: string) => {
  const [h, mm] = s.split(":").map(Number);
  return (h ?? 0) * 60 + (mm ?? 0);
};

export function regrasDe(r: VitrineRestaurante): AvailabilityRule[] {
  return [0, 1, 2, 3, 4, 5, 6].flatMap((weekday) =>
    r.turnos.map(([a, b]) => ({ weekday, firstSeatingMin: hhmm(a), lastSeatingMin: hhmm(b) })),
  );
}

export function ocupacoesDe(r: VitrineRestaurante, dia: string): Occupation[] {
  return r.ocupadas.map(([tableId, h]) => ({
    tableId,
    ...occupiedRange(localInstant(dia, h, VITRINE_SETTINGS), VITRINE_SETTINGS),
  }));
}

/** Horários livres de verdade, pelo mesmo motor de reservas. */
export function horariosLivres(r: VitrineRestaurante, dia: string, pessoas: number, agora: Date) {
  return availableSlots({
    day: dia,
    party: pessoas,
    now: agora,
    settings: VITRINE_SETTINGS,
    rules: regrasDe(r),
    exceptions: [],
    tables: r.mesas,
    combinations: [],
    occupations: ocupacoesDe(r, dia),
  });
}

/** Até n horários livres mais perto do horário desejado (como os botões do cartão de busca). */
export function horariosPerto(livres: Date[], alvo: Date, n = 3) {
  return [...livres]
    .sort((a, b) => Math.abs(a.getTime() - alvo.getTime()) - Math.abs(b.getTime() - alvo.getTime()))
    .slice(0, n)
    .sort((a, b) => a.getTime() - b.getTime());
}

// ---------------------------------------------------------------- busca, filtros e coleções

export type Filtros = {
  texto?: string | undefined;
  cozinhas?: Cozinha[] | undefined;
  precos?: Preco[] | undefined;
  bairros?: string[] | undefined;
  fundador?: boolean | undefined;
  notaMin?: number | undefined;
};
export type Ordem = "relevancia" | "nota" | "preco" | "populares";

const norm = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function filtrar(lista: VitrineRestaurante[], f: Filtros) {
  const q = f.texto ? norm(f.texto.trim()) : "";
  return lista.filter(
    (r) =>
      (!q || norm([r.nome, r.cozinha, r.bairro, ...r.tags].join(" ")).includes(q)) &&
      (!f.cozinhas?.length || f.cozinhas.includes(r.cozinha)) &&
      (!f.precos?.length || f.precos.includes(r.preco)) &&
      (!f.bairros?.length || f.bairros.includes(r.bairro)) &&
      (!f.fundador || r.fundador) &&
      (!f.notaMin || r.nota >= f.notaMin),
  );
}

/** Relevância não favorece patrocinado: o destaque pago aparece só no cartão próprio, rotulado. */
export function ordenar(lista: VitrineRestaurante[], o: Ordem) {
  const c = [...lista];
  if (o === "nota") c.sort((a, b) => b.nota - a.nota || b.avaliacoes - a.avaliacoes);
  if (o === "preco") c.sort((a, b) => a.preco - b.preco || b.nota - a.nota);
  if (o === "populares") c.sort((a, b) => b.reservasHoje - a.reservasHoje);
  if (o === "relevancia")
    c.sort(
      (a, b) => b.nota * Math.log10(10 + b.avaliacoes) - a.nota * Math.log10(10 + a.avaliacoes),
    );
  return c;
}

/** Coleções só a partir de dados reais da lista (nada inventado). Vazia some. */
export function colecoes(lista: VitrineRestaurante[]) {
  return [
    {
      id: "mais-reservados",
      titulo: "Mais reservados hoje",
      itens: ordenar(lista, "populares").slice(0, 4),
    },
    {
      id: "bem-avaliados",
      titulo: "Mais bem avaliados",
      itens: lista.filter((r) => r.nota >= 4.6),
    },
    { id: "fundadores", titulo: "Restaurantes Fundadores", itens: lista.filter((r) => r.fundador) },
    {
      id: "experiencias",
      titulo: "Com experiências",
      itens: lista.filter((r) => r.experiencias.length),
    },
  ].filter((c) => c.itens.length > 0);
}

export function destaquePago(lista: VitrineRestaurante[]) {
  return lista.find((r) => r.patrocinado) ?? null;
}

// ---------------------------------------------------------------- "Pergunte à Lebre onde ir"

export type RespostaLebre = { texto: string; restaurantes: VitrineRestaurante[] };

const PISTAS: [RegExp, Filtros][] = [
  [/mar|peixe|camar|frutos/, { cozinhas: ["Frutos do mar"] }],
  [/regional|nordest|sert|carne de sol|baiao/, { cozinhas: ["Regional"] }],
  [/cafe|brunch|manha|tapioca/, { cozinhas: ["Café e brunch"] }],
  [/japon|sushi|omakase/, { cozinhas: ["Japonesa"] }],
  [/massa|italian|pizza/, { cozinhas: ["Italiana"] }],
  [/bar|boteco|chopp|cerveja|petisco/, { cozinhas: ["Bar"] }],
  [/barat|economic|em conta/, { precos: [1] }],
  [/fundador/, { fundador: true }],
];

const TAGS: [RegExp, string][] = [
  [/romant|namor|casal|pedido/, "Romântico"],
  [/famil|crianc/, "Família"],
  [/grupo|amigos|galera/, "Grupos"],
  [/vista|por do sol/, "Vista para o mar"],
  [/pet|cachorro/, "Pet friendly"],
];

/**
 * Concierge por regras: só devolve restaurantes da lista, com dados dela. Nunca inventa
 * restaurante, horário, preço ou avaliação. Sem pista, diz que não sabe e mostra os mais avaliados.
 */
export function perguntarLebre(
  pergunta: string,
  lista: VitrineRestaurante[] = VITRINE,
): RespostaLebre {
  const q = norm(pergunta);
  const f: Filtros = {};
  for (const [re, x] of PISTAS) if (re.test(q)) Object.assign(f, x);
  let r = filtrar(lista, f);
  const tags = TAGS.filter(([re]) => re.test(q)).map(([, t]) => t);
  if (tags.length) {
    const comTag = r.filter((x) => tags.some((t) => x.tags.includes(t)));
    if (comTag.length) r = comTag;
  }
  const entendeu = Object.keys(f).length > 0 || tags.length > 0;
  if (!entendeu || !r.length)
    return {
      texto:
        "Não achei nada exato para isso entre os restaurantes do Tipe Guest. Estes são os mais bem avaliados:",
      restaurantes: ordenar(lista, "nota").slice(0, 3),
    };
  return {
    texto:
      r.length === 1
        ? `Achei um lugar que combina: ${r[0]!.nome}.`
        : `Achei ${r.length} lugares que combinam. Os horários abaixo são os livres agora.`,
    restaurantes: ordenar(r, "nota").slice(0, 3),
  };
}

// ---------------------------------------------------------------- salão do Guest Manager

/** Estados da mesa, os mesmos do Tipe Restaurant (uma mesa só, sem cópia). */
export type EstadoMesa = "livre" | "reservada" | "ocupada" | "fechando" | "limpeza" | "bloqueada";

export const ESTADO_MESA_LABEL: Record<EstadoMesa, string> = {
  livre: "Livre",
  reservada: "Reservada",
  ocupada: "Ocupada",
  fechando: "Fechando conta",
  limpeza: "Em limpeza",
  bloqueada: "Bloqueada",
};

export type Alocacao = { reservaId: string; mesaId: string; inicio: Date; fim: Date };

/**
 * Pode colocar esta reserva nesta mesa? Mesma regra do banco (EXCLUDE por mesa e faixa):
 * mesa precisa caber o grupo, não pode estar bloqueada, e não pode ter outra alocação sobreposta.
 */
export function podeAlocar(args: {
  mesa: { id: string; seatsMin: number | null; seatsMax: number; estado: EstadoMesa };
  pessoas: number;
  inicio: Date;
  fim: Date;
  alocacoes: Alocacao[];
  reservaId: string;
}): { ok: true } | { ok: false; motivo: string } {
  const { mesa, pessoas, inicio, fim } = args;
  if (mesa.estado === "bloqueada") return { ok: false, motivo: "Mesa bloqueada" };
  if (pessoas > mesa.seatsMax) return { ok: false, motivo: `Cabe até ${mesa.seatsMax} pessoas` };
  if (mesa.seatsMin && pessoas < mesa.seatsMin)
    return { ok: false, motivo: `Mesa para no mínimo ${mesa.seatsMin}` };
  const choque = args.alocacoes.find(
    (a) =>
      a.mesaId === mesa.id && a.reservaId !== args.reservaId && a.inicio < fim && inicio < a.fim,
  );
  if (choque) return { ok: false, motivo: "Já tem reserva nesse horário" };
  return { ok: true };
}
