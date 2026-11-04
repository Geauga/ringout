// test-stats.cjs
// Request: Verify damage scores, assist credit and match/replay stat lifecycles in both modes.
const assert=require('node:assert/strict');
const {ArenaEngine}=require('./game/engine.js');
const {PlatformerEngine}=require('./game/platformer.js');
const {Recorder,Player}=require('./game/replay.js');
function park(g){g.players.forEach((p,i)=>Object.assign(p,{x:[300,430,570,700][i],y:g.platforms?519:354,vx:0,vy:0,dashTime:0}));}
function fresh(Engine){const g=new Engine();g.configure(Array(4).fill('keyboard'),3,999);g.start();g.phase='playing';park(g);return g;}
function hit(g,attacker,victim,dash=true){
  const a=g.players[attacker],b=g.players[victim],y=g.platforms?519:354;
  g.hitPairs.clear();a.hit.clear();b.hit.clear();
  Object.assign(a,{x:480,y,vx:900,vy:0,dashTime:dash?.1:0});Object.assign(b,{x:510,y,vx:0,vy:0,dashTime:0});
  g.collide(a,b);park(g);
}
function fall(g,id){g.players[id].x=2000;g.step(1/120);return g.drainEvents().find(e=>e.type==='eliminated'&&e.id===id);}
for(const Engine of [ArenaEngine,PlatformerEngine]){
  let g=fresh(Engine);hit(g,0,3);assert.deepEqual(g.damageDealt,[22,0,0,0]);
  hit(g,0,3,false);assert.deepEqual(g.damageDealt,[26,0,0,4],'bumps score actual damage in both directions');
  g.players[3].damage=245;hit(g,0,3);assert.equal(g.damageDealt[0],31,'only five damage fits below the cap');
  hit(g,0,3);assert.equal(g.damageDealt[0],31,'capped hits do not inflate damage scores');
  const immune=g.players[1];immune.alive=false;hit(g,0,1);assert.equal(g.damageDealt[0],31,'dead players cannot add damage');
  console.log('PASS:',Engine.name,'dash/bump damage, cap accounting and eliminated-target exclusion');

  g=fresh(Engine);g.elapsed=1;hit(g,0,3);g.elapsed=2;hit(g,0,3);g.elapsed=3;hit(g,1,3);g.elapsed=4;hit(g,2,3);
  const event=fall(g,3);assert.equal(event.lastHitBy,2);assert.deepEqual(event.assistIds,[0,1]);
  assert.deepEqual(g.knockouts,[0,0,1,0]);assert.deepEqual(g.assists,[1,1,0,0]);assert.deepEqual(g.damageDealt,[44,22,22,0]);
  g.step(1/120);g.eliminatePlayer(g.players[3]);assert.deepEqual(g.assists,[1,1,0,0],'no duplicate elimination credit');
  const saved=g.snapshot();saved.assists[0]=90;saved.damageDealt[0]=90;assert.equal(g.assists[0],1);assert.equal(g.damageDealt[0],44);
  const totals={assists:[...g.assists],damage:[...g.damageDealt],kos:[...g.knockouts]};
  g.makeRound();g.phase='playing';park(g);assert.deepEqual(g.assists,totals.assists);assert.deepEqual(g.damageDealt,totals.damage);
  assert(g.players.every(p=>p.damage===0&&p.hitContributors.size===0&&p.lastHitBy===undefined));
  fall(g,3);assert.deepEqual(g.knockouts,totals.kos);assert.deepEqual(g.assists,totals.assists,'previous-round hits cannot assist');
  g.lobby();assert.deepEqual(g.assists,[0,0,0,0]);assert.deepEqual(g.damageDealt,[0,0,0,0]);
  g.damageDealt[0]=99;g.assists[1]=99;g.start();assert.deepEqual(g.assists,[0,0,0,0]);assert.deepEqual(g.damageDealt,[0,0,0,0]);
  console.log('PASS:',Engine.name,'multiple/unique assists, killer exclusion, round persistence, history clearing and new-match resets');

  g=fresh(Engine);g.elapsed=0;hit(g,0,3);g.elapsed=6;hit(g,1,3);assert.deepEqual(fall(g,3).assistIds,[],'six-second assist cutoff is exclusive');
  g=fresh(Engine);g.elapsed=0;hit(g,0,3);g.elapsed=5;hit(g,0,3);g.elapsed=6;hit(g,1,3);assert.deepEqual(fall(g,3).assistIds,[0],'new hit refreshes contribution');
  g=fresh(Engine);g.elapsed=0;hit(g,0,3);g.elapsed=6;const expired=fall(g,3);assert.equal(expired.lastHitBy,undefined);assert.deepEqual(expired.assistIds,[]);
  assert.deepEqual(g.assists,[0,0,0,0]);assert.deepEqual(g.knockouts,[0,0,0,0]);
  g=fresh(Engine);assert.deepEqual(fall(g,3).assistIds,[],'unassisted environmental falls award no assists');
  g=fresh(Engine);hit(g,0,3);g.pause();for(let i=0;i<1200;i++)g.step(1/120);assert.equal(g.elapsed,0);g.resume();hit(g,1,3);assert.deepEqual(fall(g,3).assistIds,[0],'pause time does not consume credit');
  console.log('PASS:',Engine.name,'expiry boundary, refreshed contributions, environmental falls and pause exclusion');

  g=fresh(Engine);const recorder=new Recorder(),mode=Engine===ArenaEngine?'arena':'platformer';recorder.begin(g,mode);
  hit(g,0,3);hit(g,1,3);fall(g,3);recorder.tick(.05,g);recorder.finish();
  const player=new Player(recorder.latest);player.seek(recorder.latest.duration);
  let frame=player.frame();assert.deepEqual(frame.damageDealt,[22,22,0,0]);assert.deepEqual(frame.assists,[1,0,0,0]);
  frame.damageDealt[0]=500;frame.assists[0]=500;assert.equal(g.damageDealt[0],22);assert.equal(player.frame().assists[0],1);
  g.lobby();g.damageDealt[0]=88;frame=player.frame();assert.equal(frame.damageDealt[0],22);assert.equal(frame.assists[0],1);
  player.seek(0);assert.deepEqual(player.frame().damageDealt,[0,0,0,0]);assert.deepEqual(player.frame().assists,[0,0,0,0]);
  console.log('PASS:',Engine.name,'isolated replay totals, seek history and later-match independence');
}
// Purpose: Protect actual damage/assist attribution and lifetime behavior, including replay isolation.
// Upstream: engine.js shared collisions/eliminations, platformer.js mode physics and replay.js captures.
// Environment: Node 24 built-in assertions. Generated: 2026-11-03 America/New_York. New file: all lines.
