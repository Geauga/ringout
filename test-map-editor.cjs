// test-map-editor.cjs
// Request: Review custom-map editing and prevent focused fields from changing a newly selected platform.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Maps=require('./game/maps.js');
const {COLORS}=require('./game/engine.js');

function harness(){
  const elements=new Map();
  let document,selected;
  function element(){
    const listeners=new Map();
    return{
      value:'',checked:false,dataset:{},children:[],style:{setProperty(){}},classList:{toggle(){}},
      addEventListener(type,handler){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(handler);},
      dispatch(type,event={}){event.target??=this;event.preventDefault??=()=>{};for(const handler of listeners.get(type)||[])handler(event);},
      focus(){if(document.activeElement===this)return;const previous=document.activeElement;document.activeElement=null;previous?.dispatch('blur');document.activeElement=this;},
      append(child){this.children.push(child);},replaceChildren(){this.children=[];},setAttribute(){},setPointerCapture(){},
      getBoundingClientRect(){return{width:1000,height:720};},
      closest(selector){return selector==='[data-platform]'&&this.dataset.platform?this:null;},
      showModal(){this.open=true;},close(){this.open=false;},
    };
  }
  const get=id=>{if(!elements.has(id))elements.set(id,element());return elements.get(id);};
  document={getElementById:get,createElement:element,activeElement:null};
  const window={};
  vm.runInNewContext(fs.readFileSync(require.resolve('./game/map-editor.js'),'utf8'),{
    window,document,RingoutMaps:Maps,PLAYER_COLORS:COLORS,console,
    fetch:async()=>({ok:true,json:async()=>({maps:[]})}),
  },{filename:'game/map-editor.js'});
  const editor=window.RingoutMapEditor.create({isLobby:()=>true,onSelect:map=>{selected=map;}});
  const click=id=>{get(id).focus();get(id).dispatch('click');};
  const pointAt=id=>{
    const board=get('map-board'),target=board.children.find(child=>child.dataset.platform===id);
    assert(target,`platform ${id} is rendered`);
    board.dispatch('pointerdown',{target,pointerId:1,clientX:0,clientY:0});
  };
  return{editor,get,click,pointAt,read:()=>JSON.parse(JSON.stringify(selected))};
}

(async()=>{
  for(const field of ['platform-x','platform-y','platform-width']){
    const ui=harness();await ui.editor.list();ui.click('edit-map');
    ui.get(field).focus();ui.pointAt('left');
    ui.click('play-map');
    assert.deepEqual(ui.read().platforms,Maps.validate(Maps.presets[0]).platforms,`${field} blur must not overwrite the selected ledge`);
  }
  console.log('PASS: switching platforms from each coordinate field preserves the map');

  const pending=harness();await pending.editor.list();pending.click('edit-map');
  pending.get('platform-x').focus();pending.get('platform-x').value='200';pending.pointAt('left');
  pending.get('map-board').dispatch('pointermove',{pointerId:1,clientX:15,clientY:10});
  pending.get('map-board').dispatch('pointerup');pending.click('play-map');
  const moved=pending.read().platforms;
  assert.equal(moved[0].x,200,'pending numeric edit applies to the previous platform');
  assert.equal(moved[1].x,170,'drag starts at the selected ledge position');
  assert.equal(moved[1].y,400);assert.equal(moved[1].w,210);
  console.log('PASS: pending edits stay on their platform and the newly selected ledge drags correctly');

  for(const [field,value,key] of [['platform-travel','100','distance'],['platform-period','6','period']]){
    const ui=harness();await ui.editor.selectById('moving-grounds');ui.click('edit-map');ui.pointAt('left');
    ui.get(field).focus();ui.get(field).value=value;ui.pointAt('right');ui.click('play-map');
    const actual=ui.read().platforms,expected=Maps.validate(Maps.presets.find(map=>map.id==='moving-grounds')).platforms;
    expected[1].motion[key]=Number(value);
    assert.deepEqual(actual,expected,`${field} blur must preserve the next ledge's direction and settings`);
  }
  console.log('PASS: pending motion edits preserve the next ledge and its opposite travel direction');
})().catch(error=>{console.error(error);process.exitCode=1;});
// Purpose: Regress data loss when a board pointer action synchronously blurs an editor field.
// Upstream: map-editor.js authors validated maps; maps.js supplies presets and geometry rules.
// Environment: Node built-ins with a synchronous focus/blur DOM harness. Generated: 2026-09-23 America/New_York. New file: all lines.
