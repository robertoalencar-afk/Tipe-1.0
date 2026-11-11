import { LeadForm } from "@/components/tipe/LeadForm";
import type { EstadoLancamento } from "@/lib/tipe/launch-state";
import type { RespostasConfigurador } from "@/lib/tipe/order/modalidades";

export function FormularioOrder({ estado, operacao }: { estado: EstadoLancamento; operacao?: RespostasConfigurador }) {
  return <LeadForm produto="order" estado={estado} operacao={operacao} />;
}
