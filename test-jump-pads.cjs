// test-jump-pads.cjs
// Request: Verify automatic jump pads, moving ledges, air jumps and match completion.
const assert=require('node:assert/strict');
const Maps=require('./game/maps.js');
const {PlatformerEngine}=require('./game/platformer.js');
const advance=(g,seconds,inputs=[])=>{for(let i=0;i<Math.round(seconds*120);i++)g.step(1/120,inputs);};
function fresh(motion=null,dropThrough=false){
  const g=new PlatformerEngine();g.setMap({name:'Pad tests',platforms:[{id:'floor',x:100,y:600,w:800},{id:'pad',x:300,y:420,w:240,jumpPad:true,motion,dropThrough}]});
  g.configure(['keyboard','keyboard','keyboard','keyboard'],3);g.start();advance(g,3.025);g.drainEvents();return g;
}
function place(g,x){const p=g.players[0],s=g.platforms[1];Object.assign(p,{x:x??s.x+s.w/2,y:s.y-p.r,vx:0,vy:0,grounded:true,support:s.id,jumps:2});return p;}
assert(Maps.validate(Maps.presets[0]).platforms.every(s=>s.jumpPad===false),'legacy stages default to ordinary surfaces');
for(const bad of ['true',1,null])assert.throws(()=>Maps.validate({name:'Invalid',platforms:[{id:'floor',x:100,y:600,w:800,jumpPad:bad}]}),/Jump pad/);
for(const dt of [1/120,1/60,1/30]){
  const g=fresh(),p=place(g);g.step(dt);
  assert.equal(p.vy,-760);assert.equal(p.grounded,false);assert.equal(p.support,null);assert.equal(p.jumps,0);
  assert.equal(g.drainEvents().filter(e=>e.type==='jumpPad').length,1,'both landing passes produce one launch');
  advance(g,.1);assert.equal(g.drainEvents().filter(e=>e.type==='jumpPad').length,0,'pad does not retrigger in the air');
  g.step(dt,[{jump:true}]);assert.equal(p.jumps,1);g.step(dt);g.step(dt,[{jump:true}]);assert.equal(p.jumps,2);
  g.step(dt);g.step(dt,[{jump:true}]);assert.equal(p.jumps,2,'no third air jump');
  place(g);p.y-=2;p.vy=400;g.step(dt);assert.equal(p.vy,-760);assert.equal(p.jumps,0,'landing again refills air jumps');
}
console.log('PASS: automatic pad launch, single event, two restored air jumps and repeat landing at 30/60/120 Hz');
for(let id=0;id<4;id++){const g=fresh(),p=g.players[id],s=g.platforms[1];Object.assign(p,{x:s.x+s.w/2,y:s.y-p.r,vx:0,vy:0,grounded:true,support:s.id,jumps:2});g.step(1/120);assert.equal(p.vy,-760,`player ${id+1} launches`);assert.equal(p.jumps,0);}
let g=fresh(),p=place(g,315);g.step(1/120);assert.equal(p.grounded,true,'ordinary surface beside the pad remains solid');
g=fresh();p=place(g);p.y+=4;p.vy=-300;p.grounded=false;p.support=null;g.step(1/120);assert(p.vy<0);assert.equal(g.drainEvents().filter(e=>e.type==='jumpPad').length,0,'upward passage does not trigger');
g=fresh(null,true);p=place(g);g.step(1/120,[{drop:true}]);assert(p.vy>0);assert.equal(g.drainEvents().filter(e=>e.type==='jumpPad').length,0,'Down on a drop-through pad still drops');
for(const axis of ['x','y']){g=fresh({axis,distance:80,period:4});advance(g,.5);p=place(g);g.pause();const snapshot=JSON.stringify(g.snapshot());advance(g,.2);assert.equal(JSON.stringify(g.snapshot()),snapshot);g.resume();g.step(1/120);assert.equal(p.vy,-760,'moving pads launch at their current position');g.lobby();assert.equal(g.platforms[1].jumpPad,true);assert.equal(g.platforms[1].x,300);}
g=fresh();g.elapsed=76;g.step(1/120);const pad=Maps.padBounds(g.platforms[1]);assert(pad.w<=g.platforms[1].w);assert(pad.x>=g.platforms[1].x);
console.log('PASS: pad boundaries, one-way passage, deliberate drop-through, moving pads, pause, reset and erosion');
let totalLaunches=0;
for(let seed=1;seed<=20;seed++){
  let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  g=new PlatformerEngine(random);g.setMap(Maps.presets.find(m=>m.id==='spring-yard'));g.configure(['bot','bot','bot','bot'],3);g.start();
  let launches=0;for(let t=0;t<600&&g.phase!=='matchOver';t+=1/120){g.step(1/120);launches+=g.drainEvents().filter(e=>e.type==='jumpPad').length;assert(g.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
  assert.equal(g.phase,'matchOver',`Spring Yard seed ${seed} completes`);totalLaunches+=launches;
}
assert(totalLaunches>0,'bot match coverage includes actual jump-pad use');
console.log('PASS: 20 seeded Spring Yard first-to-three bot matches completed; jump-pad launches observed');
// Purpose: Protect jump-pad behavior and compatibility. Upstream: maps.js geometry and platformer.js simulation. Environment: Node built-ins. Generated: 2026-10-03 America/New_York. New file: all lines.
