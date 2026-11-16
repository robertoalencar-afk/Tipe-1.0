# Emissores fiscais — avaliação em 11/11/2026

O primeiro conector escolhido para a Tipe é Focus NFe. A implementação mantém um contrato de adaptadores para integrações futuras. Nenhum serviço foi contratado e nenhum contato comercial foi enviado. A ativação depende da conta do restaurante, cobertura do CNPJ e homologação.

| Critério | Focus NFe | PlugNotas / TecnoSpeed |
|---|---|---|
| Produtos para o restaurante | APIs de NF-e e NFC-e; transporte inicial já desenvolvido e testado localmente na Tipe | APIs de NF-e e NFC-e; conector ainda precisa ser implementado e testado |
| Reforma tributária | Documenta os campos IBS/CBS e grupos exigidos por CST/cClassTrib | Documenta integração da calculadora oficial para IBS/CBS, com ativação por empresa |
| Configuração tributária | Classificação e dados da operação precisam ser corretamente informados | Também exige classificação e dados corretos; a calculadora não substitui esse cadastro |
| Custo público consultado | Retail: R$62,90/mês, 500 NFC-e e 100 NF-e, 1 CNPJ/CPF; adicionais R$0,055/NFC-e e R$0,16/NF-e. Retail+: R$657,90/mês, 9.000 NFC-e e 1.000 NF-e, CNPJs/CPFs ilimitados; adicionais R$0,065/NFC-e e R$0,16/NF-e | Não foi obtida tabela de preços nas páginas oficiais consultadas; requer proposta comercial |
| Integração contábil pretendida pela Tipe | XML autorizado, eventos e resumo por período; ainda não conectado no aplicativo | Mesma saída pretendida; depende de implantação do conector |

A Focus foi escolhida como primeiro conector, considerando sua tabela pública de preços e a base técnica iniciada. A comparação não representa contratação nem comprovação de atendimento a todas as operações fiscais. O valor final depende do volume de notas e das condições comerciais.

A calculadora do PlugNotas descrita pelo fornecedor não contempla a emissão NFC-e em contingência Neverstop. Campos adicionais de IBS/CBS podem impedir o uso automático da calculadora. Esses cenários precisam de testes e tratamento explícitos.

Fontes primárias consultadas:
- [Preços Focus, página canônica atual](https://focusnfe.com.br/precos/). A cópia em 2025.focusnfe.com.br apresenta valores diferentes e não foi usada na comparação final.
- [Guia IBS/CBS Focus](https://doc.focusnfe.com.br/docs/ibs-e-cbs).
- [API PlugNotas](https://docs.plugnotas.com.br/).
- [Calculadora oficial integrada ao PlugNotas](https://atendimento.tecnospeed.com.br/hc/pt-br/articles/37346155787543-Configurar-a-Calculadora-da-Reforma-Tribut%C3%A1ria-para-NF-e-NFC-e-NFCom-PlugNotas).

Nenhum destes dados autoriza apresentar o módulo Tipe como homologado. A Tipe ainda não emite notas pela aplicação e não realizou emissão real nem homologação na SEFAZ nesta implementação.
