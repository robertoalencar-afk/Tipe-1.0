// Rota da Lebre: a tecnologia própria da Tipe que escolhe o modelo de IA certo para cada pergunta.
// Mesma ideia de um roteador multi-provedor (como o OmniRoute), escrita do zero para rodar dentro
// do Worker, sem servidor extra: classifica a tarefa, monta a fila de modelos grátis, pula quem
// está fora do ar (disjuntor) e dá a cada tentativa um tempo limite. Funções puras e testáveis.

export type Tarefa = "rapida" | "esperta" | "visao";
export type Provedor = "cloudflare" | "groq" | "openrouter" | "claude";
export type Candidato = { provedor: Provedor; modelo: string; timeoutMs: number };

const env = (k: string) => (typeof process !== "undefined" ? process.env[k] : undefined);

/** Modelos de cada provedor. Todos têm cota grátis; trocar por env sem mexer no código. */
export const MODELOS = {
  cloudflare: () => env("CLOUDFLARE_AI_MODEL") || "@cf/meta/llama-4-scout-17b-16e-instruct",
  groqRapido: () => env("GROQ_FAST_MODEL") || "llama-3.1-8b-instant",
  groqEsperto: () => env("GROQ_SMART_MODEL") || "llama-3.3-70b-versatile",
  groqVisao: () =>
    env("GROQ_VISION_MODEL") || env("GROQ_MODEL") || "meta-llama/llama-4-scout-17b-16e-instruct",
  openrouter: () => env("OPENROUTER_MODEL") || "meta-llama/llama-3.3-70b-instruct:free",
  claude: () => "claude",
};

/** Decide o tipo de tarefa: imagem pede visão; pergunta curta com resposta curta vai no modelo rápido. */
export function classificarTarefa(opts: {
  hasImage: boolean;
  question: string;
  maxTokens: number;
  tarefa?: Tarefa | undefined;
}): Tarefa {
  if (opts.hasImage) return "visao";
  if (opts.tarefa) return opts.tarefa;
  return opts.maxTokens <= 300 && opts.question.length <= 400 ? "rapida" : "esperta";
}

/** Fila de modelos para a tarefa, do melhor para o reserva. Cada modelo do Groq tem cota própria,
 * então trocar de modelo no mesmo provedor também é fallback de verdade. */
export function rotaPara(tarefa: Tarefa): Candidato[] {
  const c = (provedor: Provedor, modelo: string, timeoutMs: number): Candidato => ({
    provedor,
    modelo,
    timeoutMs,
  });
  if (tarefa === "visao")
    return [
      c("cloudflare", MODELOS.cloudflare(), 30_000),
      c("groq", MODELOS.groqVisao(), 30_000),
      c("claude", MODELOS.claude(), 40_000),
    ];
  if (tarefa === "rapida")
    return [
      c("groq", MODELOS.groqRapido(), 8_000),
      c("cloudflare", MODELOS.cloudflare(), 12_000),
      c("groq", MODELOS.groqVisao(), 12_000),
      c("openrouter", MODELOS.openrouter(), 15_000),
      c("claude", MODELOS.claude(), 25_000),
    ];
  return [
    c("cloudflare", MODELOS.cloudflare(), 25_000),
    c("groq", MODELOS.groqEsperto(), 25_000),
    c("groq", MODELOS.groqVisao(), 25_000),
    c("openrouter", MODELOS.openrouter(), 30_000),
    c("claude", MODELOS.claude(), 40_000),
  ];
}

/** Disjuntor por modelo: quem falhou descansa um pouco e a fila segue para o próximo, sem esperar. */
export class Disjuntor {
  private aberto = new Map<string, number>();
  private falhas = new Map<string, number>();
  constructor(private agora: () => number = Date.now) {}

  private chave(c: Candidato) {
    return `${c.provedor}:${c.modelo}`;
  }

  disponivel(c: Candidato): boolean {
    const ate = this.aberto.get(this.chave(c));
    return !ate || ate <= this.agora();
  }

  /** Limite de uso (429) respeita o Retry-After (até 10 min). Erro comum abre por 20 s, 60 s, 120 s... */
  falhou(c: Candidato, status?: number, retryAfterS?: number): void {
    const k = this.chave(c);
    const n = (this.falhas.get(k) ?? 0) + 1;
    this.falhas.set(k, n);
    const ms =
      status === 429
        ? Math.min(Math.max(retryAfterS ?? 60, 5), 600) * 1000
        : Math.min(20_000 * 2 ** (n - 1), 300_000);
    this.aberto.set(k, this.agora() + ms);
  }

  funcionou(c: Candidato): void {
    const k = this.chave(c);
    this.falhas.delete(k);
    this.aberto.delete(k);
  }

  limpar(): void {
    this.aberto.clear();
    this.falhas.clear();
  }

  estado(): Array<{ modelo: string; descansaAte: number }> {
    const t = this.agora();
    return [...this.aberto]
      .filter(([, ate]) => ate > t)
      .map(([modelo, descansaAte]) => ({ modelo, descansaAte }));
  }
}

/** Um disjuntor por isolate do Worker: vale para todas as perguntas que caem nele. */
export const disjuntor = new Disjuntor();

/** Lê o Retry-After (segundos ou data HTTP). */
export function lerRetryAfter(valor: string | null, agora = Date.now()): number | undefined {
  if (!valor) return undefined;
  const s = Number(valor);
  if (Number.isFinite(s)) return s;
  const d = Date.parse(valor);
  return Number.isFinite(d) ? Math.max(0, Math.round((d - agora) / 1000)) : undefined;
}
