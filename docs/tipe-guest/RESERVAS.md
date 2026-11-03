# Tipe Guest · Motor de reservas

Migração `drizzle/migrations/0042_guest_reservations.sql` (bloco do Guest, 0040–0049). Aditiva: mesas e regras existentes não mudam, e nada funciona até a flag `guest.reservations` ser ligada por restaurante (padrão: desligada).

## Como o overbooking é impedido

Cada mesa segurada por um hold ou ocupada por uma reserva vira uma linha em `guest_table_allocations` com a faixa `occupied` = horário + duração + intervalo de arrumação. A restrição `EXCLUDE USING gist (table_id WITH =, occupied WITH &&)` faz o Postgres recusar duas faixas sobrepostas na mesma mesa, mesmo com duas transações ao mesmo tempo. A função `guest_allocate` captura essa recusa e procura outra mesa; sem opção, o pedido recebe "Sem mesa disponível".

## Fluxo

1. `guest_available_slots(restaurante, dia, grupo)` lista os horários abertos e com mesa livre.
2. `guest_create_hold` valida a flag e as regras (`guest_slot_closed_reason`), libera holds vencidos, limita a 2 holds ativos por pessoa/sessão e segura a menor mesa que cabe (ou uma combinação) por `hold_ttl_sec` (padrão 5 min).
3. `guest_confirm_reservation` transforma o hold em reserva (`confirmada`, ou `pendente` se o restaurante não confirma automático). É idempotente pela chave: repetir devolve a mesma reserva.
4. Cliente: `guest_change_reservation` e `guest_cancel_reservation(..., 'cliente')` só até `cancel_cutoff_min` antes (padrão 2 h). A alteração é tudo ou nada.
5. Equipe: `guest_set_reservation_status` segue `pendente → confirmada → chegou → sentada → concluida` e `confirmada → nao_compareceu` (só depois do horário). Cancelar pelo restaurante exige dono ou caixa e motivo.
6. Toda mudança entra em `guest_reservation_events` (imutável).

## Regras configuráveis (`guest_reservation_settings`)

Fuso (padrão America/Fortaleza), grade de horários, duração, intervalo entre ocupações, antecedência mínima e máxima, grupo mínimo e máximo, prazo de cancelamento, validade do hold e confirmação automática. Turnos por dia da semana em `guest_availability_rules`; feriados, eventos privados e bloqueios (do restaurante ou de uma mesa) em `guest_availability_exceptions`. Mesas entram no motor só com `reservable = true` e `seats_max`; combinações em `guest_table_combinations`.

## Lista de espera e alertas

- Lista de espera: sem duplicata por faixa, até 3 ativas por pessoa, posição devolvida como **estimativa**. A equipe convoca com prazo de 5 a 60 minutos, e `guest_expire_waitlist` expira quem não respondeu.
- Alertas: sem duplicata, até 5 ativos por pessoa. `guest_match_alerts` só registra aviso quando existe horário real (regras + mesa livre) e cada alerta dispara uma vez (`guest_alert_notifications` único por alerta e horário). O envio (push/e-mail) fica com o servidor nas próximas fases.

## Outros dados prontos

Perfis do consumidor (`guest_profiles`, com versão de termos e `deleted_at`), favoritos e listas, tokens de push e experiências. Em `guest_experiences`, `prepay_enabled` é travado em `false` por CHECK: nenhum pagamento antecipado existe até haver provedor aprovado e autorização.

## Segurança

RLS em todas as tabelas. O consumidor lê só o que é dele; membros do restaurante leem o que é do restaurante; ninguém escreve direto (só `service_role`). As funções são executáveis só pelo `service_role`. O servidor (`src/lib/tipe/guest/reservas.server.ts`) aplica limite por usuário e por IP antes de chamar o banco.

## Domínio puro

`src/lib/tipe/guest/reservas.ts` repete as regras (grade, turnos, exceções, escolha de mesa, estados, política) para o `/demo` e o app Expo calcularem o mesmo que o banco, sem decidir nada sozinhos.
