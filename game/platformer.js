// platformer.js
// Request: Support Teams mode and adjustable player count (2-4) alongside reachable bot platform routes and per-slot bot difficulties.
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
        ...spawns[i],fx:i<this.playerCount/2?1:-1,fy:0,
        grounded:true,jumps:0,jumpHeld:false,coyote:.09,jumpBuffer:0,
        support:'floor',prevX:spawns[i].x,prevY:spawns[i].y,hitStun:0,aiJump:false,aiJumpDelay:.3+i*.15,
        dropHeld:false,dropPlatform:null,dropTime:0,carriedBy:null,aiDrop:false,
        portalCooldown:0,portalTrips:0,aiDestination:null,
      }));
    }
    botRoute(start,end) {
      const surfaces=this.platforms.filter(s=>s.w>=50),queue=[[start]],seen=new Set([start.id]);
      while(queue.length){
        const path=queue.shift(),a=path.at(-1);if(a.id===end.id)return path;
        for(const b of surfaces){
          if(seen.has(b.id))continue;
          const gap=Math.max(0,a.x-b.x-b.w,b.x-a.x-a.w),rise=a.y-b.y;
          const portal=a.portal&&b.portal;
          if(!portal&&(rise>210||gap>180))continue;
          seen.add(b.id);queue.push([...path,b]);
        }
      }
      return null;
    }
    bot(p,dt) {
      const skill=this.botProfile(p.id);
      p.aiTime-=dt;p.aiJumpDelay=Math.max(0,p.aiJumpDelay-dt);
      if(p.aiTime<=0){
        p.aiTime=skill.reaction+.01+this.random()*skill.jitter;
        const surfaces=this.platforms.filter(s=>s.w>=50),floor=this.platforms.find(s=>s.id==='floor');
        const support=surfaces.find(s=>s.id===p.support),center=s=>s.x+s.w/2;
        const gap=(s,x)=>Math.max(0,s.x-x,x-s.x-s.w);
        const target=this.players.filter(q=>q.alive&&q.id!==p.id&&!this.sameTeam(p.id,q.id)).sort((a,b)=>Math.abs(a.x-p.x)+Math.abs(a.y-p.y)*1.5-Math.abs(b.x-p.x)-Math.abs(b.y-p.y)*1.5)[0];
        const targetSurface=surfaces.find(s=>s.id===target?.support)||surfaces.filter(s=>s.y>=(target?.y??p.y)+p.r-4).sort((a,b)=>gap(a,target?.x??p.x)-gap(b,target?.x??p.x)||a.y-b.y)[0];
        let destination=surfaces.find(s=>s.id===p.aiDestination),portalRoute=false;
        if(p.grounded&&support){
          const route=targetSurface?this.botRoute(support,targetSurface):null;
          destination=route?.[1]||support;
          portalRoute=!!(route?.[1]&&support.portal&&destination.portal);
          p.aiDestination=destination.id;
        }else if(!destination||p.y-p.r>destination.y+45){
          destination=surfaces.filter(s=>s.y>=p.y+p.r-10).sort((a,b)=>gap(a,p.x+p.vx*.2)-gap(b,p.x+p.vx*.2)||a.y-b.y)[0]||floor;
          p.aiDestination=destination?.id;
        }
        let goal=destination?center(destination):500;
        if(p.grounded&&support){
          if(destination?.id===support.id)goal=clamp(target?target.x+target.vx*skill.lead:center(support),support.x+24,support.x+support.w-24);
          else if(portalRoute)goal=center(support);
          else goal=clamp(goal,support.x+24,support.x+support.w-24);
        }
        const steering=goal-(p.x+p.vx*(p.grounded?.10:.20));
        p.aiX=Math.abs(steering)<10?0:Math.sign(steering)*skill.control;
        const next=destination&&destination.id!==support?.id;
        const rise=destination?destination.y-(p.y+p.r):0;
        const launch=p.grounded&&support&&next&&!portalRoute&&Math.abs(goal-p.x)<35;
        const descend=launch&&rise>45;
        p.aiDrop=!!(descend&&support.dropThrough&&gap(destination,p.x)<20);
        if(descend&&!p.aiDrop)p.aiX=center(destination)<center(support)?-1:1;
        const climb=!!destination&&rise<-24&&!p.grounded&&p.jumps<2&&p.vy>-60;
        const recover=!p.grounded&&p.jumps<2&&p.vy>30&&!!destination&&(gap(destination,p.x)>10||p.y>destination.y-skill.recovery);
        const dodge=p.grounded&&support&&destination?.id===support.id&&target&&Math.abs(target.x-p.x)<135&&this.random()<skill.dodge;
        p.aiJump=!p.aiDrop&&p.aiJumpDelay<=0&&((launch&&!descend)||climb||recover||dodge);
        if(p.aiJump)p.aiJumpDelay=skill.jumpDelay;
        const dx=target?target.x-p.x:0,dy=target?Math.abs(target.y-p.y):Infinity;
        const landing=support||destination;
        const dashSafe=landing&&p.x+Math.sign(dx)*135>landing.x+15&&p.x+Math.sign(dx)*135<landing.x+landing.w-15;
        p.aiDash=!!target&&!p.aiDrop&&Math.abs(dx)>5&&Math.abs(dx)<130&&dy<48&&dashSafe&&this.random()>1-(this.botDifficulties[p.id]==='normal'?.85:skill.dashChance);
        if(p.aiDash)p.aiX=Math.sign(dx)*skill.control;
      }
      const input={x:p.aiX,jump:p.aiJump,dash:p.aiDash,drop:p.aiDrop};
      p.aiJump=false;p.aiDash=false;p.aiDrop=false;return input;
    }
    step(dt,inputs=[]) {
      dt=clamp(dt,0,1/30);
      // Reuse the original countdown, pause, scoring transition, replay, and match completion.
      if(this.phase!=='playing'){super.step(dt,inputs);return;}
      this.elapsed+=dt;
      const erosion=this.shrinkTime===999?0:Math.max(0,this.elapsed-this.shrinkTime);
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
        p.portalCooldown=Math.max(0,p.portalCooldown-dt);
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
      for(const p of this.players)this.teleport(p);
      for(let i=0;i<this.players.length;i++)for(let j=i+1;j<this.players.length;j++)this.collide(this.players[i],this.players[j]);
      // Resolve downward collision displacement against one-way platform tops as well.
      for(const p of this.players){
        if(!p.alive)continue;
        this.land(p,p.prevY);
        if(p.x<-70||p.x>1070||p.y>770||p.y<-170)this.eliminatePlayer(p);
      }
      this.checkRoundEnd();
    }
    teleport(p) {
      if(!p.alive||p.portalCooldown>0)return;
      const gates=this.platforms.filter(s=>s.portal&&s.w>=50);
      if(gates.length!==2)return;
      for(const [i,s] of gates.entries()){
        const center=Maps.portalCenter(s);
        // Sweep relative to the moving gate so fast dashes cannot skip its opening.
        const ax=p.prevX-(s.previousX+s.previousW/2),ay=p.prevY-(s.previousY-26);
        const dx=p.x-center.x-ax,dy=p.y-center.y-ay;
        const t=clamp(-(ax*dx+ay*dy)/(dx*dx+dy*dy||1),0,1);
        if(Math.hypot(ax+dx*t,ay+dy*t)>26)continue;
        const exit=gates[1-i],to=Maps.portalCenter(exit),from={x:p.x,y:p.y};
        p.x=to.x;p.y=exit.y-p.r-4;p.prevX=p.x;p.prevY=p.y;
        p.grounded=false;p.support=null;p.carriedBy=null;p.coyote=0;
        p.dropPlatform=null;p.dropTime=0;p.portalCooldown=.65;p.portalTrips++;
        this.emit('portal',{id:p.id,from: s.id,to:exit.id,entryX:from.x,entryY:from.y,x:p.x,y:p.y});
        break;
      }
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
        if(s.jumpPad){
          const pad=Maps.padBounds(s);
          if(p.x>=pad.x-p.r*.35&&p.x<=pad.x+pad.w+p.r*.35){
            p.vy=-760;p.grounded=false;p.support=null;p.carriedBy=null;p.coyote=0;p.jumpBuffer=0;p.dashTime=0;
            this.emit('jumpPad',{id:p.id,platform:s.id,x:p.x,y:s.y});
          }
        }
      }
    }
    collide(a,b) {
      if(!a.alive||!b.alive||Math.hypot(b.x-a.x,b.y-a.y)>=a.r+b.r)return;
      if(this.sameTeam(a.id,b.id)){super.collide(a,b);return;}
      const aHits=a.dashTime>0&&!a.hit.has(b.id),bHits=b.dashTime>0&&!b.hit.has(a.id);
      super.collide(a,b);
      if(aHits){b.vy=Math.min(b.vy,-290-b.damage*.7);b.hitStun=.24;b.grounded=false;b.support=null;}
      if(bHits){a.vy=Math.min(a.vy,-290-a.damage*.7);a.hitStun=.24;a.grounded=false;a.support=null;}
    }
    snapshot() {
      return {...super.snapshot(),gameMode:'platformer',mapName:this.mapDefinition.name,platforms:this.platforms.map(s=>({...s,motion:s.motion?{...s.motion}:s.motion})),players:this.players.map(({id,name,color,team,alive,damage,x,y,vx,vy,cooldown,grounded,jumps})=>({id,name,color,team,alive,damage,x,y,vx,vy,cooldown,grounded,jumps}))};
    }
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={PlatformerEngine};else root.PlatformerEngine=PlatformerEngine;
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Side-view platformer simulation. Upstream: engine.js supplies fighter properties, collisions, lobby settings, and round/match transitions. Environment: browser or Node.js. Generated: 2026-09-14 America/New_York. New file: all lines.
// Updated: 2026-09-18 America/New_York. Lines 6-25 select/retain validated maps and spawns; 33-55 adapt bots to the floor; 70 erodes selected geometry; 112 checks highest landings; 131 includes map name.
// Updated: 2026-09-19 America/New_York. Lines 8,18-24 initialize motion/drop state; 50-59 add bot descent; 67-101 move platforms, carry riders and process Down; 131-148 land relative to moving surfaces. Purpose: custom moving/drop-through stages; upstream: validated maps.js geometry and original engine; environment: browser/Node.
// Updated: 2026-09-23 America/New_York. Lines 18,71-72 track vertical surface velocity; 133-138 admit catches by rising platforms while preserving upward separation. Purpose: relative-motion landings; upstream: maps.js paths and engine collisions; environment: browser/Node.
// Updated: 2026-10-03 America/New_York. Lines 148-155 launch from centered pad strips, restore both air jumps and emit feedback. Purpose: automatic jump pads; upstream: maps.js pad bounds and existing landing resolution; environment: browser/Node.

// Updated: 2026-10-07 America/New_York. Changed lines 2, 66, 130: apply permanent Never and immediate-match scoring with existing shared transitions. Purpose: patch reviewed rules/attribution while preserving incoming features. Upstream: existing simulation, browser UI and replay/control tests at 3d937e8. Environment: browser / Node 24+.

// Updated: 2026-10-11 America/New_York. Changed lines 2,166,178-179. Change: snapshot includes each fighter color; custom overrides remain inherited from ArenaEngine. Purpose: consistent colors across both modes and state reads; upstream: engine.js custom-color storage; environment: browser / Node 24.
// Updated: 2026-11-03 America/New_York. Changed lines 2,127: use inherited elimination scoring for damage/assist parity with Arena. Purpose: shared match statistics; upstream: engine.js recordHit/eliminatePlayer and existing platform physics; environment: browser / Node 24.


// Updated: 2026-11-03 America/New_York. Changed lines 2, 25, 80, 124, 135-153. Purpose: paired Platformer portals and compatibility checks. Upstream: existing map definitions, platform simulation, editor, rendering and replay capture. Environment: browser / Node 24 / Workers. Changes: portal validation/preset, swept momentum-preserving traversal with cooldown, editor/render feedback, replay discontinuities or corresponding behavioral tests, as applicable.

// Updated: 2026-11-04 America/New_York. Changed line 2, round AI destination initialization and lines 28-87: breadth-first live platform/portal routes, reachable intermediate jumps, persistent airborne landing targets, velocity-aware steering, controlled descent and supported-surface dash margins. Purpose: fix bot pathfinding; upstream: existing maps, jump/motion/portal physics and bot controls; environment: browser / Node 24.

// Updated: 2026-11-04 America/New_York. Changed lines 29, 32, 38, 47, 49, 51, 54, 57-58. Purpose: independent Easy/Normal/Hard bots and configuration compatibility. Changes: validated per-slot settings, difficulty-driven decisions, lobby/mode/replay retention or corresponding UI checks, according to this file. Upstream: existing engine/platformer bots and lobby/replay configuration. Environment: browser / Node 24+.
// Integration: 2026-11-04 America/New_York. Route decisions retain per-slot reaction/jitter, control, target lead, recovery margin, jump delay, dodge and dash probability. Upstream: incoming bot profiles; environment: browser / Node 24.
// Updated: 2026-11-04 America/New_York. Added Teams mode and adjustable player count (2-4) support in PlatformerEngine.
// Updated: 2026-11-05 America/New_York. Changed line 216: independently copy nested motion in platform snapshots. Purpose: prevent snapshot consumers mutating live/validated movement paths; upstream: existing map validation and snapshots; environment: browser / Node 24.
