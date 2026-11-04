// test-portals.cjs
// Request: Verify portal traversal, validation, moving endpoints, cooldown and replay jumps.
const assert=require('node:assert/strict');
const Maps=require('./game/maps.js');
const {PlatformerEngine}=require('./game/platformer.js');
const {Recorder,Player}=require('./game/replay.js');
const preset=Maps.presets.find(m=>m.id==='portal-junction');
const clone=x=>JSON.parse(JSON.stringify(x));
function fresh(){const g=new PlatformerEngine();g.setMap(preset);g.configure(['keyboard','keyboard','keyboard','keyboard'],1,999);g.start();g.phase='playing';return g;}
function place(g,id=0,index=1){const p=g.players[id],s=g.platforms[index],c=Maps.portalCenter(s);Object.assign(p,{x:c.x,y:c.y,prevX:c.x,prevY:c.y,vx:0,vy:-20,grounded:false,support:null,portalCooldown:0});return p;}
assert(Maps.validate(Maps.presets[0]).platforms.every(s=>s.portal===false));
for(const bad of [null,1,'yes']){const m=clone(preset);m.platforms[1].portal=bad;assert.throws(()=>Maps.validate(m),/Portal/);}
for(const count of [1,3]){const m=clone(preset);m.platforms.forEach((s,i)=>s.portal=i<count);assert.throws(()=>Maps.validate(m),/exactly two/);}
{const m=clone(preset);m.platforms[1].jumpPad=true;assert.throws(()=>Maps.validate(m),/portal or a jump pad/);}
for(const dt of [1/120,1/60,1/30])for(let id=0;id<4;id++){
  const g=fresh(),p=place(g,id);p.damage=72;p.jumps=1;p.lastHitBy=2;p.lastHitTime=0;
  g.step(dt);assert.equal(p.portalTrips,1);assert.equal(p.damage,72);assert.equal(p.jumps,1);assert.equal(p.lastHitBy,2);
  assert.equal(p.x,Maps.portalCenter(g.platforms[2]).x);assert(p.alive);
  assert.equal(g.drainEvents().filter(e=>e.type==='portal').length,1);
  g.step(dt);assert.equal(p.portalTrips,1,'exit does not immediately send fighter back');
  place(g,id,2);g.step(dt);assert.equal(p.portalTrips,2,'both directions work');
}
{
  const g=fresh(),p=place(g),s=g.platforms[1];
  p.x=s.x+s.w/2-70;p.prevX=p.x;p.vx=4200;p.dashTime=.1;p.grounded=false;p.support=null;
  p.vy=-40;g.step(1/30);assert.equal(p.portalTrips,1,'fast dash sweeps through gate');assert.equal(p.vx,4200);assert.equal(p.vy,-40);
  g.pause();const before=JSON.stringify(g.snapshot()),cooldown=p.portalCooldown;g.step(1/30);assert.equal(JSON.stringify(g.snapshot()),before);assert.equal(p.portalCooldown,cooldown);
  g.lobby();assert.equal(g.players[0].portalCooldown,0);assert.equal(g.players[0].portalTrips,0);
}
{
  const g=fresh();g.elapsed=2;g.step(1/120);const p=place(g,0,2);g.step(1/120);assert.equal(p.x,Maps.portalCenter(g.platforms[1]).x,'moving entry works');
  g.shrinkTime=18;g.elapsed=77;place(g);g.step(1/120);assert.equal(p.portalTrips,1,'collapsed gates do not teleport');
}
{
  const g=fresh(),p=place(g),rec=new Recorder({fps:30});rec.begin(g,'platformer');
  g.step(1/30);rec.tick(1/30,g);rec.finish();const replay=new Player(rec.latest);
  replay.seek(rec.latest.duration/2);assert.equal(replay.frame().players[0].x,rec.latest.frames[0].state.players[0].x,'no interpolation across teleport');
  replay.seek(rec.latest.duration);assert.equal(replay.frame().players[0].portalTrips,1);assert.equal(replay.frame().platforms.filter(s=>s.portal).length,2);
}
{
  const g=fresh(),p=place(g),s=g.platforms[1];Object.assign(p,{y:s.y-p.r,grounded:true,support:s.id,vy:0});
  g.step(1/120);assert.equal(p.portalTrips,1,'standing on the opening triggers travel');
  place(g);p.x=s.x;g.step(1/120);assert.equal(p.portalTrips,1,'ordinary platform area does not trigger travel');
}
console.log('PASS: portal validation, four players at 30/60/120 Hz, bidirectional travel, momentum, swept dashes, cooldown, moving/eroded endpoints, pause/reset and replay discontinuities');
// Purpose: Protect paired portal behavior. Upstream: maps.js, platformer.js, replay.js and existing jump-pad tests. Environment: Node 24+. Generated: 2026-11-03 America/New_York. New file: all lines.
