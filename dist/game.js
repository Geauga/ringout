// game.js
// Request: Connect four-player knockout gameplay to canvas, local keyboard/gamepad/touch controls, sound, and match UI.
(() => {
  'use strict';
  const $=id=>document.getElementById(id),engine=new ArenaEngine(),canvas=$('arena'),ctx=canvas.getContext('2d');
  const keys=new Set(),effects=[],trails=[];
  const bindings=[['KeyW','KeyS','KeyA','KeyD','Space'],['ArrowUp','ArrowDown','ArrowLeft','ArrowRight','Enter'],['KeyI','KeyK','KeyJ','KeyL','KeyU'],['KeyT','KeyG','KeyF','KeyH','KeyR']];
  const hints=['W A S D  /  SPACE','ARROW KEYS  /  ENTER','I J K L  /  U','T F G H  /  R'];
  const allKeys=new Set(bindings.flat());
  let last=performance.now(),accumulator=0,visualTime=0,shake=0,soundEnabled=false,audioContext=null,announcementUntil=0,padSignature='',hudSignature='',touch={x:0,y:0,dash:false},helpWasRunning=false,lastCount='',lastPadCheck=0;
  const reducedMotion=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const pads=()=>Array.from(navigator.getGamepads?.()||[]).filter(p=>p&&p.connected&&p.mapping==='standard'&&p.index<4);
  function setupUI(){
    $('lineup').innerHTML=PLAYER_NAMES.map((name,i)=>`<div class="player-row" style="--player:${PLAYER_COLORS[i]}"><span class="fighter-avatar" aria-hidden="true"></span><div class="player-details"><div class="player-topline"><label class="player-name" for="player-${i}">${name[0]+name.slice(1).toLowerCase()}</label><span class="player-index">P${i+1}</span></div><select id="player-${i}" aria-label="Player ${i+1} controls"><option value="keyboard">Keyboard</option><option value="bot">Bot · ready to rumble</option></select><div class="control-hint" id="hint-${i}"></div></div></div>`).join('');
    for(let i=0;i<4;i++){$(`player-${i}`).value=engine.modes[i];$(`player-${i}`).addEventListener('change',configure);}
    $('win-target').addEventListener('change',configure);configure();drawScores();
  }
  function configure(){
    const modes=[0,1,2,3].map(i=>$(`player-${i}`).value),target=Number($('win-target').value);
    try{engine.configure(modes,target);}catch(error){announce(error.message,4);for(let i=0;i<4;i++)$(`player-${i}`).value=engine.modes[i];return;}
    for(let i=0;i<4;i++)$(`hint-${i}`).textContent=engine.modes[i]==='keyboard'?hints[i]:engine.modes[i]==='bot'?'AUTO-PILOT, NO MERCY':'LEFT STICK  /  A or ✕';
    const humans=engine.modes.filter(m=>m!=='bot').length;
    $('overlay-hint').textContent=`${humans} HUMAN${humans===1?'':'S'} + ${4-humans} BOT${4-humans===1?'':'S'} · FIRST TO ${target}`;
    drawScores();
  }
  function drawScores(){
    $('scoreboard').innerHTML=engine.players.map((p,i)=>`<div class="score-card ${!p.alive?'out':''}" style="--player:${p.color}" aria-label="${p.name}, ${engine.scores[i]} round wins, ${p.alive?p.damage+' percent damage':'eliminated'}"><span class="mini-fighter" aria-hidden="true"></span><div class="score-content"><div class="score-name">${p.name}</div><div class="score-pips">${Array.from({length:engine.target},(_,n)=>`<span class="pip ${n<engine.scores[i]?'won':''}"></span>`).join('')}</div></div><span class="damage">${p.alive?p.damage+'%':'OUT'}</span></div>`).join('');
  }
  function lockSetup(locked){for(let i=0;i<4;i++)$(`player-${i}`).disabled=locked;$('win-target').disabled=locked;$('reset').hidden=!locked;$('pause').disabled=!locked;}
  function resetInput(){keys.clear();touch={x:0,y:0,dash:false};$('touch-stick').style.transform='';}
  function start(){
    if(engine.phase==='paused'){resume();return;}
    resetInput();engine.start();effects.length=0;trails.length=0;lockSetup(true);$('overlay').hidden=true;$('announcement').textContent='';document.body.classList.add('playing');canvas.focus({preventScroll:true});initAudio();updateUI();
  }
  function lobby(){engine.lobby();resetInput();effects.length=0;trails.length=0;lockSetup(false);document.body.classList.remove('playing');$('overlay').hidden=false;$('overlay-kicker').textContent='FOUR ENTER. ONE STAYS.';$('overlay-title').innerHTML='LAST ONE<br><em>STANDING.</em>';$('overlay-description').innerHTML='Bump, dash, and send your friends flying.<br>Just don’t get too close to the edge.';$('start').innerHTML='LET’S RUMBLE <span aria-hidden="true">↗</span>';$('pause').innerHTML='Pause <kbd>Esc</kbd>';$('countdown').textContent='';$('announcement').textContent='';configure();updateUI();}
  function pause(message='Take a breather. Your rivals can wait.'){
    if(!engine.pause())return;resetInput();document.body.classList.remove('playing');$('overlay').hidden=false;$('overlay-kicker').textContent='TIME OUT';$('overlay-title').innerHTML='MATCH<br><em>PAUSED.</em>';$('overlay-description').textContent=message;$('start').innerHTML='KEEP PLAYING <span aria-hidden="true">↗</span>';$('pause').innerHTML='Resume <kbd>Esc</kbd>';$('countdown').textContent='';updateUI();
  }
  function resume(){
    const connected=pads();const missing=engine.modes.find(m=>m.startsWith('gamepad')&&!connected.some(p=>`gamepad${p.index}`===m));
    if(missing){$('overlay-description').textContent='Reconnect your controller, or return to the lobby to change controls.';return;}
    engine.resume();resetInput();$('overlay').hidden=true;$('pause').innerHTML='Pause <kbd>Esc</kbd>';document.body.classList.add('playing');canvas.focus({preventScroll:true});updateUI();
  }
  function announce(message,seconds=2.4){$('announcement').textContent=message;announcementUntil=visualTime+seconds;}
  function initAudio(){if(!audioContext&&soundEnabled){const Audio=window.AudioContext||window.webkitAudioContext;if(Audio)audioContext=new Audio();}if(audioContext?.state==='suspended')audioContext.resume().catch(e=>console.warn('Audio resume failed:',e));}
  function tone(frequency,duration=.12,type='sine',volume=.035){if(!soundEnabled||!audioContext)return;const osc=audioContext.createOscillator(),gain=audioContext.createGain(),now=audioContext.currentTime;osc.type=type;osc.frequency.setValueAtTime(frequency,now);osc.frequency.exponentialRampToValueAtTime(Math.max(30,frequency*.45),now+duration);gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+duration);osc.connect(gain);gain.connect(audioContext.destination);osc.start();osc.stop(now+duration);}
  function readInputs(){
    const connected=navigator.getGamepads?.()||[];
    return engine.modes.map((mode,i)=>{
      if(mode==='keyboard'){const b=bindings[i];let x=Number(keys.has(b[3]))-Number(keys.has(b[2])),y=Number(keys.has(b[1]))-Number(keys.has(b[0]));if(i===0){x+=touch.x;y+=touch.y;}return{x,y,dash:keys.has(b[4])||(i===0&&touch.dash)};}
      if(mode.startsWith('gamepad')){const pad=connected[Number(mode.slice(-1))];if(!pad)return{x:0,y:0,dash:false};let x=pad.axes[0]||0,y=pad.axes[1]||0;x=Math.abs(x)<.18?0:x;y=Math.abs(y)<.18?0:y;x+=(pad.buttons[15]?.pressed?1:0)-(pad.buttons[14]?.pressed?1:0);y+=(pad.buttons[13]?.pressed?1:0)-(pad.buttons[12]?.pressed?1:0);return{x,y,dash:!!pad.buttons[0]?.pressed};}
      return{x:0,y:0,dash:false};
    });
  }
  function updatePads(){
    const list=pads(),signature=list.map(p=>p.index+':'+p.id).join('|');if(signature===padSignature)return;padSignature=signature;
    $('controller-status').textContent=list.length?`${list.length} controller${list.length===1?'':'s'} connected`:'No controllers connected';
    for(let i=0;i<4;i++){
      const select=$(`player-${i}`),old=select.value;for(const option of Array.from(select.options))if(option.value.startsWith('gamepad'))option.remove();
      for(const pad of list){const option=document.createElement('option');option.value=`gamepad${pad.index}`;option.textContent=`Controller ${pad.index+1}`;select.add(option);}
      if(old.startsWith('gamepad')&&!list.some(p=>`gamepad${p.index}`===old)){
        if(engine.phase!=='lobby'){const option=document.createElement('option');option.value=old;option.textContent='Controller disconnected';select.add(option);select.value=old;pause('A controller disconnected. Reconnect it to continue.');}
        else{select.value='bot';configure();}
      }else select.value=old;
    }
  }
  function handleEvents(){for(const e of engine.drainEvents()){
    if(e.type==='countdown'){tone(340,.12);lastCount=String(e.number);}
    if(e.type==='go'){announce('GO GET THEM.',1.2);tone(710,.2);}
    if(e.type==='dash'){tone(140,.1,'sawtooth',.015);}
    if(e.type==='hit'){shake=Math.max(shake,e.power*7);for(let i=0;i<10+e.power*8;i++){const a=Math.random()*Math.PI*2,s=50+Math.random()*230;effects.push({x:e.x,y:e.y,vx:Math.cos(a)*s,vy:Math.sin(a)*s,life:.25+Math.random()*.2,max:.45,color:'#f0f7c7',size:2+Math.random()*3});}tone(100,.1,'square',.025);}
    if(e.type==='eliminated'){const p=engine.players[e.id];announce(`${p.name} WENT OVER THE EDGE.`,2);tone(170,.4,'triangle');for(let i=0;i<22;i++){const a=Math.random()*Math.PI*2;effects.push({x:e.x,y:e.y,vx:Math.cos(a)*120,vy:Math.sin(a)*120,life:.7,max:.7,color:p.color,size:3});}}
    if(e.type==='shrink'){announce('THE ARENA IS SHRINKING. KEEP MOVING.',3);tone(260,.35,'triangle');}
    if(e.type==='roundOver'){announce(e.draw?'DOUBLE KNOCKOUT. NO POINTS THIS ROUND.':`${PLAYER_NAMES[e.winner]} TAKES ROUND ${engine.round}!`,2.7);tone(540,.25,'triangle');}
    if(e.type==='matchOver'){
      lockSetup(true);$('pause').disabled=true;document.body.classList.remove('playing');$('overlay').hidden=false;$('overlay-kicker').textContent='WE HAVE A WINNER';$('overlay-title').innerHTML=`${PLAYER_NAMES[e.winner]}<br><em>WINS IT.</em>`;$('overlay-description').textContent=`${engine.scores[e.winner]} round wins. The arena has a new champion.`;$('start').innerHTML='RUN IT BACK <span aria-hidden="true">↗</span>';$('overlay-hint').textContent='SAME LINEUP. FRESH GRUDGES.';tone(880,.55,'triangle');
      for(let i=0;i<90;i++)effects.push({x:500,y:240,vx:(Math.random()-.5)*600,vy:-Math.random()*350,life:2+Math.random()*2,max:4,color:PLAYER_COLORS[i%4],size:3+Math.random()*3,gravity:140});
    }
  }}
  function updateUI(){
    const signature=engine.players.map(p=>p.damage+':'+p.alive).join('|')+engine.scores.join('|')+engine.target;if(signature!==hudSignature){drawScores();hudSignature=signature;}
    $('round-label').textContent=engine.phase==='lobby'?'WARM-UP':`ROUND ${String(engine.round).padStart(2,'0')}`;
    const sec=Math.floor(engine.elapsed);$('timer').textContent=`${String(Math.floor(sec/60)).padStart(2,'0')}:${String(sec%60).padStart(2,'0')}`;
    $('arena-note').textContent=engine.shrinking?'ARENA SHRINKING':engine.phase==='lobby'?'WATCH YOUR STEP':`SHRINKS IN ${Math.max(0,18-sec)} SEC`;
    $('arena-note').style.color=engine.shrinking?'#dcf87b':'';
    $('countdown').textContent=engine.phase==='countdown'?Math.max(1,Math.ceil(engine.clock)):'';
    $('match-status').textContent=({lobby:'READY WHEN YOU ARE',countdown:'GET READY',playing:`${engine.players.filter(p=>p.alive).length} FIGHTERS REMAIN`,paused:'MATCH PAUSED',roundOver:'ROUND COMPLETE',matchOver:'BRAGGING RIGHTS SECURED'})[engine.phase];
  }
  function circle(x,y,r,color){ctx.beginPath();ctx.arc(x,y,Math.max(0,r),0,Math.PI*2);ctx.fillStyle=color;ctx.fill();}
  function drawPlatform(){
    const r=engine.radius,cx=500,cy=354;
    ctx.save();ctx.strokeStyle='#8ba0c109';ctx.lineWidth=1;
    for(let x=0;x<=1000;x+=40){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,720);ctx.stroke();}
    for(let y=0;y<=720;y+=40){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(1000,y);ctx.stroke();}
    ctx.strokeStyle='#606d8918';ctx.setLineDash([3,9]);ctx.beginPath();ctx.arc(cx,cy,315,0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    // These circles and markings are the actual playable boundary and game-state indicators.
    circle(cx,cy+24,r+10,'#0e121b');circle(cx,cy+13,r+6,'#48514b');circle(cx,cy+4,r+6,engine.shrinking?'#adbd6c':'#929e77');
    const floor=ctx.createRadialGradient(cx-90,cy-120,10,cx,cy,Math.max(r,1));floor.addColorStop(0,'#536273');floor.addColorStop(1,'#394754');circle(cx,cy,r,floor);
    ctx.save();ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.clip();ctx.strokeStyle='#d4dfef10';ctx.lineWidth=1;
    for(let x=200;x<=800;x+=43){ctx.beginPath();ctx.moveTo(x,60);ctx.lineTo(x,650);ctx.stroke();}for(let y=53;y<700;y+=43){ctx.beginPath();ctx.moveTo(180,y);ctx.lineTo(820,y);ctx.stroke();}ctx.restore();
    ctx.lineWidth=5;ctx.strokeStyle=engine.shrinking?'#dff18a':'#a8b799';ctx.beginPath();ctx.arc(cx,cy,Math.max(0,r-7),0,Math.PI*2);ctx.stroke();
    ctx.lineWidth=2;ctx.strokeStyle='#c3cfbe35';ctx.setLineDash([6,10]);ctx.beginPath();ctx.arc(cx,cy,Math.max(0,r-23),0,Math.PI*2);ctx.stroke();ctx.setLineDash([]);
    ctx.save();ctx.translate(cx,cy);ctx.rotate(-Math.PI/6);ctx.strokeStyle='#b9c9d02b';ctx.lineWidth=14;ctx.beginPath();ctx.arc(0,0,51,.3,Math.PI*1.95);ctx.stroke();ctx.restore();
    for(let i=0;i<8;i++){const a=i*Math.PI/4;ctx.save();ctx.translate(cx+Math.cos(a)*(r-10),cy+Math.sin(a)*(r-10));ctx.rotate(a);ctx.fillStyle='#202c38';ctx.fillRect(-10,-3,14,6);ctx.restore();}
    ctx.fillStyle='#637187';ctx.textAlign='center';ctx.font='600 10px "DM Sans", sans-serif';ctx.letterSpacing='3px';ctx.fillText('MIND THE GAP',500,696);ctx.letterSpacing='0px';ctx.restore();
  }
  function drawPlayer(p){
    if(!p.alive&&p.fall>.7)return;
    const lobby=engine.phase==='lobby',bob=lobby?Math.sin(visualTime*2+p.id*1.8)*4:0;let x=p.x,y=p.y+bob;
    if(!p.alive){x+=p.vx*p.fall*.16;y+=p.vy*p.fall*.16+p.fall*p.fall*100;}
    ctx.save();ctx.translate(x,y);if(!p.alive){const scale=Math.max(.05,1-p.fall*1.3);ctx.scale(scale,scale);ctx.globalAlpha=Math.max(0,1-p.fall*1.4);}
    ctx.save();ctx.scale(1,.48);circle(2,34,24,'#10182470');ctx.restore();
    if(p.alive&&p.cooldown>0){ctx.strokeStyle=p.color+'90';ctx.lineWidth=3;ctx.beginPath();ctx.arc(0,0,29,-Math.PI/2,-Math.PI/2+(1-p.cooldown/1.25)*Math.PI*2);ctx.stroke();}
    else if(p.alive){ctx.strokeStyle=p.color+'55';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,28,0,Math.PI*2);ctx.stroke();}
    circle(0,4,22,'#192434');circle(0,0,22,p.color);circle(-5,-8,9,'#ffffff18');
    // Facing eyes convey dash direction; the lower marker identifies the player's slot.
    const ex=p.fx*5,ey=p.fy*5;ctx.fillStyle='#253143';for(const offset of [-5,5]){ctx.beginPath();ctx.ellipse(ex+offset,ey-2,2.4,3.8,0,0,Math.PI*2);ctx.fill();}
    ctx.strokeStyle='#253143';ctx.lineWidth=1.8;ctx.beginPath();ctx.arc(ex,ey+3,4,.2,Math.PI-.2);ctx.stroke();
    ctx.textAlign='center';ctx.font='700 11px "DM Sans", sans-serif';ctx.fillStyle='#edf1f7';ctx.shadowColor='#122030';ctx.shadowBlur=5;ctx.fillText(`P${p.id+1}`,0,-38);ctx.shadowBlur=0;
    if(engine.phase==='playing'&&p.alive){ctx.font='700 10px "DM Sans",sans-serif';ctx.fillStyle=p.color;ctx.fillText(`${p.damage}%`,0,43);}
    ctx.restore();
  }
  function render(dt){
    const rect=canvas.getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2),w=Math.round(rect.width*dpr),h=Math.round(rect.height*dpr);if(canvas.width!==w||canvas.height!==h){canvas.width=w;canvas.height=h;}
    ctx.setTransform(canvas.width/1000,0,0,canvas.height/720,0,0);ctx.clearRect(0,0,1000,720);ctx.fillStyle='#1a202b';ctx.fillRect(0,0,1000,720);
    ctx.save();if(!reducedMotion&&shake>0)ctx.translate((Math.random()-.5)*shake,(Math.random()-.5)*shake);shake=Math.max(0,shake-dt*35);drawPlatform();
    for(let i=trails.length-1;i>=0;i--){const t=trails[i];t.life-=dt;if(t.life<=0){trails.splice(i,1);continue;}ctx.globalAlpha=t.life/.2*.32;circle(t.x,t.y,19*t.life/.2,t.color);}ctx.globalAlpha=1;
    for(const p of engine.players){if(p.dashTime>0&&p.alive&&engine.phase==='playing'&&!reducedMotion)trails.push({x:p.x,y:p.y,life:.2,color:p.color});drawPlayer(p);}
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.life<=0){effects.splice(i,1);continue;}e.x+=e.vx*dt;e.y+=e.vy*dt;e.vy+=(e.gravity||0)*dt;ctx.globalAlpha=Math.min(1,e.life/e.max);ctx.fillStyle=e.color;ctx.fillRect(e.x,e.y,e.size,e.size);}ctx.globalAlpha=1;ctx.restore();
  }
  function frame(now){const dt=Math.min((now-last)/1000,.05);last=now;visualTime+=dt;accumulator+=dt;const inputs=readInputs();while(accumulator>=1/120){engine.step(1/120,inputs);accumulator-=1/120;}handleEvents();updateUI();if(visualTime>announcementUntil)$('announcement').textContent='';if(now-lastPadCheck>750){updatePads();lastPadCheck=now;}render(dt);requestAnimationFrame(frame);}
  document.addEventListener('keydown',e=>{
    const formTarget=/^(INPUT|SELECT|TEXTAREA|BUTTON)$/.test(e.target.tagName);if(e.code==='Escape'&&!$('help-dialog').open){e.preventDefault();if(engine.phase==='paused')resume();else pause();return;}
    if(!formTarget&&!$('help-dialog').open&&allKeys.has(e.code)){if(engine.phase!=='lobby'){e.preventDefault();keys.add(e.code);}}
  });
  document.addEventListener('keyup',e=>keys.delete(e.code));
  window.addEventListener('blur',()=>{pause('The game paused while you were away.');resetInput();});
  document.addEventListener('visibilitychange',()=>{if(document.hidden){pause('The game paused while you were away.');resetInput();}});
  $('start').addEventListener('click',start);$('pause').addEventListener('click',()=>engine.phase==='paused'?resume():pause());$('reset').addEventListener('click',lobby);
  $('sound').addEventListener('click',()=>{soundEnabled=!soundEnabled;initAudio();$('sound').textContent=soundEnabled?'Sound on':'Sound off';$('sound').setAttribute('aria-label',soundEnabled?'Mute sound':'Enable sound');$('sound').setAttribute('aria-pressed',String(soundEnabled));if(soundEnabled)tone(500,.12);});
  $('help').addEventListener('click',()=>{helpWasRunning=['playing','countdown','roundOver'].includes(engine.phase);if(helpWasRunning)pause();$('help-dialog').showModal();});
  $('close-help').addEventListener('click',()=>$('help-dialog').close());$('got-it').addEventListener('click',()=>$('help-dialog').close());$('help-dialog').addEventListener('close',()=>{if(helpWasRunning)resume();helpWasRunning=false;});
  const touchPad=$('touch-pad');let touchPointer=null;
  function moveTouch(e){if(e.pointerId!==touchPointer)return;const rect=touchPad.getBoundingClientRect();let x=(e.clientX-rect.left-rect.width/2)/(rect.width*.36),y=(e.clientY-rect.top-rect.height/2)/(rect.height*.36);const d=Math.hypot(x,y);if(d>1){x/=d;y/=d;}touch.x=x;touch.y=y;$('touch-stick').style.transform=`translate(${x*rect.width*.28}px,${y*rect.height*.28}px)`;}
  touchPad.addEventListener('pointerdown',e=>{e.preventDefault();touchPointer=e.pointerId;touchPad.setPointerCapture(e.pointerId);moveTouch(e);});touchPad.addEventListener('pointermove',moveTouch);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])touchPad.addEventListener(event,e=>{if(e.pointerId===touchPointer){touchPointer=null;touch.x=0;touch.y=0;$('touch-stick').style.transform='';}});
  $('touch-dash').addEventListener('pointerdown',e=>{e.preventDefault();$('touch-dash').setPointerCapture(e.pointerId);touch.dash=true;});for(const event of ['pointerup','pointercancel','lostpointercapture'])$('touch-dash').addEventListener(event,()=>{touch.dash=false;});
  window.addEventListener('gamepadconnected',updatePads);window.addEventListener('gamepaddisconnected',updatePads);
  // Optional browser agent tools invoke the same configuration and match controls as the visible UI.
  if(document.modelContext?.registerTool){
    const lifecycle=new AbortController();window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
    const register=tool=>{try{Promise.resolve(document.modelContext.registerTool(tool,{signal:lifecycle.signal})).catch(error=>console.warn('Game tool registration failed:',error));}catch(error){console.warn('Game tool registration failed:',error);}};
    register({name:'read_match_state',title:'Read Ringout match state',description:'Read the current round, player controls, damage, positions, and scores.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:true,untrustedContentHint:false},execute:()=>engine.snapshot()});
    register({name:'configure_match',title:'Configure Ringout lobby',description:'Set the four player slots to keyboard or bot and select the round win target while in the lobby.',inputSchema:{type:'object',properties:{modes:{type:'array',items:{type:'string',enum:['keyboard','bot']},minItems:4,maxItems:4},target:{type:'integer',enum:[1,3,5]}},required:['modes','target'],additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:input=>{if(!input||!Array.isArray(input.modes)||input.modes.some(m=>!['keyboard','bot'].includes(m)))throw new Error('Provide four keyboard or bot slots.');engine.configure(input.modes,input.target);for(let i=0;i<4;i++)$(`player-${i}`).value=engine.modes[i];$('win-target').value=String(engine.target);configure();return engine.snapshot();}});
    register({name:'start_match',title:'Start Ringout match',description:'Start a new match from the lobby or completed match screen using the selected controls.',inputSchema:{type:'object',properties:{},additionalProperties:false},annotations:{readOnlyHint:false,untrustedContentHint:false},execute:()=>{if(!['lobby','matchOver'].includes(engine.phase))throw new Error('A match is already in progress.');start();return engine.snapshot();}});
  }
  setupUI();updatePads();requestAnimationFrame(frame);
})();
// Purpose: Render and operate the playable game. Upstream: engine.js (simulation) and index.html (interface). Environment: modern browser, standard gamepad API, optional Web Audio and WebMCP. Generated: 2026-09-11 America/New_York. New file: all lines.
