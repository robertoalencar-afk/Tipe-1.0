import { LeadForm } from "@/components/tipe/LeadForm";
import type { EstadoLancamento } from "@/lib/tipe/launch-state";

export function FormularioOrder({ estado }: { estado: EstadoLancamento }) {
  return <LeadForm produto="order" estado={estado} />;
}
