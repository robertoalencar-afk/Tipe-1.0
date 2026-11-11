import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";
import { supabase } from "@/integrations/supabase/client";

export const getRouter = () => {
  const queryClient = new QueryClient();

  // Nunca reaproveitar dados de outra conta: ao trocar de usuário (ou sair), o cache inteiro é descartado.
  if (typeof window !== "undefined") {
    let atual: string | null | undefined;
    supabase.auth.onAuthStateChange((evento, sessao) => {
      const id = sessao?.user?.id ?? null;
      if (evento === "SIGNED_OUT" || (atual !== undefined && id !== atual && evento !== "TOKEN_REFRESHED")) queryClient.clear();
      if (evento !== "TOKEN_REFRESHED") atual = id;
    });
  }

  const router = createRouter({
    routeTree,
    context: { queryClient },
    scrollRestoration: true,
    // Navegação instantânea: ao passar o mouse ou tocar num link, o código e os dados da
    // próxima tela já começam a baixar; ao clicar, a troca é imediata.
    defaultPreload: "intent",
    defaultPreloadDelay: 30,
    // Dados vêm do React Query (que deduplica); o router não guarda cópia própria.
    defaultPreloadStaleTime: 0,
    // Telas que carregam rápido não piscam um estado de "carregando".
    defaultPendingMs: 400,
    defaultPendingMinMs: 0,
  });

  return router;
};
