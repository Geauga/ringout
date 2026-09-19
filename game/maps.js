// maps.js
// Request: Define editable platformer maps and validate them in both browser and server.
(function(root){
  'use strict';
  const presets=[
    {id:'high-ground',name:'High Ground',platforms:[{id:'floor',x:190,y:540,w:620,h:26},{id:'left',x:155,y:390,w:210,h:18},{id:'right',x:635,y:390,w:210,h:18},{id:'top',x:405,y:260,w:190,h:18}]},
    {id:'sky-steps',name:'Sky Steps',platforms:[{id:'floor',x:100,y:600,w:800,h:26},{id:'step1',x:140,y:450,w:210,h:18},{id:'step2',x:350,y:310,w:210,h:18},{id:'step3',x:560,y:170,w:250,h:18}]},
    {id:'split-summit',name:'Split Summit',platforms:[{id:'floor',x:200,y:600,w:600,h:26},{id:'left',x:60,y:440,w:270,h:18},{id:'right',x:670,y:440,w:270,h:18},{id:'top',x:360,y:280,w:280,h:18}]},
    {id:'moving-grounds',name:'Moving Grounds',platforms:[{id:'floor',x:100,y:600,w:800,h:26},{id:'left',x:160,y:420,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:140,period:5}},{id:'right',x:660,y:420,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:-140,period:5}},{id:'top',x:410,y:260,w:180,h:18,dropThrough:true,motion:{axis:'y',distance:60,period:4}}]},
  ];
  function validate(input){
    if(!input||typeof input!=='object')throw new Error('Provide a map.');
    const name=typeof input.name==='string'?input.name.trim():'';
    if(!name||name.length>40||/[\u0000-\u001f]/.test(name))throw new Error('Give your map a name of 1–40 characters.');
    if(!Array.isArray(input.platforms)||input.platforms.length<1||input.platforms.length>12)throw new Error('Use a main floor and up to 11 ledges.');
    const ids=new Set();
    const platforms=input.platforms.map(p=>{
      if(!p||typeof p.id!=='string'||!/^[a-zA-Z0-9-]{1,24}$/.test(p.id)||ids.has(p.id))throw new Error('Each platform needs a unique ID.');
      ids.add(p.id);
      if(!['x','y','w'].every(k=>Number.isInteger(p[k])))throw new Error('Platform positions and widths must be whole numbers.');
      if(p.x<40||p.w<90||p.w>900||p.x+p.w>960||p.y<140||p.y>620)throw new Error('Keep platforms inside the workspace (x 40–960, y 140–620; width at least 90).');
      if(p.dropThrough!==undefined&&typeof p.dropThrough!=='boolean')throw new Error('Drop-through must be on or off.');
      let motion=null;
      if(p.motion!=null){
        const m=p.motion;
        if(typeof m!=='object'||!['x','y'].includes(m.axis)||!Number.isInteger(m.distance)||Math.abs(m.distance)<20||Math.abs(m.distance)>300||!Number.isFinite(m.period)||m.period<2||m.period>12)throw new Error('Movement needs a horizontal or vertical path, 20–300 travel, and a 2–12 second cycle.');
        motion={axis:m.axis,distance:m.distance,period:m.period};
      }
      if(p.id==='floor'&&(p.dropThrough||motion))throw new Error('The main floor must stay still and cannot allow dropping through.');
      const endX=p.x+(motion?.axis==='x'?motion.distance:0),endY=p.y+(motion?.axis==='y'?motion.distance:0);
      if(endX<40||endX+p.w>960||endY<140||endY>620)throw new Error('Keep the entire movement path inside the workspace.');
      return{id:p.id,x:p.x,y:p.y,w:p.w,h:p.id==='floor'?26:18,dropThrough:p.dropThrough??false,motion};
    });
    const floor=platforms.find(p=>p.id==='floor');
    if(!floor||floor.w<420||floor.y<440)throw new Error('Keep a main floor at least 420 wide, between y 440 and 620.');
    for(const p of platforms){
      const bottom=p.y+Math.max(0,p.motion?.axis==='y'?p.motion.distance:0);
      if(p.id!=='floor'&&bottom>floor.y-60)throw new Error('Keep ledges and their movement paths at least 60 above the main floor.');
      for(const q of platforms)if(p!==q&&Math.abs(p.y-q.y)<60&&p.x<q.x+q.w&&q.x<p.x+p.w)throw new Error('Leave 60 vertical space between overlapping platforms.');
    }
    const reached=new Set(['floor']);
    for(let pass=0;pass<platforms.length;pass++)for(const p of platforms)for(const q of platforms){
      const gap=Math.max(0,p.x-(q.x+q.w),q.x-(p.x+p.w));
      if(reached.has(q.id)&&q.y>=p.y&&q.y-p.y<=210&&gap<=180)reached.add(p.id);
    }
    if(reached.size!==platforms.length)throw new Error('Connect every ledge to the floor: keep each step within 210 up and 180 across.');
    return{name,platforms:[floor,...platforms.filter(p=>p.id!=='floor')]};
  }
  function spawns(map){const floor=map.platforms.find(p=>p.id==='floor');return[-205,-75,75,205].map(offset=>({x:floor.x+floor.w/2+offset*floor.w/620,y:floor.y-21}));}
  const api={presets,validate,spawns};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RingoutMaps=api;
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Safe, reachable custom stages. Upstream: original High Ground geometry and custom-map request. Environment: browser, Node and bundled Workers. Generated: 2026-09-18 America/New_York. New file, all lines.
// Updated: 2026-09-18 America/New_York. Added Moving Grounds and validated optional dropThrough/motion fields while preserving legacy map defaults; main floors remain stationary and solid. Final line ranges recorded in the work log.
