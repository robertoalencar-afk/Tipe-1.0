import { useRouterState } from "@tanstack/react-router";
import { useEffect, useState } from "react";

/**
 * Barra fina no topo enquanto a próxima tela carrega. Só aparece se a troca passar
 * de 120 ms (abaixo disso a navegação já parece instantânea e a barra só piscaria).
 */
export function BarraNavegacao() {
  const carregando = useRouterState({ select: (s) => s.status === "pending" });
  const [visivel, setVisivel] = useState(false);

  useEffect(() => {
    if (!carregando) {
      setVisivel(false);
      return;
    }
    const t = window.setTimeout(() => setVisivel(true), 120);
    return () => window.clearTimeout(t);
  }, [carregando]);

  return (
    <div
      aria-hidden
      className="pointer-events-none fixed inset-x-0 top-0 z-[100] h-0.5 overflow-hidden"
      style={{ opacity: visivel ? 1 : 0, transition: "opacity 150ms ease-out" }}
    >
      {visivel && <div className="barra-navegacao h-full w-1/3 rounded-full bg-brand" />}
    </div>
  );
}
