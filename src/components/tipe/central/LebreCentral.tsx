import { LebreAssistant } from "@/components/tipe/LebreAssistant";
import type { Pendencia } from "@/lib/tipe/pendencias";

/** Lebre da Central: o mesmo chat e o mesmo botão da Gestão, respondendo com os dados da Tipe. */
export function LebreCentral({
  pendencias,
  onPendencia,
}: {
  pendencias?: Pendencia[] | undefined;
  onPendencia?: ((aba: string) => void) | undefined;
}) {
  return <LebreAssistant central pendencias={pendencias} onPendencia={onPendencia} />;
}
