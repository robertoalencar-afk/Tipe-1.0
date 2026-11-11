import { createServerFn } from '@tanstack/react-start';
import { z } from 'zod';
import { requireSupabaseAuth } from '@/integrations/supabase/auth-middleware';
import { operationSchema } from './operations';

type Context={supabase:any;userId:string;claims?:any};
async function authorized(ctx:Context){
 const {requireFounder2fa}=await import('./founder-guard');
 await requireFounder2fa(ctx);
 const {supabaseAdmin}=await import('@/integrations/supabase/client.server');
 return supabaseAdmin as unknown as {from:(table:string)=>any};
}
export const getCentralOperations=createServerFn({method:'GET'}).middleware([requireSupabaseAuth]).handler(async({context})=>{
 const db=await authorized(context);
 const {listOperations}=await import('./operations-store.server');
 return {records:await listOperations(db)};
});
export const getCentralOperationHistory=createServerFn({method:'GET'}).middleware([requireSupabaseAuth])
 .inputValidator((d)=>z.object({id:z.string().regex(/^[a-zA-Z0-9_-]{1,80}$/),offset:z.number().int().min(0).max(100000).default(0)}).strict().parse(d))
 .handler(async({context,data})=>{
 const db=await authorized(context);
 const {operationHistory}=await import('./operations-store.server');
 return operationHistory(db,data.id,data.offset);
});
export const saveCentralOperation=createServerFn({method:'POST'}).middleware([requireSupabaseAuth])
 .inputValidator((d)=>operationSchema.parse(d))
 .handler(async({context,data})=>{
 const db=await authorized(context);
 const {appendOperation}=await import('./operations-store.server');
 return appendOperation(db,data,context.userId);
});
