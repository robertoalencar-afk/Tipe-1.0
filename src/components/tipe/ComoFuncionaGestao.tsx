import {
  ArrowRight,
  Brain,
  ChefHat,
  ImageIcon,
  PencilLine,
  PlusCircle,
  QrCode,
  ShieldCheck,
  UsersRound,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { openLebre } from "@/lib/tipe/mascot-preference";

const PASSOS = [
  {
    k: "cardapio",
    i: ImageIcon,
    t: "Monte o cardápio",
    d: "Cadastre pratos, preços e categorias. Use o Banco de imagens para dar uma foto a cada prato.",
    b: "Abrir cardápio",
  },
  {
    k: "qr",
    i: QrCode,
    t: "Imprima os QR Codes das mesas",
    d: "Cada mesa tem um QR Code. O cliente aponta o celular e acompanha a conta sem baixar nada.",
    b: "Ver mesas e QR",
  },
  {
    k: "equipe",
    i: UsersRound,
    t: "Convide a equipe",
    d: "Dê a cada pessoa a função certa: gerente, caixa ou garçom. Cada função só vê o que precisa.",
    b: "Abrir equipe",
  },
  {
    k: "pdv",
    i: ChefHat,
    t: "Lance pedidos e acompanhe a cozinha",
    d: "O garçom lança na mesa, a cozinha recebe por setor e o cliente vê os itens na hora no celular.",
    b: "Lançar pedido",
  },
  {
    k: "caixa",
    i: Wallet,
    t: "Receba e feche o caixa",
    d: "O cliente divide por itens e paga. Você confirma o que for no balcão e fecha o dia com os números conferidos.",
    b: "Abrir caixa",
  },
] as const;

/** O que a Lebre faz no painel. Cada exemplo abre a Lebre já com a frase escrita. */
const HABILIDADES = [
  {
    k: "incluir",
    i: PlusCircle,
    t: "Incluir",
    d: "Abre mesas, lança pedidos e cadastra mesas e garçons. Você fala do seu jeito e ela prepara tudo.",
    ex: [
      "Abrir a mesa 5",
      "Lança 2 chopp e 1 picanha na mesa 4",
      "Cadastrar a mesa 12",
      "Cadastrar o garçom João",
    ],
  },
  {
    k: "modificar",
    i: PencilLine,
    t: "Modificar",
    d: "Muda preços, pausa o que acabou, volta itens ao cardápio, ativa ou desativa o QR de uma mesa e fecha contas.",
    ex: [
      "Muda o preço da picanha para 89,90",
      "Acabou o chopp",
      "Voltar a caipirinha ao cardápio",
      "Fechar e liberar a mesa 3",
    ],
  },
  {
    k: "aprender",
    i: Brain,
    t: "Aprender",
    d: "Guarda o jeito da casa e o seu: apelidos de pratos, mesas da varanda, como você gosta das respostas. Lembra nas próximas conversas.",
    ex: [
      "Lembre que a mesa 10 é da varanda",
      "Lembre de mim que prefiro respostas curtas",
      "O que você lembra?",
      "Esqueça que a mesa 10 é da varanda",
    ],
  },
] as const;

function HabilidadesLebre() {
  return (
    <section className="space-y-4" aria-labelledby="habilidades-lebre">
      <div className="space-y-1">
        <h2 id="habilidades-lebre" className="font-display text-xl font-semibold">
          O que a Lebre faz por você
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          Escreva ou fale com a Lebre, no canto da tela. Toque num exemplo para ela abrir com a
          frase pronta.
        </p>
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {HABILIDADES.map((h) => (
          <div key={h.k} className="surface-card flex min-w-0 flex-col gap-3 p-4 sm:p-5">
            <div className="flex items-center gap-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                <h.i className="size-5" aria-hidden />
              </span>
              <h3 className="font-display text-lg font-semibold">{h.t}</h3>
            </div>
            <p className="text-sm text-muted-foreground">{h.d}</p>
            <ul className="flex flex-wrap gap-2">
              {h.ex.map((e) => (
                <li key={e}>
                  <button
                    type="button"
                    onClick={() => openLebre(e)}
                    className="rounded-full border border-border px-3 py-1.5 text-left text-sm hover:border-primary hover:bg-brand-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  >
                    “{e}”
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/40 p-4 text-sm">
        <ShieldCheck className="mt-0.5 size-5 shrink-0 text-brand-strong" aria-hidden />
        <div className="space-y-1">
          <p>
            <strong className="font-semibold">Nada muda sem você confirmar.</strong> A Lebre mostra
            um cartão com o que vai fazer e só executa depois do seu toque. Garçom e caixa abrem
            mesas e lançam pedidos; preços, cadastros e cardápio ficam com o dono.
          </p>
          <p className="text-muted-foreground">
            Ela nunca guarda CPF, cartão, senha, telefone, e-mail, endereço, saúde ou salário, nem
            chaves de integração. Para tirar algo da memória, diga “esqueça...”.
          </p>
        </div>
      </div>
    </section>
  );
}

/** Passo a passo do Tipe Gestão, com atalho para cada tela. */
export function ComoFuncionaGestao({ ir }: { ir: (k: string) => void }) {
  return (
    <div className="space-y-8">
      <div className="space-y-4">
        <p className="max-w-2xl text-sm text-muted-foreground">
          Do cardápio ao fechamento do caixa, em cinco passos. Toque em cada um para ir direto à
          tela.
        </p>
        <ol className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {PASSOS.map((p, n) => (
            <li key={p.k} className="surface-card flex min-w-0 flex-col gap-3 p-4 sm:p-5">
              <div className="flex items-center gap-3">
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-brand-soft text-brand-strong">
                  <p.i className="size-5" aria-hidden />
                </span>
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Passo {n + 1}
                </span>
              </div>
              <h3 className="font-display text-lg font-semibold leading-snug">{p.t}</h3>
              <p className="flex-1 text-sm text-muted-foreground">{p.d}</p>
              <Button variant="outline" size="sm" className="w-fit" onClick={() => ir(p.k)}>
                {p.b}
                <ArrowRight className="ml-1.5 size-4" />
              </Button>
            </li>
          ))}
        </ol>
      </div>
      <HabilidadesLebre />
    </div>
  );
}
