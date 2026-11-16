import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { UserRound } from "lucide-react";
import { Button } from "@/components/ui/button";
import { assignTableWaiter, getTableAssignment } from "@/lib/tipe/stations.functions";

/**
 * Dono, gerente ou caixa abre a mesa para um garçom específico. Só esse garçom lança pedidos
 * e libera o celular da mesa. A designação some quando a conta fecha.
 */
export function DesignarGarcom({ slug, table, onDone }: { slug: string; table: string; onDone: () => void }) {
  const qc = useQueryClient();
  const buscar = useServerFn(getTableAssignment);
  const designar = useServerFn(assignTableWaiter);
  const q = useQuery({ queryKey: ["mesa-garcom", slug, table], queryFn: () => buscar({ data: { slug, table } }) });
  const [escolha, setEscolha] = useState<string | null>(null);
  const [ocupado, setOcupado] = useState(false);
  if (!q.data) return null;
  const valor = escolha ?? q.data.current ?? "";

  async function aplicar(waiterId: string | null, abrir: boolean) {
    setOcupado(true);
    try {
      await designar({ data: { slug, table, waiterId, abrir } });
      toast.success(waiterId ? `Mesa ${table} designada${abrir ? " e liberada" : ""}` : `Mesa ${table} sem garçom`);
      setEscolha(null);
      await qc.invalidateQueries({ queryKey: ["mesa-garcom", slug, table] });
      await qc.invalidateQueries({ queryKey: ["order-access", slug] });
      onDone();
    } catch (e) {
      toast.error((e as Error).message);
    } finally {
      setOcupado(false);
    }
  }

  return (
    <div className="rounded-xl border border-border p-3">
      <div className="flex items-center gap-2 text-sm font-medium"><UserRound className="h-4 w-4 text-primary" />Garçom da mesa</div>
      <p className="mt-1 text-xs text-muted-foreground">Só o garçom designado lança pedidos nesta mesa e libera o celular dos clientes.</p>
      {q.data.waiters.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">Cadastre garçons em Equipe para designar.</p>
      ) : (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <select
            className="h-10 min-w-40 flex-1 rounded-md border border-input bg-background px-3 text-sm"
            value={valor}
            aria-label="Garçom da mesa"
            onChange={(e) => setEscolha(e.target.value)}
          >
            <option value="">Sem garçom</option>
            {q.data.waiters.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
          <Button size="sm" disabled={ocupado || valor === (q.data.current ?? "")} onClick={() => void aplicar(valor || null, false)}>Designar</Button>
          <Button size="sm" variant="outline" disabled={ocupado || !valor} onClick={() => void aplicar(valor, true)}>Designar e liberar celular</Button>
        </div>
      )}
    </div>
  );
}
