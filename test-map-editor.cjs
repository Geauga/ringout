// test-map-editor.cjs
// Request: Regress editor focus and saved-map reloads without losing drafts or using stale revisions.
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const Maps=require('./game/maps.js');
const {COLORS, SKINS}=require('./game/engine.js');

function harness(fetch=async()=>({ok:true,json:async()=>({maps:[]})})){
  const elements=new Map();
  let document,selected;
  function element(){
    const listeners=new Map();
    return{
      value:'',checked:false,dataset:{},children:[],style:{setProperty(){}},classList:{toggle(){}},
      addEventListener(type,handler){if(!listeners.has(type))listeners.set(type,[]);listeners.get(type).push(handler);},
      dispatch(type,event={}){event.target??=this;event.preventDefault??=()=>{};let result;for(const handler of listeners.get(type)||[])result=handler(event);return result;},
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
    window,document,RingoutMaps:Maps,PLAYER_COLORS: COLORS, PLAYER_SKINS: SKINS,console,
    fetch,
  },{filename:'game/map-editor.js'});
  const editor=window.RingoutMapEditor.create({isLobby:()=>true,onSelect:map=>{selected=map;}});
  const click=id=>{get(id).focus();return get(id).dispatch('click');};
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
  const pads=harness();await pads.editor.list();pads.click('edit-map');
  pads.get('platform-jump-pad').checked=true;pads.get('platform-jump-pad').dispatch('change');pads.pointAt('left');
  assert.equal(pads.get('platform-jump-pad').checked,false,'each platform has an independent setting');
  pads.get('platform-jump-pad').checked=true;pads.get('platform-jump-pad').dispatch('change');pads.click('play-map');
  assert.equal(pads.read().platforms[0].jumpPad,true);assert.equal(pads.read().platforms[1].jumpPad,true);assert.equal(pads.read().platforms[2].jumpPad,false);
  console.log('PASS: independent floor/ledge jump-pad toggles survive draft play');
  function library(){
    const id='01234567-89ab-cdef-0123-456789abcdef',writes=[];
    let records=[{...Maps.validate(Maps.presets[0]),id,revision:1}],copies=0,pendingRead;
    const clone=value=>JSON.parse(JSON.stringify(value));
    const ui=harness(async(route,options)=>{
      if(!options.method){if(pendingRead)await pendingRead;return{ok:true,json:async()=>({maps:clone(records)})};}
      const input=JSON.parse(options.body);writes.push({route,...clone(input)});
      if(route==='/api/maps'){
        const map={...Maps.validate(input.map),id:`copy-${++copies}`,revision:1};records.push(map);
        return{ok:true,json:async()=>({map:clone(map)})};
      }
      const index=records.findIndex(map=>route==='/api/maps/'+map.id);
      if(index<0||records[index].revision!==input.revision)return{ok:false,json:async()=>({error:'This map changed or was deleted elsewhere. Reload the library first.'})};
      if(input.action==='delete'){records.splice(index,1);return{ok:true,json:async()=>({deleted:true})};}
      records[index]={...Maps.validate(input.map),id,revision:input.revision+1};
      return{ok:true,json:async()=>({map:clone(records[index])})};
    });
    return{ui,id,writes,read:()=>clone(records),deferRead(){let release;pendingRead=new Promise(resolve=>{release=resolve;});return()=>{release();pendingRead=null;};},update(){records[0]={...records[0],name:'Updated elsewhere',revision:records[0].revision+1,platforms:records[0].platforms.map((p,i)=>i? p:{...p,jumpPad:true})};},remove(){records=[];}};
  }
  const clean=library();await clean.ui.editor.selectById(clean.id);clean.ui.click('edit-map');clean.update();
  clean.ui.click('close-map-editor');await clean.ui.click('map-reload');clean.ui.click('edit-map');
  assert.equal(clean.ui.get('map-name').value,'Updated elsewhere','reload refreshes an unchanged editor draft');
  assert.equal(clean.ui.get('platform-jump-pad').checked,true);
  await clean.ui.click('save-map');assert.equal(clean.writes.at(-1).revision,2,'save uses the reloaded revision');
  clean.update();clean.ui.click('close-map-editor');await clean.ui.click('map-reload');clean.ui.click('edit-map');
  await clean.ui.click('confirm-delete-map');assert.equal(clean.writes.at(-1).revision,4,'delete uses the reloaded revision');
  assert.equal(clean.read().length,0);
  console.log('PASS: reloaded unchanged maps use current geometry/revisions for save and delete');
  for(const removed of [false,true]){
    const lib=library(),ui=lib.ui;await ui.editor.selectById(lib.id);ui.click('edit-map');
    ui.get('map-name').value='My unsaved changes';ui.get('map-name').dispatch('input');
    ui.get('platform-x').value='200';ui.get('platform-x').dispatch('change');
    if(removed)lib.remove();else lib.update();
    await ui.click('save-map');assert.match(ui.get('editor-status').textContent,/changed or was deleted/);
    ui.click('close-map-editor');await ui.click('map-reload');await ui.click('map-reload');ui.click('edit-map');
    assert.equal(ui.get('map-name').value,'My unsaved changes');assert.equal(ui.get('platform-x').value,200);
    assert.equal(ui.get('delete-map').hidden,true,'preserved draft cannot delete the changed remote map');
    assert.match(ui.get('editor-status').textContent,/separate copy/);
    await ui.click('save-map');assert.equal(lib.writes.at(-1).route,'/api/maps','saving preserved edits creates a separate map');
    const maps=lib.read();assert.equal(maps.length,removed?1:2);
    const copy=maps.find(map=>map.id!==lib.id);assert.equal(copy.name,'My unsaved changes');assert.equal(copy.platforms[0].x,200);
    if(!removed){assert.equal(maps.find(map=>map.id===lib.id).revision,2);assert.equal(maps.find(map=>map.id===lib.id).name,'Updated elsewhere');}
  }
  const deleted=library();await deleted.ui.editor.selectById(deleted.id);deleted.ui.click('edit-map');deleted.remove();
  deleted.ui.click('close-map-editor');await deleted.ui.click('map-reload');deleted.ui.click('edit-map');
  assert.equal(deleted.ui.read().id,Maps.presets[0].id,'deleted saved selection falls back to the preset');
  assert.equal(deleted.ui.get('delete-map').hidden,true);
  console.log('PASS: reload preserves dirty drafts as copies and handles remote deletion without stale writes');
  for(const dirty of [false,true]){
    const lib=library(),ui=lib.ui;await ui.editor.selectById(lib.id);
    const release=lib.deferRead(),reload=ui.click('map-reload');ui.click('edit-map');
    if(dirty){ui.get('map-name').value='Edits while loading';ui.get('map-name').dispatch('input');}
    lib.update();release();await reload;
    assert.equal(ui.get('map-name').value,dirty?'Edits while loading':'High Ground','pending reload does not replace an open editor');
    assert.equal(ui.read().revision,1,'pending reload does not switch the current map while editing');
    ui.click('close-map-editor');ui.click('edit-map');
    assert.equal(ui.get('map-name').value,dirty?'Edits while loading':'Updated elsewhere');
    await ui.click('save-map');
    assert.equal(lib.writes.at(-1).route,dirty?'/api/maps':'/api/maps/'+lib.id);
  }
  console.log('PASS: late library responses defer reconciliation until reopening and preserve concurrent edits');
})().catch(error=>{console.error(error);process.exitCode=1;});
// Purpose: Regress data loss when a board pointer action synchronously blurs an editor field.
// Upstream: map-editor.js authors validated maps; maps.js supplies presets and geometry rules.
// Environment: Node built-ins with a synchronous focus/blur DOM harness. Generated: 2026-09-23 America/New_York. New file: all lines.
// Updated: 2026-10-03 America/New_York. Lines 68-73 cover independent floor/ledge pad toggles and draft use. Purpose: editor feature regression; upstream: map-editor.js and maps.js; environment: Node VM DOM harness.
// Updated: 2026-10-05 America/New_York. Lines 2,9,16,28,31 allow controlled asynchronous API events; 75-135 verify current revisions/geometry, conflict recovery, dirty copies, remote deletion and late reloads during editing. Purpose: prevent stale writes and draft loss; upstream: real map-editor.js and validation with a simulated revision API; environment: Node 24 VM DOM/fetch harness.
