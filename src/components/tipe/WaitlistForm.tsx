import { LeadForm } from "./LeadForm";

/** Compatibilidade: um único formulário e o mesmo CRM em todas as entradas. */
export function WaitlistForm({
  origin = "home",
}: {
  origin?: "home" | "simulador" | "calculadora";
}) {
  return <LeadForm origin={origin} embedded />;
}
