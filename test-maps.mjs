// test-maps.mjs
// Request: Verify custom map validation, gameplay, persistence and authenticated editing.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Maps from './game/maps.js';
import Platformer from './game/platformer.js';
import { createVerifier } from './src/auth.mjs';
import { createWorker } from './src/worker.mjs';
import { openDatabase } from './scripts/local-db.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const step=(g,seconds)=>{for(let t=0;t<seconds;t+=1/120)g.step(1/120);};
for(const preset of Maps.presets){
  const map=Maps.validate(preset);
  for(let seed=1;seed<=5;seed++){
    let state=seed;const engine=new Platformer.PlatformerEngine(()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;});
    engine.setMap(map);assert.equal(engine.snapshot().mapName,map.name);
    const initial=engine.snapshot().platforms;map.platforms[0].x+=1;
    assert.deepEqual(engine.platforms,initial,'engine owns a copy');map.platforms[0].x-=1;
    engine.configure(['bot','bot','bot','bot'],1);engine.start();
    assert.throws(()=>engine.setMap(map),/lobby/);
    for(let t=0;t<400&&engine.phase!=='matchOver';t+=1/120)engine.step(1/120);
    assert.equal(engine.phase,'matchOver',preset.name+' bot completion');
    engine.lobby();assert.deepEqual(engine.platforms,initial,'custom map survives replay/lobby');
  }
}
assert.throws(()=>Maps.validate({name:'',platforms:[]}),/name/);
let invalid=clone(Maps.presets[0]);invalid.platforms[0].w=200;assert.throws(()=>Maps.validate(invalid),/main floor/);
invalid=clone(Maps.presets[0]);invalid.platforms[1].x=-100;assert.throws(()=>Maps.validate(invalid),/workspace/);
invalid=clone(Maps.presets[0]);invalid.platforms[1].id='floor';assert.throws(()=>Maps.validate(invalid),/unique/);
invalid={name:'Unreachable',platforms:[clone(Maps.presets[0].platforms[0]),{id:'unreachable',x:40,y:140,w:90}]};assert.throws(()=>Maps.validate(invalid),/Connect/);
const basic={name:'Single floor',platforms:[{id:'floor',x:40,y:620,w:420}]};
assert.equal(Maps.spawns(Maps.validate(basic)).length,4);
const erosion=new Platformer.PlatformerEngine();erosion.setMap(basic);erosion.configure(['keyboard','keyboard','keyboard','keyboard'],3);erosion.start();step(erosion,22);assert(erosion.platforms[0].w<420);erosion.lobby();assert.equal(erosion.platforms[0].w,420);
console.log(`PASS: map constraints, four safe spawns, independent geometry, erosion/reset and ${Maps.presets.length*5} preset bot matches`);
await mkdir(new URL('.tmp/',import.meta.url),{recursive:true});
const filename=fileURLToPath(new URL(`.tmp/maps-test-${Date.now()}.sqlite`,import.meta.url));
const migrations=new URL('drizzle/',import.meta.url);let DB=openDatabase(filename,migrations);
const verifier=await createVerifier('94826137'),worker=createWorker({}),origin='https://maps.example';
const env=()=>({DB,RINGOUT_PIN_HASH:verifier});
let cookie='';
const send=(path,{body,method=body?'POST':'GET',originHeader=origin,auth=true}={})=>worker.fetch(new Request(origin+path,{method,headers:{Origin:originHeader,...(auth?{Cookie:cookie}:{}),...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env());
const login=await worker.fetch(new Request(origin+'/unlock',{method:'POST',headers:{Origin:origin,'Content-Type':'application/x-www-form-urlencoded'},body:'pin=94826137'}),env());cookie=login.headers.get('set-cookie').split(';')[0];
assert.equal((await send('/api/maps',{auth:false})).status,401);
assert.equal((await send('/api/maps',{body:{map:basic},auth:false})).status,401);
assert.equal((await send('/api/maps',{body:{map:basic},originHeader:'https://other.example'})).status,403);
assert.equal((await send('/api/maps',{body:{map:invalid}})).status,400);
assert.equal((await send('/api/maps',{body:{map:basic,padding:'x'.repeat(9000)}})).status,413);
const created=await send('/api/maps',{body:{map:{...basic,name:'<b>Text-only title</b>'}}});assert.equal(created.status,201);
const saved=(await created.json()).map;assert.equal(saved.revision,1);
assert.equal((await (await send('/api/maps')).json()).maps.length,1);
DB.close();DB=openDatabase(filename,migrations);
assert.equal((await (await send('/api/maps')).json()).maps[0].id,saved.id,'map persists after restart');
const updated=await send('/api/maps/'+saved.id,{body:{map:{...basic,name:'Edited map'},revision:1}});assert.equal(updated.status,200);assert.equal((await updated.json()).map.revision,2);
assert.equal((await send('/api/maps/'+saved.id,{body:{map:basic,revision:1}})).status,409,'stale edit rejected');
assert.equal((await send('/api/maps/'+saved.id,{body:{action:'delete',revision:1}})).status,409,'stale delete rejected');
assert.equal((await send('/api/maps/'+saved.id,{body:{action:'delete',revision:2}})).status,200);
assert.equal((await (await send('/api/maps')).json()).maps.length,0);
const concurrent=await Promise.all(Array.from({length:55},(_,i)=>send('/api/maps',{body:{map:{...basic,name:'Map '+i}}})));
assert.equal(concurrent.filter(r=>r.status===201).length,50);assert.equal(concurrent.filter(r=>r.status===409).length,5);
assert.equal((await (await send('/api/maps')).json()).maps.length,50,'atomic library bound');
const {default:bundle}=await import('./dist/server/index.js');
assert.equal((await bundle.fetch(new Request(origin+'/api/maps',{headers:{Cookie:cookie}}),env())).status,200,'bundled endpoint');
assert.equal((await bundle.fetch(new Request(origin+'/map-editor.js'),env())).status,401,'editor requires PIN');
const bundleText=await readFile(new URL('dist/server/index.js',import.meta.url),'utf8');assert.ok(bundleText.includes('Map workshop'));
DB.close();console.log('PASS: map API authentication, CSRF, bounded input, create/list/update/delete, stale-edit protection, persistence, atomic 50-map cap and server bundle');
// Purpose: Real simulation and SQLite-backed custom map checks. Upstream: map definitions, engine, Worker and migrations. Environment: Node 24. Generated: 2026-09-18 America/New_York. New file, all lines.
