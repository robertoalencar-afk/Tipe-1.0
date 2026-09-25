import { createFileRoute, Link } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  ClipboardList,
  CreditCard,
  HandCoins,
  Heart,
  ReceiptText,
  Star,
  Users,
} from "lucide-react";
import { TipeLogo } from "@/components/tipe/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getMesa } from "@/lib/tipe/rules";
import { createPayment, getSharedTableState, type SharedPayment } from "@/lib/tipe/payments.functions";
import { supabase } from "@/integrations/supabase/client";
import mascotThanks from "@/assets/mascot-thanks.png";
import mascotWaiting from "@/assets/mascot-waiting.png";

export const Route = createFileRoute("/mesa/$restaurante/$mesa")({
  head: () => ({
    meta: [
      { title: "Sua mesa — TIPE" },
      { name: "description", content: "Confira os pedidos da mesa, pague sua parte e avalie o atendimento com TIPE." },
      { property: "og:title", content: "Sua mesa — TIPE" },
      { property: "og:description", content: "Confira os pedidos da mesa e pague pelo celular." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: MesaPage,
});

type Etapa =
  | "identificacao"
  | "conta"
  | "pagamento-conta"
  | "conta-confirmada"
  | "conta-pendente"
  | "avaliacao"
  | "gorjeta"
  | "pagamento-gorjeta"
  | "fim";
type Aba = "conta" | "atividade";
type Metodo = "pix" | "card" | "apple_pay" | "google_pay" | "at_establishment";

const money = (v: number) => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
const metodos: Array<{ id: Metodo; label: string }> = [
  { id: "pix", label: "Pix" },
  { id: "apple_pay", label: "Apple Pay" },
  { id: "google_pay", label: "Google Pay" },
  { id: "card", label: "Cartão" },
  { id: "at_establishment", label: "Pagar no estabelecimento" },
];

const customerStorageKey = (restaurantId: string, tableId: number) =>
  `tipe:cliente:${restaurantId}:${tableId}`;
const hasFirstAndLastName = (value: string) => value.trim().split(/\s+/).length >= 2;

function MesaPage() {
  const { restaurante, mesa } = Route.useParams();
  const dados = getMesa(restaurante, Number(mesa));
  const [etapa, setEtapa] = useState<Etapa>("identificacao");
  const [nome, setNome] = useState("");
  const [aba, setAba] = useState<Aba>("conta");
  const [qtds, setQtds] = useState<Record<string, number>>(() =>
    Object.fromEntries(dados.itens.map((item) => [item.id, 0])),
  );
  const [metodoConta, setMetodoConta] = useState<Metodo | null>(null);
  const [metodoGorjeta, setMetodoGorjeta] = useState<Metodo | null>(null);
  const [estrelas, setEstrelas] = useState(0);
  const [comentario, setComentario] = useState("");
  const [gorjetaExtra, setGorjetaExtra] = useState(0);
  const [pagando, setPagando] = useState(false);
  const [erroPagamento, setErroPagamento] = useState<string | null>(null);
  const [disponiveis, setDisponiveis] = useState<Record<string, number>>(() => Object.fromEntries(dados.itens.map((item) => [item.id, item.qtd])));
  const [pagamentos, setPagamentos] = useState<SharedPayment[]>([]);

  useEffect(() => {
    const nomeSalvo = window.localStorage.getItem(customerStorageKey(restaurante, dados.mesa))?.trim();
    if (!nomeSalvo) return;
    setNome(nomeSalvo);
    setEtapa("conta");
  }, [dados.mesa, restaurante]);

  const atualizarMesa = useCallback(async () => {
    try {
      const estado = await getSharedTableState({ data: { restaurantId: restaurante, tableId: String(dados.mesa) } });
      setDisponiveis(Object.fromEntries(estado.items.map((item) => [item.item_code, Math.max(0, item.ordered_quantity - item.reserved_quantity - item.paid_quantity)])));
      setPagamentos(estado.payments);
      setQtds((atuais) => Object.fromEntries(dados.itens.map((item) => [item.id, Math.min(atuais[item.id] ?? 0, Math.max(0, estado.items.find((shared) => shared.item_code === item.id)?.ordered_quantity ?? item.qtd) - (estado.items.find((shared) => shared.item_code === item.id)?.reserved_quantity ?? 0) - (estado.items.find((shared) => shared.item_code === item.id)?.paid_quantity ?? 0))])));
    } catch {
      setErroPagamento("Não foi possível atualizar a mesa agora.");
    }
  }, [dados.itens, dados.mesa, restaurante]);

  useEffect(() => {
    void atualizarMesa();
    const channel = supabase.channel(`mesa-${restaurante}-${dados.mesa}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "table_bill_items", filter: `restaurant_slug=eq.${restaurante}` }, () => void atualizarMesa())
      .on("postgres_changes", { event: "*", schema: "public", table: "table_payment_requests", filter: `restaurant_slug=eq.${restaurante}` }, () => void atualizarMesa())
      .subscribe();
    return () => { void supabase.removeChannel(channel); };
  }, [atualizarMesa, dados.mesa, restaurante]);

  const subtotal = useMemo(
    () => dados.itens.reduce((soma, item) => soma + item.preco * (qtds[item.id] ?? 0), 0),
    [dados.itens, qtds],
  );
  const servico = +(subtotal * 0.1).toFixed(2);
  const totalConta = +(subtotal + servico).toFixed(2);

  function identificar(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nomeIdentificado = nome.trim();
    if (!hasFirstAndLastName(nomeIdentificado)) return;
    window.localStorage.setItem(customerStorageKey(restaurante, dados.mesa), nomeIdentificado);
    setNome(nomeIdentificado);
    setEtapa("conta");
  }

  function setQtd(id: string, valor: number, maximo: number) {
    setQtds((atuais) => ({ ...atuais, [id]: Math.max(0, Math.min(maximo, valor)) }));
  }

  async function processarPagamento(tipo: "conta" | "gorjeta") {
    const metodo = tipo === "conta" ? metodoConta : metodoGorjeta;
    const valor = tipo === "conta" ? totalConta : gorjetaExtra;
    if (!metodo || valor <= 0) return;
    setPagando(true);
    setErroPagamento(null);
    try {
      await createPayment({
        data: {
          method: metodo,
          amount: valor,
          tip: 0,
          tableId: String(dados.mesa),
          restaurantId: restaurante,
          idempotencyKey: `${tipo}-${restaurante}-${dados.mesa}-${Date.now()}`,
          customerName: nome.trim(),
          itemQuantities: tipo === "conta" ? qtds : {},
          target: tipo === "conta" ? "restaurant" : "tipe",
        },
      });
      await atualizarMesa();
      setEtapa(tipo === "conta" ? (metodo === "at_establishment" ? "conta-pendente" : "conta-confirmada") : "fim");
    } catch (error) {
      setErroPagamento(error instanceof Error ? error.message : "Não foi possível concluir o pagamento");
    } finally {
      setPagando(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-svh max-w-md flex-col bg-background">
      <header className="mb-5 flex flex-col items-center bg-secondary px-6 pb-5 pt-7 text-secondary-foreground">
        <TipeLogo className="h-14" />
        {etapa !== "identificacao" && (
          <p className="mt-3 text-sm text-secondary-foreground/70">
            {dados.restaurante} · Mesa {dados.mesa}
          </p>
        )}
      </header>

      {etapa === "identificacao" && (
        <main className="flex flex-1 flex-col justify-center px-6 pb-24">
          <p className="text-sm font-semibold text-primary">Mesa {dados.mesa}</p>
          <h1 className="mt-2 font-display text-3xl font-bold">Olá! Qual é o seu nome?</h1>
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            Seu nome identifica os itens que você escolher pagar nesta mesa.
          </p>
          <form onSubmit={identificar} className="mt-8">
            <label htmlFor="nome" className="text-sm font-semibold">Nome e sobrenome</label>
            <Input
              id="nome"
              autoFocus
              autoComplete="name"
              maxLength={40}
              value={nome}
              onChange={(event) => setNome(event.target.value)}
              placeholder="Digite seu nome e sobrenome"
              className="mt-2 h-12 rounded-lg bg-card px-4"
            />
            <Button type="submit" disabled={!hasFirstAndLastName(nome)} className="mt-5 h-12 w-full rounded-lg text-base font-bold">
              Ver minha mesa <ChevronRight />
            </Button>
          </form>
        </main>
      )}

      {etapa === "conta" && (
        <main className="flex flex-1 flex-col px-5 pb-8">
          <div className="mb-4 rounded-lg border border-primary/30 bg-primary/10 px-4 py-3">
            <p className="text-sm">Olá, <strong>{nome.trim()}</strong>.</p>
            <p className="mt-1 text-sm text-muted-foreground">
              Você está sendo atendido por <strong className="text-foreground">{dados.garcom}</strong>.
            </p>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-1 rounded-lg bg-muted p-1">
            <Button variant={aba === "conta" ? "outline" : "ghost"} onClick={() => setAba("conta")} className="h-10 rounded-md shadow-none">
              <ReceiptText /> Conta
            </Button>
            <Button variant={aba === "atividade" ? "outline" : "ghost"} onClick={() => setAba("atividade")} className="h-10 rounded-md shadow-none">
              <ClipboardList /> Atividade
            </Button>
          </div>

          {aba === "conta" && (
            <>
              <p className="mb-3 text-sm text-muted-foreground">Escolha quanto de cada item você vai pagar.</p>
              <ul className="flex flex-col gap-3">
                {dados.itens.filter((item) => (disponiveis[item.id] ?? item.qtd) > 0).map((item) => {
                  const quantidade = qtds[item.id] ?? 0;
                  const disponivel = disponiveis[item.id] ?? item.qtd;
                  return (
                    <li key={item.id} className={`rounded-lg border bg-card p-4 transition ${quantidade > 0 ? "border-primary/60" : "border-border"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="font-semibold">{item.nome}</p>
                           <p className="mt-1 text-xs text-muted-foreground">{money(item.preco)} cada · {disponivel} disponível{disponivel === 1 ? "" : "is"}</p>
                        </div>
                        <span className="shrink-0 text-sm font-bold">{money(item.preco * quantidade)}</span>
                      </div>
                      <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                        <span className="text-xs text-muted-foreground">Quantidade a pagar</span>
                        <select
                          value={quantidade}
                          onChange={(event) => setQtd(item.id, Number(event.target.value), disponivel)}
                          className="h-10 min-w-20 rounded-md border border-input bg-background px-3 text-sm font-bold outline-none focus:ring-1 focus:ring-ring"
                          aria-label={`Quantidade de ${item.nome}`}
                        >
                          {Array.from({ length: disponivel + 1 }, (_, numero) => (
                            <option key={numero} value={numero}>{numero}</option>
                          ))}
                        </select>
                      </div>
                    </li>
                  );
                })}
              </ul>
              {dados.itens.every((item) => (disponiveis[item.id] ?? item.qtd) <= 0) && <p className="py-10 text-center text-sm text-muted-foreground">Não há itens disponíveis para pagamento.</p>}

              <div className="mt-6 border-y border-border py-4 text-sm">
                <ResumoLinha label="Subtotal selecionado" valor={subtotal} />
                <ResumoLinha label="Serviço do restaurante (10%)" valor={servico} className="mt-2" />
                <ResumoLinha label="Total da conta" valor={totalConta} className="mt-3 border-t border-border pt-3 text-base font-bold" />
              </div>
              <Button disabled={subtotal <= 0} onClick={() => setEtapa("pagamento-conta")} className="mt-6 h-12 w-full rounded-lg text-base font-bold">
                Continuar para pagamento <ChevronRight />
              </Button>
            </>
          )}

          {aba === "atividade" && (
            <section aria-labelledby="atividade-title">
              <h2 id="atividade-title" className="mb-3 flex items-center gap-2 text-sm font-semibold"><Users className="h-4 w-4 text-primary" /> Registro dos pedidos</h2>
              <ol className="border-l border-border pl-4">
                {dados.itens.map((item) => (
                  <li key={item.id} className="relative border-b border-border py-4 first:pt-1 last:border-0">
                    <span className="absolute -left-[1.18rem] top-5 h-2 w-2 rounded-full bg-primary" />
                    <div className="flex justify-between gap-3">
                      <div><p className="font-medium">{item.qtd}× {item.nome}</p><p className="mt-1 text-xs text-muted-foreground">Pedido por {item.pedidoPor}</p></div>
                      <div className="shrink-0 text-right text-xs text-muted-foreground"><p>{item.data}</p><p>{item.hora}</p></div>
                    </div>
                  </li>
                ))}
              </ol>
               {pagamentos.length > 0 && (
                 <div className="mt-6 border-t border-border pt-5">
                   <h3 className="mb-2 text-sm font-semibold">Pagamentos</h3>
                    {pagamentos.map((pagamento) => (
                     <div key={pagamento.id} className="flex justify-between gap-3 border-b border-border py-3 text-sm last:border-0">
                       <div><p className="font-medium">{pagamento.customer_name}</p><p className="text-xs text-muted-foreground">{pagamento.payment_method === "at_establishment" ? "Pagamento no estabelecimento" : "Pagamento digital"}</p></div>
                        <div className="text-right"><p className="font-semibold">{money(pagamento.amount)}</p><p className={pagamento.status === "pending" ? "text-xs font-semibold text-highlight" : "text-xs text-primary"}>{pagamento.status === "pending" ? "Pendente de confirmação do estabelecimento" : "Pagamento confirmado"}</p></div>
                     </div>
                   ))}
                 </div>
               )}
            </section>
          )}
        </main>
      )}

      {etapa === "pagamento-conta" && (
        <Pagamento
          titulo="Pagamento da conta"
          descricao="Este pagamento será enviado ao restaurante e relacionado à conta registrada no PDV."
          rotuloValor="Total da conta"
          valor={totalConta}
          metodo={metodoConta}
          setMetodo={setMetodoConta}
          pagando={pagando}
          erro={erroPagamento}
          voltar={() => setEtapa("conta")}
          pagar={() => processarPagamento("conta")}
           permitirEstabelecimento
        />
      )}

      {etapa === "conta-pendente" && (
        <TelaCentral>
          <img src={mascotWaiting} alt="Mascote TIPE aguardando" className="mx-auto mb-3 h-44 w-44 object-contain" />
          <p className="text-sm font-semibold text-highlight">Aguardando confirmação</p>
          <h1 className="mt-2 text-2xl font-bold">Pagamento no estabelecimento</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">Os itens foram reservados. Pague na maquininha ou em dinheiro. O garçom virá em breve e o restaurante confirmará o recebimento manualmente no sistema.</p>
          <Button onClick={() => setEtapa("avaliacao")} className="mt-8 h-12 w-full rounded-lg text-base font-bold">Avaliar atendimento <ChevronRight /></Button>
          <Button variant="ghost" onClick={() => { setEtapa("conta"); setAba("atividade"); }} className="mt-2 h-11">Ver atividade da mesa</Button>
        </TelaCentral>
      )}

      {etapa === "conta-confirmada" && (
        <TelaCentral>
          <IconeSucesso />
          <p className="text-sm font-semibold text-primary">Conta paga</p>
          <h1 className="mt-2 text-2xl font-bold">Pagamento confirmado!</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">{money(totalConta)} enviados ao {dados.restaurante}.</p>
          <Button onClick={() => setEtapa("avaliacao")} className="mt-8 h-12 w-full rounded-lg text-base font-bold">Avaliar atendimento <ChevronRight /></Button>
        </TelaCentral>
      )}

      {etapa === "avaliacao" && (
        <main className="flex flex-1 flex-col px-6 pb-10">
          <h1 className="text-center text-2xl font-bold">Como foi seu atendimento?</h1>
          <p className="mt-2 text-center text-sm text-muted-foreground">Sua avaliação ajuda o {dados.garcom} e o restaurante.</p>
          <div className="mt-8 flex justify-center gap-2">
            {[1, 2, 3, 4, 5].map((numero) => (
              <Button key={numero} variant="ghost" size="icon" onClick={() => setEstrelas(numero)} aria-label={`${numero} estrelas`} className="h-11 w-11">
                <Star className={`h-8 w-8 ${numero <= estrelas ? "fill-highlight text-highlight" : "text-border"}`} />
              </Button>
            ))}
          </div>
          <label htmlFor="comentario" className="mt-8 text-sm font-semibold">Comentário <span className="font-normal text-muted-foreground">(opcional)</span></label>
          <Textarea id="comentario" value={comentario} onChange={(event) => setComentario(event.target.value)} placeholder="Conte como foi sua experiência" maxLength={400} className="mt-2 min-h-28 rounded-lg bg-card" />
          <Button onClick={() => setEtapa("gorjeta")} className="mt-6 h-12 rounded-lg text-base font-bold">Continuar <ChevronRight /></Button>
        </main>
      )}

      {etapa === "gorjeta" && (
        <main className="flex flex-1 flex-col px-6 pb-10">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-primary/15"><Heart className="h-7 w-7 text-primary" /></div>
          <h1 className="mt-5 text-center text-2xl font-bold">Quer deixar uma gorjeta extra?</h1>
           <p className="mt-2 text-center text-sm leading-6 text-muted-foreground">Uma forma opcional de agradecer pelo atendimento.</p>
          <div className="mt-7 grid grid-cols-2 gap-3">
            {[5, 10, 15, 20].map((valor) => (
              <Button key={valor} variant={gorjetaExtra === valor ? "default" : "outline"} onClick={() => setGorjetaExtra(valor)} className="h-14 rounded-lg text-base font-bold">{money(valor)}</Button>
            ))}
          </div>
          <Button disabled={gorjetaExtra <= 0} onClick={() => setEtapa("pagamento-gorjeta")} className="mt-6 h-12 rounded-lg text-base font-bold">Continuar com gorjeta <ChevronRight /></Button>
          <Button variant="ghost" onClick={() => setEtapa("fim")} className="mt-2 h-11">Agora não, obrigado</Button>
        </main>
      )}

      {etapa === "pagamento-gorjeta" && (
        <Pagamento
          titulo="Pagamento da gorjeta"
           descricao="Cobrança opcional e separada da conta."
          rotuloValor="Gorjeta extra"
          valor={gorjetaExtra}
          metodo={metodoGorjeta}
          setMetodo={setMetodoGorjeta}
          pagando={pagando}
          erro={erroPagamento}
          voltar={() => setEtapa("gorjeta")}
          pagar={() => processarPagamento("gorjeta")}
        />
      )}

      {etapa === "fim" && (
        <TelaCentral>
          <img src={mascotThanks} alt="Mascote TIPE agradecendo" className="mx-auto h-48 w-48 object-contain" />
          <p className="mt-5 text-sm font-semibold text-primary">Tudo certo, {nome.trim()}!</p>
          <h1 className="mt-2 text-2xl font-bold">Obrigado pela sua visita.</h1>
          <p className="mt-3 text-center text-sm leading-6 text-muted-foreground">Sua conta foi paga e sua avaliação foi registrada.</p>
          {gorjetaExtra > 0 && <p className="mt-2 text-center text-sm font-semibold">Gorjeta de {money(gorjetaExtra)} enviada pela TIPE.</p>}
          <Link to="/" className="mt-8 text-sm font-semibold text-primary">Voltar ao início</Link>
        </TelaCentral>
      )}
    </div>
  );
}

function ResumoLinha({ label, valor, className = "" }: { label: string; valor: number; className?: string }) {
  return <div className={`flex justify-between gap-4 ${className}`}><span className="text-muted-foreground">{label}</span><span>{money(valor)}</span></div>;
}

function Pagamento({ titulo, descricao, rotuloValor, valor, metodo, setMetodo, pagando, erro, voltar, pagar, permitirEstabelecimento = false }: {
  titulo: string;
  descricao: string;
  rotuloValor: string;
  valor: number;
  metodo: Metodo | null;
  setMetodo: (metodo: Metodo) => void;
  pagando: boolean;
  erro: string | null;
  voltar: () => void;
  pagar: () => void;
  permitirEstabelecimento?: boolean;
}) {
  const opcoes = permitirEstabelecimento ? metodos : metodos.filter((opcao) => opcao.id !== "at_establishment");
  return (
    <main className="flex flex-1 flex-col px-5 pb-8">
      <Button variant="ghost" onClick={voltar} className="mb-4 w-fit px-2 text-muted-foreground"><ArrowLeft /> Voltar</Button>
      <h1 className="text-2xl font-bold">{titulo}</h1>
      <p className="mt-2 text-sm leading-6 text-muted-foreground">{descricao}</p>
      <div className="my-6 border-y border-border py-5 text-center">
        <p className="text-xs text-muted-foreground">{rotuloValor}</p>
        <p className="mt-1 font-display text-3xl font-bold">{money(valor)}</p>
      </div>
      <h2 className="text-sm font-semibold">Como deseja pagar?</h2>
      <div className="mt-3 grid grid-cols-2 gap-2">
        {opcoes.map((opcao) => (
          <Button key={opcao.id} variant={metodo === opcao.id ? "default" : "outline"} onClick={() => setMetodo(opcao.id)} className="h-12 rounded-lg">
            {opcao.id === "at_establishment" ? <HandCoins /> : <CreditCard />} {opcao.label}
          </Button>
        ))}
      </div>
      {erro && <p role="alert" className="mt-4 text-sm text-destructive">{erro}</p>}
      <Button disabled={!metodo || pagando} onClick={pagar} className="mt-6 h-12 rounded-lg text-base font-bold">{pagando ? "Processando…" : `Pagar ${money(valor)}`}</Button>
       {metodo === "at_establishment" && <p className="mt-3 text-center text-xs text-muted-foreground">Pague na maquininha ou em dinheiro. A confirmação será feita pelo estabelecimento.</p>}
    </main>
  );
}

function IconeSucesso() {
  return <div className="mx-auto mb-5 flex h-20 w-20 items-center justify-center rounded-full bg-primary/15"><Check className="h-10 w-10 text-primary" /></div>;
}

function TelaCentral({ children }: { children: React.ReactNode }) {
  return <main className="flex flex-1 flex-col items-center justify-center px-6 pb-20 text-center">{children}</main>;
}