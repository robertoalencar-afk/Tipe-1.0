/**
 * Prospecção ativa de restaurantes (máquina de leads da Central > Comercial).
 *
 * Fonte padrão: OpenStreetMap via Overpass (dados abertos, licença ODbL, sem custo e
 * sem raspar o Google Maps). Só dados públicos de empresa: nome, endereço, telefone,
 * site, Instagram, horário e tipo. Nenhuma mensagem sai sozinha: a cadência prepara
 * o texto e a pessoa do comercial envia e registra o toque.
 *
 * LGPD: base legal = legítimo interesse (art. 7º, IX) para contato B2B; toda mensagem
 * traz a saída ("responda SAIR"), o opt-out é respeitado em qualquer nova coleta e
 * prospects descartados sem resposta saem da base após 12 meses (docs/comercial/PROSPECCAO.md).
 *
 * Sem dependências: usado pelo servidor, pela tela e pelo coletor (scripts/prospeccao).
 */

export const CATEGORIAS = {
  restaurant: "Restaurante",
  bar: "Bar",
  pub: "Pub",
  biergarten: "Cervejaria",
  cafe: "Café",
  fast_food: "Lanchonete",
  ice_cream: "Sorveteria",
  food_court: "Praça de alimentação",
} as const;
export type Categoria = keyof typeof CATEGORIAS;
export const ehCategoria = (v: unknown): v is Categoria => typeof v === "string" && v in CATEGORIAS;

export const STATUS_PROSPECT = {
  novo: "Novo",
  em_contato: "Em cadência",
  respondeu: "Respondeu",
  convertido: "Virou lead",
  descartado: "Descartado",
  opt_out: "Não contatar",
} as const;
export type StatusProspect = keyof typeof STATUS_PROSPECT;

export type Prospect = {
  source: "osm" | "google_places" | "manual";
  source_ref: string;
  name: string;
  category: Categoria;
  cuisine: string | null;
  brand: string | null;
  street: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string;
  state: string;
  postcode: string | null;
  lat: number | null;
  lon: number | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  instagram: string | null;
  email: string | null;
  opening_hours: string | null;
  rating: number | null;
  reviews_count: number | null;
  score: number;
  score_reasons: string[];
};

// ---------------- Normalização ----------------

const limpa = (v: unknown, max = 200) => {
  if (typeof v !== "string") return null;
  const t = v.replace(/\s+/g, " ").trim();
  return t ? t.slice(0, max) : null;
};

/** Telefone brasileiro em E.164 sem "+" (55 + DDD + número). Aceita o primeiro de "a; b". */
export function foneBR(v: unknown, dddPadrao = "85"): string | null {
  if (typeof v !== "string") return null;
  const primeiro = v.split(/[;,/]| ou /)[0] ?? "";
  let d = primeiro.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("0055")) d = d.slice(4);
  else if (d.startsWith("55") && d.length >= 12) d = d.slice(2);
  if (d.startsWith("0")) d = d.replace(/^0(\d{2})?/, ""); // 0 + operadora
  if (d.length === 8 || d.length === 9) d = dddPadrao + d;
  if (d.length !== 10 && d.length !== 11) return null;
  if (d.length === 11 && d[2] !== "9") return null;
  return `55${d}`;
}

/** Celular (pode ter WhatsApp): 55 + DDD + 9 dígitos começando em 9. */
export const ehCelular = (e164: string | null) => !!e164 && e164.length === 13 && e164[4] === "9";

export function foneLegivel(e164: string | null) {
  if (!e164) return "";
  const d = e164.slice(2);
  return d.length === 11
    ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
    : `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`;
}

function instagramDe(tags: Record<string, string>): string | null {
  const bruto =
    tags["contact:instagram"] ??
    tags["instagram"] ??
    (/instagram\.com/i.test(tags["website"] ?? "") ? tags["website"] : undefined);
  if (!bruto) return null;
  const m = bruto.match(/instagram\.com\/([A-Za-z0-9._]{1,30})/i);
  const user = (m?.[1] ?? bruto.replace(/^@/, "")).trim();
  return /^[A-Za-z0-9._]{1,30}$/.test(user) ? user.toLowerCase() : null;
}

function siteDe(tags: Record<string, string>): string | null {
  const s = limpa(tags["website"] ?? tags["contact:website"] ?? tags["url"], 300);
  if (!s || /instagram\.com|facebook\.com|wa\.me|whatsapp/i.test(s)) return null;
  const url = /^https?:\/\//i.test(s) ? s : `https://${s}`;
  try {
    const u = new URL(url);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

export type ElementoOsm = {
  type: "node" | "way" | "relation";
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
};

/** Converte um elemento do Overpass em prospect (sem score). Devolve null se não serve. */
export function deOsm(
  e: ElementoOsm,
  cidade: string,
  uf: string,
  dddPadrao = "85",
): Omit<Prospect, "score" | "score_reasons"> | null {
  const t = e.tags ?? {};
  const name = limpa(t["name"], 120);
  const category = t["amenity"];
  if (!name || !ehCategoria(category)) return null;
  if (t["disused"] === "yes" || t["disused:amenity"] || t["was:amenity"]) return null;
  const lat = e.lat ?? e.center?.lat ?? null;
  const lon = e.lon ?? e.center?.lon ?? null;
  const phone = foneBR(
    t["phone"] ?? t["contact:phone"] ?? t["contact:mobile"] ?? t["mobile"],
    dddPadrao,
  );
  // WhatsApp só em celular: número fixo marcado como WhatsApp no OSM fica só como telefone.
  const whatsapp =
    [foneBR(t["contact:whatsapp"] ?? t["whatsapp"], dddPadrao), phone].find(ehCelular) ?? null;
  const email = limpa(t["email"] ?? t["contact:email"], 120);
  return {
    source: "osm",
    source_ref: `${e.type}/${e.id}`,
    name,
    category,
    cuisine: limpa(t["cuisine"], 120),
    brand: limpa(t["brand"], 80),
    street: limpa(t["addr:street"], 120),
    number: limpa(t["addr:housenumber"], 20),
    neighborhood: limpa(t["addr:suburb"] ?? t["addr:neighbourhood"] ?? t["addr:district"], 80),
    city: limpa(t["addr:city"], 80) ?? cidade,
    state: (limpa(t["addr:state"], 2) ?? uf).toUpperCase().slice(0, 2),
    postcode: limpa(t["addr:postcode"], 12),
    lat: lat == null ? null : Math.round(lat * 1e6) / 1e6,
    lon: lon == null ? null : Math.round(lon * 1e6) / 1e6,
    phone,
    whatsapp,
    website: siteDe(t),
    instagram: instagramDe(t),
    email: email && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) ? email.toLowerCase() : null,
    opening_hours: limpa(t["opening_hours"], 200),
    rating: null,
    reviews_count: null,
  };
}

// ---------------- Score ----------------

/** Polos gastronômicos por cidade (centro + raio em km). Bairro do OSM vem vazio com frequência. */
export const POLOS: Record<string, { nome: string; lat: number; lon: number; km: number }[]> = {
  fortaleza: [
    { nome: "Varjota/Meireles/Mucuripe", lat: -3.7305, lon: -38.4905, km: 1.8 },
    { nome: "Aldeota", lat: -3.7395, lon: -38.5035, km: 1.5 },
    { nome: "Praia de Iracema", lat: -3.7215, lon: -38.5165, km: 1.0 },
    { nome: "Cocó/Dionísio Torres", lat: -3.7535, lon: -38.4935, km: 1.6 },
    { nome: "Papicu/Praia do Futuro", lat: -3.744, lon: -38.461, km: 2.0 },
  ],
};
const BAIRROS_FORTES =
  /meireles|aldeota|varjota|mucuripe|iracema|coc[oó]|dion[ií]sio|papicu|praia do futuro|guararapes|f[aá]tima|cambeba|edson queiroz/i;

function km(aLat: number, aLon: number, bLat: number, bLon: number) {
  const r = (x: number) => (x * Math.PI) / 180;
  const dLat = r(bLat - aLat);
  const dLon = r(bLon - aLon);
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(r(aLat)) * Math.cos(r(bLat)) * Math.sin(dLon / 2) ** 2;
  return 12742 * Math.asin(Math.sqrt(h));
}

const semAcento = (s: string) =>
  s
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();

export function poloDe(p: Pick<Prospect, "city" | "lat" | "lon" | "neighborhood">): string | null {
  const polos = POLOS[semAcento(p.city)] ?? [];
  if (p.lat != null && p.lon != null) {
    const hit = polos.find((x) => km(p.lat!, p.lon!, x.lat, x.lon) <= x.km);
    if (hit) return hit.nome;
  }
  return p.neighborhood && BAIRROS_FORTES.test(p.neighborhood) ? p.neighborhood : null;
}

const PESO_CATEGORIA: Record<Categoria, number> = {
  restaurant: 30,
  bar: 26,
  pub: 26,
  biergarten: 26,
  cafe: 14,
  fast_food: 8,
  ice_cream: 4,
  food_court: 4,
};
const COZINHA_MESA =
  /seafood|japanese|sushi|italian|pizza|steak|churrasc|regional|brazilian|nordest|frutos|peixe|mediterr|french|arab|portug|spanish|peruvian|thai|fine/i;

/** Fecha tarde (atende jantar)? Lê padrões comuns de opening_hours (18:00-23:00, 24/7). */
export function atendeNoite(oh: string | null) {
  if (!oh) return false;
  if (/24\/7/.test(oh)) return true;
  return [...oh.matchAll(/(\d{1,2}):\d{2}\s*-\s*(\d{1,2}):\d{2}/g)].some((m) => {
    const ini = Number(m[1]);
    const fim = Number(m[2]);
    return fim >= 21 || fim <= 4 || (ini >= 17 && fim > ini);
  });
}

/**
 * Prioridade 0 a 100 para a Tipe (pagamento na mesa + operação de salão):
 * serviço à mesa, como contatar, presença digital, polo gastronômico e jantar.
 * Rede/franquia perde pontos: a decisão é da matriz, ciclo longo.
 */
export function pontuar(p: Omit<Prospect, "score" | "score_reasons">): {
  score: number;
  reasons: string[];
} {
  const r: [number, string][] = [];
  r.push([
    PESO_CATEGORIA[p.category],
    `${CATEGORIAS[p.category]} (serviço à mesa ${PESO_CATEGORIA[p.category] >= 20 ? "provável" : "improvável"})`,
  ]);
  if (p.whatsapp) r.push([20, "Celular/WhatsApp público"]);
  else if (p.phone) r.push([12, "Telefone fixo público"]);
  if (p.instagram) r.push([8, "Instagram ativo"]);
  if (p.website) r.push([6, "Site próprio"]);
  if (p.email) r.push([3, "E-mail público"]);
  const polo = poloDe(p);
  if (polo) r.push([15, `Polo gastronômico: ${polo}`]);
  if (atendeNoite(p.opening_hours)) r.push([8, "Atende à noite (ticket e giro maiores)"]);
  else if (p.opening_hours) r.push([3, "Horário publicado"]);
  if (p.cuisine && COZINHA_MESA.test(p.cuisine)) r.push([6, "Cozinha de salão"]);
  if (p.rating != null && p.rating >= 4.3) r.push([5, `Nota ${p.rating.toFixed(1)}`]);
  if (p.reviews_count != null && p.reviews_count >= 300)
    r.push([5, `${p.reviews_count} avaliações (movimento alto)`]);
  if (p.brand) r.push([-12, `Rede/franquia (${p.brand}): decisão centralizada`]);
  if (!p.phone && !p.whatsapp && !p.instagram && !p.email)
    r.push([-15, "Sem canal de contato público"]);
  const score = Math.max(
    0,
    Math.min(
      100,
      r.reduce((s, [n]) => s + n, 0),
    ),
  );
  return { score, reasons: r.map(([n, t]) => `${n > 0 ? "+" : ""}${n} ${t}`) };
}

export const faixa = (score: number): "A" | "B" | "C" =>
  score >= 65 ? "A" : score >= 45 ? "B" : "C";

export function comScore(p: Omit<Prospect, "score" | "score_reasons">): Prospect {
  const { score, reasons } = pontuar(p);
  return { ...p, score, score_reasons: reasons };
}

/** Normaliza, pontua e remove duplicados (mesmo telefone ou mesmo nome no mesmo endereço). */
export function processarOsm(
  elementos: ElementoOsm[],
  cidade: string,
  uf: string,
  dddPadrao = "85",
): Prospect[] {
  const vistos = new Map<string, Prospect>();
  const fora = new Set<Prospect>();
  for (const e of elementos) {
    const base = deOsm(e, cidade, uf, dddPadrao);
    if (!base) continue;
    const p = comScore(base);
    const chaves = [
      p.whatsapp ?? p.phone,
      `${semAcento(p.name)}|${p.lat?.toFixed(3)}|${p.lon?.toFixed(3)}`,
    ].filter(Boolean) as string[];
    const dup = chaves.map((k) => vistos.get(k)).find(Boolean);
    if (dup && dup.score >= p.score) continue;
    if (dup) fora.add(dup);
    for (const k of chaves) vistos.set(k, p);
  }
  return [...new Set(vistos.values())]
    .filter((p) => !fora.has(p))
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name));
}

/** Consulta Overpass: estabelecimentos de comida com nome dentro do município. */
export function consultaOverpass(cidade: string, uf: string) {
  const c = cidade.replace(/["\\]/g, "");
  const u = uf.replace(/[^A-Za-z]/g, "").toUpperCase();
  return `[out:json][timeout:180];
area["ISO3166-2"="BR-${u}"]->.uf;
area["name"="${c}"]["admin_level"="8"](area.uf)->.a;
nwr(area.a)["amenity"~"^(${Object.keys(CATEGORIAS).join("|")})$"]["name"];
out center tags;`;
}

// ---------------- Cadência ----------------

export type Canal = "whatsapp" | "ligacao" | "instagram" | "email" | "visita";
export const CANAIS: Record<Canal, string> = {
  whatsapp: "WhatsApp",
  ligacao: "Ligação",
  instagram: "Instagram (DM)",
  email: "E-mail",
  visita: "Visita",
};

/** 5 toques em 14 dias. `dia` conta a partir do primeiro toque. */
export const CADENCIA: { passo: number; dia: number; canal: Canal; objetivo: string }[] = [
  {
    passo: 1,
    dia: 0,
    canal: "whatsapp",
    objetivo: "Apresentar a Tipe e pedir 15 min com o dono ou gerente",
  },
  {
    passo: 2,
    dia: 2,
    canal: "ligacao",
    objetivo: "Achar o decisor e confirmar se usam maquininha na mesa",
  },
  {
    passo: 3,
    dia: 5,
    canal: "instagram",
    objetivo: "Mostrar o simulador da conta na mesa (tipe.digital/simulador)",
  },
  {
    passo: 4,
    dia: 9,
    canal: "whatsapp",
    objetivo: "Prova: giro de mesa e gorjeta do garçom; convidar para demonstração",
  },
  {
    passo: 5,
    dia: 14,
    canal: "visita",
    objetivo: "Último toque: visita no fim da tarde ou mensagem de encerramento",
  },
];

/** Canal possível para o passo: se não há telefone, cai para Instagram/e-mail/visita. */
export function canalDoPasso(
  passo: number,
  p: Pick<Prospect, "phone" | "whatsapp" | "instagram" | "email">,
): Canal {
  const plano = CADENCIA.find((c) => c.passo === passo)?.canal ?? "visita";
  const tem: Record<Canal, boolean> = {
    whatsapp: !!p.whatsapp,
    ligacao: !!(p.phone || p.whatsapp),
    instagram: !!p.instagram,
    email: !!p.email,
    visita: true,
  };
  if (tem[plano]) return plano;
  return (["whatsapp", "ligacao", "instagram", "email", "visita"] as Canal[]).find((c) => tem[c])!;
}

export const RESULTADOS = {
  sem_resposta: "Sem resposta",
  respondeu: "Respondeu",
  interessado: "Interessado (virar lead)",
  sem_interesse: "Sem interesse",
  numero_invalido: "Contato inválido",
  opt_out: "Pediu para não receber",
} as const;
export type Resultado = keyof typeof RESULTADOS;

/** Depois de registrar o toque `passo` com `resultado`: novo status e próximo toque. */
export function aposToque(
  passo: number,
  resultado: Resultado,
  agora: Date,
): { status: StatusProspect; cadence_step: number; next_touch_at: string | null } {
  const ini = CADENCIA.find((c) => c.passo === passo);
  if (resultado === "opt_out")
    return { status: "opt_out", cadence_step: passo, next_touch_at: null };
  if (resultado === "sem_interesse")
    return { status: "descartado", cadence_step: passo, next_touch_at: null };
  if (resultado === "respondeu" || resultado === "interessado") {
    return {
      status: "respondeu",
      cadence_step: passo,
      next_touch_at: new Date(agora.getTime() + 864e5).toISOString(),
    };
  }
  const prox = CADENCIA.find((c) => c.passo === passo + 1);
  if (!prox || !ini) return { status: "descartado", cadence_step: passo, next_touch_at: null };
  // Contato inválido num canal não encerra: segue a cadência pelos outros canais.
  return {
    status: "em_contato",
    cadence_step: passo,
    next_touch_at: new Date(agora.getTime() + (prox.dia - ini.dia) * 864e5).toISOString(),
  };
}

const primeiroNome = (s: string) => s.split(/\s+/)[0] ?? s;
const SAIDA = "Se preferir não receber mensagens da Tipe, é só responder SAIR.";

/** Rascunho do toque. A pessoa revisa e envia; nada sai automaticamente. */
export function mensagem(
  passo: number,
  p: Pick<Prospect, "name" | "category" | "neighborhood">,
  remetente = "Roberto",
): string {
  const nome = p.name;
  const quem = primeiroNome(remetente);
  switch (passo) {
    case 1:
      return `Olá, equipe do ${nome}! Aqui é ${quem}, da Tipe, de Fortaleza. Ajudamos restaurantes a receber a conta pelo QR Code na mesa: o cliente divide, paga por Pix e deixa gorjeta para o garçom, sem esperar a maquininha. Posso falar 15 minutos com quem cuida do salão? ${SAIDA}`;
    case 2:
      return `Roteiro da ligação: "Oi, aqui é ${quem}, da Tipe. Quem decide sobre pagamento e atendimento no ${nome}?" Perguntas: quantas mesas, se a conta trava no fim do jantar, qual maquininha e PDV usam. Fechar com convite para demonstração de 15 minutos.`;
    case 3:
      return `Oi, ${nome}! Fiz um simulador de como fica a conta na mesa com a Tipe: tipe.digital/simulador. O cliente escaneia, escolhe os itens dele e paga em segundos. Vale 2 minutos para ver. ${SAIDA}`;
    case 4:
      return `${nome}, uma última ideia: quando o cliente paga sozinho pelo celular, a mesa libera mais rápido e a gorjeta vai direto para o garçom. Topa uma demonstração de 15 minutos esta semana, aí no restaurante ou por vídeo? ${SAIDA}`;
    default:
      return `Pessoal do ${nome}, não quero insistir. Se em algum momento fizer sentido agilizar a conta na mesa, a Tipe está por aqui: tipe.digital. Agradecemos a atenção!`;
  }
}

export const linkWhatsapp = (e164: string, texto: string) =>
  `https://wa.me/${e164}?text=${encodeURIComponent(texto)}`;

// ---------------- Fila do dia ----------------

export type ProspectFila = {
  id: string;
  status: StatusProspect;
  score: number;
  next_touch_at: string | null;
};

/**
 * Fila do dia: primeiro quem respondeu, depois os toques vencidos da cadência,
 * depois os melhores novos até `novosPorDia` (ritmo sustentável de entrada).
 */
export function filaDoDia<T extends ProspectFila>(lista: T[], agora: Date, novosPorDia = 20): T[] {
  const fimDoDia = new Date(agora);
  fimDoDia.setHours(23, 59, 59, 999);
  const vence = (x: T) => !!x.next_touch_at && new Date(x.next_touch_at) <= fimDoDia;
  const respondeu = lista.filter((x) => x.status === "respondeu" && vence(x));
  const devidos = lista
    .filter((x) => x.status === "em_contato" && vence(x))
    .sort((a, b) => String(a.next_touch_at).localeCompare(String(b.next_touch_at)));
  const novos = lista
    .filter((x) => x.status === "novo")
    .sort((a, b) => b.score - a.score)
    .slice(0, novosPorDia);
  return [...respondeu, ...devidos, ...novos];
}
