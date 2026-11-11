import { z } from "zod";
export type Item = {
 id:string; kind:string; title:string; product:string; environment:string; priority:string; owner:string; status:string; due:string; link:string; risk:string; dependencies:string; manual:string; decision:string; repo:string; published:string; next:string; routes:string; files:string; workflows:string; evidence:string; notes:string; review:string; merge:string; deployment:string; validation:string; checklist:{label:string;done:boolean}[]; version:number;
};
export const products=['Tipe Pay','Tipe Order','Tipe Cozinha','Tipe Equipe','Tipe Gestão','Tipe Reserva','Tipe Pulse'];
export const statuses=['A validar','Em andamento','Bloqueado','Aguardando decisão','Concluído','Em breve'];
const base={environment:'Produção',priority:'Média',owner:'A definir',status:'A validar',due:'',link:'',risk:'',dependencies:'',manual:'',decision:'',repo:'Não verificado',published:'Não verificado',next:'Registrar evidências antes de concluir.',routes:'',files:'',workflows:'',evidence:'',notes:'Contexto informado em 11/11/2026. Não representa verificação ao vivo.',review:'A validar',merge:'Não verificado',deployment:'Não verificado',validation:'Pendente',checklist:[],version:0};
const make=(id:string,kind:string,title:string,product:string,extra:Partial<Item>={}):Item=>({...base,id,kind,title,product,...extra});
const initial:Item[]=[
 make('pr111','PR','PR #111 · Mídia e identidade no Gestão','Tipe Gestão',{priority:'Alta',link:'https://github.com/robertoalencar-afk/Tipe-1.0/pull/111',risk:'Revisar upload, bucket público e coerência das permissões por papel. Hipóteses para revisão; falhas não confirmadas.',dependencies:'Migração 0055; bucket restaurante-midia; campos de logo e fotos.',manual:'Testar tipo, tamanho e conteúdo do upload; isolamento entre restaurantes; leitura pública intencional; compatibilidade com o cardápio.',decision:'Definir escopo da mídia pública e consumo das fotos pelo efeito 3D.',repo:'Descrição informada: logo e fotos; upload restrito ao administrador.',published:'Não verificado. O efeito 3D ainda não consumia as novas colunas segundo a descrição informada.',next:'Ler diff e migração; reproduzir matriz de permissões em ambiente de teste.',files:'Migração 0055 — caminho exato a confirmar.',checklist:[{label:'Revisar políticas do bucket e isolamento entre restaurantes',done:false},{label:'Validar arquivos permitidos, limite e autorização',done:false},{label:'Confirmar integração do cardápio e tutorial 3D',done:false}]}),
 make('pr113','PR','PR #113 · Abrir mesa e lançar pedido','Tipe Order',{priority:'Alta',link:'https://github.com/robertoalencar-afk/Tipe-1.0/pull/113',risk:'Revisar autorização, idempotência e mesa ou item inexistente. Riscos a investigar.',dependencies:'Funções Supabase open_table_ordering e pdv_launch_order.',manual:'Validar dono, gerente, caixa e garçom; repetição de pedido; restaurante alheio; mesa e item inexistentes.',decision:'Confirmar matriz de permissões e implantação das funções necessárias.',repo:'Descrição informada: ações de abertura e lançamento; 337 testes relatados, não reproduzidos neste painel.',next:'Comparar proposta e implementação; registrar testes por papel.',checklist:[{label:'Confirmar funções e permissões no banco',done:false},{label:'Testar autorização entre restaurantes e papéis',done:false},{label:'Testar mesa/item inexistente e idempotência',done:false},{label:'Registrar evidências dos testes',done:false}]}),
 make('pr114','PR','PR #114 · Escopo a confirmar','Tipe Gestão',{priority:'Alta',risk:'Conteúdo e dependências ainda não informados.',link:'https://github.com/robertoalencar-afk/Tipe-1.0/pull/114',dependencies:'Consultar descrição, diff, checks e possíveis migrações.',manual:'Definir os testes após a leitura do escopo.',decision:'Confirmar objetivo e produto antes da revisão.',next:'Preencher escopo com referência ao PR e evidência.'}),
 ...products.map((p,i)=>make('product'+i,'Produto',p,p,{status:p==='Tipe Reserva'?'Em breve':'A validar',environment:p==='Tipe Reserva'?'Simulação':'Produção',notes:p==='Tipe Reserva'?'Planejado para versão 2.0. Manter “Em breve”; base e simulação demonstrável, sem reservas reais.':base.notes,next:p==='Tipe Reserva'?'Revisar arquitetura e simulação demonstrável.':'Mapear rotas, responsável, evidências e pendências do produto.'})),
 make('infra1','Infraestrutura','Cloudflare · Publicação e versão','Transversal',{priority:'Alta',link:'https://dash.cloudflare.com/',dependencies:'Identificar workflow, commit, ambiente e controles de publicação.',manual:'Comparar SHA do repositório com SHA publicado; abrir rotas críticas.',next:'Registrar último deploy com commit, data e link do run.'}),
 make('infra2','Infraestrutura','Supabase · Autenticação e configuração','Transversal',{priority:'Alta',status:'Bloqueado',link:'https://supabase.com/dashboard',risk:'Configuração pendente de confirmação; não registrar senhas, tokens ou chaves.',dependencies:'Acesso autenticado ao projeto correto.',manual:'Confirmar modelos de e-mail, URLs de redirecionamento, autenticação e RLS.',next:'Confirmar acesso; registrar apenas o resultado e evidências sem dados sensíveis.'}),
 make('infra3','Infraestrutura','tipe.digital · Domínio e rotas','Transversal',{link:'https://tipe.digital/',manual:'Verificar DNS, certificado, redirecionamentos e rotas essenciais.',routes:'/\n/order\n/solicitar-demonstracao',next:'Registrar evidências de DNS e navegação.'}),
 make('infra4','Integração','Pagamentos · Provedor e conciliação','Tipe Pay',{dependencies:'Confirmar provedor ativo e ambiente de testes.',risk:'Disponibilidade e configuração não verificadas.',manual:'Validar Pix, carteiras, comprovante, estorno e conciliação em sandbox.',next:'Inventariar integrações ativas sem registrar credenciais.'}),
 make('infra5','Integração','Comunicação · E-mail e WhatsApp','Tipe Gestão',{dependencies:'Confirmar provedor e configuração de mensagens.',manual:'Verificar remetente, templates, consentimento e entrega em teste.',next:'Registrar provedores, responsável e evidências.'}),
 make('pulse1','Pulse','Pulseiras · Inventário e identificação','Tipe Pulse',{environment:'Operação',dependencies:'Numerar pulseiras e associar identificador à conta correta.',manual:'Registrar quantidade, fornecedor, custo, tamanho e compatibilidade.',next:'Cadastrar lotes reais e testar leitura por amostragem.',notes:'Contexto informado: pulseira com base plástica e etiqueta NFC funcionou em teste anterior. Estoque e compatibilidade não confirmados.'}),
 make('pulse2','Pulse','Tags NFC · Leitura e vínculo com a conta','Tipe Pulse',{environment:'Teste',priority:'Alta',risk:'Evitar associação à conta errada ou exposição de dados pessoais.',manual:'Testar Android e iPhone; URL gravada; leitura em outro aparelho; vínculo correto; revogação e reutilização.',next:'Registrar modelo, URL pública de teste e evidência em cada dispositivo.',checklist:[{label:'Ler tag em outro aparelho Android',done:false},{label:'Ler tag em iPhone compatível',done:false},{label:'Confirmar conta e possibilidade de revogar vínculo',done:false}]}),
 make('check1','Checklist','Validação antes da publicação','Transversal',{environment:'Teste',priority:'Alta',checklist:[{label:'Identificar commit e ambiente de destino',done:false},{label:'Registrar testes automatizados com link do run',done:false},{label:'Revisar permissões e políticas de acesso',done:false},{label:'Revisar migrações e dependências',done:false},{label:'Preparar reversão e verificar backup aplicável',done:false},{label:'Validar rotas em desktop e celular',done:false},{label:'Comparar repositório e versão publicada',done:false},{label:'Registrar evidências e decisão de liberação',done:false}],next:'Revisar itens; executar ações técnicas apenas fora deste painel.'}),
 make('check2','Checklist','Segurança e isolamento','Transversal',{environment:'Teste',priority:'Alta',checklist:[{label:'Testar acesso por papel e entre restaurantes',done:false},{label:'Verificar RLS e funções com privilégio elevado',done:false},{label:'Inspecionar uploads e visibilidade pública',done:false},{label:'Confirmar ausência de credenciais nas evidências',done:false},{label:'Testar sessão expirada e acesso não autenticado',done:false}]}),
];

// These are editable reference cards, not live GitHub or infrastructure telemetry.
export const operationSuggestions = initial.map(r => {
 const merges: Record<string,string> = {pr111:'9ff7a957c6393b65f316f0263b09095f8e04c97f',pr113:'07e16716f9bfaa3f9dd1aff30b47f87e49f459e5',pr114:'90c42cca80f476eae34541eb7178ce96943c3742'};
 if(merges[r.id]) return {...r,...(r.id==='pr111'?{files:'drizzle/migrations/0055_menu_item_media.sql; drizzle/migrations/0056_midia_restaurante.sql',dependencies:'Revisar migrações 0055 e 0056 no main; bucket restaurante-midia; campos de logo e fotos.'}:{}),merge:'Registrado',workflows:'Merge confirmado no GitHub em 11/11/2026: '+merges[r.id],notes:'Referência consultada em 11/11/2026. Merge confirmado no GitHub; publicação e validação funcional não verificadas. Sem sincronização automática.',...(r.id==='pr114'?{title:'PR #114 · Tipe Guest v2',product:'Tipe Reserva',risk:'Revisar permissões, garantia e fuso; manter reservas reais indisponíveis.',dependencies:'Revisar 0057_guest_staff_permissions.sql e módulos contratados.',manual:'Validar /guest-demo e isolamento da simulação; confirmar que reservas reais continuam indisponíveis.',decision:'Manter Em breve até a versão 2.0 e decidir as condições da garantia.',repo:'PR mesclado: permissões, garantia, fuso e demonstração Guest.',next:'Registrar validações da demonstração e dependências antes de disponibilizar reservas reais.'}:{})};
 if(r.id==='infra2')return {...r,status:'A validar',notes:'Acesso de leitura ao projeto de produção confirmado em 11/11/2026. Modelos de e-mail, redirecionamentos e fluxos de autenticação ainda precisam de validação.',dependencies:'Confirmar configurações do projeto correto.',next:'Revisar autenticação e configuração; registrar evidências sem dados sensíveis.'};
 return r;
});
export const operationKinds = ['PR','Produto','Infraestrutura','Integração','Pulse','Checklist','Tarefa'] as const;
const text = z.string().trim().max(5000);
export function containsCredential(value: string) {
  return /(?:sbp_|sb_secret_|sk_live_|sk_test_)[a-zA-Z0-9_-]{12,}|eyJ[a-zA-Z0-9_-]{15,}\.|-----BEGIN [^-]*PRIVATE KEY|Bearer\s+[a-zA-Z0-9_.-]{16,}|(?:password|senha|api[_-]?key|access[_-]?token|session_token|secret|token|authorization)\s*[=:]\s*["']?[^\s"'&]{8,}/i.test(value);
}
export function safeReference(value: string) {
  if (!value) return true;
  try { const u = new URL(value); return ['https:','http:'].includes(u.protocol) && !u.username && !u.password && !containsCredential(decodeURIComponent(value)); } catch { return false; }
}
export const operationSchema = z.object({
  id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/), title:z.string().trim().min(2).max(160),
  kind:z.enum(operationKinds), product:z.enum(['Transversal',...products] as [string,...string[]]),
  environment:z.string().trim().min(1).max(60), priority:z.enum(['Crítica','Alta','Média','Baixa']),
  owner:z.string().trim().min(1).max(100), status:z.enum(['A validar','Em andamento','Bloqueado','Aguardando decisão','Concluído','Em breve']),
  due:z.string().refine(v => !v || /^\d{4}-\d{2}-\d{2}$/.test(v) && Number.isFinite(Date.parse(v+'T12:00:00Z')) && new Date(v+'T12:00:00Z').toISOString().slice(0,10)===v, 'Data inválida'),
  link:z.string().max(2000).refine(safeReference, 'Use um link público http/https sem credenciais.'),
  risk:text, dependencies:text, manual:text, decision:text, repo:text, published:text, next:text,
  routes:text, files:text, workflows:text, evidence:text, notes:text,
  review:text, merge:text, deployment:text, validation:text,
  checklist:z.array(z.object({label:z.string().trim().min(1).max(300),done:z.boolean()}).strict()).max(80),
  version:z.number().int().min(0).max(1000000),
}).strict().superRefine((r,ctx)=>{
  const value=JSON.stringify(r);
  if(value.length>40000)ctx.addIssue({code:z.ZodIssueCode.custom,message:'O registro excede o limite de texto.'});
  // Check actual strings, not JSON serialization (quotes escape colon/equal markers).
  if(Object.values(r).some(v=> typeof v==='string' ? containsCredential(v) : Array.isArray(v) && v.some(c=>containsCredential(c.label))))
    ctx.addIssue({code:z.ZodIssueCode.custom,message:'Remova a credencial detectada. Registre somente referências e resultados.'});
});
export const OPERATION_SCOPE='central_operations_v1';
export type OperationRevision={ record:Item; at:string; actor:string|null };
export function latestOperations(revisions:OperationRevision[]) {
  const map=new Map<string,Item>();
  for(const r of revisions){const previous=map.get(r.record.id);if(!previous || previous.version<r.record.version)map.set(r.record.id,r.record);}
  return [...map.values()];
}
export function withSuggestions(records:Item[]) {
  const map=new Map(operationSuggestions.map(r=>[r.id,r]));
  for(const r of records)map.set(r.id,r);
  return [...map.values()];
}
export async function revisionId(id:string,version:number) {
  const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(OPERATION_SCOPE+':'+id+':'+version));
  const b=new Uint8Array(hash).slice(0,16);b[6]=(b[6]!&15)|128;b[8]=(b[8]!&63)|128;
  const h=Array.from(b,x=>x.toString(16).padStart(2,'0')).join('');
  return h.slice(0,8)+'-'+h.slice(8,12)+'-'+h.slice(12,16)+'-'+h.slice(16,20)+'-'+h.slice(20);
}
