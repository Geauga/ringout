// test-controls.cjs
// Request: Verify Teams mode, adjustable player count (2-4) and bot difficulty controls alongside existing browser input, scoreboard, name and replay behavior.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ArenaEngine, COLORS, NAMES, SKINS, PRESET_NAMES, TEAM_NAMES } = require('./game/engine.js');
const { PlatformerEngine } = require('./game/platformer.js');
const Maps = require('./game/maps.js');
const RingoutReplay = require('./game/replay.js');

function browserHarness(mode, map = Maps.presets[0]) {
  const elements = new Map(), tools = new Map();
  let document, connected = [], frame, now = 0, platformEngine, arenaEngine;
  class ObservedArena extends ArenaEngine { constructor(...args) { super(...args); arenaEngine = this; } }
  class ObservedPlatformer extends PlatformerEngine { constructor(...args) { super(...args); platformEngine = this; } }
  function eventTarget(target = {}) {
    const listeners = new Map();
    target.addEventListener = (type, handler) => {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    };
    target.dispatch = (type, event = {}) => {
      event.target ??= target;
      event.currentTarget = target;
      event.preventDefault ??= () => {};
      for (const handler of listeners.get(type) || []) handler(event);
    };
    return target;
  }
  function element(id = '') {
    const select = id.startsWith('player-') || id.startsWith('difficulty-') || id.startsWith('team-') || id.startsWith('skin-') || id.startsWith('name-select-') || ['win-target','shrink-time','last-standing','player-count','team-mode'].includes(id);
    return eventTarget({
      id, tagName: id === 'arena' ? 'CANVAS' : select ? 'SELECT' : /^(hex|color|name)-/.test(id) ? 'INPUT' : 'BUTTON', attributes: {},
      value: id === 'win-target' ? '3' : id === 'shrink-time' ? '18' : id === 'last-standing' ? 'round' : id === 'player-count' ? '4' : id === 'team-mode' ? 'ffa' : 'keyboard', options: [], style: { setProperty(name, value) { this[name] = value; } }, hidden: false, open: false,
      classList: { add() {}, remove() {}, toggle() {} },
      focus() { document.activeElement = this; },
      setAttribute(name,value) { this.attributes[name]=String(value); },
      setPointerCapture() {},
      getBoundingClientRect() { return { left: 0, top: 0, width: 1000, height: 720 }; },
      getContext() {
        const gradient = { addColorStop() {} };
        return new Proxy({}, { get: (target, name) => target[name] ?? (() => gradient) });
      },
      add(option) { option.parent = this; this.options.push(option); },
      remove() {
        const parent = this.parent;
        parent.options = parent.options.filter(option => option !== this);
        if (parent.value === this.value) parent.value = parent.options[0]?.value || '';
      },
    });
  }
  function get(id) {
    if (!elements.has(id)) {
      const node = element(id);
      if (id.startsWith('player-')) {
        for (const value of ['keyboard', 'bot']) { const option = element(); option.value = value; node.add(option); }
      }
      elements.set(id, node);
    }
    return elements.get(id);
  }
  document = eventTarget({
    getElementById: get, createElement: () => element(), body: element('body'),
    modelContext: { registerTool(tool) { tools.set(tool.name, tool); } },
  });
  const window = eventTarget();
  vm.runInNewContext(fs.readFileSync(require.resolve('./game/game.js'), 'utf8'), {
    document, window, navigator: { getGamepads: () => connected },
    performance: { now: () => now }, matchMedia: () => ({ matches: false }), devicePixelRatio: 1,
    requestAnimationFrame: callback => { frame = callback; }, AbortController, console,
    ArenaEngine: ObservedArena, PlatformerEngine: ObservedPlatformer, RingoutReplay, PLAYER_COLORS: COLORS, PLAYER_SKINS: SKINS, PLAYER_NAMES: NAMES, PLAYER_PRESET_NAMES: PRESET_NAMES, TEAM_NAMES,
    RingoutMaps: { ...Maps, presets: [map] },
  }, { filename: 'game/game.js' });
  const snapshot = () => tools.get('read_match_state').execute();
  const click = id => { get(id).focus(); get(id).dispatch('click'); };
  const tick = seconds => {
    for (let i = 0; i < Math.ceil(seconds * 120); i++) { now += 1000 / 120; frame(now); }
  };
  const key = (type, code) => document.dispatch(type, { code, target: document.activeElement });
  const setPads = list => { connected = list; window.dispatch(list.length ? 'gamepadconnected' : 'gamepaddisconnected'); };
  const configure = modes => { modes.forEach((value, i) => { get(`player-${i}`).value = value; }); get('player-0').dispatch('change'); };
  if (mode === 'platformer') click('mode-platformer');
  return { document, get, snapshot, click, tick, key, setPads, configure, tools, get engine() { return mode==='platformer'?platformEngine:arenaEngine; } };
}

for (const mode of ['arena', 'platformer']) {
  const ui = browserHarness(mode);
  ui.configure(['keyboard', 'keyboard', 'keyboard', 'keyboard']);
  ui.click('sound');
  assert.equal(ui.document.activeElement.id, 'sound', 'lobby controls retain normal focus');
  ui.click('start');
  ui.tick(3.1);
  assert.equal(ui.snapshot().phase, 'playing');
  for (let toggle = 0; toggle < 2; toggle++) {
    ui.click('sound');
    assert.equal(ui.document.activeElement.id, 'arena', 'sound on/off returns focus to gameplay');
    const before = ui.snapshot().players[0].x;
    ui.key('keydown', 'KeyD'); ui.tick(.06); ui.key('keyup', 'KeyD');
    assert(ui.snapshot().players[0].x > before, 'keyboard movement still reaches the simulation');
  }
  ui.key('keydown', 'Enter'); ui.tick(.02); ui.key('keyup', 'Enter');
  assert(ui.snapshot().players[1].cooldown > 0, 'Player 2 Enter still dashes after toggling sound');
  ui.click('pause'); ui.click('sound');
  assert.equal(ui.snapshot().phase, 'paused', 'sound does not resume a paused match');
  assert.equal(ui.document.activeElement.id, 'sound', 'paused controls retain normal focus');
  console.log(`PASS: ${mode} sound toggles preserve movement and dash controls`);

  ui.click('reset');
  const pad = { index: 0, id: 'Test controller', mapping: 'standard', connected: true, axes: [0, 0], buttons: [] };
  ui.setPads([pad]);
  ui.configure(['gamepad0', 'keyboard', 'keyboard', 'keyboard']);
  ui.click('start');
  ui.setPads([]);
  assert.equal(ui.snapshot().phase, 'paused', 'disconnect pauses the match');
  ui.click('start');
  assert.equal(ui.snapshot().phase, 'paused', 'missing controller cannot resume');
  ui.click('reset');
  ui.click('start'); ui.tick(.8);
  assert.equal(ui.snapshot().phase, 'lobby', 'missing controller cannot start after returning to the lobby');
  assert.equal(ui.get('overlay').hidden, false);
  assert.match(ui.get('overlay-description').textContent, /Reconnect your controller/);
  ui.setPads([pad]); ui.click('start');
  assert.equal(ui.snapshot().phase, 'countdown', 'reconnected controller can start');
  ui.setPads([]); ui.click('reset');
  ui.configure(['keyboard', 'keyboard', 'keyboard', 'keyboard']); ui.click('start');
  assert.equal(ui.snapshot().phase, 'countdown', 'changing the unavailable controller assignment allows starting');
  console.log(`PASS: ${mode} controller disconnect, blocked start/resume, reconnection and reassignment`);
}
for (const mode of ['arena', 'platformer']) {
  const ui = browserHarness(mode), skins = [6, 7, 8, 9];
  const modes = ['keyboard', 'bot', 'keyboard', 'bot'];
  ui.configure(modes); ui.get('win-target').value = '5'; ui.get('win-target').dispatch('change');
  skins.forEach((skin, i) => {
    ui.get(`skin-${i}`).value = String(skin); ui.get(`skin-${i}`).dispatch('change');
    assert.match(ui.get('scoreboard').innerHTML, new RegExp(SKINS[skin].name), 'skin changes immediately refresh score names');
    assert(ui.get('scoreboard').innerHTML.includes(SKINS[skin].color), 'score color follows the selected skin');
  });
  for (const nextMode of ['platformer', 'arena', mode]) {
    ui.click('mode-' + nextMode);
    assert.deepEqual(Array.from(ui.snapshot().skins), skins, 'mode switches preserve all four skins');
    assert.deepEqual(Array.from(ui.snapshot().players, p => p.name), skins.map(skin => SKINS[skin].name));
    assert.deepEqual(Array.from(ui.snapshot().modes), modes); assert.equal(ui.snapshot().target, 5);
  }
  ui.click('start');
  for (const phase of ['countdown', 'playing', 'paused']) {
    if (phase === 'playing') ui.tick(3.1);
    if (phase === 'paused') ui.click('pause');
    assert.equal(ui.snapshot().phase, phase);
    for (let i = 0; i < 4; i++) assert.equal(ui.get(`skin-${i}`).disabled, true, 'skins stay locked throughout a match');
  }
  ui.click('reset');
  for (let i = 0; i < 4; i++) assert.equal(ui.get(`skin-${i}`).disabled, false, 'returning to the lobby unlocks skins');
  assert.deepEqual(Array.from(ui.snapshot().skins), skins);
  console.log(`PASS: ${mode} skins refresh scores, survive mode changes and lock during matches`);
}
const dropMap={name:'Input test ledge',platforms:[{id:'floor',x:100,y:600,w:800},{id:'ledge',x:200,y:420,w:600,dropThrough:true}]};
const standOnLedge=ui=>ui.engine.players.forEach((p,i)=>Object.assign(p,{x:270+i*150,y:399,vx:0,vy:0,grounded:true,support:'ledge'}));
const keyboard=browserHarness('platformer',dropMap);
keyboard.configure(['keyboard','keyboard','keyboard','keyboard']);keyboard.click('start');keyboard.tick(3.1);standOnLedge(keyboard);
for(const [i,key] of ['KeyS','ArrowDown','KeyK','KeyG'].entries()){
  keyboard.key('keydown',key);keyboard.tick(.02);keyboard.key('keyup',key);
  assert.equal(keyboard.engine.players[i].dropPlatform,'ledge',`Player ${i+1} Down key drops through`);
}
const touch=browserHarness('platformer',dropMap);touch.configure(['keyboard','keyboard','keyboard','keyboard']);touch.click('start');touch.tick(3.1);standOnLedge(touch);
touch.get('touch-pad').dispatch('pointerdown',{pointerId:1,clientX:500,clientY:650});touch.tick(.02);
assert.equal(touch.engine.players[0].dropPlatform,'ledge','touch stick down drops through');
touch.get('touch-pad').dispatch('pointerup',{pointerId:1});
for(const useStick of [false,true]){
  const ui=browserHarness('platformer',dropMap);
  const pad={index:0,id:'Drop test controller',mapping:'standard',connected:true,axes:[0,0],buttons:Array.from({length:16},()=>({pressed:false}))};
  ui.setPads([pad]);ui.configure(['gamepad0','keyboard','keyboard','keyboard']);ui.click('start');ui.tick(3.1);standOnLedge(ui);
  if(useStick)pad.axes[1]=1;else pad.buttons[13].pressed=true;
  ui.tick(.02);assert.equal(ui.engine.players[0].dropPlatform,'ledge',`${useStick?'stick':'D-pad'} down drops through`);
}
console.log('PASS: all four Down keys, controller stick/D-pad and touch stick trigger selected-ledge drop-through');
console.log('All browser-control regression checks passed using simulated DOM and gamepad events.');
for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode,Maps.presets[4]);ui.configure(['keyboard','keyboard','keyboard','keyboard']);
  assert.equal(ui.get('watch-replay').disabled,true);ui.get('win-target').value='1';ui.get('win-target').dispatch('change');ui.click('start');ui.tick(3.2);
  ui.engine.players.slice(1).forEach(p=>p.alive=false);ui.tick(3);
  assert.equal(ui.snapshot().phase,'matchOver');assert.equal(ui.snapshot().replay.available,true);const live=JSON.stringify(ui.engine.snapshot());
  ui.click('watch-replay');assert.equal(ui.snapshot().replay.watching,true);assert.equal(ui.get('overlay').hidden,true);assert.equal(ui.get('skin-0').disabled,true);
  for(const rule of ['shrink-time','last-standing'])assert.equal(ui.get(rule).disabled,true,'incoming rule choices are locked during replays');
  assert.throws(()=>ui.tools.get('configure_match').execute({modes:['bot','bot','bot','bot'],target:1}),/Exit the replay/);
  ui.tick(.5);ui.click('replay-play');const paused=ui.snapshot().replay.time;ui.tick(1);assert.equal(ui.snapshot().replay.time,paused);
  ui.get('replay-seek').value='1';ui.get('replay-seek').dispatch('input');assert.equal(ui.snapshot().replay.time,1);
  ui.get('replay-speed').value='2';ui.get('replay-speed').dispatch('change');ui.click('replay-play');ui.tick(.25);assert(Math.abs(ui.snapshot().replay.time-1.5)<.01);
  ui.key('keydown','KeyD');ui.tick(.1);ui.key('keyup','KeyD');assert.equal(JSON.stringify(ui.engine.snapshot()),live,'replay input/playback preserves final simulation');
  ui.get('replay-seek').value=ui.get('replay-seek').max;ui.get('replay-seek').dispatch('input');assert.equal(ui.snapshot().replay.time,ui.snapshot().replay.duration,'slider maximum reaches the exact final frame');assert.equal(ui.snapshot().replay.playing,false);
  ui.document.dispatch('visibilitychange');ui.click('replay-restart');assert.equal(ui.snapshot().replay.time,0);ui.click('exit-replay');assert.equal(ui.snapshot().phase,'matchOver');assert.equal(ui.get('overlay').hidden,false);
  ui.click('reset');ui.click('watch-replay');ui.click('exit-replay');assert.equal(ui.snapshot().phase,'lobby');assert.equal(ui.get('mode-arena').disabled,false);
  ui.click('start');ui.tick(.5);ui.click('reset');assert.equal(ui.snapshot().replay.available,true,'stopped matches can be replayed');
  console.log(`PASS: ${mode} completed/stopped replay, seek/speed/pause/exit and input isolation`);
}
for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode);ui.configure(['keyboard','keyboard','keyboard','keyboard']);
  ui.get('win-target').value='1';ui.get('win-target').dispatch('change');ui.click('start');ui.tick(3.2);
  ui.engine.players.slice(1).forEach(p=>p.alive=false);ui.tick(3);ui.click('reset');
  const pad={index:0,id:'Replay disconnect test',mapping:'standard',connected:true,axes:[0,0],buttons:[]};
  ui.setPads([pad]);ui.configure(['gamepad0','keyboard','keyboard','keyboard']);ui.click('watch-replay');
  const live=JSON.stringify(ui.engine.snapshot());ui.setPads([]);
  assert.equal(JSON.stringify(ui.engine.snapshot()),live,'replay disconnect must preserve the live lobby and assignments');
  assert.equal(ui.snapshot().replay.playing,false,'controller disconnect pauses lobby replay');
  const time=ui.snapshot().replay.time;ui.tick(.2);assert.equal(ui.snapshot().replay.time,time);
  assert.equal(ui.get('player-0').disabled,true);
  ui.setPads([pad]);assert.equal(ui.snapshot().replay.playing,false,'reconnection does not automatically resume playback');
  assert.equal(ui.get('player-0').value,'gamepad0');ui.setPads([]);ui.click('exit-replay');ui.click('start');
  assert.equal(ui.snapshot().phase,'lobby','missing controller cannot start after exiting a replay');
  ui.setPads([pad]);ui.click('start');assert.equal(ui.snapshot().phase,'countdown');
  console.log(`PASS: ${mode} lobby replay disconnect preserves setup, pauses playback and supports reconnection`);
}
for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode);ui.configure(['keyboard','keyboard','keyboard','keyboard']);
  ui.get('win-target').value='5';ui.get('win-target').dispatch('change');
  ui.get('shrink-time').value='30';ui.get('shrink-time').dispatch('change');
  ui.get('last-standing').value='match';ui.get('last-standing').dispatch('change');
  for(const next of ['arena','platformer',mode]){
    ui.click('mode-'+next);assert.equal(ui.snapshot().shrinkTime,30);assert.equal(ui.snapshot().lastStanding,'match');
  }
  assert.match(ui.get('help-description').textContent,/after 30 seconds/);ui.click('start');ui.tick(3.1);
  assert.equal(ui.get('arena-note').textContent,'SHRINKS IN 30 SEC');
  const [a,b]=ui.engine.players,y=mode==='platformer'?519:354;
  Object.assign(a,{x:480,y,vx:900,vy:0,dashTime:.1});Object.assign(b,{x:510,y,vx:0,vy:0});ui.engine.collide(a,b);
  b.x=2000;ui.tick(.02);assert.equal(ui.snapshot().knockouts[0],1);assert.equal(ui.snapshot().knocks[0],1);
  assert.match(ui.get('announcement').textContent,/CORAL KNOCKED OUT BLUE/);assert.match(ui.get('scoreboard').innerHTML,/1 KNOCKS/);assert.match(ui.get('scoreboard').innerHTML,/1 KOs/);
  ui.engine.players.slice(2).forEach(p=>{p.x=2000;});ui.tick(3);
  assert.equal(ui.snapshot().phase,'matchOver');assert.equal(ui.snapshot().scores[0],5);
  assert.match(ui.get('overlay-description').textContent,/1 knocks · 1 KOs/);
  ui.click('watch-replay');assert.equal(ui.snapshot().replay.watching,true);ui.tick(.1);
  ui.get('replay-seek').value=ui.get('replay-seek').max;ui.get('replay-seek').dispatch('input');ui.tick(.01);
  assert.match(ui.get('scoreboard').innerHTML,/1 KNOCKS/);assert.match(ui.get('scoreboard').innerHTML,/1 KOs/);ui.click('exit-replay');ui.click('reset');
  ui.get('shrink-time').value='999';ui.get('shrink-time').dispatch('change');
  assert.match(ui.get('help-description').textContent,/Shrinking is disabled/);ui.click('start');ui.tick(3.1);ui.engine.elapsed=1100;ui.tick(.02);
  assert.equal(ui.get('arena-note').textContent,'SHRINKING OFF');assert.equal(ui.engine.shrinking,false);
  console.log(`PASS: ${mode} rule controls/mode retention, dynamic instructions, knock/knockout announcement/HUD and replay counters`);
}
for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode);ui.configure(['keyboard','keyboard','keyboard','keyboard']);
  const colors=['#123abc','#abcdef','#112233','#fedcba'];
  colors.forEach((color,id)=>{
    ui.get('hex-'+id).value=color.toUpperCase();ui.get('hex-'+id).dispatch('input');
    assert.equal(ui.snapshot().players[id].color,color);
    assert.equal(ui.get('color-'+id).value,color);assert.equal(ui.get('hex-'+id).value,color.toUpperCase());
    assert.equal(ui.get('row-'+id).style['--player'],color);assert(ui.get('scoreboard').innerHTML.includes(color));
  });
  const valid=JSON.stringify(ui.snapshot());ui.get('hex-0').value='#XYZ123';ui.get('hex-0').dispatch('input');
  assert.equal(JSON.stringify(ui.snapshot()),valid,'invalid input retains the last valid fighter color');
  assert.equal(ui.get('hex-0').attributes['aria-invalid'],'true');assert.match(ui.get('color-error-0').textContent,/six hex/);
  ui.get('color-0').value='#00aaff';ui.get('color-0').dispatch('input');colors[0]='#00aaff';
  assert.equal(ui.get('hex-0').value,'#00AAFF');assert.equal(ui.get('hex-0').attributes['aria-invalid'],'false');
  assert.equal(ui.get('color-error-0').textContent,'');
  ui.get('skin-2').value='9';ui.get('skin-2').dispatch('change');
  assert.equal(ui.snapshot().customColors[2],null);assert.equal(ui.get('color-2').value,SKINS[9].color);
  ui.get('hex-2').value=colors[2];ui.get('hex-2').dispatch('change');

  // Verify preset and custom fighter names with safety checks in UI
  ui.get('name-select-0').value='NOVA';ui.get('name-select-0').dispatch('change');
  assert.equal(ui.snapshot().players[0].name,'NOVA');assert.equal(ui.get('name-0').value,'NOVA');
  ui.get('name-1').value='Val_1';ui.get('name-1').dispatch('input');
  assert.equal(ui.snapshot().players[1].name,'VAL_1');assert.equal(ui.get('name-select-1').value,'custom');
  ui.get('name-0').value='sh1t';ui.get('name-0').dispatch('input');
  assert.equal(ui.snapshot().players[0].name,'NOVA','unsafe name rejected without mutating player');
  assert.equal(ui.get('name-0').attributes['aria-invalid'],'true');assert.match(ui.get('name-error-0').textContent,/family-friendly/);
  ui.get('name-0').value='VAL_1';ui.get('name-0').dispatch('input');
  assert.match(ui.get('name-error-0').textContent,/unique/);
  ui.get('name-select-1').value='';ui.get('name-select-1').dispatch('change');
  assert.equal(ui.snapshot().players[1].name,SKINS[1].name);

  for(const nextMode of ['platformer','arena',mode]){
    ui.click('mode-'+nextMode);
    assert.deepEqual(Array.from(ui.snapshot().players,p=>p.color),colors,'mode changes preserve every custom color');
    assert.equal(ui.snapshot().players[0].name,'NOVA','mode changes preserve custom names');
  }
  ui.click('start');ui.tick(3.1);
  for(let id=0;id<4;id++){
    assert.equal(ui.get('hex-'+id).disabled,true);assert.equal(ui.get('color-'+id).disabled,true);
    assert.equal(ui.get('name-'+id).disabled,true);assert.equal(ui.get('name-select-'+id).disabled,true);
  }
  ui.get('hex-0').value='#654321';ui.get('hex-0').dispatch('input');
  ui.get('name-0').value='STORM';ui.get('name-0').dispatch('input');
  assert.deepEqual(Array.from(ui.snapshot().players,p=>p.color),colors,'locked controls cannot alter the match');
  assert.equal(ui.snapshot().players[0].name,'NOVA');
  ui.click('reset');assert.deepEqual(Array.from(ui.snapshot().players,p=>p.color),colors);
  for(let id=0;id<4;id++){
    assert.equal(ui.get('hex-'+id).disabled,false);assert.equal(ui.get('color-'+id).disabled,false);
    assert.equal(ui.get('name-'+id).disabled,false);assert.equal(ui.get('name-select-'+id).disabled,false);
  }
  ui.click('watch-replay');
  assert.equal(ui.get('hex-0').disabled,true);assert.equal(ui.get('color-0').disabled,true);
  assert.equal(ui.get('name-0').disabled,true);assert.equal(ui.get('name-select-0').disabled,true);
  assert(ui.get('scoreboard').innerHTML.includes(colors[0]),'replay displays the recorded custom color');
  assert(ui.get('scoreboard').innerHTML.includes('NOVA'),'replay displays the recorded custom name');
  ui.get('color-0').value='#654321';ui.get('color-0').dispatch('input');
  assert.equal(ui.snapshot().players[0].color,colors[0],'replay color input cannot modify live settings');
  ui.click('exit-replay');ui.get('hex-0').value='#654321';ui.get('hex-0').dispatch('input');
  ui.click('watch-replay');assert(ui.get('scoreboard').innerHTML.includes(colors[0]),'later lobby edits do not recolor an earlier replay');
  ui.click('exit-replay');assert(ui.get('scoreboard').innerHTML.includes('#654321'));
  console.log('PASS:',mode,'hex/picker and name selector synchronization, safety feedback, preset reset, mode retention, match/replay locks and recorded state');
}

for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode);ui.configure(Array(4).fill('keyboard'));ui.click('start');ui.tick(3.1);
  const rows=()=>Array.from(ui.get('match-score-rows').innerHTML.matchAll(/<tr[^>]*data-player="(\d)"[^>]*>(.*?)<\/tr>/g),m=>({id:Number(m[1]),html:m[2]}));
  assert.deepEqual(rows().map(r=>r.id),[0,1,2,3]);assert(rows().every(r=>r.html.startsWith('<td class="match-rank">1</td>')),'equal totals share rank');
  const g=ui.engine;g.knockouts=[1,2,2,0];g.assists=[9,1,2,0];g.damageDealt=[999,100,1,0];ui.tick(.02);
  assert.deepEqual(rows().map(r=>r.id),[2,1,0,3],'KO priority before assists/damage');
  g.assists[1]=2;g.damageDealt[1]=3;ui.tick(.02);assert.deepEqual(rows().map(r=>r.id),[1,2,0,3],'damage breaks equal KO/assist totals');
  g.scores[0]=1;ui.tick(.02);assert.equal(rows()[0].id,0,'round wins take priority over combat stats');
  g.assists[0]=10;g.damageDealt[0]=1001;ui.tick(.02);
  assert.match(rows()[0].html,/<td>10<\/td><td>1001<\/td>/,'new totals update even when damage/alive state is unchanged');
  g.players[0].alive=false;ui.tick(.02);
  assert.match(ui.get('scoreboard').innerHTML,/1 KOs · 10 A/,'eliminated players retain visible KO/assist stats');
  ui.click('reset');assert(ui.get('watch-replay').disabled===false);assert.equal(ui.snapshot().damageDealt[0],0);
  const live=JSON.stringify(ui.snapshot());ui.click('watch-replay');ui.get('replay-seek').value=ui.get('replay-seek').max;ui.get('replay-seek').dispatch('input');ui.tick(.01);
  assert.match(ui.get('scoreboard-state').textContent,/RECORDED/);assert.match(rows().find(r=>r.id===0).html,/<td>10<\/td><td>1001<\/td>/);
  ui.get('replay-seek').value='0';ui.get('replay-seek').dispatch('input');ui.tick(.01);
  assert(rows().every(r=>r.html.endsWith('<td>0</td><td>0</td><td>0</td><td>0</td>')),'seek restores earlier score totals');
  ui.click('exit-replay');assert.equal(JSON.stringify(ui.snapshot()),live,'replay never changes live totals');
  ui.click('start');ui.tick(3.1);g.players.slice(1).forEach(p=>p.x=2000);g.scores[0]=2;ui.tick(3);
  assert.equal(ui.snapshot().phase,'matchOver');assert.match(ui.get('scoreboard-state').textContent,/FINAL/);assert.match(ui.get('match-score-rows').innerHTML,/class="match-winner"/);
  ui.click('start');assert.equal(ui.snapshot().phase,'countdown');assert(ui.get('match-score-rows').innerHTML.includes('<td>0</td>'));
  console.log('PASS:',mode,'scoreboard ranking/ties, eliminated-player totals, stat-only updates, replay seeking/isolation and final/new-match displays');
}
// Updated: 2026-11-03 America/New_York. Changed line 2 and added lines 288-310: verify rank priorities/ties, eliminated/stat-only updates, final/reset displays and recorded totals during seeking. Purpose: real scoreboard handler regressions; upstream: game.js browser glue and both engines; environment: Node 24 VM/DOM harness.

for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode),levels=['easy','hard','normal','easy'];
  assert.equal(ui.get('difficulty-row-0').hidden,true);assert.equal(ui.get('difficulty-0').disabled,true);
  ui.configure(['bot','bot','keyboard','bot']);
  levels.forEach((level,i)=>{ui.get('difficulty-'+i).value=level;ui.get('difficulty-'+i).dispatch('change');});
  assert.deepEqual(Array.from(ui.snapshot().botDifficulties),levels);
  assert.equal(ui.get('difficulty-row-1').hidden,false);assert.equal(ui.get('difficulty-row-2').hidden,true);
  const before=JSON.stringify(ui.snapshot());ui.get('difficulty-0').value='impossible';ui.get('difficulty-0').dispatch('change');
  assert.equal(JSON.stringify(ui.snapshot()),before);assert.equal(ui.get('difficulty-0').value,'easy');
  for(const next of ['platformer','arena']){ui.click('mode-'+next);assert.deepEqual(Array.from(ui.snapshot().botDifficulties),levels);}
  ui.configure(['keyboard','bot','keyboard','bot']);assert.equal(ui.get('difficulty-row-0').hidden,true);
  ui.configure(['bot','bot','keyboard','bot']);assert.equal(ui.get('difficulty-0').value,'easy');
  ui.tools.get('configure_match').execute({modes:['bot','bot','keyboard','bot'],target:1,botDifficulties:['hard','easy','normal','hard']});
  assert.equal(ui.get('difficulty-0').value,'hard');assert.deepEqual(Array.from(ui.snapshot().botDifficulties),['hard','easy','normal','hard']);
  ui.click('start');assert.equal(ui.get('difficulty-0').disabled,true);
  const locked=JSON.stringify(ui.snapshot().botDifficulties);ui.get('difficulty-0').value='easy';ui.get('difficulty-0').dispatch('change');
  assert.equal(JSON.stringify(ui.snapshot().botDifficulties),locked);assert.equal(ui.get('difficulty-0').value,'hard');
  ui.tick(.5);ui.click('reset');assert.equal(ui.get('difficulty-0').disabled,false);
  ui.click('watch-replay');assert.equal(ui.get('difficulty-0').disabled,true);
  ui.get('difficulty-0').value='easy';ui.get('difficulty-0').dispatch('change');assert.equal(JSON.stringify(ui.snapshot().botDifficulties),locked);
  ui.click('exit-replay');assert.equal(ui.get('difficulty-0').disabled,false);
  console.log('PASS:',mode,'per-slot difficulty controls, bot-only visibility, mode/control retention, atomic rejection, WebMCP configuration and match/replay locks');
}

for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode);
  for(const [id,name] of [[1,'NOVA'],[0,'BLUE']]){
    ui.get('name-'+id).value=name;ui.get('name-'+id).dispatch('change');
    assert.equal(ui.snapshot().players[id].name,name);
  }
  const names=Array.from(ui.snapshot().players,p=>p.name);
  for(const nextMode of ['platformer','arena',mode]){
    assert.doesNotThrow(()=>ui.click('mode-'+nextMode),'copy names as a complete lineup');
    assert.equal(ui.snapshot().gameMode,nextMode);
    assert.deepEqual(Array.from(ui.snapshot().players,p=>p.name),names);
    assert.deepEqual(Array.from(ui.snapshot().customNames),['BLUE','NOVA',null,null]);
  }
  ui.click('start');assert.deepEqual(Array.from(ui.snapshot().players,p=>p.name),names);
  console.log('PASS:',mode,'overridden default names survive mode changes and match start');
}

// Verify adjustable player count (2, 3, 4) and Teams mode across Arena and Platformer
for(const mode of ['arena','platformer']){
  const ui=browserHarness(mode);
  ui.configure(['keyboard','keyboard','bot','bot']);
  for(const count of [2,3,4]){
    ui.get('player-count').value=String(count);ui.get('player-count').dispatch('change');
    assert.equal(ui.snapshot().playerCount,count);
    assert.equal(ui.snapshot().players.length,count);
    assert.equal(ui.get('lineup-count').textContent,`0${count} / 04`);
    for(let i=0;i<4;i++)assert.equal(ui.get('row-'+i).hidden,i>=count);
  }
  // Switch to 2 players and verify mode retention + full match completion
  ui.get('player-count').value='2';ui.get('player-count').dispatch('change');
  ui.get('win-target').value='1';ui.get('win-target').dispatch('change');
  for(const nextMode of ['platformer','arena',mode]){
    ui.click('mode-'+nextMode);
    assert.equal(ui.snapshot().playerCount,2);
    assert.equal(ui.snapshot().players.length,2);
  }
  ui.click('start');ui.tick(3.1);
  assert.equal(ui.get('player-count').disabled,true);
  ui.engine.players[1].x=2000;ui.tick(3);
  assert.equal(ui.snapshot().phase,'matchOver');
  assert.equal(ui.snapshot().scores[0],1);
  ui.click('reset');

  // Enable Teams mode with 4 players (Team Alpha: P1 & P3, Team Bravo: P2 & P4)
  ui.get('player-count').value='4';ui.get('player-count').dispatch('change');
  ui.click('mode-teams');
  assert.equal(ui.snapshot().teamMode,true);
  assert.deepEqual(Array.from(ui.snapshot().teams),[0,1,0,1]);
  assert.equal(ui.get('team-row-0').hidden,false);
  // Reject putting all active players on the same team
  for(const id of [1,3]){ui.get('team-'+id).value='0';ui.get('team-'+id).dispatch('change');}
  assert.deepEqual(Array.from(ui.snapshot().teams),[0,0,0,1],'at least one active player remains on Team Bravo');
  ui.get('team-3').value='0';ui.get('team-3').dispatch('change');
  assert.equal(ui.snapshot().teams[3],1,'cannot remove the last Team Bravo player');
  assert.match(ui.get('announcement').textContent,/Assign at least one active player to each team/);
  // Restore 2v2 teams [0, 1, 0, 1] and verify mode retention
  ui.get('team-1').value='1';ui.get('team-1').dispatch('change');
  assert.deepEqual(Array.from(ui.snapshot().teams),[0,1,0,1]);
  for(const nextMode of ['platformer','arena',mode]){
    ui.click('mode-'+nextMode);
    assert.equal(ui.snapshot().teamMode,true);
    assert.deepEqual(Array.from(ui.snapshot().teams),[0,1,0,1]);
  }
  // Start Teams match and verify friendly-fire protection & team victory while both teammates survive
  ui.configure(['keyboard','keyboard','keyboard','keyboard']);
  ui.click('start');ui.tick(3.1);
  assert.equal(ui.get('mode-teams').disabled,true);
  assert.equal(ui.get('team-mode').disabled,true);
  assert.equal(ui.get('team-0').disabled,true);
  const [p0,p1,p2,p3]=ui.engine.players;
  const y=mode==='platformer'?519:354;
  // Teammates p0 and p2 collide with dash: no damage, no knocks, no hitStun
  Object.assign(p0,{x:480,y,vx:900,vy:0,dashTime:.1});
  Object.assign(p2,{x:505,y,vx:0,vy:0});
  ui.engine.collide(p0,p2);
  assert.equal(p2.damage,0,'teammate takes zero friendly-fire damage');
  assert.equal(ui.snapshot().knocks[0],0,'teammate collision does not count as a knock');
  // Rival p0 hits p1: deals damage and counts knock
  Object.assign(p0,{x:480,y,vx:900,vy:0,dashTime:.1,hit:new Set()});
  Object.assign(p1,{x:505,y,vx:0,vy:0});
  ui.engine.collide(p0,p1);
  assert(p1.damage>0,'rival takes dash damage in Teams mode');
  assert.equal(ui.snapshot().knocks[0],1,'rival hit increments knock counter');
  // Eliminate Team Bravo (p1 and p3) while BOTH Team Alpha players (p0 and p2) remain alive
  p1.x=2000;p3.x=2000;ui.tick(.05);
  assert.equal(ui.snapshot().phase,'roundOver','round ends when only one team remains alive');
  assert.equal(ui.snapshot().roundWinningTeam,0);
  assert.deepEqual(Array.from(ui.snapshot().teamScores),[1,0]);
  assert.equal(ui.snapshot().scores[0],1);
  assert.equal(ui.snapshot().scores[2],1,'both teammates earn the round win');
  assert.match(ui.get('announcement').textContent,/TEAM ALPHA/);
  ui.tick(3);
  assert.equal(ui.snapshot().phase,'matchOver');
  assert.match(ui.get('overlay-title').innerHTML,/TEAM ALPHA/);
  assert.match(ui.get('scoreboard').innerHTML,/ALPHA/);
  assert.match(ui.get('scoreboard').innerHTML,/BRAVO/);
  // Verify replay preserves teamMode and team badges
  ui.click('watch-replay');
  assert.equal(ui.snapshot().replay.watching,true);
  assert.match(ui.get('scoreboard').innerHTML,/ALPHA/);
  ui.click('exit-replay');ui.click('reset');
  console.log('PASS:',mode,'adjustable player count (2-4) and Teams mode (friendly-fire protection, team scoring, mode retention, and replay)');
}
// Updated: 2026-11-04 America/New_York. Added adjustable player count (2-4) and Teams mode tests across Arena and Platformer.
