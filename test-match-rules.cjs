// test-match-rules.cjs
// Request: Regress configurable house rules and recent-attacker knockout credit in both modes.
const assert=require('node:assert/strict');
const {ArenaEngine}=require('./game/engine.js');
const {PlatformerEngine}=require('./game/platformer.js');
const controls=Array(4).fill('keyboard');
const advance=(game,seconds)=>{for(let t=0;t<seconds;t+=1/120)game.step(1/120);};
function fresh(Engine,shrinkTime=18,lastStanding='round',target=3){
  const game=new Engine();game.configure(controls,target,shrinkTime,lastStanding);game.start();advance(game,3.1);game.drainEvents();return game;
}
function hit(game,attacker=0,victim=1,dash=true){
  const a=game.players[attacker],b=game.players[victim],y=game.platforms?.[0].y-21||354;
  Object.assign(a,{x:480,y,vx:900,vy:0,dashTime:dash?.1:0});
  Object.assign(b,{x:510,y,vx:0,vy:0,dashTime:0});
  game.collide(a,b);return b;
}
function eliminate(game,player){player.x=2000;player.vx=0;game.step(1/120);return game.drainEvents().find(e=>e.type==='eliminated'&&e.id===player.id);}
for(const Engine of [ArenaEngine,PlatformerEngine]){
  for(const delay of [10,18,30]){
    const game=fresh(Engine,delay),width=game.platforms?.[0].w;
    game.elapsed=delay-1/60;game.step(1/120);assert.equal(game.shrinking,false,`${Engine.name} shrank before ${delay}s`);
    advance(game,.05);assert.equal(game.shrinking,true,`${Engine.name} ignored the ${delay}s rule`);
    assert.equal(game.drainEvents().filter(e=>e.type==='shrink').length,1);
    if(game.platforms)assert(game.platforms[0].w<width);else assert(game.radius<267);
    game.start();assert.equal(game.shrinkTime,delay);assert.equal(game.shrinking,false);
  }
  const never=fresh(Engine,999);never.elapsed=1100;never.step(1/120);
  assert.equal(never.shrinking,false,'Never must remain disabled beyond the numeric sentinel');
  if(never.platforms)assert.equal(never.platforms[0].w,never.mapDefinition.platforms[0].w);else assert.equal(never.radius,267);
  for(const rule of ['round','match'])for(const target of [1,3,5]){
    const game=fresh(Engine,30,rule,target);game.players.slice(1).forEach(p=>{p.x=2000;});game.step(1/120);
    assert.equal(game.scores[0],rule==='match'?target:1);advance(game,2.9);
    assert.equal(game.phase,rule==='match'||target===1?'matchOver':'countdown');
    if(game.phase==='countdown')assert.equal(game.round,2);
  }
  const draw=fresh(Engine,30,'match');draw.players.forEach(p=>{p.x=2000;});draw.step(1/120);
  assert.deepEqual(draw.scores,[0,0,0,0]);advance(draw,2.9);assert.equal(draw.round,2);
  const config=new Engine();config.configure(controls,5,30,'match');const before=JSON.stringify(config.snapshot());
  for(const delay of [NaN,Infinity,0,11,null]){assert.throws(()=>config.configure(controls,1,delay,'round'));assert.equal(JSON.stringify(config.snapshot()),before);}
  for(const rule of ['invalid',null]){assert.throws(()=>config.configure(controls,1,10,rule));assert.equal(JSON.stringify(config.snapshot()),before);}
  console.log(`PASS: ${Engine.name} selected shrink times, permanent Never, match/round wins, draws and atomic validation`);
  for(const dash of [true,false]){
    const game=fresh(Engine);game.elapsed=2;const victim=hit(game,0,1,dash);
    assert(victim.damage>0);const event=eliminate(game,victim);assert.equal(event.lastHitBy,0);assert.equal(game.knockouts[0],1);
    game.step(1/120);assert.equal(game.knockouts[0],1,'one elimination receives one credit');
    game.lobby();assert.deepEqual(game.knockouts,[0,0,0,0]);
  }
  const reverse=fresh(Engine);reverse.elapsed=2;const reverseVictim=hit(reverse,1,0);assert.equal(eliminate(reverse,reverseVictim).lastHitBy,1);
  const stale=fresh(Engine);stale.elapsed=2;const staleVictim=hit(stale);stale.elapsed=8;
  assert.equal(eliminate(stale,staleVictim).lastHitBy,undefined);assert.deepEqual(stale.knockouts,[0,0,0,0]);
  const unhit=fresh(Engine);assert.equal(eliminate(unhit,unhit.players[1]).lastHitBy,undefined);assert.deepEqual(unhit.knockouts,[0,0,0,0]);
  const latest=fresh(Engine);latest.elapsed=2;hit(latest,0,1);latest.elapsed=3;hit(latest,2,1);
  assert.equal(eliminate(latest,latest.players[1]).lastHitBy,2);assert.deepEqual(latest.knockouts,[0,0,1,0]);
  const trade=fresh(Engine);trade.elapsed=2;const tradeVictim=hit(trade);trade.players[0].hit.clear();tradeVictim.dashTime=.1;tradeVictim.hit.clear();
  trade.players[0].x=480;tradeVictim.x=510;trade.collide(trade.players[0],tradeVictim);
  assert.equal(trade.players[0].lastHitBy,1);assert.equal(tradeVictim.lastHitBy,0);
  trade.makeRound();assert(trade.players.every(p=>p.lastHitBy===undefined),'new rounds clear attacker history');
  console.log(`PASS: ${Engine.name} dash/bump attribution, both attack directions, expiry, latest hit, trades and counter resets`);
}
// Purpose: Verify user-selected rules and actual collision/elimination behavior, including timeout/reset boundaries.
// Upstream: game/engine.js and game/platformer.js implement shared rules, collision knockback and knockout events.
// Environment: Node 24+ built-in assertions. Generated: 2026-10-07 America/New_York. New file: all lines.
