import { useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  discardFiscalPreparation,
  downloadFiscalArtifact,
  requestFiscalDocumentAction,
} from "@/lib/tipe/fiscal.functions";
import { isolarHtmlFiscal } from "@/lib/tipe/fiscal/print-document";
import type { DocumentoFiscalPublico } from "@/lib/tipe/fiscal/public-types";

function fileBytes(base64: string) {
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}
export function FiscalDocumentoAcoes({
  slug,
  document,
  onQueued,
  environment,
  canCancel = true,
}: {
  slug: string;
  environment: "homologacao" | "producao";
  canCancel?: boolean;
  document: DocumentoFiscalPublico;
  onQueued: () => void;
}) {
  const action = useServerFn(requestFiscalDocumentAction);
  const download = useServerFn(downloadFiscalArtifact);
  const discard = useServerFn(discardFiscalPreparation);
  const [busy, setBusy] = useState(false);
  const [reason, setReason] = useState("");
  const [cancelling, setCancelling] = useState(false);
  const [preview, setPreview] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const frame = useRef<HTMLIFrameElement>(null);
  async function request(operation: "consult" | "cancel") {
    setBusy(true);
    try {
      await action({
        data: {
          slug,
          documentId: document.id,
          requestId: crypto.randomUUID(),
          operation,
          ...(operation === "cancel" ? { reason: reason.trim() } : {}),
        },
      });
      toast.success(
        operation === "cancel"
          ? "Cancelamento solicitado ao emissor"
          : "Consulta solicitada ao emissor",
      );
      setCancelling(false);
      setReason("");
      onQueued();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível solicitar a operação");
    } finally {
      setBusy(false);
    }
  }
  async function getFile(kind: "xml" | "danfe" | "cancelamento") {
    setBusy(true);
    try {
      const file = await download({ data: { slug, documentId: document.id, kind } });
      const bytes = fileBytes(file.base64);
      const html =
        file.mime === "text/html" ? isolarHtmlFiscal(new TextDecoder().decode(bytes)) : null;
      if (kind === "danfe" && html) {
        setReady(false);
        setPreview(html);
        return;
      }
      const blob = new Blob([html ?? bytes], { type: file.mime });
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = file.filename;
      window.document.body.appendChild(link);
      link.click();
      link.remove();
      setTimeout(() => URL.revokeObjectURL(url), 60000);
      if (kind === "danfe") toast.success("DANFE baixado. Abra o arquivo para imprimir.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível baixar o documento");
    } finally {
      setBusy(false);
    }
  }
  async function discardPreparation() {
    setBusy(true);
    try {
      await discard({ data: { slug, documentId: document.id } });
      toast.success("Preparo descartado antes do envio");
      onQueued();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível descartar o preparo");
    } finally {
      setBusy(false);
    }
  }
  return (
    <>
      <div className="flex flex-wrap gap-2">
        {document.state !== "voided" && document.send_started !== false && (
          <Button
            size="sm"
            variant="outline"
            disabled={busy}
            onClick={() => void request("consult")}
          >
            Consultar
          </Button>
        )}
        {["draft", "queued", "uncertain"].includes(document.state) && !document.send_started && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void discardPreparation()}
          >
            Descartar preparo sem envio
          </Button>
        )}
        {document.state === "authorized" && (
          <Button size="sm" variant="outline" disabled={busy} onClick={() => void getFile("danfe")}>
            Cupom fiscal
          </Button>
        )}
        {["authorized", "cancelled"].includes(document.state) && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => void getFile("xml")}>
            XML
          </Button>
        )}
        {document.state === "cancelled" && (
          <Button
            size="sm"
            variant="ghost"
            disabled={busy}
            onClick={() => void getFile("cancelamento")}
          >
            Evento de cancelamento
          </Button>
        )}
        {document.state === "authorized" && canCancel && (
          <Button size="sm" variant="ghost" disabled={busy} onClick={() => setCancelling(true)}>
            Cancelar nota
          </Button>
        )}
      </div>
      <Dialog
        open={cancelling}
        onOpenChange={(open) => {
          if (!busy) setCancelling(open);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Solicitar cancelamento fiscal</DialogTitle>
            <DialogDescription>
              O emissor enviará a solicitação à SEFAZ. O cancelamento da nota não estorna o
              pagamento.
            </DialogDescription>
          </DialogHeader>
          <label className="text-sm font-medium">
            Justificativa · 15 a 255 caracteres
            <Textarea
              className="mt-2"
              value={reason}
              maxLength={255}
              onChange={(e) => setReason(e.target.value)}
            />
          </label>
          <Button
            variant="destructive"
            disabled={busy || reason.trim().length < 15}
            onClick={() => void request("cancel")}
          >
            Solicitar cancelamento da nota
          </Button>
        </DialogContent>
      </Dialog>
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Cupom fiscal autorizado</DialogTitle>
            <DialogDescription>
              {environment === "homologacao" ? "Homologação · sem valor fiscal. " : ""}
              DANFC-e fornecido pelo emissor. Use a largura configurada também no driver da
              impressora.
            </DialogDescription>
          </DialogHeader>
          <iframe
            ref={frame}
            title="DANFC-e autorizado para impressão"
            className="h-[60vh] w-full rounded border bg-white"
            sandbox="allow-same-origin allow-modals"
            srcDoc={preview ?? ""}
            onLoad={() => setReady(true)}
          />
          <Button
            disabled={!ready}
            onClick={() => {
              try {
                frame.current?.contentWindow?.print();
              } catch {
                toast.error("Use a opção de impressão do navegador");
              }
            }}
          >
            Imprimir cupom fiscal
          </Button>
        </DialogContent>
      </Dialog>
    </>
  );
}
