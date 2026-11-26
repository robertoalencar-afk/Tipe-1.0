/**
 * Tipe Gestão → Configurações → Atendimento: visão das modalidades do Tipe Order, o que está
 * habilitado para este restaurante e o que ainda não pode ser ligado. Os interruptores reais
 * (pedido pela mesa e totem) continuam em Configurações; aqui só se vê o estado e se vai até
 * lá. Modalidade incompleta nunca aparece com botão de ligar: a validação é do servidor
 * (módulo contratado) e a lista vem de DEFINICOES, auditada no código.
 */
import { Carregando } from "@/components/tipe/Carregando";
import { ArrowRight, Nfc, MonitorSmartphone } from "lucide-react";
import { cn } from "@/lib/utils";
import { useOps } from "@/components/tipe/AdminSections";
import { useOrderAccess } from "@/components/tipe/LiberarPedidosMesa";
import { DEFINICOES, ORDEM_SELETOR, TEXTO_DISPONIBILIDADE, type Modalidade } from "@/lib/tipe/order/modalidades";

const Card = ({ children, className = "" }: { children: React.ReactNode; className?: string }) => (
  <div className={cn("surface-card p-4 sm:p-5", className)}>{children}</div>
);

type Estado = { rotulo: string; tom: "on" | "off" | "wait" };

export function Atendimento({ slug, podeDono, irParaConfig }: { slug: string; podeDono: boolean; irParaConfig: () => void }) {
  const ops = useOps(slug);
  const acesso = useOrderAccess(slug);
  const r = ops.data?.restaurant;
  if (!r) return <Carregando tamanho="sm" texto="Carregando" />;

  const orderOn = !!acesso.data?.orderActive;
  const estadoDe = (m: Modalidade): Estado => {
    if (m === "mesas") return orderOn && r.self_order_enabled ? { rotulo: "Ligada", tom: "on" } : orderOn ? { rotulo: "Contratada, desligada", tom: "off" } : { rotulo: "Não contratada", tom: "off" };
    if (m === "totem") return r.totem_enabled ? { rotulo: "Ligada (em desenvolvimento)", tom: "on" } : { rotulo: "Desligada", tom: "off" };
    if (m === "balcao" || m === "retirada") return { rotulo: "Venda de balcão no Caixa", tom: "wait" };
    return { rotulo: "Ainda não disponível", tom: "wait" };
  };

  return (
    <div className="max-w-3xl space-y-4">
      <Card className="space-y-1">
        <h3 className="font-display font-bold">Atendimento</h3>
        <p className="text-sm text-muted-foreground">
          Formatos em que o seu cardápio recebe pedidos. O cardápio, a cozinha e a conta são os mesmos para todos. Só dá para ligar o que está pronto e contratado.
        </p>
      </Card>

      <ul className="space-y-2">
        {ORDEM_SELETOR.map((m) => {
          const d = DEFINICOES[m];
          const e = estadoDe(m);
          return (
            <li key={m} className="surface-card flex flex-wrap items-start justify-between gap-3 p-4">
              <div className="min-w-0">
                <p className="font-medium">{d.nome}</p>
                <p className="mt-0.5 text-sm text-muted-foreground">{d.resumo}</p>
                <p className="mt-1 text-xs text-muted-foreground">Estado do produto: {TEXTO_DISPONIBILIDADE[d.disponibilidade].selo}</p>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-1 text-xs font-medium",
                  e.tom === "on" && "bg-[#e6faf8] text-[#03665f]",
                  e.tom === "off" && "bg-background-muted text-muted-foreground",
                  e.tom === "wait" && "bg-amber-50 text-amber-800",
                )}
              >
                {e.rotulo}
              </span>
            </li>
          );
        })}
      </ul>

      <Card className="space-y-2">
        <p className="text-sm">
          {podeDono
            ? "Pedido pela mesa e totem são ligados em Configurações. O servidor só aceita se o módulo estiver contratado."
            : "Só o responsável pelo restaurante liga ou desliga modalidades. Gerente, caixa e garçom usam o que está ligado."}
        </p>
        <button type="button" onClick={irParaConfig} className="inline-flex min-h-10 items-center gap-2 rounded-full border border-border px-4 text-sm font-medium hover:border-foreground/40">
          Abrir Configurações <ArrowRight className="h-4 w-4" aria-hidden />
        </button>
      </Card>

      <Card className="space-y-2">
        <h3 className="flex items-center gap-2 font-display font-bold"><MonitorSmartphone className="h-4 w-4" aria-hidden /> Totens</h3>
        <p className="text-sm text-muted-foreground">
          Hoje o totem usa um link com chave do restaurante e o pedido espera o caixa cobrar. Cadastro de dispositivos (registrar cada totem, renovar ou revogar a credencial, limpar sessão e reiniciar sozinho) está desenhado em docs/tipe-order/TOTEM-DISPOSITIVOS.md e ainda não foi construído.
        </p>
      </Card>

      <Card className="space-y-2">
        <h3 className="flex items-center gap-2 font-display font-bold"><Nfc className="h-4 w-4" aria-hidden /> Pulseiras</h3>
        <p className="text-sm text-muted-foreground">
          Planejado. A Tipe entrega pulseiras NFC já gravadas e numeradas; aqui você vai ativar, vincular a uma comanda, bloquear e reutilizar, sem gravar nada. O mapa e o Localizar cliente (Tipe Localiza) dependem de consentimento do cliente. Veja docs/tipe-order/PULSEIRA.md.
        </p>
      </Card>
    </div>
  );
}
