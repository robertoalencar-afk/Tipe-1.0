# Tipe Order 1.0 — Relatório da Fase 1

Entregável: [`AUDITORIA.md`](./AUDITORIA.md). Só documentação; nenhuma linha de produto foi alterada nesta fase.

## O que foi feito

- Leitura de `main` (`586f05e`) e das branches dos PRs abertos #6–#9, #12–#13, #15–#22, #25, #28, #29.
- Mapa de rotas, autenticação, RLS, tabelas, server functions, Realtime e fluxo do QR da mesa.
- Tabela "existe em main / existe em PR / falta" para cliente, operação, conta, PDV, CRM e landing.
- Merges de teste entre as linhagens colibri, Sunday, landing, CRM e `/demo`, com a lista exata de conflitos.
- Decisão de base: `order/base` (cadeia Sunday + colibri A–D + #13/#17) para o produto e `order/landing` sobre `redesign-landing-v6` para a página comercial.
- Modelo de dados mínimo por fase (a partir da migração 0027) e desenho de entitlements.

## Migrações

Nenhuma criada nesta fase. Nada aplicado em produção.

## Testes rodados (merge de teste `main` + colibri A–D)

| Comando | Resultado |
|---|---|
| `bun run build` | ok |
| `npx tsc --noEmit` | ok, 0 erros |
| `npx vitest run` | 9 arquivos, 92 testes passando |
| `tests/db/run.sh` (Postgres 16 local) | "TODOS OS CENÁRIOS DO BANCO PASSARAM" |

Os conflitos entre colibri e Sunday ainda não foram resolvidos, então esse conjunto mesclado não foi testado.

## Situação

- **Implementado e testado:** nada de produto nesta fase. O que já está nos PRs #6–#9 passa em build, tipos, vitest e testes de banco quando mesclado sobre `main`.
- **Implementado sem validação:** nenhum.
- **Pendente:** montar `order/base` resolvendo 14 trechos em conflito (Fase 2, passo 0); resolver o QR fixo antes de qualquer pedido real.
- **Fora do escopo do 1.0:** multilíngue, comparação 3D, importação por PDF/imagem, avaliação por prato, promoções complexas.

## Decisões que precisam do Roberto

1. Aprovar a base `order/base` (seção 6 da auditoria) e autorizar a Fase 2.
2. Escolher o modo padrão de segurança do QR para pedido: garçom/caixa abre a mesa, ou código curto exibido na mesa (os dois ficam configuráveis por restaurante; a pergunta é qual vem ligado).
3. Autorizar a Fase 5 (landing) em paralelo, em branch separada sobre `redesign-landing-v6`.
4. Pendências antigas que continuam abertas: habilitar Apple Pay e Google Pay no Pagar.me e confirmar como a Lovable Cloud aplica `drizzle/migrations`.
