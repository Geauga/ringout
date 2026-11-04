// test-engine.cjs
// Request: Verify Arena bot/keyboard dash parity alongside existing gameplay regressions.
const assert = require('node:assert/strict');
const { ArenaEngine } = require('./game/engine.js');
const advance=(game,seconds,inputs=[])=>{for(let t=0;t<seconds;t+=1/120)game.step(1/120,inputs);};
const local=()=>{const g=new ArenaEngine();g.configure(['keyboard','keyboard','keyboard','keyboard'],3);g.start();advance(g,3.1);return g;};
let g=local();
const original=g.players.map(p=>({x:p.x,y:p.y}));
advance(g,.15,[{x:-1,y:0},{x:1,y:0},{x:0,y:1},{x:0,y:-1}]);
assert(g.players[0].x<original[0].x&&g.players[1].x>original[1].x&&g.players[2].y>original[2].y&&g.players[3].y<original[3].y);
g.pause();const paused=JSON.stringify(g.snapshot());advance(g,5);assert.equal(JSON.stringify(g.snapshot()),paused);g.resume();assert.equal(g.phase,'playing');
console.log('PASS: four independent controls and pause/resume');
g=local();g.players[0].x=700;g.players[0].y=354;g.players[0].fx=1;g.players[0].fy=0;g.players[1].x=745;g.players[1].y=354;
g.step(1/120,[{x:1,y:0,dash:true}]);advance(g,.25);
assert(g.players[1].damage>=22);assert.equal(g.players[1].alive,false);assert(g.players[0].cooldown>0);
console.log('PASS: dash hit applies damage and knocks opponent off the platform');
g=local();advance(g,18.2);assert(g.radius<267&&g.shrinking);assert.equal(g.drainEvents().filter(e=>e.type==='shrink').length,1);
g.players[0].x=2000;g.players[1].x=2000;g.players[2].x=2000;g.step(1/120);assert.equal(g.scores[3],1);assert.equal(g.phase,'roundOver');advance(g,3);assert.equal(g.round,2);assert(g.players.every(p=>p.alive&&p.damage===0));
console.log('PASS: shrinking arena, winner scoring, and next-round reset');
g=local();g.players.forEach(p=>p.x=2000);g.step(1/120);assert.deepEqual(g.scores,[0,0,0,0]);assert.equal(g.roundWinner,null);
console.log('PASS: simultaneous elimination is a draw without phantom score');
g=new ArenaEngine();assert.throws(()=>g.configure(['keyboard'],2));assert.throws(()=>g.configure(['gamepad0','gamepad0','bot','bot'],3));
console.log('PASS: invalid configuration and duplicate controllers rejected');
const directions=[[1,0],[1,1],[0,1],[-1,1],[-1,0],[-1,-1],[0,-1],[1,-1]];
function dashGame(mode){const game=new ArenaEngine();game.configure([mode,'keyboard','keyboard','keyboard'],3);game.start();game.phase='playing';Object.assign(game.players[0],{x:500,y:354});return game;}
const close=(a,b)=>assert(Math.abs(a-b)<1e-8,`${a} differs from ${b}`);
for(let degrees=-180;degrees<180;degrees+=3){
  const game=dashGame('bot'),p=game.players[0],angle=degrees*Math.PI/180;
  Object.assign(p,{aiTime:1,aiX:Math.cos(angle),aiY:Math.sin(angle),aiDash:true});game.step(1/120);
  const direction=directions.reduce((best,d)=>{const length=Math.hypot(...d),dot=(d[0]*Math.cos(angle)+d[1]*Math.sin(angle))/length;return dot>best.dot?{d,dot}:best;},{dot:-Infinity}).d;
  const human=dashGame('keyboard');human.step(1/120,[{x:direction[0],y:direction[1],dash:true}]);
  close(p.vx,human.players[0].vx);close(p.vy,human.players[0].vy);close(Math.hypot(p.vx,p.vy),900);
}
g=dashGame('bot');Object.assign(g.players[0],{aiTime:1,aiX:.6,aiY:.8,aiDash:false});const steering=g.bot(g.players[0],1/120);close(steering.x,.6);close(steering.y,.8);
g=dashGame('gamepad0');g.step(1/120,[{x:.6,y:.8,dash:true}]);close(g.players[0].vx,540);close(g.players[0].vy,720);
console.log('PASS: 120 bot aim angles match nearest keyboard dash velocities; ordinary steering and analog human aiming preserved');
const durations=[];
for(let seed=1;seed<=20;seed++){
  let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  const game=new ArenaEngine(random);game.configure(['bot','bot','bot','bot'],3);game.start();let seconds=0;
  while(game.phase!=='matchOver'&&seconds<1200){game.step(1/120);seconds+=1/120;game.drainEvents();assert(game.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)));}
  assert.equal(game.phase,'matchOver',`Seed ${seed} never completed`);assert.equal(Math.max(...game.scores),3);durations.push(Math.round(seconds));
}
console.log('PASS: 20 seeded bot matches reached a first-to-three winner; simulated durations:',durations.join(', '),'seconds');
console.log('All gameplay validation checks passed.');
// Purpose: Reproducible gameplay regression checks. Upstream: dist/engine.js, the knockout simulation. Environment: Node.js built-in assert; no packages. Generated: 2026-09-11 America/New_York. New file: all lines.

// Updated: 2026-09-15 America/New_York. Import lines now use game/ after separating authored source from protected build output.
// Updated: 2026-11-04 America/New_York. Changed line 2; added directional regression block before seeded matches. Purpose: compare actual bot/keyboard launch velocities across 120 angles and retain steering/analog behavior; upstream: ArenaEngine bot inputs and shared step; environment: Node built-in assertions.
