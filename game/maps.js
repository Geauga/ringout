// maps.js
// Request: Add six distinct ready-made stages using existing motion, pad and portal mechanics.
(function(root){
  'use strict';
  const presets=[
    {id:'high-ground',name:'High Ground',platforms:[{id:'floor',x:190,y:540,w:620,h:26},{id:'left',x:155,y:390,w:210,h:18},{id:'right',x:635,y:390,w:210,h:18},{id:'top',x:405,y:260,w:190,h:18}]},
    {id:'sky-steps',name:'Sky Steps',platforms:[{id:'floor',x:100,y:600,w:800,h:26},{id:'step1',x:140,y:450,w:210,h:18},{id:'step2',x:350,y:310,w:210,h:18},{id:'step3',x:560,y:170,w:250,h:18}]},
    {id:'split-summit',name:'Split Summit',platforms:[{id:'floor',x:200,y:600,w:600,h:26},{id:'left',x:60,y:440,w:270,h:18},{id:'right',x:670,y:440,w:270,h:18},{id:'top',x:360,y:280,w:280,h:18}]},
    {id:'moving-grounds',name:'Moving Grounds',platforms:[{id:'floor',x:100,y:600,w:800,h:26},{id:'left',x:160,y:420,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:140,period:5}},{id:'right',x:660,y:420,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:-140,period:5}},{id:'top',x:410,y:260,w:180,h:18,dropThrough:true,motion:{axis:'y',distance:60,period:4}}]},
        {id:'spring-yard',name:'Spring Yard',platforms:[{id:'floor',x:100,y:600,w:800,h:26,jumpPad:true},{id:'left',x:140,y:430,w:220,h:18,jumpPad:true},{id:'right',x:640,y:430,w:220,h:18,jumpPad:true},{id:'top',x:400,y:260,w:200,h:18}]},
    {id:'crossroads',name:'Crossroads',platforms:[{id:'floor',x:100,y:600,w:800,h:26},{id:'left',x:140,y:350,w:300,h:18},{id:'right',x:560,y:350,w:300,h:18},{id:'mid',x:400,y:480,w:200,h:18}]},
    {id:'elevator-shaft',name:'Elevator Shaft',platforms:[{id:'floor',x:290,y:600,w:420,h:26},{id:'lift',x:400,y:450,w:200,h:18,dropThrough:true,motion:{axis:'y',distance:-150,period:6}},{id:'left',x:100,y:250,w:250,h:18},{id:'right',x:650,y:250,w:250,h:18}]},
    {id:'switchback-citadel',name:'Switchback Citadel',platforms:[
      {id:'floor',x:240,y:620,w:520,h:26},
      {id:'left-entry',x:60,y:480,w:170,h:18,dropThrough:true},{id:'right-entry',x:770,y:480,w:170,h:18,dropThrough:true},
      {id:'left-wall',x:180,y:350,w:170,h:18,jumpPad:true},{id:'right-wall',x:650,y:350,w:170,h:18,jumpPad:true},
      {id:'left-tower',x:80,y:220,w:200,h:18,dropThrough:true},{id:'right-tower',x:720,y:220,w:200,h:18,dropThrough:true},
      {id:'courtyard-lift',x:400,y:490,w:200,h:18,dropThrough:true,motion:{axis:'y',distance:-110,period:6}},
      {id:'upper-bridge',x:400,y:290,w:200,h:18,dropThrough:true},{id:'crown',x:380,y:160,w:240,h:18},
    ]},
    {id:'orbital-exchange',name:'Orbital Exchange',platforms:[
      {id:'floor',x:160,y:620,w:680,h:26},
      {id:'left-ferry',x:100,y:490,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:120,period:6}},
      {id:'right-ferry',x:720,y:490,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:-120,period:7}},
      {id:'spring-shuttle',x:410,y:390,w:180,h:18,jumpPad:true,dropThrough:true,motion:{axis:'x',distance:120,period:4.5}},
      {id:'left-dock',x:60,y:310,w:200,h:18,dropThrough:true},{id:'right-dock',x:740,y:310,w:200,h:18,dropThrough:true},
      {id:'left-orbit',x:220,y:200,w:120,h:18,dropThrough:true,motion:{axis:'x',distance:70,period:5}},
      {id:'right-orbit',x:660,y:200,w:120,h:18,dropThrough:true,motion:{axis:'x',distance:-70,period:8}},
      {id:'summit',x:420,y:160,w:160,h:18},
    ]},
    {id:'spring-circuit',name:'Spring Circuit',platforms:[
      {id:'floor',x:80,y:620,w:840,h:26},
      {id:'left-launch',x:80,y:520,w:160,h:18,jumpPad:true},{id:'right-launch',x:760,y:520,w:160,h:18,jumpPad:true},
      {id:'left-link',x:270,y:440,w:140,h:18,dropThrough:true},{id:'right-link',x:590,y:440,w:140,h:18,dropThrough:true},
      {id:'left-spring',x:100,y:350,w:160,h:18,jumpPad:true},{id:'right-spring',x:740,y:350,w:160,h:18,jumpPad:true},
      {id:'crossing',x:400,y:350,w:200,h:18,dropThrough:true},
      {id:'left-elevator',x:270,y:270,w:140,h:18,dropThrough:true,motion:{axis:'y',distance:-60,period:5}},
      {id:'right-elevator',x:590,y:270,w:140,h:18,dropThrough:true,motion:{axis:'y',distance:-60,period:6}},
      {id:'left-finish',x:100,y:160,w:160,h:18},{id:'right-finish',x:740,y:160,w:160,h:18},
    ]},
    {id:'glass-gauntlet',name:'Glass Gauntlet',platforms:[
      {id:'floor',x:290,y:620,w:420,h:26},
      {id:'left-slider',x:140,y:490,w:130,h:18,dropThrough:true,motion:{axis:'x',distance:100,period:5}},
      {id:'right-slider',x:730,y:490,w:130,h:18,dropThrough:true,motion:{axis:'x',distance:-100,period:7}},
      {id:'checkpoint',x:440,y:490,w:120,h:18,dropThrough:true},
      {id:'left-spring',x:320,y:360,w:100,h:18,jumpPad:true},{id:'right-spring',x:580,y:360,w:100,h:18,jumpPad:true},
      {id:'left-detour',x:60,y:300,w:140,h:18,dropThrough:true},{id:'right-detour',x:800,y:300,w:140,h:18,dropThrough:true},
      {id:'spire-lift',x:440,y:240,w:120,h:18,dropThrough:true,motion:{axis:'y',distance:-70,period:4}},
      {id:'left-spire',x:260,y:150,w:100,h:18},{id:'right-spire',x:640,y:150,w:100,h:18},
    ]},
  ];
  presets.push({id:'portal-junction',name:'Portal Junction',platforms:[
    {id:'floor',x:100,y:600,w:800,h:26},
    {id:'left-gate',x:140,y:440,w:200,h:18,portal:true},
    {id:'right-gate',x:660,y:280,w:200,h:18,portal:true,motion:{axis:'x',distance:-100,period:6}},
    {id:'bridge',x:400,y:420,w:200,h:18,dropThrough:true},
    {id:'summit',x:400,y:160,w:200,h:18},
  ]});
  presets.push(
    {id:'rift-relay',name:'Rift Relay',platforms:[
      {id:'floor',x:140,y:620,w:720,h:26},
      {id:'entry-gate',x:80,y:480,w:180,h:18,portal:true},
      {id:'exit-gate',x:740,y:220,w:180,h:18,portal:true},
      {id:'left-step',x:200,y:350,w:160,h:18,dropThrough:true},
      {id:'relay-shuttle',x:420,y:480,w:160,h:18,dropThrough:true,motion:{axis:'x',distance:60,period:5}},
      {id:'right-spring',x:660,y:350,w:160,h:18,jumpPad:true},
      {id:'left-lookout',x:100,y:220,w:180,h:18,dropThrough:true},
      {id:'crown',x:400,y:180,w:200,h:18},
    ]},
    {id:'bounce-foundry',name:'Bounce Foundry',platforms:[
      {id:'floor',x:80,y:620,w:840,h:26},
      {id:'left-launch',x:80,y:500,w:160,h:18,jumpPad:true},
      {id:'right-launch',x:760,y:500,w:160,h:18,jumpPad:true},
      {id:'left-link',x:280,y:390,w:160,h:18,dropThrough:true},
      {id:'right-link',x:560,y:390,w:160,h:18,dropThrough:true},
      {id:'spring-press',x:410,y:280,w:180,h:18,jumpPad:true,motion:{axis:'y',distance:-70,period:5}},
      {id:'left-upper',x:80,y:240,w:160,h:18,jumpPad:true},
      {id:'right-upper',x:760,y:240,w:160,h:18,jumpPad:true},
      {id:'roof',x:390,y:140,w:220,h:18,dropThrough:true},
    ]},
    {id:'twin-peaks',name:'Twin Peaks',platforms:[
      {id:'floor',x:270,y:620,w:460,h:26},
      {id:'left-entry',x:130,y:480,w:170,h:18,dropThrough:true},
      {id:'right-entry',x:700,y:480,w:170,h:18,dropThrough:true},
      {id:'left-wall',x:80,y:340,w:150,h:18},
      {id:'right-wall',x:770,y:340,w:150,h:18},
      {id:'left-peak',x:130,y:200,w:170,h:18},
      {id:'right-peak',x:700,y:200,w:170,h:18},
      {id:'valley-lift',x:420,y:480,w:160,h:18,dropThrough:true,motion:{axis:'y',distance:-80,period:6}},
      {id:'ridge',x:420,y:300,w:160,h:18,dropThrough:true},
      {id:'left-spring',x:270,y:340,w:120,h:18,jumpPad:true},
      {id:'right-spring',x:610,y:340,w:120,h:18,jumpPad:true},
    ]},
    {id:'conveyor-crossing',name:'Conveyor Crossing',platforms:[
      {id:'floor',x:100,y:620,w:800,h:26},
      {id:'left-ferry',x:80,y:490,w:160,h:18,dropThrough:true,motion:{axis:'x',distance:180,period:5}},
      {id:'right-ferry',x:760,y:490,w:160,h:18,dropThrough:true,motion:{axis:'x',distance:-180,period:7}},
      {id:'lower-dock',x:440,y:490,w:120,h:18},
      {id:'upper-dock',x:400,y:350,w:200,h:18,dropThrough:true},
      {id:'left-slider',x:100,y:220,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:130,period:6}},
      {id:'right-slider',x:720,y:220,w:180,h:18,dropThrough:true,motion:{axis:'x',distance:-130,period:8}},
      {id:'finish',x:430,y:140,w:140,h:18},
    ]},
    {id:'spiral-spire',name:'Spiral Spire',platforms:[
      {id:'floor',x:100,y:620,w:800,h:26},
      {id:'moving-gate',x:100,y:500,w:180,h:18,portal:true,motion:{axis:'x',distance:80,period:5}},
      {id:'lower-turn',x:330,y:400,w:180,h:18,dropThrough:true},
      {id:'outer-turn',x:600,y:300,w:180,h:18},
      {id:'upper-gate',x:710,y:180,w:180,h:18,portal:true},
      {id:'spire',x:460,y:140,w:180,h:18},
      {id:'left-perch',x:210,y:220,w:160,h:18,dropThrough:true},
      {id:'return-path',x:410,y:280,w:140,h:18,dropThrough:true},
    ]},
    {id:'pocket-brawl',name:'Pocket Brawl',platforms:[
      {id:'floor',x:290,y:560,w:420,h:26},
      {id:'left-wing',x:200,y:410,w:150,h:18,dropThrough:true},
      {id:'right-wing',x:650,y:410,w:150,h:18,dropThrough:true},
      {id:'center-spring',x:425,y:280,w:150,h:18,jumpPad:true},
      {id:'roof',x:330,y:150,w:340,h:18},
    ]},
  );
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
      if(p.jumpPad!==undefined&&typeof p.jumpPad!=='boolean')throw new Error('Jump pad must be on or off.');
      if(p.portal!==undefined&&typeof p.portal!=='boolean')throw new Error('Portal must be on or off.');
      if(p.portal&&p.jumpPad)throw new Error('Use a portal or a jump pad on a platform, rather than both.');
      let motion=null;
      if(p.motion!=null){
        const m=p.motion;
        if(typeof m!=='object'||!['x','y'].includes(m.axis)||!Number.isInteger(m.distance)||Math.abs(m.distance)<20||Math.abs(m.distance)>300||!Number.isFinite(m.period)||m.period<2||m.period>12)throw new Error('Movement needs a horizontal or vertical path, 20–300 travel, and a 2–12 second cycle.');
        motion={axis:m.axis,distance:m.distance,period:m.period};
      }
      if(p.id==='floor'&&(p.dropThrough||motion))throw new Error('The main floor must stay still and cannot allow dropping through.');
      const endX=p.x+(motion?.axis==='x'?motion.distance:0),endY=p.y+(motion?.axis==='y'?motion.distance:0);
      if(endX<40||endX+p.w>960||endY<140||endY>620)throw new Error('Keep the entire movement path inside the workspace.');
      return{id:p.id,x:p.x,y:p.y,w:p.w,h:p.id==='floor'?26:18,dropThrough:p.dropThrough??false,jumpPad:p.jumpPad??false,portal:p.portal??false,motion};
    });
    const floor=platforms.find(p=>p.id==='floor');
    const gates=platforms.filter(p=>p.portal);
    if(gates.length!==0&&gates.length!==2)throw new Error('Select exactly two portal platforms to make a linked pair.');
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
  function padBounds(platform){const w=Math.min(80,platform.w);return{x:platform.x+(platform.w-w)/2,w};}
  function portalCenter(platform){return{x:platform.x+platform.w/2,y:platform.y-26};}
  const api={presets,validate,spawns,padBounds,portalCenter};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.RingoutMaps=api;
})(typeof globalThis!=='undefined'?globalThis:this);
// Purpose: Safe, reachable custom stages. Upstream: original High Ground geometry and custom-map request. Environment: browser, Node and bundled Workers. Generated: 2026-09-18 America/New_York. New file, all lines.
// Updated: 2026-09-18 America/New_York. Added Moving Grounds and validated optional dropThrough/motion fields while preserving legacy map defaults; main floors remain stationary and solid. Final line ranges recorded in the work log.
// Updated: 2026-10-03 America/New_York. Lines 10,23,33,52-53 add Spring Yard, validate optional jumpPad with legacy false default, and share centered pad bounds. Purpose: editable jump pads; upstream: custom-map geometry; environment: browser/Node/Workers.
// Updated: 2026-10-09 America/New_York. Changed lines 2,13-50: add four advanced presets with alternate routes, 9-12 platforms, moving ledges and jump pads. Purpose: more complex ready-made stages; upstream: existing presets, motion/pad physics and custom-map validation; environment: browser/Node 24/Workers.

// Updated: 2026-11-03 America/New_York. Changed lines 2, 52-58, 72-73, 83, 86-87, 104-105. Purpose: paired Platformer portals and compatibility checks. Upstream: existing map definitions, platform simulation, editor, rendering and replay capture. Environment: browser / Node 24 / Workers. Changes: portal validation/preset, swept momentum-preserving traversal with cooldown, editor/render feedback, replay discontinuities or corresponding behavioral tests, as applicable.

// Updated: 2026-11-04 America/New_York. Changed lines 2, 59-121. Purpose: six additional editable Platformer stages. Changes: new motion/pad/portal layouts, full-cycle clearance/reachability and bot difficulty coverage, or editor round-trip checks as applicable. Upstream: existing maps.js presets, Platformer simulation and map editor. Environment: browser / Node 24 / Workers.
