import { createFileRoute } from "@tanstack/react-router";
import { RedefinirSenha } from "@/components/tipe/conta/RedefinirSenha";

/** Mesmo fluxo, voltando para o app do garçom (convite e redefinição de garçons). */
export const Route = createFileRoute("/redefinir-senha/garcom")({
  head: () => ({
    meta: [
      { title: "Nova senha — TIPE" },
      { name: "description", content: "Crie sua senha para usar o app do garçom da Tipe." },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: () => <RedefinirSenha destino="garcom" />,
});
