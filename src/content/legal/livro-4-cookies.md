---
number: 4
slug: cookies
title: Política de Cookies
fullTitle: Livro 4. Política de Cookies
description: O que o site guarda no navegador e como mudar suas escolhas.
version: "2.0"
effective: 07/10/2026
audience: ambos
icon: cookie
readingMinutes: 3
summary: O site usa alguns itens guardados no navegador para funcionar, como o seu nome na mesa e o login do restaurante. Ferramentas de medição e anúncios (Google Analytics e Meta Pixel) ficam desligadas até você autorizar no aviso de cookies. Você pode mudar de ideia quando quiser, pelo link "Preferências de privacidade" no rodapé.
---

## 4.1 O que são cookies {#o-que-sao-cookies}

Cookies e tecnologias semelhantes, como o armazenamento local do navegador (localStorage), guardam pequenas informações no seu aparelho para que um site funcione, lembre escolhas ou meça o uso.

## 4.2 Categorias {#categorias}

| Categoria | Para quê | Precisa do seu aceite? |
| --- | --- | --- |
| Necessários | Funcionamento da mesa, login, segurança e registro das suas escolhas de privacidade | Não. Ficam sempre ativos |
| Funcionais | Lembrar a origem da visita e a indicação até você se cadastrar | Não. Baseados em legítimo interesse, sem rastreamento entre sites |
| Medição | Entender quantas pessoas visitam o site e quais páginas usam | Sim |
| Marketing | Medir e melhorar anúncios nas redes sociais | Sim |

## 4.3 Inventário {#inventario}

| Nome | Fornecedor | Categoria | Finalidade | Tipo | Duração |
| --- | --- | --- | --- | --- | --- |
| tipe:cliente:… | TIPE | Necessário | Lembrar o seu nome na mesa | localStorage | Até a mesa reabrir ou você limpar os dados |
| sb-…-auth-token | TIPE / autenticação | Necessário | Manter o login do restaurante | localStorage | Até sair ou a sessão expirar |
| tipe:cadastro-pendente | TIPE | Necessário | Concluir o cadastro após confirmar o e-mail | localStorage | Até concluir |
| tipe:privacy-consent | TIPE | Necessário | Guardar suas escolhas de cookies | localStorage | Até você alterar ou limpar |
| Estado do simulador | TIPE | Necessário | Guardar a demonstração em /simulador | localStorage | Reinicia 2 min após encerrar |
| tipe:attribution (UTM e indicação) | TIPE | Funcional | Guardar UTM e código de indicação até o cadastro | localStorage | 30 dias |
| Login com Google | Google | Necessário, só se você usar | Autenticar | Cookies do Google | Definida pelo Google |
| \_ga, *ga*… | Google Analytics 4 | Medição | Contar visitas e uso de páginas | Cookie | Até 2 anos |
| \_fbp | Meta Pixel | Marketing | Medir resultado de anúncios | Cookie | 90 dias |

Esta lista é revisada sempre que o site passa a gravar algo novo no seu navegador.

## 4.4 Como dar, mudar ou retirar o consentimento {#como-dar-mudar-ou-retirar-o-consentimento}

Na primeira visita, um aviso permite aceitar tudo, recusar o que é opcional ou escolher por categoria. Recusar é tão fácil quanto aceitar. Enquanto você não escolher, nada opcional é carregado. Para mudar depois, use "Preferências de privacidade" no rodapé de qualquer página. Ao retirar o consentimento, as ferramentas param de ser carregadas a partir daquele momento. Você também pode apagar os dados do site nas configurações do navegador.

## 4.5 Fontes e serviços de terceiros {#fontes-e-servicos-de-terceiros}

As fontes do site são carregadas do Google Fonts, que recebe o endereço IP do seu navegador ao fornecê-las, sem gravar cookies. Se você bloquear esse carregamento no navegador, o site continua funcionando com fontes padrão.
