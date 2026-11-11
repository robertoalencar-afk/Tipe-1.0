# 07 — Arquitetura e integrações

Data: 14/10/2026 · Base: `main` `e6813a2` · Regra: **evolução incremental sobre TanStack Start + Lovable Cloud (Supabase) + Pagar.me**. Cada recomendação diz se exige migração de banco (a fazer depois, fora desta missão).

## 1. Diagnóstico por tema

| Tema | Hoje (evidência) | Avaliação | Recomendação | Migração? |
|---|---|---|---|---|
| Modularidade | Funções de servidor por domínio (`pdv.functions.ts`, `admin.functions.ts`, `payments.functions.ts`…); `RestaurantPanel.tsx` (746 linhas) e `AdminSections.tsx` (411) concentram várias telas | Boa no servidor, fraca na interface | Quebrar o painel em rotas filhas (`/$restaurante/salao`, `/caixa`, `/cozinha`, `/cardapio`…) com carregamento sob demanda; cada módulo comercial (PDV, KDS, estoque) vira um diretório `src/features/<modulo>` com funções, componentes e testes. Habilitar módulos por plano numa tabela `restaurant_modules` | Sim (pequena) para `restaurant_modules` |
| Multi-tenancy e RLS | RLS em todas as 41 tabelas; escrita por RPC `SECURITY DEFINER` com `has_restaurant_role`; sem atalho de founder (0020) | Sólida | Manter. Para multiunidade, criar `restaurant_groups` + papel de grupo **sem** mudar as políticas existentes: o grupo só ganha funções de leitura agregada | Sim, na fase de multiunidade |
| Chaves de mesa | Muitas tabelas usam `restaurant_slug` + `table_number` (texto) em vez de `restaurant_id` + `table_id` | Risco: renomear mesa ou slug quebra o vínculo; atrapalha comanda e assento | Introduzir `bill_id` (conta) como entidade e migrar gradualmente; manter as colunas de texto como sombra até o fim da transição | Sim (média) |
| Estados de mesa, conta, comanda e pagamento | Pagamento: máquina explícita (`payment-state.ts`, `TRANSITIONS`, `decideSettlement`). Mesa: **derivada no navegador** (`RestaurantPanel.tsx:108`). Pedido/KDS: lista de strings checada na RPC. Conta: implícita (itens da mesa até `archive_and_reopen_table`) | Pagamento exemplar; resto implícito | Criar a entidade **conta** (`bills`: `open → bill_requested → partially_paid → paid → closed`, mais `cancelled`), com transições numa função única no banco e espelho em TS, no mesmo padrão de `payment-state.ts`. O estado da mesa passa a ser lido da conta, não calculado na tela | Sim (média) |
| Idempotência | Pagamento: `p_idempotency_key` obrigatório; eventos de PDV: `pdv_ingest_event` com id externo; outbox sem duplicidade | Boa, com uma lacuna | `pdv_launch_order` **não tem chave de idempotência**: duplo toque ou nova tentativa após timeout lança o pedido duas vezes. Adicionar `p_client_order_id` (UUID gerado no aparelho) com índice único | Sim (pequena) |
| Realtime | Só `table_bill_items` e `table_payment_requests` publicados; KDS e caixa consultam a cada 10 s | Insuficiente para cozinha | Publicar `pdv_order_items` (filtrado por `restaurant_id`) e assinar no KDS; manter a consulta periódica como rede de segurança | Sim (uma linha) |
| Conexão instável e offline | Sem service worker; tudo é chamada ao servidor | Bloqueador para PDV e KDS em restaurante com Wi-Fi ruim | Ver §2 | Sim (para `client_order_id`) |
| Permissões e auditoria | 4 papéis fixos; auditoria boa em pagamento, preço, cancelamento | Faltam gerente e permissões finas | Papel `manager`; tabela `role_permissions` com ações sensíveis (desconto, cancelamento, reabrir mesa, sangria, estorno) e **aprovação por PIN de gerente** no próprio aparelho; registrar tudo em `operation_audit` | Sim (média) |
| Caixa | Esperado calculado no navegador e enviado (`cash_close(p_expected)`); "recebido" soma dinheiro e maquininha | Frágil | Calcular o esperado **no servidor** por forma de pagamento; fechamento cego opcional; relatório de turno (X) e de fechamento (Z) | Sim (pequena) |
| Segurança e LGPD | CSP com relatório, 2FA de founder, dados de saque cifrados, consentimento, pedidos do titular, limitação de requisições | Acima da média do setor | Manter. Para CRM, consentimento por finalidade e retenção definida antes de guardar contato | Sim (no CRM) |
| Fiscal | Ausente | Obrigatório para ser PDV no Brasil (ver `04b-REALIDADE-BRASIL.md`) | Integrar emissor de NFC-e por API de parceiro; dados fiscais no produto (NCM, CFOP, CST/CSOSN) e no restaurante (CSC, certificado A1 guardado no parceiro, nunca na Tipe). Emissão assíncrona com outbox, como a baixa de PDV | Sim (média) |
| Integrações | Contrato de adaptador (`pdv/contract.ts`, `types.ts`), API genérica, outbox com nova tentativa exponencial | Arquitetura certa, nenhum adaptador real | Ver §3 | Não (código) |
| Testes | 81 testes unitários passando; cenários de banco em `tests/db` | Bom para pagamento, nada para PDV | Testes de banco para `pdv_launch_order`, transferência, cancelamento e caixa; teste de idempotência do lançamento | Não |
| Observabilidade | `console.error` e `security_events`; sem rastreamento de erros nem métricas | Fraca para operação em tempo real | Log estruturado nas funções de servidor, tabela `ops_events` (falhas de KDS, impressão, NFC-e, adaptador) e alerta por e-mail reaproveitando `sendSecurityAlert`; rastreador de erros externo só se o custo couber | Sim (pequena) |

## 2. Estratégia offline viável no navegador

Não é preciso trocar a stack. O que os PDVs americanos de referência fazem (ver `02-BENCHMARK-PDV-USA.md`) é **continuar lançando e cobrando em dinheiro/maquininha sem internet e sincronizar depois**. Para a Tipe:

1. **Service worker** (PWA) que guarda a aplicação e o cardápio do restaurante (IndexedDB). O painel abre sem rede.
2. **Fila local de comandos** (lançar pedido, mudar status no KDS) com `client_order_id` idempotente; ao voltar a rede, envia em ordem. O servidor aceita repetição sem duplicar (exige a mudança de idempotência do §1).
3. **KDS local**: pedidos lançados no mesmo aparelho ou rede aparecem na fila local; entre aparelhos diferentes, sem servidor não há como sincronizar no navegador. A alternativa robusta é a **impressão** na impressora de produção, que funciona pela rede local (ver §3.3).
4. **Pagamento online (Pix, cartão na conta) não funciona offline**, por definição. A tela deve mostrar o estado "sem conexão" e oferecer só pagamento presencial, registrado na fila.
5. Escopo: começa com o Lançamento TIPE e o KDS; caixa e relatórios continuam exigindo rede.

Custo: M. Sem troca de peça.

## 3. Integrações

### 3.1 PDV externo (forma de venda b)
O contrato existente cobre ler conta, receber itens, informar pagamento e fechar. Ordem sugerida, ajustada pelos achados desta missão:
1. **PDVs brasileiros com API documentada** (ver `04b-REALIDADE-BRASIL.md` §3). O cliente da Tipe está aqui; um adaptador para um PDV com base instalada relevante vale mais que um americano.
2. **Lightspeed K-Series**, que publica API de pedidos e pagamentos (ver `notas/lightspeed.md`), como prova do contrato com um PDV internacional.
3. Toast e Aloha só via programa de parceiros (escrita de pagamento restrita).

### 3.2 ERP e contabilidade
A Tipe não deve virar ERP contábil na fase atual. O caminho de menor custo é **exportar** o fechamento do dia e as vendas por item num formato estável (CSV/JSON por API) que ERPs e contadores importam, como os ERPs americanos fazem com PDVs de terceiros (ver `03-BENCHMARK-ERP-USA.md`).

### 3.3 Impressão
Impressoras térmicas de rede (ESC/POS) não são acessíveis diretamente pelo navegador. Opções, da mais simples à mais robusta:
- impressão pelo diálogo do navegador (HTML com largura de 80 mm), útil para pré-conta;
- **agente local** leve (aplicativo instalado num computador do restaurante) que recebe os pedidos por Realtime e imprime em ESC/POS na rede local; é o padrão dos PDVs web brasileiros (ver `notas/brasil.md`);
- maquininhas smart Android com impressora embutida, se a Tipe tiver app nelas no futuro.

### 3.4 TEF e maquininha
Hoje o pagamento presencial é **confirmado manualmente** pelo caixa. Integrar TEF ou a maquininha smart (Stone, Cielo, Rede, PagBank, Getnet) elimina digitação e erro de valor. Depende de parceria com cada adquirente ou de um integrador de TEF; fica para a fase 3.

### 3.5 Pagar.me
Continua a peça certa para Pix, cartão online, assinatura e gorjeta. Não há limitação técnica demonstrada que justifique troca.

## 4. Resumo das migrações que este plano exige (para depois)

| Ordem | Migração | Para quê |
|---|---|---|
| 1 | `pdv_orders.client_order_id` único | idempotência do lançamento e base do offline |
| 2 | `pdv_order_items` na publicação Realtime | KDS ao vivo |
| 3 | modificadores: `menu_modifier_groups`, `menu_modifiers`, `menu_item_modifier_groups`, `pdv_order_item_modifiers` | cardápio de verdade |
| 4 | `cash_close` calculando o esperado no servidor, por forma | caixa confiável |
| 5 | `restaurant_tables`: `area`, `seats`, `pos_x`, `pos_y`, `shape` | mapa de salão |
| 6 | `bills` (conta) e `bill_id` nas tabelas de item e pagamento | comanda, nome da conta, transferência de item |
| 7 | papel `manager`, `role_permissions`, aprovação por PIN | controle de operações sensíveis |
| 8 | dados fiscais e `fiscal_documents` com outbox | NFC-e |
| 9 | `restaurant_modules` | módulos por plano |
| 10 | `restaurant_groups` | multiunidade |
