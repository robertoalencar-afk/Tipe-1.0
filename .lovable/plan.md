# Painel do restaurante por endereço próprio + PDV simulado (Maré Alta)

## Objetivo
Cada restaurante terá seu próprio endereço na Tipe (ex.: `tipe.digital/marealta`). Lá a equipe entra, cadastra mesas, gera os links/QR das mesas e lança pedidos em um PDV simulado com cardápio real de Fortaleza. O cliente acessa só pelo link da mesa (ex.: `tipe.digital/marealta/mesa12`). Os itens fictícios fixos deixam de existir: a conta do cliente passa a vir do que for lançado no PDV simulado.

## Endereços
- `tipe.digital/marealta` — área do restaurante (pede login da equipe do Maré Alta).
- `tipe.digital/marealta/mesa12` — conta da mesa para o cliente (sem login).
- O link antigo `/mesa/mare-alta/12` redireciona para o novo formato.
- `/entrar` continua existindo para o fundador e para quem não sabe o endereço do restaurante.

## PDV simulado (estilo Saipos)
Cadastro inicial do Maré Alta, típico de restaurante de praia em Fortaleza:
- **Cardápio (~40 itens em categorias):** entradas (caranguejo, casquinha de siri, pastel de camarão, isca de peixe, macaxeira frita), pratos (peixada cearense, moqueca de camarão, camarão ao alho e óleo, lagosta grelhada, baião de dois com carne de sol, paçoca, filé de pescada), acompanhamentos (arroz, pirão, feijão verde, farofa), sobremesas (cartola, tapioca de coco, pudim, sorvete de tapioca), bebidas (água de coco, sucos de cajá/acerola/graviola, refrigerantes, cervejas, caipirinhas de cajá/caju, água).
- **Garçons:** 5 garçons com nome e código.
- **Mesas:** 20 mesas (1 a 20), cada uma com status livre/ocupada/encerrada.
- Preços em reais, com os 10% de serviço já existentes nas regras.

## Painel do restaurante (`/marealta`)
Abas:
1. **Mesas** — mapa em tempo real (livre, ocupada, aguardando confirmação, encerrada). Ao abrir uma mesa: itens, pagos, reservados e pagamentos (cliente, valor, hora).
2. **Lançar pedido (PDV)** — escolher mesa e garçom, tocar nos itens do cardápio e quantidades, enviar. Os itens aparecem na hora na conta do cliente. Também permite **abrir** e **fechar/reiniciar** mesa manualmente.
3. **Confirmações** — fila de pagamentos em dinheiro/maquininha com "Confirmar recebimento" e "Cancelar".
4. **Mesas e QR Codes** — cadastrar/ativar/desativar mesas; cada mesa mostra seu link (`tipe.digital/marealta/mesa12`), QR Code para imprimir e botão "gerar novo código" (invalida QR antigo, útil se alguém fotografar).
5. **Cardápio e garçons** (dono) — editar itens, preços, disponibilidade e garçons.
6. **Equipe** (dono) — já existente.

## Lado do cliente
- A conta e o garçom responsável vêm do PDV simulado (o que foi lançado para aquela mesa).
- Mesa sem pedidos mostra "Nenhum pedido ainda — chame o garçom".
- Todo o fluxo atual (nome, itens → meio → pagamento, atividade, mesa encerrada, reabertura em 2 min) é mantido.

## Fora desta etapa
- Conexão real com Saipos/TOTVS (o PDV simulado já usa o mesmo formato, para trocar depois pelas chaves reais).
- Pagamentos reais e painel do fundador/garçom.

## Detalhes técnicos
- Novas tabelas: `pdv_menu_categories`, `pdv_menu_items` (restaurant_id, code, nome, preço, disponível), `pdv_waiters`, `pdv_orders` (restaurant_id, table_number, waiter_id, created_at), `pdv_order_items`. Seed do Maré Alta na migração (slug `marealta`; slug antigo `mare-alta` migrado).
- `restaurant_tables`: adicionar `code` (ex.: `mesa12`, único por restaurante), `access_token` (aleatório, regenerável) e `waiter_id`. QR aponta para `/{slug}/{code}?t={token}`; token inválido mostra "QR desatualizado".
- RPC `pdv_launch_order` (SECURITY DEFINER, cargo owner/cashier/waiter) grava o pedido e faz upsert em `table_bill_items`, mantendo reserva/pagamento. RPC `pdv_close_table` reutiliza `archive_and_reopen_table` + limpa itens.
- `getTableBill` passa a ler do PDV simulado (adaptador `simulado-db`), mantendo o adaptador Saipos para quando houver token.
- Rotas: `src/routes/$restaurante.tsx` (layout; decide painel), `$restaurante.index.tsx` (painel, client-only com login), `$restaurante.$mesa.tsx` (cliente, pública). Rotas fixas (`/entrar`, `/painel`, `/reset-password`) continuam com prioridade sobre o slug; lista de slugs reservados bloqueia nomes como `entrar`, `api`, `painel`.
- RLS: cardápio/garçons visíveis a membros; anon só lê o necessário da mesa via server function com checagem do token.
