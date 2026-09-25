import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode } from "lucide-react";
import logo from "@/assets/logo.png.asset.json";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIPE — Aponte a câmera e pague sua mesa" },
      { name: "description", content: "Leia o QR Code do totem da mesa para conferir e pagar sua conta com TIPE." },
      { property: "og:title", content: "TIPE — Pague. Sem esperar." },
      { property: "og:description", content: "Leia o QR Code do totem da mesa e pague pelo celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: Totem,
});

function Totem() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-background p-6">
      <div className="w-full max-w-sm rounded-[2rem] p-8 text-center text-secondary-foreground" style={{ background: "var(--gradient-brand)", boxShadow: "var(--shadow-glow)" }}>
        <img src={logo.url} alt="TIPE" className="mx-auto h-14" />
        <h1 className="mt-6 font-display text-3xl font-bold">Aqui tem Tipe.</h1>
        <p className="text-primary">Pague. Sem esperar.</p>
        <p className="mt-4 text-sm opacity-80">Aponte a câmera para o QR Code da sua mesa.</p>
        <Link to="/mesa/$restaurante/$mesa" params={{ restaurante: "mare-alta", mesa: "12" }}
          className="mx-auto mt-6 flex h-44 w-44 items-center justify-center rounded-2xl bg-card text-card-foreground">
          <QrCode className="h-32 w-32" />
        </Link>
        <p className="mt-3 text-xs opacity-60">Mesa 12 · toque no código para simular a leitura</p>
      </div>
    </main>
  );
}
