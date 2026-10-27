-- CRM da Tipe: estrutura multiempresa para o Supabase (PROPOSTA, NÃO APLICADA).
--
-- Fica fora de supabase/migrations de propósito: aplicar só depois de revisar, no projeto
-- Supabase de destino (a migração para Cloudflare + Supabase), e nunca pela sincronização
-- automática da Lovable. Espelha os tipos de src/lib/tipe/crm/types.ts e as permissões de
-- src/lib/tipe/crm/permissions.ts. A regra de negócio (pontos, limites de plano, validações)
-- deve rodar em funções do servidor que repetem o motor src/lib/tipe/crm/engine.ts; o RLS
-- abaixo garante o isolamento por organização mesmo se o cliente tentar burlar a tela.

begin;

create type public.crm_role as enum ('owner', 'admin', 'manager', 'seller', 'agent', 'viewer');
create type public.crm_plan as enum ('starter', 'professional', 'enterprise');

-- Organizações e pessoas -------------------------------------------------------------

create table public.crm_orgs (
  id uuid primary key default gen_random_uuid(),
  name text not null check (length(trim(name)) >= 3),
  slug text not null unique,
  segment text not null default 'Comercial',
  status text not null default 'ativa' check (status in ('ativa', 'suspensa')),
  settings jsonb not null default '{"timezone":"America/Fortaleza","responseSlaMin":15,"dailyTaskXpCap":12,"xp":{"lead_qualificado":30,"tarefa_concluida":10,"reuniao_realizada":40,"oportunidade_ganha":150,"meta_atingida":300,"desafio_concluido":0}}',
  created_at timestamptz not null default now()
);

create table public.crm_teams (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null,
  unique (org_id, name)
);

create table public.crm_departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null,
  unique (org_id, name)
);

create table public.crm_memberships (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role public.crm_role not null,
  team_id uuid references public.crm_teams (id) on delete set null,
  department_id uuid references public.crm_departments (id) on delete set null,
  status text not null default 'ativo' check (status in ('ativo', 'suspenso')),
  joined_at timestamptz not null default now(),
  unique (org_id, user_id)
);

create table public.crm_invites (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  email text not null,
  name text not null,
  role public.crm_role not null,
  team_id uuid references public.crm_teams (id) on delete set null,
  status text not null default 'pendente' check (status in ('pendente', 'aceito', 'revogado')),
  invited_by uuid not null references auth.users (id),
  created_at timestamptz not null default now()
);
create unique index crm_invites_pending on public.crm_invites (org_id, lower(email)) where status = 'pendente';

-- Permissões: a mesma matriz de permissions.ts ------------------------------------------

create or replace function public.crm_role_in(_org uuid)
returns public.crm_role language sql stable security definer set search_path = public, pg_temp as $$
  select role from public.crm_memberships
  where org_id = _org and user_id = auth.uid() and status = 'ativo'
$$;

create or replace function public.crm_is_member(_org uuid)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select public.crm_role_in(_org) is not null or public.has_role(auth.uid(), 'founder')
$$;

create or replace function public.crm_can(_org uuid, _action text)
returns boolean language sql stable security definer set search_path = public, pg_temp as $$
  select case public.crm_role_in(_org)
    when 'owner' then true
    when 'admin' then _action <> 'org.billing'
    when 'manager' then _action = any (array['contacts.write','contacts.delete','leads.write','deals.create','deals.write_any','deals.write_own','deals.delete','pipelines.manage','tasks.write','tasks.assign_others','inbox.reply','inbox.assign','inbox.simulate','tickets.write','goals.manage','reports.view','teams.manage'])
    when 'seller' then _action = any (array['contacts.write','leads.write','deals.create','deals.write_own','tasks.write','inbox.reply','inbox.simulate','tickets.write','reports.view'])
    when 'agent' then _action = any (array['contacts.write','leads.write','deals.create','tasks.write','inbox.reply','inbox.assign','inbox.simulate','tickets.write','tickets.manage'])
    when 'viewer' then _action = 'reports.view'
    else false
  end
$$;

-- Comercial -----------------------------------------------------------------------------

create table public.crm_companies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null,
  segment text, city text, neighborhood text, size text, pdv text,
  owner_id uuid references auth.users (id),
  tags text[] not null default '{}',
  created_at timestamptz not null default now()
);

create table public.crm_contacts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  company_id uuid references public.crm_companies (id) on delete set null,
  name text not null check (length(trim(name)) >= 2),
  phone text, whatsapp text, email text, job_title text, source text,
  owner_id uuid not null references auth.users (id),
  status text not null default 'ativo' check (status in ('ativo', 'cliente', 'inativo')),
  tags text[] not null default '{}',
  notes text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.crm_contacts (org_id, lower(email));
create index on public.crm_contacts (org_id, whatsapp);

create table public.crm_leads (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null, company_name text not null default '', email text, phone text, source text,
  status text not null default 'novo' check (status in ('novo', 'contatado', 'qualificado', 'desqualificado', 'convertido')),
  owner_id uuid not null references auth.users (id),
  profile jsonb not null default '{}',
  contact_id uuid references public.crm_contacts (id) on delete set null,
  deal_id uuid,
  restaurant_lead_id uuid unique, -- origem na lista de espera (restaurant_leads), quando houver
  disqualify_reason text,
  created_at timestamptz not null default now(),
  qualified_at timestamptz, converted_at timestamptz
);

create table public.crm_pipelines (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null,
  stages jsonb not null, -- [{id, name, probability, kind: aberta|ganho|perdido}]
  created_at timestamptz not null default now()
);

create table public.crm_deals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  pipeline_id uuid not null references public.crm_pipelines (id),
  stage_id text not null,
  title text not null,
  contact_id uuid not null references public.crm_contacts (id),
  company_id uuid references public.crm_companies (id) on delete set null,
  lead_id uuid references public.crm_leads (id) on delete set null,
  conversation_id uuid,
  value numeric(12, 2) not null check (value >= 0),
  owner_id uuid not null references auth.users (id),
  probability int not null default 10 check (probability between 0 and 100),
  priority text not null default 'media' check (priority in ('baixa', 'media', 'alta')),
  status text not null default 'aberta' check (status in ('aberta', 'ganha', 'perdida')),
  lost_reason text check (status <> 'perdida' or lost_reason is not null),
  expected_close timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  closed_at timestamptz
);
create index on public.crm_deals (org_id, status, closed_at);

create table public.crm_tasks (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  title text not null, description text not null default '',
  type text not null default 'tarefa' check (type in ('tarefa', 'ligacao', 'reuniao', 'email')),
  assignee_id uuid not null references auth.users (id),
  created_by uuid not null references auth.users (id),
  priority text not null default 'media',
  status text not null default 'pendente' check (status in ('pendente', 'em_andamento', 'concluida')),
  due_at timestamptz not null,
  contact_id uuid references public.crm_contacts (id) on delete set null,
  deal_id uuid references public.crm_deals (id) on delete set null,
  comments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  completed_at timestamptz
);
create index on public.crm_tasks (org_id, assignee_id, status, due_at);

create table public.crm_notes (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  contact_id uuid references public.crm_contacts (id) on delete cascade,
  deal_id uuid references public.crm_deals (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  text text not null,
  at timestamptz not null default now()
);

create table public.crm_activities (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  at timestamptz not null default now(),
  actor_id uuid references auth.users (id),
  kind text not null,
  summary text not null,
  entity jsonb not null,
  contact_id uuid, deal_id uuid,
  changes jsonb
);
create index on public.crm_activities (org_id, at desc);

-- Atendimento e WhatsApp oficial ---------------------------------------------------------

create table public.crm_wa_instances (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null,
  phone text not null,
  provider text not null default 'cloud_api' check (provider in ('demo', 'cloud_api')),
  phone_number_id text unique, -- id do número na Meta; o token fica em segredo do servidor, nunca aqui
  status text not null default 'aguardando_credenciais' check (status in ('demonstracao', 'aguardando_credenciais', 'conectada', 'erro')),
  created_at timestamptz not null default now()
);

create table public.crm_conversations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  contact_id uuid not null references public.crm_contacts (id) on delete cascade,
  channel text not null default 'whatsapp',
  instance_id uuid references public.crm_wa_instances (id) on delete set null,
  status text not null default 'aberta' check (status in ('aberta', 'pendente', 'encerrada')),
  assignee_id uuid references auth.users (id),
  tags text[] not null default '{}',
  unread int not null default 0,
  created_at timestamptz not null default now(),
  last_message_at timestamptz not null default now(),
  closed_at timestamptz
);

create table public.crm_messages (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  conversation_id uuid not null references public.crm_conversations (id) on delete cascade,
  direction text not null check (direction in ('entrada', 'saida', 'nota')),
  author_id uuid references auth.users (id),
  text text not null,
  at timestamptz not null default now(),
  status text not null default 'enviada' check (status in ('simulada', 'enviada', 'entregue', 'lida', 'falhou')),
  wa_message_id text unique, -- idempotência do webhook: a mesma mensagem da Meta não entra duas vezes
  error text
);

create table public.crm_quick_replies (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  shortcut text not null, text text not null,
  unique (org_id, shortcut)
);

create table public.crm_wa_templates (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  name text not null, category text not null, language text not null default 'pt_BR', body text not null,
  status text not null default 'pendente' check (status in ('aprovado', 'pendente', 'rejeitado')),
  unique (org_id, name, language)
);

create table public.crm_wa_logs (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.crm_orgs (id) on delete cascade,
  at timestamptz not null default now(),
  direction text not null check (direction in ('webhook', 'envio')),
  event text not null,
  status text not null check (status in ('ok', 'erro', 'simulado')),
  detail text not null default ''
);

create table public.crm_tickets (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  title text not null, description text not null, category text not null,
  requester_id uuid not null references auth.users (id),
  assignee_id uuid references auth.users (id),
  priority text not null default 'media',
  status text not null default 'aberto' check (status in ('aberto', 'em_andamento', 'resolvido')),
  comments jsonb not null default '[]',
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

-- Gamificação: pontos só por fatos reais, uma vez por fato --------------------------------

create table public.crm_goals (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  scope text not null check (scope in ('individual', 'equipe')),
  user_id uuid references auth.users (id),
  team_id uuid references public.crm_teams (id) on delete cascade,
  metric text not null check (metric in ('receita', 'negocios_ganhos', 'tarefas_concluidas', 'leads_qualificados')),
  target numeric(12, 2) not null check (target > 0),
  period text not null check (period ~ '^\d{4}-\d{2}$')
);

create table public.crm_challenges (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  title text not null, description text not null default '',
  metric text not null, target numeric(12, 2) not null check (target > 0),
  starts_at timestamptz not null, ends_at timestamptz not null,
  reward int not null check (reward between 0 and 2000)
);

-- Livro-razão de pontos: só funções do servidor escrevem. O estorno é um lançamento negativo
-- com a mesma ref, e o saldo por ref nunca passa de um prêmio (conferido na função award).
create table public.crm_xp_events (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id),
  kind text not null,
  points int not null,
  ref text not null,
  reason text not null,
  at timestamptz not null default now()
);
create index on public.crm_xp_events (org_id, user_id, at);
create index on public.crm_xp_events (ref);

-- Planos e cobrança (fictícia até haver gateway) -----------------------------------------

create table public.crm_subscriptions (
  org_id uuid primary key references public.crm_orgs (id) on delete cascade,
  plan_id public.crm_plan not null default 'starter',
  status text not null default 'teste' check (status in ('teste', 'ativa', 'em_atraso', 'cancelada')),
  started_at timestamptz not null default now(),
  renews_at timestamptz not null,
  trial_ends_at timestamptz,
  canceled_at timestamptz
);

create table public.crm_invoices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  number text not null unique,
  description text not null,
  amount numeric(12, 2) not null,
  status text not null check (status in ('paga', 'aberta', 'vencida', 'cancelada')),
  issued_at timestamptz not null, due_at timestamptz not null, paid_at timestamptz,
  simulated boolean not null default true
);

create table public.crm_notifications (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.crm_orgs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  text text not null, href text not null,
  at timestamptz not null default now(),
  read boolean not null default false
);

create table public.crm_audit (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.crm_orgs (id) on delete set null,
  actor_id uuid references auth.users (id),
  action text not null, target text not null,
  result text not null check (result in ('ok', 'negado')),
  at timestamptz not null default now()
);

-- RLS: tudo isolado por organização ------------------------------------------------------

do $$
declare t text;
begin
  foreach t in array array['crm_teams','crm_departments','crm_memberships','crm_invites','crm_companies','crm_contacts','crm_leads','crm_pipelines','crm_deals','crm_tasks','crm_notes','crm_activities','crm_wa_instances','crm_conversations','crm_messages','crm_quick_replies','crm_wa_templates','crm_wa_logs','crm_tickets','crm_goals','crm_challenges','crm_xp_events','crm_subscriptions','crm_invoices','crm_audit']
  loop
    execute format('alter table public.%I enable row level security', t);
    execute format('create policy "membros leem" on public.%I for select to authenticated using (public.crm_is_member(org_id))', t);
  end loop;
end $$;

alter table public.crm_orgs enable row level security;
create policy "membros leem a organização" on public.crm_orgs for select to authenticated using (public.crm_is_member(id));
create policy "admins editam a organização" on public.crm_orgs for update to authenticated using (public.crm_can(id, 'org.settings')) with check (public.crm_can(id, 'org.settings'));

alter table public.crm_notifications enable row level security;
create policy "cada um lê as suas" on public.crm_notifications for select to authenticated using (user_id = auth.uid());
create policy "cada um marca as suas" on public.crm_notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Escrita direta permitida só onde a regra cabe numa política; o resto passa por funções.
create policy "escrever contatos" on public.crm_contacts for insert to authenticated with check (public.crm_can(org_id, 'contacts.write'));
create policy "editar contatos" on public.crm_contacts for update to authenticated using (public.crm_can(org_id, 'contacts.write')) with check (public.crm_can(org_id, 'contacts.write'));
create policy "excluir contatos" on public.crm_contacts for delete to authenticated using (public.crm_can(org_id, 'contacts.delete'));
create policy "escrever empresas" on public.crm_companies for all to authenticated using (public.crm_can(org_id, 'contacts.write')) with check (public.crm_can(org_id, 'contacts.write'));
create policy "escrever leads" on public.crm_leads for insert to authenticated with check (public.crm_can(org_id, 'leads.write'));
create policy "editar leads" on public.crm_leads for update to authenticated using (public.crm_can(org_id, 'leads.write')) with check (public.crm_can(org_id, 'leads.write'));
create policy "criar oportunidades" on public.crm_deals for insert to authenticated with check (public.crm_can(org_id, 'deals.create'));
create policy "editar oportunidades" on public.crm_deals for update to authenticated
  using (public.crm_can(org_id, 'deals.write_any') or (public.crm_can(org_id, 'deals.write_own') and owner_id = auth.uid()))
  with check (public.crm_can(org_id, 'deals.write_any') or (public.crm_can(org_id, 'deals.write_own') and owner_id = auth.uid()));
create policy "excluir oportunidades" on public.crm_deals for delete to authenticated using (public.crm_can(org_id, 'deals.delete'));
create policy "funis" on public.crm_pipelines for all to authenticated using (public.crm_can(org_id, 'pipelines.manage')) with check (public.crm_can(org_id, 'pipelines.manage'));
create policy "criar tarefas" on public.crm_tasks for insert to authenticated
  with check (public.crm_can(org_id, 'tasks.write') and (assignee_id = auth.uid() or public.crm_can(org_id, 'tasks.assign_others')));
create policy "editar tarefas" on public.crm_tasks for update to authenticated
  using (public.crm_can(org_id, 'tasks.write') and (assignee_id = auth.uid() or created_by = auth.uid() or public.crm_can(org_id, 'tasks.assign_others')));
create policy "anotar" on public.crm_notes for insert to authenticated with check (public.crm_can(org_id, 'contacts.write') and user_id = auth.uid());
create policy "responder" on public.crm_messages for insert to authenticated with check (public.crm_can(org_id, 'inbox.reply') and author_id = auth.uid() and direction in ('saida', 'nota'));
create policy "atribuir conversas" on public.crm_conversations for update to authenticated using (public.crm_can(org_id, 'inbox.reply'));
create policy "respostas rápidas" on public.crm_quick_replies for all to authenticated using (public.crm_can(org_id, 'inbox.assign')) with check (public.crm_can(org_id, 'inbox.assign'));
create policy "abrir chamados" on public.crm_tickets for insert to authenticated with check (public.crm_can(org_id, 'tickets.write') and requester_id = auth.uid());
create policy "tratar chamados" on public.crm_tickets for update to authenticated using (public.crm_can(org_id, 'tickets.manage') or requester_id = auth.uid());
create policy "metas" on public.crm_goals for all to authenticated using (public.crm_can(org_id, 'goals.manage')) with check (public.crm_can(org_id, 'goals.manage'));
create policy "desafios" on public.crm_challenges for all to authenticated using (public.crm_can(org_id, 'goals.manage')) with check (public.crm_can(org_id, 'goals.manage'));
create policy "equipes" on public.crm_teams for all to authenticated using (public.crm_can(org_id, 'teams.manage')) with check (public.crm_can(org_id, 'teams.manage'));
create policy "departamentos" on public.crm_departments for all to authenticated using (public.crm_can(org_id, 'teams.manage')) with check (public.crm_can(org_id, 'teams.manage'));
create policy "convites" on public.crm_invites for all to authenticated using (public.crm_can(org_id, 'members.invite')) with check (public.crm_can(org_id, 'members.invite'));
create policy "modelos whatsapp" on public.crm_wa_templates for all to authenticated using (public.crm_can(org_id, 'whatsapp.manage')) with check (public.crm_can(org_id, 'whatsapp.manage'));
create policy "financeiro" on public.crm_invoices for select to authenticated using (public.crm_can(org_id, 'finance.view') or public.has_role(auth.uid(), 'founder'));
-- Sem políticas de escrita: crm_memberships (papel), crm_xp_events, crm_subscriptions,
-- crm_invoices, crm_wa_instances, crm_wa_logs, crm_audit e crm_activities. Só funções
-- security definer (troca de papel, aceite de convite, pontos, plano, webhook) gravam nelas,
-- e cada uma confere crm_can e registra crm_audit, inclusive as tentativas negadas.

commit;

-- Carga inicial opcional: a lista de espera atual vira leads do CRM da Tipe.
-- insert into public.crm_leads (org_id, name, company_name, email, phone, source, owner_id, profile, restaurant_lead_id, created_at)
-- select :org_tipe, contact_name, restaurant_name, email, phone, 'Lista de espera', :owner_id,
--        jsonb_strip_nulls(jsonb_build_object('tables_range', tables_range, 'peak_queue', peak_queue, 'close_time', close_time,
--          'contact_role', contact_role, 'city', city, 'pdv_system', pdv_system, 'has_pagarme', has_pagarme, 'discovery_source', discovery_source)),
--        id, created_at
-- from public.restaurant_leads
-- on conflict (restaurant_lead_id) do nothing;
