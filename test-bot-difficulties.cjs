// test-bot-difficulties.cjs
// Request: Verify per-slot bot difficulty, distinct decisions, lifecycle and replay safety in both modes.
const assert=require('node:assert/strict');
const {ArenaEngine}=require('./game/engine.js');
const {PlatformerEngine}=require('./game/platformer.js');
const {Recorder,Player}=require('./game/replay.js');
const levels=['easy','normal','hard'],modes=Array(4).fill('bot');
for(const Engine of [ArenaEngine,PlatformerEngine]){
  const g=new Engine(()=>.5);
  assert.deepEqual(g.botDifficulties,Array(4).fill('normal'));
  const choice=['easy','hard','normal','easy'];g.configure(modes,3,30,'match',choice);choice[0]='hard';
  assert.equal(g.botDifficulties[0],'easy','configuration owns the caller array');
  for(const invalid of [Array(4),[null,'normal','normal','normal'],[],['easy'],['easy','normal','hard','extreme'],null,['easy','normal','hard','toString']]){
    const before=JSON.stringify(g.snapshot());assert.throws(()=>g.configure(Array(4).fill('keyboard'),5,10,'round',invalid),/Easy, Normal or Hard/);assert.equal(JSON.stringify(g.snapshot()),before,'invalid configuration is atomic');
  }
  const snapshot=g.snapshot();snapshot.botDifficulties[0]='hard';assert.equal(g.botDifficulties[0],'easy');
  g.start();assert.throws(()=>g.configure(modes,3,18,'round',Array(4).fill('hard')),/lobby/);
  g.makeRound();assert.equal(g.botDifficulties[1],'hard');g.lobby();assert.equal(g.botDifficulties[0],'easy');
  g.configure(modes,3);assert.equal(g.botDifficulties[0],'easy','legacy configure calls retain chosen levels');
  const decisions=levels.map(level=>{
    const game=new Engine(()=>.5);game.configure(modes,1,18,'round',Array(4).fill(level));
    const [p,q]=game.players;game.players.slice(2).forEach(r=>r.alive=false);
    Object.assign(p,{x:500,y:Engine===ArenaEngine?354:519,aiTime:0,aiJumpDelay:0,vx:0,vy:0});
    Object.assign(q,{x:700,y:p.y,vx:-2000,vy:0});
    const input=game.bot(p,0);return {input,time:p.aiTime};
  });
  assert(decisions[0].time>decisions[1].time&&decisions[1].time>decisions[2].time,'reaction interval decreases with difficulty');
  assert(decisions[0].input.x>0&&decisions[1].input.x>0&&decisions[2].input.x<0,'Hard anticipates a fast rival crossing; easier levels pursue current position');
  assert(Math.abs(decisions[0].input.x)<Math.abs(decisions[1].input.x),'Easy uses gentler movement');
  const rec=new Recorder({fps:30});g.start();g.phase='playing';rec.begin(g,Engine===ArenaEngine?'arena':'platformer');g.step(1/30);rec.tick(1/30,g);rec.finish();
  const playback=new Player(rec.latest),frame=playback.frame();assert.deepEqual(frame.botDifficulties,['easy','hard','normal','easy']);frame.botDifficulties[0]='hard';
  g.lobby();g.configure(modes,3,18,'round',Array(4).fill('hard'));assert.equal(playback.frame().botDifficulties[0],'easy','recorded settings are isolated from later lobby changes');
  const attacks=levels.map(level=>{const game=new Engine(()=>.5);game.configure(modes,1,18,'round',Array(4).fill(level));const [p,q]=game.players;game.players.slice(2).forEach(r=>r.alive=false);Object.assign(p,{x:500,y:Engine===ArenaEngine?354:519,aiTime:0,aiJumpDelay:0});Object.assign(q,{x:600,y:p.y,vx:0,vy:0});return game.bot(p,0).dash;});
  assert.deepEqual(attacks,[false,true,true],'Easy passes up an attack that Normal and Hard take');
  const humanStates=levels.map(level=>{const game=new Engine(()=>.5);game.configure(Array(4).fill('keyboard'),1,18,'round',Array(4).fill(level));game.start();game.phase='playing';for(let i=0;i<30;i++)game.step(1/120,[{x:1,dash:i===0,jump:i===0}]);return game.snapshot().players;});
  assert.deepEqual(humanStates[0],humanStates[1]);assert.deepEqual(humanStates[1],humanStates[2],'difficulty never changes human physics');
  console.log('PASS:',Engine.name,'difficulty validation/isolation, reaction timing, predictive decisions, lifecycle and replay settings');
}
for(const level of levels){
  const game=new PlatformerEngine(()=>.5);game.configure(modes,1,18,'round',Array(4).fill(level));
  const [p,q]=game.players;game.players.slice(2).forEach(r=>r.alive=false);
  Object.assign(p,{x:500,y:game.platforms[0].y-80,vy:100,jumps:1,grounded:false,support:null,aiTime:0,aiJumpDelay:0});Object.assign(q,{x:650,y:game.platforms[0].y-21});
  assert.equal(game.bot(p,0).jump,level==='hard','Hard begins recovery earlier while preserving air-jump limits');
}
for(const Engine of [ArenaEngine,PlatformerEngine])for(const level of [...levels,'mixed']){
  for(let seed=1;seed<=5;seed++){
    let state=seed;const g=new Engine(()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;});
    g.configure(modes,3,18,'round',level==='mixed'?['easy','normal','hard','normal']:Array(4).fill(level));g.start();
    for(let t=0;t<600&&g.phase!=='matchOver';t+=1/120){g.step(1/120);assert(g.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
    assert.equal(g.phase,'matchOver',Engine.name+' '+level+' seed '+seed);
  }
}
console.log('PASS: earlier Hard recovery and 40 seeded first-to-three matches across Easy/Normal/Hard/mixed in both modes');
// Purpose: Behavioral bot difficulty coverage. Upstream: engine.js, platformer.js and replay.js. Environment: Node 24 built-ins. Generated: 2026-11-04 America/New_York. New file: all lines.
