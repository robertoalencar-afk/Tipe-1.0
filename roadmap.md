# Roadmap

- [x] Mascote da maquininha: olhos fechados iguais aos demais + limpar linhas vazando nas orelhas
- [x] Mascote da conta (rating): corrigir vazamento de tinta no fundo escuro
- [x] Mascote do OK (thanks): remover bolinha branca visível no fundo escuro
- [x] Testar todos os mascotes em fundo claro e escuro
- [x] Mascotes redesenhados em alta definição com bordas nítidas e testados em fundo claro e escuro
- [x] Lista de certinhos da abertura: adicionar "Pagamento por carteiras digitais" acima de "Lançamento em breve" (pedido 10h29)
## Revisão geral e Central Jurídica
- [x] Corrigir e validar a home atual, preços ocultos, seção pública e textos gerais, incluindo planos mensal/anual e WhatsApp +5585985591062
- [x] Revisar Mesa Viva, acessibilidade e eventos com consentimento
- [x] Validar status Piloto no CRM
- [x] Auditar segurança de pagamentos, PDV e gorjeta 70/30 sem alterar o fluxo bloqueado
- [x] Aplicar a regra 70% equipe / 30% TIPE após o recebimento integral da gorjeta na conta Pagar.me da TIPE, sem mudar a forma de pagamento
- [x] Exibir no painel e no histórico tentativas do PDV de cancelar itens já pagos
- [ ] Importar o DOCX integral e implementar a Central Jurídica após validação dos [DEFINIR] e data real de publicação
- [x] Testar celular, desktop, links, HTML do servidor e fluxos afetados

## Segurança Fase A
- [x] claim_founder bloqueada; cabeçalhos de segurança (CSP em modo de teste)
- [x] CPF/Pix cifrados e mascarados
- [x] Taxa de serviço definida pelo restaurante (cliente não altera)
- [x] Relatório da taxa por período e garçom
- [x] Quarentena de 48h na troca de Pix + e-mails + tela do dono
- [x] 2FA obrigatório para founders + códigos de recuperação
- [x] Alertas de segurança por e-mail agrupados
- [x] Registro de violações da CSP
- [ ] Trocar CSP para modo obrigatório após 7 dias sem violações legítimas (aguarda prazo)
- [ ] Alerta de pico de falhas de login (login acontece direto no serviço de autenticação; precisa de outra abordagem)

## Lebre no painel
- [x] Lebre deve conseguir fechar e liberar mesa (com confirmação) e explicar quando uma gorjeta pendente trava a mesa

## Pacote consolidado (out/2026)
- [x] Parte 1: segurança (frame-ancestors, isolamento, teto da Lebre, .gitignore, backups, login, remover taxa, saque mínimo)
- [ ] Parte 2: limite de mesas por plano (aguarda confirmação do Roberto)
- [ ] Parte 3: desempenho, região e GitHub
- [ ] Partes 4 e 5: logo de e-mail e Central Jurídica (anexos recebidos, aguardam a vez)
