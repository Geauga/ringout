// test-controls.cjs
// Request: Regress sound-button keyboard focus and disconnected-controller match starts in both game modes.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { ArenaEngine, COLORS, NAMES } = require('./game/engine.js');
const { PlatformerEngine } = require('./game/platformer.js');
const Maps = require('./game/maps.js');

function browserHarness(mode, map = Maps.presets[0]) {
  const elements = new Map(), tools = new Map();
  let document, connected = [], frame, now = 0, platformEngine;
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
    const select = id.startsWith('player-') || id === 'win-target';
    return eventTarget({
      id, tagName: id === 'arena' ? 'CANVAS' : select ? 'SELECT' : 'BUTTON',
      value: id === 'win-target' ? '3' : 'keyboard', options: [], style: {}, hidden: false, open: false,
      classList: { add() {}, remove() {}, toggle() {} },
      focus() { document.activeElement = this; },
      setAttribute() {},
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
    ArenaEngine, PlatformerEngine: ObservedPlatformer, PLAYER_COLORS: COLORS, PLAYER_NAMES: NAMES,
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
  return { document, get, snapshot, click, tick, key, setPads, configure, get engine() { return platformEngine; } };
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
// Purpose: Exercise real game.js event handlers and engines without changing production code or requiring browser hardware.
// Upstream: game/game.js connects browser input to game/engine.js and game/platformer.js simulations.
// Environment: Node 24 built-ins with a simulated DOM, animation clock and gamepad API. Generated: 2026-09-17 America/New_York. New file: all lines.
// Updated: 2026-09-19 America/New_York. Lines 8-13,36-37,69-70,82 observe the real platformer engine and supply custom maps; 127-146 verify Down input for four keyboard layouts, controller stick/D-pad and touch. Purpose/upstream/environment remain as documented above.
