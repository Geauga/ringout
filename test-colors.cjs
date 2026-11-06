// test-colors.cjs
// Request: Verify independent validated fighter colors, name selector safety checks, and knock counters in both game modes.
const assert=require('node:assert/strict');
const {ArenaEngine,SKINS,PRESET_NAMES}=require('./game/engine.js');
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

  // Verify fighter name selector, normalization, and safety checks
  const names=['NOVA','BLAZE_1','TITAN-X','APEX 2'];
  [' nova ','blaze_1','Titan-X','  Apex   2 '].forEach((value,id)=>game.setName(id,value));
  assert.deepEqual(game.players.map(p=>p.name),names);
  assert.deepEqual(game.snapshot().customNames,names);
  const beforeName=JSON.stringify(game.snapshot());
  for(const badLen of ['',null,42,'A','   ','ABCDEFGHIJKLM']){
    assert.throws(()=>game.setName(0,badLen),/2 and 12/);assert.equal(JSON.stringify(game.snapshot()),beforeName);
  }
  for(const badChars of ['<script>','1234','-NOVA','NOVA-','A@B','DROP;','🔥NOVA']){
    assert.throws(()=>game.setName(0,badChars),/letters, numbers/);assert.equal(JSON.stringify(game.snapshot()),beforeName);
  }
  for(const unsafe of ['fuck','F_U_C_K','sh1t','b1tch','fuuuuck','admin','nazi','f4gg0t']){
    assert.throws(()=>game.setName(0,unsafe),/family-friendly/);assert.equal(JSON.stringify(game.snapshot()),beforeName);
  }
  assert.throws(()=>game.setName(0,'blaze_1'),/unique/);assert.equal(JSON.stringify(game.snapshot()),beforeName);
  game.resetName(1);assert.equal(game.players[1].name,SKINS[6].name);assert.equal(game.customNames[1],null);
  assert.throws(()=>game.setName(0,SKINS[6].name),/unique/);
  game.setName(1,PRESET_NAMES[0]);assert.equal(game.players[1].name,PRESET_NAMES[0]);

  game.start();assert.deepEqual(game.players.map(p=>p.color),colors);
  assert.equal(game.players[0].name,'NOVA');assert.deepEqual(game.knocks,[0,0,0,0]);
  for(const phase of ['countdown','playing','paused','roundOver','matchOver']){
    game.phase=phase;const state=JSON.stringify(game.snapshot());
    assert.throws(()=>game.setColor(0,'#654321'),/lobby/);assert.equal(JSON.stringify(game.snapshot()),state);
    assert.throws(()=>game.setName(0,'STORM'),/lobby/);assert.equal(JSON.stringify(game.snapshot()),state);
  }
  // Verify knock counter increments on dash and bump hits
  game.phase='playing';
  const [a,b]=game.players,y=game.platforms?.[0].y-21||354;
  Object.assign(a,{x:480,y,vx:900,vy:0,dashTime:.1});Object.assign(b,{x:510,y,vx:0,vy:0,dashTime:0});
  game.collide(a,b);assert.equal(game.knocks[0],1);assert.equal(game.knocks[1],0);
  game.hitPairs.clear();a.hit.clear();
  Object.assign(a,{x:480,y,vx:900,vy:0,dashTime:0});Object.assign(b,{x:510,y,vx:0,vy:0,dashTime:0});
  game.collide(a,b);assert.equal(game.knocks[0],2);assert.equal(game.knocks[1],0);

  game.makeRound();assert.deepEqual(game.players.map(p=>p.color),colors);assert.equal(game.players[0].name,'NOVA');
  game.lobby();assert.deepEqual(game.players.map(p=>p.color),colors);assert.deepEqual(game.knocks,[0,0,0,0]);
  console.log('PASS:',Engine.name,'custom hex, safe fighter names, knock counters, isolated snapshots and lifecycle locks');
}
// Purpose: Protect actual fighter colors, validated names, knock counters, and stable lobby/match state.
// Upstream: engine.js owns skins/custom colors/names/knocks; platformer.js inherits their round lifecycle.
// Environment: Node 24 built-in assertions. Generated: 2026-10-11 America/New_York. Updated: 2026-11-03 America/New_York.

for(const Engine of [ArenaEngine,PlatformerEngine]){
  let g=new Engine();g.setName(1,'NOVA');g.setName(0,'BLUE');g.setColor(1,'#123456');
  let before=JSON.stringify(g.snapshot());assert.throws(()=>g.resetName(1),/unique/);assert.equal(JSON.stringify(g.snapshot()),before);
  g=new Engine();g.setName(0,'PEACH');g.setColor(1,'#123456');before=JSON.stringify(g.snapshot());
  assert.throws(()=>g.setSkin(1,9),/unique/);assert.equal(JSON.stringify(g.snapshot()),before);
  g.setName(0,'NOVA');g.setSkin(1,9);assert.equal(g.players[1].name,'PEACH');
  console.log('PASS:',Engine.name,'skin/reset collisions with chosen names reject atomically and recover');
}
// Updated: 2026-11-05 America/New_York. Added final reset/skin collision regressions. Purpose: preserve chosen-name uniqueness and rejected-state atomicity; upstream: engine name/skin setters; environment: Node 24.
