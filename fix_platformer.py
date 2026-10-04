import os

with open(r"game\platformer.js", "r", encoding="utf-8") as f:
    content = f.read()

old_elim = "this.emit('eliminated',{id:p.id,x:p.x,y:p.y});"
new_elim = "this.emit('eliminated',{id:p.id,x:p.x,y:p.y,lastHitBy: (this.elapsed - (p.lastHitTime||0) < 6) ? p.lastHitBy : undefined});"

content = content.replace(old_elim, new_elim)

with open(r"game\platformer.js", "w", encoding="utf-8") as f:
    f.write(content)
