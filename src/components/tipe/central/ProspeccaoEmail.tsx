import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Mail, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Aviso,
  Esqueleto,
  Kpi,
  Painel,
  StatusBadge,
  Tabela,
  horaBR,
  inputCls,
} from "@/components/tipe/painel/ui";
import {
  enviarEmailTeste,
  enviarLoteEmail,
  getLoteEmail,
} from "@/lib/tipe/prospeccao-email.functions";

const STATUS_TONE: Record<string, "success" | "brand" | "warning" | "error" | "neutral"> = {
  delivered: "success",
  opened: "success",
  clicked: "success",
  sent: "brand",
  delivery_delayed: "warning",
  bounced: "error",
  complained: "error",
  failed: "error",
  suppressed: "neutral",
};
const STATUS_TXT: Record<string, string> = {
  delivered: "Entregue",
  opened: "Aberto",
  clicked: "Clicou",
  sent: "Enviado",
  delivery_delayed: "Atrasado",
  bounced: "Voltou",
  complained: "Marcou spam",
  failed: "Falhou",
  suppressed: "Bloqueado",
};

/** Campanha de e-mail da prospecção: prévia, teste para si e envio do lote do dia com aprovação. */
export function ProspeccaoEmail({ emailUsuario }: { emailUsuario?: string | undefined }) {
  const qc = useQueryClient();
  const fetchLote = useServerFn(getLoteEmail);
  const q = useQuery({ queryKey: ["central-prospeccao-email"], queryFn: () => fetchLote() });
  const teste = useServerFn(enviarEmailTeste);
  const enviar = useServerFn(enviarLoteEmail);
  const [para, setPara] = useState(emailUsuario ?? "");
  const [marcados, setMarcados] = useState<Set<string>>(new Set());
  const [confirmar, setConfirmar] = useState(false);
  useEffect(() => {
    if (q.data) setMarcados(new Set(q.data.lote.map((l) => l.id)));
  }, [q.data]);
  useEffect(() => {
    if (!para && emailUsuario) setPara(emailUsuario);
  }, [emailUsuario]); // eslint-disable-line react-hooks/exhaustive-deps
  const mTeste = useMutation({
    mutationFn: () => teste({ data: { para, passo: 1 } }),
    onSuccess: () =>
      toast.success(`Teste enviado para ${para}. Confira se chegou na caixa de entrada.`),
    onError: (e: Error) => toast.error(e.message),
  });
  const mLote = useMutation({
    mutationFn: () => enviar({ data: { ids: [...marcados] } }),
    onSuccess: (r) => {
      setConfirmar(false);
      toast.success(
        `${r.enviados} e-mails enviados${r.falhas.length ? `, ${r.falhas.length} falharam` : ""}`,
      );
      if (r.falhas.length) toast.error(r.falhas.slice(0, 3).join(" · "));
      qc.invalidateQueries({ queryKey: ["central-prospeccao-email"] });
      qc.invalidateQueries({ queryKey: ["central-prospeccao"] });
    },
    onError: (e: Error) => toast.error(e.message),
  });
  if (q.isPending) return <Esqueleto linhas={6} />;
  if (q.isError)
    return (
      <Aviso tone="warning">Não deu para carregar a campanha: {(q.error as Error).message}</Aviso>
    );
  const d = q.data;
  const vaga = Math.max(0, d.limite - d.enviadosHoje);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi label="Restaurantes com e-mail" value={d.comEmail} hint="públicos, sem opt-out" />
        <Kpi label="Prontos hoje" value={d.lote.length} tone="brand" />
        <Kpi
          label="Enviados hoje"
          value={`${d.enviadosHoje}/${d.limite}`}
          hint="limite para proteger o domínio"
        />
        <Kpi
          label="Voltaram ou spam"
          value={d.ultimos.filter((u: any) => ["bounced", "complained"].includes(u.status)).length}
          tone={d.ultimos.some((u: any) => u.status === "complained") ? "error" : undefined}
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Painel titulo="Prévia" descricao={`De: ${d.remetente} · Assunto: ${d.previa.assunto}`}>
          <iframe
            title="Prévia do e-mail"
            srcDoc={d.previa.html}
            sandbox=""
            className="h-[520px] w-full rounded-lg border border-border bg-white"
          />
          {d.podeEnviar && (
            <form
              className="mt-3 flex flex-wrap items-end gap-2"
              onSubmit={(e) => {
                e.preventDefault();
                mTeste.mutate();
              }}
            >
              <label className="min-w-0 flex-1 text-sm">
                <span className="mb-1 block text-xs text-muted-foreground">
                  Enviar um teste para
                </span>
                <input
                  type="email"
                  required
                  className={`${inputCls} h-9`}
                  value={para}
                  onChange={(e) => setPara(e.target.value)}
                />
              </label>
              <Button type="submit" size="sm" variant="outline" disabled={mTeste.isPending}>
                <Mail className="size-4" /> Enviar teste
              </Button>
            </form>
          )}
        </Painel>

        <Painel
          titulo="Lote de hoje"
          descricao={
            vaga
              ? `Até ${vaga} envios hoje. Maior score primeiro; lembretes de quem já recebeu entram antes.`
              : "Limite de hoje atingido. O próximo lote abre amanhã."
          }
          semPadding
        >
          <Tabela
            linhas={d.lote}
            chave={(l) => l.id}
            vazio="Ninguém para receber hoje. Mapeie mais restaurantes com e-mail ou espere os lembretes vencerem."
            colunas={[
              {
                k: "m",
                l: "",
                w: "2rem",
                c: (l) => (
                  <input
                    type="checkbox"
                    aria-label={`Incluir ${l.name}`}
                    checked={marcados.has(l.id)}
                    onChange={(e) => {
                      const s = new Set(marcados);
                      if (e.target.checked) s.add(l.id);
                      else s.delete(l.id);
                      setMarcados(s);
                    }}
                  />
                ),
              },
              {
                k: "n",
                l: "Restaurante",
                c: (l) => (
                  <span>
                    <span className="font-medium">{l.name}</span>
                    <span className="block text-xs text-muted-foreground">{l.email}</span>
                  </span>
                ),
              },
              {
                k: "p",
                l: "E-mail",
                c: (l) => (l.passo === 1 ? "1º (com GIF)" : `Lembrete ${l.passo - 1}`),
              },
              { k: "s", l: "Score", num: true, md: true, c: (l) => l.score },
            ]}
          />
          {d.podeEnviar && d.lote.length > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-t border-border p-4">
              {!confirmar ? (
                <Button
                  size="sm"
                  variant="ink"
                  disabled={!marcados.size}
                  onClick={() => setConfirmar(true)}
                >
                  <Send className="size-4" /> Enviar {marcados.size} e-mails
                </Button>
              ) : (
                <>
                  <span className="text-sm">
                    Enviar agora para {marcados.size} restaurantes? Não dá para desfazer.
                  </span>
                  <Button
                    size="sm"
                    variant="ink"
                    disabled={mLote.isPending}
                    onClick={() => mLote.mutate()}
                  >
                    {mLote.isPending ? "Enviando…" : "Confirmar envio"}
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setConfirmar(false)}>
                    Cancelar
                  </Button>
                </>
              )}
            </div>
          )}
          {!d.podeEnviar && (
            <p className="p-4 text-xs text-muted-foreground">Só o fundador aprova e envia lotes.</p>
          )}
        </Painel>
      </div>

      {d.ultimos.length > 0 && (
        <Painel titulo="Últimos envios" semPadding>
          <Tabela
            linhas={d.ultimos as any[]}
            chave={(u: any) => `${u.to_email}${u.created_at}`}
            colunas={[
              { k: "t", l: "Para", c: (u: any) => u.to_email },
              { k: "a", l: "Assunto", md: true, c: (u: any) => u.subject },
              {
                k: "s",
                l: "Status",
                c: (u: any) => (
                  <StatusBadge tone={STATUS_TONE[u.status] ?? "neutral"}>
                    {STATUS_TXT[u.status] ?? u.status}
                  </StatusBadge>
                ),
              },
              { k: "d", l: "Quando", num: true, c: (u: any) => horaBR(u.created_at) },
            ]}
          />
        </Painel>
      )}
      <p className="text-xs text-muted-foreground">
        Cada e-mail sai de {d.remetente} com descadastro em 1 clique. Respostas chegam na Caixa de
        e-mail da Central; quem responder SAIR deve ser marcado como "Não contatar mais" na ficha.
      </p>
    </div>
  );
}
