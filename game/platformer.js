// platformer.js
// Request: Add a side-view, four-player platformer version with double jumps, platforms, bots, and knockouts.
(function (root) {
  'use strict';
  const Base = typeof module !== 'undefined' && module.exports ? require('./engine.js').ArenaEngine : root.ArenaEngine;
  const Maps = typeof module !== 'undefined' && module.exports ? require('./maps.js') : root.RingoutMaps;
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const motionOffset = (s,time) => s.motion?(1-Math.cos(time*Math.PI*2/s.motion.period))*s.motion.distance/2:0;
  class PlatformerEngine extends Base {
    setMap(map) {
      if(this.phase!=='lobby')throw new Error('Return to the lobby before changing maps.');
      this.mapDefinition=Maps.validate(map);this.makeRound();this.phase='lobby';return this.snapshot();
    }
    makeRound() {
      super.makeRound();
      this.gameMode='platformer';
      this.mapDefinition??=Maps.validate(Maps.presets[0]);
      this.platforms=this.mapDefinition.platforms.map(p=>({...p,previousX:p.x,previousY:p.y,previousW:p.w,deltaX:0,deltaY:0,velocityY:0}));
      const spawns=Maps.spawns(this.mapDefinition);
      this.players.forEach((p,i)=>Object.assign(p,{
        ...spawns[i],fx:i<2?1:-1,fy:0,
        grounded:true,jumps:0,jumpHeld:false,coyote:.09,jumpBuffer:0,
        support:'floor',prevX:spawns[i].x,prevY:spawns[i].y,hitStun:0,aiJump:false,aiJumpDelay:.3+i*.15,
        dropHeld:false,dropPlatform:null,dropTime:0,carriedBy:null,aiDrop:false,
      }));
    }
    bot(p,dt) {
      p.aiTime-=dt;p.aiJumpDelay=Math.max(0,p.aiJumpDelay-dt);
      if(p.aiTime<=0){
        p.aiTime=.10+this.random()*.09;
        const rivals=this.players.filter(q=>q.alive&&q.id!==p.id);
        const target=rivals.sort((a,b)=>(Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*1.5)-(Math.abs(b.x-p.x)+Math.abs(b.y-p.y)*1.5))[0];
        const floor=this.platforms.find(s=>s.id==='floor');
        const center=floor.x+floor.w/2;
        const support=this.platforms.find(s=>s.id===p.support&&s.w>0);
        let goal=target?.x??center;
        // Recover toward the surviving floor before pursuing a rival beyond its edge.
        const offFloor=!floor||p.x<floor.x+20||p.x>floor.x+floor.w-20;
        if(offFloor||p.y>floor.y)goal=center;
        else if(target&&target.y<p.y-75&&support){
          const above=this.platforms.filter(s=>s.w>40&&s.y<support.y&&s.y>=support.y-290);
          const next=above.sort((a,b)=>Math.abs(a.x+a.w/2-target.x)-Math.abs(b.x+b.w/2-target.x))[0];
          if(next)goal=next.x+next.w/2;
        }
        p.aiX=Math.abs(goal-p.x)<12?0:Math.sign(goal-p.x);
        const approachingEdge=support&&(p.aiX<0?p.x<support.x+50:p.aiX>0&&p.x>support.x+support.w-50);
        const recover=!p.grounded&&p.jumps<2&&(p.y>floor.y-60||offFloor)&&p.vy>30;
        const climb=target&&target.y<p.y-65&&(p.grounded||(p.jumps===1&&p.vy>-60));
        const dodge=p.grounded&&target&&Math.abs(target.x-p.x)<135&&this.random()<.15;
        p.aiDrop=!!(p.grounded&&support?.dropThrough&&target&&target.y>p.y+65&&Math.abs(target.x-p.x)<support.w/2);
        p.aiJump=!p.aiDrop&&p.aiJumpDelay<=0&&(recover||climb||approachingEdge||dodge);
        if(p.aiJump)p.aiJumpDelay=.23;
        const dx=target?target.x-p.x:0,dy=target?Math.abs(target.y-p.y):Infinity;
        const inward=dx*(center-p.x)>0;
        p.aiDash=!!target&&Math.abs(dx)<130&&dy<48&&(!offFloor||inward)&&p.y<floor.y+30&&this.random()>.15;
        if(p.aiDash)p.aiX=Math.sign(dx)||p.fx;
      }
      const input={x:p.aiX,jump:p.aiJump,dash:p.aiDash,drop:p.aiDrop};
      p.aiJump=false;p.aiDash=false;p.aiDrop=false;return input;
    }
    step(dt,inputs=[]) {
      dt=clamp(dt,0,1/30);
      // Reuse the original countdown, pause, scoring transition, replay, and match completion.
      if(this.phase!=='playing'){super.step(dt,inputs);return;}
      this.elapsed+=dt;
      const erosion=Math.max(0,this.elapsed-18);
      const previous=new Map(this.platforms.map(s=>[s.id,s]));
      this.platforms=this.mapDefinition.platforms.map(s=>{
        const w=Math.max(0,s.w*(1-erosion/60)),offset=motionOffset(s,this.elapsed),delta=offset-motionOffset(s,this.elapsed-dt),old=previous.get(s.id);
        return{...s,x:s.x+(s.w-w)/2+(s.motion?.axis==='x'?offset:0),y:s.y+(s.motion?.axis==='y'?offset:0),w,
          previousX:old.x,previousY:old.y,previousW:old.w,deltaX:s.motion?.axis==='x'?delta:0,deltaY:s.motion?.axis==='y'?delta:0,
          velocityY:s.motion?.axis==='y'&&dt>0?delta/dt:0};
      });
      if(erosion>0&&!this.shrinking){this.shrinking=true;this.emit('shrink');}
      for(const [key,remaining] of this.hitPairs){if(remaining<=dt)this.hitPairs.delete(key);else this.hitPairs.set(key,remaining-dt);}
      for(const p of this.players){
        if(!p.alive){p.fall+=dt;continue;}
        p.prevX=p.x;p.prevY=p.y;p.carriedBy=null;
        p.dropTime=Math.max(0,p.dropTime-dt);
        const ignored=this.platforms.find(s=>s.id===p.dropPlatform);
        if(!ignored||ignored.w<=0||(p.dropTime<=0&&(p.y-p.r>ignored.y+ignored.h||p.y+p.r<ignored.y-2)))p.dropPlatform=null;
        const carrier=this.platforms.find(s=>s.id===p.support&&s.w>0);
        if(p.grounded&&carrier&&Math.abs(p.y+p.r-carrier.previousY)<3){p.x+=carrier.deltaX;p.y+=carrier.deltaY;p.carriedBy=carrier.id;}
        p.cooldown=Math.max(0,p.cooldown-dt);p.dashTime=Math.max(0,p.dashTime-dt);p.hitStun=Math.max(0,p.hitStun-dt);
        const support=this.platforms.find(s=>s.id===p.support&&s.w>0&&p.x>s.x-p.r*.35&&p.x<s.x+s.w+p.r*.35&&Math.abs(p.y+p.r-s.y)<3);
        if(!support){p.grounded=false;p.support=null;}
        p.coyote=p.grounded?.09:Math.max(0,p.coyote-dt);
        const input=this.modes[p.id]==='bot'?this.bot(p,dt):(inputs[p.id]||{});
        const ix=clamp(Number.isFinite(input.x)?input.x:0,-1,1);
        const drop=!!input.drop||input.y>.6;
        const dropping=drop&&!p.dropHeld&&p.grounded&&support?.dropThrough&&p.hitStun<=0;
        p.dropHeld=drop;
        if(dropping){
          p.dropPlatform=support.id;p.dropTime=.22;p.grounded=false;p.support=null;p.coyote=0;p.jumpBuffer=0;
          p.y+=3;p.vy=Math.max(90,p.vy);p.dashTime=0;
          this.emit('drop',{id:p.id,x:p.x,y:p.y});
        }
        const jump=!!input.jump;
        p.jumpBuffer=!dropping&&jump&&!p.jumpHeld?.1:Math.max(0,p.jumpBuffer-dt);p.jumpHeld=jump;
        if(p.jumpBuffer>0&&p.jumps<2&&p.hitStun<=0){
          const first=p.grounded||p.coyote>0;
          p.jumps=first?1:p.jumps+1;p.vy=first?-590:-550;p.grounded=false;p.support=null;p.coyote=0;p.jumpBuffer=0;
          this.emit('jump',{id:p.id,x:p.x,y:p.y,double:p.jumps===2});
        }
        if(Math.abs(ix)>.15&&p.dashTime<=0){p.fx=Math.sign(ix);p.fy=0;}
        if(!dropping&&input.dash&&!p.dashHeld&&p.cooldown<=0&&p.hitStun<=0){
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
      let landing=null;
      for(const s of this.platforms){
        if(s.w<=0||s.id===p.dropPlatform)continue;
        // A rising surface can catch an ascending fighter, but jumps and launches away still clear it.
        if(p.vy<Math.min(0,s.velocityY))continue;
        const before=previousY+p.r-s.previousY,after=p.y+p.r-s.y;
        if(before>2||after<0||after<before-1e-7)continue;
        const fraction=clamp(-before/(after-before||1),0,1);
        const x=p.prevX+(p.x-p.prevX)*fraction,left=s.previousX+(s.x-s.previousX)*fraction,width=s.previousW+(s.w-s.previousW)*fraction;
        if(x<left-p.r*.35||x>left+width+p.r*.35)continue;
        if(!landing||fraction<landing.fraction)landing={s,fraction};
      }
      if(landing){
        const {s,fraction}=landing;
        if(p.carriedBy!==s.id)p.x+=s.deltaX*(1-fraction);
        p.carriedBy=s.id;p.y=s.y-p.r;p.vy=0;p.grounded=true;p.support=s.id;p.jumps=0;p.coyote=.09;
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
      return {...super.snapshot(),gameMode:'platformer',mapName:this.mapDefinition.name,platforms:this.platforms.map(s=>({...s})),players:this.players.map(({id,name,alive,damage,x,y,vx,vy,cooldown,grounded,jumps})=>({id,name,alive,damage,x,y,vx,vy,cooldown,grounded,jumps}))};
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={PlatformerEngine};else root.PlatformerEngine=PlatformerEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Side-view platformer simulation. Upstream: engine.js supplies fighter properties, collisions, lobby settings, and round/match transitions. Environment: browser or Node.js. Generated: 2026-09-14 America/New_York. New file: all lines.
// Updated: 2026-09-18 America/New_York. Lines 6-25 select/retain validated maps and spawns; 33-55 adapt bots to the floor; 70 erodes selected geometry; 112 checks highest landings; 131 includes map name.
// Updated: 2026-09-19 America/New_York. Lines 8,18-24 initialize motion/drop state; 50-59 add bot descent; 67-101 move platforms, carry riders and process Down; 131-148 land relative to moving surfaces. Purpose: custom moving/drop-through stages; upstream: validated maps.js geometry and original engine; environment: browser/Node.
// Updated: 2026-09-23 America/New_York. Lines 18,71-72 track vertical surface velocity; 133-138 admit catches by rising platforms while preserving upward separation. Purpose: relative-motion landings; upstream: maps.js paths and engine collisions; environment: browser/Node.
