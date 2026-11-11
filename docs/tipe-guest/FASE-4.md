# Tipe Guest · Relatório da Fase 4 (motor de reservas)

Branch `guest/fase-4-reservas`, criada do `main` (que já tem 0040 e 0041 aplicadas). PR em rascunho contra `main`. Detalhes em `RESERVAS.md`.

## Feito

- `drizzle/migrations/0042_guest_reservations.sql`: salão (áreas, mesas reserváveis, combinações), regras e exceções, holds com expiração, reservas com estados e idempotência, ocupação de mesa com EXCLUDE, trilha imutável, lista de espera, alertas, experiências (pagamento antecipado travado), perfis, favoritos, listas, tokens de push. RLS em tudo, funções só para o servidor.
- `src/lib/tipe/guest/reservas.ts` (domínio puro) e `reservas.test.ts`.
- `src/lib/tipe/guest/reservas.server.ts`: chamadas do servidor com limite por usuário e por IP.
- `tests/db/guest-reservas.sql` e um teste de concorrência real no `tests/db/run.sh`.

## Migração

`0042`, entrada no `_journal.json`. **Não aplicada em produção.** Atenção: o merge no `main` dispara o deploy, que aplica a migração. Ela é aditiva e fica inerte com a flag desligada, mas o merge continua sendo decisão do Roberto.

## Testes (saída real, 03/11)

- `tests/db/run.sh` (Postgres 16 local): **todos os cenários passaram** (280 `ok`), com 0042 reaplicada sem erro e 61 cenários novos: flag desligada recusa; grade, turno, antecedência, grupo e feriado; menor mesa que cabe e combinação; EXCLUDE recusa sobreposição escrita direto; terceiro grupo sem mesa; intervalo de arrumação; hold expirado liberado e não confirmável; limite de holds; confirmação idempotente e só pela mesma sessão; alteração dentro da política (e recusa sem mudar nada); cancelamento e alteração fora da política; permissões de dono, caixa, garçom e outro restaurante; estados e ausência; trilha imutável; lista de espera (estimativa, sem duplicata, convocação, expiração); alerta só com vaga real e sem duplicata; pagamento antecipado travado; RLS e funções fechadas para cliente e anônimo; **duas reservas simultâneas para a mesma mesa: só uma passa** (duas conexões em paralelo).
- `npx vitest run`: 24 arquivos, 240 testes passando (10 novos do domínio).
- `npx tsc --noEmit`: sem erros. `bun run build`: concluído.

## Situação

- **Implementado e testado:** banco, funções, RLS, concorrência, domínio puro.
- **Implementado sem validação:** `reservas.server.ts` (compila; sem rota que o chame ainda, então não foi exercitado contra um Supabase).
- **Pendente:** telas do painel (Fase 5), envio dos avisos de alerta e convocação (push/e-mail), rotina que roda `guest_match_alerts` e `guest_expire_waitlist`, troca de mesa no check-in e ligação com a sessão de mesa do Tipe Pay (Fase 5).
- **Fora do escopo:** pagamento antecipado de experiências (travado), telas do consumidor (Fases 6 e 7).

## Decisões para o Roberto

1. Merge do PR (aplica a 0042 em produção pelo deploy, inerte com a flag desligada) ou deixar em rascunho até a Fase 5.
2. Autorizar a Fase 5 (reservas no painel do restaurante).
3. Padrões de reserva: hoje 15 min de grade, 90 min de duração, 15 min de arrumação, 2 h de prazo de cancelamento, 5 min de hold. Cada restaurante pode mudar.
