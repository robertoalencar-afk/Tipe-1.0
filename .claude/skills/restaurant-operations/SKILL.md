---
name: restaurant-operations
description: Use ao mexer em mesas, comandas, pedidos, cozinha (KDS), garçom, salão ou fechamento de turno da Tipe, para respeitar o fluxo real de um restaurante brasileiro.
---

# Operação de restaurante na Tipe

- Uma mesa tem uma conta aberta por vez. QR abre a mesa; pagamento usa o `session_token` rotativo. Reabrir arquiva pagamentos (`archived_payments`), nunca apaga.
- Pedido do QR, do garçom, do totem e do PDV externo entram pelo mesmo caminho (`pdv_ingest_event`) com chave idempotente: o mesmo envio nunca duplica.
- Item já pago ou reservado não pode ser cancelado. Cancelamento exige motivo e perfil autorizado.
- Cozinha: novo → em preparo → pronto → servido. "Pronto" avisa o garçom da mesa. Atraso é calculado pelo tempo desde o pedido.
- Garçom vê só as próprias mesas e os próprios ganhos. Gerente aprova estornos; garçom só pede.
- Mesa só é liberada quitada e sem pagamento pendente.
- O motor de referência dessas regras, testado, está em `src/lib/tipe/demo/engine.ts`; a versão real está nas RPCs e em `src/lib/tipe/*.functions.ts`. Mudou a regra num lado, confira o outro.
- Antes de criar algo novo, procure nos PRs abertos (colibri #6–#9 tem balcão, KDS, garçom no celular, totem).
