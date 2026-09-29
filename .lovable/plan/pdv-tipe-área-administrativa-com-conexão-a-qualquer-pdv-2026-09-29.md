# PDV TIPE + Área administrativa com conexão a qualquer PDV

## Objetivo
Transformar a área do restaurante (`tipe.digital/marealta`) em um sistema completo, inspirado no Saipos, para bares, restaurantes e lanchonetes. O restaurante escolhe: **usar o PDV TIPE** ou **conectar o PDV que já usa** (qualquer um do mercado). Em ambos os casos, as mesas e a conta do cliente (QR) são alimentadas automaticamente. O Maré Alta fica pronto como restaurante em funcionamento, para testes em tipe.digital.

## O que já existe (será reaproveitado)
Login e cargos, mapa de mesas, lançar pedido, confirmações presenciais, histórico, QR por mesa, cardápio/garçons simples e equipe.

## Nova organização da área do restaurante
Menu lateral (no celular, menu inferior), com tudo separado por seção:

1. **Início** — resumo do dia: faturamento, mesas abertas, ticket médio, pagamentos pendentes, itens mais vendidos.
2. **Salão (mesas)** — mapa em tempo real (livre, ocupada, pedindo conta, aguardando confirmação, encerrada). Ao tocar numa mesa: abrir mesa, lançar itens, transferir mesa, juntar mesas, estornar item (com motivo), imprimir/ver parcial e fechar mesa.
3. **PDV / Lançar pedido** — tela rápida estilo Saipos: busca por nome ou código, categorias em botões, observações por item ("sem cebola"), quantidade, garçom e envio.
4. **Cozinha e bar (KDS)** — pedidos aparecem por setor com status: recebido → preparando → pronto → entregue.
5. **Caixa** — abrir caixa com valor inicial, sangria/reforço, confirmar pagamentos presenciais (dinheiro, maquininha, Pix), fechar caixa com conferência e relatório.
6. **Cardápio** — categorias, produtos com código, preço, foto opcional, setor de preparo (cozinha/bar), disponível/esgotado, adicionais e observações.
7. **Mesas e QR Codes** — cadastrar em lote (ex.: 1 a 30), ativar/desativar, renomear, gerar novo QR e imprimir.
8. **Equipe** — garçons (código, ativo), caixa, gerente e dono; convite por e-mail.
9. **Relatórios** — vendas por período, por produto, por garçom, por forma de pagamento, gorjetas e estornos; exportar planilha.
10. **Integrações (PDV)** — escolher entre:
    - **PDV TIPE** (padrão para quem não tem sistema).
    - **Conectar meu PDV** — lista com Saipos, TOTVS Food Service, Consumer, Goomer, Anota AI, Linx, Colibri e "Outro PDV". Cada restaurante recebe um endereço de integração e uma chave própria; o PDV externo envia mesas, itens e fechamentos, e a TIPE devolve os pagamentos feitos pelo cliente. Status da conexão e registro das últimas sincronizações.
11. **Configurações** — dados do restaurante, taxa de serviço (padrão 10%), horário de funcionamento e impressão.

## Maré Alta pronto para uso
Cardápio de praia de Fortaleza já cadastrado (com setores cozinha/bar e alguns adicionais), 20 mesas, 5 garçons, caixa pronto para abrir e alguns pedidos de exemplo para o Início e os Relatórios não ficarem vazios. A mesa 12 do simulador continua separada e não é afetada.

## Etapas de entrega
Para não gastar créditos à toa, a entrega será em 3 partes, cada uma testável em tipe.digital/marealta:
1. **Nova estrutura + Salão + PDV + Cardápio completo + Mesas/QR + Configurações.**
2. **Cozinha/Bar, Caixa e Relatórios/Início.**
3. **Integrações com qualquer PDV** (endereço e chave por restaurante, registro de sincronização).

## Fora desta etapa
Emissão de nota fiscal (NFC-e), estoque/ficha técnica, delivery e pagamentos reais (Pix/carteiras) — ficam no roadmap.

## Detalhes técnicos
- Novas tabelas: `pdv_item_modifiers`, `pdv_order_items.notes/status/sector`, `cash_sessions` e `cash_movements`, `restaurant_settings` (taxa, horários), `pos_integrations` (restaurant_id, provider, api_key hash, status, last_sync_at) e `pos_sync_log`. Todas com GRANT + RLS por membro/cargo, seguindo `has_restaurant_role`.
- Novas RPCs SECURITY DEFINER: transferir/juntar mesas, estorno com motivo e auditoria, abrir/fechar caixa, atualizar status no KDS.
- Integração genérica: rota pública `/api/public/pos/$slug` (webhook) validando chave do restaurante (hash + comparação segura) e formato único com Zod; adaptadores por provedor convertem para o formato TIPE e gravam em `table_bill_items`. PDV TIPE usa o mesmo caminho interno.
- Painel dividido em componentes por seção (hoje tudo está em um arquivo só), rotas filhas em `/$restaurante/...` (ex.: `/marealta/caixa`), preservando `/$restaurante/$mesa` para o cliente (códigos `mesaN` e slugs reservados das seções).
- Seed do Maré Alta via migração.
