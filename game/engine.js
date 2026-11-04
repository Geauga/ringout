// engine.js
// Request: Add independent Easy/Normal/Hard bot decisions while preserving existing fighter stats and scoring.
(function (root) {
  'use strict';
  const SKINS = [
    { name: 'CORAL', color: '#ff847a', description: 'A bright, oceanic coral hue.' },
    { name: 'BLUE', color: '#85b5ff', description: 'A calm and steady sky blue.' },
    { name: 'GOLD', color: '#f0c875', description: 'A rich and shining golden yellow.' },
    { name: 'VIOLET', color: '#b6a0f5', description: 'A deep, mystical violet.' },
    { name: 'CYAN', color: '#80dce9', description: 'A vibrant and energetic cyan.' },
    { name: 'LIME', color: '#dcf87b', description: 'A fresh and zesty lime green.' },
    { name: 'PINK', color: '#ff9deb', description: 'A striking and playful pink.' },
    { name: 'MINT', color: '#a5ad9a', description: 'A cool, refreshing mint green.' },
    { name: 'WHITE', color: '#ffffff', description: 'A pure and blinding white.' },
    { name: 'PEACH', color: '#ffbba6', description: 'A soft and warm peach tone.' }
  ];
  const COLORS = SKINS.map(s => s.color);
  const NAMES = SKINS.map(s => s.name);
  const PRESET_NAMES = ['ACE', 'APEX', 'BLAZE', 'BOLT', 'COMET', 'ECHO', 'FROST', 'GHOST', 'NOVA', 'ORBIT', 'PULSE', 'ROGUE', 'SHADOW', 'SPARK', 'STORM', 'TITAN', 'VIPER', 'VORTEX'];
  const BLOCKED_WORDS = ['FUCK', 'SHIT', 'BITCH', 'ASSHOLE', 'BASTARD', 'CUNT', 'DICK', 'COCK', 'PUSSY', 'SLUT', 'WHORE', 'PISS', 'CRAP', 'FAG', 'FAGGOT', 'NIGG', 'NIGGER', 'RETARD', 'NAZI', 'HITLER', 'RAPE', 'PORN', 'PENIS', 'VAGINA', 'JIZZ', 'TWAT', 'WANK', 'PRICK', 'DOUCHE', 'SKANK', 'CHINK', 'SPIC', 'KIKE', 'GOOK', 'WETBACK', 'COON', 'DYKE', 'TRANNY', 'SUICIDE', 'MURDER', 'TERROR', 'ADMIN', 'SYSTEM', 'MODERATOR'];
  const LEET = { '0': 'O', '1': 'I', '3': 'E', '4': 'A', '5': 'S', '7': 'T', '8': 'B' };
  const isUnsafeName = value => {
    const raw = value.replace(/[\s_-]+/g, '');
    const unleet = raw.replace(/[0134578]/g, c => LEET[c]);
    const squashedRaw = raw.replace(/(.)\1+/g, '$1');
    const squashedUnleet = unleet.replace(/(.)\1+/g, '$1');
    return BLOCKED_WORDS.some(w => raw.includes(w) || unleet.includes(w) || squashedRaw.includes(w) || squashedUnleet.includes(w));
  };
  const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
  const BOT_PROFILES = {
    easy: {reaction:.30,jitter:.16,control:.65,dashChance:.35,lead:0,arenaMargin:95,recovery:30,jumpDelay:.40,dodge:.05},
    normal: {reaction:.09,jitter:.09,control:1,dashChance:.75,lead:0,arenaMargin:75,recovery:60,jumpDelay:.23,dodge:.15},
    hard: {reaction:.045,jitter:.035,control:1,dashChance:.95,lead:.12,arenaMargin:90,recovery:100,jumpDelay:.12,dodge:.35},
  };
  class ArenaEngine {
    constructor(random = Math.random) { this.random = random; this.target = 3; this.shrinkTime = 18; this.lastStanding = 'round'; this.modes = ['keyboard', 'bot', 'bot', 'bot']; this.botDifficulties = ['normal', 'normal', 'normal', 'normal']; this.skins = [0, 1, 2, 3]; this.customColors = [null, null, null, null]; this.customNames = [null, null, null, null]; this.events = []; this.phase = 'lobby'; this.scores = [0, 0, 0, 0]; this.knockouts = [0, 0, 0, 0]; this.assists = [0, 0, 0, 0]; this.damageDealt = [0, 0, 0, 0]; this.knocks = [0, 0, 0, 0]; this.round = 1; this.makeRound(); this.phase = 'lobby'; }
    makeRound() {
      this.radius = 267; this.elapsed = 0; this.clock = 3; this.shrinking = false; this.roundWinner = null; this.hitPairs = new Map();
      this.players = [0, 1, 2, 3].map(id => {
        const angle = -Math.PI * .75 + id * Math.PI * .5;
        const skin = SKINS[this.skins[id]] || SKINS[id];
        return { id, name:this.customNames[id]||skin.name, color:this.customColors[id]||skin.color, skinIndex: this.skins[id], x:500+Math.cos(angle)*160, y:354+Math.sin(angle)*160, vx:0, vy:0, r:21, fx:-Math.cos(angle), fy:-Math.sin(angle), alive:true, damage:0, cooldown:0, dashTime:0, dashHeld:false, hit:new Set(), hitContributors:new Map(), fall:0, aiTime:.1+id*.05, aiX:0, aiY:0, aiDash:false };
      });
    }
    setSkin(id, skinIndex) {
      if(this.phase !== 'lobby') throw new Error('Return to the lobby before changing skins.');
      this.skins[id] = skinIndex % SKINS.length;
      this.customColors[id] = null;
      this.makeRound();
    }
    setColor(id, hex) {
      if(this.phase !== 'lobby') throw new Error('Return to the lobby before changing colors.');
      if(!Number.isInteger(id)||id<0||id>3) throw new Error('Choose a player from 1 to 4.');
      const value=typeof hex==='string'?hex.trim():'';
      if(!/^#?[0-9a-f]{6}$/i.test(value)) throw new Error('Use six hex digits, for example #12AB34.');
      this.customColors[id]='#'+value.replace(/^#/,'').toLowerCase();
      this.makeRound();
    }
    setName(id, name) {
      if(this.phase !== 'lobby') throw new Error('Return to the lobby before changing names.');
      if(!Number.isInteger(id)||id<0||id>3) throw new Error('Choose a player from 1 to 4.');
      const cleaned = typeof name === 'string' ? name.trim().replace(/\s+/g, ' ').toUpperCase() : '';
      if(cleaned.length < 2 || cleaned.length > 12) throw new Error('Enter a name between 2 and 12 characters.');
      if(!/^[A-Z0-9][A-Z0-9 _-]*[A-Z0-9]$/.test(cleaned) || !/[A-Z]/.test(cleaned)) throw new Error('Use only letters, numbers, spaces, hyphens, or underscores.');
      if(isUnsafeName(cleaned)) throw new Error('Choose a family-friendly fighter name.');
      if([0,1,2,3].some(other => other !== id && (this.customNames[other] || (SKINS[this.skins[other]] || SKINS[other]).name) === cleaned)) throw new Error('Each player must have a unique name.');
      this.customNames[id] = cleaned;
      this.makeRound();
    }
    resetName(id) {
      if(this.phase !== 'lobby') throw new Error('Return to the lobby before changing names.');
      if(!Number.isInteger(id)||id<0||id>3) throw new Error('Choose a player from 1 to 4.');
      this.customNames[id] = null;
      this.makeRound();
    }
    configure(modes, target, shrinkTime=18, lastStanding='round', botDifficulties=this.botDifficulties) {
      if(this.phase !== 'lobby') throw new Error('Return to the lobby before changing players.');
      if(!Array.isArray(modes) || modes.length!==4 || !modes.every(m=>m==='bot'||m==='keyboard'||/^gamepad[0-3]$/.test(m))) throw new Error('Choose four valid player controls.');
      if(![1,3,5].includes(target)) throw new Error('Round win target must be 1, 3, or 5.');
      if(![10,18,30,999].includes(shrinkTime)) throw new Error('Shrink time must be 10, 18, 30 seconds, or Never.');
      if(!['round','match'].includes(lastStanding)) throw new Error('Last one standing must win the round or match.');
      if(!Array.isArray(botDifficulties)||botDifficulties.length!==4||!Array.from(botDifficulties).every(level=>typeof level==='string'&&Object.hasOwn(BOT_PROFILES,level)))throw new Error('Choose Easy, Normal or Hard for each of the four bot slots.');
      const pads=modes.filter(m=>m.startsWith('gamepad')); if(new Set(pads).size!==pads.length) throw new Error('Each controller can control only one player.');
      this.modes=[...modes]; this.target=target; this.shrinkTime=shrinkTime; this.lastStanding=lastStanding;
      this.botDifficulties=[...botDifficulties];
    }
    botProfile(id) { return BOT_PROFILES[this.botDifficulties[id]]; }
    start() { this.scores=[0,0,0,0];this.knockouts=[0,0,0,0];this.assists=[0,0,0,0];this.damageDealt=[0,0,0,0];this.knocks=[0,0,0,0];this.round=1;this.events=[];this.makeRound();this.phase='countdown';this.emit('countdown',{number:3}); }
    lobby() { this.phase='lobby';this.scores=[0,0,0,0];this.knockouts=[0,0,0,0];this.assists=[0,0,0,0];this.damageDealt=[0,0,0,0];this.knocks=[0,0,0,0];this.round=1;this.events=[];this.makeRound();this.phase='lobby'; }
    pause() { if(['countdown','playing','roundOver'].includes(this.phase)){this.previousPhase=this.phase;this.phase='paused';return true;} return false; }
    resume() { if(this.phase==='paused'){this.phase=this.previousPhase;return true;} return false; }
    emit(type, data={}) { this.events.push({type,...data}); }
    drainEvents() { const out=this.events;this.events=[];return out; }
    recordHit(attacker,victim,amount) {
      const before=victim.damage;victim.damage=Math.min(250,before+amount);
      this.damageDealt[attacker.id]+=victim.damage-before;
      victim.lastHitBy=attacker.id;victim.lastHitTime=this.elapsed;
      victim.hitContributors.set(attacker.id,this.elapsed);
    }
    eliminatePlayer(p) {
      if(!p.alive)return;
      p.alive=false;p.fall=0;
      const recent=time=>Number.isFinite(time)&&this.elapsed-time>=0&&this.elapsed-time<6;
      const hitter=Number.isInteger(p.lastHitBy)&&p.lastHitBy>=0&&p.lastHitBy<4&&p.lastHitBy!==p.id&&recent(p.lastHitTime)?p.lastHitBy:undefined;
      const assistIds=[];
      if(hitter!==undefined){
        this.knockouts[hitter]++;
        for(const [id,time] of p.hitContributors)if(id!==hitter&&id!==p.id&&recent(time)){this.assists[id]++;assistIds.push(id);}
      }
      this.emit('eliminated',{id:p.id,x:p.x,y:p.y,lastHitBy:hitter,assistIds});
    }
    bot(p, dt) {
      const skill=this.botProfile(p.id);
      p.aiTime-=dt;
      if(p.aiTime<=0){
        p.aiTime=skill.reaction+this.random()*skill.jitter;
        const rivals=this.players.filter(q=>q.alive&&q.id!==p.id).sort((a,b)=>Math.hypot(a.x-p.x,a.y-p.y)-Math.hypot(b.x-p.x,b.y-p.y));
        const q=rivals[0];let x=500-p.x,y=354-p.y;
        if(q){const d=Math.hypot(q.x-p.x,q.y-p.y);const edge=Math.hypot(p.x-500,p.y-354);if(edge<this.radius-skill.arenaMargin){x=q.x+q.vx*skill.lead-p.x+(500-q.x)*.15;y=q.y+q.vy*skill.lead-p.y+(354-q.y)*.15;}p.aiDash=d<130&&d>34&&edge<this.radius-52&&this.random()>1-skill.dashChance;}
        const len=Math.hypot(x,y)||1;p.aiX=x/len*skill.control;p.aiY=y/len*skill.control;
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
      this.radius=this.shrinkTime===999?267:Math.max(0,267-Math.max(0,this.elapsed-this.shrinkTime)*4.8);
      if(this.elapsed>=this.shrinkTime&&!this.shrinking&&this.shrinkTime!==999){this.shrinking=true;this.emit('shrink');}
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
      for(const p of this.players){if(p.alive&&Math.hypot(p.x-500,p.y-354)>this.radius+p.r*.2){eliminated.push(p.id);this.eliminatePlayer(p);}}
      const alive=this.players.filter(p=>p.alive);
      if(alive.length<=1){this.roundWinner=alive[0]?.id??null;if(this.roundWinner!==null){if(this.lastStanding==='match')this.scores[this.roundWinner]=this.target;else this.scores[this.roundWinner]++;}this.phase='roundOver';this.clock=2.8;this.emit('roundOver',{winner:this.roundWinner,draw:alive.length===0});}
    }
    collide(a,b){
      if(!a.alive||!b.alive)return;
      let dx=b.x-a.x,dy=b.y-a.y,d=Math.hypot(dx,dy);if(d>=a.r+b.r)return;
      if(d<.001){dx=1;dy=0;d=1;}
      const nx=dx/d,ny=dy/d,overlap=a.r+b.r-d;
      const aApproach=a.vx*nx+a.vy*ny,bApproach=-(b.vx*nx+b.vy*ny);
      a.x-=nx*overlap*.5;a.y-=ny*overlap*.5;b.x+=nx*overlap*.5;b.y+=ny*overlap*.5;
      const relative=(b.vx-a.vx)*nx+(b.vy-a.vy)*ny;
      if(relative<0){const impulse=-relative*.72;a.vx-=nx*impulse;a.vy-=ny*impulse;b.vx+=nx*impulse;b.vy+=ny*impulse;}
      const key=a.id+':'+b.id;
      const ad=a.dashTime>0&&!a.hit.has(b.id),bd=b.dashTime>0&&!b.hit.has(a.id);
      if(ad||bd){
        if(ad){a.hit.add(b.id);this.knocks[a.id]++;this.recordHit(a,b,22);const force=690*(1+b.damage/150);b.vx+=nx*force;b.vy+=ny*force;a.vx-=nx*75;a.vy-=ny*75;}
        if(bd){b.hit.add(a.id);this.knocks[b.id]++;this.recordHit(b,a,22);const force=690*(1+a.damage/150);a.vx-=nx*force;a.vy-=ny*force;b.vx+=nx*75;b.vy+=ny*75;}
        this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:1});this.hitPairs.set(key,.3);
      }else if(!this.hitPairs.has(key)&&relative<-30){
        if(aApproach>10)this.knocks[a.id]++;
        if(bApproach>10)this.knocks[b.id]++;
        if(aApproach<=10&&bApproach<=10){this.knocks[a.id]++;this.knocks[b.id]++;}
        this.recordHit(b,a,4);this.recordHit(a,b,4);
        a.vx-=nx*(95+a.damage*.6);a.vy-=ny*(95+a.damage*.6);b.vx+=nx*(95+b.damage*.6);b.vy+=ny*(95+b.damage*.6);this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:.3});this.hitPairs.set(key,.3);
      }
    }
    snapshot(){return {phase:this.phase,round:this.round,target:this.target,shrinkTime:this.shrinkTime,lastStanding:this.lastStanding,elapsed:Math.round(this.elapsed*10)/10,radius:this.radius,scores:[...this.scores],knockouts:[...this.knockouts],assists:[...this.assists],damageDealt:[...this.damageDealt],knocks:[...this.knocks],modes:[...this.modes],botDifficulties:[...this.botDifficulties],skins:[...this.skins],customColors:[...this.customColors],customNames:[...this.customNames],players:this.players.map(({id,name,color,alive,damage,x,y,cooldown})=>({id,name,color,alive,damage,x,y,cooldown}))};}
  }
  if(typeof module!=='undefined'&&module.exports)module.exports={ArenaEngine,COLORS,NAMES,SKINS,PRESET_NAMES};
  else Object.assign(root,{ArenaEngine,PLAYER_COLORS:COLORS,PLAYER_NAMES:NAMES,PLAYER_SKINS:SKINS,PLAYER_PRESET_NAMES:PRESET_NAMES});
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Deterministic-step game logic independent of rendering. Upstream: original user game request; no previous implementation. Environment: browser or Node.js for simulation validation. Generated: 2026-09-11 America/New_York. New file: all lines.

// Updated: 2026-10-07 America/New_York. Changed lines 2, 21, 35-43, 72-73, 103-112: initialize/store/validate house rules, keep Never disabled, retain rules in snapshots and record dash/bump attacker timestamps. Purpose: patch reviewed rules/attribution while preserving incoming features. Upstream: existing simulation, browser UI and replay/control tests at 3d937e8. Environment: browser / Node 24+.

// Updated: 2026-10-11 America/New_York. Changed lines 2,21,27,33-41,120,128-129. Changes: constructor/makeRound retain four custom colors; setSkin resets its override; setColor validates lobby/player/full hex atomically; snapshot copies overrides and player colors. Purpose: independent custom fighter colors; upstream: preset skins and existing round lifecycle; environment: browser / Node 24.
// Updated: 2026-11-03 America/New_York. Changed lines 2,21,27,53-54,59-76,115,130-138: add match damage/assist totals, actual capped damage accounting, recent-hit contributors, shared elimination credit and isolated snapshots. Purpose: combat scoreboard scoring; upstream: existing collisions, KO attribution and match lifecycle; environment: browser / Node 24.
// Updated: 2026-11-03 America/New_York. Added PRESET_NAMES, safety checks, setName/resetName, and knock counter tracking.

// Updated: 2026-11-04 America/New_York. Changed lines 30-34, 36, 76, 82, 85, 87, 113, 116, 119-120, 178. Purpose: independent Easy/Normal/Hard bots and configuration compatibility. Changes: validated per-slot settings, difficulty-driven decisions, lobby/mode/replay retention or corresponding UI checks, according to this file. Upstream: existing engine/platformer bots and lobby/replay configuration. Environment: browser / Node 24+.
