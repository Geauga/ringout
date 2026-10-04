import os

with open(r"game\engine.js", "r", encoding="utf-8") as f:
    content = f.read()

# Add lastHitBy logic to collide function
old_collide = """        if(ad||bd){
          if(ad){a.hit.add(b.id);b.damage=Math.min(250,b.damage+22);const force=690*(1+b.damage/150);b.vx+=nx*force;b.vy+=ny*force;a.vx-=nx*75;a.vy-=ny*75;}
          if(bd){b.hit.add(a.id);a.damage=Math.min(250,a.damage+22);const force=690*(1+a.damage/150);a.vx-=nx*force;a.vy-=ny*force;b.vx+=nx*75;b.vy+=ny*75;}
          this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:1});this.hitPairs.set(key,.3);
        }else if(!this.hitPairs.has(key)&&relative<-30){
          a.damage=Math.min(250,a.damage+4);b.damage=Math.min(250,b.damage+4);a.vx-=nx*(95+a.damage*.6);a.vy-=ny*(95+a.damage*.6);b.vx+=nx*(95+b.damage*.6);b.vy+=ny*(95+b.damage*.6);this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:.3});this.hitPairs.set(key,.3);
        }"""

new_collide = """        if(ad||bd){
          if(ad){a.hit.add(b.id);b.damage=Math.min(250,b.damage+22);const force=690*(1+b.damage/150);b.vx+=nx*force;b.vy+=ny*force;a.vx-=nx*75;a.vy-=ny*75;b.lastHitBy=a.id;b.lastHitTime=this.elapsed;}
          if(bd){b.hit.add(a.id);a.damage=Math.min(250,a.damage+22);const force=690*(1+a.damage/150);a.vx-=nx*force;a.vy-=ny*force;b.vx+=nx*75;b.vy+=ny*75;a.lastHitBy=b.id;a.lastHitTime=this.elapsed;}
          this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:1});this.hitPairs.set(key,.3);
        }else if(!this.hitPairs.has(key)&&relative<-30){
          a.damage=Math.min(250,a.damage+4);b.damage=Math.min(250,b.damage+4);a.vx-=nx*(95+a.damage*.6);a.vy-=ny*(95+a.damage*.6);b.vx+=nx*(95+b.damage*.6);b.vy+=ny*(95+b.damage*.6);this.emit('hit',{x:(a.x+b.x)/2,y:(a.y+b.y)/2,power:.3});this.hitPairs.set(key,.3);
          a.lastHitBy=b.id;a.lastHitTime=this.elapsed;b.lastHitBy=a.id;b.lastHitTime=this.elapsed;
        }"""

content = content.replace(old_collide, new_collide)

# Modify eliminated event payload in engine.js
old_elim = "this.emit('eliminated',{id:p.id,x:p.x,y:p.y});"
new_elim = "this.emit('eliminated',{id:p.id,x:p.x,y:p.y,lastHitBy: (this.elapsed - (p.lastHitTime||0) < 6) ? p.lastHitBy : undefined});"

content = content.replace(old_elim, new_elim)

with open(r"game\engine.js", "w", encoding="utf-8") as f:
    f.write(content)
