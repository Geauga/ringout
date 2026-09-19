// maps-api.mjs
// Request: Store PIN-authorized custom platformer maps with conflict-safe editing.
import MapDefinitions from '../game/maps.js';
const mapResult=(status,data)=>({status,body:JSON.stringify(data)});
export async function mapsApi(request,url,db,now,readBody){
  const id=url.pathname.slice('/api/maps/'.length);
  const collection=url.pathname==='/api/maps';
  if(!collection&&!/^[0-9a-f-]{36}$/.test(id))return mapResult(404,{error:'Map not found.'});
  if(request.method==='GET'&&collection){
    const rows=await db.prepare('SELECT id, map_json, revision FROM custom_maps ORDER BY updated_at DESC, id LIMIT 50').all();
    return mapResult(200,{maps:rows.results.map(r=>({id:r.id,revision:r.revision,...JSON.parse(r.map_json)}))});
  }
  if(request.method!=='POST')return mapResult(405,{error:'Method not allowed.'});
  if(request.headers.get('origin')!==url.origin)return mapResult(403,{error:'Request origin rejected.'});
  if(!(request.headers.get('content-type')||'').startsWith('application/json'))return mapResult(415,{error:'Send a JSON map.'});
  let input,map;
  try{input=JSON.parse(await readBody(request,8192));if(!input||typeof input!=='object')throw new Error('Provide a map.');if(input.action!=='delete')map=MapDefinitions.validate(input.map);}
  catch(error){if(error.message==='BODY_LIMIT')return mapResult(413,{error:'Map is too large.'});return mapResult(400,{error:error instanceof SyntaxError?'Map JSON is invalid.':error.message});}
  if(collection){
    if(!map)return mapResult(400,{error:'Provide a map to save.'});
    const nextId=crypto.randomUUID();
    const row=await db.prepare('INSERT INTO custom_maps (id,map_json,revision,updated_at) SELECT ?,?,1,? WHERE (SELECT count(*) FROM custom_maps) < 50 RETURNING id,revision').bind(nextId,JSON.stringify(map),now).first();
    return row?mapResult(201,{map:{...row,...map}}):mapResult(409,{error:'Your library has 50 maps. Delete a map to make room.'});
  }
  if(!Number.isInteger(input.revision)||input.revision<1)return mapResult(400,{error:'A saved map revision is required.'});
  if(input.action==='delete'){
    const row=await db.prepare('DELETE FROM custom_maps WHERE id=? AND revision=? RETURNING id').bind(id,input.revision).first();
    return row?mapResult(200,{deleted:true}):mapResult(409,{error:'This map changed or was deleted elsewhere. Reload the library first.'});
  }
  const row=await db.prepare('UPDATE custom_maps SET map_json=?,revision=revision+1,updated_at=? WHERE id=? AND revision=? RETURNING id,revision').bind(JSON.stringify(map),now,id,input.revision).first();
  return row?mapResult(200,{map:{...row,...map}}):mapResult(409,{error:'This map changed or was deleted elsewhere. Save a new copy to keep your edits.'});
}
// Purpose: Persistent shared map library. Upstream: maps.js validation and generated SQLite schema. Environment: D1 / Node adapter; caller enforces PIN session. Generated: 2026-09-18 America/New_York. New file, all lines.
