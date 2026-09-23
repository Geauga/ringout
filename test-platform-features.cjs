// test-platform-features.cjs
// Request: Verify custom moving ledges, rider transport, selected-platform drop-through and map validation.
const assert=require('node:assert/strict');
const Maps=require('./game/maps.js');
const {PlatformerEngine}=require('./game/platformer.js');
const clone=value=>JSON.parse(JSON.stringify(value));
const advance=(g,seconds,inputs=[])=>{for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120,inputs);};
const stage=(motion=null,dropThrough=true)=>({name:'Feature checks',platforms:[
  {id:'floor',x:100,y:600,w:800},
  {id:'ledge',x:300,y:420,w:240,dropThrough,motion},
]});
function fresh(map=stage()){
  const g=new PlatformerEngine();g.setMap(map);g.configure(['keyboard','keyboard','keyboard','keyboard'],3);g.start();
  advance(g,3.025);
  for(let i=1;i<4;i++){g.players[i].x=[0,140,740,860][i];g.players[i].vx=0;}
  return g;
}
function stand(g,id='ledge'){
  const p=g.players[0],s=g.platforms.find(s=>s.id===id);
  Object.assign(p,{x:s.x+s.w/2,y:s.y-p.r,prevX:s.x+s.w/2,prevY:s.y-p.r,vx:0,vy:0,grounded:true,support:id,jumps:0});
  return p;
}
const close=(a,b,message)=>assert(Math.abs(a-b)<1e-6,`${message}: ${a} versus ${b}`);

const legacy=Maps.validate(Maps.presets[0]);
assert(legacy.platforms.every(p=>p.dropThrough===false&&p.motion===null));
for(const preset of Maps.presets)assert.doesNotThrow(()=>Maps.validate(preset));
const moving=stage({axis:'x',distance:120,period:4});
assert.deepEqual(Maps.validate(JSON.parse(JSON.stringify(moving))).platforms[1].motion,moving.platforms[1].motion);
for(const bad of [{axis:'z',distance:80,period:4},{axis:'x',distance:0,period:4},{axis:'x',distance:301,period:4},{axis:'x',distance:80,period:0},{axis:'x',distance:80,period:Infinity},{axis:'x',distance:80,period:13}])assert.throws(()=>Maps.validate(stage(bad)));
assert.throws(()=>Maps.validate(stage({axis:'y',distance:180,period:4})),/above the main floor/);
assert.throws(()=>Maps.validate(stage({axis:'x',distance:-300,period:4})),/movement path/);
const invalidFloor=stage();invalidFloor.platforms[0].dropThrough=true;assert.throws(()=>Maps.validate(invalidFloor),/main floor/);
invalidFloor.platforms[0].dropThrough=false;invalidFloor.platforms[0].motion={axis:'x',distance:20,period:4};assert.throws(()=>Maps.validate(invalidFloor),/main floor/);
assert.throws(()=>Maps.validate(stage(null,'yes')),/on or off/);
console.log('PASS: legacy defaults, motion serialization, full travel bounds and stationary floor validation');

for(const axis of ['x','y']){
  const g=fresh(stage({axis,distance:axis==='x'?120:80,period:4})),p=stand(g);
  const relativeX=p.x-g.platforms[1].x;
  for(let frame=0;frame<540;frame++){
    g.step(1/120);
    assert.equal(p.support,'ledge',`${axis} rider remains attached through both travel directions`);
    close(p.x-g.platforms[1].x,relativeX,'horizontal rider offset');
    close(p.y+p.r,g.platforms[1].y,'feet stay on the moving surface');
  }
  g.pause();const paused=JSON.stringify(g.snapshot());advance(g,1);assert.equal(JSON.stringify(g.snapshot()),paused);g.resume();
  g.step(1/120,[{jump:true}]);assert.equal(p.grounded,false);assert(p.vy<0,'jump leaves the moving platform');
  g.players.slice(1).forEach(q=>q.y=900);g.step(1/120);advance(g,3);
  assert.equal(g.phase,'countdown');assert.equal(g.platforms[1][axis],g.mapDefinition.platforms[1][axis]);
  assert(g.players.every(q=>q.dropPlatform===null));
}
console.log('PASS: horizontal/vertical riders, direction reversals, pause, jumping and round resets');

let g=fresh(),p=stand(g);
g.step(1/120,[{y:1}]);assert.equal(p.grounded,false);assert.equal(p.dropPlatform,'ledge');
advance(g,.55,[{y:1}]);assert.equal(p.support,'floor');assert(p.alive);
const solid=fresh(stage(null,false)),solidPlayer=stand(solid);advance(solid,.2,[{y:1}]);assert.equal(solidPlayer.support,'ledge');
advance(solid,.2,[{drop:true}]);assert.equal(solidPlayer.support,'ledge');
stand(solid,'floor');advance(solid,.2,[{y:1}]);assert.equal(solidPlayer.support,'floor');
console.log('PASS: Down drops through enabled ledges and preserves disabled ledges and main floor');

const stacked=stage();stacked.platforms.push({id:'lower',x:300,y:500,w:240,dropThrough:true});
g=fresh(stacked);p=stand(g);advance(g,.3,[{drop:true}]);assert.equal(p.support,'lower','holding Down does not skip the next ledge');
g.step(1/120,[{drop:false}]);g.step(1/120,[{drop:true}]);advance(g,.4);assert.equal(p.support,'floor');
g=fresh(stage({axis:'y',distance:80,period:4}));p=stand(g);advance(g,.6,[{drop:true}]);assert.equal(p.support,'floor','dropping works while the platform descends');
console.log('PASS: drop ignores only the chosen ledge, requires a new press, and works on moving platforms');

g=fresh(stage({axis:'x',distance:120,period:4}));p=stand(g);p.y-=90;p.grounded=false;p.support=null;p.vy=100;
advance(g,.45);assert.equal(p.support,'ledge','falling onto a moving platform attaches the rider');
const offset=p.x-g.platforms[1].x;advance(g,.3);close(p.x-g.platforms[1].x,offset,'new rider follows platform');
g.elapsed=20;g.step(1/120);assert(g.platforms[1].w<g.mapDefinition.platforms[1].w);assert(g.platforms[1].motion);
console.log('PASS: airborne landing, transport after landing, and erosion retain platform motion');

for(const dt of [1/120,1/60,1/30]){
  g=fresh(stage({axis:'y',distance:-180,period:2}));advance(g,.5);p=stand(g);
  p.y-=1;p.vy=-100;p.grounded=false;p.support=null;p.jumps=1;
  g.step(dt);
  assert.equal(p.support,'ledge','a rising lift catches a slower upward-moving fighter');
  close(p.y+p.r,g.platforms[1].y,'caught fighter rests on the rising surface');
  g.step(dt,[{jump:true}]);assert.equal(p.grounded,false,'a faster jump leaves the rising lift');
  assert(p.vy<0);
}
g=fresh();p=stand(g);p.y+=2;p.vy=-300;p.grounded=false;p.support=null;
g.step(1/120);assert.equal(p.grounded,false,'jumping upward through a stationary platform remains possible');
// Dash launch happens between the first and second landing passes in a frame.
p=stand(g,'floor');p.vy=-300;p.grounded=false;p.support=null;p.y+=1;
g.land(p,p.prevY);assert.equal(p.grounded,false,'landing resolution must not cancel upward knockback');
console.log('PASS: rising lift catches, faster jump separation, one-way passage and upward knockback');

const durations=[];
for(let seed=1;seed<=20;seed++){
  let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  const game=new PlatformerEngine(random);game.setMap(clone(Maps.presets.find(m=>m.id==='moving-grounds')));game.configure(['bot','bot','bot','bot'],3);game.start();
  let elapsed=0;
  while(game.phase!=='matchOver'&&elapsed<600){game.step(1/120);elapsed+=1/120;game.drainEvents();assert(game.players.every(q=>Number.isFinite(q.x)&&Number.isFinite(q.y)));}
  assert.equal(game.phase,'matchOver',`Moving Grounds seed ${seed} completes`);durations.push(Math.round(elapsed));
}
console.log('PASS: 20 seeded Moving Grounds bot matches completed:',durations.join(', '),'seconds');
console.log('All custom platform feature checks passed.');
// Purpose: Protect player-visible movement/drop behavior and map compatibility with deterministic simulation checks.
// Upstream: maps.js validates stages; platformer.js applies motion, landing, drop input and bots.
// Environment: Node built-ins. Generated: 2026-09-18 America/New_York. New file: all lines.
// Updated: 2026-09-23 America/New_York. Lines 75-90 cover rising-lift catches at 30/60/120 Hz, jump separation, one-way passage and upward knockback. Purpose: regress relative-motion landings; upstream: platformer.js simulation; environment: Node built-ins.
