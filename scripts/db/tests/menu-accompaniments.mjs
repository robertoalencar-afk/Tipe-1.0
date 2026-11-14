import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const { PGlite } = await import(process.env.PGLITE_MODULE || '@electric-sql/pglite');
const db = new PGlite();
const read = path => readFile(new URL(path, import.meta.url), 'utf8');
await db.exec((await read('./customer-order-review.fixture.sql')).replace('CREATE EXTENSION pgcrypto;', ''));
const base = await read('../../../drizzle/migrations/0027_order_modules_table_ordering.sql');
await db.exec(base.slice(base.indexOf('CREATE OR REPLACE FUNCTION public.pdv_customer_order'), base.indexOf('-- Restaurantes que já')));
await db.exec(await read('../../../drizzle/migrations/0059_customer_order_review.sql'));
await db.exec(await read('../../../drizzle/migrations/0064_menu_accompaniments.sql'));
await db.exec(await read('./customer-order-review.sql'));
const rid='20000000-0000-0000-0000-000000000001', other='20000000-0000-0000-0000-000000000002', owner='10000000-0000-0000-0000-000000000001';
await db.exec(`INSERT INTO restaurants VALUES ('${rid}','test'),('${other}','other');
INSERT INTO auth.users VALUES('${owner}'); INSERT INTO user_roles VALUES('${owner}','${rid}','owner');
INSERT INTO restaurant_tables VALUES('${rid}','1',true,'session');
INSERT INTO pdv_menu_items(restaurant_id,code,name,price,sector,available) VALUES
('${rid}','P','Prato',30,'kitchen',true),('${rid}','R','Arroz',6,'kitchen',true),('${rid}','F','Farofa',4,'kitchen',true),('${rid}','X','Salada',5,'kitchen',false),('${other}','Z','Outro restaurante',1,'kitchen',true);`);
const config={accompaniments:{enabled:true,min:1,max:2,choices:[{code:'R',included:true},{code:'F',included:false},{code:'X',included:true}]}};
await db.query('UPDATE pdv_menu_items SET menu_config=$1 WHERE code=$2',[config,'P']);
let request=0;
async function order(items, id=`order-${String(++request).padStart(8,'0')}`) {
 return (await db.query("SELECT pdv_customer_order('test','1',$1,'Cliente',$2,NULL,'session') result",[JSON.stringify(items),id])).rows[0].result;
}
for (const sides of [[],['R','R'],['R','F','X'],['Z'],['X'],['P'],[null]]) {
 await assert.rejects(order([{code:'P',qty:1,sides}]), undefined, `reject invalid sides ${JSON.stringify(sides)}`);
}
await assert.rejects(order([{code:'R',qty:1,sides:['F']}]),/não permite/);
let result=await order([{code:'P',qty:2,sides:['R','F'],price:0,notes:'Sem pimenta'}],'same-order');
assert.equal(result.total,68,'included rice free; catalog farofa price for every unit');
let kitchen=(await db.query('SELECT * FROM pdv_order_items ORDER BY item_code')).rows;
assert.equal(kitchen.length,2); assert.equal(kitchen.find(i=>i.item_code==='P').notes,'Sem pimenta · Acompanhamentos: Arroz, Farofa');
assert.equal(kitchen.find(i=>i.item_code==='F').quantity,2);
assert.equal(kitchen.find(i=>i.item_code==='F').notes,'Acompanhamento de Prato');
assert.equal((await order([{code:'P',qty:2,sides:['R','F']}],'same-order')).duplicate,true);
assert.equal((await db.query('SELECT count(*)::int n FROM pdv_order_items')).rows[0].n,2);
const long='A'.repeat(80); await db.query('UPDATE pdv_menu_items SET name=$1 WHERE code=$2',[long,'R']);
result=await order([{code:'P',qty:1,sides:['R','F'],notes:'B'.repeat(140)}]);
assert.ok((await db.query("SELECT max(length(notes)) n FROM pdv_order_items")).rows[0].n>140,'KDS preserves full choices and observation');
result=await order([{code:'P',qty:6,sides:['R','F']}]);
assert.equal(result.review_state,'pending'); assert.equal(result.total,204);
await db.exec(`SELECT set_config('request.jwt.claim.sub','${owner}',false)`);
await db.exec("UPDATE pdv_menu_items SET available=false WHERE code='R'");
await assert.rejects(db.query('SELECT resolve_customer_order_review($1,true)',[result.review_id]), /Acompanhamento indisponível/);
await db.exec("UPDATE pdv_menu_items SET available=true WHERE code='R'");
await db.query('SELECT resolve_customer_order_review($1,true)',[result.review_id]);
assert.equal((await db.query('SELECT sum(unit_price*quantity) total FROM pdv_order_items')).rows[0].total,'306');
for (const role of ['anon','authenticated','service_role']) {
 assert.equal((await db.query("SELECT has_function_privilege($1,'prepare_menu_accompaniments(uuid,jsonb)','EXECUTE') allowed",[role])).rows[0].allowed,false);
}
await db.close();
console.log('Accompaniments SQL passed: counts, duplicates, unavailable/cross-restaurant choices, authoritative price, included sides, quantity, KDS notes, pending approval and existing session/idempotency tests.');
