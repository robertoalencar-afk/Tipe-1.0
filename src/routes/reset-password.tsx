import { Carregando } from "@/components/tipe/Carregando";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect } from "react";

/**
 * Endereço antigo (e-mails já enviados e convites de garçom em andamento).
 * Leva para /redefinir-senha mantendo o token, que vem no #hash e não chega ao servidor.
 */
export const Route = createFileRoute("/reset-password")({
  head: () => ({
    meta: [
      { title: "Nova senha — TIPE" },
      { name: "robots", content: "noindex" },
      { name: "referrer", content: "no-referrer" },
    ],
  }),
  component: Redirecionar,
});

function Redirecionar() {
  useEffect(() => {
    const q = new URLSearchParams(window.location.search);
    const garcom = q.has("garcom");
    q.delete("garcom");
    const busca = q.toString();
    window.location.replace(
      `/redefinir-senha${garcom ? "/garcom" : ""}${busca ? `?${busca}` : ""}${window.location.hash}`,
    );
  }, []);
  return <Carregando tamanho="tela" texto="Abrindo" />;
}
