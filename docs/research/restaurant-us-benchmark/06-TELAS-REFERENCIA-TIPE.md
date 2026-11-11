# 06 — Melhor referência por tela e proposta Tipe

Data: 14/10/2026. Componentes citados: os existentes em `src/components/ui` e `ds.tsx` (ramo `redesign-premium`) e os novos propostos em `05-DESIGN-SYSTEM-BENCHMARK.md` (`TableTile`, `ActionBar`, `ModifierSheet`, `UndoToast`, `ConfirmReason`, `ManagerPinDialog`, `ElapsedTimer`, `.theme-ops`). Esboços são originais; nenhum layout de concorrente foi reproduzido.

---

## 1. Dashboard principal
- **Referência:** MarginEdge, P&L diário que chega pronto de manhã [DOC]; SpotOn, relatório diário por garçom [TELA].
- **Acertos:** um número de ontem e de hoje, sem montar relatório. **Limitações:** ME é "de ontem"; R365 exige controller.
- **Tipe hoje:** `Inicio` (`AdminSections.tsx:36`): mesas abertas, em aberto, pendentes.
- **Proposta:**
```
[Hoje  ▸ vendas R$ | ticket médio | mesas abertas | tempo médio de mesa ]  (StatCard ×4)
[Agora ▸ alertas: 2 pendências financeiras · 1 mesa > 90 min · caixa aberto]  (StatusBadge list)
[Gráfico vendas por hora, hoje × mesma semana passada]                       (Recharts)
[Garçons: vendas · gorjeta · avaliação]          [Mais vendidos hoje]
```
- **Complexidade:** P.

## 2. PDV (Lançamento)
- **Referência:** Lightspeed Register [TELA]; Toast modificadores [DOC].
- **Acertos:** "Enviar · n itens", pop-up de modificador com Duplicar. **Limitações:** Toast exige 5 toques; Lightspeed instável no pico.
- **Tipe hoje:** `LancarPedido` (`RestaurantPanel.tsx:383`): busca, categorias, mais vendidos, observação por item; exige escolher garçom.
- **Proposta (tablet):**
```
┌ Mesa 12 · 4 pessoas · Ana ▾ ───────────────┬ Conta ───────────────┐
│ [busca / código]                            │ 2× Picanha  ao ponto │
│ [Mais vendidos][Entradas][Pratos][Bebidas]  │ 1× Caipirinha  limão │
│ ┌────┐┌────┐┌────┐┌────┐  (cards 56px+)     │ ── não enviados (2) ─│
│ │item││item││item││item│                    │                      │
│ └────┘└────┘└────┘└────┘                    │ [Enviar · 2 itens]   │ ActionBar
└─────────────────────────────────────────────┴ [Pagar]   [⋯ Ações]  ┘
toque no item com modificador → ModifierSheet (obrigatório marcado, Sem/Extra, Duplicar)
```
- O garçom vem da sessão do aparelho, não de um seletor. **Complexidade:** M.

## 3. Mapa de mesas
- **Referência:** Toast (cor por estado do pedido) [DOC]; Lightspeed (tempo e dono) [TELA].
- **Limitações:** Toast mostra estado só das mesas do garçom logado; floor plan da Square só se edita no Dashboard.
- **Tipe hoje:** grade de cartões com 5 estados de pagamento (`RestaurantPanel.tsx:46`).
- **Proposta:**
```
[Salão ▾][Varanda][Bar]        filtro: [Minhas] [Todas]   legenda ●●●●
┌──12──┐ ┌──13──┐ ┌──14──┐
│ 4p 38'│ │ livre │ │ 2p 95'│ ← faixa late
│R$ 212 │ │       │ │R$ 88  │
│ AN ●  │ │       │ │ JO ◐  │ ● pronto na cozinha  ◐ pagando pelo QR
└───────┘ └───────┘ └───────┘
toque = abre conta · segurar = Ações (transferir, juntar, imprimir pré-conta)
```
- `TableTile` com `StatusBadge` + `ElapsedTimer`; planta com posição salva. **Complexidade:** M.

## 4. Comanda / conta da mesa
- **Referência:** TouchBistro (botão composto "Receber e fechar") [TELA]; Lightspeed (divisão dentro do pagamento) [TELA].
- **Tipe hoje:** `MesaDetalhe` (`RestaurantPanel.tsx:292`): itens, pagamentos, remover taxa, cancelar item, transferir, fechar.
- **Proposta:**
```
Mesa 12 · aberta há 38 min · Ana          [⋯ Ações]
Itens (por pessoa opcional)        qtd  pago
 Picanha ao ponto                   2   ½  ▓▓░░
Taxa de serviço 10%   [remover…]
Pago R$ 106 · Falta R$ 106  ▓▓▓▓▓░░░░░
Pagamentos: Maria (Pix) R$ 106 ✓ 20:41
[Receber no caixa]   [Imprimir pré-conta]   [Fechar mesa] (só com saldo zero)
```
- **Complexidade:** P.

## 5. Cadastro de produto
- **Referência:** Square (Kitchen Facing Name, modificadores reutilizáveis, Sem/Extra com preço negativo) [TELA].
- **Tipe hoje:** `Cardapio` (`RestaurantPanel.tsx:579`): código, nome, preço, categoria, setor, disponível.
- **Proposta:** formulário em duas colunas: dados (nome, nome na cozinha, preço, categoria, estação, foto) e **grupos de modificadores** reutilizáveis com mín/máx e preço; seção "Fiscal" (NCM, CFOP) recolhida até o módulo fiscal existir. **Complexidade:** M.

## 6. Cardápio (gestão)
- **Referência:** Toast MLM (versões por unidade, mudança agendada) [DOC].
- **Tipe hoje:** lista por categoria + importação CSV.
- **Proposta:** lista arrastável por categoria, alternância rápida de disponibilidade ("acabou"), agendamento de preço depois. **Complexidade:** P.

## 7. App do garçom
- **Referência:** SpotOn Express (mesma tela no handheld e no terminal) [TELA/MKT]; Saipos na maquininha [MKT].
- **Tipe hoje:** `/garcom` só gorjetas e saque; lançamento no ramo `colibri` (`GarcomAtender.tsx`).
- **Proposta (celular/maquininha):**
```
[Minhas mesas ▸ TableTile compact em lista]   🔔 Mesa 7 pediu a conta
toque → conta da mesa → [+ Adicionar] → cardápio em lista grande → ModifierSheet
ActionBar fixa: [Enviar · n]  [Conta]
aba: Mesas · Prontos (KDS verde) · Gorjetas
```
- **Complexidade:** M.

## 8. KDS
- **Referência:** Toast (cor por idade, expediter, pago/não pago) [DOC]; Square (desfazer 3 s, timers) [TELA].
- **Tipe hoje:** `Cozinha` (`AdminSections.tsx:78`): 3 colunas por item, filtro cozinha/bar, consulta a cada 10 s; KDS por pedido no ramo `colibri`.
- **Proposta (`.theme-ops`):**
```
Cozinha ▾   all day: Picanha 6 · Fritas 9          fonte [A-][A+]
┌ MESA 12 · 08:32 ─┐ ┌ MESA 3 · 14:05 ──┐ (cabeçalho muda de cor com o tempo)
│ 2 Picanha        │ │ 1 Risoto         │
│   ao ponto       │ │   SEM queijo ⚠   │
│ 1 Fritas         │ │                  │
│ [Pronto]   pago ✓│ │ [Pronto]         │
└──────────────────┘ └──────────────────┘
toque em item = pronto (UndoToast 3 s) · som em novo/alterado
```
- **Complexidade:** M.

## 9. Painel de senhas
- **Referência:** Colibri, painel de senha [MKT].
- **Tipe hoje:** no ramo `colibri` (`$restaurante.senhas.tsx`).
- **Proposta:** duas colunas grandes "Preparando" e "Pronto", número em `--text-kds-table`, som ao chamar, marca e mascote no rodapé. **Complexidade:** P (reaplicar o ramo).

## 10. Estoque
- **Referência:** MarketMan [DOC].
- **Tipe hoje:** não existe.
- **Proposta (fase posterior):** lista de insumos com saldo teórico, botão "Contar agora" que abre contagem por área, alerta de mínimo. **Complexidade:** G.

## 11. Compras e fornecedores
- **Referência:** MarketMan (pedido, recebimento) [DOC].
- **Tipe hoje:** não existe. **Proposta:** só depois do estoque; entrada por XML da NF-e. **Complexidade:** G.

## 12. Financeiro
- **Referência:** SpotOn End Day [TELA]; R365 DSS [DOC].
- **Tipe hoje:** `Caixa` (`AdminSections.tsx:114`), `PendenciasFinanceiras.tsx`, `FechamentoDia.tsx`.
- **Proposta:**
```
Caixa de hoje                          [Abrir / Fechar]
Esperado por forma: Dinheiro R$ | Maquininha R$ | Pix Tipe R$ | Cartão online R$
Movimentos (sangria/reforço) · Pendências (bloqueiam o fechamento) ⚠ 1
Fechar: contagem (cega opcional) → diferença → [Fechar caixa e gerar resumo do dia]
```
- **Complexidade:** P.

## 13. Relatórios
- **Referência:** TouchBistro Cloud (lista mínima) [DOC].
- **Tipe hoje:** `Relatorios` (`AdminSections.tsx:194`), 1/7/30 dias, CSV.
- **Proposta:** período livre, abas Vendas · Itens · Garçons · Cancelamentos · Pagamentos; cada tabela exportável. **Complexidade:** P.

## 14. Equipe
- **Referência:** Toast (permissões numeradas e escalonamento) [DOC]; SpotOn (saída de turno) [TELA].
- **Tipe hoje:** `Equipe` e `Garcons` (`RestaurantPanel.tsx:664,709`), 4 papéis.
- **Proposta:** pessoas com papel (dono, gerente, caixa, garçom, cozinha) e PIN de 4 dígitos; matriz de permissões sensíveis; histórico de aprovações. **Complexidade:** M.

## 15. CRM
- **Referência:** benchmark anterior (sunday).
- **Proposta:** só depois do consentimento por finalidade; lista de clientes que aceitaram contato, visitas e ticket. **Complexidade:** M.

## 16. Multiunidade
- **Referência:** Toast MLM [DOC].
- **Proposta:** seletor de unidade no topo, painel comparativo (vendas, ticket, tempo de mesa) e cardápio central com ajuste local. **Complexidade:** G.

## 17. Backoffice Tipe
- **Referência:** própria (já acima do mercado em segurança).
- **Tipe hoje:** `backoffice.tsx`, `PlansAdmin.tsx`, 2FA.
- **Proposta:** acrescentar saúde operacional por restaurante (KDS conectado, impressão, NFC-e com erro, adaptador de PDV falhando) e módulos ativos por plano. **Complexidade:** P.

## 18. Pagamento do consumidor (delta)
- **Delta sobre o benchmark anterior:** mostrar no PDV e no KDS o que o cliente já pagou pelo QR (`◐` no mapa, "pago ✓" no ticket); ao fechar a conta paga pelo QR, gerar NFC-e quando o módulo fiscal existir; no modo (b), o pagamento é postado no PDV do restaurante como meio "Tipe Pix". **Complexidade:** P (visual) a M (fiscal e integração).
