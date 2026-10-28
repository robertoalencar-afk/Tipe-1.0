# Tipe Order · Fase 2: módulos por restaurante e QR seguro

Branch `order/fase-2-modulos`, PR em rascunho contra `main`. A base `order/base` (PR #32) já entrou na `main`. A `main` nova, com a release fora da Lovable, foi trazida para esta branch com merge.

## O que foi feito

**Módulos por restaurante (migração 0027)**
- A tabela `restaurant_modules` guarda os módulos `order`, `kds`, `totem` e `three_d`. Cada um tem estado `active`, `suspended` ou `cancelled`, mais o motivo e quem mudou.
- A tabela `restaurant_module_events` é um histórico só de inclusão.
- Só o `service_role` muda o estado, pela função `set_restaurant_module`. Suspender ou cancelar exige motivo.
- O servidor confere o módulo em toda função de pedido: no cardápio (`getPublicMenu`), no envio (`pdv_customer_order`) e na liberação da mesa (`open_table_ordering`).
- Suspender ou cancelar bloqueia só pedidos novos. A conta, os pagamentos e os pedidos já feitos continuam.

**O mesmo QR de hoje**
- Com só o Tipe Pay, a tela da mesa fica como antes: Conta e Atividade, sem cardápio.
- Com o Tipe Order ativo, aparecem **Pedir | Pagar** no topo. A troca não perde a sessão nem o carrinho.

**Segurança do QR fixo.** Configurável por restaurante em Configurações:
- **Equipe libera (padrão):** a mesa só envia pedidos depois que o garçom ou o caixa toca em "Liberar pedidos pelo celular". A liberação vale para a conta atual da mesa por até 6 horas e termina quando a mesa fecha.
- **Código da mesa:** além de liberar, a equipe passa 4 números para a mesa digitar.
  - Cada celular que acerta ganha um token próprio. O banco guarda só o hash.
  - Com 10 erros, o código é bloqueado.
- **Limites de taxa:**
  - 8 tentativas de código a cada 10 minutos, por IP e mesa;
  - 20 pedidos por minuto, por IP e mesa;
  - 30 pedidos a cada 5 minutos, por conta da mesa.
- Antes da liberação, o cliente já pode montar o carrinho. Só o envio fica bloqueado, com um aviso explicando o motivo.

**Telas**
- **Painel (Salão → mesa) e app do garçom:** card "Pedidos pelo celular" com Liberar ou Encerrar e o código, quando o modo for código. No garçom, com o Order ativo, toda mesa abre a comanda e mostra se está liberada.
- **Configurações do restaurante:** liga o pedido pela mesa e escolhe o modo. Sem o módulo contratado, mostra o aviso de "não contratado" ou "suspenso".
- **Backoffice do fundador:**
  - coluna "Tipe Order" com o estado;
  - diálogo para ativar, suspender ou cancelar com motivo;
  - o servidor exige 2FA (aal2) e registra o evento de segurança.
- **CRM (`/crm/contas/$id`, aba Módulos e integrações):**
  - card "Tipe Order" com o estado do contrato, motivo e data;
  - ativar, suspender (com motivo) e cancelar.
  - O modo demonstração continua funcionando.
  - Em `adapters.ts`, `entitlementsFromPlatform()` lê as linhas de `restaurant_modules` e `entitlementToPlatform()` monta os argumentos de `set_restaurant_module`.

## Migrações (nenhuma aplicada no Supabase de produção)

- `drizzle/migrations/0027_order_modules_table_ordering.sql`
- O journal coloca a 0027 antes da 0028 e da 0030 que já estão na `main`.
- Ela foi aplicada duas vezes seguidas num Postgres 16 local, sem erro.
- A numeração 0027 estava reservada ao Tipe Order. Próximas migrações do Order: 0034 a 0039, conforme a coordenação.

## Testes (rodados nesta branch, depois do merge com a `main`)

| O quê | Comando | Resultado |
|---|---|---|
| Tipos | `npx tsc --noEmit -p .` | sem erros |
| Unidade | `npx vitest run` | 19 arquivos, 182 testes ok (inclui 2 novos do CRM) |
| Banco (Postgres 16 local) | `bash tests/db/run.sh` | todos os cenários ok, com o novo `tests/db/order-liberacao.sql` |
| Ponta a ponta do Order | `bash tests/e2e/order/run.sh` | 11 de 11 ok, sem erro de console |
| Ponta a ponta do CRM | `node tests/e2e/crm.e2e.mjs` | 23 de 23 ok, inclui o passo novo do Tipe Order (com variáveis do Supabase locais de mentira, que a `main` agora exige no modo dev) |
| Build | `bun run build` | ok |

O teste ponta a ponta do Order usa só peças locais: um Postgres de teste, um Supabase falso escrito para o teste (`tests/e2e/order/fake-supabase.mjs`, que roda as consultas com o papel do token, inclusive RLS) e o app em modo dev. Cenários:
1. QR só com Tipe Pay mostra a conta como hoje, sem Pedir/Pagar (390 e 1280 px).
2. QR com Tipe Order mostra Pedir/Pagar, guarda o carrinho e bloqueia o envio antes da liberação.
3. Garçom libera os pedidos pelo celular na mesa.
4. O cliente envia o pedido, ele entra na conta em Pagar, e a troca de aba não perde a sessão.
5. Tela com Tipe Order em 1280 px.
6. Modo código: o código errado é recusado; o certo libera só aquele celular e o pedido entra.
7. Outro celular na mesma mesa continua precisando do código.
8. O fundador suspende o Tipe Order no backoffice.
9. Com o módulo suspenso, o envio pelo cardápio que já estava aberto é recusado no servidor.
10. Uma chamada direta ao pedido no banco, sem a tela, também é recusada com o módulo suspenso.
11. Depois da suspensão, a mesa mostra só a conta, com os pedidos já feitos.

Capturas em `docs/tipe-order/fase-2/` (o card do CRM está em `crm-tipe-order-suspenso.png`).

## Implementado e testado
- Estados do módulo, auditoria, privilégios e RLS (banco).
- Liberação pela equipe, expiração, encerramento, troca de conta e modo código com bloqueio (banco e navegador).
- Os dois cenários do QR e a recusa no servidor com o módulo suspenso, inclusive na chamada direta.
- Card do contrato no CRM em modo demonstração.

## Implementado sem validação real
- Nada foi testado contra o Supabase de verdade: a migração não foi aplicada e o teste usa um Supabase falso local.
- Os limites de taxa usam o mecanismo que já existe (`enforceRate`). Não fiz teste de carga.
- O 2FA do fundador foi simulado: o Supabase falso entrega a sessão do fundador já com aal2.
- No CRM, o card grava no estado de demonstração. A gravação real via `entitlementToPlatform()` só existe no adaptador, porque o CRM ainda não tem modo Supabase (a proposta SQL do PR #29 não foi aplicada).

## Pendente
- Aplicar a 0027 no Supabase e regenerar o `types.ts` a partir do banco. Hoje ele foi editado à mão, no mesmo formato.
- Quando o CRM ganhar modo real, ligar o card ao `setRestaurantModule`, que já existe com 2FA.
- A mensagem "2 itens foram para a cozinha" conta linhas, não unidades. Vem do PR #8 e não mexi.

## Fora do escopo desta fase
- Fases 3 em diante: pagamentos do pedido, KDS do Order, 3D. Elas não foram autorizadas.

## Decisões para o Roberto
1. **Modo padrão do QR:** deixei "equipe libera". O "código da mesa" é opcional por restaurante.
2. **Aplicar a migração 0027** no Supabase junto com o merge.
3. **Merge deste PR** na `main`, que publica.
4. **Apple Pay e Google Pay:** o servidor ainda recusa os dois no pagamento da conta (achado da Fase 1). Isso fica para a fase de pagamentos.
