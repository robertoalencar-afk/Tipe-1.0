// Gestão → Integrações: o dono liga o próprio PDV pela API TIPE.
// Entrada (PDV → Tipe): itens e mesas por webhook assinado.
// Saída (Tipe → PDV): aviso de pagamento aprovado na URL cadastrada, ou consulta por GET.
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { BookOpen, Copy, KeyRound, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { configurarApiTipe, testPdvConnection } from "@/lib/tipe/pdv-integrations.functions";

type Props = {
  slug: string;
  ativo: boolean;
  /** Restaurante usa um conector configurado pela equipe Tipe (não é API TIPE nem Lançamento TIPE). */
  conectorEquipe: boolean;
  avisoHost: string | null;
};

export function ApiTipePdv({ slug, ativo, conectorEquipe, avisoHost }: Props) {
  const configurar = useServerFn(configurarApiTipe);
  const testar = useServerFn(testPdvConnection);
  const qc = useQueryClient();
  const [segredo, setSegredo] = useState<{ secret: string; url: string } | null>(null);
  const [url, setUrl] = useState("");
  const [ocupado, setOcupado] = useState(false);
  const atualizar = () => {
    void qc.invalidateQueries({ queryKey: ["pdv-integ", slug] });
    void qc.invalidateQueries({ queryKey: ["pdv-events", slug] });
  };
  const copiar = (t: string) => {
    void navigator.clipboard.writeText(t);
    toast.success("Copiado");
  };

  async function executar(
    acao: "ativar" | "novo_segredo" | "aviso" | "desativar",
    callbackUrl?: string,
  ) {
    setOcupado(true);
    try {
      const r = await configurar({ data: { slug, acao, callbackUrl } });
      if (r.secret && r.webhookUrl)
        setSegredo({ secret: r.secret, url: `${window.location.origin}${r.webhookUrl}` });
      if (acao === "desativar") setSegredo(null);
      if (acao === "aviso") {
        setUrl("");
        toast.success(callbackUrl ? "Endereço de aviso salvo" : "Endereço de aviso removido");
      } else if (acao === "desativar") toast.success("Voltamos para o Lançamento TIPE");
      else toast.success("Segredo gerado. Copie agora.");
      atualizar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }
  async function enviarTeste() {
    setOcupado(true);
    try {
      const r = await testar({ data: { slug } });
      if (r.ok) toast.success(avisoHost ? `Teste recebido por ${avisoHost}` : "API ativa");
      else toast.error(r.erro);
      atualizar();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  if (conectorEquipe) return null;
  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <h3 className="flex items-center gap-2 font-display font-semibold">
            <KeyRound className="h-4 w-4" />
            API TIPE para o seu PDV
          </h3>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Seu sistema envia as mesas e os itens, o cliente paga pelo QR e a Tipe avisa o seu
            sistema que a mesa foi paga. Quem desenvolve o seu PDV encontra tudo na documentação.
          </p>
        </div>
        <a
          href="/desenvolvedores"
          target="_blank"
          rel="noreferrer"
          className="inline-flex items-center gap-1 text-sm font-medium underline underline-offset-4"
        >
          <BookOpen className="h-4 w-4" />
          Ver documentação
        </a>
      </div>

      {!ativo ? (
        <Button
          size="sm"
          disabled={ocupado}
          onClick={() => {
            if (
              window.confirm(
                "Ativar a API TIPE? Os pedidos passam a vir do seu sistema. O Lançamento TIPE continua disponível como reserva.",
              )
            )
              void executar("ativar");
          }}
        >
          <KeyRound className="mr-1 h-4 w-4" />
          Ativar API TIPE
        </Button>
      ) : (
        <div className="space-y-3">
          <div className="space-y-1 text-sm">
            <p className="font-medium">Aviso de pagamento</p>
            <p className="text-muted-foreground">
              {avisoHost ? (
                <>
                  Avisando <strong>{avisoHost}</strong> a cada pagamento aprovado, com novas
                  tentativas se o sistema não responder.
                </>
              ) : (
                "Sem endereço de aviso: o seu sistema consulta os pagamentos pela API."
              )}
            </p>
            <form
              className="flex flex-wrap gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (url.trim()) void executar("aviso", url.trim());
              }}
            >
              <label className="sr-only" htmlFor="aviso-url">
                Endereço de aviso (https)
              </label>
              <Input
                id="aviso-url"
                className="min-w-0 flex-1"
                inputMode="url"
                placeholder="https://seu-pdv.com.br/tipe/aviso"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
              />
              <Button size="sm" type="submit" disabled={ocupado || !url.trim()}>
                Salvar endereço
              </Button>
            </form>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="outline" disabled={ocupado} onClick={enviarTeste}>
              <Send className="mr-1 h-4 w-4" />
              {avisoHost ? "Enviar aviso de teste" : "Testar"}
            </Button>
            {avisoHost && (
              <Button
                size="sm"
                variant="outline"
                disabled={ocupado}
                onClick={() => {
                  if (
                    window.confirm(
                      "Remover o endereço de aviso? O seu sistema terá de consultar os pagamentos.",
                    )
                  )
                    void executar("aviso", "");
                }}
              >
                Remover endereço
              </Button>
            )}
            <Button
              size="sm"
              variant="outline"
              disabled={ocupado}
              onClick={() => {
                if (window.confirm("Gerar um novo segredo? O atual para de funcionar na hora."))
                  void executar("novo_segredo");
              }}
            >
              Gerar novo segredo
            </Button>
            <Button
              size="sm"
              variant="ghost"
              disabled={ocupado}
              onClick={() => {
                if (window.confirm("Desativar a API TIPE e voltar para o Lançamento TIPE?"))
                  void executar("desativar");
              }}
            >
              Desativar API TIPE
            </Button>
          </div>
        </div>
      )}

      {segredo && (
        <div className="space-y-2 rounded-lg border p-3 text-xs">
          <p className="font-medium">Endereço do webhook</p>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded bg-muted p-2">{segredo.url}</code>
            <Button
              size="icon"
              variant="outline"
              aria-label="Copiar endereço"
              onClick={() => copiar(segredo.url)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="font-medium">Segredo</p>
          <div className="flex gap-2">
            <code className="flex-1 break-all rounded bg-accent/20 p-2">{segredo.secret}</code>
            <Button
              size="icon"
              variant="outline"
              aria-label="Copiar segredo"
              onClick={() => copiar(segredo.secret)}
            >
              <Copy className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-destructive">
            Copie agora: o segredo não aparece de novo. Endereço do restaurante (x-tipe-restaurant):{" "}
            {slug}.
          </p>
        </div>
      )}
    </div>
  );
}
