// test-colors.cjs
// Request: Verify independent validated fighter colors and their lifecycle in both game modes.
const assert=require('node:assert/strict');
const {ArenaEngine,SKINS}=require('./game/engine.js');
const {PlatformerEngine}=require('./game/platformer.js');
for(const Engine of [ArenaEngine,PlatformerEngine]){
  const game=new Engine(),colors=['#12ab34','#abcdef','#000000','#ffffff'];
  ['#12aB34','ABCDEF','#000000',' ffffff '].forEach((value,id)=>game.setColor(id,value));
  assert.deepEqual(game.players.map(p=>p.color),colors);
  const before=JSON.stringify(game.snapshot());
  for(const value of ['',null,42,'#123','#12345678','#gg1122','rgb(1,2,3)','red','<script>']){
    assert.throws(()=>game.setColor(0,value),/six hex/);assert.equal(JSON.stringify(game.snapshot()),before);
  }
  for(const id of [-1,4,1.5,NaN,'0']){assert.throws(()=>game.setColor(id,'#123456'),/player/);assert.equal(JSON.stringify(game.snapshot()),before);}
  game.setSkin(1,6);assert.equal(game.players[1].color,SKINS[6].color);assert.equal(game.customColors[1],null);
  assert.equal(game.players[0].color,colors[0]);game.setColor(1,colors[1]);
  const snapshot=game.snapshot();snapshot.customColors[0]='#888888';snapshot.players[0].color='#999999';
  assert.equal(game.players[0].color,colors[0]);assert.equal(game.customColors[0],colors[0]);
  game.start();assert.deepEqual(game.players.map(p=>p.color),colors);
  for(const phase of ['countdown','playing','paused','roundOver','matchOver']){
    game.phase=phase;const state=JSON.stringify(game.snapshot());
    assert.throws(()=>game.setColor(0,'#654321'),/lobby/);assert.equal(JSON.stringify(game.snapshot()),state);
  }
  game.makeRound();assert.deepEqual(game.players.map(p=>p.color),colors);
  game.lobby();assert.deepEqual(game.players.map(p=>p.color),colors);
  console.log('PASS:',Engine.name,'custom hex normalization, atomic rejection, per-player preset reset, isolated snapshots and lifecycle locks');
}
// Purpose: Protect actual fighter colors and stable lobby/match state.
// Upstream: engine.js owns skins/custom colors; platformer.js inherits their round lifecycle.
// Environment: Node 24 built-in assertions. Generated: 2026-10-11 America/New_York. New file: all lines.
