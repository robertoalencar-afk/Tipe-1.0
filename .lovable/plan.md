# Painel do restaurante — base fullstack segura

## Objetivo
Criar o sistema de gestão da Tipe para vários restaurantes, com login por cargo, espelho das mesas do PDV (Saipos e TOTVS Food Service) e confirmação de pagamentos presenciais. Dados protegidos por restaurante e backup automático da nuvem.

## O que será construído

1. **Login da equipe** (e-mail/senha + Google), página "Entrar", "Esqueci minha senha" e sair.
2. **Cargos e acesso**
   - Fundador Tipe: vê todos os restaurantes e cadastra novos.
   - Dono: vê e administra o próprio restaurante e convida a equipe.
   - Caixa/gerente: confirma pagamentos presenciais e acompanha mesas.
   - Garçom: vê as próprias mesas e gorjetas (tela simples nesta etapa).
3. **Cadastro real**: restaurantes, mesas e garçons salvos na nuvem, com o PDV escolhido (Saipos ou TOTVS). O mock "Maré Alta / mesa 12" vira o primeiro restaurante cadastrado.
4. **Painel do restaurante** (`/painel`)
   - Mapa de mesas em tempo real: livre, ocupada, aguardando confirmação, encerrada.
   - Detalhe da mesa: itens, pagos, reservados, pagamentos com cliente/valor/hora.
   - Fila "Aguardando confirmação": botões **Confirmar recebimento** (dinheiro/maquininha) e **Cancelar** (libera os itens de volta).
   - Mesa encerrada reabre sozinha em 2 minutos (regra já existente, agora feita pelo servidor).
5. **Segurança**
   - Cada pessoa só vê dados do próprio restaurante; cargos em tabela separada.
   - Confirmações só pelo servidor, verificando o cargo.
   - Registro de auditoria: quem confirmou/cancelou, quando.
   - Proteção contra senhas vazadas e varredura de segurança ao final.
6. **Backup**: a nuvem já faz backup diário automático; adicionamos histórico de auditoria que nunca é apagado (mesmo quando a mesa reabre, os pagamentos antigos são arquivados, não excluídos).

## Fora desta etapa
- Conexão real com Saipos/TOTVS (fica preparada, aguardando as chaves de API).
- Pagamentos reais (Pix/carteiras) e painel completo do fundador com relatórios.

## Detalhes técnicos
- Tabelas: `restaurants`, `restaurant_tables`, `staff_members` (user_id, restaurant_id, nome), `user_roles` (enum app_role: founder, owner, cashier, waiter; com restaurant_id), `payment_audit_log`, `archived_payments`. Funções `has_role` e `is_restaurant_member` SECURITY DEFINER.
- RLS: leitura por membro do restaurante; fundador lê tudo; cliente anônimo continua lendo somente a mesa (sem expor dados da equipe).
- Server functions com `requireSupabaseAuth`: `confirmPayment`, `cancelPayment` (RPC transacional move reservado → pago ou libera), `listTables`, `inviteStaff`.
- Rotas sob `_authenticated/`: `/painel`, `/painel/mesa/$mesa`, `/painel/equipe`; públicas `/entrar`, `/reset-password`.
- Reabertura de mesa passa a arquivar em vez de apagar.
