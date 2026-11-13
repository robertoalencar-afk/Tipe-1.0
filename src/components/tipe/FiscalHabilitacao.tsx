import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getFiscalDocuments, setFiscalEnabled } from "@/lib/tipe/fiscal.functions";
import type { AmbienteFiscal } from "@/lib/tipe/fiscal/contract";
export function FiscalHabilitacao({
  slug,
  environment,
  enabled,
}: {
  slug: string;
  environment: AmbienteFiscal;
  enabled: boolean;
}) {
  const setEnabled = useServerFn(setFiscalEnabled);
  const fetchDocuments = useServerFn(getFiscalDocuments);
  const qc = useQueryClient();
  const [review, setReview] = useState("");
  const [documentId, setDocumentId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [busy, setBusy] = useState(false);
  const hom = useQuery({
    queryKey: ["fiscal-authorized-homologation", slug],
    queryFn: () => fetchDocuments({ data: { slug, environment: "homologacao" } }),
    enabled: environment === "producao" && !enabled,
  });
  async function change() {
    setBusy(true);
    try {
      await setEnabled({
        data: {
          slug,
          environment,
          enabled: !enabled,
          ...(!enabled ? { review: review.trim() } : {}),
          ...(!enabled && environment === "producao" ? { homologationDocumentId: documentId } : {}),
        },
      });
      toast.success(
        enabled
          ? "Emissão desabilitada. Consultas continuam disponíveis."
          : environment === "homologacao"
            ? "Emissões de homologação habilitadas"
            : "Emissão em produção habilitada para este restaurante",
      );
      setConfirmed(false);
      await qc.invalidateQueries({ queryKey: ["fiscal-setup", slug] });
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível alterar a habilitação",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="mt-6 border-t border-border pt-6">
      <h3 className="font-semibold">Habilitação da emissão</h3>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        {environment === "homologacao"
          ? "Este ambiente envia notas de teste sem valor fiscal. A habilitação em produção é independente."
          : "A produção exige uma NFC-e autorizada em homologação com o mesmo CNPJ e configuração do emitente, além da revisão fiscal da operação."}
      </p>
      {enabled ? (
        <Button variant="outline" className="mt-4" disabled={busy} onClick={() => void change()}>
          Desabilitar emissão neste ambiente
        </Button>
      ) : (
        <div className="mt-4 max-w-2xl space-y-4">
          <label className="block text-sm font-medium">
            Referência da revisão fiscal
            <Input
              className="mt-1"
              maxLength={200}
              value={review}
              onChange={(e) => setReview(e.target.value)}
              placeholder="Documento ou revisão confirmada com a contabilidade"
            />
          </label>
          {environment === "producao" && (
            <label className="block text-sm font-medium">
              NFC-e autorizada em homologação
              <select
                className="mt-1 h-11 w-full rounded-md border border-input bg-background px-3 text-sm"
                value={documentId}
                onChange={(e) => setDocumentId(e.target.value)}
                disabled={hom.isPending || hom.isError}
              >
                <option value="">Selecione a nota da configuração homologada</option>
                {hom.data?.documents
                  .filter((d) => d.state === "authorized")
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.access_key ?? d.id}
                    </option>
                  ))}
              </select>
              {hom.isError && (
                <span role="alert" className="mt-1 block text-xs text-destructive">
                  Não foi possível ler as notas. Atualize a página para tentar novamente.
                </span>
              )}
            </label>
          )}
          <label className="flex items-start gap-3 text-sm">
            <input
              className="mt-1 size-4 shrink-0"
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
            />
            <span>
              {environment === "homologacao"
                ? "Conferi o cadastro do emitente e os perfis tributários para iniciar os testes fiscais."
                : "Conferi com a contabilidade o cadastro, os tributos e a configuração homologada para esta operação."}
            </span>
          </label>
          <Button
            disabled={
              busy ||
              !confirmed ||
              review.trim().length < 3 ||
              (environment === "producao" && !documentId)
            }
            onClick={() => void change()}
          >
            {busy
              ? "Habilitando…"
              : environment === "homologacao"
                ? "Habilitar emissão de homologação"
                : "Habilitar emissão em produção"}
          </Button>
        </div>
      )}
    </section>
  );
}
