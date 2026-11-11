import { OPERATION_SCOPE, operationSchema, revisionId, type Item, type OperationRevision } from './operations';
export type OperationsDb = { from: (table:string)=>any };
const table='crm_activities';
const scoped=(db:OperationsDb)=>db.from(table).select('id, created_at, actor_id, meta').eq('meta->>scope',OPERATION_SCOPE);
const conflict='Este registro foi alterado em outra sessão. Atualize os dados antes de salvar novamente.';
function snapshot(row:any):OperationRevision {
 const parsed=operationSchema.safeParse(row.meta?.snapshot);
 if(!parsed.success || parsed.data.id!==row.meta.recordId || parsed.data.version!==row.meta.version)throw new Error('Versão de operação inválida no histórico. Nenhum dado foi substituído.');
 return {record:parsed.data,at:row.created_at,actor:row.actor_id};
}
export async function listOperations(db:OperationsDb) {
 // Read only lightweight revision headers first; load one full snapshot per record.
 const heads=new Map<string,{id:string;version:number}>();
 for(let offset=0;;offset+=500){
  const {data,error}=await db.from(table).select('id, recordId:meta->>recordId, version:meta->version').eq('meta->>scope',OPERATION_SCOPE).order('id').range(offset,offset+499);
  if(error)throw new Error('Não foi possível carregar o acompanhamento. Tente novamente.');
  for(const row of data??[]){if(typeof row.recordId!=='string'||!Number.isInteger(row.version))throw new Error('Histórico operacional inválido.');const current=heads.get(row.recordId);if(!current||current.version<row.version)heads.set(row.recordId,{id:row.id,version:row.version});}
  if(heads.size>500)throw new Error('O acompanhamento atingiu 500 registros. Contate o suporte para ampliar a consulta.');
  if((data??[]).length<500)break;
  if(offset>=99500)throw new Error('Histórico muito extenso para uma consulta única. Nenhum registro foi descartado.');
 }
 const result:Item[]=[];const ids=[...heads.values()].map(r=>r.id);
 for(let i=0;i<ids.length;i+=20){const {data,error}=await scoped(db).in('id',ids.slice(i,i+20));if(error)throw new Error('Não foi possível carregar os registros.');for(const row of data??[])result.push(snapshot(row).record);}
 if(result.length!==heads.size)throw new Error("A consulta de operações ficou incompleta. Atualize os dados.");
 return result;
}
export async function operationHistory(db:OperationsDb,id:string,offset=0):Promise<{revisions:OperationRevision[];nextOffset:number|null}>{
 const {data,error}=await scoped(db).eq('meta->>recordId',id).order('meta->version',{ascending:false}).range(offset,offset+19);
 if(error)throw new Error('Não foi possível carregar o histórico.');
 return {revisions:(data??[]).map(snapshot),nextOffset:(data??[]).length===20?offset+20:null};
}
export async function appendOperation(db:OperationsDb,input:Item,actor:string){
 const record=operationSchema.parse(input);
 const {data,error}=await scoped(db).eq('meta->>recordId',record.id).order('meta->version',{ascending:false}).limit(1);
 if(error)throw new Error('Não foi possível verificar a versão atual.');
 const current=data?.[0]?snapshot(data[0]).record.version:0;
 if(current!==record.version)throw new Error(conflict);
 const next={...record,version:record.version+1};
 const id=await revisionId(record.id,next.version);
 // A deterministic primary key makes concurrent writers to the same revision conflict
 // atomically. The immutable row is both the saved record and its audit history.
 const saved=await db.from(table).insert({id,kind:'system',title:'Operação: '+next.title,actor_id:actor,meta:{scope:OPERATION_SCOPE,recordId:next.id,version:next.version,snapshot:next}});
 if(saved.error)throw new Error(saved.error.code==='23505'?conflict:'Não foi possível salvar. Atualize os dados para verificar se a alteração foi registrada.');
 return next;
}
