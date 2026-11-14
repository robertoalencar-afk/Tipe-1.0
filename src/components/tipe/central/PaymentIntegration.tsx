import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Aviso, Painel, StatusBadge } from "@/components/tipe/painel/ui";
import {
  getPaymentIntegrationStatus,
  validatePlatformPaymentApi,
} from "@/lib/tipe/payment-integration.functions";

export function PaymentIntegration() {
  const getStatus = useServerFn(getPaymentIntegrationStatus);
  const validate = useServerFn(validatePlatformPaymentApi);
  const q = useQuery({ queryKey: ["central-payment-integration"], queryFn: () => getStatus() });
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  if (q.isPending) return <p role="status">Consultando integração de pagamentos…</p>;
  if (q.isError)
    return (
      <Aviso tone="warning">
        Não foi possível consultar a integração.{" "}
        <button className="underline" onClick={() => q.refetch()}>
          Tentar novamente
        </button>
      </Aviso>
    );
  const d = q.data;
  const checks = [
    ["API da Tipe (assinaturas e gorjetas)", d.platform.configured],
    ["Tokenização de cartão da assinatura", d.platform.publicKey],
    ["Autenticação do webhook da Tipe", d.platform.webhook],
    ["Recebedor da plataforma para gorjetas", d.platform.tipRecipient],
    ["Identificação comercial Google Pay", d.platform.googleMerchant],
  ] as const;
  return (
    <div className="space-y-4">
      <Painel
        titulo="Integração Pagar.me"
        descricao="Configuração da Tipe e conexões dos restaurantes"
      >
        <p className="text-sm text-muted-foreground">
          A API da Tipe atende assinaturas e gorjetas. As contas das mesas usam a conexão Pagar.me
          de cada restaurante e o dinheiro vai para o próprio estabelecimento.
        </p>
        <ul className="mt-4 divide-y divide-border">
          {checks.map(([label, ok]) => (
            <li
              key={label}
              className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
            >
              <span>{label}</span>
              <StatusBadge tone={ok ? "success" : "warning"}>
                {ok ? "Configurado" : "Configurar"}
              </StatusBadge>
            </li>
          ))}
        </ul>
        <p className="mt-3 text-sm">
          Ambiente da API Tipe:{" "}
          {d.platform.mode === "live"
            ? "produção"
            : d.platform.mode === "test"
              ? "teste"
              : "não configurado"}
          .
        </p>
        <Button
          className="mt-4"
          disabled={busy || !d.platform.configured}
          onClick={async () => {
            setBusy(true);
            setResult(null);
            try {
              setResult(await validate());
              await q.refetch();
            } catch (e) {
              setResult({
                ok: false,
                message: e instanceof Error ? e.message : "Não foi possível validar a API.",
              });
            } finally {
              setBusy(false);
            }
          }}
        >
          {busy ? "Validando…" : "Validar API da Tipe"}
        </Button>
        {result && (
          <div className="mt-3" role="status">
            <Aviso tone={result.ok ? "neutral" : "warning"}>{result.message}</Aviso>
          </div>
        )}
      </Painel>
      <Painel titulo="Pagamento direto pelo cliente">
        <p className="text-sm">
          Restaurantes com conexão de produção: {d.restaurants.live}. Em teste: {d.restaurants.test}
          . Empresas de demonstração conectadas: {d.restaurants.demo}.
        </p>
        <p className="mt-3 text-sm text-muted-foreground">
          O proprietário conecta a conta em Recebimentos no painel do restaurante e configura o
          webhook indicado. Pix depende de habilitação na Pagar.me; carteiras exigem aprovação
          própria. As empresas de demonstração continuam sem cobrança real.
        </p>
      </Painel>
      <Painel titulo="Configurar o ambiente da Tipe">
        <p className="text-sm text-muted-foreground">
          As credenciais ficam nos segredos de implantação do repositório e são enviadas ao Worker
          pelo pipeline. Use PAGARME_SECRET_KEY, PAGARME_PUBLIC_KEY, PAGARME_WEBHOOK_SECRET e
          PAGARME_TIPE_RECIPIENT_ID; GOOGLE_PAY_MERCHANT_ID é uma variável de produção. Os valores
          nunca são exibidos nesta Central.
        </p>
        <a
          className="mt-3 inline-block text-sm underline"
          href="https://github.com/robertoalencar-afk/Tipe-1.0/settings/secrets/actions"
          target="_blank"
          rel="noreferrer"
        >
          Abrir configuração segura de implantação
        </a>
      </Painel>
    </div>
  );
}
