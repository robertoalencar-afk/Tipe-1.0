# Tipe Order multiformato

Página `/produtos/order` com 9 seções: hero, Escolha seu atendimento, Veja funcionando, cardápio em stories + Criar prato, Tudo conectado, Monte sua operação, Integrações e disponibilidade, Dúvidas, CTA.

## Disponibilidade (auditada no código)

| Modalidade | Estado | Base |
|---|---|---|
| Mesas | Operacional | migração 0027, módulo order, mesa liberada pela equipe, e2e |
| Balcão | Piloto | 0023 venda de balcão, senha, KDS, TV de senhas; sem SMS/push |
| Retirada | Piloto | mesmo fluxo do balcão |
| Totem | Em desenvolvimento | 0025, pedido pendente até o caixa cobrar; sem terminal de pagamento, sem multi-dispositivo |
| Pulseira | Planejada | sem modelo de dados |
| Comanda individual | Planejada | sem modelo; comanda não é divisão do Pay |
| Delivery | Demonstração | só o valor de canal; sem iFood/Rappi/WhatsApp real |

O simulador roda todas, mas isso não muda o estado acima. A fonte única é `src/lib/tipe/order/modalidades.ts`.

## Código

- `src/lib/tipe/order/modalidades.ts`: catálogo, `recomendar()`, `resumoParaCrm()`.
- `src/lib/tipe/order/eventos.ts`: eventos de domínio, ids idempotentes, regras por modalidade.
- `src/lib/tipe/order/simulacao.ts`: reducer puro (sem Supabase, sem rede). `simulacao.test.ts` e `modalidades.test.ts`.
- `src/components/tipe/site/order/`: `EscolhaAtendimento`, `SimuladorMultiformato` (+ `simulador/dados.ts`), `MonteSuaOperacao`, `PaginaOrder`, `faq.ts`.
- Lead: `submitLead` aceita `originPage: "configurador-order"` e `operacao`; o resumo vai em `notes` e o tipo vira `venue_type`. Sem migração.
- Painel: aba Atendimento (`src/components/tipe/Atendimento.tsx`) em Configurações.
- Bistrô Teste e Bar do Teste: `criar-empresas-teste.mjs` liga order, kds e totem (idempotente, só empresas virtuais).

## Fotos do seletor

Mesas cena-casal, balcão cena-caixa, retirada cena-executiva, comanda e delivery sem foto própria usam cena-bartender e cena-cozinha. Totem e pulseira são desenhos em CSS/SVG (não existe foto). Rotulados como ilustração.

## Testes

`bunx vitest run src/lib/tipe/order`, `bunx tsc --noEmit -p .`, `bun run build`, `tests/e2e/order/multiformato.e2e.mjs`.
