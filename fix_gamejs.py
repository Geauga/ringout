import os

with open(r"game\game.js", "r", encoding="utf-8") as f:
    content = f.read()

old_announce = "if(e.type==='eliminated'){const p=engine.players[e.id];announce(`${p.name} WENT OVER THE EDGE.`,2);"
new_announce = "if(e.type==='eliminated'){const p=engine.players[e.id];if(e.lastHitBy !== undefined && e.lastHitBy !== null){announce(`${engine.players[e.lastHitBy].name} KNOCKED OUT ${p.name}!`,2);}else{announce(`${p.name} WENT OVER THE EDGE.`,2);}"

content = content.replace(old_announce, new_announce)

with open(r"game\game.js", "w", encoding="utf-8") as f:
    f.write(content)
