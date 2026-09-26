import { createFileRoute, redirect } from "@tanstack/react-router";

// Link antigo (/mesa/mare-alta/12) → novo formato (/marealta/mesa12)
export const Route = createFileRoute("/mesa/$restaurante/$mesa")({
  beforeLoad: ({ params }) => {
    throw redirect({ to: "/$restaurante/$mesa", params: { restaurante: params.restaurante.replace(/-/g, ""), mesa: `mesa${params.mesa}` }, statusCode: 301 });
  },
});
