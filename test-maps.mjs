// test-maps.mjs
// Request: Verify full motion routes and all bot difficulties on the expanded preset catalog.
import assert from 'node:assert/strict';
import { mkdir, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import Maps from './game/maps.js';
import Platformer from './game/platformer.js';
import { createWorker } from './src/worker.mjs';
import { openDatabase } from './scripts/local-db.mjs';
const clone=x=>JSON.parse(JSON.stringify(x));
const step=(g,seconds)=>{for(let t=0;t<seconds;t+=1/120)g.step(1/120);};
const newMapIds=new Set(['rift-relay','bounce-foundry','twin-peaks','conveyor-crossing','spiral-spire','pocket-brawl']);
const advancedIds=new Set(['switchback-citadel','orbital-exchange','spring-circuit','glass-gauntlet',...newMapIds]);
assert.equal(new Set(Maps.presets.map(m=>m.id)).size,Maps.presets.length,'preset IDs remain unique');
assert.equal(new Set(Maps.presets.map(m=>m.name)).size,Maps.presets.length,'preset names remain distinct');
for(const preset of Maps.presets.filter(p=>advancedIds.has(p.id))){
  const map=Maps.validate(preset);
  const envelopes=map.platforms.map(p=>{
    const dx=p.motion?.axis==='x'?p.motion.distance:0,dy=p.motion?.axis==='y'?p.motion.distance:0;
    return{...p,left:p.x+Math.min(0,dx),right:p.x+p.w+Math.max(0,dx),top:p.y+Math.min(0,dy),bottom:p.y+Math.max(0,dy)};
  });
  for(let i=0;i<envelopes.length;i++)for(let j=i+1;j<envelopes.length;j++){
    const a=envelopes[i],b=envelopes[j];
    if(a.left<b.right&&b.left<a.right)assert(Math.max(a.top-b.bottom,b.top-a.bottom)>=60,`${map.name}: ${a.id}/${b.id} leave room throughout independent movement cycles`);
  }
  const floor=map.platforms[0],spawns=Maps.spawns(map);
  for(const p of spawns)assert(p.x-21>=floor.x&&p.x+21<=floor.x+floor.w,`${map.name}: safe floor start`);
  for(let i=1;i<spawns.length;i++)assert(spawns[i].x-spawns[i-1].x>=42,`${map.name}: separate fighter starts`);
  const engine=new Platformer.PlatformerEngine();engine.setMap(map);engine.configure(['keyboard','keyboard','keyboard','keyboard'],1,999);engine.start();step(engine,3.05);
  for(let sample=0;sample<32;sample++){
    step(engine,.25);
    assert.equal(engine.phase,'playing',`${map.name}: idle starts stay safe`);
    assert.doesNotThrow(()=>Maps.validate({name:map.name,platforms:engine.platforms.map(p=>({...p,x:Math.round(p.x),y:Math.round(p.y),motion:null}))}),`${map.name}: connected routes at ${engine.elapsed.toFixed(2)} seconds`);
    assert(engine.players.every(p=>p.alive&&p.support==='floor'),`${map.name}: moving ledges do not disturb starts`);
  }
  assert.deepEqual(engine.mapDefinition,map,'movement does not alter editable source geometry');
}
console.log('PASS: advanced-map full travel spacing, four separated safe starts and reachable routes across actual motion cycles');
let presetBotMatches=0;
for(const preset of Maps.presets){
  const map=Maps.validate(preset);
  for(const difficulty of newMapIds.has(preset.id)?['easy','normal','hard','mixed']:['normal'])for(let seed=1;seed<=5;seed++){
    let state=seed;const engine=new Platformer.PlatformerEngine(()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;});
    engine.setMap(map);assert.equal(engine.snapshot().mapName,map.name);
    const initial=engine.snapshot().platforms;map.platforms[0].x+=1;
    assert.deepEqual(engine.platforms,initial,'engine owns a copy');map.platforms[0].x-=1;
    engine.configure(['bot','bot','bot','bot'],1,18,'round',difficulty==='mixed'?['easy','normal','hard','normal']:Array(4).fill(difficulty));engine.start();
    assert.throws(()=>engine.setMap(map),/lobby/);
    for(let t=0;t<400&&engine.phase!=='matchOver';t+=1/120)engine.step(1/120);
    assert.equal(engine.phase,'matchOver',preset.name+' '+difficulty+' seed '+seed+' bot completion');presetBotMatches++;
    engine.lobby();assert.deepEqual(engine.platforms,initial,'custom map survives replay/lobby');
  }
}
assert.throws(()=>Maps.validate({name:'',platforms:[]}),/name/);
let invalid=clone(Maps.presets[0]);invalid.platforms[0].w=200;assert.throws(()=>Maps.validate(invalid),/main floor/);
invalid=clone(Maps.presets[0]);invalid.platforms[1].x=-100;assert.throws(()=>Maps.validate(invalid),/workspace/);
invalid=clone(Maps.presets[0]);invalid.platforms[1].id='floor';assert.throws(()=>Maps.validate(invalid),/unique/);
invalid={name:'Unreachable',platforms:[clone(Maps.presets[0].platforms[0]),{id:'unreachable',x:40,y:140,w:90}]};assert.throws(()=>Maps.validate(invalid),/Connect/);
const basic={name:'Single floor',platforms:[{id:'floor',x:40,y:620,w:420,jumpPad:true}]};
assert.equal(Maps.spawns(Maps.validate(basic)).length,4);
const erosion=new Platformer.PlatformerEngine();erosion.setMap(basic);erosion.configure(['keyboard','keyboard','keyboard','keyboard'],3);erosion.start();step(erosion,22);assert(erosion.platforms[0].w<420);erosion.lobby();assert.equal(erosion.platforms[0].w,420);
console.log(`PASS: map constraints, four safe spawns, independent geometry, erosion/reset and ${presetBotMatches} preset bot matches`);
await mkdir(new URL('.tmp/',import.meta.url),{recursive:true});
const filename=fileURLToPath(new URL(`.tmp/maps-test-${Date.now()}.sqlite`,import.meta.url));
const migrations=new URL('drizzle/',import.meta.url);let DB=openDatabase(filename,migrations);
const worker=createWorker({}),origin='https://maps.example';
const env=()=>({DB});
const send=(path,{body,method=body?'POST':'GET',originHeader=origin}={})=>worker.fetch(new Request(origin+path,{method,headers:{Origin:originHeader,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{})}),env());
assert.equal((await send('/api/maps',{body:{map:basic},originHeader:'https://other.example'})).status,403);
assert.equal((await send('/api/maps',{body:{map:invalid}})).status,400);
assert.equal((await send('/api/maps',{body:{map:{...basic,platforms:[{...basic.platforms[0],jumpPad:'yes'}]}}})).status,400,'server rejects invalid jump-pad field');
assert.equal((await send('/api/maps',{body:{map:basic,padding:'x'.repeat(9000)}})).status,413);
const created=await send('/api/maps',{body:{map:{...basic,name:'<b>Text-only title</b>'}}});assert.equal(created.status,201);
const saved=(await created.json()).map;assert.equal(saved.revision,1);
assert.equal(saved.platforms[0].jumpPad,true,'saved jump-pad setting is retained');
assert.equal((await (await send('/api/maps')).json()).maps.length,1);
DB.close();DB=openDatabase(filename,migrations);
assert.equal((await (await send('/api/maps')).json()).maps[0].id,saved.id,'map persists after restart');
assert.equal((await (await send('/api/maps')).json()).maps[0].platforms[0].jumpPad,true,'jump pads persist after restart');
const updated=await send('/api/maps/'+saved.id,{body:{map:{...basic,name:'Edited map'},revision:1}});assert.equal(updated.status,200);assert.equal((await updated.json()).map.revision,2);
assert.equal((await send('/api/maps/'+saved.id,{body:{map:basic,revision:1}})).status,409,'stale edit rejected');
assert.equal((await send('/api/maps/'+saved.id,{body:{action:'delete',revision:1}})).status,409,'stale delete rejected');
assert.equal((await send('/api/maps/'+saved.id,{body:{action:'delete',revision:2}})).status,200);
assert.equal((await (await send('/api/maps')).json()).maps.length,0);
const portalMap=Maps.presets.find(m=>m.id==='portal-junction');
const portalResponse=await send('/api/maps',{body:{map:portalMap}});assert.equal(portalResponse.status,201);
const portalSaved=(await portalResponse.json()).map;
DB.close();DB=openDatabase(filename,migrations);
const portalReload=(await (await send('/api/maps')).json()).maps[0];
assert.equal(portalReload.platforms.filter(p=>p.portal).length,2,'portal pair persists after database restart');
const brokenPortal=clone(portalMap);brokenPortal.platforms[1].portal=false;
assert.equal((await send('/api/maps',{body:{map:brokenPortal}})).status,400,'API rejects an unpaired portal');
assert.equal((await send('/api/maps/'+portalSaved.id,{body:{action:'delete',revision:1}})).status,200);
const concurrent=await Promise.all(Array.from({length:55},(_,i)=>send('/api/maps',{body:{map:{...basic,name:'Map '+i}}})));
assert.equal(concurrent.filter(r=>r.status===201).length,50);assert.equal(concurrent.filter(r=>r.status===409).length,5);
assert.equal((await (await send('/api/maps')).json()).maps.length,50,'atomic library bound');
const {default:bundle}=await import('./dist/server/index.js');
assert.equal((await bundle.fetch(new Request(origin+'/api/maps'),env())).status,200,'bundled endpoint');
const bundleText=await readFile(new URL('dist/server/index.js',import.meta.url),'utf8');assert.ok(bundleText.includes('Map workshop'));
assert.equal((await worker.fetch(new Request(origin+'/api/maps'),{DB:{prepare(){throw new Error('Simulated map storage failure');}}})).status,500,'storage failure produces a server error while retaining diagnostics');
DB.close();console.log('PASS: map API same-origin checks, bounded input, create/list/update/delete, stale-edit protection, persistence, atomic 50-map cap, failure handling and server bundle');
// Purpose: Real simulation and SQLite-backed custom map checks. Upstream: map definitions, engine, Worker and migrations. Environment: Node 24. Generated: 2026-09-18 America/New_York. New file, all lines.
// Updated: 2026-10-03 America/New_York. Lines 32,46,52,56 verify jump-pad API validation, save and restart persistence. Purpose: protect stored feature data; upstream: maps API and shared schema; environment: Node 24/SQLite.
// Updated: 2026-10-04 America/New_York. Lines 2,39,61 remove obsolete authentication fixtures; 63-64 exercise visible storage failure handling and describe current API checks. Purpose: map regression coverage; upstream: worker/maps-api and local SQLite; environment: Node 24 built-ins.
// Updated: 2026-10-09 America/New_York. Changed lines 2,12-35: check advanced presets for full independent travel clearance, safe separated starts and reachable routes using actual moving-platform snapshots. Purpose: validate complex maps beyond their initial pose; upstream: maps.js definitions and platformer.js simulation; environment: Node 24/SQLite.

// Updated: 2026-11-03 America/New_York. Changed lines 81-89. Purpose: paired Platformer portals and compatibility checks. Upstream: existing map definitions, platform simulation, editor, rendering and replay capture. Environment: browser / Node 24 / Workers. Changes: portal validation/preset, swept momentum-preserving traversal with cooldown, editor/render feedback, replay discontinuities or corresponding behavioral tests, as applicable.

// Updated: 2026-11-04 America/New_York. Changed lines 12-15, 39, 42, 47, 50, 62. Purpose: six additional editable Platformer stages. Changes: new motion/pad/portal layouts, full-cycle clearance/reachability and bot difficulty coverage, or editor round-trip checks as applicable. Upstream: existing maps.js presets, Platformer simulation and map editor. Environment: browser / Node 24 / Workers.

{
  const g=new Platformer.PlatformerEngine();g.setMap(Maps.presets.find(m=>m.id==='moving-grounds'));
  const before=JSON.stringify(g.mapDefinition),snapshot=g.snapshot();snapshot.platforms.find(p=>p.motion).motion.distance=9999;
  assert.equal(JSON.stringify(g.mapDefinition),before,'snapshot motion must not mutate validated map geometry');
  assert.notEqual(g.platforms.find(p=>p.motion).motion.distance,9999,'snapshot motion must not mutate live motion');
}
// Updated: 2026-11-05 America/New_York. Added nested motion snapshot mutation regression. Purpose: retain independent validated map state; upstream: platformer snapshots; environment: Node 24/SQLite.
