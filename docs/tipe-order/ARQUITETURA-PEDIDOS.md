# Arquitetura de pedidos

Um modelo de pedido para todas as modalidades (`PedidoDominio` em `eventos.ts`).

- **Canal**: mesa, balcao, totem, tablet, delivery (já existe em `pdv_orders.channel`).
- **Identificação**: mesa, senha, comanda ou externo. Chave única por restaurante e dia.
- **Idempotência**: toda criação carrega `chaveRequisicao` (8 a 64 caracteres). Mesma chave nunca cria dois pedidos (`request_id` no banco).
- **Eventos**: pedido_criado, item_status, pagamento_confirmado etc., com id determinístico (`idDoEvento`) para reprocessar sem duplicar.
- **Status**: transições permitidas só em `PROXIMOS`. Item pago ou reservado em parte não cancela (`podeCancelarItem`).
- **Dinheiro**: só pelo Tipe Pay (mesa, comanda, pulseira) ou pelo caixa (balcão, retirada, totem). Sem gateway novo. Gorjeta extra: 70% garçom, 30% Tipe, separada da taxa de serviço.
- **Quando vai à cozinha**: mesas, comanda e pulseira no envio; balcão, retirada e totem após o pagamento; delivery na entrada do canal.

## Proposta de dados (NÃO aplicada, não está em drizzle)

```sql
-- comandas individuais e pulseiras (planejado)
create table order_comandas (id uuid primary key, restaurant_id uuid not null, numero text not null, status text not null default 'aberta', created_at timestamptz default now());
create table order_pulseiras (id uuid primary key, restaurant_id uuid, lote_id uuid, identificador text unique not null, comanda_id uuid references order_comandas, status text not null default 'livre');
```

Toda tabela com RLS por `restaurant_id`. O identificador da pulseira nunca autoriza acesso ou pagamento sozinho: o link carrega token assinado e a sessão da comanda.
