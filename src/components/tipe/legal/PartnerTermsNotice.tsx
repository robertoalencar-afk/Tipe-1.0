import { Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { getPartnerTermsStatus, recordLegalAcceptance } from "@/lib/tipe/legal.functions";

/** Pede novo aceite quando a versão dos Termos para Parceiros muda. */
export function PartnerTermsNotice() {
  const status = useServerFn(getPartnerTermsStatus);
  const aceitar = useServerFn(recordLegalAcceptance);
  const qc = useQueryClient();
  const [busy, setBusy] = useState(false);
  const q = useQuery({ queryKey: ["partner-terms-status"], queryFn: () => status(), staleTime: 5 * 60_000 });
  if (!q.data?.needsReaccept) return null;
  return (
    <div role="status" className="mb-4 flex flex-col gap-3 rounded-2xl border-l-4 border-primary bg-accent/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="text-sm leading-6">Os <Link to="/legal/$livro" params={{ livro: "parceiros" }} target="_blank" className="font-semibold underline">Termos para Parceiros</Link> foram atualizados para a versão {q.data.version}. Leia e confirme o novo aceite.</p>
      <Button size="sm" disabled={busy} onClick={async () => {
        setBusy(true);
        try { await aceitar({ data: { documents: ["partner_terms", "privacy_policy"] } }); toast.success("Aceite registrado."); await qc.invalidateQueries({ queryKey: ["partner-terms-status"] }); }
        catch { toast.error("Não foi possível registrar agora."); } finally { setBusy(false); }
      }}>Li e aceito</Button>
    </div>
  );
}
