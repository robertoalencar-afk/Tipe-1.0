# Totens: cadastro de dispositivos (desenho, não construído)

Hoje: rota `/$restaurante/totem` com chave do restaurante; pedido nasce `pending_payment` até o caixa cobrar (`pdv_settle_totem_order`).

Desenho:
- Cadastrar cada totem (nome, local) em Tipe Gestão → Atendimento → Totens.
- Credencial por dispositivo, com validade; renovar e revogar sem afetar os outros.
- Sessão do totem some ao voltar para o início (limpar carrinho) e depois de tempo parado.
- Reinício automático e verificação de versão.
- Pagamento só por terminal homologado, Pix quando integrado, ou caixa. Nunca valor digitado no totem.
- Permissões: administrador configura; gerente vê; caixa e garçom usam.
