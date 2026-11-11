import { QueryClient } from "@tanstack/react-query";
import { createRouter } from "@tanstack/react-router";
import { routeTree } from "./routeTree.gen";

export const getRouter = () => {
  const queryClient = new QueryClient();

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
