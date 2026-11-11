import { createFileRoute } from "@tanstack/react-router";
import { RedefinirSenha } from "@/components/tipe/conta/RedefinirSenha";

export const Route = createFileRoute("/redefinir-senha/")({
  head: () => ({
    meta: [
      { title: "Nova senha — TIPE" },
      { name: "description", content: "Crie uma nova senha para entrar na Tipe." },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: () => <RedefinirSenha destino="painel" />,
});
