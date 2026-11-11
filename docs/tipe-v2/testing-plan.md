# Plano de testes

## Camadas

| Camada | Ferramenta | Onde | Como rodar |
|---|---|---|---|
| Regras puras (conta, pagamento, demonstração) | Vitest | `src/lib/tipe/**/*.test.ts` | `bunx vitest run` |
| Banco (RPCs de pagamento, RLS, limites) | PostgreSQL 16 local | `tests/db/*.sql` | `tests/db/run.sh` (ver comentários no script) |
| Jornada no navegador | Playwright | `tests/e2e/demo-journey.mjs` | `bunx vite dev --host 127.0.0.1 --port 5173` e, em outro terminal, `node tests/e2e/demo-journey.mjs` (precisa do pacote `playwright` disponível; `CHROME_PATH` opcional; `SHOTS=pasta` salva capturas) |
| Desempenho | Lighthouse (build `node-server` + proxy Brotli) | fora do repositório | ver `docs/sunday-ecossistema/05-VALIDACAO.md` (PR #14) |

## Cobertura pedida no prompt × situação

| Tema | Coberto por | Situação |
|---|---|---|
| Navegação entre perfis | e2e (5 perfis, celular e computador) | Feito |
| Responsividade | e2e: sem rolagem horizontal em 375 px e 1366 px | Feito |
| Autenticação | testes do `main` para rotas logadas; demonstração não tem login | Parcial |
| Permissões | `engine.test.ts` ("cada perfil só faz o que lhe cabe", estorno, confirmação no local) | Feito na demonstração; RLS real em `tests/db` |
| Mesas | `engine.test.ts` (fechar só quitada), e2e (liberar mesa) | Feito |
| Pedidos | `engine.test.ts` (idempotência, indisponível, adicionais, QR + garçom na mesma conta), e2e | Feito |
| Pagamentos simulados | `engine.test.ts`, e2e (Pix e Apple Pay simulados) | Feito |
| Divisão de conta | `bill-math.test.ts` (`main`), `engine.test.ts` (partes iguais exatas, por lugar), e2e | Feito |
| Gorjetas | `tips.test.ts` (`main`), `engine.test.ts` (separada do serviço) | Feito |
| Estornos | `engine.test.ts`, e2e (garçom pede, gerente aprova) | Feito |
| Notificações | `engine.test.ts` (pronto, quitada, nota baixa, pagar no local), e2e | Feito na demonstração; push real no PR #19 |
| Integrações simuladas | `pdv/contract.test.ts` (`main`) | Parcial |
| Falhas de comunicação | `engine.test.ts` (pagamento falho libera itens); `payment-state.test.ts` | Parcial |
| Concorrência | `engine.test.ts` + e2e (duas abas pagando o mesmo saldo); `tests/db/payments.sql` (trava de linha) | Feito |
| Webhooks duplicados | `engine.test.ts`; `payment-state.test.ts` | Feito |
| Tratamento de valores | `bill-math.test.ts` (centavo exato), `engine.test.ts` | Feito |
| Acessibilidade (WCAG 2.2 AA) | — | **Não iniciado**: incluir axe-core no e2e |
| Regressão visual | capturas do e2e (`SHOTS`) | Parcial: capturas existem, comparação automática não |

## Regra

Nenhuma funcionalidade é marcada como "Testada" em `implementation-status.md` sem um teste que falharia se ela quebrasse. Interface pronta sem teste fica como "Implementada".
