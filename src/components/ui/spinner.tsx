import { PontosCarregando } from "@/components/tipe/Carregando";

import { cn } from "@/lib/utils";

function Spinner({ className }: { className?: string }) {
  return (
    <span role="status" aria-label="Carregando" className={cn("inline-flex", className)}>
      <PontosCarregando />
    </span>
  );
}

export { Spinner };
