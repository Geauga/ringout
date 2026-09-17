// engine.js
// Request: Four-player arena physics, dash knockback, bots, elimination, shrinking boundaries, and first-to-N matches.
(function (root) {
  'use strict';
  const COLORS = ['#ff847a', '#85b5ff', '#f0c875', '#b6a0f5'];
  const NAMES = ['CORAL', 'BLUE', 'GOLD', 'VIOLET'];
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  class ArenaEngine {
    constructor(random = Math.random) { this.random = random; this.target = 3; this.modes = ['keyboard', 'bot', 'bot', 'bot']; this.events = []; this.phase = 'lobby'; this.scores = [0, 0, 0, 0]; this.round = 1; this.makeRound(); this.phase = 'lobby'; }
    makeRound() {
      this.radius = 267; this.elapsed = 0; this.clock = 3; this.shrinking = false; this.roundWinner = null; this.hitPairs = new Map();
      this.players = COLORS.map((color, id) => {
        const angle = -Math.PI * .75 + id * Math.PI * .5;
        return { id, name:NAMES[id], color, x:500+Math.cos(angle)*160, y:354+Math.sin(angle)*160, vx:0, vy:0, r:21, fx:-Math.cos(angle), fy:-Math.sin(angle), alive:true, damage:0, cooldown:0, dashTime:0, dashHeld:false, hit:new Set(), fall:0, aiTime:.1+id*.05, aiX:0, aiY:0, aiDash:false };
      });
    }
    configure(modes, target) {
      if(this.phase !== 'lobby') throw new Error('Return to the lobby before changing players.');
      if(!Array.isArray(modes) || modes.length!==4 || !modes.every(m=>m==='bot'||m==='keyboard'||/^gamepad[0-3]$/.test(m))) throw new Error('Choose four valid player controls.');
      if(![1,3,5].includes(target)) throw new Error('Round win target must be 1, 3, or 5.');
      const pads=modes.filter(m=>m.startsWith('gamepad')); if(new Set(pads).size!==pads.length) throw new Error('Each controller can control only one player.');
      this.modes=[...modes]; this.target=target;
    }
    start() { this.scores=[0,0,0,0];this.round=1;this.events=[];this.makeRound();this.phase='countdown';this.emit('countdown',{number:3}); }
    lobby() { this.phase='lobby';this.scores=[0,0,0,0];this.round=1;this.events=[];this.makeRound();this.phase='lobby'; }
    pause() { if(['countdown','playing','roundOver'].includes(this.phase)){this.previousPhase=this.phase;this.phase='paused';return true;} return false; }
    resume() { if(this.phase==='paused'){this.phase=this.previousPhase;return true;} return false; }
    emit(type, data={}) { this.events.push({type,...data}); }
    drainEvents() { const out=this.events;this.events=[];return out; }
    bot(p, dt) {
      p.aiTime-=dt;
      if(p.aiTime<=0){
        p.aiTime=.09+this.random()*.09;
        const rivals=this.players.filter(q=>q.alive&&q.id!==p.id).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
        const q=rivals[0];let x=500-p.x,y=354-p.y;
        if(q){const d=Math.hypot(q.x-p.x,q.y-p.y);const edge=Math.hypot(p.x-500,p.y-354);if(edge<this.radius-75){x=q.x-p.x+(500-q.x)*.15;y=q.y-p.y+(354-q.y)*.15;}p.aiDash=d<130&&d>34&&edge<this.radius-52&&this.random()>.25;}
        const len=Math.hypot(x,y)||1;p.aiX=x/len;p.aiY=y/len;
      }
      const input={x:p.aiX,y:p.aiY,dash:p.aiDash};p.aiDash=false;return input;
    }
    step(dt, inputs=[]) {
      dt=clamp(dt,0,1/30);if(['paused','lobby','matchOver'].includes(this.phase)) return;
      for(const p of this.players) if(!p.alive) p.fall+=dt;
      if(this.phase==='countdown'){
        const before=Math.ceil(this.clock);this.clock-=dt;
        if(this.clock<=0){this.phase='playing';this.emit('go');}else if(Math.ceil(this.clock)!==before)this.emit('countdown',{number:Math.ceil(this.clock)});return;
      }
      if(this.phase==='roundOver'){
        this.clock-=dt;if(this.clock<=0){if(this.roundWinner!==null&&this.scores[this.roundWinner]>=this.target){this.phase='matchOver';this.emit('matchOver',{winner:this.roundWinner});}else{this.round++;this.makeRound();this.phase='countdown';this.emit('countdown',{number:3});}}return;
      }
      this.elapsed+=dt;
      this.radius=Math.max(0,267-Math.max(0,this.elapsed-18)*4.8);
      if(this.elapsed>=18&&!this.shrinking){this.shrinking=true;this.emit('shrink');}
      for(const [key,remaining] of this.hitPairs){if(remaining<=dt)this.hitPairs.delete(key);else this.hitPairs.set(key,remaining-dt);}
      for(const p of this.players){
        if(!p.alive)continue;
        p.cooldown=Math.max(0,p.cooldown-dt);p.dashTime=Math.max(0,p.dashTime-dt);
        const input=this.modes[p.id]==='bot'?this.bot(p,dt):(inputs[p.id]||{x:0,y:0,dash:false});
        let ix=Number.isFinite(input.x)?input.x:0,iy=Number.isFinite(input.y)?input.y:0;const il=Math.hypot(ix,iy);if(il>1){ix/=il;iy/=il;}
        if(il>.15){const l=Math.hypot(ix,iy);p.fx=ix/l;p.fy=iy/l;}
        if(input.dash&&!p.dashHeld&&p.cooldown<=0){p.dashTime=.16;p.cooldown=1.25;p.vx=p.fx*900;p.vy=p.fy*900;p.hit.clear();this.emit('dash',{id:p.id,x:p.x,y:p.y});}
        p.dashHeld=!!input.dash;
        if(p.dashTime<=0){const drag=Math.exp(-4.8*dt);p.vx=p.vx*drag+ix*1220*dt;p.vy=p.vy*drag+iy*1220*dt;}
        p.x+=p.vx*dt;p.y+=p.vy*dt;
      }
      for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)this.collide(this.players[i],this.players[j]);
      const eliminated=[];
      for(const p of this.players){if(p.alive&&Math.hypot(p.x-500,p.y-354)>this.radius+p.r*.2){p.alive=false;p.fall=0;eliminated.push(p.id);this.emit('eliminated',{id:p.id,x:p.x,y:p.y});}}
      const alive=this.players.filter(p=>p.alive);
      if(alive.length<=1){this.roundWinner=alive[0]?.id??null;if(this.roundWinner!==null)this.scores[this.roundWinner]++;this.phase='roundOver';this.clock=2.8;this.emit('roundOver',{winner:this.roundWinner,draw:alive.length===0});}
    }
    collide(a,b){
      if(!a.alive||!b.alive)return;
      let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=a.r+b.r)return;
      if(d<.001){dx=1;dy=0;d=1;}
      const nx=dx/d,ny=dy/d,overlap=a.r+b.r-d;
      a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;
      const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(relative<0){const impulse=-relative*.72;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse;}
      const key=a.id+':'+b.id;
      const ad=a.dashTime>0&&!a.hit.has(b.id),bd=b.dashTime>0&&!b.hit.has(a.id);
      if(ad||bd){
        if(ad){a.hit.add(b.id);b.damage=Math.min(250,b.damage+22);const force=690*(1+b.damage/150);b.vx+=nx*force;b.vy+=ny*force;a.vx-=nx*75;a.vy-=ny*75;}
        if(bd){b.hit.add(a.id);a.damage=Math.min(250,a.damage+22);const force=690*(1+a.damage/150);a.vx-=nx*force;a.vy-=ny*force;b.vx+=nx*75;b.vy+=ny*75;}
        this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:1});this.hitPairs.set(key,.3);
      }else if(!this.hitPairs.has(key)&&relative<-30){
        a.damage=Math.min(250,a.damage+4);b.damage=Math.min(250,b.damage+4);a.vx-=nx*(95+a.damage*.6);a.vy-=ny*(95+a.damage*.6);b.vx+=nx*(95+b.damage*.6);b.vy+=ny*(95+b.damage*.6);this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:.3});this.hitPairs.set(key,.3);
      }
    }
    snapshot(){return {phase:this.phase,round:this.round,target:this.target,elapsed:Math.round(this.elapsed*10)/10,radius:this.radius,scores:[...this.scores],modes:[...this.modes],players:this.players.map(({id,name,alive,damage,x,y,cooldown})=>({id,name,alive,damage,x,y,cooldown}))};}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={ArenaEngine,COLORS,NAMES};
  else Object.assign(root,{ArenaEngine,PLAYER_COLORS:COLORS,PLAYER_NAMES:NAMES});
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Deterministic-step game logic independent of rendering. Upstream: original user game request; no previous implementation. Environment: browser or Node.js for simulation validation. Generated: 2026-09-11 America/New_York. New file: all lines.
