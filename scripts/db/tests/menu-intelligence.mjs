import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
const { PGlite } = await import(process.env.PGLITE_MODULE || "@electric-sql/pglite");
const db = new PGlite();
const r1 = "11111111-1111-4111-8111-111111111111", r2 = "22222222-2222-4222-8222-222222222222";
const i1 = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", i2 = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
await db.exec(`
 CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role BYPASSRLS;
 CREATE SCHEMA auth;
 CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$SELECT null::uuid$$;
 GRANT USAGE ON SCHEMA auth TO authenticated;
 CREATE TYPE public.app_role AS ENUM ('owner','manager','cashier');
 CREATE FUNCTION public.has_restaurant_role(uuid,uuid,public.app_role[]) RETURNS boolean LANGUAGE sql AS $$
 SELECT $2::text=current_setting('test.restaurant',true) AND current_setting('test.role',true)=ANY($3::text[]) $$;
 CREATE FUNCTION public.mfa_session_ok() RETURNS boolean LANGUAGE sql AS $$SELECT current_setting('test.mfa',true)='ok'$$;
 CREATE TABLE public.restaurants(id uuid PRIMARY KEY);
 CREATE TABLE public.pdv_menu_items(id uuid PRIMARY KEY, restaurant_id uuid REFERENCES public.restaurants(id),available boolean);
 INSERT INTO restaurants VALUES ('${r1}'),('${r2}');
 INSERT INTO pdv_menu_items VALUES ('${i1}','${r1}',true),('${i2}','${r2}',true);
 GRANT SELECT ON pdv_menu_items TO service_role;
`);
await db.exec(await readFile(new URL("../../../drizzle/migrations/0061_menu_intelligence.sql", import.meta.url), "utf8"));
await db.exec(`SET ROLE service_role; SELECT record_menu_interaction('${r1}','${i1}','photo_open'); SELECT record_menu_interaction('${r1}','${i1}','add'); SELECT record_menu_interaction('${r1}','${i2}','add'); RESET ROLE;`);
let rows = (await db.query("SELECT * FROM menu_daily_metrics")).rows;
assert.equal(rows.length,1,"cross-restaurant item cannot create a metric");
assert.equal(rows[0].photo_opens,1); assert.equal(rows[0].additions,1);
await db.exec(`UPDATE pdv_menu_items SET available=false WHERE id='${i1}'; SET ROLE service_role; SELECT record_menu_interaction('${r1}','${i1}','add'); RESET ROLE;`);
assert.equal((await db.query("SELECT additions FROM menu_daily_metrics")).rows[0].additions,1,"unavailable item cannot add metrics");
async function denied(sql) { let failed=false; try { await db.exec(sql); } catch { failed=true; } finally { await db.exec("RESET ROLE"); } assert.equal(failed,true,sql); }
await denied("SET ROLE anon; SELECT * FROM menu_daily_metrics;");
await denied(`SET ROLE authenticated; SELECT record_menu_interaction('${r1}','${i1}','add');`);
await denied(`SET ROLE authenticated; INSERT INTO menu_daily_metrics(restaurant_id,item_id) VALUES ('${r2}','${i2}');`);
await denied(`SET ROLE service_role; SELECT record_menu_interaction('${r1}','${i1}','invalid');`);
await db.exec(`SELECT set_config('test.restaurant','${r1}',false),set_config('test.mfa','ok',false); SET ROLE authenticated;`);
for (const role of ["owner","manager","cashier"]) {
 await db.exec(`SELECT set_config('test.role','${role}',false)`);
 rows=(await db.query("SELECT * FROM menu_daily_metrics")).rows;
 assert.equal(rows.length,role==='cashier'?0:1,`${role} visibility`);
}
await db.exec(`SELECT set_config('test.role','owner',false),set_config('test.restaurant','${r2}',false)`);
assert.equal((await db.query("SELECT * FROM menu_daily_metrics")).rows.length,0,"other restaurant denied");
await db.exec(`SELECT set_config('test.restaurant','${r1}',false),set_config('test.mfa','no',false)`);
assert.equal((await db.query("SELECT * FROM menu_daily_metrics")).rows.length,0,"MFA gate enforced");
await db.close();
console.log("Menu SQL: ownership, availability, counters, grants, roles and MFA passed");
