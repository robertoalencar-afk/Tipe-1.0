# 03 — Benchmark de ERPs e backoffice dos EUA (consolidado)

Data de consulta: 14/10/2026. Nota completa, fontes e impedimentos: `notas/erp-usa.md`.

## 1. Os três de Nível 1

| | Restaurant365 | MarginEdge | MarketMan |
|---|---|---|---|
| O que é | ERP completo: contabilidade, estoque, compras, ficha técnica, CMV, escala, folha, multiunidade | camada de custo entre PDV e contabilidade; o cliente mantém QuickBooks/Xero | estoque, compras, fornecedores, desperdício |
| Núcleo | **Daily Sales Summary**: o dia fechado no PDV vira lançamento contábil [DOC] | **foto da nota** processada pela equipe da MarginEdge, custo atualizado e P&L diário [DOC] | pedido de compra, recebimento, contagem, real × teórico [DOC] |
| Integração com PDV | a R365 **puxa** de ~89 fornecedores de PDV (API, FTP ou agente local), nível "Standard" (por item) ou "Summary" (totais) | a ME **puxa** de 50+ PDVs por OAuth, à noite | o **PDV empurra** para a API da MarketMan (29 parceiros) |
| Preço | US$ 469–749 por unidade/mês [MKT] | US$ 350 por unidade/mês [MKT] | US$ 249–449/mês desde ago/2026 [MKT] |
| Dor principal | curva de aprendizado de controller | depende de equipe humana; P&L "de ontem" | integrações irregulares; preço subiu |

Nível 2: **7shifts** (escala, ponto e **tip pooling** por igual, percentual ou pontos, puxando gorjetas do PDV [TELA]); **Craftable** (bar e grupos); **Crunchtime** e **Fourth** (grandes redes, execução de loja, repasse de gorjeta); **Altametrics** (gestão de caixa e cofre). Detalhes em `notas/erp-usa.md` §4.

## 2. Fronteira PDV × ERP

| Camada | Dono de | Ritmo |
|---|---|---|
| **PDV** | pedido, cozinha, conta, pagamento, gorjeta capturada, desconto, cancelamento, caixa do turno | tempo real, turno |
| **ERP/backoffice** | custo pela nota, ficha técnica, contagem, compras, CMV real × teórico, DRE, contas a pagar, conciliação, escala, folha | dia, semana, mês |
| **Compartilhado** | cadastro de itens (PDV cria, ERP liga à receita), funcionários e cargos, ponto, gorjetas (PDV captura, escala distribui), formas de pagamento (PDV registra, ERP concilia) | ao fechar o dia |

A fronteira é **temporal**: o PDV é dono do turno; o ERP é dono do que se calcula depois que o dia fecha [INF, padrão comum aos três].

## 3. Fluxo de dados

```
Conta fechada no PDV (itens, modificadores, descontos, impostos, pagamento, gorjeta, garçom)
   └─► Fechamento do dia de negócio (horário de corte)
          └─► ERP importa (puxa à noite ou recebe push)
                 ├─► Lançamento de vendas (receita por categoria, meios, gorjeta a pagar)
                 ├─► Baixa teórica de estoque (vendas × ficha técnica)
                 │      └─► Custo atualizado pelas notas de compra
                 │             └─► Contagem física ► CMV real × teórico ► variância
                 └─► DRE / prime cost (vendas + CMV + mão de obra)
```

## 4. O que isso indica para a Tipe

**Forma (b), só fechamento de conta.** Nos EUA, o backoffice é agnóstico de PDV por necessidade comercial. A Tipe, no modo (b), não deve ser fonte contábil: ela devolve ao PDV do restaurante o pagamento, o meio (Pix, cartão), a gorjeta e a taxa de serviço, e o PDV continua exportando o dia para o ERP. O dado novo que a Tipe agrega é **gorjeta por garçom e Pix conciliado**.

**Forma (a), Tipe completo.** Não construir contabilidade, contas a pagar com OCR ou CMV real × teórico agora: são produtos inteiros de US$ 350–750 por unidade/mês. O caminho de menor custo:
1. **Resumo diário imutável** por data de negócio, gerado no fechamento do caixa, com versão para reenviar após correção. A Tipe já tem `getDailyClose` e `FechamentoDia.tsx`; falta torná-lo um registro gravado e versionado.
2. Dois níveis de exportação, como a R365: totais (vendas por categoria, descontos, cortesias, taxa de serviço, gorjetas, meios, sangrias, diferenças) e detalhe (vendas por item com modificadores, por conta).
3. Gorjeta e taxa de serviço **separadas da receita**, por garçom.
4. Cancelamentos e reaberturas exportados como eventos (a Tipe já arquiva pagamentos ao reabrir).
5. CSV padrão + API com webhook ao fechar o dia, **sem pedágio para parceiros** (a cobrança de API da Toast é reclamação recorrente da MarginEdge).
6. Depois: **ficha técnica simples + baixa teórica + contagem**, que é o estoque que o restaurante brasileiro pequeno usa (Saipos e Consumer já oferecem, `04b-REALIDADE-BRASIL.md`).
