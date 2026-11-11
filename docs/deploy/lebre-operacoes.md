# Correção da revisão do PR 113

Propostas operacionais privadas, vinculadas ao usuário, restaurante, payload e sessão da mesa. Expiram em dez minutos. A confirmação reautoriza o usuário, trava proposta e mesa, confere códigos/nomes/preços e registra o resultado na mesma transação. Repetir devolve o resultado anterior.

Dono, gerente, caixa e garçom abrem mesa e lançam pedidos. Somente dono, gerente e caixa fecham conta. Cadastro continua restrito ao dono. Fundador global não opera restaurantes sem cargo local.

O próprio garçom ativo prevalece. Sem vínculo próprio, dono/gerente/caixa precisam de garçom ativo na mesa. Não há escolha arbitrária. Sem Order contratado, o primeiro pedido abre a conta. Falha real do Order desfaz a reativação e não informa sucesso.

Verificação: 403 testes automatizados e 25 verificações SQL em PostgreSQL isolado (PGlite 0.5.16). O teste SQL inclui a definição de referência da RPC de lançamento; abertura, fechamento e limite usam stubs. Executado no CI antes de publicar. A migração 0060 é aplicada pelo workflow antes do Worker. Propostas da versão anterior precisam ser solicitadas novamente.

Verificação visual complementar: com contas de cada cargo, abrir mesa ativa/inativa, lançar itens, conferir conta/KDS/garçom e fechar com pagamento pendente. Testes isolados não substituem esta jornada autenticada.
