# Prospecção ativa de restaurantes

Máquina de leads outbound da Tipe, dentro da Central (Comercial > Prospecção). Não é um CRM à parte:
quando o restaurante responde e há um contato real, ele vira `restaurant_leads` e entra no funil
existente (o gatilho `crm_on_lead_created` cria oportunidade + tarefa).

## Fluxo

1. **Coleta** (`scripts/prospeccao/coletar-osm.ts`, workflow *Prospecção de restaurantes*): consulta o
   OpenStreetMap (Overpass) pelo município, normaliza telefone/site/Instagram, remove duplicados,
   pontua e grava em `crm_prospects`. Reexecutar atualiza dados e score, mas nunca mexe em status,
   cadência ou histórico. Toda segunda às 6h (Fortaleza) roda sozinha; outras cidades pelo disparo manual.
2. **Fila do dia**: quem respondeu, os toques vencidos da cadência e os 20 melhores novos (ritmo sustentável).
3. **Cadência** (5 toques em 14 dias): D0 WhatsApp, D2 ligação, D5 Instagram (simulador), D9 WhatsApp
   (prova + convite), D14 visita ou encerramento. Sem telefone, o canal cai para Instagram, e-mail ou visita.
   A tela abre o WhatsApp com o rascunho; a pessoa revisa, envia e registra o resultado.
4. **Conversão**: "Interessado" pede nome, cargo e e-mail do contato e cria o lead no funil.

## Score (0 a 100) e faixas

Tipo de casa (serviço à mesa), canal de contato (celular/WhatsApp > fixo), Instagram, site, e-mail,
polo gastronômico (Varjota/Meireles/Mucuripe, Aldeota, Praia de Iracema, Cocó, Papicu), atende à noite,
cozinha de salão, nota/avaliações (quando houver Google Places). Rede/franquia e falta de canal perdem pontos.
Faixa A ≥ 65, B ≥ 45, C < 45. Regras em `src/lib/tipe/prospeccao.ts` (`pontuar`), com testes.

## Fontes

- **OpenStreetMap** (padrão): gratuito, licença ODbL, atribuição "© colaboradores do OpenStreetMap" na tela.
  Cobertura de telefone/horário é parcial; o score já considera isso.
- **Google Places API** (próximo passo, opcional): traz telefone, nota e nº de avaliações com mais cobertura.
  Exige chave e cartão no Google Cloud (há crédito mensal gratuito). Só ativar com o ok do Roberto.
  O esquema já tem `rating`, `reviews_count` e `source = 'google_places'`.
- Não raspar o Google Maps (viola os termos).

## LGPD

- Só dados públicos de empresa. Base legal: legítimo interesse (art. 7º, IX) para contato B2B.
- Toda mensagem escrita oferece a saída ("responda SAIR"). "Pediu para não receber" ou "Não contatar mais"
  grava telefone, e-mail, Instagram e a referência da fonte em `crm_optout`; a coleta pula esses registros.
- Retenção: descartados e opt-outs sem lead somem após 12 meses (`crm_prospects_retencao()`, chamada a cada coleta).
  A lista de supressão guarda só a chave, não o restante dos dados.
- Acesso: founder ou equipe interna com a seção Comercial, sempre com 2FA; escrita só pelo servidor.

## Rodar à mão

```bash
CIDADE=Fortaleza UF=CE DDD=85 bun scripts/prospeccao/coletar-osm.ts            # só CSV/JSON em prospeccao-saida/
GRAVAR=1 DATABASE_URL=postgres://... bun scripts/prospeccao/coletar-osm.ts      # grava no banco
```
