(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d');
  const overlay = document.getElementById('overlay');
  const startBtn = document.getElementById('startBtn');
  const overlayTitle = document.getElementById('overlayTitle');
  const overlayText = document.getElementById('overlayText');
  const spoonCountEl = document.getElementById('spoonCount');
  const healthEl = document.getElementById('health');
  const bossCountEl = document.getElementById('bossCount');
  const missionTitle = document.getElementById('missionTitle');
  const missionText = document.getElementById('missionText');
  const progressBar = document.getElementById('progressBar');
  const logEl = document.getElementById('log');

  const W = canvas.width, H = canvas.height;
  const keys = {};
  let running = false, gameOver = false, lastTime = 0, tick = 0, shake = 0;
  let player, spoons, enemies, particles, bossesDefeated, currentBoss, attackTimer, worldDecor;

  const bossNames = ['The Rusty Ladle', 'Duke Dishwater', 'THE GREAT DISHWASHER'];
  const rand = (a,b) => a + Math.random() * (b-a);
  const dist = (a,b) => Math.hypot(a.x-b.x, a.y-b.y);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));

  function log(message) {
    const p = document.createElement('p'); p.textContent = message;
    logEl.prepend(p);
    while (logEl.children.length > 5) logEl.lastChild.remove();
  }
  function setMission(title, text) { missionTitle.textContent = title; missionText.textContent = text; }
  function makeSpoon(x,y) { return {x,y, bob:rand(0,7), recruited:false}; }
  function reset() {
    player = {x:W/2,y:H/2,r:14,speed:205,hp:100,faceX:1,faceY:0,invuln:0};
    spoons = [];
    for(let i=0;i<9;i++) {
      let x,y; do {x=rand(45,W-45);y=rand(45,H-45);} while(Math.hypot(x-player.x,y-player.y)<100);
      spoons.push(makeSpoon(x,y));
    }
    enemies = []; particles = []; bossesDefeated = 0; currentBoss = null; attackTimer=0; shake=0; tick=0;
    worldDecor = Array.from({length:80},()=>({x:rand(10,W-10),y:rand(10,H-10),r:rand(2,5),type:Math.random()}));
    for(let i=0;i<4;i++) enemies.push({x:rand(45,W-45),y:rand(45,H-45),r:12,hp:2,maxHp:2,speed:rand(40,65),kind:'bug',phase:rand(0,6)});
    logEl.innerHTML=''; log('The meadow is quiet... suspiciously quiet.');
    setMission('Find your first spoon','Walk up to a wandering spoon and press E to recruit it.');
    updateUI();
  }
  function updateUI() {
    spoonCountEl.textContent = spoons.filter(s=>s.recruited).length;
    healthEl.textContent = Math.max(0,Math.ceil(player.hp));
    bossCountEl.textContent = `${bossesDefeated}/3`;
    progressBar.style.width = `${bossesDefeated/3*100}%`;
  }
  function spawnParticles(x,y,color,n=10) {
    for(let i=0;i<n;i++) particles.push({x,y,vx:rand(-100,100),vy:rand(-100,100),life:rand(.25,.7),max:.7,color,r:rand(2,5)});
  }
  function recruit() {
    let nearest=null, d=Infinity;
    for(const s of spoons) if(!s.recruited && dist(player,s)<42 && dist(player,s)<d){nearest=s;d=dist(player,s);}
    if(nearest) {
      nearest.recruited=true; spawnParticles(nearest.x,nearest.y,'#e9f8c6',18);
      log('A spoon joined the Alliance! ✨');
      const count=spoons.filter(s=>s.recruited).length;
      if(count>=3 && !currentBoss && bossesDefeated===0) setMission('A boss has arrived!','Press SPACE near the Rusty Ladle. Your recruited spoons will help.');
      else if(count===spoons.length) log('Every spoon in the meadow has joined you!');
      updateUI();
    } else log('No spoon close enough. Get closer!');
  }
  function summonBoss() {
    if(currentBoss || bossesDefeated>=3) return;
    if(spoons.filter(s=>s.recruited).length < Math.min(2, 1+bossesDefeated)) {
      log('Recruit more spoons before challenging the boss!');
      return;
    }
    currentBoss = {x:rand(130,W-130),y:rand(100,H-100),r:30,hp:10+bossesDefeated*7,maxHp:10+bossesDefeated*7,speed:48+bossesDefeated*12,kind:'boss',name:bossNames[bossesDefeated],attack:0};
    log(`${currentBoss.name} has entered the arena!`);
    setMission(`Defeat ${currentBoss.name}`, 'Get close and press SPACE to attack. Dodge its charge!');
  }
  function attack() {
    if(attackTimer>0 || gameOver) return;
    attackTimer=.38;
    const damage=1+Math.floor(spoons.filter(s=>s.recruited).length/2);
    let hit=false;
    for(const e of [...enemies, ...(currentBoss?[currentBoss]:[])]) {
      if(dist(player,e)<e.r+48) {
        e.hp-=damage; hit=true; spawnParticles(e.x,e.y,e.kind==='boss'?'#ff947d':'#f5efad',12);
        const dx=e.x-player.x,dy=e.y-player.y,l=Math.hypot(dx,dy)||1;
        e.x+=dx/l*18; e.y+=dy/l*18;
        if(e.hp<=0) {
          spawnParticles(e.x,e.y,'#f6f2cb',25);
          if(e.kind==='boss') {
            bossesDefeated++; currentBoss=null; player.hp=Math.min(100,player.hp+25);
            log(`Boss defeated! The Alliance celebrates. (${bossesDefeated}/3)`);
            if(bossesDefeated>=3) winGame();
            else { setMission('Prepare for the next boss',`Recruit spoons and press B to summon ${bossNames[bossesDefeated]}.`); }
          } else { enemies=enemies.filter(x=>x!==e); }
        }
      }
    }
    if(!hit) { spawnParticles(player.x+player.faceX*30,player.y+player.faceY*30,'#d6f36a',5); }
    updateUI();
  }
  function winGame() {
    running=false; gameOver=true; overlay.classList.remove('hidden');
    overlayTitle.textContent='THE SPOON ALLIANCE WINS!';
    overlayText.textContent='The kitchen bosses are defeated. The spoons have reclaimed the realm. Legendary stirring achieved.';
    startBtn.textContent='Play again';
  }
  function loseGame() {
    running=false; gameOver=true; overlay.classList.remove('hidden');
    overlayTitle.textContent='The spoons need you!';
    overlayText.textContent='You ran out of HP, but every legend gets another try. Recruit more allies and keep moving.';
    startBtn.textContent='Try again';
  }

  function update(dt) {
    tick+=dt; attackTimer=Math.max(0,attackTimer-dt); player.invuln=Math.max(0,player.invuln-dt);
    let dx=0,dy=0;
    if(keys.w||keys.arrowup)dy--; if(keys.s||keys.arrowdown)dy++;
    if(keys.a||keys.arrowleft)dx--; if(keys.d||keys.arrowright)dx++;
    const len=Math.hypot(dx,dy)||1;
    if(dx||dy){dx/=len;dy/=len;player.faceX=dx;player.faceY=dy;}
    player.x=clamp(player.x+dx*player.speed*dt,18,W-18);
    player.y=clamp(player.y+dy*player.speed*dt,25,H-18);

    for(const s of spoons) if(s.recruited) {
      const index=spoons.filter(a=>a.recruited).indexOf(s);
      const angle=tick*1.1+index*Math.PI*2/Math.max(1,spoons.filter(a=>a.recruited).length);
      const tx=player.x+Math.cos(angle)*42,ty=player.y+Math.sin(angle)*32;
      s.x+=(tx-s.x)*Math.min(1,dt*4); s.y+=(ty-s.y)*Math.min(1,dt*4);
    }
    for(const e of enemies) {
      const d=dist(player,e)||1; e.x+=(player.x-e.x)/d*e.speed*dt; e.y+=(player.y-e.y)/d*e.speed*dt;
      if(d<e.r+player.r && player.invuln<=0){player.hp-=7;player.invuln=.75;shake=7;spawnParticles(player.x,player.y,'#ff716d',10);log('A grub bonked you! Keep moving.');}
    }
    if(currentBoss) {
      const b=currentBoss,d=dist(player,b)||1;
      b.x+=(player.x-b.x)/d*b.speed*dt; b.y+=(player.y-b.y)/d*b.speed*dt;
      b.attack-=dt;
      if(d<b.r+player.r+4 && b.attack<=0 && player.invuln<=0) {
        player.hp-=15; player.invuln=.9; b.attack=1.2; shake=12; spawnParticles(player.x,player.y,'#ff716d',14); log(`${b.name} landed a hit!`);
      }
    }
    for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.life-=dt;p.vx*=.96;p.vy*=.96;}
    particles=particles.filter(p=>p.life>0);
    if(player.hp<=0) loseGame();
    if(!currentBoss && bossesDefeated===0 && spoons.filter(s=>s.recruited).length>=3) {
      setMission('Challenge the Rusty Ladle','Press B to summon the boss, then get close and press SPACE to whack it.');
    }
    updateUI();
  }

  function drawSpoon(x,y,scale=1,angle=0) {
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(scale,scale);
    ctx.fillStyle='#d5e2d6';ctx.strokeStyle='#5c8178';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,-8,7,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.beginPath();ctx.roundRect(-3,-2,6,23,3);ctx.fill();ctx.stroke();
    ctx.fillStyle='#fff8d4';ctx.beginPath();ctx.ellipse(-2,-11,2,3,-.3,0,Math.PI*2);ctx.fill();
    ctx.restore();
  }
  function draw() {
    ctx.save();
    if(shake>0){ctx.translate(rand(-shake,shake),rand(-shake,shake));shake=Math.max(0,shake-.7);}
    // Meadow floor
    ctx.fillStyle='#28553e';ctx.fillRect(0,0,W,H);
    ctx.fillStyle='#2c5b42';
    for(let y=0;y<H;y+=48)for(let x=0;x<W;x+=48){if(((x+y)/48)%2===0)ctx.fillRect(x,y,48,48);}
    for(const d of worldDecor) {
      ctx.fillStyle=d.type>.5?'#46734b':'#b8d16c';ctx.globalAlpha=d.type>.5?.6:.8;
      if(d.type>.5){ctx.beginPath();ctx.ellipse(d.x,d.y,d.r*1.4,d.r,rand(0,1),0,Math.PI*2);ctx.fill();}
      else {ctx.beginPath();ctx.arc(d.x,d.y,d.r*.55,0,Math.PI*2);ctx.fill();}
    } ctx.globalAlpha=1;
    // Path
    ctx.strokeStyle='#8a9360';ctx.lineWidth=70;ctx.beginPath();ctx.moveTo(-20,H*.25);ctx.bezierCurveTo(W*.35,H*.4,W*.4,H*.8,W+20,H*.65);ctx.stroke();
    ctx.strokeStyle='#a8a779';ctx.lineWidth=2;ctx.setLineDash([8,12]);ctx.beginPath();ctx.moveTo(-20,H*.25);ctx.bezierCurveTo(W*.35,H*.4,W*.4,H*.8,W+20,H*.65);ctx.stroke();ctx.setLineDash([]);
    // recruitable spoons
    for(const s of spoons) {
      if(s.recruited) {drawSpoon(s.x,s.y,.72,Math.sin(tick*2+s.bob)*.3);continue;}
      const bob=Math.sin(tick*3+s.bob)*3;
      ctx.fillStyle='#f3e7a0';ctx.globalAlpha=.18;ctx.beginPath();ctx.arc(s.x,s.y+bob,22,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
      drawSpoon(s.x,s.y+bob,1,Math.sin(tick*2+s.bob)*.12);
      ctx.fillStyle='#e7f5c5';ctx.font='bold 10px Nunito';ctx.textAlign='center';ctx.fillText('E',s.x,s.y-28+bob);
    }
    // enemies
    for(const e of enemies) {
      ctx.fillStyle='#d88b54';ctx.beginPath();ctx.ellipse(e.x,e.y,e.r+3,e.r,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#572f2a';ctx.beginPath();ctx.arc(e.x-4,e.y-2,2,0,Math.PI*2);ctx.arc(e.x+4,e.y-2,2,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#f8c078';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(e.x-6,e.y+6);ctx.lineTo(e.x+6,e.y+6);ctx.stroke();
    }
    if(currentBoss) {
      const b=currentBoss;
      ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(b.x,b.y+b.r*.8,b.r*1.2,9,0,0,Math.PI*2);ctx.fill();
      ctx.fillStyle=bossesDefeated===2?'#7c68a8':bossesDefeated===1?'#6f7c85':'#9e5a4e';
      ctx.beginPath();ctx.arc(b.x,b.y,b.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#dce7d7';ctx.beginPath();ctx.arc(b.x-9,b.y-5,5,0,Math.PI*2);ctx.arc(b.x+9,b.y-5,5,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#24312c';ctx.beginPath();ctx.arc(b.x-8,b.y-5,2,0,Math.PI*2);ctx.arc(b.x+10,b.y-5,2,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#f1d7b7';ctx.font='bold 12px Nunito';ctx.textAlign='center';ctx.fillText(b.name,b.x,b.y-b.r-24);
      ctx.fillStyle='#26302b';ctx.fillRect(b.x-35,b.y-b.r-17,70,6);
      ctx.fillStyle='#ff7d72';ctx.fillRect(b.x-35,b.y-b.r-17,70*Math.max(0,b.hp/b.maxHp),6);
    }
    // Player shadow/body
    ctx.fillStyle='#0004';ctx.beginPath();ctx.ellipse(player.x,player.y+12,16,7,0,0,Math.PI*2);ctx.fill();
    if(player.invuln<=0||Math.floor(tick*15)%2===0) {
      ctx.fillStyle='#e2f36d';ctx.beginPath();ctx.arc(player.x,player.y,player.r,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#203c31';ctx.beginPath();ctx.arc(player.x+player.faceX*5-3,player.y+player.faceY*4-3,2.5,0,Math.PI*2);ctx.arc(player.x+player.faceX*5+4,player.y+player.faceY*4-3,2.5,0,Math.PI*2);ctx.fill();
      if(attackTimer>.15) {ctx.strokeStyle='#f9f4c7';ctx.lineWidth=6;ctx.beginPath();ctx.arc(player.x+player.faceX*24,player.y+player.faceY*24,22,-1.4,1.4);ctx.stroke();}
    }
    for(const p of particles){ctx.globalAlpha=Math.max(0,p.life/p.max);ctx.fillStyle=p.color;ctx.beginPath();ctx.arc(p.x,p.y,p.r,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;
    // instructions / boss summoning
    ctx.fillStyle='#102b25cc';ctx.fillRect(12,12,225,35);
    ctx.fillStyle='#e8f3d6';ctx.font='12px DM Mono';ctx.textAlign='left';
    ctx.fillText(currentBoss?'BOSS FIGHT  •  SPACE TO ATTACK':'B TO SUMMON NEXT BOSS  •  SPACE ATTACK',22,34);
    ctx.restore();
  }
  function loop(now) {
    const dt=Math.min(.033,(now-lastTime)/1000||0);lastTime=now;
    if(running) update(dt);
    draw();
    requestAnimationFrame(loop);
  }
  window.addEventListener('keydown',e=>{
    const k=e.key.toLowerCase();
    if(['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k)) e.preventDefault();
    keys[k]=true;
    if(!running||gameOver)return;
    if(k==='e') recruit();
    if(k===' ') attack();
    if(k==='b') summonBoss();
    if(k==='r'&&gameOver) startGame();
  });
  window.addEventListener('keyup',e=>keys[e.key.toLowerCase()]=false);
  startBtn.addEventListener('click',startGame);
  function startGame() {
    reset(); gameOver=false;running=true;lastTime=performance.now();overlay.classList.add('hidden');
    startBtn.textContent='Start the adventure';
    log('Your quest begins. Find the shiny ones!');
  }
  reset(); draw(); requestAnimationFrame(loop);
})();