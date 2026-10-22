# faq-ai-cache-worker

Cloudflare Worker em TypeScript com uma rota pública, `GET /faq/refund`, que responde a pergunta
"Como funciona o reembolso?" de um **serviço fictício**. A resposta é gerada por um modelo do
Workers AI **roteado pelo AI Gateway via API REST**, com o cache nativo do gateway
(`faq:refund:v1`, TTL de 3600 s).

Este diretório é independente do app Tipe que está na raiz do repositório: tem `package.json`,
lockfile e configuração próprios e não altera nada do app.

## Como funciona

```
cliente --GET /faq/refund--> Worker --POST /ai/v1/chat/completions--> AI Gateway --MISS--> Workers AI
                                         cf-aig-gateway-id: default        |
                                         cf-aig-cache-key: faq:refund:v1   +--HIT--> resposta do cache
                                         cf-aig-cache-ttl: 3600
```

1. O Worker valida método (só `GET`/`OPTIONS`), rota, parâmetros (nenhum aceito) e o rate limit.
2. Monta um corpo **determinístico**: mesmo prompt, mesma ordem, `temperature: 0`, `max_tokens: 200`,
   sem streaming. A política vem de dado estático em `src/faq.ts`.
3. Chama `https://api.cloudflare.com/client/v4/accounts/{ACCOUNT_ID}/ai/v1/chat/completions` com o
   header `cf-aig-gateway-id`. É isso que faz a chamada passar pelo AI Gateway; chamar o Workers AI
   sem esse header (ou pelo binding sem `gateway`) **não** usaria o cache do gateway.
4. O gateway responde do cache (`HIT`) ou consulta o modelo (`MISS`) e devolve `cf-aig-cache-status`.
5. O Worker repassa **o valor real** desse header ao cliente, no header e em `cache.status`.
   Se o gateway não enviar o header, o Worker não o inventa: `cache.status` vem `null`.

Resposta de exemplo (o texto de `answer` e o `status` vêm do gateway):

```json
{
  "success": true,
  "faq": "refund",
  "question": "Como funciona o reembolso?",
  "answer": "…texto gerado pelo modelo…",
  "cache": { "key": "faq:refund:v1", "status": "HIT", "ttl": 3600 },
  "provider": "cloudflare-workers-ai",
  "model": "@cf/meta/llama-3.1-8b-instruct-fp8-fast",
  "gateway": { "logId": "…ou null…" },
  "disclaimer": "Política fictícia de exemplo. Não é orientação jurídica."
}
```

Erros seguem `{ "success": false, "error": { "code", "message" } }`:

| HTTP | code | quando |
| --- | --- | --- |
| 400 | `invalid_parameters` | qualquer query string |
| 404 | `not_found` | rota diferente de `/faq/refund` |
| 405 | `method_not_allowed` | método diferente de `GET`/`OPTIONS` |
| 429 | `rate_limited` | mais de 30 req/min por IP (por localidade Cloudflare) |
| 500 | `config_missing` | faltam os segredos |
| 502 | `upstream_unavailable` | falha de rede, autenticação, 5xx ou resposta sem texto do gateway |
| 504 | `upstream_timeout` | o gateway não respondeu em `UPSTREAM_TIMEOUT_MS` (15 s) |

## Decisões

- **Endpoint REST atual** (`/ai/v1/chat/completions`, formato OpenAI) em vez do binding `env.AI`,
  porque o pedido é usar a API REST do gateway. Documentação:
  [REST API](https://developers.cloudflare.com/ai-gateway/usage/rest-api/),
  [Caching](https://developers.cloudflare.com/ai-gateway/features/caching/),
  [Get started](https://developers.cloudflare.com/ai-gateway/get-started/).
- **Modelo** `@cf/meta/llama-3.1-8b-instruct-fp8-fast`: barato (US$ 0,045/M tokens de entrada,
  US$ 0,384/M de saída na tabela de preços atual) e bom para respostas curtas em português.
  Troque em `AI_MODEL`. Ao trocar, **mude a chave para v2**.
- **Gateway `default`**: o AI Gateway cria esse gateway sozinho na primeira requisição autenticada.
  O `cf-aig-cache-key` liga o cache para a requisição mesmo se o cache estiver desligado no painel.
- **Sem cache paralelo**: a resposta sai com `Cache-Control: no-store`; o único cache é o do gateway.
- **Rate limiting** pelo binding nativo `ratelimits` (30 req/60 s por IP). É aproximado e por
  localidade, serve para frear abuso básico; para algo rígido, use regras de WAF.
- **CORS**: `*` no ambiente padrão (rota pública, sem credenciais); em `production` só
  `https://tipe.digital` e `https://www.tipe.digital`. Ajuste em `ALLOWED_ORIGINS`.
- **Timeouts**: `AbortController` no Worker (15 s) e `cf-aig-request-timeout` 1 s menor no gateway.
- **Logs** em JSON com evento, status do cache, status do upstream e duração. Nunca token,
  account ID, IP ou o texto da resposta.

### Regras da chave de cache

- `faq:refund:v1` é compartilhada por todos porque a resposta é pública e igual para todos.
- **Mude a versão** (`v2`, `v3`…) sempre que mudar a política, o prompt, o modelo ou os parâmetros.
  Com chave customizada o gateway ignora o corpo na chave, então sem trocar a versão ele continuaria
  servindo a resposta antiga até o TTL vencer.
- **Nunca** use essa chave para conteúdo personalizado ou diferente.
- O cache do gateway é volátil: duas requisições simultâneas podem ambas dar `MISS`, e um `HIT`
  não é garantido para sempre dentro do TTL.

## Pré-requisitos

- Node.js 20+ e npm (testado com Node 22, npm 10, Wrangler 4.152, TypeScript 7, Vitest 5).
- Conta Cloudflare (o plano Free basta; nada pago é ativado).
- Um **API token de conta** criado em <https://dash.cloudflare.com/profile/api-tokens> com:
  - `Account` > `Workers AI` > `Read` (obrigatório: todos os endpoints `/ai/*` exigem; só AI Gateway dá `401`);
  - `Account` > `AI Gateway` > `Read` (consultar logs no script de verificação);
  - `Account` > `AI Gateway` > `Edit` (criação automática do gateway `default` e ajustes de config).

  O valor começa com `cfut_` (token de usuário) ou `cfat_` (token da conta). **Não use a Global
  API Key** (`cfk_`): ela não é aceita como `Bearer` (o gateway responde 401) e dá acesso total à conta.
- Para o deploy: um subdomínio workers.dev registrado (gratuito), em **Workers & Pages** no painel.

## Instalação e testes (sem credenciais)

```bash
cd cloudflare-faq-worker
npm ci
npm run check      # wrangler types + tsc + testes simulados + build (dry-run) dos 2 ambientes
```

Os testes em `test/faq.mock.test.ts` usam um **gateway simulado** (nada vai para a Cloudflare).
Eles validam o contrato do Worker: headers enviados, corpo determinístico, MISS -> HIT -> expiração
no simulador, status ausente, erros, timeout, rate limit, CORS e que o token não vaza.
**Eles não provam o cache real**; isso é o papel do teste real abaixo.

## Execução local contra o AI Gateway real

```bash
npx wrangler login
cp .dev.vars.example .dev.vars   # preencha (arquivo ignorado pelo git)
chmod 600 .dev.vars
npm run dev                      # http://localhost:8787/faq/refund
npm run verify                   # em outro terminal: 2 chamadas sequenciais
```

Ou tudo de uma vez, com o token lido sem eco:

```bash
bash scripts/real-test.sh             # local
bash scripts/real-test.sh --expiry    # + expiração (chave descartável, TTL 60 s, ≈70 s)
bash scripts/real-test.sh --deploy    # + deploy e teste da URL pública
```

O que o `verify` confere: HTTP 200, JSON válido, `cf-aig-cache-status` presente e igual ao
`cache.status`, chave e TTL, chamada 1 `MISS`, chamada 2 `HIT`, respostas idênticas e, com
`CLOUDFLARE_ACCOUNT_ID` e `CF_GATEWAY_TOKEN` no ambiente, os campos `cached`, `cost` e tokens do
log do gateway para cada chamada. Se a chamada 1 já vier `HIT`, a chave estava quente
(TTL de 1 h): use `--warm`, espere expirar, ou rode `--expiry` para ver o ciclo completo numa
chave descartável. O script usa `CF_GATEWAY_TOKEN` (e não `CLOUDFLARE_API_TOKEN`) para não
trocar a autenticação do Wrangler.

## Deploy

```bash
npm run deploy                                   # faq-ai-cache-worker (CORS *)
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env=""
npx wrangler secret put CLOUDFLARE_API_TOKEN --env=""

npm run deploy:production                        # faq-ai-cache-worker-production (CORS restrito)
npx wrangler secret put CLOUDFLARE_ACCOUNT_ID --env production
npx wrangler secret put CLOUDFLARE_API_TOKEN --env production
```

`wrangler secret put` pede o valor sem eco e já publica uma nova versão. A URL fica
`https://faq-ai-cache-worker.<seu-subdominio>.workers.dev/faq/refund`.

## Onde ver requisições, cache e custos no painel

- **AI Gateway** > gateway `default` > **Logs**: cada chamada com modelo, status, duração,
  tokens, custo estimado e a coluna/filtro **Cache** (cached / not cached).
  Em contas cujo primeiro gateway é de 24/09/2026 em diante, os logs ficam em Workers Logs.
- **AI Gateway** > **Analytics**: requisições, taxa de cache, tokens e custo ao longo do tempo.
- **Workers AI** > uso diário em Neurons (o que de fato é cobrado pela inferência).
- **Workers & Pages** > `faq-ai-cache-worker` > **Metrics / Logs**: requisições do Worker e os
  logs JSON (`faq_served`, `faq_failed`, `rate_limited`).

### Custos: o que um HIT economiza e o que não economiza

- Um `HIT` **não executa nova inferência** no Workers AI, então não consome Neurons nem tokens.
- Um `HIT` **não é custo total zero**: a requisição ao Worker conta no plano de Workers
  (Free: 100 mil req/dia; Paid: cobrança por requisição/CPU acima da franquia), e o log do gateway
  ocupa armazenamento (Free: 100 mil logs no total nas contas com Legacy Logs).
- Cache, analytics e rate limiting do AI Gateway são gratuitos. Workers AI tem 10 mil Neurons/dia
  grátis; acima disso só no Workers Paid (US$ 0,011 por mil Neurons).
- Preços mudam: confira <https://developers.cloudflare.com/workers-ai/platform/pricing/> e
  <https://developers.cloudflare.com/ai-gateway/reference/pricing/>.

## Segurança

- Segredos só via `wrangler secret put` (produção) e `.dev.vars` (local, ignorado pelo git).
- O token nunca aparece em código, resposta HTTP ou log; os testes checam isso.
- Corpos de erro do gateway são descartados (podem conter detalhes da conta).
- Use um token dedicado com só as permissões acima e revogue-o se vazar.

## Estrutura

```
src/index.ts                 rota, validação, CORS, rate limit, erros, logs
src/gateway.ts               cliente REST do AI Gateway (headers de cache, timeout)
src/faq.ts                   política fictícia, chave/TTL, prompt determinístico
test/faq.mock.test.ts        testes com gateway SIMULADO
scripts/verify-cache.mjs     verificação REAL: 2 chamadas, logs do gateway, expiração
scripts/real-test.sh         login, segredos, dev local, verify e deploy opcional
wrangler.jsonc               config (padrão e production)
.dev.vars.example            modelo de variáveis locais
```
