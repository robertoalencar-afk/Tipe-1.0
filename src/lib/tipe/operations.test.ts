import { describe, it, expect } from 'vitest';
import { operationSchema,operationSuggestions,revisionId,withSuggestions,latestOperations,OPERATION_SCOPE,type Item } from './operations';
import { appendOperation,listOperations,operationHistory } from './operations-store.server';
import {requireFounder2fa} from './founder-guard';
const record=()=>structuredClone(operationSuggestions[0]!);
function database(initial:any[]=[]){
 const rows=structuredClone(initial);let fail=false;
 return {rows,setFail:()=>{fail=true},from:()=>{
  let filters:[string,any][]=[],ids:string[]|undefined,start=0,end=Infinity,max=Infinity,order='',ascending=true,selection='';
  const q:any={select:(s:string)=>{selection=s;return q},eq:(k:string,v:any)=>{filters.push([k,v]);return q},in:(_:string,v:string[])=>{ids=v;return q},order:(k:string,o?:any)=>{order=k;ascending=o?.ascending!==false;return q},range:(a:number,b:number)=>{start=a;end=b;return q},limit:(n:number)=>{max=n;return q},then:(resolve:any)=>{
   if(fail)return Promise.resolve(resolve({data:null,error:{code:'network'}}));
   let data=rows.filter(r=>filters.every(([k,v])=>k==='meta->>scope'?r.meta.scope===v:k==='meta->>recordId'?r.meta.recordId===v:r[k]===v)&&(!ids||ids.includes(r.id)));
   data.sort((a,b)=>{const x=order==='meta->version'?a.meta.version:a[order],y=order==='meta->version'?b.meta.version:b[order];return (x<y?-1:x>y?1:0)*(ascending?1:-1)});
   data=data.slice(start,Math.min(end+1,start+max));
   if(selection.includes('recordId:'))data=data.map(r=>({id:r.id,recordId:r.meta.recordId,version:r.meta.version}));
   return Promise.resolve(resolve({data:structuredClone(data),error:null}));
  },insert:async(row:any)=>{
   if(fail)return {error:{code:'network'}};
   if(rows.some(r=>r.id===row.id))return {error:{code:'23505'}};
   rows.push({...structuredClone(row),created_at:new Date().toISOString()});return {error:null};
  }};return q;
 }};
}
describe('Central: acompanhamento integrado',()=>{
 it('accepts reference cards and keeps merge separate from publication',()=>{
  for(const r of operationSuggestions)expect(operationSchema.safeParse(r).success,r.id).toBe(true);
  for(const id of ['pr111','pr113','pr114']){const r=operationSuggestions.find(r=>r.id===id)!;expect(r.merge).toBe('Registrado');expect(r.deployment).toBe('Não verificado');expect(r.validation).toBe('Pendente');}
  expect(operationSuggestions.some(r=>r.kind==='Comercial')).toBe(false);
  expect(operationSuggestions.find(r=>r.product==='Tipe Reserva'&&r.kind==='Produto')?.status).toBe('Em breve');
 });
 it('rejects script links, credentials, oversized data and invalid dates',()=>{
  for(const link of ['javascript:alert(1)','https://user:pass@example.com','https://example.com/?token=1234567890'])expect(operationSchema.safeParse({...record(),link}).success).toBe(false);
  for(const notes of ['Bearer '+'x'.repeat(30),'sb_secret_'+'x'.repeat(30),'senha=1234567890'])expect(operationSchema.safeParse({...record(),notes}).success).toBe(false);
  expect(operationSchema.safeParse({...record(),due:'2026-99-99'}).success).toBe(false);
  expect(operationSchema.safeParse({...record(),due:'2026-02-30'}).success).toBe(false);
  expect(operationSchema.safeParse({...record(),risk:'x'.repeat(5001)}).success).toBe(false);
  expect(operationSchema.safeParse({...record(),unexpected:true}).success).toBe(false);
 });
 it('preserves old snapshots and paginates history',async()=>{
  const db=database();let r=record();
  for(let i=0;i<23;i++)r=await appendOperation(db,{...r,title:'Revisão '+i},'founder');
  expect(db.rows).toHaveLength(23);expect(db.rows[0].meta.snapshot.title).toBe('Revisão 0');
  expect((await listOperations(db))[0]?.version).toBe(23);
  const h=await operationHistory(db,r.id);expect(h.revisions).toHaveLength(20);expect(h.revisions[0]?.record.version).toBe(23);expect(h.nextOffset).toBe(20);
  expect((await operationHistory(db,r.id,20)).revisions).toHaveLength(3);
 });
 it('permits exactly one concurrent writer and rejects stale saves',async()=>{
  const db=database();const r=record();
  const results=await Promise.allSettled([appendOperation(db,{...r,title:'Primeiro'},'a'),appendOperation(db,{...r,title:'Segundo'},'b')]);
  expect(results.filter(x=>x.status==='fulfilled')).toHaveLength(1);expect(db.rows).toHaveLength(1);
  await expect(appendOperation(db,r,'a')).rejects.toThrow('outra sessão');
  const current=(await listOperations(db))[0]!;const restored=await appendOperation(db,{...r,version:current.version},'a');expect(restored.version).toBe(2);expect(db.rows).toHaveLength(2);
 });
 it('does not write or fabricate empty successful data on failure',async()=>{
  const db=database();db.setFail();await expect(listOperations(db)).rejects.toThrow();await expect(appendOperation(db,record(),'a')).rejects.toThrow();expect(db.rows).toHaveLength(0);
 });
 it('isolates technical rows from CRM and reads every metadata page',async()=>{
  const rows=[];
  for(let i=0;i<501;i++){const r={...record(),version:i+1};rows.push({id:await revisionId(r.id,r.version),created_at:new Date().toISOString(),actor_id:'a',meta:{scope:OPERATION_SCOPE,recordId:r.id,version:r.version,snapshot:r}})}
  rows.push({id:'crm',created_at:new Date().toISOString(),actor_id:'a',meta:{scope:'other',recordId:'lead',version:99,snapshot:record()}});
  const db=database(rows);const result=await listOperations(db);expect(result).toHaveLength(1);expect(result[0]?.version).toBe(501);
 });
 it('creates stable unique revision keys and prefers highest version over time',async()=>{
  const a=await revisionId('a',1);expect(a).toMatch(/^[a-f0-9-]{36}$/);expect(await revisionId('a',1)).toBe(a);expect(await revisionId('a',2)).not.toBe(a);
  const r=record();expect(latestOperations([{record:{...r,version:2},at:'old',actor:null},{record:{...r,version:1},at:'new',actor:null}])[0]?.version).toBe(2);
  expect(withSuggestions([{...r,version:1,title:'Saved'}]).find(x=>x.id===r.id)?.title).toBe('Saved');
 });
 it('requires both founder role and aal2',async()=>{
  for(const [role,aal] of [[false,'aal2'],[true,'aal1'],[false,'aal1']] as const)await expect(requireFounder2fa({supabase:{rpc:async()=>({data:role})},userId:'u',claims:{aal}})).rejects.toThrow();
  await expect(requireFounder2fa({supabase:{rpc:async()=>({data:true})},userId:'u',claims:{aal:'aal2'}})).resolves.toBeUndefined();
 });
});
