# Lebre no cardápio

O proprietário ativa o cuidado no Cardápio. A área mostra sugestões com Aplicar/Dispensar; fotos e descrições ausentes são detectadas diretamente, sem modelo. Destaques e combinações sugeridos por IA nunca são publicados sem aprovação. Preços, alergênicos e informações alimentares continuam sob controle do restaurante.

A rotina `POST /api/public/menu/review`, autenticada pelo mesmo `CRON_SECRET` das outras rotinas, roda a cada cinco minutos via `tipe-cron`. Processa até dois restaurantes por execução, ordenados pela próxima revisão. Cada restaurante tem uma licença atômica para impedir sobreposição entre cron e painel. A análise é diária e também se renova quando nome, descrição ou disponibilidade dos pratos mudam. A tradução processa três pratos por lote.

A opção **Traduzir e publicar automaticamente com IA** é independente da exibição do mascote. Português é obrigatório; inglês e espanhol são opcionais. A geração usa `askAI`, a mesma cota atômica `panel:<slug>` da Lebre e o teto do provedor. Falhas de cota ou provedor deixam um aviso e uma nova tentativa agendada. O idioma só é anunciado no Order quando os nomes e descrições de todos os pratos disponíveis têm tradução para a versão atual do original; caso contrário, o português continua disponível.

A RPC `publish_menu_translation`, somente service_role, verifica opt-in, idiomas, versão original e configuração anterior em uma única operação, sem sobrescrever edições concorrentes. Preferências e propostas ficam em `menu_assistant`, com RLS e leitura apenas por proprietário/gerente do próprio restaurante com a sessão MFA exigida. Escritas passam por autorização de proprietário no servidor. A leitura pública retorna somente os idiomas preparados, nunca propostas ou preferências privadas.

**Exibir mascote** é uma preferência deste navegador por restaurante. Ocultar a Lebre não pausa a análise e não remove o atalho de conversa. No computador, o mascote ocupa o espaço reservado na barra lateral; no celular, aparece como um companheiro recolhível. A animação existente respeita movimento reduzido.

Validação: testes unitários de cota, propostas, idiomas e comparação da origem; PostgreSQL isolado para RLS, autorização, licença, opt-out e concorrência; verificação visual em desktop e celular. Os dados da prévia visual são ilustrativos e não entram no site publicado.
