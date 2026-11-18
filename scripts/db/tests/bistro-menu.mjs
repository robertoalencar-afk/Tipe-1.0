import assert from 'node:assert/strict';import {readFile} from 'node:fs/promises';
const {PGlite}=await import(process.env.PGLITE_MODULE||'@electric-sql/pglite');const db=new PGlite();
await db.exec(`create table restaurants(id uuid primary key,slug text);
create table pdv_menu_categories(id uuid primary key default gen_random_uuid(),restaurant_id uuid,name text,position int);
create table pdv_menu_items(id uuid primary key default gen_random_uuid(),restaurant_id uuid,category_id uuid references pdv_menu_categories(id) on delete set null,code text not null,name text not null,description text,price numeric(10,2) not null check(price>=0),available boolean not null default true,position int not null default 0,sector text not null default 'kitchen',image_url text,depth_url text,model_url text,badge text,allergens text[] not null default '{}',menu_config jsonb not null default '{}',unique(restaurant_id,code));
insert into restaurants values('11111111-1111-4111-8111-111111111111','bistro-teste'),('22222222-2222-4222-8222-222222222222','bar-teste');
insert into pdv_menu_categories(id,restaurant_id,name,position) values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','Licores',99),('44444444-4444-4444-8444-444444444444','22222222-2222-4222-8222-222222222222','Bar',1);
insert into pdv_menu_items(restaurant_id,category_id,code,name,price) values('11111111-1111-4111-8111-111111111111','33333333-3333-4333-8333-333333333333','X1','Licor importado',10),('22222222-2222-4222-8222-222222222222','44444444-4444-4444-8444-444444444444','B1','Chope',9);`);
await db.exec(await readFile(new URL('../../../drizzle/migrations/0071_bistro_menu_curado.sql',import.meta.url),'utf8'));
const items=(await db.query(`select i.code,i.name,i.description,i.price,i.sector,i.image_url,i.menu_config,c.name cat from pdv_menu_items i join pdv_menu_categories c on c.id=i.category_id where i.restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows;
assert.equal(items.length,33);assert.ok(!items.some(i=>i.code==='X1'),'cardápio importado saiu');
assert.ok(items.every(i=>i.description.length>=10&&i.description.length<=200&&i.name.length<=80&&i.code.length<=16));
assert.ok(items.filter(i=>i.image_url).every(i=>i.image_url.startsWith('/cardapio/')),'só fotos próprias');
const codes=new Set(items.map(i=>i.code));for(const i of items)for(const r of i.menu_config.recommendations??[])assert.ok(codes.has(r),`recomendação ${r} existe`);
assert.ok(items.filter(i=>['Cervejas','Coquetéis','Vinhos em taça','Cafés'].includes(i.cat)).every(i=>i.sector==='bar'));
assert.equal((await db.query(`select count(*)::int n from pdv_menu_items where restaurant_id='22222222-2222-4222-8222-222222222222'`)).rows[0].n,1,'outra empresa intacta');
assert.equal((await db.query(`select count(*)::int n from pdv_menu_categories where restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows[0].n,11);
await db.exec(await readFile(new URL('../../../drizzle/migrations/0083_bistro_fotos_reais.sql',import.meta.url),'utf8'));
const {existsSync}=await import('node:fs');
const after=(await db.query(`select code,name,description,image_url,depth_url,menu_config from pdv_menu_items where restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows;
assert.equal(after.length,33);assert.ok(after.every(i=>i.image_url),'todo prato tem foto');
for(const i of after.filter(i=>i.image_url.startsWith('https://'))){const c=i.menu_config.photoCredit;
  assert.equal(c?.imageUrl,i.image_url,`crédito de ${i.code} é da foto atual`);assert.ok(c.author&&c.sourceUrl.startsWith('https://unsplash.com/photos/')&&c.license==='Unsplash License');
  assert.equal(i.depth_url,null,'volume antigo sai');assert.ok(existsSync(new URL('../../../public'+new URL(i.image_url).pathname,import.meta.url)),`arquivo de ${i.code} existe`);
  assert.ok(i.description.length<=200&&i.name.length<=80);}
assert.equal(after.filter(i=>!i.image_url.startsWith('https://')).length,1,'só o suco de caju mantém foto própria');
await db.exec(await readFile(new URL('../../../drizzle/migrations/0084_bistro_ficha_pratos.sql',import.meta.url),'utf8'));
const ficha=(await db.query(`select code,description,allergens,menu_config from pdv_menu_items where restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows;
const DIETS=new Set(['vegan','vegetarian','gluten_free','lactose_free']);
for(const i of ficha){assert.ok(i.description.length>=25&&i.description.length<=200,`ficha de ${i.code}`);assert.ok(Array.isArray(i.menu_config.diets)&&i.menu_config.diets.every(d=>DIETS.has(d)));}
assert.ok(ficha.find(i=>i.code==='BT-MOQUECA').allergens.includes('crustáceos'));assert.ok(ficha.find(i=>i.code==='BT-SALADA').menu_config.diets.includes('vegan'));
await db.exec(await readFile(new URL('../../../drizzle/migrations/0085_bistro_bebidas_marcas_3d.sql',import.meta.url),'utf8'));
const fim=(await db.query(`select code,name,image_url,depth_url,model_url,menu_config from pdv_menu_items where restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows;
assert.equal(fim.length,41);assert.ok(fim.every(i=>!i.model_url),'sem modelos 3D de jogo');assert.ok(fim.some(i=>i.name.startsWith('Coca-Cola'))&&fim.some(i=>i.name.startsWith('Heineken')),'bebidas de marca');
assert.ok(!fim.some(i=>['BT-REFRI','BT-CERVEJA','BT-CERV-ZERO'].includes(i.code)),'genéricas saem');
const pub=(u)=>new URL('../../../public'+(u.startsWith('https://')?new URL(u).pathname:u),import.meta.url);
for(const i of fim){assert.ok(i.image_url&&i.depth_url,`${i.code} com foto e 3D`);assert.ok(existsSync(pub(i.image_url))&&existsSync(pub(i.depth_url)),`arquivos de ${i.code}`);}
const all=new Set(fim.map(i=>i.code));for(const i of fim)for(const r of i.menu_config.recommendations??[])assert.ok(all.has(r),`recomendação ${r}`);
await db.exec(await readFile(new URL('../../../drizzle/migrations/0086_bistro_marcas_destilados.sql',import.meta.url),'utf8'));
const marcas=(await db.query(`select name from pdv_menu_items where restaurant_id='11111111-1111-4111-8111-111111111111' and code in ('BT-CAIPI','BT-VINHO-T','BT-AGUA')`)).rows.map(r=>r.name).join(' ');
assert.ok(/Ypióca/.test(marcas)&&/Casillero/.test(marcas)&&/Crystal/.test(marcas),'marcas reais');
await db.exec(await readFile(new URL('../../../drizzle/migrations/0087_bistro_cardapio_real.sql',import.meta.url),'utf8'));
const real=(await db.query(`select i.code,i.name,i.description,i.image_url,i.depth_url,i.model_url,i.sector,i.allergens,i.menu_config,c.name cat from pdv_menu_items i join pdv_menu_categories c on c.id=i.category_id where i.restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows;
assert.equal(real.length,56,'36 pratos do cardápio real + 20 bebidas');const cozinha=real.filter(i=>i.sector==='kitchen');assert.equal(cozinha.length,36);
assert.ok(!real.some(i=>['MAR-BAIAO','BT-RISOTO','BT-MACAX','MAR-CARTOLA'].includes(i.code)),'pratos antigos saem');assert.ok(real.some(i=>i.code==='BT-HEINEKEN')&&real.some(i=>i.code==='BT-CAIPI'),'bebidas ficam');
for(const i of cozinha){assert.ok(i.image_url.includes('/cardapio/bistro/real/')&&i.depth_url.endsWith('-depth.png')&&!i.model_url,`${i.code} foto real`);assert.ok(existsSync(pub(i.image_url))&&existsSync(pub(i.depth_url)),`arquivos ${i.code}`);
  assert.ok(i.description.length>=25&&i.description.length<=200&&Array.isArray(i.menu_config.diets)&&i.menu_config.diets.every(d=>DIETS.has(d)),`ficha ${i.code}`);}
assert.equal(new Set(cozinha.map(i=>i.image_url)).size,36,'uma foto por prato');
const rc=new Set(real.map(i=>i.code));for(const i of real)for(const r of i.menu_config.recommendations??[])assert.ok(rc.has(r),`recomendação ${r}`);
assert.equal((await db.query(`select count(*)::int n from pdv_menu_categories where restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows[0].n,14,'8 categorias de cozinha + 6 de bebidas');
await db.exec(await readFile(new URL('../../../drizzle/migrations/0087_bistro_cardapio_real.sql',import.meta.url),'utf8'));
assert.equal((await db.query(`select count(*)::int n from pdv_menu_items where restaurant_id='11111111-1111-4111-8111-111111111111'`)).rows[0].n,56,'reaplicar não duplica');
await db.exec(`alter table restaurants add column menu_posts jsonb not null default '[]'::jsonb`);
await db.exec(await readFile(new URL('../../../drizzle/migrations/0088_bistro_banners.sql',import.meta.url),'utf8'));
const posts=(await db.query(`select menu_posts from restaurants where slug='bistro-teste'`)).rows[0].menu_posts;
assert.equal(posts.length,7,'sete banners');assert.equal(new Set(posts.map(p=>p.id)).size,7);
for(const p of posts){const it=real.find(i=>i.code===p.itemCode);assert.ok(it?.image_url,`banner ${p.title} aponta prato com foto`);
  assert.ok(p.title.length<=70&&p.caption.length<=180&&['promo','novo','evento'].includes(p.tag)&&(p.days??[]).every(d=>d>=0&&d<=6));}
assert.deepEqual((await db.query(`select menu_posts from restaurants where slug='bar-teste'`)).rows[0].menu_posts,[],'outra empresa intacta');
await db.exec(await readFile(new URL('../../../drizzle/migrations/0089_bistro_lebre_indica.sql',import.meta.url),'utf8'));
const picks=(await db.query(`select code,menu_config from pdv_menu_items where restaurant_id='11111111-1111-4111-8111-111111111111' and menu_config ? 'lebrePick'`)).rows;
assert.equal(picks.length,5,'cinco indicações da Lebre');for(const p of picks){const r=p.menu_config.lebrePick.reason;assert.ok(p.menu_config.featured&&r.length>=20&&r.length<=160,`indicação ${p.code}`);}
await db.close();console.log('Bistrô menu: curated menu with real branded drinks, every item with photo and 3D depth, full dish sheet (allergens, diets), valid recommendations, other tenants untouched.');
