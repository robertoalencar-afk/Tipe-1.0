# Tipe Guest · Avaliações e LGPD

> **Rascunho para revisão jurídica.** Este documento descreve o que o código faz e propõe textos. Não afirma conformidade com a LGPD.

## 1. O que muda e o que não muda

- **Não muda:** a avaliação do atendimento depois do pagamento continua gravando em `waiter_ratings` exatamente como antes, para uso interno do restaurante (dono e caixa). As avaliações antigas **continuam internas para sempre**, salvo nova autorização do titular.
- **Novo (atrás da flag `guest.reviews_v2`, desligada por padrão):** quando a flag está ligada para o restaurante, a tela de avaliação mostra uma pergunta **separada, opcional e desmarcada**: "Posso exibir esta avaliação no futuro app da Tipe para outras pessoas?". A resposta é gravada em `guest_reviews` (migração `0040`), ao lado da avaliação interna.

## 2. Dados tratados

| Dado | Origem | Para quê | Quem vê hoje |
|---|---|---|---|
| Nota do atendimento (1–5), comentário (até 400) | cliente | avaliação interna; e, com consentimento, exibição futura | dono e caixa do restaurante; equipe Tipe na moderação (só as com consentimento) |
| Garçom e mesa | servidor | desempenho interno | dono e caixa; **nunca** na leitura pública |
| Pagamento da visita (id) | servidor | marcar "visita paga verificada" (pagamento aprovado pelo provedor) | ninguém na leitura pública |
| Primeiro nome | nome informado no pagamento | só se o cliente escolher "Só o primeiro nome" **e** a visita for verificada | leitura pública futura |
| Versão do texto aceito e data | servidor | prova do consentimento | dono, equipe Tipe |

Não se grava e-mail, telefone, CPF ou identificador do aparelho para a avaliação. Não há ligação entre avaliações de pessoas diferentes nem perfil do cliente.

## 3. Finalidade e base legal (proposta)

- Avaliação interna: legítimo interesse do restaurante em melhorar o atendimento (como já é hoje). *A revisar.*
- Exibição pública futura no Tipe Guest: **consentimento** (art. 7º, I), específico, destacado e separado, com versão do texto (`guest-avaliacao-v1`). Sem marcar, não há exibição.

## 4. Regras técnicas que sustentam o consentimento

1. A pergunta só aparece com a flag ligada; a checagem é no servidor (`guest_flag_enabled`).
2. Sem consentimento, a avaliação é gravada como interna, anônima e sem versão (`normalizeReviewConsent`).
3. A leitura pública (`guest_public_reviews`) só devolve avaliações com consentimento **e** visita paga verificada **e** aprovadas na moderação. Sem garçom, mesa ou pagamento.
4. Ninguém fora do servidor chama a leitura pública hoje (sem `EXECUTE` para `anon`/`authenticated`): o Guest ainda não foi lançado.
5. Moderação só pela equipe Tipe com 2FA; contestação do restaurante tira a avaliação da leitura até a decisão; tudo fica em `guest_review_events`.

## 5. Retenção (proposta, a decidir)

- Avaliação interna: mesma política hoje aplicada a `waiter_ratings` (não há prazo definido no código; **pendente**).
- Avaliação com consentimento: enquanto o consentimento valer e o restaurante estiver ativo; ao revogar, `publish_consent` volta a falso e a avaliação deixa de ser elegível (evento `consentimento_revogado` já previsto na trilha).

## 6. Direitos do titular

- **Revogação e exclusão:** o titular não tem conta, então o pedido entra pelo canal de privacidade existente (`/privacidade/solicitacao`, tabela `privacy_requests`). **Pendente:** dar ao cliente um código da avaliação na tela final para localizar o registro sem coletar mais dados, e a função de revogação no Backoffice.
- **Acesso e correção:** pelo mesmo canal.

## 7. Texto exibido (versão `guest-avaliacao-v1`)

> **Posso exibir esta avaliação no futuro app da Tipe para outras pessoas?**
> Opcional. Só aparece depois de revisada pela equipe da Tipe e se o pagamento desta conta for confirmado. Sem marcar, ela fica só com o restaurante. *Privacidade*
>
> Como você quer aparecer: Sem nome ("Cliente verificado") · Só o primeiro nome

## 8. Pendências para o jurídico

- Validar base legal da avaliação interna e o prazo de retenção.
- Incluir avaliações na Política de Privacidade (`src/lib/tipe/legal-content.ts` hoje não cita avaliações).
- Validar o texto do consentimento e o rótulo "Cliente verificado".
- Definir o fluxo de revogação sem conta.
