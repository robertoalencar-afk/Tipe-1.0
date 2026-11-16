import { FiscalMaquininha } from "./FiscalMaquininha";
import type { ManualPagamentoFiscal } from "@/lib/tipe/fiscal/payments";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  getFiscalManualPayments,
  getFiscalSales,
  issueFiscalSale,
  prepareFiscalSale,
} from "@/lib/tipe/fiscal.functions";
import type { AmbienteFiscal } from "@/lib/tipe/fiscal/contract";
const money = (cents: number) =>
  (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
export function FiscalEmitir({
  slug,
  environment,
  onDocument,
}: {
  slug: string;
  environment: AmbienteFiscal;
  onDocument: (id: string) => void;
}) {
  const fetch = useServerFn(getFiscalSales);
  const fetchManual = useServerFn(getFiscalManualPayments);
  const prepare = useServerFn(prepareFiscalSale);
  const issue = useServerFn(issueFiscalSale);
  type Preview = Awaited<ReturnType<typeof prepare>>;
  const [manualStep, setManualStep] = useState<{
    saleId: string;
    payments: Awaited<ReturnType<typeof fetchManual>>["payments"];
  } | null>(null);
  const [offset, setOffset] = useState(0);
  const [busy, setBusy] = useState<string | null>(null);
  const [preview, setPreview] = useState<{
    saleId: string;
    data: Preview;
    requestId: string;
    manualPayments: ManualPagamentoFiscal[];
  } | null>(null);
  const [confirmed, setConfirmed] = useState(false);
  const q = useQuery({
    queryKey: ["fiscal-sales", slug, environment, offset],
    queryFn: () => fetch({ data: { slug, environment, offset } }),
  });
  async function review(saleId: string, manualPayments?: ManualPagamentoFiscal[]) {
    setBusy(saleId);
    setConfirmed(false);
    try {
      if (!manualPayments) {
        const pending = await fetchManual({ data: { slug, saleId } });
        if (pending.payments.length) {
          setManualStep({ saleId, payments: pending.payments });
          return;
        }
      }
      const values = manualPayments ?? [];
      const data = await prepare({ data: { slug, environment, saleId, manualPayments: values } });
      setManualStep(null);
      setPreview({ saleId, data, requestId: crypto.randomUUID(), manualPayments: values });
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Não foi possível conferir a venda");
    } finally {
      setBusy(null);
    }
  }
  async function send() {
    if (!preview || !confirmed) return;
    setBusy(preview.saleId);
    try {
      const result = await issue({
        data: {
          slug,
          environment,
          saleId: preview.saleId,
          fingerprint: preview.data.fingerprint,
          requestId: preview.requestId,
          manualPayments: preview.manualPayments,
        },
      });
      toast.success(
        result.existing
          ? "Esta venda já possui um documento fiscal"
          : "Nota enfileirada. Aguarde a autorização do emissor.",
      );
      setPreview(null);
      setConfirmed(false);
      void q.refetch();
      onDocument(result.id);
    } catch (error) {
      setConfirmed(false);
      toast.error(error instanceof Error ? error.message : "Não foi possível enfileirar a nota");
    } finally {
      setBusy(null);
    }
  }
  return (
    <section className="surface-card p-4 sm:p-6">
      <h3 className="font-semibold">Emitir NFC-e de uma venda encerrada</h3>
      <p className="mt-1 max-w-3xl text-sm text-muted-foreground">
        Venda presencial, dentro da UF e sem frete. Os produtos e pagamentos vêm da conta encerrada;
        a conferência verifica estornos, valores e vigências antes do envio.
      </p>
      {q.isPending ? (
        <p role="status" className="py-6 text-sm">
          Carregando vendas…
        </p>
      ) : q.isError ? (
        <div role="alert" className="py-6">
          <p className="text-sm">{q.error.message}</p>
          <Button variant="outline" className="mt-3" onClick={() => void q.refetch()}>
            Tentar novamente
          </Button>
        </div>
      ) : (
        <>
          {!q.data.sales.length ? (
            <p className="py-8 text-sm text-muted-foreground">
              As contas encerradas aparecerão aqui para a conferência fiscal.
            </p>
          ) : (
            <div className="mt-5 divide-y divide-border">
              {q.data.sales.map((sale) => (
                <div
                  key={sale.id}
                  className="flex flex-wrap items-center justify-between gap-3 py-4"
                >
                  <div>
                    <p className="text-sm font-semibold">Mesa {sale.table ?? "—"}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {new Date(sale.createdAt).toLocaleString("pt-BR")} · Pago ao encerrar:{" "}
                      {money(sale.paidAtCloseCents)}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={busy !== null}
                    onClick={() =>
                      sale.document ? onDocument(sale.document.id) : void review(sale.id)
                    }
                  >
                    {busy === sale.id
                      ? "Conferindo…"
                      : sale.document
                        ? "Ver documento"
                        : "Conferir para emitir"}
                  </Button>
                </div>
              ))}
            </div>
          )}
          <div className="mt-4 flex justify-between gap-3">
            <Button
              size="sm"
              variant="outline"
              disabled={offset === 0 || busy !== null}
              onClick={() => setOffset(Math.max(0, offset - 20))}
            >
              Anteriores
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={q.data.sales.length < 20 || offset >= 100000 || busy !== null}
              onClick={() => setOffset(offset + 20)}
            >
              Próximas vendas
            </Button>
          </div>
        </>
      )}
      {manualStep && (
        <FiscalMaquininha
          key={manualStep.saleId}
          payments={manualStep.payments}
          busy={busy !== null}
          onClose={() => setManualStep(null)}
          onContinue={(values) => void review(manualStep.saleId, values)}
        />
      )}
      <Dialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open && !busy) setPreview(null);
        }}
      >
        <DialogContent className="max-h-[90vh] max-w-3xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Confira a NFC-e · Mesa {preview?.data.table}</DialogTitle>
            <DialogDescription>
              {environment === "homologacao"
                ? "Homologação: documento sem valor fiscal."
                : "Produção: o envio solicita autorização fiscal à SEFAZ."}{" "}
              A autorização do pagamento permanece separada da autorização da nota.
            </DialogDescription>
          </DialogHeader>
          {preview && (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3 rounded-xl bg-muted/50 p-4">
                <div>
                  <p className="text-sm">
                    Data fiscal: {preview.data.taxDate.split("-").reverse().join("/")}
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {preview.data.uf} · CRT {preview.data.taxRegime}
                  </p>
                </div>
                <strong className="text-xl tabular-nums">{money(preview.data.amountCents)}</strong>
              </div>
              <div className="max-h-72 divide-y divide-border overflow-y-auto">
                {preview.data.items.map((item) => (
                  <div key={item.code} className="py-3 text-sm">
                    <div className="flex justify-between gap-4">
                      <span className="min-w-0 break-words font-medium">
                        {item.quantity} × {item.name}
                      </span>
                      <span className="shrink-0 tabular-nums">
                        {money(Math.round((item.gross + item.expenses) * 100))}
                      </span>
                    </div>
                    <p className="mt-1 text-xs text-muted-foreground">
                      NCM {item.ncm} · CFOP {item.cfop}
                      {item.expenses > 0
                        ? ` · Despesa acessória: ${money(Math.round(item.expenses * 100))}`
                        : ""}
                    </p>
                  </div>
                ))}
              </div>
              {!preview.data.enabled && (
                <p role="status" className="rounded-lg bg-muted p-3 text-sm">
                  O responsável precisa habilitar a emissão neste ambiente em Emitente e conexão.
                </p>
              )}
              <label className="flex items-start gap-3 text-sm">
                <input
                  type="checkbox"
                  className="mt-1 size-4 shrink-0"
                  checked={confirmed}
                  disabled={busy !== null}
                  onChange={(e) => setConfirmed(e.target.checked)}
                />
                <span>
                  Conferi os produtos, pagamentos e a operação presencial interna sem frete.
                </span>
              </label>
              <div className="flex flex-wrap justify-end gap-2">
                <Button
                  variant="outline"
                  disabled={busy !== null}
                  onClick={() => void review(preview.saleId, preview.manualPayments)}
                >
                  Conferir novamente
                </Button>
                <Button
                  disabled={busy !== null || !confirmed || !preview.data.enabled}
                  onClick={() => void send()}
                >
                  {busy
                    ? "Enfileirando…"
                    : environment === "homologacao"
                      ? "Emitir NFC-e de homologação"
                      : "Enviar NFC-e à SEFAZ"}
                </Button>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
