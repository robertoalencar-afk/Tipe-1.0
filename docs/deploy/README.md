# Publicação da TIPE sem a Lovable

> **Proteção de produção:** o pipeline de deploy foi colocado atrás da variável de repositório
> `TIPE_PRODUCTION_READY=true`. Enquanto ela não existir, os testes do PR/branch executam,
> mas **não há migração nem publicação automática**. Para o primeiro go-live, confirme a
> configuração do Supabase, autenticação, pagamentos de teste, e-mail, DNS e as credenciais
> no ambiente GitHub `producao`. Depois crie essa variável e execute `Actions → Publicar
> → Run workflow` em `main`. Com a variável ativa, pushes posteriores em `main` publicam
> automaticamente. A etapa de validação interrompe o deploy se faltarem segredos obrigatórios.
> **Cuidado:** a publicação usa domínios personalizados `tipe.digital` e `www.tipe.digital`;
> confirme previamente o plano de reversão e mantenha a Lovable funcional até a aceitação dos testes.


Como o sistema roda depois da saída da Lovable e o passo a passo para colocar no ar em **tipe.digital**.

## Como fica

| Peça | Antes (Lovable) | Agora |
| --- | --- | --- |
| Site e servidor | Lovable (Cloudflare por baixo) | **Cloudflare Workers**, Worker `tipe`, publicado pelo GitHub Actions a cada push no `main` |
| Banco e login | Lovable Cloud (Supabase gerenciado) | **Supabase** próprio, região São Paulo, banco novo zerado |
| Rotinas agendadas | Agendador da Lovable | Worker `tipe-cron` (pasta `cron-worker/`): PDV a cada minuto, reconciliação de pagamentos a cada 5 minutos |
| E-mails do sistema | Lovable Email | **Resend** |
| Lebre e sugestão de divisão | Lovable AI (Gemini/OpenAI) | **Grátis**: respostas prontas sem IA, depois **Workers AI** da Cloudflare (cota grátis diária), depois **Groq** (cota grátis). Claude (Anthropic) só como reserva opcional |
| Áudio da Lebre | Lovable AI | **Workers AI** da Cloudflare (Whisper), dentro do mesmo teto diário grátis |
| Login com Google | OAuth da Lovable | OAuth do próprio Supabase |
| Imagens do logo | CDN da Lovable (`/__l5e/...`) | Arquivos no próprio repositório (`public/marca/`) |
| Servidor MCP `/mcp` | Lovable | Removido (dependia do OAuth da Lovable) |

Fluxo de trabalho: a alteração é feita aqui (Claude), vira um PR; quando o PR entra no `main`, o GitHub Actions testa, aplica as migrações do banco e publica o site e as rotinas. Nada passa pela Lovable.

## Custos mensais esperados (fase de testes)

- Cloudflare **Workers Paid**: US$ 5/mês. Necessário: o servidor comprimido tem cerca de 3,4 MB e o plano grátis aceita até 3 MB.
- Supabase: grátis no começo (o plano grátis pausa o projeto depois de 7 dias sem uso; o Pro custa US$ 25/mês).
- Resend: grátis até 3.000 e-mails/mês.
- IA da Lebre: grátis. O Workers AI tem 10 mil "neurons" grátis por dia; no Workers Paid o que passa disso é cobrado, por isso o site para de usar a Cloudflare ao chegar em `CLOUDFLARE_AI_DAILY_LIMIT` chamadas no dia (padrão 150, cerca de 50 neurons cada) e passa para o Groq. O Groq grátis não cobra: quando a cota dele acaba, a Lebre avisa que volta amanhã.
- Anthropic: só se você ligar a reserva paga (`LEBRE_CLAUDE_FALLBACK=true`); defina um limite de gasto no Console.

## Configuração simplificada — token Workers já existente

O pipeline conhece os dados **públicos** do Supabase `tipe-production` (Project ID,
Project URL e chave publicável) como valores de fallback; nenhuma chave secreta foi
incluída no código. Esses dados também podem ser atualizados nas Variables do GitHub.

Se você já cadastrou `CLOUDFLARE_API_TOKEN` como segredo GitHub (no repositório
ou no ambiente `producao`), o configurador **não o substituirá**.
Abra um terminal na pasta do projeto na branch que contém este arquivo e execute:

```bash
bash scripts/deploy/configurar-github.sh
```

O script usa o `gh` (GitHub CLI), faz login pelo navegador se você executar
`gh auth login` antes, configura automaticamente as variáveis públicas,
detecta quais segredos já existem e solicita apenas os valores privados ausentes,
sem exibi-los no terminal. Os novos segredos são enviados pelo STDIN e não ficam
no git. O script nunca define `TIPE_PRODUCTION_READY`.

**O token Cloudflare não pode ser recuperado em texto pelo ChatGPT ou pelo
GitHub depois de salvo.** Se ele existe apenas no painel Cloudflare e não
foi guardado, é preciso gerar outro token com as permissões adequadas.
Nunca cole tokens/chaves na conversa, no PR ou em arquivos versionados.

`DATABASE_URL` é a conexão PostgreSQL do **tipe-production** pelo Session Pooler.
O Supabase de staging é distinto, e jamais se devem misturar credenciais dos dois.

A configuração automática não substitui a validação de OAuth, e-mail,
Pagar.me, isolamento RLS entre restaurantes, modelo da Lebre e testes no Worker.
**Não habilite `TIPE_PRODUCTION_READY=true` antes da aceitação dos testes,
da revisão das branches do Tipe Order e da preparação do rollback.**

## Passo a passo

Faça na ordem. Onde houver "Segredo do GitHub", o lugar é: repositório no GitHub → **Settings → Environments → New environment** com o nome `producao` → **Add environment secret**. "Variável do GitHub" é **Settings → Secrets and variables → Actions → aba Variables → New repository variable**.

### 1. Desligar a Lovable do GitHub (antes de tudo)

1. No projeto da Lovable: **Settings → GitHub → Disconnect** (ou "Disconnect repository").
2. Isso impede a Lovable de enviar commits ao `main` depois da migração. O site antigo continua no ar até o domínio mudar (passo 7).

### 2. Supabase (banco novo)

1. Crie uma conta em supabase.com e um projeto novo. **Região: South America (São Paulo)**. Guarde a senha do banco.
2. Em **Project Settings → API Keys**, copie:
   - Project URL → Variável do GitHub `VITE_SUPABASE_URL`
   - Publishable key → Variável do GitHub `VITE_SUPABASE_PUBLISHABLE_KEY`
   - O código do projeto (o pedaço antes de `.supabase.co`) → Variável do GitHub `VITE_SUPABASE_PROJECT_ID`
   - Secret key → Segredo do GitHub `SUPABASE_SERVICE_ROLE_KEY`
3. Em **Connect** (botão no topo) → **Session pooler**, copie a URI, troque `[YOUR-PASSWORD]` pela senha do banco → Segredo do GitHub `DATABASE_URL`. Use o *Session pooler*, não a conexão direta: o GitHub Actions não alcança a conexão direta.
4. Em **Authentication → URL Configuration**: Site URL `https://tipe.digital`; em Redirect URLs adicione `https://tipe.digital/**` e `https://www.tipe.digital/**`.
5. Login com Google (opcional agora): no Google Cloud Console crie um "OAuth client ID" do tipo Web com o redirect `https://SEU-PROJETO.supabase.co/auth/v1/callback`; cole o Client ID e o Secret em **Authentication → Sign In / Providers → Google**.
6. E-mails de login (convite de garçom, redefinir senha): depois do passo 4 (Resend), em **Authentication → Emails → SMTP Settings** ligue o SMTP próprio com host `smtp.resend.com`, porta `465`, usuário `resend`, senha = a API key do Resend, remetente `noreply@tipe.digital`. Sem isso o Supabase manda só poucos e-mails por hora.

As tabelas não precisam ser criadas à mão: o primeiro deploy aplica todas as migrações (`scripts/db/aplicar-migracoes.sh`).

### 3. IA da Lebre (grátis)

1. Cloudflare Workers AI: é o token `CLOUDFLARE_AI_TOKEN` do passo 5 (item 7). Ele serve para texto, leitura de fotos e PDFs e áudio.
2. Groq (reserva grátis): em console.groq.com → **API Keys → Create API Key** → Segredo do GitHub `GROQ_API_KEY`. Não cadastre cartão: sem cartão, o Groq nunca cobra.
3. Opcional, Variáveis do GitHub: `CLOUDFLARE_AI_DAILY_LIMIT` (padrão 150), `CLOUDFLARE_AI_MODEL` (padrão `@cf/meta/llama-4-scout-17b-16e-instruct`), `GROQ_MODEL` e `GROQ_VISION_MODEL` (padrão `meta-llama/llama-4-scout-17b-16e-instruct`).
4. Opcional e pago: para usar o Claude quando as cotas grátis acabarem, cadastre `ANTHROPIC_API_KEY`, defina um limite de gasto em console.anthropic.com e crie a Variável `LEBRE_CLAUDE_FALLBACK` = `true`. Sem isso, a Anthropic nunca é chamada.

### 4. Resend (e-mails)

1. Em resend.com, **Domains → Add domain** `tipe.digital`. Ele mostra registros DNS (MX/TXT de envio e DKIM); cadastre-os no DNS (no passo 5, se o domínio for para a Cloudflare, cadastre lá).
2. Se a Lovable tinha delegado `alerta.tipe.digital` (registros NS apontando para a Lovable), apague esses registros.
3. **API Keys → Create** (permissão "Sending access") → Segredo do GitHub `RESEND_API_KEY`.

### 5. Cloudflare (hospedagem e domínio)

1. Na sua conta Cloudflare: **Workers & Pages → Plans** → assine o **Workers Paid**.
2. **Add a domain** → `tipe.digital` (plano Free do DNS basta). A Cloudflare importa os registros atuais; **confira que os registros de e-mail (MX, SPF/TXT) da sua caixa @tipe.digital vieram**, senão você para de receber e-mail.
3. No registro.br (ou onde o domínio foi comprado), troque os servidores DNS pelos dois que a Cloudflare indicar. Pode levar algumas horas.
4. Ainda no DNS da Cloudflare, **apague** os registros `A`/`CNAME` de `tipe.digital` e `www` que apontam para a Lovable. O deploy cria os novos sozinho (domínio personalizado do Worker).
5. Copie o **Account ID** (barra lateral de Workers) → Segredo do GitHub `CLOUDFLARE_ACCOUNT_ID`.
6. **My Profile → API Tokens → Create Token → modelo "Edit Cloudflare Workers"** → em Zone Resources escolha `tipe.digital` → Segredo do GitHub `CLOUDFLARE_API_TOKEN`.
7. Para a IA grátis da Lebre (texto, fotos, PDFs e áudio), crie outro token com **Workers AI: Read** e **Workers AI: Edit** → Segredo do GitHub `CLOUDFLARE_AI_TOKEN`. Sem ele a Lebre usa só o Groq e não transcreve áudio.

### 6. Demais segredos do GitHub

| Nome | O que colocar |
| --- | --- |
| `CRON_SECRET` | Uma senha longa aleatória (ex.: gere em 1password ou com `openssl rand -hex 32`) |
| `TIPE_ENCRYPTION_KEY` | Outra senha longa aleatória (protege as chaves Pagar.me dos restaurantes no banco). Não troque depois de cadastrar restaurantes |
| `SENHA_TESTE` | A senha que as contas das empresas de teste vão usar |
| `PAGARME_SECRET_KEY`, `PAGARME_PUBLIC_KEY`, `PAGARME_WEBHOOK_SECRET`, `PAGARME_TIPE_RECIPIENT_ID` | Só quando for ligar pagamentos reais; use as chaves de teste (`sk_test_...`) enquanto testa |

Variáveis do GitHub opcionais: `EMAIL_FROM` (padrão `noreply@tipe.digital`), `TIPE_PLATFORM_FEE_PERCENT`.

Os segredos ficam só no GitHub: a cada deploy o Actions envia para os Workers (`scripts/deploy/segredos.mjs`). Não precisa cadastrar nada no painel da Cloudflare.

### 7. Publicar

1. Revise e faça merge do PR "Sair da Lovable" no `main`. Com `TIPE_PRODUCTION_READY` ausente, esse merge roda os testes mas **não publica**.
2. Confirme todos os segredos do ambiente `producao` e as variáveis de repositório descritos acima. A variável `DATABASE_URL` é obrigatória, e o workflow falhará se ela estiver ausente: não é permitido publicar uma aplicação sem executar as migrações.
3. Confirme a zona `tipe.digital` no Cloudflare, o domínio atual e um plano de reversão. O primeiro deploy pode vincular domínios personalizados; não corte o tráfego do site antigo até confirmar a aplicação no novo provedor.
4. Em **GitHub → Settings → Secrets and variables → Actions → Variables**, crie a variável de repositório `TIPE_PRODUCTION_READY` com o valor `true`.
5. Em **Actions → Publicar → Run workflow**, selecione `main` e execute. Confira a validação de ambiente, migrações, build, Worker `tipe` e Worker `tipe-cron`.
6. Valide `https://tipe.digital` e `https://www.tipe.digital`, login, mesas, pagamentos de teste, Lebre e e-mail antes de desativar a Lovable. Se houver falha, volte `TIPE_PRODUCTION_READY` para `false` para bloquear novos deploys; isso **não** restaura automaticamente DNS ou banco.

### 8. Empresas de teste

1. **Actions → Empresas de teste → Run workflow** (o campo vem com `roberto@tipe.digital` como fundador; troque se quiser).
2. Ele cria:
   - **Bistrô Teste** em `tipe.digital/bistro-teste`: dono `dono.bistro@exemplo.tipe.digital`, garçom `garcom.bistro@exemplo.tipe.digital`, 10 mesas, cardápio e conta aberta na mesa 1.
   - **Bar do Teste** em `tipe.digital/bar-teste`: dono `dono.bar@exemplo.tipe.digital`, garçom `garcom.bar@exemplo.tipe.digital`, 8 mesas, cardápio e conta aberta na mesa 1.
   - Seu e-mail como fundador (backoffice). Se a conta não existir, é criada com a `SENHA_TESTE`.
3. Todas as contas novas usam a senha do segredo `SENHA_TESTE`.

### 9. Desligar a Lovable de vez

Com o site novo funcionando em tipe.digital: remova o domínio no projeto da Lovable (**Settings → Domains**), despublique e cancele o plano.

## No dia a dia

- Alterações de código: peça aqui; o PR entra no `main` e publica sozinho.
- Mudança no banco: novo arquivo em `drizzle/migrations/` com o próximo número. O deploy aplica só o que falta (controle em `tipe_meta.migracoes`).
- Rodar localmente: copie `.env.example` para `.env`, preencha e use `bun install` e `bun run dev`.
- Para criar um banco do zero em outro lugar: `DATABASE_URL=... bun run db:migrate`.
