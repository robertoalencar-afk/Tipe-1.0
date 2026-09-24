import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronRight, ClipboardList, Minus, Plus, ReceiptText, Star, Users } from "lucide-react";
import { Logo } from "@/components/tipe/Logo";
import { getMesa, splitGorjeta } from "@/lib/tipe/rules";
import { createPayment } from "@/lib/tipe/payments.functions";

export const Route = createFileRoute("/mesa/$restaurante/$mesa")({
  head: () => ({
    meta: [
      { title: "TIPE — Sua conta" },
      { name: "description", content: "Veja sua conta, escolha o que pagar e deixe a gorjeta." },
    ],
  }),
  component: MesaPage,
});

type Etapa = "conta" | "pagamento" | "fim";
type Aba = "conta" | "atividade";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function MesaPage() {
  const { restaurante, mesa } = Route.useParams();
  const dados = getMesa(restaurante, Number(mesa));

  const [etapa, setEtapa] = useState<Etapa>("conta");
  const [aba, setAba] = useState<Aba>("conta");
  const [qtds, setQtds] = useState<Record<string, number>>(() =>
    Object.fromEntries(dados.itens.map((i) => [i.id, 0])),
  );
  const [estrelas, setEstrelas] = useState(0);
  const [gorjetaExtra, setGorjetaExtra] = useState(0);
  const [metodo, setMetodo] = useState<string | null>(null);
  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);

  const subtotal = useMemo(
    () => dados.itens.reduce((s, i) => s + i.preco * (qtds[i.id] ?? 0), 0),
    [dados, qtds],
  );
  const servico = subtotal * 0.1;
  const total = subtotal + servico + gorjetaExtra;
  const split = splitGorjeta(gorjetaExtra);
  const nadaSelecionado = subtotal <= 0;

  const setQtd = (id: string, v: number, max: number) =>
    setQtd((q) => ({ ...q, [id]: Math.max(0, Math.min(max, v)) }));

  async function pagar() {
    if (!metodo) return;
    setPagando(true);
    setErroPagamento(null);
    try {
      await createPayment({
        data: {
          method: metodo === "cartao" ? "card" : (metodo as "pix" | "apple_pay" | "google_pay"),
          amount: subtotal + servico,
          tip: gorjetaExtra,
          tableId: String(dados.mesa),
          restaurantId: dados.restaurante,
          idempotencyKey: `${dados.restaurante}-${dados.mesa}-${Date.now()}`,
        },
      });
      setEtapa("fim");
    } catch (e) {
      setErroPagamento(e instanceof Error ? e.message : "Falha no pagamento");
    } finally {
      setPagando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-background">
      {/* topo — logo sempre protagonista */}
      <header className="flex flex-col items-center gap-1 px-6 pb-4 pt-8">
        <Logo className="h-11 w-auto" />
        <p className="mt-2 text-sm text-muted-foreground">
          {dados.restaurante} · Mesa {dados.mesa}
        </p>
      </header>

      {etapa === "conta" && (
        <main className="flex flex-1 flex-col px-5 pb-8">
          {/* abas */}
          <div className="mb-5 grid grid-cols-2 gap-1 rounded-full bg-muted p-1">
            {(
              [
                ["conta", "Conta", ReceiptText],
                ["atividade", "Atividade", ClipboardList],
              ] as const
            ).map(([id, label, Icon]) => (
              <button
                key={id}
                onClick={() => setAba(id)}
                className={`flex items-center justify-center gap-2 rounded-full py-2 text-sm font-semibold transition ${
                  aba === id ? "bg-card text-foreground shadow-sm" : "text-muted-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          {aba === "conta" && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">
                Escolha a quantidade de cada item que você vai pagar.
              </p>
              <ul className="flex flex-col gap-3">
                {dados.itens.map((i) => {
                  const q = qtds[i.id] ?? 0;
                  return (
                    <li
                      key={i.id}
                      className={`rounded-2xl border p-4 transition ${
                        q > 0 ? "border-primary/40 bg-card" : "border-border bg-card"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium">{i.nome}</p>
                          <p className="text-xs text-muted-foreground">
                            {money(i.preco)} · pedido por {i.pedidoPor} às {i.hora}
                          </p>
                        </div>
                        <span className="text-sm font-semibold">{money(i.preco * q)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between">
                        <span className="text-xs text-muted-foreground">
                          {q} de {i.qtd}
                        </span>
                        {/* caixinha de quantidade que desce as opções */}
                        <select
                          value={q}
                          onChange={(e) => setQtd(i.id, Number(e.target.value), i.qtd)}
                          className="rounded-xl border border-border bg-background px-3 py-2 text-sm font-semibold outline-none focus:border-primary"
                          aria-label={`Quantidade de ${i.nome}`}
                        >
                          {Array.from({ length: i.qtd + 1 }, (_, n) => (
                            <option key={n} value={n}>
                              {n}
                            </option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>

              <div className="mt-6 rounded-2xl bg-muted p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span>{money(subtotal)}</span>
                </div>
                <div className="mt-1 flex justify-between">
                  <span className="text-muted-foreground">Serviço (10%)</span>
                  <span>{money(servico)}</span>
                </div>
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-base font-bold">
                  <span>Total</span>
                  <span>{money(total)}</span>
                </div>
              </div>

              <button
                disabled={nadaSelecionado}
                onClick={() => setEtapa("pagamento")}
                className="mt-6 flex items-center justify-center gap-2 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40"
              >
                Continuar para pagamento
                <ChevronRight className="h-5 w-5" />
              </button>
            </>
          )}

          {aba === "atividade" && (
            <div className="rounded-2xl border border-border bg-card p-4">
              <h3 className="mb-3 flex items-center gap-2 text-sm font-semibold">
                <Users className="h-4 w-4 text-primary" />
                Registro dos pedidos
              </h3>
              <ul className="flex flex-col gap-3 text-sm">
                {dados.itens.map((i) => (
                  <li key={i.id} className="flex items-start justify-between gap-3 border-b border-border pb-3 last:border-0 last:pb-0">
                    <div>
                      <p className="font-medium">
                        {i.qtd}× {i.nome}
                      </p>
                      <p className="text-xs text-muted-foreground">Pedido por {i.pedidoPor}</p>
                    </div>
                    <div className="text-right text-xs text-muted-foreground">
                      <p>{i.data}</p>
                      <p>{i.hora}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </main>
      )}

      {etapa === "pagamento" && (
        <main className="flex flex-1 flex-col px-5 pb-8">
          <button
            onClick={() => setEtapa("conta")}
            className="mb-4 flex items-center gap-1 text-sm text-muted-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> Voltar
          </button>

          <h2 className="text-lg font-bold">Como foi seu atendimento?</h2>
          <div className="mt-3 flex gap-2">
            {[1, 2, 3, 4, 5].map((n) => (
              <button key={n} onClick={() => setEstrelas(n)} aria-label={`${n} estrelas`}>
                <Star
                  className={`h-8 w-8 ${n <= estrelas ? "fill-primary text-primary" : "text-border"}`}
                />
              </button>
            ))}
          </div>

          <h3 className="mt-6 text-sm font-semibold">Gorjeta extra para o garçom</h3>
          <div className="mt-2 flex flex-wrap gap-2">
            {[0, 5, 10, 20].map((v) => (
              <button
                key={v}
                onClick={() => setGorjetaExtra(v)}
                className={`rounded-full border px-4 py-2 text-sm font-medium ${
                  gorjetaExtra === v
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-border bg-card"
                }`}
              >
                {v === 0 ? "Sem extra" : money(v)}
              </button>
            ))}
          </div>
          {gorjetaExtra > 0 && (
            <p className="mt-2 text-xs text-muted-foreground">
              {money(split.garcom)} para o garçom · {money(split.tipe)} TIPE · {money(split.restaurante)} restaurante
            </p>
          )}

          <h3 className="mt-6 text-sm font-semibold">Forma de pagamento</h3>
          <div className="mt-2 grid grid-cols-2 gap-2">
            {[
              ["pix", "Pix"],
              ["apple_pay", "Apple Pay"],
              ["google_pay", "Google Pay"],
              ["cartao", "Cartão"],
            ].map(([id, label]) => (
              <button
                key={id}
                onClick={() => setMetodo(id ?? null)}
                className={`rounded-2xl border py-3 text-sm font-medium ${
                  metodo === id ? "border-primary bg-primary/10 text-primary" : "border-border bg-card"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {erroPagamento && <p className="mt-3 text-sm text-destructive">{erroPagamento}</p>}

          <button
            disabled={!metodo || pagando}
            onClick={pagar}
            className="mt-6 rounded-2xl bg-primary py-4 font-semibold text-primary-foreground disabled:opacity-40"
          >
            {pagando ? "Processando…" : `Pagar ${money(total)}`}
          </button>
          <p className="mt-3 text-center text-xs text-muted-foreground">
            Demonstração — o pagamento real é ativado quando as chaves do Pagar.me e da Stripe forem cadastradas.
          </p>
        </main>
      )}

      {etapa === "fim" && <Fim dados={dados} total={total} />}
    </div>
  );
}

function Fim({ dados, total }: { dados: ReturnType<typeof getMesa>; total: number }) {
  const status = "paga (demonstração)";

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-6 pb-16 text-center">
      <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/15">
        <Check className="h-10 w-10 text-primary" />
      </div>
      <h2 className="mt-4 text-2xl font-bold">Pagamento confirmado!</h2>
      <p className="mt-2 text-muted-foreground">
        {money(total)} pagos na mesa {dados.mesa} · {dados.restaurante}
      </p>
      <p className="mt-4 rounded-full bg-muted px-4 py-2 text-xs text-muted-foreground">
        Status da mesa no PDV: {status}
      </p>
      <Link to="/" className="mt-8 text-sm font-medium text-primary">
        Voltar ao início
      </Link>
    </main>
  );
}
