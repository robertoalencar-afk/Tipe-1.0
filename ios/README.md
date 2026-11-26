# Tipe para iPhone: gravar etiquetas NFC (App Clip)

Status: preparado e **desligado**. Roberto decidiu em 17/11/2026 não assinar a conta Apple Developer por enquanto.
Até lá, o iPhone grava pelo app gratuito NFC Tools e o iPad usa o QR "Gravar com outro celular".

## Por quê
O Safari e o Chrome no iPhone não têm Web NFC: nenhum site consegue gravar NFC no iOS.
A única forma de gravar "pela Tipe" é um código nativo com Core NFC. O App Clip abre sem instalar nada.

## Fluxo depois de ligado
Gestão → Totens → "Gravar no iPhone" → abre `/gravar-nfc?u=…&m=…` → o Safari mostra o cartão da Tipe → "Abrir" → aproximar a etiqueta → gravado.

## O que depende da conta Apple (US$ 99/ano)
1. Assinar o Apple Developer Program e anotar o Team ID.
2. Num Mac com Xcode: `brew install xcodegen && TEAM_ID=XXXXX xcodegen` nesta pasta, depois Archive → enviar ao App Store Connect.
3. Publicar `public/.well-known/apple-app-site-association` com `{"appclips":{"apps":["TEAMID.digital.tipe.app.Clip"]}}` (e `applinks` se houver o app).
4. No App Store Connect, criar a experiência padrão do App Clip para `https://tipe.digital/gravar-nfc`.
5. Depois de aprovado, definir `VITE_IOS_APP_ID` (id numérico do app) e `VITE_IOS_CLIP_BUNDLE=digital.tipe.app.Clip` no build. O botão "Gravar no iPhone" e o cartão do Safari ligam sozinhos.

## Limites
- O código Swift não foi compilado ainda: precisa de Xcode e da conta.
- A Apple revisa o app (alguns dias). O App Clip precisa de um app "pai" na App Store, que aqui é a mesma tela.
