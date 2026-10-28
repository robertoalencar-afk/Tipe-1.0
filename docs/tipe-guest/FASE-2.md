# Tipe Guest · Relatório da Fase 2 (avaliações elegíveis para o futuro)

Branch `guest/fase-2-avaliacoes`, criada de `order/base` (decisão do Roberto em 27/10). PR em rascunho contra `order/base`.

## Feito

- **Migração `0040_guest_reviews_consent.sql`** (aditiva, não aplicada): `guest_feature_flags` + `guest_flag_enabled`, `guest_reviews`, `guest_review_events` (auditoria), `guest_review_reports` (contestação/denúncia), RPCs `guest_record_review`, `guest_moderate_review`, `guest_contest_review`, `guest_public_reviews`.
- **Servidor:** `submitRating` continua gravando `waiter_ratings` igual; aceita três campos opcionais (`paymentId`, `publishConsent`, `publicIdentity`) e, com a flag ligada, faz a segunda escrita (`src/lib/tipe/guest/reviews.server.ts`). Falha na coleta nova não derruba a avaliação interna (fica em `security_events`).
- **Domínio:** `src/lib/tipe/guest/review-consent.ts` (texto versionado `guest-avaliacao-v1`, normalização do consentimento).
- **Tela de avaliação:** componente `ConsentimentoAvaliacao` (pergunta separada, desmarcada, identidade anônima por padrão). Só aparece quando o servidor diz que a flag está ligada.
- **Backoffice › Governança:** `ModeracaoAvaliacoesGuest` (fila por estado, aprovar, ocultar com motivo, voltar para a fila, ligar/desligar a coleta por restaurante). Exige founder com 2FA.
- **Painel › Garçons:** `AvaliacoesGuestRestaurante` (estado de cada avaliação com consentimento e contestação pelo dono). Some quando não há avaliação nova ou a migração não existe.
- **Docs:** `AVALIACOES-LGPD.md` (rascunho para revisão jurídica).

## Migração e numeração

`0040`. O bloco do Guest passou de 0031–0039 para **0040–0049** porque 0031–0032 (PR #45/release) e 0033 (`caixa/esperado-no-servidor`) foram usadas por outras branches. Entrada acrescentada ao `_journal.json` (idx 27); ao mesclar com branches que tenham 0027–0039, o journal precisa ser reordenado. **Não aplicada em nenhum Supabase.**

## Testes (saída real, 28/10)

- `npx tsc --noEmit`: sem erros.
- `npx vitest run`: 14 arquivos, **128 testes passando** (inclui `review-consent.test.ts`).
- `tests/db/run.sh` (Postgres 16 local): **todos os cenários passaram**, incluindo `0040` reaplicada sem erro e 27 cenários novos em `tests/db/guest-avaliacoes.sql`: avaliação atual continua gravando; flag desligada recusa; flag por restaurante vence a do ambiente; visita paga verificada só com pagamento aprovado; um pagamento, uma avaliação; sem consentimento fica interna e anônima; nenhuma nota não perguntada; leitura pública vazia antes da moderação e só com consentimento + verificação + aprovação; usuário comum e anônimo não chamam as funções internas; RLS entre restaurantes; UPDATE direto bloqueado; contestação só do dono e tira da leitura; decisão auditada.
- `bun run build`: concluído.
- Playwright (harness temporário, removido antes do commit) em 390 e 1280 px: caixa começa desmarcada, ao marcar aparecem as 2 opções de identidade, sem rolagem horizontal, sem erro de console. Capturas em `docs/tipe-guest/capturas/fase-2/`.

## Situação

- **Implementado e testado:** banco, RPCs, RLS, flag, segunda escrita, normalização do consentimento, componente de consentimento.
- **Implementado sem validação em navegador real:** fila de moderação no Backoffice e bloco do painel (dependem de login com 2FA e Supabase com a migração; compilam e passam no typecheck).
- **Pendente:** código da avaliação na tela final para o titular revogar; função de revogação no Backoffice; incluir avaliações na Política de Privacidade; denúncia por usuário do Guest (tabela pronta, sem tela, porque não há leitura pública).
- **Fora do escopo:** exibir avaliações no Guest (Fases 6/7), notas de comida/ambiente (não são perguntadas).

## Decisões para o Roberto

1. Merge do PR (em `order/base`).
2. Aplicar a migração `0040` no Supabase (só depois da saída da Lovable/#34 e com ok).
3. Revisão jurídica do texto `guest-avaliacao-v1` e da política de retenção.
4. Em quais restaurantes ligar a coleta (padrão: nenhum).
