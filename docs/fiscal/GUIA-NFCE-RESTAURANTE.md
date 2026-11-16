# NFC-e para restaurantes na Tipe — guia fiscal (16/11/2026)

> **Aviso:** orientação geral de pesquisa, não substitui contador habilitado (CRC). Confirme CFOP, CSOSN/CST, NCM e cClassTrib de cada item com o contador do restaurante antes da produção.

## 1. Quem emite
- **O restaurante emite**, com o próprio CNPJ, certificado A1 e CSC. A Tipe é software (SaaS) que prepara e transmite pelo emissor (Focus NFe); não é emitente nem responsável tributária pela venda.
- A Tipe guarda configuração cifrada, fila, XML/DANFC-e e trilha de auditoria. Não emite em nome de terceiros sem a configuração do próprio CNPJ.

## 2. Regras que valem em 2026
| Tema | Regra | Impacto na Tipe |
|---|---|---|
| Ceará: fim do MF-e/CF-e | Decreto 36.417/2025: NFC-e (modelo 65) substitui MF-e/CF-e para consumidor final a partir de 01/01/2026; autorização via SVRS. | NFC-e é o documento certo no CE. UF CE usa autorizadora SVRS (o Focus abstrai). |
| Credenciamento | Restaurante se credencia como emissor de NFC-e na SEFAZ-CE e gera **CSC + ID do CSC** (um para homologação, outro para produção). | Campos já existentes na Configuração fiscal da Gestão. |
| Certificado | e-CNPJ **A1** (arquivo .pfx, validade 1 ano). A3 (token) não funciona em nuvem. | Upload cifrado; avisar vencimento. |
| Meios de pagamento (CE) | IN SEFAZ-CE 87/2025 e cronograma IN 142/2025: vincular pagamento eletrônico à NFC-e (CNPJ da credenciadora, bandeira, autorização). Restaurantes/lanchonetes (CNAE 5611-2/01 e 5611-2/03): prazo prorrogado a **03/11/2026** (IN 66/2026), já em vigor. | Pix/carteira via Pagar.me: informar credenciadora; maquininha externa: classificar e informar dados. Já previsto em "FiscalMaquininha". |
| NFC-e para CNPJ | **Ajuste SINIEF 12/2026** (DOU 09/04/2026) revogou o Ajuste 11/2025: NFC-e pode identificar destinatário com CNPJ de novo, desde que consumidor final. | Não bloquear CNPJ do cliente. Identificação do cliente (CPF/CNPJ) ainda pendente no fluxo. |
| Reforma tributária (ano-teste) | NT 2025.002 (v1.40, 20/05/2026): grupos IBS/CBS (CBS 0,9% e IBS 0,1% destacados, sem recolhimento em 2026). Regime Normal: risco de rejeição a partir de **ago/2026**. **Simples Nacional e MEI: dispensados em 2026** (LC 214/2025 art. 348), exigência a partir de 2027. | Perfis tributários já aceitam `ibs_*`/`cbs_*`. Ativar no perfil Regime Normal; Simples fica opcional até 2027. |
| DANFE Simplificado | Ajustes SINIEF de 2026 criam DANFE simplificado tipo 2 (a partir de 03/08/2026). | DANFC-e com QR Code continua; enviar link/QR por e-mail/WhatsApp é aceito como consulta. |
| Contingência | Offline (tpEmis 9) quando SEFAZ cair: emitir e transmitir em até 24 h. | Focus trata; a fila da Tipe nunca reemite, só consulta a mesma referência. |
| Cancelamento | Até 30 min após autorização (prazo comum na NFC-e; confirmar no CE), com justificativa ≥15 caracteres. | Só o dono cancela. |

## 3. Tributação típica de restaurante (confirmar com contador)
- **Simples Nacional:** CSOSN 102 (sem crédito) para refeições; CSOSN 500 + CFOP 5405 para bebidas/itens com ICMS-ST (ex.: refrigerante, cerveja, água). CFOP 5102 (revenda) ou 5101 (produção própria) para pratos, conforme orientação do contador. NCM de refeição costuma ser 2106.90.90; bebidas têm NCM próprio.
- **Regime Normal (Lucro Presumido/Real):** CST ICMS conforme RICMS-CE + IBS/CBS (cClassTrib) obrigatórios.
- Taxa de serviço (10%) e gorjeta: em geral fora da base de ICMS quando opcionais; a gorjeta extra da Tipe (70/30) **não entra** na NFC-e da conta.
- **MEI:** pode emitir NFC-e, mas só é obrigado em operações específicas; muitos usam NF-e avulsa. Confirmar.

## 4. Checklist para ativar um restaurante
1. Contador confirma regime, CFOP/CSOSN por categoria do cardápio e NCM.
2. Credenciamento NFC-e na SEFAZ-CE e geração do CSC (homologação e produção).
3. Certificado A1 válido.
4. Conta no emissor (Focus NFe; teste grátis 30 dias) — **contratação só com ok do Roberto**.
5. Configuração fiscal na Gestão (homologação) → emitir notas de teste → revisão marcada homologada → só então produção.

## Fontes
- [Ceará encerra MF-e/CF-e, migração para NFC-e em 2026 (Contábeis)](https://www.contabeis.com.br/noticias/73536/ceara-encerra-mfe-e-cf-e-migracao-para-nfc-e-comeca-em-2026/)
- [SEFAZ-CE IN 87/2025 meios de pagamento (TecnoSpeed)](https://blog.tecnospeed.com.br/sefaz-ce-in-87-2025-integracao-dos-meios-de-pagamento/) · [IN 87/2025 (SEFAZ-CE PDF)](https://www.ce.gov.br/sefaz/wp-content/uploads/sites/46/2020/08/Instrucao-Normativa-87_2025_04.pdf) · [IN 142/2025](https://www.legisweb.com.br/legislacao/?id=486765)
- [Sefaz-CE sobre CFOPs aceitos na NFC-e (Coad)](https://www.coad.com.br/home/noticias-detalhe/132057/sefaz-ce-esclarece-sobre-os-cfops-aceitos-na-nota-fiscal-de-consumidor-eletronica)
- [Ajuste SINIEF 12/2026 revoga proibição de NFC-e para CNPJ (NetCPA)](https://netcpa.com.br/noticias/urgente-cpa-publicado-ajuste-sinief-no-122026-que-revoga-a-proibicao-de-emissao-da-nfc-e-para-cnpj/24249) · [Econet](https://blog.econeteditora.com.br/nfc-e-para-cnpj-volta-a-ser-permitida-o-que-muda-agora/)
- [NT 2025.002 v1.40 (Systax)](https://www.systax.com.br/?p=42952) · [Simples/MEI e notas na reforma (Jornal Contábil)](https://www.jornalcontabil.com.br/noticia/reforma-tributaria-divulgadas-novidades-nas-notas-fiscais-emitidas-por-simples-e-mei/) · [Rejeição 1115 adiada, v1.33](https://portalspedbrasil.com.br/forum/reforma-tributaria-nt-2025-002-v-1-33-da-nf-e-adia-a-rejeicao-do-ibs-cbs-mas-mantem-a-obrigatoriedade-legal-em-1o-01-2026/)
- [Focus NFe: NFC-e](https://focusnfe.com.br/produtos/nota-fiscal-consumidor-nfce/) · [IBS/CBS na Focus](https://doc.focusnfe.com.br/docs/ibs-e-cbs)
- Fóruns de contabilidade (CSOSN 102/500, CFOP 5405) são referência de prática, não norma: [Contábeis](https://www.contabeis.com.br/forum/tributos-estaduais-municipais/328756/cfop-5405-e-cson-500-em-refeicoes-que-tributos-dos-insumos-foi-pago-anteriormente-por-st/).

Fontes secundárias (blogs/consultorias) divergem em datas; conferir texto oficial no Portal da NF-e/DOU antes da produção.
