import { createFileRoute } from "@tanstack/react-router";
import { opcoesRotaProduto } from "@/components/tipe/site/rotaProduto";

export const Route = createFileRoute("/guest")(opcoesRotaProduto("guest"));
