# Tipe Guest · Relatório da Fase 5 (reservas no painel do restaurante)

Branch `guest/fase-5-painel`, criada em cima de `guest/fase-4-reservas` (PR #58). PR em rascunho contra `guest/fase-4-reservas`, para o diff mostrar só a Fase 5. Quando o #58 entrar, a base deste PR passa a ser o `main`.

## Feito

- **Seção "Reservas"** no painel existente (grupo Operação), sem painel novo. Só aparece quando a flag `guest.reservations` está ligada para o restaurante. Com a flag desligada, o painel fica exatamente como hoje.
- **Duas chaves:** a flag é da equipe Tipe (libera o módulo); dentro dele o dono liga "Receber reservas" (`accepting`, padrão desligado). Fechado, o motor recusa novos holds e nada muda para quem já reservou.
- **Dia:** indicadores do dia, lista por horário com as ações do fluxo (confirmar, chegou, levar à mesa, concluir, não veio, cancelar com motivo que o cliente vê), histórico de cada reserva e mapa das mesas reserváveis (à mesa, próxima reserva, livre). Navegação por dia.
- **Check-in na mesa** (`guest_seat_reservation`, novo na 0042): garçom, caixa ou dono leva o grupo à mesa reservada ou a outra mesa livre; o banco recusa mesa de outro restaurante e mesa reservada por outro grupo no período. Grava `seated_table_id` e `seated_at`. A conta, o QR e o pagamento da mesa não foram tocados.
- **Anotar reserva** (telefone): mesmo motor do app (grade, antecedência, mesa livre, EXCLUDE), canal `telefone`, chave idempotente por pedido; a trilha registra a equipe como autora.
- **Semana:** reservas e pessoas dos próximos 7 dias. **Últimos 30 dias:** reservas, pessoas atendidas, taxa de "não vieram", canceladas e canal. Sem dado, o cartão diz "Sem base ainda" (nenhum número inventado).
- **Espera:** fila do dia por ordem de entrada, com "Avisar" (15 min para responder pelo app).
- **Configurar (só dono):** regras (grade, duração, arrumação, antecedências, grupo, prazo de cancelamento, confirmação automática), turnos por dia da semana (vários por dia), mesas que aceitam reserva com lugares e área, feriados/eventos/bloqueios (restaurante inteiro ou uma mesa), experiências. Pré-pagamento continua travado no banco.
- Papéis: equipe (dono, caixa, garçom) opera o dia; só o dono vê e salva a configuração. O servidor confere o papel antes e o banco confere de novo.

## Arquivos

- `drizzle/migrations/0042_guest_reservations.sql` (ainda não aplicada): `accepting`, `seated_table_id`/`seated_at`, `guest_seat_reservation`, autor correto da criação por telefone.
- `src/lib/tipe/guest/reservas.functions.ts` (novo): funções de servidor do painel.
- `src/lib/tipe/guest/reservas.ts`: ajudantes de dia/hora de Fortaleza, ações por estado, indicadores, leitura de `tstzrange`.
- `src/lib/tipe/guest/reservas.server.ts`: check-in e aviso da lista de espera.
- `src/components/tipe/ReservasPainel.tsx` (novo) e `RestaurantPanel.tsx` (entrada da seção atrás da flag).

## Testes (saída real, 03/11)

- `tests/db/run.sh` (Postgres 16 local): **todos os cenários passaram (285 `ok`)**, incluindo os novos: reserva recusada com o restaurante fechado; check-in recusado em mesa reservada por outro e em mesa de outro restaurante; check-in na mesa escolhida grava a mesa; concorrência real de duas reservas para a mesma mesa (só uma passa).
- `npx vitest run`: 24 arquivos, 244 testes passando (4 novos: dia e hora de Fortaleza, ações iguais às transições do banco, indicadores só com base, leitura de faixas).
- `npx tsc --noEmit`: sem erros. `vite build`: concluído. ESLint/Prettier limpos nos arquivos novos.
- **Telas:** capturas a 390 e 1280 px de Dia, Semana, Espera e Configurar, sem rolagem horizontal e sem erro no console. Foram feitas com uma página local temporária e **dados fictícios** (não commitada), porque a seção depende de login e de um Supabase com a 0042. Estão em `/mnt/project-files/tipe-guest/fase-5/`.

## Situação

- **Implementado e testado:** banco (check-in, chave de abertura), domínio, renderização das telas com dados fictícios.
- **Implementado sem validação ponta a ponta:** as funções de servidor do painel contra um Supabase real (compilam e seguem o padrão das outras; a 0042 não está em nenhum banco remoto).
- **Pendente:** avisos por push/e-mail da lista de espera e dos alertas; rotina periódica de `guest_expire_waitlist` e `guest_match_alerts`; edição de combinações de mesas pela tela (hoje só contadas); telas do consumidor (Fases 6 e 7).
- **Fora do escopo:** pré-pagamento de experiências (travado), qualquer mudança no Tipe Pay.

## Decisões para o Roberto

1. Merge do #58 e deste PR: ambos aplicam a 0042 no deploy. Ela é aditiva e fica inerte (flag sem linha = desligada; `accepting` padrão falso).
2. Para testar num restaurante virtual depois do merge, a equipe Tipe liga a flag só nele, por exemplo `INSERT INTO guest_feature_flags (restaurant_id, flag_key, enabled) VALUES ('<id do bistro-teste>', 'guest.reservations', true);`.
