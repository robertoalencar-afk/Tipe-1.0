# Tipe Guest nas lojas (App Store e Google Play)

O app nativo fica em `apps/guest` (Expo SDK 58, expo-router). Hoje roda em **modo demonstração**:
restaurantes fictícios, nada é enviado e nenhuma cobrança acontece. As regras de reserva, garantia
e fila vêm de `src/lib/tipe/guest/*` (os mesmos arquivos do site), então o app e o banco seguem o
mesmo critério.

## Testar no celular hoje (grátis)

1. Instale o **Expo Go** no iPhone ou Android.
2. No Mac: `cd apps/guest && npm install && npx expo start`
3. Leia o QR do terminal com a câmera (iPhone) ou com o Expo Go (Android).

Navegador: `npx expo start --web`.

## O que falta para publicar

| Passo | Custo | Quem |
| --- | --- | --- |
| Conta Apple Developer | US$ 99 por ano | Roberto (CNPJ da Tipe, precisa do D-U-N-S) |
| Conta Google Play Console | US$ 25, uma vez | Roberto |
| Build na nuvem (EAS Build) | plano grátis: poucos builds por mês, fila mais lenta | Claude prepara, Roberto autoriza |
| Ligar o app à API do Tipe (sair do modo demonstração) | sem custo extra | Claude, em PR próprio |
| Pagamento real da garantia (Pagar.me: Pix, Apple Pay, Google Pay) | taxas do Pagar.me | depende das chaves do Pagar.me |

Nada disso foi contratado nem enviado. Cada custo precisa do ok do Roberto.

## Comandos (depois das contas criadas)

```sh
cd apps/guest
npx eas-cli login
npx eas-cli build:configure
npx eas-cli build -p ios --profile production
npx eas-cli build -p android --profile production
npx eas-cli submit -p ios
npx eas-cli submit -p android
```

## Identidade do app

- Nome: **Tipe Guest**. Pacote e bundle: `digital.tipe.guest`. Esquema de link: `tipeguest://`
- Ícone e splash: símbolo Tipe em fundo navy `#021E34` (gerados de `src/assets/marca/tipe-simbolo.svg`).
- Permissões (texto em português no `app.json`):
  - Câmera: só para ler o QR da porta da fila.
  - Localização "durante o uso": uma leitura, na porta, para conferir que o cliente está lá.

## Textos da ficha (rascunho)

- **Subtítulo (30):** Reserve mesa em Fortaleza
- **Descrição curta (Google, 80):** Reserve mesa, entre na fila pela porta e use a garantia como crédito na conta.
- **Descrição:**
  Escolha onde comer, veja os horários livres de verdade e reserve em poucos toques.
  Quando o restaurante pede garantia, você paga um valor simbólico com Pix, Apple Pay ou Google Pay
  e, no dia, ele vira crédito de consumação na conta. Chegou sem reserva? Escaneie o QR da porta
  e entre na fila sem ficar em pé na calçada. Na mesa, a conta reconhece sua reserva sozinha.
- **Palavras-chave (Apple, 100):** reserva,restaurante,mesa,fila,Fortaleza,jantar,bar,garantia,Pix

## Notas para a revisão da Apple e do Google

- A garantia paga **serviço físico consumido no restaurante**, por isso usa Apple Pay, Google Pay e
  Pix, não a compra dentro do app (regra 3.1.3(e) da Apple e política de pagamentos do Google Play
  para bens e serviços físicos).
- Conta de teste para o revisor: modo demonstração, nenhuma cobrança real; explicar no campo
  "Notes" que os restaurantes são fictícios.
- Privacidade: a ficha precisa da política em uma URL pública (sugestão: `tipe.digital/privacidade`)
  e do questionário de dados: nome, telefone, histórico de reservas; localização aproximada só no
  momento da fila, não guardada; nenhum rastreamento entre apps.

## Assinatura por estabelecimento

O app mostra só restaurantes com o módulo Guest ativo. Quando a base de assinatura entrar
(`restaurant_has_module(rid, 'guest')`, da migração de assinaturas), a API do app filtra por ela no
servidor. O plano que inclui o Guest é decisão do Roberto.
