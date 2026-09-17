// test-platformer.cjs
// Request: Validate double jumping, landing, platform pass-through, side knockouts, shrinking, round reset, and bot matches.
const assert=require('node:assert/strict');
const {PlatformerEngine}=require('./game/platformer.js');
const step=(g,seconds,inputs=[])=>{for(let t=0;t<seconds;t+=1/120)g.step(1/120,inputs);};
const fresh=()=>{const g=new PlatformerEngine();g.configure(['keyboard','keyboard','keyboard','keyboard'],3);g.start();step(g,3.05);return g;};
let g=fresh(),p=g.players[0];
assert(g.players.every(p=>p.grounded&&p.y===519));
step(g,.2,[{jump:true}]);assert.equal(p.jumps,1);assert(p.y<519&&p.vy<0);
step(g,.03);step(g,.01,[{jump:true}]);assert.equal(p.jumps,2);assert(p.vy<-500);
step(g,.02);const before=p.vy;step(g,.01,[{jump:true}]);assert.equal(p.jumps,2);assert(p.vy>before);
step(g,1.7);assert(p.grounded);assert.equal(p.jumps,0);
console.log('PASS: two distinct jumps, no third jump, landing restores jumps');
g=fresh();p=g.players[0];p.x=500;p.y=100;p.vx=0;p.vy=0;p.grounded=false;p.support=null;
step(g,.6);assert.equal(p.support,'top');assert.equal(p.y,239);
p.y=350;p.prevY=350;p.vy=-700;p.grounded=false;p.support=null;
step(g,.23);assert(p.y<239&&p.vy<0);step(g,1);assert.equal(p.support,'top');
console.log('PASS: gravity lands on the highest crossed platform; platforms are one-way');
g=fresh();const xs=g.players.map(p=>p.x);
step(g,.1,[{x:-1,jump:true},{x:1,jump:true},{x:-1,jump:true},{x:1,jump:true}]);
assert(g.players.every(p=>p.jumps===1&&p.y<519));assert(g.players[0].x<xs[0]&&g.players[1].x>xs[1]&&g.players[2].x<xs[2]&&g.players[3].x>xs[3]);
g.pause();const frozen=JSON.stringify(g.snapshot());step(g,3);assert.equal(JSON.stringify(g.snapshot()),frozen);g.resume();
console.log('PASS: four players move and jump independently; pause freezes platform physics');
g=fresh();p=g.players[0];const target=g.players[1];p.x=730;p.fx=1;target.x=780;
step(g,.12,[{x:1,dash:true}]);assert(target.damage>=22);assert(target.vy<0);step(g,1.4);assert(!target.alive);
console.log('PASS: dash increases damage, launches a rival, and causes a knockout');
g=fresh();step(g,18.3);assert(g.shrinking);assert(g.platforms.every(s=>s.w>0));assert(g.platforms[0].w<620);
g.players.slice(0,3).forEach(p=>p.y=900);g.step(1/120);assert.equal(g.scores[3],1);step(g,3);assert.equal(g.round,2);assert.equal(g.platforms[0].w,620);assert(g.players.every(p=>p.alive&&p.damage===0&&p.jumps===0));
g=fresh();g.players.forEach(p=>p.y=900);g.step(1/120);assert.deepEqual(g.scores,[0,0,0,0]);assert.equal(g.roundWinner,null);
console.log('PASS: platform erosion, knockout scoring, round resets, and draws');
const durations=[];let jumps=0,dashes=0,knockouts=0;
for(let seed=1;seed<=20;seed++){
  let state=seed;const random=()=>{state=(state*1664525+1013904223)>>>0;return state/4294967296;};
  const game=new PlatformerEngine(random);game.configure(['bot','bot','bot','bot'],3);game.start();let elapsed=0;
  while(game.phase!=='matchOver'&&elapsed<1200){
    game.step(1/120);elapsed+=1/120;
    for(const e of game.drainEvents()){if(e.type==='jump')jumps++;if(e.type==='dash')dashes++;if(e.type==='eliminated')knockouts++;}
    assert(game.players.every(p=>Number.isFinite(p.x)&&Number.isFinite(p.y)&&p.jumps<=2));
  }
  assert.equal(game.phase,'matchOver',`Seed ${seed} failed to complete`);assert.equal(Math.max(...game.scores),3);durations.push(Math.round(elapsed));
}
assert(jumps>20&&dashes>20&&knockouts>20);
console.log('PASS: 20 seeded platformer matches completed:',durations.join(', '),'simulated seconds');
console.log({jumps,dashes,knockouts});
console.log('All platformer checks passed.');
// Purpose: Validate user-visible platformer rules and bot completion. Upstream: dist/platformer.js, the side-view game engine. Environment: Node.js built-ins. Generated: 2026-09-14 America/New_York. New file: all lines.

// Updated: 2026-09-15 America/New_York. Import lines now use game/ after separating authored source from protected build output.
