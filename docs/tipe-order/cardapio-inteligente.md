# Cardápio inteligente do Tipe Order

No painel do restaurante, abra Cardápio → Cardápio inteligente. O administrador pode destacar produtos, editar selos e alergênicos, declarar informações alimentares, selecionar combinações, complementos e versões, preparar traduções revisáveis e informar Instagram e avaliações.

O cliente encontra busca sem distinção de acentos (nome, descrição e categoria), filtros alimentares, destaques, textos dos produtos em português/inglês/espanhol, opção de letras maiores e recomendações no momento de adicionar um prato. Categorias, selos, alergênicos e os controles do visualizador 3D mantêm os textos cadastrados/originais; a tradução não se estende à conta de pagamento.

## Operação e limites

- Adicionais e versões são produtos cadastrados com preço próprio: entram como linhas separadas no pedido, KDS e conta. Não há grupos de modificadores obrigatórios, limites por prato ou vínculo de preparo entre principal e complemento nesta implementação.
- Sugestões usam apenas produtos do mesmo restaurante; itens esgotados, ausentes, duplicados e o próprio produto não são sugeridos. O filtro alimentar também vale para sugestões.
- Os rótulos alimentares são declarados pelo restaurante. Ausência de alergênicos não implica ausência de risco. Não há inferência automática de ingredientes.
- Tradução com IA usa `askAI`, os provedores existentes e o teto diário global, além de 10 chamadas por restaurante/hora. A saída é validada e devolvida como rascunho. Só Salvar apresentação publica os textos.
- Fotos, banco de imagens, importação de cardápio e efeito de profundidade continuam usando os recursos existentes. Melhoria automática de fotografias por IA ainda depende de um provedor de edição de imagem; não há botão simulando essa capacidade.
- As métricas contam aberturas do visualizador e toques em adicionar, somente após consentimento de Medição. Não são visitantes únicos, impressões ou vendas; não permitem calcular conversão. Nenhum nome, mesa, sessão ou IP é armazenado nos contadores. O IP participa apenas do limitador de abuso existente.
- Contadores públicos são dados de interação não auditáveis, sujeitos a bloqueadores e automação. Vendas reais continuam em Relatórios.

## Banco e implantação

Migração aditiva `0061_menu_intelligence.sql`: JSON editorial nos produtos, links no restaurante e métricas diárias. Escritas editoriais continuam sujeitas às políticas atuais de dono/MFA. Métricas são legíveis apenas por dono/gerente do próprio restaurante com MFA, e só a service role pode registrar contadores pela função que verifica produto e restaurante.

O deploy existente aplica a migração antes de publicar. As leituras públicas do novo JSON são separadas; antes da migração, o cardápio básico continua funcionando. O editor informa a migração pendente.

## Verificação

`bunx vitest run src/lib/tipe/menu-intelligence.test.ts`

`PGLITE_MODULE=/caminho/@electric-sql/pglite/dist/index.js node scripts/db/tests/menu-intelligence.mjs`

O CI executa ambos, além da checagem de tipos, testes existentes e build. O teste SQL cobre isolamento de restaurante, produto esgotado, contadores, privilégios, perfis e MFA.

Teste manual mínimo: configure um prato destacado com foto e duas sugestões; esgote uma delas; marque uma restrição alimentar confirmada; prepare, revise e salve traduções; abra a mesa pelo QR; combine categoria, busca e dieta; adicione principal e complemento; confira os preços e as linhas na cozinha/conta. Confira que recusar Medição não gera contadores e que autorizar permite contar novas interações. Verifique letras maiores e navegação por teclado em celular e desktop.
