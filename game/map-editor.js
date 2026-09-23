// map-editor.js
// Request: Let players drag, resize, save and play custom platformer maps.
(function(root){
  'use strict';
  const clone=value=>JSON.parse(JSON.stringify(value));
  root.RingoutMapEditor={create({onSelect,isLobby}){
    const $=id=>document.getElementById(id),dialog=$('map-dialog'),board=$('map-board');
    let saved=[],selected=clone(RingoutMaps.presets[0]),draft=null,platformId='floor',drag=null,locked=false,busy=false;
    const presets=RingoutMaps.presets;
    const status=(message)=>{$('map-status').textContent=message;};
    async function api(path,body){
      const response=await fetch(path,{cache:'no-store',...(body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
      const data=await response.json().catch(()=>({error:'Saved maps are unavailable. Please try again.'}));
      if(!response.ok)throw new Error(data.error||'Map request failed.');return data;
    }
    function refreshPicker(){
      const select=$('map-select');select.replaceChildren();
      for(const [label,maps] of [['Ready-made maps',presets],['Your saved maps',saved]]){
        const group=document.createElement('optgroup');group.label=label;
        for(const map of maps){const option=document.createElement('option');option.value=map.id;option.textContent=map.name;group.append(option);}select.append(group);
      }
      if(![...presets,...saved].some(m=>m.id===selected.id)){
        const option=document.createElement('option');option.value=selected.id;option.textContent=selected.name+' · draft';select.append(option);
      }
      select.value=selected.id;
    }
    async function load(){
      $('map-reload').disabled=true;status('Loading saved maps…');
      try{saved=(await api('/api/maps')).maps;refreshPicker();status(saved.length?`${saved.length} saved map${saved.length===1?'':'s'} · shared in this game`:'Build a map of your own.');}
      catch(error){console.error('Map library load failed:',error);status(error.message);}
      finally{$('map-reload').disabled=locked;}
    }
    function choose(map){
      if(!isLobby())throw new Error('Return to the lobby before changing maps.');
      selected=clone(map);onSelect(selected);refreshPicker();
      status(selected.id==='draft'?'Playing an unsaved draft. Open the editor to save it.':`${selected.name} selected${selected.revision?' · saved map':''}.`);
    }
    function validateDraft(){try{RingoutMaps.validate(draft);return '';}catch(error){return error.message;}}
    function render(){
      const current=draft.platforms.find(p=>p.id===platformId)||draft.platforms[0];platformId=current.id;
      $('platform-list').replaceChildren();
      for(const [i,p] of draft.platforms.entries()){
        const option=document.createElement('option');option.value=p.id;option.textContent=p.id==='floor'?'Main floor':`Ledge ${i}`;$('platform-list').append(option);
      }
      $('platform-list').value=platformId;
      $('platform-x').value=current.x;$('platform-y').value=current.y;$('platform-width').value=current.w;
      $('platform-width').min=current.id==='floor'?420:90;
      $('platform-y').min=current.id==='floor'?440:140;
      $('platform-y').max=current.id==='floor'?620:draft.platforms[0].y-60;
      $('platform-drop').checked=!!current.dropThrough;$('platform-drop').disabled=busy||current.id==='floor';
      $('platform-motion').value=current.motion?.axis||'none';$('platform-motion').disabled=busy||current.id==='floor';
      $('platform-motion-fields').hidden=!current.motion;
      $('platform-travel').value=Math.abs(current.motion?.distance??80);$('platform-period').value=current.motion?.period??4;
      $('platform-direction').replaceChildren();
      for(const [value,label] of [['1',current.motion?.axis==='y'?'Down':'Right'],['-1',current.motion?.axis==='y'?'Up':'Left']]){const option=document.createElement('option');option.value=value;option.textContent=label;$('platform-direction').append(option);}
      $('platform-direction').value=current.motion?.distance<0?'-1':'1';
      $('remove-platform').disabled=busy||current.id==='floor';$('add-platform').disabled=busy||draft.platforms.length>=12;
      const message=validateDraft();$('map-validation').textContent=message||'Ready to play. All four fighters start on the main floor.';
      $('map-validation').classList.toggle('invalid',!!message);
      $('save-map').disabled=busy||!!message;$('play-map').disabled=busy||!!message;$('copy-map').disabled=busy||!!message;
      $('delete-map').hidden=!draft.revision;$('delete-confirm').hidden=true;
      $('platform-count').textContent=`${draft.platforms.length} / 12 platforms`;
      board.replaceChildren();
      const danger=document.createElement('span');danger.className='editor-danger';danger.textContent='FALL BELOW THE STAGE = KNOCKOUT';board.append(danger);
      for(const [i,p] of draft.platforms.entries()){
        if(p.motion){
          const dx=p.motion.axis==='x'?p.motion.distance:0,dy=p.motion.axis==='y'?p.motion.distance:0;
          const path=document.createElement('span');path.className='editor-motion-path '+p.motion.axis;
          Object.assign(path.style,{left:(p.x+p.w/2+Math.min(0,dx))/10+'%',top:(p.y+Math.min(0,dy))/7.2+'%',width:Math.abs(dx)/10+'%',height:Math.abs(dy)/7.2+'%'});board.append(path);
          const end=document.createElement('span');end.className='editor-motion-end';
          Object.assign(end.style,{left:(p.x+dx)/10+'%',top:(p.y+dy)/7.2+'%',width:p.w/10+'%',height:p.h/7.2+'%'});board.append(end);
        }
        const button=document.createElement('button');button.type='button';button.className='editor-platform'+(p.id===platformId?' selected':'')+(p.dropThrough?' drop-through':'');button.dataset.platform=p.id;
        button.setAttribute('aria-label',(p.id==='floor'?'Select main floor':`Select ledge ${i}`)+(p.dropThrough?', drop-through':'')+(p.motion?', moving':''));button.setAttribute('aria-pressed',String(p.id===platformId));
        Object.assign(button.style,{left:p.x/10+'%',top:p.y/7.2+'%',width:p.w/10+'%',height:p.h/7.2+'%'});
        const label=document.createElement('span');label.textContent=p.id==='floor'?'MAIN FLOOR':`${i}${p.motion?(p.motion.axis==='x'?' ↔':' ↕'):''}${p.dropThrough?' ↓':''}`;button.append(label);board.append(button);
      }
      for(const [i,p] of RingoutMaps.spawns(draft).entries()){
        const spawn=document.createElement('span');spawn.className='editor-spawn';spawn.textContent=`P${i+1}`;spawn.style.left=p.x/10+'%';spawn.style.top=p.y/7.2+'%';spawn.style.setProperty('--player',PLAYER_COLORS[i]);board.append(spawn);
      }
    }
    function open(fresh=false){
      if(!isLobby())return;
      if(fresh)draft={name:'Untitled map',platforms:[{id:'floor',x:190,y:540,w:620,h:26}]};
      else if(!draft){draft=clone(selected);if(!draft.revision){delete draft.id;draft.name=draft.name+' remix';}}
      platformId='floor';$('map-name').value=draft.name;$('editor-status').textContent='';render();dialog.showModal();
    }
    function boundPlatform(p){
      p.w=Math.max(p.id==='floor'?420:90,Math.min(900,Math.round(p.w/10)*10));
      p.x=Math.max(40,Math.min(960-p.w,Math.round(p.x/10)*10));
      p.y=Math.max(p.id==='floor'?440:140,Math.min(p.id==='floor'?620:draft.platforms[0].y-60,Math.round(p.y/10)*10));
    }
    function editCoordinate(){
      if(busy)return;const p=draft.platforms.find(p=>p.id===platformId);
      for(const [key,id] of [['x','platform-x'],['y','platform-y'],['w','platform-width']]){const n=Number($(id).value);if(Number.isFinite(n))p[key]=n;}
      boundPlatform(p);render();
    }
    function editBehavior(){
      if(busy)return;const p=draft.platforms.find(p=>p.id===platformId);if(p.id==='floor')return;
      p.dropThrough=$('platform-drop').checked;
      const axis=$('platform-motion').value;
      p.motion=axis==='none'?null:{axis,distance:Math.abs(Number($('platform-travel').value))*Number($('platform-direction').value),period:Number($('platform-period').value)};
      render();
    }
    function setBusy(value){busy=value;$('map-fields').disabled=value;$('close-map-editor').disabled=value;render();}
    async function save(copy=false){
      if(busy||!isLobby())return;
      let map;try{map=RingoutMaps.validate(draft);}catch(error){$('editor-status').textContent=error.message;return;}
      setBusy(true);$('editor-status').textContent='Saving map…';
      try{
        const updating=draft.revision&&!copy;
        const result=await api(updating?'/api/maps/'+draft.id:'/api/maps',{map,revision:updating?draft.revision:undefined});
        draft=clone(result.map);saved=saved.filter(m=>m.id!==draft.id);saved.unshift(clone(draft));
        selected=clone(draft);onSelect(selected);refreshPicker();status(`Saved “${draft.name}”.`);$('editor-status').textContent='Saved. This map is selected for your next match.';
      }catch(error){console.error('Map save failed:',error);$('editor-status').textContent=error.message;}
      finally{setBusy(false);}
    }
    $('map-select').addEventListener('change',()=>{const map=[...presets,...saved,selected].find(m=>m.id===$('map-select').value);if(map){draft=null;choose(map);}});
    $('edit-map').addEventListener('click',()=>open());$('new-map').addEventListener('click',()=>open(true));$('map-reload').addEventListener('click',load);
    $('close-map-editor').addEventListener('click',()=>dialog.close());dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
    $('map-name').addEventListener('input',()=>{draft.name=$('map-name').value;render();});
    $('platform-list').addEventListener('change',()=>{platformId=$('platform-list').value;render();});
    for(const id of ['platform-x','platform-y','platform-width'])for(const event of ['change','blur'])$(id).addEventListener(event,editCoordinate);
    for(const id of ['platform-drop','platform-motion','platform-travel','platform-direction','platform-period'])$(id).addEventListener('change',editBehavior);
    for(const id of ['platform-travel','platform-period'])$(id).addEventListener('blur',editBehavior);
    $('add-platform').addEventListener('click',()=>{
      for(let y=draft.platforms[0].y-140;y>=140;y-=140)for(const x of [100,400,700]){
        const id='ledge-'+Date.now().toString(36),candidate={id,x,y,w:180,h:18};
        try{RingoutMaps.validate({...draft,platforms:[...draft.platforms,candidate]});draft.platforms.push(candidate);platformId=id;render();return;}catch{ /* Try the next free, reachable grid position. */ }
      }
      $('editor-status').textContent='Make room for a new ledge by moving or resizing an existing one.';
    });
    $('remove-platform').addEventListener('click',()=>{if(platformId==='floor')return;draft.platforms=draft.platforms.filter(p=>p.id!==platformId);platformId='floor';render();});
    board.addEventListener('pointerdown',event=>{
      if(busy)return;const button=event.target.closest('[data-platform]');if(!button)return;
      event.preventDefault();const nextId=button.dataset.platform;
      // Commit the focused field to its current platform before selecting another one.
      board.focus({preventScroll:true});platformId=nextId;
      const p=draft.platforms.find(p=>p.id===platformId),rect=board.getBoundingClientRect();
      drag={pointer:event.pointerId,x:event.clientX,y:event.clientY,startX:p.x,startY:p.y,width:rect.width,height:rect.height};board.setPointerCapture(event.pointerId);render();
    });
    board.addEventListener('pointermove',event=>{if(!drag||drag.pointer!==event.pointerId||busy)return;const p=draft.platforms.find(p=>p.id===platformId);p.x=drag.startX+(event.clientX-drag.x)*1000/drag.width;p.y=drag.startY+(event.clientY-drag.y)*720/drag.height;boundPlatform(p);render();});
    for(const type of ['pointerup','pointercancel','lostpointercapture'])board.addEventListener(type,()=>{drag=null;});
    board.addEventListener('click',event=>{if(busy||!event.target.closest('[data-platform]'))return;platformId=event.target.closest('[data-platform]').dataset.platform;render();board.focus({preventScroll:true});});
    board.addEventListener('keydown',event=>{
      if(busy||!['ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))return;
      event.preventDefault();const p=draft.platforms.find(p=>p.id===platformId);p.x+=(event.key==='ArrowRight'?10:event.key==='ArrowLeft'?-10:0);p.y+=(event.key==='ArrowDown'?10:event.key==='ArrowUp'?-10:0);boundPlatform(p);render();
    });
    $('save-map').addEventListener('click',()=>save());$('copy-map').addEventListener('click',()=>save(true));
    $('play-map').addEventListener('click',()=>{try{
      const map=RingoutMaps.validate(draft),savedMap=saved.find(m=>m.id===draft.id);
      const unchanged=!!savedMap&&JSON.stringify(RingoutMaps.validate(savedMap))===JSON.stringify(map);
      dialog.close();choose({...map,id:unchanged?draft.id:'draft',...(unchanged?{revision:draft.revision}:{})});
      status(unchanged?'Saved map selected.':'Playing an unsaved draft. Open the editor to save it.');
    }catch(error){$('editor-status').textContent=error.message;}});
    $('delete-map').addEventListener('click',()=>{$('delete-confirm').hidden=false;});$('cancel-delete-map').addEventListener('click',()=>{$('delete-confirm').hidden=true;});
    $('confirm-delete-map').addEventListener('click',async()=>{
      if(busy||!draft.revision)return;setBusy(true);
      try{await api('/api/maps/'+draft.id,{action:'delete',revision:draft.revision});saved=saved.filter(m=>m.id!==draft.id);draft=null;dialog.close();choose(presets[0]);status('Map deleted. High Ground is selected.');}
      catch(error){console.error('Map delete failed:',error);$('editor-status').textContent=error.message;}
      finally{busy=false;$('map-fields').disabled=false;$('close-map-editor').disabled=false;if(draft)render();}
    });
    refreshPicker();const ready=load();
    return{isOpen:()=>dialog.open,setLocked(value){locked=value;for(const id of ['map-select','edit-map','new-map','map-reload'])$(id).disabled=value;},setMode(platforming){$('map-mode-note').textContent=platforming?'Platformer · choose your battleground':'Choose a map to switch to Platformer';},async list(){await ready;return clone([...presets,...saved]);},async selectById(id){await ready;if(dialog.open)throw new Error('Close the map editor first.');const map=[...presets,...saved].find(m=>m.id===id);if(!map)throw new Error('Map not found.');draft=null;choose(map);return clone(map);}};
  }};
})(window);
// Purpose: Accessible map authoring and durable library UI. Upstream: maps.js, map API and game lobby callback. Environment: browser with pointer/touch/keyboard support. Generated: 2026-09-18 America/New_York. New file, all lines.
// Updated: 2026-09-19 America/New_York. Line 34 refreshes selection status; lines 50-56 populate motion/drop controls; 67-78 preview paths and behavior; 98-104 edit settings; 123-125 commit numeric edits on blur; 147-152 distinguish unsaved edits from saved maps. Purpose: author and preserve custom platform features; upstream: maps.js validation and map API; environment: browser.
// Updated: 2026-09-23 America/New_York. Lines 136-140 commit focused fields before changing platform selection and drag origin. Purpose: prevent cross-platform edits; upstream: editor focus/blur handlers; environment: browser.
