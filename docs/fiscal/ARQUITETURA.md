# Módulo fiscal Tipe — proposta de implementação

Data: 11/11/2026. Documento de arquitetura, não uma integração já implementada ou homologada.

## Escopo confirmado pelo usuário

O módulo deve atender restaurantes em todo o Brasil, com configuração por CNPJ/UF e credenciais do emissor do próprio restaurante. Não será um módulo restrito ao Ceará. A implantação de cada CNPJ continua dependendo de regime, cadastro tributário, credenciamento e homologação aplicáveis à operação.

A conexão será por adaptadores identificados, com matriz de capacidades por documento e ambiente. “API fiscal do restaurante” não significa uma URL arbitrária nem compatibilidade automática com qualquer API. Cada serviço exige contrato, autenticação, mapeamento e testes próprios. Nenhuma contratação de serviço pago foi realizada.

NFC-e (venda ao consumidor) e NF-e são os primeiros documentos de produto. NFS-e possui requisitos distintos e precisa de conector/cobertura próprios quando a operação o exigir; não se deve alegar suporte municipal ou nacional apenas por existir no contrato de tipos. Emissão fiscal, cálculo tributário da operação e apuração/recolhimento/escrituração do estabelecimento são responsabilidades distintas. O escopo operacional não deve ser apresentado como uma contabilidade completa.

## Base técnica iniciada

- `src/lib/tipe/fiscal/contract.ts`: contrato de emissores, estados fiscais independentes do pagamento e seleção de perfis por UF, regime e vigência. Falta de revisão ou sobreposição bloqueia a seleção.
- `src/lib/tipe/fiscal/focus.server.ts`: transporte server-side inicial da API Focus NFe para emitir, consultar e cancelar NF-e/NFC-e. Origens fixas, ambiente separado, validação do emitente e nenhuma repetição automática após resultado incerto. Não suporta NFS-e e não emite pela aplicação neste estágio.
- `src/lib/tipe/fiscal/fiscal.test.ts`: testes locais com respostas simuladas. Não são comprovação de homologação na SEFAZ ou no serviço emissor.
- A base não está conectada a rotas, credenciais, banco, vendas ou ao painel. Não habilita emissão e não substitui as etapas descritas abaixo.

## Reforma tributária e manutenção nacional

A parametrização é versionada por vigência, UF, regime, operação e produto. Contemplar no mapeamento as classificações, bases, valores e reduções exigidas pelo layout vigente, incluindo IBS/CBS/IS quando aplicáveis, e sua coexistência com tributos anteriores durante a transição. Não usar uma alíquota única presumida para todos os restaurantes.

A revisão oficial consultada em 11/11/2026 lista a NT 2025.002 v1.53 (publicada em 30/10/2026). O guia IBS/CBS da Focus consultado informa v1.52; essa diferença precisa de validação de compatibilidade antes de qualquer declaração de conformidade. A atualização contínua de layouts, tabelas e regras faz parte do produto; não há uma implementação “pronta para sempre”.

Cada perfil deverá ter responsável pela revisão, origem normativa e versões do layout/tabelas. Usar motor tributário e/ou parametrização validada pela contabilidade para preparar o payload, sem confundir o transporte de campos com cálculo e enquadramento tributário corretos. Alterações regulatórias exigem revalidação e testes de regressão antes da ativação.

## Etapas para operação completa

1. Persistência por restaurante, credenciais criptografadas, permissões e auditoria.
2. Cadastro fiscal da empresa e dos produtos, revisão de perfis e integração ao motor tributário.
3. Snapshot da venda e dos pagamentos confirmados, com os identificadores fiscais reais do provedor financeiro.
4. Orquestração e outbox persistentes; consulta/reconciliação de resultados incertos; webhooks autenticados.
5. Configuração e operação no Tipe Gestão; documentos autorizados e consulta segura pelo cliente.
6. Implementação e testes de cada conector suportado. A pesquisa inicial identificou documentação oficial de NF-e/NFC-e em Focus NFe e PlugNotas; apenas o transporte Focus foi iniciado, sem contratação ou homologação.
7. Matriz de homologação por provedor, documento, UF/regime aplicável e versão normativa. Somente liberar o que passar na matriz, sem anunciar cobertura apenas por enumeração das 27 UFs.

## Evidência do sistema atual

- `src/lib/tipe/pdv/registry.server.ts`: somente Lançamento Tipe e API Tipe registrados.
- Ambos os adaptadores informam `devolvePagamento: false`; o contrato de integração não equivale a um conector fiscal ativo.
- `src/lib/tipe/integration-requests.functions.ts`: recebe solicitações e credenciais de integração; não emite documentos fiscais.
- `src/lib/tipe/payments.functions.ts`: comprovante enviado após pagamento aprovado e verificação da sessão da mesa; não retorna XML, chave fiscal ou autorização da SEFAZ.
- `src/lib/tipe/pagarme.server.ts`: o modelo de resposta atualmente usado não contempla todos os identificadores necessários à vinculação fiscal. É preciso verificar o contrato atual do provedor e persistir os identificadores reais, sem derivá-los do ID interno Tipe.

## Escopo funcional

1. Configuração por restaurante: CNPJ, inscrição estadual, UF, município, endereço, regime, ambiente e credenciais exigidas pelo emissor. CSC/certificado ou vínculo equivalente conforme o provedor. Segredos criptografados, nunca devolvidos ao navegador.
2. Cadastro tributário dos produtos: classificação e códigos necessários ao regime/UF. Não inventar NCM, CFOP, CST/CSOSN ou alíquotas. Validar com a contabilidade e com o layout vigente, incluindo alterações da reforma tributária aplicáveis à operação.
3. Documentos fiscais: referência estável da venda, itens e valores congelados no momento da emissão, destinatário quando aplicável, formas e identificadores reais dos pagamentos, resposta de autorização, chave, XML e DANFE/consulta.
4. Operação no Tipe Gestão: visualizar situação, emitir conforme a política fiscal definida, consultar, tratar rejeições e solicitar cancelamento com motivo. A ativação em produção só ocorre após os testes e a configuração real do estabelecimento.
5. Comprovante ao cliente: continua disponível independentemente de uma falha de emissão. Vincular o documento autorizado e permitir envio/consulta segura, sem apresentar um recibo como nota.

## Venda, pagamento e nota

A venda fiscal não pode ser identificada apenas pelo número reutilizável da mesa. Usar referência da sessão/conta e um snapshot dos itens. Uma venda pode ter vários pagamentos; cada pagamento pode quitar frações de itens. A emissão deve respeitar a política fiscal adotada e impedir que o mesmo consumo seja documentado duas vezes. O momento da emissão deve seguir as regras da UF/operação, não uma regra universal de “emitir somente quando pagar”.

Carteiras digitais devem ser classificadas a partir da transação efetivamente processada (cartão, Pix etc.). Guardar autorização e demais identificadores do provedor necessários ao emissor. O ID do pedido da Tipe não substitui automaticamente o código de autorização ou o endToEndId de Pix.

Taxa de serviço e gorjeta extra exigem tratamento separado no mapeamento fiscal. A gorjeta extra permanece fora do histórico da conta do restaurante; a regra 70/30 não muda. O emissor e a contabilidade definem o tratamento tributário aplicável, sem transferir receita ou documentos entre CNPJs.

Estorno financeiro e cancelamento fiscal são fluxos distintos. Um não executa automaticamente o outro. Ambos precisam de estado, autorização, rastreabilidade e tratamento de falhas.

## Persistência e segurança

Modelo proposto, ainda sujeito ao contrato do emissor: `restaurant_fiscal_settings`, `menu_item_fiscal_profiles`, `fiscal_documents`, `fiscal_document_items`, `fiscal_document_payments`, `fiscal_events` e `fiscal_outbox`.

- RLS e escopo explícito por restaurante em todas as tabelas. Founder não ganha acesso operacional por ser founder.
- Configuração pelo dono; permissões específicas de emissão/cancelamento para o caixa conforme a matriz do projeto. Todas as chamadas administrativas reautorizadas no servidor.
- Respostas do provedor tratadas apenas no servidor. Webhook autenticado e evento correlacionado ao restaurante, documento e ambiente corretos.
- Fila persistente com chave única por operação, claim sob lock, repetição controlada e consulta ao emissor antes de reenviar uma operação com resultado desconhecido. Timeout não cria uma segunda nota.
- Ambiente de homologação separado de produção em credenciais, documentos e referências.
- XML e dados fiscais privados, acesso por autorização ou link temporário; retenção definida conforme obrigação fiscal e política aplicável.
- Migração nova e sequencial em `drizzle/migrations`, aplicada pelo fluxo existente e registrada em `tipe_meta.migracoes`. Nunca editar migrações aplicadas.

## Homologação e aceite

Testar emissão e consulta no ambiente de homologação do provedor; autorização/rejeição, timeout antes e depois da autorização, webhook duplicado/fora de ordem, cancelamento aceito/rejeitado, isolamento entre restaurantes e venda com múltiplos pagamentos. Conferir itens, totais, meios de pagamento e identificadores no XML. Testar também pagamentos por carteiras, Pix e no estabelecimento conforme suporte e regras da operação.

O módulo só é apresentado como emissor funcional depois da validação real. Credenciais de produção, cadastro tributário e documentos reais não são substituídos por fixtures nem por respostas simuladas.

## Fonte normativa inicial

Sefaz-CE, IN 87/2025, texto disponibilizado com alterações posteriores: https://sefazlegis.sefaz.ce.gov.br/api/openFile?id=fb3405db-006a-48dd-ba9d-a051c99b8d52

A norma disciplina vinculação entre pagamento e documento fiscal, informações de pagamento e ECONF em situações específicas, além de exceções e cronogramas. Seu uso nesta proposta não presume que todos os restaurantes, UFs e operações tenham a mesma obrigação. A legislação aplicável e a documentação técnica do emissor precisam ser verificadas na implementação.

## Fontes técnicas nacionais e dos emissores

- Portal NF-e, notas técnicas: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=04BIflQt1aY%3D
- Portal NF-e, tabelas e informes: https://www.nfe.fazenda.gov.br/portal/listaConteudo.aspx?tipoConteudo=B%2F6oigHgyAw%3D
- Focus NFe, emissão NFC-e: https://doc.focusnfe.com.br/reference/emitir_nfce
- Focus NFe, consulta NFC-e: https://doc.focusnfe.com.br/reference/consultar_nfce
- Focus NFe, cancelamento NFC-e: https://doc.focusnfe.com.br/reference/cancelar_nfce
- Focus NFe, operações NF-e: https://doc.focusnfe.com.br/docs/operacoes-disponiveis-na-api
- Focus NFe, campos IBS/CBS: https://doc.focusnfe.com.br/docs/ibs-e-cbs
- PlugNotas, documentação: https://docs.plugnotas.com.br/
