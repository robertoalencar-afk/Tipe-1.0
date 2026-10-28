---
number: 5
slug: inteligencia-artificial
title: Inteligência artificial
fullTitle: Livro 5. Inteligência artificial na TIPE
description: Onde a TIPE usa IA, limites e supervisão humana.
version: "1.0"
effective: 07/10/2026
audience: ambos
icon: sparkles
readingMinutes: 2
summary: A TIPE usa IA em dois lugares: na Lebre, assistente do painel do restaurante, e na sugestão de divisão de itens na mesa. A IA pode errar. Por isso a Lebre nunca executa nada sem a confirmação de uma pessoa, e você sempre confere a sua parte antes de pagar.
---

## 5.1 Onde usamos IA {#onde-usamos-ia}

| Recurso | Quem usa | O que faz |
| --- | --- | --- |
| Lebre AI | Equipe do restaurante, no painel | Responde dúvidas, resume a operação, analisa fotos e PDFs e prepara ações |
| Sugestão de divisão | Clientes na mesa | Sugere frações de um item a partir de um texto digitado, por exemplo "dividir a pizza entre 3" |

## 5.2 Lebre AI no painel {#lebre-ai-no-painel}

A Lebre aceita texto, voz, fotos e arquivos em PDF. Ela pode explicar o sistema, resumir pagamentos e métricas, ler comandas e cardápios enviados em foto e preparar ações, como abrir uma mesa. A voz é transcrita em texto, e você pode revisar a transcrição antes de enviar.

## 5.3 Sugestão de divisão na mesa {#sugestao-de-divisao-na-mesa}

Quando você descreve como quer dividir um item, o texto é enviado à IA para sugerir as frações. Seu nome não é enviado. A sugestão aparece na tela e só vale depois que você confirma.

## 5.4 Limites e supervisão humana {#limites-e-supervisao-humana}

- Respostas de IA podem conter erros. Confira valores, resumos e leituras de documentos antes de usá-los.
- A Lebre só executa uma ação no sistema depois da confirmação expressa do usuário, e cada ação fica registrada com quem confirmou.
- A Lebre só acessa os dados do restaurante e do perfil do usuário que está conversando.
- A IA não toma decisões automatizadas que afetem direitos de clientes. Quem decide é sempre o restaurante ou o cliente.

## 5.5 Dados enviados à IA {#dados-enviados-a-ia}

- Perguntas frequentes e comandos simples são respondidos pelo próprio sistema da TIPE, sem IA. Os demais conteúdos enviados (texto, áudio, imagens e arquivos) são processados pelo Workers AI da Cloudflare ou pelo Groq, com modelos abertos, e, só se a TIPE habilitar essa reserva, pela Anthropic, com os modelos Claude; esses provedores podem operar fora do Brasil (Livro 3, seção 3.11).
- A TIPE não autoriza o uso desses conteúdos para treinar modelos de IA. Eles são usados apenas para gerar a resposta pedida e ficam com o provedor somente pelo tempo necessário ao processamento e à segurança.
- Evite enviar à Lebre documentos com dados pessoais que não sejam necessários, como CPF de clientes ou dados bancários.
- O histórico de conversas fica guardado pelo prazo do Livro 3, seção 3.13.
