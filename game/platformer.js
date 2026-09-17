// platformer.js
// Request: Add a side-view, four-player platformer version with double jumps, platforms, bots, and knockouts.
(function (root) {
  'use strict';
  const Base = typeof module !== 'undefined' && module.exports ? require('./engine.js').ArenaEngine : root.ArenaEngine;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const STAGE = [
    { id:'floor', x:190, y:540, w:620, h:26 },
    { id:'left', x:155, y:390, w:210, h:18 },
    { id:'right', x:635, y:390, w:210, h:18 },
    { id:'top', x:405, y:260, w:190, h:18 },
  ];
  class PlatformerEngine extends Base {
    makeRound() {
      super.makeRound();
      this.gameMode='platformer';
      this.platforms=STAGE.map(p=>({...p}));
      this.players.forEach((p,i)=>Object.assign(p,{
        x:[295,425,575,705][i],y:519,fx:i<2?1:-1,fy:0,
        grounded:true,jumps:0,jumpHeld:false,coyote:.09,jumpBuffer:0,
        support:'floor',prevY:519,hitStun:0,aiJump:false,aiJumpDelay:.3+i*.15,
      }));
    }
    bot(p,dt) {
      p.aiTime-=dt;p.aiJumpDelay=Math.max(0,p.aiJumpDelay-dt);
      if(p.aiTime<=0){
        p.aiTime=.10+this.random()*.09;
        const rivals=this.players.filter(q=>q.alive&&q.id!==p.id);
        const target=rivals.sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*1.5)-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)*1.5))[0];
        const floor=this.platforms.find(s=>s.id==='floor');
        const support=this.platforms.find(s=>s.id===p.support&&s.w>0);
        let goal=target?.x??500;
        // Recover toward the surviving floor before pursuing a rival beyond its edge.
        const offFloor=!floor||p.x<floor.x+20||p.x>floor.x+floor.w-20;
        if(offFloor||p.y>540)goal=500;
        else if(target&&target.y<p.y-75&&support){
          const above=this.platforms.filter(s=>s.w>40&&s.y<support.y&&s.y>=support.y-290);
          const next=above.sort((a,b)=>Math.abs(a.x+a.w/2-target.x)-Math.abs(b.x+b.w/2-target.x))[0];
          if(next)goal=next.x+next.w/2;
        }
        p.aiX=Math.abs(goal-p.x)<12?0:Math.sign(goal-p.x);
        const approachingEdge=support&&(p.aiX<0?p.x<support.x+50:p.aiX>0&&p.x>support.x+support.w-50);
        const recover=!p.grounded&&p.jumps<2&&(p.y>480||offFloor)&&p.vy>30;
        const climb=target&&target.y<p.y-65&&(p.grounded||(p.jumps===1&&p.vy>-60));
        const dodge=p.grounded&&target&&Math.abs(target.x-p.x)<135&&this.random()<.15;
        p.aiJump=p.aiJumpDelay<=0&&(recover||climb||approachingEdge||dodge);
        if(p.aiJump)p.aiJumpDelay=.23;
        const dx=target?target.x-p.x:0,dy=target?Math.abs(target.y-p.y):Infinity;
        const inward=dx*(500-p.x)>0;
        p.aiDash=!!target&&Math.abs(dx)<130&&dy<48&&(!offFloor||inward)&&p.y<570&&this.random()>.15;
        if(p.aiDash)p.aiX=Math.sign(dx)||p.fx;
      }
      const input={x:p.aiX,jump:p.aiJump,dash:p.aiDash};
      p.aiJump=false;p.aiDash=false;return input;
    }
    step(dt,inputs=[]) {
      dt=clamp(dt,0,1/30);
      // Reuse the original countdown, pause, scoring transition, replay, and match completion.
      if(this.phase!=='playing'){super.step(dt,inputs);return;}
      this.elapsed+=dt;
      const erosion=Math.max(0,this.elapsed-18);
      this.platforms=STAGE.map(s=>{const w=Math.max(0,s.w*(1-erosion/60));return{...s,x:s.x+(s.w-w)/2,w};});
      if(erosion>0&&!this.shrinking){this.shrinking=true;this.emit('shrink');}
      for(const [key,remaining] of this.hitPairs){if(remaining<=dt)this.hitPairs.delete(key);else this.hitPairs.set(key,remaining-dt);}
      for(const p of this.players){
        if(!p.alive){p.fall+=dt;continue;}
        p.prevY=p.y;
        p.cooldown=Math.max(0,p.cooldown-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.hitStun=Math.max(0,p.hitStun-dt);
        const support=this.platforms.find(s=>s.id===p.support&&s.w>0&&p.x>s.x-p.r*.35&&p.x<s.x+s.w+p.r*.35&&Math.abs(p.y+p.r-s.y)<3);
        if(!support){p.grounded=false;p.support=null;}
        p.coyote=p.grounded?.09:Math.max(0,p.coyote-dt);
        const input=this.modes[p.id]==='bot'?this.bot(p,dt):(inputs[p.id]||{});
        const ix=clamp(Number.isFinite(input.x)?input.x:0,-1,1);
        const jump=!!input.jump;
        p.jumpBuffer=jump&&!p.jumpHeld?.1:Math.max(0,p.jumpBuffer-dt);p.jumpHeld=jump;
        if(p.jumpBuffer>0&&p.jumps<2&&p.hitStun<=0){
          const first=p.grounded||p.coyote>0;
          p.jumps=first?1:p.jumps+1;p.vy=first?-590:-550;p.grounded=false;p.support=null;p.coyote=0;p.jumpBuffer=0;
          this.emit('jump',{id:p.id,x:p.x,y:p.y,double:p.jumps===2});
        }
        if(Math.abs(ix)>.15&&p.dashTime<=0){p.fx=Math.sign(ix);p.fy=0;}
        if(input.dash&&!p.dashHeld&&p.cooldown<=0&&p.hitStun<=0){
          p.dashTime=.15;p.cooldown=1.25;p.vx=p.fx*840;p.vy=Math.min(0,p.vy)*.4;p.hit.clear();
          this.emit('dash',{id:p.id,x:p.x,y:p.y});
        }
        p.dashHeld=!!input.dash;
        if(p.dashTime<=0){
          const control=p.hitStun>0?.18:1;
          const drag=p.hitStun>0?.6:p.grounded?7:1.8;
          p.vx*=Math.exp(-drag*dt);
          if(Math.abs(p.vx)<300||Math.sign(ix)!==Math.sign(p.vx))p.vx+=ix*(p.grounded?2300:1100)*control*dt;
          p.vy=Math.min(1100,p.vy+1500*dt);
        }
        p.x+=p.vx*dt;p.y+=p.vy*dt;
        p.grounded=false;p.support=null;
        this.land(p,p.prevY);
      }
      for(let i=0;i<4;i++)for(let j=i+1;j<4;j++)this.collide(this.players[i],this.players[j]);
      // Resolve downward collision displacement against one-way platform tops as well.
      for(const p of this.players){
        if(!p.alive)continue;
        this.land(p,p.prevY);
        if(p.x<-70||p.x>1070||p.y>770||p.y<-170){p.alive=false;p.fall=0;this.emit('eliminated',{id:p.id,x:p.x,y:p.y});}
      }
      const alive=this.players.filter(p=>p.alive);
      if(alive.length<=1){this.roundWinner=alive[0]?.id??null;if(this.roundWinner!==null)this.scores[this.roundWinner]++;this.phase='roundOver';this.clock=2.8;this.emit('roundOver',{winner:this.roundWinner,draw:alive.length===0});}
    }
    land(p,previousY) {
      if(p.vy<0)return;
      for(const s of this.platforms){
        if(s.w<=0||p.x<s.x-p.r*.35||p.x>s.x+s.w+p.r*.35)continue;
        if(previousY+p.r<=s.y+2&&p.y+p.r>=s.y){
          p.y=s.y-p.r;p.vy=0;p.grounded=true;p.support=s.id;p.jumps=0;p.coyote=.09;return;
        }
      }
    }
    collide(a,b) {
      if(!a.alive||!b.alive||Math.hypot(b.x-a.x,b.y-a.y)>=a.r+b.r)return;
      const aHits=a.dashTime>0&&!a.hit.has(b.id),bHits=b.dashTime>0&&!b.hit.has(a.id);
      super.collide(a,b);
      if(aHits){b.vy=Math.min(b.vy,-290-b.damage*.7);b.hitStun=.24;b.grounded=false;b.support=null;}
      if(bHits){a.vy=Math.min(a.vy,-290-a.damage*.7);a.hitStun=.24;a.grounded=false;a.support=null;}
    }
    snapshot() {
      return {...super.snapshot(),gameMode:'platformer',platforms:this.platforms.map(s=>({...s})),players:this.players.map(({id,name,alive,damage,x,y,vx,vy,cooldown,grounded,jumps})=>({id,name,alive,damage,x,y,vx,vy,cooldown,grounded,jumps}))};
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={PlatformerEngine};else root.PlatformerEngine=PlatformerEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Side-view platformer simulation. Upstream: engine.js supplies fighter properties, collisions, lobby settings, and round/match transitions. Environment: browser or Node.js. Generated: 2026-09-14 America/New_York. New file: all lines.
