import { createFileRoute } from "@tanstack/react-router";
import type { ReactNode } from "react";
import {
  BotaoPrincipal,
  BotaoSecundario,
  FaixaCta,
  Secao,
  SitePage,
  Titulo,
} from "@/components/tipe/site/Site";

// Documentação pública da API TIPE para quem desenvolve PDVs e sistemas de gestão.
// Fonte da verdade: src/lib/tipe/pdv/adapters/api-tipe.server.ts, src/routes/api/public/pdv.*.ts
// e src/lib/tipe/pdv/contract.ts (MAX_TENTATIVAS, esperaAntesDaTentativa). Mude os dois juntos.

const TITLE = "API TIPE · Ligue o seu PDV ao pagamento na mesa";
const DESC =
  "Documentação da API TIPE: envie mesas e itens do seu PDV, receba o aviso de pagamento assinado e consulte os pagamentos feitos pelo QR da mesa.";

export const Route = createFileRoute("/desenvolvedores")({
  head: () => ({
    meta: [
      { title: TITLE },
      { name: "description", content: DESC },
      { property: "og:title", content: TITLE },
      { property: "og:description", content: DESC },
      { property: "og:url", content: "https://tipe.digital/desenvolvedores" },
    ],
    links: [{ rel: "canonical", href: "https://tipe.digital/desenvolvedores" }],
  }),
  component: Desenvolvedores,
});

const ENTRADA = `POST https://tipe.digital/api/public/pdv/api_tipe/webhook
content-type: application/json
x-tipe-restaurant: bistro-teste
x-tipe-timestamp: 1764111600
x-tipe-signature: v1=5c1f…(64 hex)

{
  "events": [
    { "event_id": "pdv-889-1", "type": "table_opened", "table": { "number": "12" } },
    { "event_id": "pdv-889-2", "type": "item_added", "table": { "number": "12" },
      "item": { "external_id": "linha-4471", "code": "PF01", "name": "Moqueca baiana",
                "unit_price": 89.9, "quantity": 1, "waiter_name": "Joyce" } },
    { "event_id": "pdv-889-3", "type": "item_cancelled", "table": { "number": "12" },
      "item": { "external_id": "linha-4471", "quantity": 1 }, "reason": "Pedido errado" },
    { "event_id": "pdv-889-4", "type": "table_closed", "table": { "number": "12" } }
  ]
}`;

const RESPOSTA_ENTRADA = `200 OK
{ "results": [
  { "eventId": "pdv-889-1", "result": "ok" },
  { "eventId": "pdv-889-2", "result": "ok" },
  { "eventId": "pdv-889-3", "result": "ok" },
  { "eventId": "pdv-889-4", "result": "duplicate" }
] }`;

const ASSINAR = `import crypto from "node:crypto";

// O segredo (whsec_…) aparece uma vez na Gestão. A chave de assinatura é o sha256 dele.
const chave = crypto.createHash("sha256").update(process.env.TIPE_SEGREDO).digest("hex");

export function assinar(corpo) {
  const ts = Math.floor(Date.now() / 1000).toString();
  const sig = crypto.createHmac("sha256", chave).update(\`\${ts}.\${corpo}\`).digest("hex");
  return { "x-tipe-timestamp": ts, "x-tipe-signature": \`v1=\${sig}\` };
}

const corpo = JSON.stringify({ events: [/* … */] });
await fetch("https://tipe.digital/api/public/pdv/api_tipe/webhook", {
  method: "POST",
  headers: { "content-type": "application/json", "x-tipe-restaurant": "bistro-teste", ...assinar(corpo) },
  body: corpo,
});`;

const AVISO = `POST https://seu-pdv.com.br/tipe/aviso
content-type: application/json
user-agent: Tipe-Webhook/1
x-tipe-timestamp: 1764111720
x-tipe-signature: v1=9a0b…(64 hex)

{
  "event_id": "pay-7d0c2b6e-…",
  "type": "payment.approved",
  "restaurant": "bistro-teste",
  "table": "12",
  "payment_id": "7d0c2b6e-…",
  "amount": 98.89,
  "method": "pix",
  "items": [ { "code": "PF01", "quantity": 1 } ],
  "sent_at": "2026-11-25T23:02:00.000Z"
}`;

const VERIFICAR = `// Express: use o corpo CRU, antes de qualquer JSON.parse.
app.post("/tipe/aviso", express.text({ type: "*/*" }), (req, res) => {
  const ts = req.get("x-tipe-timestamp") ?? "";
  const recebida = (req.get("x-tipe-signature") ?? "").replace(/^v1=/, "");
  const esperada = crypto.createHmac("sha256", chave).update(\`\${ts}.\${req.body}\`).digest("hex");
  const recente = Math.abs(Date.now() / 1000 - Number(ts)) <= 300;
  if (!recente || recebida.length !== 64 ||
      !crypto.timingSafeEqual(Buffer.from(recebida), Buffer.from(esperada))) return res.sendStatus(401);
  const aviso = JSON.parse(req.body);
  if (aviso.type === "ping") return res.sendStatus(200);       // botão "Enviar aviso de teste"
  darBaixa(aviso.table, aviso.items, aviso.amount, aviso.event_id); // idempotente por event_id
  res.sendStatus(200);
});`;

const CONSULTA = `const caminho = "/api/public/pdv/pagamentos?since=2026-11-25T00:00:00Z";
const ts = Math.floor(Date.now() / 1000).toString();
const sig = crypto.createHmac("sha256", chave).update(\`\${ts}.GET \${caminho}\`).digest("hex");
const r = await fetch("https://tipe.digital" + caminho, {
  headers: { "x-tipe-restaurant": "bistro-teste", "x-tipe-timestamp": ts, "x-tipe-signature": \`v1=\${sig}\` },
});
// { "payments": [ { "id", "table", "status", "amount", "method", "items": [{ "code", "quantity" }],
//                   "cash_received", "change_due", "created_at" } ] }`;

function Codigo({ children, rotulo }: { children: string; rotulo: string }) {
  return (
    <figure className="min-w-0">
      <figcaption className="mb-2 text-sm font-medium text-muted-foreground">{rotulo}</figcaption>
      <pre className="overflow-x-auto rounded-xl border bg-muted/50 p-4 text-[0.8rem] leading-relaxed">
        <code>{children}</code>
      </pre>
    </figure>
  );
}

function Bloco({ id, titulo, children }: { id: string; titulo: string; children: ReactNode }) {
  return (
    <section id={id} className="scroll-mt-24 space-y-4 border-t pt-10">
      <h2 className="font-display text-2xl tracking-[-0.03em] sm:text-3xl">{titulo}</h2>
      <div className="max-w-3xl space-y-3 text-[1.02rem] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}

const C = ({ children }: { children: ReactNode }) => (
  <code className="rounded bg-muted px-1 py-0.5 text-[0.9em] text-foreground">{children}</code>
);

function Desenvolvedores() {
  return (
    <SitePage>
      <Secao tema="claro" className="-mt-16 !pt-32 sm:!pt-40">
        <div className="container-page grid items-end gap-8 lg:grid-cols-[1.15fr_0.85fr] lg:gap-10">
          <Titulo
            as="h1"
            rotulo="API TIPE"
            titulo="Ligue o seu PDV ao pagamento na mesa."
            texto="O seu sistema continua lançando os pedidos. A Tipe mostra a conta no QR da mesa, recebe o pagamento e avisa o seu sistema para dar baixa."
          />
          <div className="flex flex-wrap gap-3 lg:justify-end">
            <BotaoPrincipal>Falar com a equipe</BotaoPrincipal>
            <BotaoSecundario href="#ativar">Começar</BotaoSecundario>
          </div>
        </div>
      </Secao>

      <Secao tema="claro" className="!pt-0">
        <div className="container-page space-y-10">
          <ol className="grid gap-4 sm:grid-cols-3">
            {[
              [
                "1. Seu PDV envia",
                "Mesas e itens chegam à Tipe por webhook assinado, um evento por mudança.",
              ],
              [
                "2. O cliente paga",
                "No QR da mesa, por itens, com Pix, carteiras digitais ou no estabelecimento.",
              ],
              [
                "3. A Tipe avisa",
                "Pagamento aprovado vai para o seu sistema, assinado, com novas tentativas.",
              ],
            ].map(([t, d]) => (
              <li key={t} className="rounded-2xl border p-5">
                <p className="font-display text-lg">{t}</p>
                <p className="mt-1 text-sm text-muted-foreground">{d}</p>
              </li>
            ))}
          </ol>

          <Bloco id="ativar" titulo="Ativar">
            <p>
              O dono do restaurante entra em{" "}
              <strong>Gestão → Integrações → API TIPE para o seu PDV</strong> e toca em{" "}
              <strong>Ativar API TIPE</strong>. A tela mostra uma única vez o endereço do webhook e
              o segredo (<C>whsec_…</C>). Se o segredo vazar, use{" "}
              <strong>Gerar novo segredo</strong>: o anterior para na hora.
            </p>
            <p>
              O identificador do restaurante é o endereço dele na Tipe (
              <C>tipe.digital/bistro-teste</C> → <C>bistro-teste</C>), enviado no cabeçalho{" "}
              <C>x-tipe-restaurant</C>.
            </p>
            <p>
              Para testar, use um restaurante de teste com mesas de teste. Nenhum dado de cliente
              real é necessário.
            </p>
          </Bloco>

          <Bloco id="assinatura" titulo="Assinatura">
            <p>
              Todas as chamadas, nos dois sentidos, usam a mesma assinatura: <C>HMAC-SHA256</C> de{" "}
              <C>{"{timestamp}.{corpo}"}</C>, com a chave <C>sha256_hex(segredo)</C>. O segredo
              nunca trafega. Carimbos com mais de 5 minutos de diferença são recusados.
            </p>
          </Bloco>
          <Codigo rotulo="Node.js: assinar e enviar">{ASSINAR}</Codigo>

          <Bloco id="entrada" titulo="Enviar mesas e itens">
            <p>
              Até 100 eventos por chamada. Cada <C>event_id</C> é processado uma única vez: reenviar
              o mesmo evento devolve <C>duplicate</C>, sem lançar o item de novo.
            </p>
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <C>table_opened</C>: abre a mesa (cria a mesa na Tipe se ainda não existir, dentro
                do limite do plano).
              </li>
              <li>
                <C>item_added</C>: lança o item. Envie <C>code</C> ou <C>external_id</C>; preço em
                reais.
              </li>
              <li>
                <C>item_cancelled</C>: cancela a quantidade. Se o item já foi pago pela Tipe, ele
                não é cancelado e o painel do restaurante mostra o alerta.
              </li>
              <li>
                <C>table_closed</C>: encerra a conta e arquiva os pagamentos. É recusado se houver
                pagamento em andamento.
              </li>
            </ul>
          </Bloco>
          <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
            <Codigo rotulo="Requisição">{ENTRADA}</Codigo>
            <Codigo rotulo="Resposta">{RESPOSTA_ENTRADA}</Codigo>
          </div>

          <Bloco id="aviso" titulo="Receber o aviso de pagamento">
            <p>
              Cadastre em Integrações o <strong>endereço de aviso</strong> (https, domínio público).
              A cada pagamento aprovado da conta, a Tipe envia um <C>POST</C> assinado. Responda{" "}
              <C>2xx</C> em até 8 segundos.
            </p>
            <p>
              Sem resposta, a Tipe tenta de novo com espera crescente (30 s, 1 min, 2 min… até 30
              min), por até 8 tentativas. Depois disso, o pagamento vira uma pendência no painel do
              restaurante para baixa manual. Use o <C>event_id</C> para não dar baixa duas vezes.
            </p>
            <p>
              Gorjeta extra do cliente não entra no aviso: ela não faz parte da conta do
              restaurante. No pagamento no estabelecimento, <C>method</C> traz a forma registrada
              pelo caixa (<C>cash</C> ou <C>card_terminal</C>).
            </p>
            <p>
              O botão <strong>Enviar aviso de teste</strong> manda um evento <C>{'type: "ping"'}</C>{" "}
              assinado para o seu endereço.
            </p>
          </Bloco>
          <div className="grid gap-4 lg:grid-cols-2">
            <Codigo rotulo="O que o seu sistema recebe">{AVISO}</Codigo>
            <Codigo rotulo="Node.js: verificar a assinatura">{VERIFICAR}</Codigo>
          </div>

          <Bloco id="consulta" titulo="Consultar pagamentos">
            <p>
              Se o seu sistema não recebe chamadas da internet, consulte os pagamentos da conta. A
              assinatura usa a linha <C>{"GET {caminho com query}"}</C> no lugar do corpo. Sem{" "}
              <C>since</C>, devolve as últimas 24 horas. Inclui mesas já encerradas.
            </p>
          </Bloco>
          <Codigo rotulo="Consulta assinada">{CONSULTA}</Codigo>

          <Bloco id="erros" titulo="Respostas de erro">
            <ul className="list-disc space-y-1 pl-5">
              <li>
                <C>401 unauthorized</C>: restaurante, assinatura ou carimbo inválidos, ou API TIPE
                desativada.
              </li>
              <li>
                <C>400 invalid_payload</C>: o corpo não segue o formato acima.
              </li>
              <li>
                <C>413 payload_too_large</C>: corpo acima de 200 KB.
              </li>
              <li>
                <C>429 rate_limited</C>: mais de 300 chamadas por minuto (120 na consulta). Espere e
                reenvie.
              </li>
              <li>
                Dentro de <C>results</C>, <C>error:…</C> explica o evento que não entrou (por
                exemplo, limite de mesas do plano).
              </li>
            </ul>
          </Bloco>
        </div>
      </Secao>
      <FaixaCta
        titulo="Seu PDV, pagamento na mesa."
        texto="Fale com a equipe Tipe para ativar o primeiro restaurante e acompanhar os testes."
      />
    </SitePage>
  );
}
