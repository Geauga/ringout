// test-replay.cjs
// Request: Verify recorded house rules and knockout-counter isolation alongside bounded match playback.
const assert=require('node:assert/strict');
const {Recorder,Player}=require('./game/replay.js');
const {ArenaEngine}=require('./game/engine.js');
const {PlatformerEngine}=require('./game/platformer.js');
const Maps=require('./game/maps.js');
for(const Engine of [ArenaEngine,PlatformerEngine]){
  const engine=new Engine(()=>.5),mode=Engine===ArenaEngine?'arena':'platformer';if(mode==='platformer')engine.setMap(Maps.presets[4]);
  engine.configure(['keyboard','keyboard','keyboard','keyboard'],1,30,'match');engine.start();const rec=new Recorder();rec.begin(engine,mode);
  const step=n=>{for(let i=0;i<n;i++){engine.step(1/120);rec.tick(1/120,engine);}};step(400);
  const before=rec.time;engine.pause();step(1200);assert.equal(rec.time,before,'paused time is excluded');engine.resume();step(12);
  const savedX=rec.frames[0].state.players[0].x;engine.players[0].x+=20;assert.equal(rec.frames[0].state.players[0].x,savedX,'capture owns player values');
  engine.knockouts[0]=2;engine.players.slice(1).forEach(p=>p.alive=false);step(400);assert.equal(engine.phase,'matchOver');assert.equal(rec.recording,false);assert.equal(rec.latest.completed,true);
  const replay=rec.latest,player=new Player(replay),live=JSON.stringify(engine.snapshot());assert.equal(player.frame().gameMode,mode);
  player.seek(-10);assert.equal(player.time,0);player.setSpeed(.5);player.advance(1);assert.equal(player.time,.5);
  player.playing=false;player.advance(3);assert.equal(player.time,.5);player.seek(10000);assert.equal(player.time,replay.duration);assert.equal(player.playing,false);assert.deepEqual(player.frame().scores,engine.scores);
  const frame=player.frame();assert.equal(frame.shrinkTime,30);assert.equal(frame.lastStanding,'match');assert.deepEqual(frame.knockouts,[2,0,0,0]);
  frame.players[0].x=999;frame.scores[0]=99;frame.knockouts[0]=99;assert.equal(JSON.stringify(engine.snapshot()),live);assert.notEqual(player.frame().scores[0],99);assert.equal(player.frame().knockouts[0],2);
  if(mode==='platformer'){frame.platforms[0].x=0;frame.mapDefinition.platforms[0].jumpPad=false;assert.equal(player.frame().mapDefinition.platforms[0].jumpPad,true);assert.notEqual(player.frame().platforms[0].x,0);}
  rec.begin(engine,mode);assert.equal(rec.latest,replay,'starting a match keeps the previous replay until replacement');rec.finish();assert.equal(rec.latest,replay,'empty recording preserves previous replay');
  console.log(`PASS: ${mode} recording, pause exclusion, match end, playback speed/end and state isolation`);
}
const engine=new ArenaEngine(),rec=new Recorder({fps:30,maxSeconds:1});engine.start();engine.phase='playing';rec.begin(engine,'arena');
for(let i=0;i<240;i++){engine.elapsed=i/120;engine.players[0].x=i;engine.round=i<180?1:2;rec.tick(1/120,engine);}rec.finish();
assert.equal(rec.latest.trimmed,true);assert(rec.latest.frames.length<=31);assert(Math.abs(rec.latest.duration-1)<.01);assert.equal(rec.latest.frames[0].time,0);assert.deepEqual(rec.latest.rounds.map(r=>r.round),[1,2]);
const player=new Player(rec.latest),a=rec.latest.frames[0],b=rec.latest.frames[1];player.seek((a.time+b.time)/2);assert(Math.abs(player.frame().players[0].x-(a.state.players[0].x+b.state.players[0].x)/2)<1e-8,'positions interpolate smoothly');
assert.throws(()=>player.setSpeed(99),/speed/);assert.throws(()=>new Recorder({fps:NaN}),/limits/);assert.throws(()=>new Player(null),/No replay/);
console.log('PASS: recording capacity, trimmed timeline, round navigation and smooth interpolation');
// Purpose: Behavioral replay checks. Upstream: replay.js and both real simulations. Environment: Node 24. Generated: 2026-10-04 America/New_York. New file: all lines.

// Updated: 2026-10-07 America/New_York. Changed lines 2, 11-21: verify recorded rule values and independent knockout arrays during playback. Purpose: patch reviewed rules/attribution while preserving incoming features. Upstream: existing simulation, browser UI and replay/control tests at 3d937e8. Environment: browser / Node 24+.
