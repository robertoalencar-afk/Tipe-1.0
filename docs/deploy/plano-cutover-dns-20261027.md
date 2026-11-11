# Plano de migração DNS — tipe.digital — 27/10/2026

## Estado verificado
- GitHub Actions Publicar run 40568660198: testes, validação do ambiente, **43 migrações** e build de produção concluídos.
- Worker `tipe` foi carregado na Cloudflare, sem rotas; oito segredos essenciais foram cadastrados via run 40569885199.
- Publicação do domínio falhou por Cloudflare error **100117** (registro DNS externamente administrado existente). Cron não foi publicado.
- Zona Cloudflare `tipe.digital` ID `c2cb7c26486150d80120a16a0ae14d2e` está em estado **pending**.
- Nameservers Cloudflare atribuídos: `patryk.ns.cloudflare.com` e `summer.ns.cloudflare.com`.
- Nameservers delegados publicamente: `ns45.domaincontrol.com` e `ns46.domaincontrol.com` (GoDaddy DNS).
- A apex publicado: `185.158.133.1`. Não remover antes do corte.
- MX publicamente observados: `mx.zoho.com` prioridade 10; `mx2.zoho.com` prioridade 20; `mx3.zoho.com` prioridade 50.
- Token Cloudflare Workers disponível no GitHub **não tem permissão DNS Read** (HTTP 403).

## Pré-requisitos antes de mudar nameservers
1. Exportar/inventariar **todos** os registros DNS da zona atual no GoDaddy (A, AAAA, CNAME, MX, TXT, SRV etc.), inclusive www, SPF, DKIM, DMARC, Zoho, Resend e verificações de serviço.
2. Replicar os registros necessários no DNS da nova zona Cloudflare; confirmar Zoho e Resend. Manter temporariamente o A do site antigo e www para rollback e continuidade.
3. Somente depois, no **registrador do domínio**, trocar os NS de `ns45.domaincontrol.com`/`ns46.domaincontrol.com` pelos NS `patryk.ns.cloudflare.com`/`summer.ns.cloudflare.com`. Confirmar status Active da zona. Verificar DNSSEC no registrador.
4. Para vincular Custom Domains do Worker: realizar inventário/backup dos A/CNAME de `tipe.digital` e `www.tipe.digital`, remover apenas os registros conflitantes no momento da troca e executar o workflow Publicar em main. Nunca apagar registros de e-mail.
5. Checar HTTP(S), login (Google, e-mail), fluxo de restaurante, cron, RLS, DNS e Pagar.me. Credenciais Pagar.me **não** estavam presentes no Worker durante o preparo inicial.
6. Documentar rollback (restore A/CNAME anteriores e retirar associação do Worker se necessário).

Este plano não altera DNS automaticamente, não pressupõe permissão de gerenciar o registrador e não autoriza pagamentos reais sem homologação.
