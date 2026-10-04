// replay.js
// Request: Record local matches and provide isolated, bounded replay playback in both game modes.
(function(root){
  'use strict';
  const copy=value=>JSON.parse(JSON.stringify(value));
  const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
  const active=new Set(['countdown','playing','roundOver']);
  function capture(engine,gameMode){
    return {gameMode,phase:engine.phase,round:engine.round,target:engine.target,elapsed:engine.elapsed,clock:engine.clock,radius:engine.radius,shrinking:engine.shrinking,scores:[...engine.scores],players:engine.players.map(p=>{
      const out={};for(const key of ['id','name','color','skinIndex','x','y','vx','vy','fx','fy','alive','damage','cooldown','dashTime','fall','jumps'])if(p[key]!==undefined)out[key]=p[key];return out;
    }),platforms:engine.platforms?copy(engine.platforms):[]};
  }
  class Recorder{
    constructor({fps=30,maxSeconds=600}={}){
      if(!Number.isFinite(fps)||fps<1||fps>120||!Number.isFinite(maxSeconds)||maxSeconds<1||maxSeconds>600)throw new Error('Invalid replay recording limits.');
      this.interval=1/fps;this.capacity=Math.ceil(fps*maxSeconds)+1;this.latest=null;this.recording=false;
    }
    begin(engine,gameMode){
      this.frames=new Array(this.capacity);this.count=0;this.write=0;this.time=0;this.next=this.interval;this.gameMode=gameMode;this.mapDefinition=engine.mapDefinition?copy(engine.mapDefinition):null;this.recording=true;this.add(engine);
    }
    add(engine){this.frames[this.write]={time:this.time,state:capture(engine,this.gameMode)};this.write=(this.write+1)%this.capacity;this.count=Math.min(this.capacity,this.count+1);}
    tick(dt,engine){
      if(!this.recording||!Number.isFinite(dt)||dt<=0)return;
      if(!active.has(engine.phase)&&engine.phase!=='matchOver')return;
      this.time+=dt;
      if(engine.phase==='matchOver'){this.add(engine);this.finish(true);return;}
      if(this.time+1e-8>=this.next){this.add(engine);this.next=this.time+this.interval;}
    }
    finish(completed=false){
      if(!this.recording)return this.latest;this.recording=false;
      if(this.count<2)return this.latest;
      const frames=Array.from({length:this.count},(_,i)=>this.frames[(this.write-this.count+i+this.capacity)%this.capacity]);
      const offset=frames[0].time;for(const frame of frames)frame.time-=offset;
      const rounds=[];for(const frame of frames)if(rounds.at(-1)?.round!==frame.state.round)rounds.push({round:frame.state.round,time:frame.time});
      this.latest={gameMode:this.gameMode,mapDefinition:this.mapDefinition,frames,rounds,duration:frames.at(-1).time,completed,trimmed:offset>1e-8};this.frames=[];return this.latest;
    }
  }
  class Player{
    constructor(replay){if(!replay?.frames?.length||replay.duration<=0)throw new Error('No replay available.');this.replay=replay;this.time=0;this.speed=1;this.playing=true;}
    seek(time){if(!Number.isFinite(time))return;this.time=clamp(time,0,this.replay.duration);if(this.time===this.replay.duration)this.playing=false;}
    setSpeed(speed){if(![.25,.5,1,2].includes(speed))throw new Error('Invalid replay speed.');this.speed=speed;}
    advance(dt){if(this.playing&&Number.isFinite(dt)&&dt>0)this.seek(this.time+dt*this.speed);}
    frame(){
      const frames=this.replay.frames;let lo=0,hi=frames.length-1;
      while(lo<hi){const mid=Math.ceil((lo+hi)/2);if(frames[mid].time<=this.time)lo=mid;else hi=mid-1;}
      const a=frames[lo],b=frames[Math.min(lo+1,frames.length-1)],state=copy(a.state);state.mapDefinition=copy(this.replay.mapDefinition);
      if(a!==b&&a.state.round===b.state.round&&a.state.phase===b.state.phase){
        const mix=(x,y)=>x+(y-x)*clamp((this.time-a.time)/(b.time-a.time),0,1);
        state.radius=mix(a.state.radius,b.state.radius);state.elapsed=mix(a.state.elapsed,b.state.elapsed);state.clock=mix(a.state.clock,b.state.clock);
        for(let i=0;i<state.players.length;i++)if(a.state.players[i].alive===b.state.players[i].alive)for(const key of ['x','y','vx','vy','fall'])state.players[i][key]=mix(a.state.players[i][key],b.state.players[i][key]);
        for(let i=0;i<state.platforms.length;i++)for(const key of ['x','y','w'])state.platforms[i][key]=mix(a.state.platforms[i][key],b.state.platforms[i][key]);
      }
      return state;
    }
  }
  const api={Recorder,Player};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RingoutReplay=api;
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Latest-match recording with a ten-minute memory cap and independent playback. Upstream: ArenaEngine/PlatformerEngine render state. Environment: browser or Node tests. Generated: 2026-10-04 America/New_York. New file: all lines.
