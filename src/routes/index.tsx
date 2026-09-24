import { createFileRoute, Link } from "@tanstack/react-router";
import { QrCode, Store, Wallet, ShieldCheck } from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "TIPE — Plataforma de pagamento e gorjetas" },
      { name: "description", content: "Acesse a área do cliente, painel do restaurante, do garçom e o painel administrativo TIPE." },
      { property: "og:title", content: "TIPE — Plataforma de pagamento e gorjetas" },
      { property: "og:description", content: "Pagou. Conferiu. Tipou. Foi." },
    ],
  }),
  component: Home,
});

const panels = [
  { icon: QrCode, title: "Área do cliente", desc: "Acesso pelo QR Code da mesa: conta, pagamento e gorjeta.", ready: true },
  { icon: Store, title: "Painel do restaurante", desc: "Vendas, gorjetas e mesas em tempo real.", ready: false },
  { icon: Wallet, title: "Painel do garçom", desc: "Gorjetas, saldo e saque.", ready: false },
  { icon: ShieldCheck, title: "Painel do fundador", desc: "Restaurantes, garçons, mapa e relatórios.", ready: false },
];

function Home() {
  return (
    <main className="min-h-screen bg-secondary text-secondary-foreground">
      <div className="mx-auto max-w-5xl px-6 py-16">
        <TipeLogo />
        <h1 className="mt-12 font-display text-4xl font-bold md:text-6xl">
          Pagou. Conferiu.<br /><span className="text-primary">Tipou. Foi.</span>
        </h1>
        <div className="mt-12 grid gap-4 md:grid-cols-2">
          {panels.map((p) => {
            const body = (
              <div className="h-full rounded-2xl border border-sidebar-border bg-sidebar-accent p-6 transition hover:border-primary">
                <p.icon className="h-7 w-7 text-primary" />
                <h2 className="mt-4 font-display text-xl font-semibold">{p.title}</h2>
                <p className="mt-1 text-sm opacity-70">{p.desc}</p>
                <span className={`mt-4 inline-block rounded-full px-3 py-1 text-xs font-semibold ${p.ready ? "bg-primary text-primary-foreground" : "bg-muted/20"}`}>
                  {p.ready ? "Abrir demonstração (Mesa 12)" : "Em breve"}
                </span>
              </div>
            );
            return p.ready ? (
              <Link key={p.title} to="/mesa/$restaurante/$mesa" params={{ restaurante: "mare-alta", mesa: "12" }}>{body}</Link>
            ) : <div key={p.title}>{body}</div>;
          })}
        </div>
      </div>
    </main>
  );
}
