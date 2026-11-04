// test-bot-navigation.cjs
// Request: Regress reachable bot routes, outer ledges, recovery and moving/portal topology.
const assert=require('node:assert/strict');
const {PlatformerEngine}=require('./game/platformer.js');
const Maps=require('./game/maps.js');
const routeMap={name:'Switchback route',platforms:[{id:'floor',x:80,y:620,w:840},{id:'step',x:140,y:480,w:160},{id:'bridge',x:400,y:340,w:160},{id:'top',x:660,y:200,w:160}]};
function fresh(map=routeMap){const g=new PlatformerEngine(()=>.5);g.setMap(map);g.configure(['bot','keyboard','keyboard','keyboard'],3,999);g.start();g.phase='playing';g.players.slice(2).forEach(p=>p.alive=false);return g;}
function stand(g,id,surface,x){const p=g.players[id],s=g.platforms.find(s=>s.id===surface);Object.assign(p,{x,y:s.y-p.r,prevX:x,prevY:s.y-p.r,vx:0,vy:0,support:surface,grounded:true,aiTime:0,aiJumpDelay:0});return p;}
let g=fresh();stand(g,0,'floor',450);stand(g,1,'top',800);
assert.equal(g.bot(g.players[0],1/120).x,-1,'take the left entry instead of jumping at the unreachable middle ledge');
g=fresh(Maps.presets.find(s=>s.id==='split-summit'));stand(g,0,'left',200);stand(g,1,'left',100);
assert.equal(g.bot(g.players[0],1/120).x,-1,'pursue along a valid outer ledge instead of heading to floor center');
for(const dt of [1/30,1/60,1/120]){
  g=fresh();stand(g,0,'floor',450);stand(g,1,'top',800);const visited=new Set();
  for(let time=0;time<18&&g.phase==='playing';time+=dt){g.step(dt);if(g.players[0].support)visited.add(g.players[0].support);if(visited.has('top'))break;}
  assert(visited.has('step')&&visited.has('bridge')&&visited.has('top'),`complete actual multi-hop ascent at ${1/dt} Hz: ${[...visited]}`);
  assert(g.players[0].alive);
}
g=fresh(Maps.presets.find(s=>s.id==='split-summit'));const p=stand(g,0,'left',100);stand(g,1,'right',800);
Object.assign(p,{grounded:false,support:null,y:370,vy:100,aiDestination:null});g.bot(p,1/120);
assert.equal(p.aiDestination,'left','airborne recovery chooses the nearer landing ledge, not the floor');
g=fresh(Maps.presets.find(s=>s.id==='portal-junction'));const a=g.platforms.find(s=>s.id==='left-gate'),b=g.platforms.find(s=>s.id==='right-gate');
assert.deepEqual(g.botRoute(a,b).map(s=>s.id),['left-gate','right-gate'],'portal pair provides a direct route');
b.w=0;assert.equal(g.botRoute(a,b),null,'eroded endpoint cannot be routed to');
g=fresh(routeMap);const source=g.platforms[0],top=g.platforms.at(-1);g.platforms.find(s=>s.id==='step').x=800;
assert.equal(g.botRoute(source,top),null,'a moved-away connection is re-evaluated');
stand(g,0,'floor',450);stand(g,1,'top',800);const input=g.bot(g.players[0],1/120);
assert(!input.jump&&!input.dash,'wait safely when there is no reachable route');
console.log('PASS: real multi-hop climbs at 30/60/120 Hz, outer-ledge pursuit, airborne recovery, moving/eroded routes and portals');
// Purpose: Protect player-visible navigation rather than only bot match termination.
// Upstream: platformer.js live routing, map definitions and actual jump/landing physics.
// Environment: Node 24 built-in assertions. Generated: 2026-11-04 America/New_York. New file: all lines.
