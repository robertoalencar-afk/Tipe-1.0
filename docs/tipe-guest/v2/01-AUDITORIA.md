# Tipe Guest 2.0 · Fase 1 · Auditoria (09/11/2026)

Branch `guest/v2-opentable` = `main` (7c14aa0) + PR #74 (que já traz #66 fila e #68 garantia).
Nada aqui foi publicado. Guest segue **Em breve**.

## O que existe e foi verificado

| Área | Onde | Estado verificado |
| --- | --- | --- |
| Motor de reservas (puro) | `src/lib/tipe/guest/reservas.ts` | Turnos, grade, exceções, mesas combinadas, ocupação com preparo, estados. Testes em `reservas.test.ts`. |
| Motor no banco | `drizzle/migrations/0042_guest_reservations.sql` | `EXCLUDE USING gist (table_id WITH =, occupied WITH &&)` em `guest_table_allocations`; hold com expiração; confirmação idempotente por `idempotency_key` (UNIQUE); `FOR UPDATE` nas transições; fuso IANA por restaurante (`timezone`, padrão `America/Fortaleza`). |
| Overbooking | `tests/db/guest-reservas.sql` | Rodado hoje em PG16 local: **"duas reservas simultâneas para a mesma mesa e horário: só uma passa"** e o resto da suíte: TODOS OS CENÁRIOS DO BANCO PASSARAM. |
| Fila presencial | migração 0043 (PR #66, **não aplicada em produção**) | QR da porta + localização; inerte com a flag desligada. |
| Garantia | `src/lib/tipe/guest/garantia.ts` (só regras puras) | Sem cobrança real, sem webhook, sem tabela. Regras de retenção são proposta, **não decisão jurídica**. |
| Avaliações + consentimento | migração 0040 | Aplicada em produção em 28/10 (registro do deploy, PR #56). |
| Restaurante Fundador | migração 0041, `src/routes/fundador.tsx` | Aplicada em produção em 28/10. |
| Painel do restaurante | `src/components/tipe/ReservasPainel.tsx` (2.370 linhas) | Reservas do dia/semana, chegada, mesa, turnos, exceções, áreas, experiências, espera. Só aparece com a flag `guest.reservations`. |
| Simulador público | `SimuladorGuest.tsx` + passo a passo em `/produtos/guest` | Publicado (PR #83). Dados fictícios. |
| App nativo | `apps/guest` (Expo, PR #74) | Modo demonstração. Não enviado às lojas. |
| Assinatura | `restaurant_has_module(rid,'guest')` (migração 0036) | Em produção. Ainda **não** é checado pelas funções do Guest. |

Produção: 0040, 0041, 0042 e 0036 constam como aplicadas pelos registros de deploy. Não consigo
consultar o banco de produção daqui. 0043 não foi aplicada.

Testes hoje: `vitest` 30 arquivos / 280 testes ok; `tests/db/run.sh` ok.

## Lacunas encontradas

1. **Papéis.** O Tipe Restaurant só tem `owner`, `cashier`, `waiter` (`app_role`). Não existe
   Gerente. A matriz pedida exige Gerente e autorizações finas ("conforme autorização").
2. **Assinatura.** As funções do Guest não checam `restaurant_has_module`.
3. **Fuso no domínio puro.** `reservas.ts` usa `utcOffsetMin` fixo; o banco já usa IANA.
4. **Cliente web.** Não existe o marketplace web (busca, resultados, perfil, minhas reservas);
   só o simulador e o app Expo.
5. **Mapa do salão.** O painel lista mesas, mas não tem mapa visual com arrastar e checar conflito.
6. **Perfil do cliente para o restaurante, relatórios, comunicações (Resend/WhatsApp) e
   experiências com venda** não existem.
7. **Avaliações públicas.** Não há moderação, resposta do restaurante nem regra de publicação.
