// Simple endless runner: player can jump, obstacles spawn
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let width = canvas.width; let height = canvas.height;
let running=false; let score=0; let speed=2.2; let spawnTimer=0; let obstacles=[];
const player={x:40,y:height-34,w:24,h:24,vy:0,gravity:0.9,ground:height-10,jumping:false};
function reset(){ running=false; score=0; speed=2.2; obstacles=[]; player.y=height-34; player.vy=0; player.jumping=false; updateScore(); }
function start(){ reset(); running=true; loop(); }
function updateScore(){ document.getElementById('score').textContent=`Score: ${Math.floor(score)}`; }
function spawn(){ const h = 18 + Math.random()*36; obstacles.push({x:width+10,y:height-10-h,w:16,h:h}); }
function step(dt){ if(!running) return; score+=dt*0.01*speed*60; updateScore(); spawnTimer-=dt; if(spawnTimer<=0){ spawn(); spawnTimer=60+Math.random()*80; }
 // update obstacles
 for(let i=obstacles.length-1;i>=0;i--){ obstacles[i].x -= speed; if(obstacles[i].x+obstacles[i].w<0) obstacles.splice(i,1); }
 // player physics
 if(player.jumping){ player.vy += player.gravity; player.y += player.vy; if(player.y>=player.ground){ player.y=player.ground; player.vy=0; player.jumping=false; }}
 // collision
 for(const o of obstacles){ if(rectIntersect(player,o)){ running=false; }
 }
 // speed up
 speed += 0.0005*dt;
}
function rectIntersect(a,b){ return a.x<a.x+a.w && b.x<b.x+b.w && a.y<a.y+a.h && b.y<b.y+b.h && !(a.x+a.w < b.x || a.x > b.x+b.w || a.y+a.h < b.y || a.y > b.y+b.h); }
// render
function draw(){ ctx.clearRect(0,0,width,height);
 // ground
 ctx.fillStyle='#e9d8ef'; ctx.fillRect(0,height-10,width,10);
 // player
 ctx.fillStyle='#ff66b3'; ctx.fillRect(player.x,player.y,player.w,player.h);
 // obstacles
 ctx.fillStyle='#7ad7ff'; for(const o of obstacles) ctx.fillRect(o.x,o.y,o.w,o.h);
}
let last=0; function loop(t=0){ const dt = t-last || 16; last=t; step(dt); draw(); if(running) requestAnimationFrame(loop); }
// controls
function jump(){ if(!running) start(); if(!player.jumping){ player.jumping=true; player.vy=-12; }}
document.addEventListener('keydown',e=>{ if(e.code==='Space') { e.preventDefault(); jump(); } });
canvas.addEventListener('touchstart',e=>{ e.preventDefault(); jump(); });
document.getElementById('btnPlay').addEventListener('click',()=>{ start(); });
// init
player.ground = height - player.h - 10; player.y = player.ground; draw(); updateScore();
