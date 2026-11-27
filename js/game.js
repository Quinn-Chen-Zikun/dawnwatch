'use strict';
/* 破晓守望 · 玩法层：游戏状态、战斗、队友 AI、剧情推进与界面逻辑 */
applyMap('yard',false);
let mode = 'menu', player, enemies, acidShots, ammo, used, wave, waveTime, spawnQueue, spawnClock, kills, gun;
let reloadTime, cooldown, recoil, muzzle, wounded, hitTime, headshot, step, noticeTime, noticeText;
let firing=false, aimPointer=null, joyId=null, joyX=0, joyY=0, pressed=false, pitch=0;
let frames=0, last=performance.now(), routeClock=0, route=[], lastSpawn=-1, spawnHistory=[], audio=null, noise=null;
let ambience=null, ambientBuffer=null, audioMaster=null;
let alarm=0, lightning=0, nextLightning=600, enemyStepCooldown=0, damageTime=0, damageDir=0;
let grenadeCount=2, grenadeCooldown=0, grenadeLive=[], explosions=[], blast=0, aiming=false;
let meleeCooldown=0, meleeFlash=0, heartbeatClock=0;
let runShots=0, runHits=0, runHeadshots=0, runGrenadeKills=0, runMeleeKills=0, runEliteKills=0, runBossKills=0, runDamage=0;
const specialGate={spitter:0,screamer:0};
let muted=read('blackout-muted','0')==='1';
let sensitivity=Math.min(2,Math.max(.5,Number(read('blackout-sens','1'))||1));
let fovScale=Math.min(1.15,Math.max(.85,Number(read('blackout-fov','1'))||1));
let effectsOn=read('blackout-fx','1')!=='0';
let masterVolume=Math.min(1,Math.max(0,Number(read('blackout-vol','.8'))||.8));
let gameMode=read('blackout-mode','standard')==='endless'?'endless':'standard';
let depth, rays, focal, sky, floor, eye=1.35;
let playStyle=read('blackout-style','survival')==='story'?'story':'survival';
let survivalMap=read('blackout-map','yard');
if(!MAPS[survivalMap]) survivalMap='yard';
let storyChapter=Math.max(0,Math.min(4,Number(read('blackout-story-chapter','0'))||0));
let storyProgress=Math.max(0,Math.min(5,Number(read('blackout-story-progress','0'))||0));
if(storyChapter>storyProgress) storyChapter=storyProgress;
let story=null,npcs=[],corpses=[],bloodMotes=[],bloodPools=[],tracers=[];
let dialogueQueue=[],dialogueCurrent=null,modalActionFn=null;
function cell(x,y) {return map[y]?.[x] ?? '#';}
function solid(x,y) {return cell(x,y)!=='.';}
function fits(x,y,r) {
 return !solid(Math.floor(x-r),Math.floor(y-r)) && !solid(Math.floor(x+r),Math.floor(y-r)) &&
        !solid(Math.floor(x-r),Math.floor(y+r)) && !solid(Math.floor(x+r),Math.floor(y+r));
}
function floorAt(x,y) {
 const heights=MAP&&MAP.heights;
 if(!heights) return 0;
 const cx=Math.floor(x),cy=Math.floor(y);
 if(cx<0||cy<0||cx>=columns||cy>=rows) return 0;
 return heights[cy*columns+cx]||0;
}
function move(actor,dx,dy,radius) {
 const base=floorAt(actor.x,actor.y);
 if(fits(actor.x+dx,actor.y,radius)&&Math.abs(floorAt(actor.x+dx,actor.y)-base)<=.62) actor.x+=dx;
 if(fits(actor.x,actor.y+dy,radius)&&Math.abs(floorAt(actor.x,actor.y+dy)-base)<=.62) actor.y+=dy;
}
function ray(x,y,dx,dy,shotSlope=null) {
 let gx=Math.floor(x), gy=Math.floor(y);
 const sx=Math.sign(dx), sy=Math.sign(dy);
 const ax=Math.abs(1/dx), ay=Math.abs(1/dy);
 let tx=dx===0?Infinity:ax*(sx<0?x-gx:gx+1-x);
 let ty=dy===0?Infinity:ay*(sy<0?y-gy:gy+1-y);
 let dist=0,side=0;
 for(let i=0;i<96;i++) {
  if(tx<ty) {dist=tx;tx+=ax;gx+=sx;side=0;} else {dist=ty;ty+=ay;gy+=sy;side=1;}
  if (!solid(gx,gy)) continue;
  if(shotSlope!==null && eye+shotSlope*dist>coverHeight(gx,gy)) continue;
  const pos=side===0?y+dy*dist:x+dx*dist;
  return {dist,side,gx,gy,u:pos-Math.floor(pos),kind:cell(gx,gy)};
 }
 return {dist:80,side:0,gx,gy,u:0,kind:'#'};
}
function visible(x,y,tx,ty) {
 const dx=tx-x,dy=ty-y,dist=Math.hypot(dx,dy);
 return dist<.01 || ray(x,y,dx/dist,dy/dist).dist>dist-.03;
}
function mutuallyVisible(a,b) {
 return visible(a.x,a.y,b.x,b.y)&&visible(b.x,b.y,a.x,a.y);
}
function walkableLine(x,y,tx,ty,radius,stopShort=0) {
 const dx=tx-x,dy=ty-y,distance=Math.hypot(dx,dy);
 if(distance<=stopShort) return true;
 const fraction=(distance-stopShort)/distance;
 const samples=Math.ceil((distance-stopShort)/.19),base=floorAt(x,y);
 for(let i=1;i<=samples;i++) {
  const t=fraction*i/samples;
  if(!fits(x+dx*t,y+dy*t,radius)||Math.abs(floorAt(x+dx*t,y+dy*t)-base)>.62) return false;
 }
 return true;
}
function resize() {
 W.width=Math.min(1040,Math.max(320,Math.round(innerWidth*.81)));
 W.height=Math.round(W.width*innerHeight/innerWidth);
 focal=W.width*.76*fovScale;
 depth=new Float32Array(W.width);
 rays=Array.from({length:W.width},(_,i)=>(i+.5-W.width/2)/focal);
 const theme=MAP.theme;
 sky=ctx.createLinearGradient(0,0,0,W.height*.64);
 sky.addColorStop(0,theme.sky[0]);sky.addColorStop(.56,theme.sky[2]);sky.addColorStop(1,theme.sky[3]);
 floor=ctx.createLinearGradient(0,W.height*.41,0,W.height);
 floor.addColorStop(0,theme.floor[0]);floor.addColorStop(.38,theme.floor[1]);floor.addColorStop(1,theme.floor[2]);
}
addEventListener('resize',resize);resize();
function rng(seed) {
 return () => {seed=Math.imul(1664525,seed)+1013904223|0;return (seed>>>0)/4294967296;};
}
function makeTextures() {
 const result={};
 for(const kind of ['brick','steel','crate']) {
  const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
  const g=canvas.getContext('2d'), random=rng(kind.length*812+kind.charCodeAt(0));
  g.fillStyle={brick:'#353e3b',steel:'#4e4b41',crate:'#544739'}[kind];g.fillRect(0,0,64,64);
  for(let i=0;i<860;i++) {
   const level=random()>.55?210:0;
   g.fillStyle='rgba('+level+','+level+','+level+','+(random()*.22)+')';
   g.fillRect(random()*64,random()*64,1+random()*3,1);
  }
  if(kind==='brick') {
   for(let y=0;y<64;y+=16) {
    g.fillStyle='#232b2a';g.fillRect(0,y,64,2);
    g.fillRect(y%32?14:31,y,2,16);g.fillRect(y%32?47:0,y,2,16);
   }
   g.fillStyle='#7a684d';g.fillRect(0,47,64,3);g.fillStyle='#2d3129';g.fillRect(0,53,64,3);
  } else if(kind==='steel') {
   for(let x=0;x<64;x+=8) {
    g.fillStyle='#6b6554';g.fillRect(x,0,2,64);g.fillStyle='#2a2d27';g.fillRect(x+3,0,2,64);
   }
   g.fillStyle='#a89560';g.fillRect(0,54,64,7);g.fillStyle='#282a22';
   for(let x=2;x<64;x+=14) {g.beginPath();g.moveTo(x,54);g.lineTo(x+5,54);g.lineTo(x+1,61);g.lineTo(x-4,61);g.fill();}
  } else {
   g.strokeStyle='#292a22';g.lineWidth=3;g.strokeRect(2,2,60,60);
   g.strokeStyle='#907b55';g.lineWidth=3;g.beginPath();g.moveTo(6,57);g.lineTo(57,6);g.stroke();
   g.font='700 9px monospace';g.fillStyle='#c2b389';g.fillText('CARGO',17,35);
  }
  result[kind]=canvas;
 }
 return result;
}
const texture=makeTextures();
function polygon(g,points,fill) {
 g.fillStyle=fill;g.beginPath();g.moveTo(points[0],points[1]);
 for(let i=2;i<points.length;i+=2) g.lineTo(points[i],points[i+1]);
 g.closePath();g.fill();
}
function zombieImage(type,phase,flash=false) {
 const canvas=document.createElement('canvas');canvas.width=80;canvas.height=126;
 const g=canvas.getContext('2d'), style=types[type], stride=Math.sin(phase/6*TAU)*7;
 const b=type==='boss'?7:type==='brute'||type==='shield'?4:0;
 g.fillStyle='#171913';g.beginPath();g.ellipse(40,121,28,4,0,0,TAU);g.fill();
 polygon(g,[24-b,72,40,72,36+stride,116,21+stride,119,19+stride,114],'#242724');
 polygon(g,[39,74,54+b,72,58-stride,114,54-stride,120,44-stride,118],'#343630');
 polygon(g,[26-b,32,52+b,32,61+b,48,54+b,79,25-b,82,20-b,52],flash?'#be684e':style.shirt);
 polygon(g,[28,38,37,40,35,73,26,77,24,51],'#ffffff17');
 polygon(g,[21-b,38,14-b,45,9+stride,64,3+stride,69,12+stride,74,23,61,28,47],style.skin);
 polygon(g,[52,40,64+b,45,69-stride,59,76-stride,60,77-stride,68,66-stride,71,57,61],style.skin);
 polygon(g,[29-b,11,43,8,52+b,17,53+b,34,45,43,34,41,25-b,28,25-b,18],'#1e2318');
 polygon(g,[31-b,14,44,12,50+b,20,48+b,34,43,40,34,37,28-b,27],flash?'#df9670':style.skin);
 polygon(g,[28-b,24,37,21,42,24,49+b,21,49+b,28,42,30,36,27,29-b,29],'#292d22');
 g.fillStyle='#ffbb60';g.fillRect(31-b,24,5,2);g.fillRect(44,24,5+b,2);
 g.fillStyle='#34271f';g.fillRect(36,33,10,4);
 g.fillStyle='#beaf7e';g.fillRect(38,33,5,1);
 polygon(g,[31,48,42,46,45,51,37,61,35,72,30,67],'#29251d91');
 g.fillStyle='#a06b46';g.fillRect(44,52,4,8);g.fillRect(24,68,3,7);
 if(type==='shield') {
  polygon(g,[17,47,60,47,60,82,52,91,24,91,17,83],'#303d49');
  g.strokeStyle='#637887';g.lineWidth=2;g.strokeRect(19,49,39,37);
  g.fillStyle='#828d94';g.fillRect(24,57,29,5);
 } else if(type==='spitter') {
  g.fillStyle='#a9bf67';g.fillRect(34,34,14,8);g.fillRect(44,47,5,12);
 } else if(type==='screamer') {
  g.fillStyle='#281719';g.beginPath();g.ellipse(41,34,6,7,0,0,TAU);g.fill();
 } else if(type==='bomber') {
  const glow=g.createRadialGradient(40,58,2,40,58,17);
  glow.addColorStop(0,'#ffe08a');glow.addColorStop(.45,'#e05a32');glow.addColorStop(1,'#54160d00');
  g.fillStyle=glow;g.beginPath();g.ellipse(40,58,17,18,0,0,TAU);g.fill();
  g.fillStyle='#ffcf7a';g.fillRect(37,52,6,4);
 }
 return {canvas,pixels:g.getImageData(0,0,canvas.width,canvas.height).data};
}
const sprites=Object.fromEntries(Object.keys(types).map(type=>[type,Array.from({length:7},(_,frame)=>zombieImage(type,frame%6,frame===6))]));
function makeSupplySprite(body,top,accent,stripe) {
 const canvas=document.createElement('canvas');canvas.width=72;canvas.height=56;
 const g=canvas.getContext('2d');
 g.fillStyle='#161f16';g.fillRect(4,15,64,37);
 g.fillStyle=body;g.fillRect(5,17,62,31);
 polygon(g,[4,15,12,7,59,7,68,15],top);
 g.fillStyle='#232d20';g.fillRect(7,33,59,3);g.fillRect(18,17,4,32);g.fillRect(50,17,4,32);
 g.fillStyle=accent;g.fillRect(30,29,12,3);g.fillRect(34,25,4,11);
 g.fillStyle=stripe;g.fillRect(11,29,3,10);g.fillRect(58,29,3,10);
 return canvas;
}
const supplySprites={
 yard:makeSupplySprite('#435542','#758265','#d8f36d','#adbf82'),
 subway:makeSupplySprite('#42545a','#6d8b91','#89e8ed','#9fc3c8'),
 tunnel:makeSupplySprite('#55472c','#877346','#e9a85f','#c4a15e'),
 hospital:makeSupplySprite('#5d6b64','#92a59b','#ff8575','#b7c7bd'),
 prison:makeSupplySprite('#3f4b3f','#6c7f68','#ffcf7a','#a9b7a0')
};
const usedSupplySprites={};
for(const [key,img] of Object.entries(supplySprites)) {
 const canvas=document.createElement('canvas');canvas.width=img.width;canvas.height=img.height;
 const g=canvas.getContext('2d');g.filter='saturate(.3) brightness(.55)';g.drawImage(img,0,0);
 usedSupplySprites[key]=canvas;
}
const acidSprite=document.createElement('canvas');
acidSprite.width=acidSprite.height=48;
{
 const g=acidSprite.getContext('2d'),glow=g.createRadialGradient(21,20,1,24,24,23);
 glow.addColorStop(0,'#e0fba3');glow.addColorStop(.34,'#c0e668');glow.addColorStop(.63,'#70a43d');
 glow.addColorStop(1,'#3d681600');
 g.fillStyle=glow;g.fillRect(0,0,48,48);
}
function acidDrawables() {
 return acidShots.map(a=>({x:a.x,y:a.y,base:1.02,height:.27,img:acidSprite,kind:2}));
}
function warningImage(kind) {
 const canvas=document.createElement('canvas');canvas.width=canvas.height=64;
 const g=canvas.getContext('2d'),spitter=kind==='spitter';
 const color=spitter?'#8df06a':'#ff7959',core=spitter?'#e4ffc4':'#ffe0cf';
 g.translate(32,32);
 g.fillStyle=spitter?'#17300fdd':'#3b140fdd';
 g.beginPath();g.arc(0,0,22,0,TAU);g.fill();
 g.strokeStyle=color;g.lineWidth=3;g.beginPath();g.arc(0,0,19,0,TAU);g.stroke();
 g.strokeStyle=core;g.lineWidth=3;g.lineCap='round';g.lineJoin='round';
 if(spitter) {
  g.beginPath();g.moveTo(-9,-7);g.lineTo(0,4);g.lineTo(9,-7);g.stroke();
  g.beginPath();g.moveTo(-9,5);g.lineTo(0,16);g.lineTo(9,5);g.stroke();
 } else {
  g.beginPath();g.moveTo(0,-17);g.lineTo(16,13);g.lineTo(-16,13);g.closePath();g.stroke();
  g.fillStyle=core;g.fillRect(-2.2,-6,4.4,11);
  g.beginPath();g.arc(0,10,2.3,0,TAU);g.fill();
 }
 return canvas;
}
const warningImages={spitter:warningImage('spitter'),screamer:warningImage('screamer')};
function warningDrawables(source) {
 const out=[];
 for(const z of source) {
  if(!(z.specialWindup>0)||!visible(player.x,player.y,z.x,z.y)) continue;
  const img=warningImages[z.type];
  if(!img) continue;
  const pulse=.90+.10*Math.sin(frames*.55+z.x*1.7+z.y*2.3);
  out.push({x:z.x,y:z.y,base:types[z.type].height+.07,height:.42*pulse,img,kind:2});
 }
 return out;
}
function zombieFrame(z,advance=0) {
 return sprites[z.type][z.flash>0?6:Math.floor(z.anim+advance)%6];
}
function setNotice(message,time=1.9) {noticeText=message;noticeTime=time;}
function hitFeedback(critical,killed,armored=false,elite=false,boss=false) {
 if(!critical&&!killed&&!armored) return;
 const feed=$('feed'),ring=$('killRing');
 feed.textContent=killed?(boss?'首领击倒':elite?'精英击倒':critical?'爆头 · 击倒':'击倒'):armored?'盾牌挡弹':'爆头';
 if(killed&&boss) tone(66,.85,'sawtooth',.18,28);
 feed.className=critical||elite?'head':armored?'armor':'';
 if(killed) feed.classList.add('kill');
 void feed.offsetWidth;feed.classList.add('show');
 if(killed) {
  ring.className=critical?'head':'';
  void ring.offsetWidth;ring.classList.add('show');
 }
}
function initAmmo() {
 ammo={};
 for(const def of ownedWeapons()) {
  const stats=gunStats(def);
  ammo[def.id]={mag:stats.capacity,reserve:stats.startReserve};
 }
}
function reset() {
 player={...worldStart,hp:100};eye=1.35+floorAt(player.x,player.y);
 enemies=[];acidShots=[];initAmmo();
 npcs=[];corpses=[];bloodMotes=[];bloodPools=[];tracers=[];dialogueQueue=[];dialogueCurrent=null;story=null;
 used=supplies.map(()=>0);wave=0;waveTime=0;spawnQueue=[];spawnClock=0;kills=0;gun=0;runCredits=0;
 reloadTime=cooldown=recoil=muzzle=wounded=hitTime=step=noticeTime=pitch=routeClock=0;
 noticeText='';headshot=false;route=[];lastSpawn=-1;spawnHistory=[];
 specialGate.spitter=specialGate.screamer=enemyStepCooldown=0;damageTime=0;damageDir=0;
 grenadeCount=grenadeStartCount();grenadeCooldown=0;grenadeLive.length=0;explosions.length=0;blast=0;meleeCooldown=0;meleeFlash=0;heartbeatClock=0;setAiming(false);
 runShots=runHits=runHeadshots=runGrenadeKills=runMeleeKills=runEliteKills=runBossKills=runDamage=0;
}
reset();
function setMode(next) {
 mode=next;document.body.classList.toggle('playing',mode==='play');
 document.body.classList.toggle('storyplay',mode==='play'&&!!story);
 if(mode!=='play') setAiming(false);
 if(mode==='menu'||mode==='over') stopAmbience();
 $('menu').hidden=mode!=='menu';$('hud').hidden=mode!=='play';
 $('storyHud').hidden=mode!=='play'||!story;
 $('touch').hidden=mode!=='play'||!mobile;
 $('modal').hidden=mode==='menu'||mode==='play'||mode==='map';
 $('tactical').hidden=mode!=='map';
 if(mode!=='play') {
  $('feed').className='';$('killRing').className='';
  keys.clear();firing=false;aimPointer=null;joyId=null;joyX=joyY=0;
  $('subtitle').classList.remove('show');dialogueCurrent=null;dialogueQueue.length=0;
  $('stick').firstElementChild.style.transform='none';
  if(document.pointerLockElement===W) {pressed=false;document.exitPointerLock();}
 }
 if(mode==='menu') syncMenu();
}
function syncMenu() {
 const def=MAPS[selectedMap],storyMode=playStyle==='story',chapter=STORY_CHAPTERS[storyChapter];
 $('survivalOptions').hidden=storyMode;
 $('storyOptions').hidden=!storyMode;
 $('styleSurvival').classList.toggle('active',!storyMode);
 $('styleStory').classList.toggle('active',storyMode);
 $('styleSurvival').setAttribute('aria-pressed',String(!storyMode));
 $('styleStory').setAttribute('aria-pressed',String(storyMode));
 $('start').innerHTML=storyMode?((storyProgress>0?'继续':'开始')+'战役 · '+chapter.code+' <span aria-hidden="true">↗</span>'):'进入隔离区 <span aria-hidden="true">↗</span>';
 $('menuKicker').textContent=storyMode?'剧情战役 / STORY CAMPAIGN · 三人小队':'单人生存 / ZOMBIE SURVIVAL';
 $('menuBlurb').textContent=storyMode?chapter.brief:def.blurb;
 $('sectorTag').textContent=storyMode?(chapter.place+' / '+columns+' × '+rows):def.code+' / '+columns+' × '+rows;
 $('sectorName').textContent=storyMode?chapter.title:def.name;
 $('footSector').textContent=storyMode?('CAMPAIGN · '+chapter.place):(def.name+' · 南侧通往'+ANNEXES[selectedMap].name);
 $('best').textContent=storyMode?('战役进度 / '+storyProgress+' / '+STORY_CHAPTERS.length+' 章'):(best?'最佳纪录 / 通过 '+best+' 波':'最佳纪录 / —');
 renderStoryOptions();
 $('menuCredits').textContent='₡ '+credits;
 $('modeStandard').classList.toggle('active',gameMode==='standard');
 $('modeEndless').classList.toggle('active',gameMode==='endless');
 $('modeStandard').setAttribute('aria-pressed',String(gameMode==='standard'));
 $('modeEndless').setAttribute('aria-pressed',String(gameMode==='endless'));
 for(const button of document.querySelectorAll('.mapChoice')) {
  const on=button.dataset.map===selectedMap;
  button.classList.toggle('active',on);
  button.setAttribute('aria-pressed',String(on));
 }
}
function buyWeapon(id) {
 const def=WEAPON_BY_ID[id];
 if(!def||armory.owned.includes(id)||credits<def.price) return;
 credits-=def.price;armory.owned.push(id);armory.credits=credits;ensureWeaponState(id);saveArmory();
 shopWeapon=id;tone(420,.16,'triangle',.09,690);renderArmory();syncMenu();
}
function buyUpgrade(id,key) {
 const def=UPGRADE_DEFS[key];if(!def||!armory.owned.includes(id)) return;
 const level=upgradesOf(id)[key];if(level>=def.max) return;
 const cost=upgradeCost(id,key);if(credits<cost) return;
 credits-=cost;armory.credits=credits;upgradesOf(id)[key]=level+1;saveArmory();
 tone(500,.13,'triangle',.08,760);renderArmory();syncMenu();
}
function buyEquipment(key) {
 const def=EQUIPMENT_DEFS[key];if(!def) return;
 const level=equipmentLevel(key);if(level>=def.max) return;
 const cost=equipmentCost(key);if(credits<cost) return;
 credits-=cost;armory.credits=credits;armory.equipment[key]=level+1;saveArmory();
 tone(460,.14,'triangle',.08,700);renderArmory();syncMenu();
}
function buyOrEquipSkin(id,key) {
 if(!armory.owned.includes(id)||!SKINS[key]) return;
 const state=armory.weapons[id];
 if(!state.skins.includes(key)) {
  const cost=SKINS[key].price;if(credits<cost) return;
  credits-=cost;armory.credits=credits;state.skins.push(key);
 }
 state.skin=key;saveArmory();tone(540,.12,'triangle',.07,820);renderArmory();syncMenu();
}
function renderArmory() {
 if(!WEAPON_BY_ID[shopWeapon]) shopWeapon='rifle';
 $('armoryCredits').textContent='₡ '+credits;
 const tabs=$('weaponTabs');tabs.innerHTML='';
 for(const def of WEAPONS) {
  const owned=armory.owned.includes(def.id);
  const button=document.createElement('button');
  button.className='weaponTab'+(def.id===shopWeapon?' active':'')+(owned?'':' locked');
  button.type='button';button.setAttribute('role','tab');
  button.innerHTML=`<b>${def.short}</b><small>${owned?'已拥有':'₡ '+def.price}</small>`;
  button.onclick=()=>{shopWeapon=def.id;renderArmory();};
  tabs.appendChild(button);
 }
 const def=WEAPON_BY_ID[shopWeapon]||WEAPONS[0],owned=armory.owned.includes(def.id);
 const stats=gunStats(def),up=upgradesOf(def.id),skin=skinOf(def.id);
 const detail=$('weaponDetail');
 const upgradeRows=Object.entries(UPGRADE_DEFS).map(([key,u])=>{
  const level=up[key],max=level>=u.max,cost=upgradeCost(def.id,key);
  return `<div class="upgradeRow"><span>${u.name} · ${u.effect}</span><span class="pips">${Array.from({length:u.max},(_,i)=>`<i class="${i<level?'on':''}"></i>`).join('')}</span><button type="button" data-up="${key}" ${!owned||max||credits<cost?'disabled':''}>${max?'满级':'₡ '+cost}</button></div>`;
 }).join('');
 const equipRows=Object.entries(EQUIPMENT_DEFS).map(([key,u])=>{
  const level=equipmentLevel(key),max=level>=u.max,cost=equipmentCost(key);
  return `<div class="upgradeRow"><span>${u.name} · ${u.effect}</span><span class="pips">${Array.from({length:u.max},(_,i)=>`<i class="${i<level?'on':''}"></i>`).join('')}</span><button type="button" data-equip="${key}" ${max||credits<cost?'disabled':''}>${max?'满级':'₡ '+cost}</button></div>`;
 }).join('');
 const skins=Object.entries(SKINS).map(([key,s])=>{
  const has=armory.weapons[def.id].skins.includes(key),equipped=armory.weapons[def.id].skin===key;
  return `<button type="button" class="skinSwatch${equipped?' active':''}" data-skin="${key}" ${!owned||(!has&&credits<s.price)?'disabled':''}><i style="background:${s.body};box-shadow:inset 0 0 0 4px ${s.accent}"></i>${s.name}${!has?`<small>₡ ${s.price}</small>`:equipped?'<small>使用中</small>':''}</button>`;
 }).join('');
 detail.innerHTML=`
  <div class="weaponCard">
   <h3>${def.name}</h3>
   <p class="tagline">${def.desc}</p>
   <div class="statGrid">
    <div>${stats.pellets>1?'每弹丸伤害':'单发伤害'}<b>${stats.damage.toFixed(0)}</b></div>
    <div>单发总伤害<b>${(stats.damage*stats.pellets).toFixed(0)}</b></div>
    <div>弹匣容量<b>${stats.capacity}</b></div>
    <div>理论射速<b>${Math.round(60/stats.delay)}/分</b></div>
    <div>装填时间<b>${stats.reload.toFixed(2)}s</b></div>
    <div>弹丸数<b>${stats.pellets}</b></div>
    <div>基础扩散<b>${(stats.spread*180/Math.PI).toFixed(1)}°</b></div>
   </div>
   ${owned?`<p class="tagline" style="margin-top:10px">当前涂装：${skin.name}。配件等级会直接改变武器数值，并在枪身上显示瞄具、握把和扩容弹匣。</p>`:`<button type="button" class="primary buyWide" data-buy="${def.id}" ${credits<def.price?'disabled':''}>购买 ${def.name} · ₡ ${def.price}</button>`}
  </div>
  <div class="weaponCard">
   <h3>配件升级</h3>
   <div class="upgradeList">${owned?upgradeRows:'<p class="tagline">购买武器后解锁伤害、弹匣、装填与稳定四类配件。</p>'}</div>
   <h3 style="margin-top:15px">涂装</h3>
   <div class="skinList">${owned?skins:'<p class="tagline">购买武器后可用军费解锁制式、都市迷彩、余烬、极地和霓虹涂装。</p>'}</div>
  </div>
  <div class="weaponCard equipCard"><h3>装备升级</h3><div class="upgradeList">${equipRows}</div><p class="tagline" style="margin-top:10px">装备升级对所有武器生效：更多手雷、更高爆炸伤害和更低受到伤害。</p></div>`;
 detail.querySelectorAll('[data-buy]').forEach(button=>button.onclick=()=>buyWeapon(button.dataset.buy));
 detail.querySelectorAll('[data-up]').forEach(button=>button.onclick=()=>buyUpgrade(def.id,button.dataset.up));
 detail.querySelectorAll('[data-skin]').forEach(button=>button.onclick=()=>buyOrEquipSkin(def.id,button.dataset.skin));
 detail.querySelectorAll('[data-equip]').forEach(button=>button.onclick=()=>buyEquipment(button.dataset.equip));
}
function setGameMode(mode) {
 gameMode=mode==='endless'?'endless':'standard';
 save('blackout-mode',gameMode);syncMenu();
 tone(300,.1,'triangle',.05,460);
}
function selectPlayStyle(style) {
 const next=style==='story'?'story':'survival';
 if(next===playStyle) return;
 playStyle=next;save('blackout-style',playStyle);
 applyMap(playStyle==='story'?STORY_CHAPTERS[storyChapter].map:survivalMap,true);
 tone(300,.11,'triangle',.05,470);
}
function selectStoryChapter(index) {
 if(index<0||index>storyProgress||index>=STORY_CHAPTERS.length||index===storyChapter) return;
 storyChapter=index;save('blackout-story-chapter',storyChapter);
 applyMap(STORY_CHAPTERS[index].map,true);
 tone(340,.1,'triangle',.05,500);
}
function renderStoryOptions() {
 const list=$('chapterList');
 if(!list) return;
 list.innerHTML=STORY_CHAPTERS.map((chapter,index)=>{
  const unlocked=index<=storyProgress,cleared=index<storyProgress;
  return '<button type="button" class="chapterChoice'+(index===storyChapter?' active':'')+(unlocked?'':' locked')+'" data-chapter="'+index+'" '+(unlocked?'':'disabled')+'><small>'+chapter.code+'</small>'+chapter.title+(cleared?' · 已通过':'')+'</button>';
 }).join('');
 list.querySelectorAll('[data-chapter]').forEach(button=>button.onclick=()=>{
  if(mode==='menu') selectStoryChapter(Number(button.dataset.chapter));
 });
}
function selectMap(id) {
 if(!MAPS[id]||id===selectedMap) return;
 survivalMap=id;save('blackout-map',id);
 applyMap(id,true);
 tone(320,.09,'triangle',.045,470);
}
function setAiming(on) {
 if(mode!=='play') on=false;
 aiming=on;document.body.classList.toggle('aiming',on);
}
function lockAim() {
 if(mobile || document.pointerLockElement===W || !W.requestPointerLock) return;
 try {W.requestPointerLock()?.catch(()=>{});} catch {}
}
function start() {
 if(playStyle==='story'){startStory(storyChapter);return;}
 reset();activateAudio();startAmbience();setMode('play');nextWave();lockAim();
}

function say(who,line,time=4.2) {
 if(!line) return;
 dialogueQueue.push({who,line,time});
 if(!dialogueCurrent) nextDialogue();
}
function nextDialogue() {
 dialogueCurrent=dialogueQueue.shift()||null;
 const box=$('subtitle');
 if(!dialogueCurrent) {box.classList.remove('show');return;}
 const names={qin:'老秦',lin:'林夏',qi:'小七',narr:'· 记录 ·',radio:'撤离车队'};
 $('subSpeaker').textContent=names[dialogueCurrent.who]||'';
 $('subLine').textContent=dialogueCurrent.line;
 box.classList.toggle('narr',dialogueCurrent.who==='narr'||dialogueCurrent.who==='radio');
 box.classList.add('show');
 dialogueCurrent.t=dialogueCurrent.time;
}
function updateDialogue(dt) {
 if(!dialogueCurrent) {if(dialogueQueue.length) nextDialogue(); return;}
 dialogueCurrent.t-=dt;
 if(dialogueCurrent.t<=0) nextDialogue();
}
function spawnSquad() {
 npcs=STORY_SQUAD.map((squad,index)=>{
  const angle=player.angle+Math.PI+(index-1)*.62,reach=1.35+index*.32;
  let x=player.x+Math.cos(angle)*reach,y=player.y+Math.sin(angle)*reach;
  if(!fits(x,y,.22)) {x=player.x;y=player.y;}
  return {friendly:true,type:'walker',kind:{height:squad.height},squad,
   x,y,yaw:player.angle,anim:Math.random()*6,flash:0,
   hp:120,maxHp:120,downed:false,downT:0,downDir:0,revive:0,
   fireCd:.7+Math.random()*.9,hurtCd:0,barkCd:16+Math.random()*10,muzzle:0,sideBias:index===2?1:index===1?-1:1};
 });
}
function storyEnemyType(chapter) {
 const pools=[
  ['walker','walker','runner'],
  ['walker','runner','runner','shield'],
  ['walker','runner','shield','spitter','bomber'],
  ['walker','runner','shield','spitter','bomber','brute','screamer'],
  ['runner','shield','spitter','bomber','brute','screamer']
 ];
 const pool=pools[clamp(chapter,0,pools.length-1)];
 return pool[Math.floor(Math.random()*pool.length)];
}
function spawnAt(type,x,y,elite=false) {
 const boss=type==='boss',profile=boss?(BOSS_PROFILES[selectedMap]||BOSS_PROFILES.yard):null;
 const hp=boss?profile.hp:(types[type].hp+Math.max(wave-3,0)*5)*(elite?1.8:1);
 enemies.push({type,x,y,hp,maxHp:hp,attack:.55,anim:Math.random()*6,flash:0,tint:(Math.random()*2-1)*.07,
  specialCooldown:1.2+Math.random()*.8,specialWindup:0,specialAim:null,rage:0,elite,boss,
  bossName:boss?profile.name:null,damageScale:boss?profile.damage/34:elite?1.3:1,
  speedScale:boss?profile.speed/.72:elite?1.1:1});
 if(boss) {setNotice(profile.name+' 出现',2.8);tone(62,.9,'sawtooth',.15,28);}
}
function startStory(index) {
 storyChapter=clamp(index,0,STORY_CHAPTERS.length-1);
 const chapter=STORY_CHAPTERS[storyChapter];
 applyMap(chapter.map,true);
 reset();
 story={chapter:storyChapter,act:0,objective:null,spawned:0,spawnTimer:1,aliveCap:6,bossSpawned:false,barkClock:0,ended:false};
 wave=storyChapter*2+1;
 spawnSquad();
 activateAudio();startAmbience();setMode('play');lockAim();
 if(chapter.intro) for(const [who,line] of chapter.intro) say(who,line,4.2);
 setupStoryAct(0,true);
}
function setupStoryAct(index,first) {
 const chapter=STORY_CHAPTERS[story.chapter],act=chapter.acts[index];
 if(!act) return;
 story.act=index;story.spawned=0;story.spawnTimer=first?6.5:2.4;story.phaseTime=0;
 story.aliveCap=act.cap??(5+story.chapter);
 story.objective=act.point?{x:act.point[0],y:act.point[1],label:act.label}:null;
 story.bossSpawned=false;
 wave=story.chapter*2+index+1;
 if(act.type==='boss') {
  let point=act.point||[player.x,player.y];
  if(Math.hypot(point[0]-player.x,point[1]-player.y)<3.2) {
   const base=Math.atan2(point[1]-player.y,point[0]-player.x);
   for(let attempt=0;attempt<12;attempt++) {
    const angle=base+(attempt?Math.PI*2*attempt/12:0),radius=3.6+Math.random()*1.6;
    const x=point[0]+Math.cos(angle)*radius,y=point[1]+Math.sin(angle)*radius;
    if(fits(x,y,.3)&&Math.abs(floorAt(x,y)-floorAt(player.x,player.y))<.7) {point=[x,y];break;}
   }
  }
  spawnAt('boss',point[0],point[1],false);
  story.bossSpawned=true;story.aliveCap=act.cap??3;story.spawnTimer=2.8;
  alarm=2.2;blast=.35;
 } else if(act.type==='clear') {
  tone(240,.14,'triangle',.06,180);
 }
 if(act.dialogue) for(const [who,line] of act.dialogue) say(who,line,4);
}
function advanceStoryAct() {
 if(!story||story.ended) return;
 const chapter=STORY_CHAPTERS[story.chapter];
 story.act++;
 tone(520,.2,'triangle',.1,780);
 if(story.act>=chapter.acts.length) {chapterComplete();return;}
 setNotice('阶段完成 · '+chapter.acts[story.act].label,2.2);
 setupStoryAct(story.act,false);
}
function chapterComplete() {
 const chapter=STORY_CHAPTERS[story.chapter];
 const finishedChapter=story.chapter,bonus=140+finishedChapter*90;
 story.ended=true;story=null;
 earn(bonus);
 storyProgress=Math.max(storyProgress,finishedChapter+1);
 save('blackout-story-progress',storyProgress);
 save('blackout-story-chapter',Math.min(finishedChapter+1,STORY_CHAPTERS.length-1));
 storyChapter=Math.min(finishedChapter+1,STORY_CHAPTERS.length-1);
 tone(523,.22,'triangle',.1,700);tone(659,.26,'triangle',.08,880);
 if(finishedChapter>=STORY_CHAPTERS.length-1) {
  modal('over','战役完成 / DAWN','破晓 · 05:40',
   chapter.outro+' 感染源已经确认，样本送到车队手里。接下来的事，交给天亮以后。本章军费 +₡'+bonus+'。',
   '返回主菜单',true,()=>{save('blackout-style','survival');playStyle='survival';applyMap(survivalMap,false);setMode('menu');});
 } else {
  modal('over','章节完成 / CHAPTER CLEAR','第'+['一','二','三','四','五'][finishedChapter]+'章完成 · '+chapter.title,
   chapter.outro+' 本章军费 +₡'+bonus+'。','前往下一章',true,()=>startStory(finishedChapter+1));
 }
}
function updateStory(dt) {
 if(!story||story.ended) return;
 const chapter=STORY_CHAPTERS[story.chapter],act=chapter.acts[story.act];
 if(!act) return;
 story.phaseTime+=dt;story.spawnTimer-=dt;
 const alive=enemies.length;
 if(act.type==='reach') {
  if(story.spawnTimer<=0&&alive<story.aliveCap) {spawn(storyEnemyType(story.chapter));story.spawnTimer=2.4+Math.random()*1.8;}
  const objective=story.objective;
  if(objective&&Math.hypot(player.x-objective.x,player.y-objective.y)<1.45) {advanceStoryAct();return;}
 } else if(act.type==='clear') {
  if(story.spawned<(act.count??8)&&story.spawnTimer<=0&&alive<story.aliveCap) {
   spawn(storyEnemyType(story.chapter));story.spawned++;story.spawnTimer=.75+Math.random()*.95;
  }
  if(story.spawned>=(act.count??8)&&enemies.length===0) {advanceStoryAct();return;}
 } else if(act.type==='boss') {
  if(story.spawnTimer<=0&&alive<story.aliveCap) {spawn(storyEnemyType(story.chapter));story.spawnTimer=3+Math.random()*1.7;}
  const boss=enemies.find(z=>z.boss);
  if(boss) story.objective={x:boss.x,y:boss.y,label:act.label};
  if(story.bossSpawned&&!boss&&enemies.length===0) {advanceStoryAct();return;}
 }
 story.barkClock=(story.barkClock??0)+dt;
 if(story.barkClock>32&&!dialogueCurrent&&!dialogueQueue.length) {
  story.barkClock=0;
  const lines={
   qin:['这鬼地方，永远走不完。','别停，停下来就完了。','子弹省着点用。','我闻到海风了，快到了。'],
   lin:['我还剩两卷绷带。','注意脚下，别踩进积水。','样本还在，别担心。','谁受伤了就说一声。'],
   qi:['前面好像有动静。','这条路比送外卖近多了。','我数着呢，还有三个路口。','别回头，跟着我。']
  };
  const who=['qin','lin','qi'][Math.floor(Math.random()*3)],pool=lines[who];
  say(who,pool[Math.floor(Math.random()*pool.length)],3.6);
 }
}
function downNpc(n) {
 n.downed=true;n.downT=0;n.downDir=n.yaw+Math.PI;n.revive=0;n.hp=0;
 say(n.squad.id,'我……撑不住了……',3.6);
 setNotice(n.squad.name+' 倒地 · 靠近即可救援',2.4);
 tone(96,.32,'sawtooth',.1,40);
}
function reviveNpc(n) {
 n.downed=false;n.downT=0;n.hp=Math.round(n.maxHp*.55);n.revive=0;n.fireCd=.9;
 say(n.squad.id,'我没事，继续走。',3.2);
 tone(430,.2,'triangle',.09,650);
}
function nextStepToward(sx,sy,tx,ty) {
 const cols=columns,totalRows=rows;
 let gx=clamp(Math.floor(tx),1,cols-2),gy=clamp(Math.floor(ty),1,totalRows-2);
 if(solid(gx,gy)) {
  let found=false;
  for(const [ox,oy] of [[0,1],[1,0],[0,-1],[-1,0],[1,1],[-1,1],[1,-1],[-1,-1]]) {
   if(!solid(gx+ox,gy+oy)) {gx+=ox;gy+=oy;found=true;break;}
  }
  if(!found) return null;
 }
 const start=Math.floor(sy)*cols+Math.floor(sx),goal=gy*cols+gx;
 if(start===goal||start<0||start>=cols*totalRows) return {x:tx,y:ty};
 const prev=new Int32Array(cols*totalRows).fill(-1);
 const queue=[start];prev[start]=start;
 let found=-1;
 for(let head=0;head<queue.length;head++) {
  const at=queue[head],x=at%cols,y=Math.floor(at/cols),h0=floorAt(x+.5,y+.5);
  for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
   if(nx<1||ny<1||nx>=cols-1||ny>=totalRows-1||solid(nx,ny)) continue;
   const ni=ny*cols+nx;
   if(prev[ni]!==-1||Math.abs(floorAt(nx+.5,ny+.5)-h0)>.62) continue;
   prev[ni]=at;queue.push(ni);
   if(ni===goal) {found=ni;break;}
  }
  if(found>=0) break;
 }
 if(found<0) return null;
 let at=found;
 while(prev[at]!==start&&at!==start) at=prev[at];
 return at===start?{x:tx,y:ty}:{x:(at%cols)+.5,y:Math.floor(at/cols)+.5};
}
function npcStep(n,tx,ty,speed,dt) {
 const dx=tx-n.x,dy=ty-n.y,distance=Math.hypot(dx,dy);
 if(distance<.08) return;
 if(walkableLine(n.x,n.y,tx,ty,.21)&&Math.abs(floorAt(tx,ty)-floorAt(n.x,n.y))<=.62) {
  const step=Math.min(distance,speed*dt);
  move(n,dx/distance*step,dy/distance*step,.21);
  n.anim+=dt*speed*3.2;
  return;
 }
 n.pathTimer=(n.pathTimer??0)-dt;
 if(n.pathTimer<=0||!n.pathPoint||Math.hypot(n.pathPoint.x-tx,n.pathPoint.y-ty)>2.2) {
  n.pathPoint=nextStepToward(n.x,n.y,tx,ty);
  n.pathTimer=.5+Math.random()*.3;
 }
 if(!n.pathPoint) return;
 const px=n.pathPoint.x-n.x,py=n.pathPoint.y-n.y,pd=Math.hypot(px,py)||1;
 const step=Math.min(pd,speed*dt);
 move(n,px/pd*step,py/pd*step,.21);
 n.anim+=dt*speed*3.2;
}
function npcAnchor(n) {
 const role=n.squad.id,p=player,objective=story&&story.objective;
 const base=role==='lin'?p.angle+Math.PI*.85:(objective?Math.atan2(objective.y-p.y,objective.x-p.x):p.angle);
 const cfg=role==='qin'?{dist:5.6,side:0}:role==='lin'?{dist:4.4,side:-1.4}:{dist:9.2,side:1.6};
 for(let attempt=0;attempt<12;attempt++) {
  const angle=base+(Math.random()-.5)*.85;
  const distance=cfg.dist*(.72+Math.random()*.55),side=cfg.side*(.35+Math.random()*.9);
  const x=p.x+Math.cos(angle)*distance+Math.cos(angle+Math.PI/2)*side;
  const y=p.y+Math.sin(angle)*distance+Math.sin(angle+Math.PI/2)*side;
  if(fits(x,y,.24)&&Math.abs(floorAt(x,y)-floorAt(p.x,p.y))<.62) {
   const relX=x-p.x,relY=y-p.y,relD=Math.hypot(relX,relY)||1;
   const dot=(relX*Math.cos(p.angle)+relY*Math.sin(p.angle))/relD;
   if(!(relD<3.3&&dot>.35)) return {x,y};
  }
 }
 return null;
}
function npcTarget(n) {
 let best=null,bestScore=Infinity;
 for(const z of enemies) {
  const distance=Math.hypot(z.x-n.x,z.y-n.y);
  if(distance>20||!visible(n.x,n.y,z.x,z.y)) continue;
  let score=distance;
  if(z.boss) score-=5;
  else if(z.elite) score-=2.5;
  if(z.type==='bomber'&&distance<7) score-=3;
  if(score<bestScore) {best=z;bestScore=score;}
 }
 return best;
}
function npcFire(n,target) {
 n.fireCd=Math.max(.16,n.squad.rate*(.78+Math.random()*.55));
 n.muzzle=.07;
 const muzzleX=n.x+Math.cos(n.yaw)*.30,muzzleY=n.y+Math.sin(n.yaw)*.30;
 const floor=floorAt(target.x,target.y);
 tracers.push({x1:muzzleX,y1:muzzleY,z1:floorAt(n.x,n.y)+1.30,x2:target.x,y2:target.y,z2:floor+types[target.type].height*.62,life:.085,maxLife:.085});
 if(!muted&&audio&&audio.state==='running') tone(620,.035,'square',.014,430);
 const distance=Math.hypot(target.x-n.x,target.y-n.y);
 if(Math.random()<clamp(.90-distance*.030,.42,.86)) {
  target.hp-=n.squad.damage*(.85+Math.random()*.3);target.flash=.10;
  bloodBurst(target.x,target.y,floor+1.05,target.x-n.x,target.y-n.y,5,.9);
  if(target.hp<=0&&enemies.includes(target)) {
   killEnemy(target,Math.atan2(target.y-n.y,target.x-n.x));
   kills++;earn(Math.round(killValue(target.type,false)*.5));
   if(target.type==='bomber') explodeGrenade({x:target.x,y:target.y});
  }
 }
}
function updateNpcs(dt) {
 if(!story) return;
 if(!route.length) updateRoute();
 for(const n of npcs) {
  n.flash=Math.max(0,n.flash-dt);n.muzzle=Math.max(0,n.muzzle-dt);n.barkCd=Math.max(0,(n.barkCd??0)-dt);
  n.hurtCd=Math.max(0,(n.hurtCd??0)-dt);n.healCd=Math.max(0,(n.healCd??0)-dt);
  if(n.downed) {
   n.downT=(n.downT??0)+dt;
   let helpers=0;
   for(const other of npcs) if(other!==n&&!other.downed&&Math.hypot(other.x-n.x,other.y-n.y)<1.75) helpers++;
   if(Math.hypot(player.x-n.x,player.y-n.y)<2.2) helpers++;
   if(helpers) n.revive=(n.revive??0)+dt*(.7+helpers*.45);
   else n.revive=Math.max(0,(n.revive??0)-dt*.35);
   if(n.revive>2.0||n.downT>18) reviveNpc(n);
  } else n.revive=0;
 }
 for(const n of npcs) {
  if(n.downed) continue;
  const role=n.squad.id,target=npcTarget(n);
  const distToPlayer=Math.hypot(player.x-n.x,player.y-n.y);
  let rescue=null,rescueDist=Infinity;
  for(const other of npcs) {
   if(other===n||!other.downed) continue;
   const distance=Math.hypot(other.x-n.x,other.y-n.y);
   if(distance<rescueDist) {rescueDist=distance;rescue=other;}
  }
  let desired=null,speed=3.3;
  if(rescue&&rescueDist<13&&(!target||role==='lin'||rescueDist<7)) {
   desired={x:rescue.x,y:rescue.y};speed=rescueDist>7?4.7:3.6;n.state='rescue';
  } else if(distToPlayer>19) {
   desired={x:player.x,y:player.y};speed=4.8;n.state='regroup';
  } else if(role==='lin'&&player.hp<34&&distToPlayer>4.2) {
   desired={x:player.x,y:player.y};speed=4.6;n.state='regroup';
  } else if(target) {
   const distance=Math.hypot(target.x-n.x,target.y-n.y),range=n.squad.range||10;
   if(distance>range+1.5) {desired={x:target.x,y:target.y};speed=role==='qi'?4.2:3.6;n.state='advance';}
   else if(distance<range-4) {
    const angle=Math.atan2(n.y-target.y,n.x-target.x);
    desired={x:target.x+Math.cos(angle)*range,y:target.y+Math.sin(angle)*range};
    speed=3.3;n.state='hold';
   } else {
    const angle=Math.atan2(n.y-target.y,n.x-target.x);
    const side=role==='qi'?(n.flank||(n.flank=Math.random()<.5?-1:1)):role==='lin'?.35:0;
    const offset=side*(Math.PI/2.6);
    desired={x:target.x+Math.cos(angle+offset)*range,y:target.y+Math.sin(angle+offset)*range};
    speed=role==='qi'?3.9:2.8;n.state='fight';
   }
   n.fireCd=Math.max(0,(n.fireCd??0)-dt);
   if(n.fireCd<=0&&distance<=(n.squad.range||10)+4&&visible(n.x,n.y,target.x,target.y)) npcFire(n,target);
   n.yaw=Math.atan2(target.y-n.y,target.x-n.x);
  } else {
   if(!n.anchor||Math.hypot(n.anchor.x-n.x,n.anchor.y-n.y)<1.15||(n.anchorTimer??0)<=0) {
    n.anchor=npcAnchor(n);n.anchorTimer=4+Math.random()*4;
   }
   n.anchorTimer-=dt;
   if(n.anchor) {desired=n.anchor;speed=role==='qi'?3.8:2.9;n.state='patrol';}
  }
  const relX=n.x-player.x,relY=n.y-player.y,relD=Math.hypot(relX,relY);
  if(relD>0.01&&relD<3.3&&n.state!=='rescue') {
   const dot=(relX*Math.cos(player.angle)+relY*Math.sin(player.angle))/relD;
   if(dot>.32) {
    const lateral=relX*Math.sin(player.angle)-relY*Math.cos(player.angle);
    const side=Math.abs(lateral)>.12?(lateral>=0?1:-1):(n.sideBias||1);
    desired={x:player.x+Math.cos(player.angle)*.6-Math.sin(player.angle)*side*2.8, y:player.y+Math.sin(player.angle)*.6+Math.cos(player.angle)*side*2.8};
    speed=3.8;n.state='clear';
   }
  }
  if(desired) {
   const distance=Math.hypot(desired.x-n.x,desired.y-n.y);
   if(distance>.65&&(n.state!=='fight'||distance>1.2)) npcStep(n,desired.x,desired.y,speed,dt);
   if(n.state!=='fight'&&distance>.5) n.yaw=Math.atan2(desired.y-n.y,desired.x-n.x);
  }
  for(const other of npcs) {
   if(other===n||other.downed) continue;
   const dx=n.x-other.x,dy=n.y-other.y,between=Math.hypot(dx,dy);
   if(between>.01&&between<1.1) move(n,dx/between*.022,dy/between*.022,.21);
  }
  const dx=n.x-player.x,dy=n.y-player.y,between=Math.hypot(dx,dy);
  if(between>.01&&between<1.35&&n.state!=='regroup'&&n.state!=='rescue') {
   const aimX2=Math.cos(player.angle),aimY2=Math.sin(player.angle);
   const lateral=dx*aimY2-dy*aimX2;
   const side=lateral>=0?1:-1,push=(1.35-between)/between;
   move(n,dx/between*push*.7-aimY2*side*.025,dy/between*push*.7+aimX2*side*.025,.21);
  }
  const aimX=Math.cos(player.angle),aimY=Math.sin(player.angle);
  if(between>.01&&between<3.6) {
   const dot=(dx*aimX+dy*aimY)/between;
   if(dot>.34) {
    const side=(dx*aimY-dy*aimX)>=0?1:-1;
    move(n,-aimY*side*.055,aimX*side*.055,.21);
   }
  }
  for(const z of enemies) {
   if(Math.hypot(z.x-n.x,z.y-n.y)>.95||!visible(z.x,z.y,n.x,n.y)) continue;
   if((n.hurtCd??0)<=0) {
    n.hurtCd=.9+Math.random()*.4;n.hp-=6+storyChapter*2;n.flash=.15;
    if(n.hp<=0) {downNpc(n);break;}
   }
  }
  if(role==='lin'&&n.healCd<=0&&player.hp<78&&distToPlayer<7.5&&!enemies.some(z=>Math.hypot(z.x-n.x,z.y-n.y)<4.5)) {
   player.hp=Math.min(100,player.hp+12);n.healCd=12;
   setNotice('林夏为你处理了伤口',1.6);tone(520,.16,'triangle',.08,760);
  }
  if(n.barkCd<=0&&!dialogueCurrent&&!dialogueQueue.length&&Math.random()<dt*1.2) {
   say(n.squad.id,n.squad.line,3.4);n.barkCd=22+Math.random()*16;
  }
 }
}
function updateStoryHud() {
 const box=$('storyHud');
 if(!story) {box.hidden=true;return;}
 box.hidden=false;
 const chapter=STORY_CHAPTERS[story.chapter],act=chapter.acts[story.act]||{label:'',type:'reach'};
 $('storyChapter').textContent=chapter.code+' · '+chapter.title+' · '+chapter.place;
 let extra='';
 if(act.type==='clear') extra='剩余 '+Math.max(0,(act.count??0)-story.spawned+enemies.length)+' 名';
 else if(act.type==='boss') extra=enemies.some(z=>z.boss)?'首领尚在':'残余 '+enemies.length;
 else if(story.objective) extra='距离 '+Math.round(Math.hypot(player.x-story.objective.x,player.y-story.objective.y))+'m';
 $('storyObjective').innerHTML=act.label+(extra?'<small>'+extra+'</small>':'');
 $('storySquad').innerHTML=npcs.map(n=>{
  const percent=Math.max(0,Math.round(n.hp/n.maxHp*100));
  const state=n.downed?('救援 '+Math.min(100,Math.round((n.revive||0)/2.2*100))+'%'):'在队';
  return '<span class="squadChip'+(n.downed?' down':'')+'"><b>'+n.squad.name+'</b><i><u style="width:'+percent+'%"></u></i>'+state+'</span>';
 }).join('');
}

function showRunSummary() {
 const el=$('runStats'),acc=runShots?Math.round(runHits/runShots*100):0;
 el.hidden=false;
 el.innerHTML=`<div>击杀<b>${kills}</b></div><div>爆头<b>${runHeadshots}</b></div><div>命中率<b>${acc}%</b></div>`
  +`<div>精英击倒<b>${runEliteKills}</b></div><div>暴君击倒<b>${runBossKills}</b></div><div>近战 / 手雷<b>${runMeleeKills} / ${runGrenadeKills}</b></div>`
  +`<div>承受伤害<b>${Math.round(runDamage)}</b></div><div>本次军费<b>₡${runCredits}</b></div><div>总计军费<b>₡${credits}</b></div>`;
}
function modal(next,label,title,body,action,summary=false,onAction=null) {
 $('modalLabel').textContent=label;$('modalTitle').textContent=title;
 $('modalText').textContent=body;$('modalAction').textContent=action;
 modalActionFn=onAction;
 if(summary) showRunSummary(); else $('runStats').hidden=true;
 setMode(next);$('modalAction').focus();
}
function pause() {
 if(mode==='play') modal('pause','行动暂停 / PAUSED','暂停','按 Esc 或点击继续，返回当前波次。','继续战斗');
}
function toggleTactical() {
 if(mode==='map') {setMode('play');lockAim();return;}
 if(mode!=='play') return;
 setMode('map');
 $('tacticalTitle').textContent=MAP.name;
 $('tacticalZone').textContent=zone(player.x,player.y);
 drawMapTerrain(overview,true);
 drawMapMarkers(overview,true);
 $('tacticalClose').focus();
}
function nextWave() {
 wave++;
 const endless=gameMode==='endless';
 const count=endless?Math.min(30,4+wave*2):4+wave*2;
 const specialists=waveSpecials[wave-1]??(endless?['runner','shield','brute','spitter','screamer','shield','runner','brute']:[]);
 spawnQueue=Array(count).fill('walker');
 specialists.forEach((type,index)=>{spawnQueue[Math.floor((index+1)*count/(specialists.length+1))]=type;});
 spawnClock=.8;waveTime=0;
 const bossWave=endless?(wave>=8&&wave%4===0):wave===MAX_WAVE;
 if(bossWave) {spawnQueue.push('boss');setNotice('第 '+wave+' 波 · '+((BOSS_PROFILES[selectedMap]||BOSS_PROFILES.yard).name)+'出现'+(endless?' · 无尽生存':''),3.2);tone(62,.9,'sawtooth',.15,28);}
 else setNotice('第 '+wave+' 波 · '+(firstContact[wave]??'感染者接近')+(wave>=4?' · 精英混入':''),2.4);
 alarm=MAP.theme.alarmWaves?2.4:0;
 tone(190,.22,'triangle',.13,76);
}
function routeLength(x,y) {
 const root=Math.floor(player.y)*columns+Math.floor(player.x);
 if(walkableLine(x,y,player.x,player.y,.2,.65)) return Math.hypot(x-player.x,y-player.y);
 let at=Math.floor(y)*columns+Math.floor(x), steps=0;
 if(!route.length||route[at]===undefined||route[at]<0) return Infinity;
 while(at!==root && steps<columns*rows) {at=route[at];steps++;}
 return at===root?steps+.5:Infinity;
}
function spawn(type) {
 updateRoute();
 const candidates=spawnPoints.map(([x,y],index)=>({
  index,x,y,
  distance:Math.hypot(x-player.x,y-player.y),
  path:routeLength(x,y),
  seen:visible(player.x,player.y,x,y)
 })).filter(p=>Number.isFinite(p.path));
 const safe=candidates.filter(p=>p.distance>=(p.seen?6.5:4.8)&&p.path>=5.2);
 const local=safe.filter(p=>p.path<=18);
 const nearby=local.length?local:safe;
 let pool=nearby.filter(p=>!p.seen&&p.index!==lastSpawn);
 if(!pool.length) pool=nearby.filter(p=>p.index!==lastSpawn);
 if(!pool.length) pool=nearby;
 if(!pool.length) pool=candidates.slice().sort((a,b)=>b.path-a.path).slice(0,4);
 for(const p of pool) {
  p.score=p.path+(p.seen?3.2:0)+(p.index===lastSpawn?4:spawnHistory.includes(p.index)?1.3:0)+Math.random()*.5;
 }
 pool.sort((a,b)=>a.score-b.score);
 let options=pool.slice(0,5);
 if(options.length>1) options=options.filter(p=>p.index!==lastSpawn);
 const weights=options.map((_,i)=>Math.pow(.72,i)), total=weights.reduce((sum,weight)=>sum+weight,0);
 let roll=Math.random()*total, chosen=options[0];
 for(let i=0;i<options.length;i++) {
  roll-=weights[i];
  if(roll<=0) {chosen=options[i];break;}
 }
 if(!chosen) chosen=candidates.sort((a,b)=>b.distance-a.distance)[0] || {index:0,x:spawnPoints[0][0],y:spawnPoints[0][1]};
 lastSpawn=chosen.index;spawnHistory.unshift(chosen.index);spawnHistory.length=Math.min(4,spawnHistory.length);
 const boss=type==='boss',profile=boss?(BOSS_PROFILES[selectedMap]||BOSS_PROFILES.yard):null;
 const elite=boss||(wave>=4&&Math.random()<Math.min(.34,.05+wave*.028));
 const hp=boss?profile.hp:(types[type].hp+Math.max(wave-3,0)*5)*(elite?1.8:1);
 enemies.push({type,x:chosen.x,y:chosen.y,hp,maxHp:hp,attack:.55,anim:Math.random()*6,flash:0,tint:(Math.random()*2-1)*.07,specialCooldown:1.2+Math.random()*.8,specialWindup:0,specialAim:null,rage:0,elite,boss,bossName:boss?profile.name:null,damageScale:boss?profile.damage/34:elite?1.3:1,speedScale:boss?profile.speed/.72:elite?1.1:1});
}
function updateRoute() {
 const root=Math.floor(player.y)*columns+Math.floor(player.x);
 route=Array(columns*rows).fill(-1);
 route[root]=root;
 const queue=[root];
 for(let i=0;i<queue.length;i++) {
  const at=queue[i], x=at%columns,y=Math.floor(at/columns);
  for(const [nx,ny] of [[x+1,y],[x-1,y],[x,y+1],[x,y-1]]) {
   const next=ny*columns+nx;
   if(solid(nx,ny)||route[next]!==-1) continue;
   if(Math.abs(floorAt(nx+.5,ny+.5)-floorAt(x+.5,y+.5))>.62) continue;
   route[next]=at;queue.push(next);
  }
 }
}
function waveCleared() {
 acidShots.length=0;
 if (best<wave) {best=wave;save(bestKey(selectedMap),best);}
 const bonus=80+wave*45;earn(bonus);
 tone(392,.16,'triangle',.07,520);tone(523,.2,'triangle',.06,680);
 if (gameMode!=='endless' && wave===MAX_WAVE) {
  modal('over','行动完成 / SURVIVED','你守住了'+MAP.name,'通过全部 '+MAX_WAVE+' 波 · 击倒 '+kills+' 名感染者。本次军费 ₡'+runCredits+' · 总计 ₡'+credits,'再打一局',true);
  return;
 }
 waveTime=10;used.fill(0);setNotice('波次肃清 · 军费 +₡'+bonus+' · 趁现在补给',2.6);
}
function supplyWave() {return wave+(waveTime>0?1:0);}
function closestSupply() {
 return supplies.findIndex(([x,y])=>Math.hypot(x-player.x,y-player.y)<1.48 && visible(player.x,player.y,x,y));
}
function resupply() {
 if(mode!=='play') return;
 const index=closestSupply();
 if(index<0 || used[index]===supplyWave()) return;
 used[index]=supplyWave();
 for(const def of ownedWeapons()) {
  const stats=gunStats(def),rounds=ammo[def.id];
  if(!rounds) continue;
  rounds.reserve=Math.min(stats.maxReserve,rounds.reserve+Math.max(24,Math.round(stats.startReserve*.4)));
 }
 player.hp=Math.min(100,player.hp+24);
 grenadeCount=Math.min(grenadeCapacity(),grenadeCount+1);
 setNotice('补给已领取 · 弹药、生命与手雷',1.5);tone(480,.18,'triangle',.09,730);
}
function reload() {
 const item=currentGun(), rounds=currentRounds();
 if(mode!=='play'||reloadTime>0||rounds.mag>=item.capacity||rounds.reserve===0) return;
 reloadTime=item.reload;tone(135,.12,'triangle',.08,47);
}
function switchGun(index) {
 const list=ownedWeapons();
 if(mode!=='play'||index<0||index>=list.length||gun===index) return;
 gun=index;reloadTime=0;cooldown=Math.max(cooldown,.16);recoil=0;muzzle=0;
 tone(150,.09,'triangle',.06,65);
}
function traceShot(dx,dy,slope) {
 const wall=ray(player.x,player.y,dx,dy,yard3D?slope:null).dist;
 let target=null,targetDepth=wall,critical=false,armored=false;
 for(const z of enemies) {
  if(yard3D?.hasModels()) {
   const hit=hitModel(z,targetDepth,dx,dy,slope);
   if(hit) {target=z;targetDepth=hit.depth;critical=hit.critical;armored=hit.armored;}
   continue;
  }
  const x=z.x-player.x,y=z.y-player.y,distance=x*dx+y*dy;
  if(distance<.19||distance>=targetDepth) continue;
  const side=y*dx-x*dy,gunHeight=eye+pitch*W.height*distance/focal;
  const height=types[z.type].height,{canvas,pixels}=zombieFrame(z);
  const sx=Math.floor(canvas.width/2-side*canvas.height/height);
  const sy=Math.floor((1-gunHeight/height)*canvas.height);
  if(sx<0||sx>=canvas.width||sy<0||sy>=119||pixels[(sy*canvas.width+sx)*4+3]<160) continue;
  const headMargin=z.type==='boss'?7:z.type==='brute'?4:0;
  target=z;targetDepth=distance;critical=sy<=40&&sx>=25-headMargin&&sx<=54+headMargin;
  const facing=z.yaw??Math.atan2(-y,-x);
  armored=z.type==='shield'&&sy>=43&&sy<=93&&Math.abs(sx-40)<22&&(-x*Math.cos(facing)-y*Math.sin(facing))>Math.hypot(x,y)*.52;
 }
 return {target,depth:targetDepth,critical,armored};
}
function fire() {
 if(mode!=='play'||cooldown>0||reloadTime>0) return;
 const item=currentGun(), rounds=currentRounds();
 if(!rounds) return;
 if(rounds.mag===0) {reload();if(!reloadTime) {tone(80,.055,'square',.035,50);cooldown=.23;}return;}
 rounds.mag--;cooldown=item.delay;recoil=Math.min(.18,recoil+item.kick*(aiming?.64:1));muzzle=.057;
 const hits=new Map(),pellets=item.pellets||1;
 for(let pellet=0;pellet<pellets;pellet++) {
  const spreadX=(Math.random()*2-1)*(item.spread||0)*(aiming?.32:1);
  const spreadY=(Math.random()*2-1)*(item.spread||0)*(aiming?.32:1)*.55;
  const angle=player.angle+spreadX;
  const dx=Math.cos(angle),dy=Math.sin(angle);
  const slope=pitch*W.height/focal+spreadY;
  const hit=traceShot(dx,dy,slope);
  if(!hit.target) continue;
  const acc=hits.get(hit.target)||{damage:0,critical:false,armored:false};
  acc.damage+=item.damage*(hit.armored?.29:hit.critical?item.headMultiplier:1);
  acc.critical=acc.critical||hit.critical;
  acc.armored=acc.armored||hit.armored;
  hits.set(hit.target,acc);
 }
 shotSound(item.kind);
 runShots++;
 if(!hits.size) return;
 runHits++;
 tone(760,.035,'square',.011,680);
 let anyCritical=false,anyArmored=false,killed=0,killedElite=false,killedBoss=false;
 const bomberBursts=[];
 for(const [target,hit] of hits) {
  target.hp-=hit.damage;target.flash=hit.armored?.045:.12;
  bloodBurst(target.x,target.y,1.12,target.x-player.x,target.y-player.y,hit.critical?14:8,1.25);
  anyCritical=anyCritical||hit.critical;anyArmored=anyArmored||hit.armored;
  if(target.hp<=0) {
   killEnemy(target,Math.atan2(target.y-player.y,target.x-player.x));kills++;killed++;
   const gain=killValue(target.type,hit.critical)*(target.elite?3:1);
   earn(gain);killedElite=killedElite||target.elite;killedBoss=killedBoss||target.boss;
   if(target.boss) runBossKills++;
   else if(target.elite) runEliteKills++;
   if(target.boss) setNotice((target.bossName||'暴君')+'击倒 · 军费 +₡'+gain,2.2);
   else if(target.elite) setNotice('精英感染者击倒 · 军费 +₡'+gain,1.6);
   if(target.type==='bomber') bomberBursts.push({x:target.x,y:target.y});
   tone(hit.critical?530:270,.11,'triangle',.08,110);
  }
 }
 hitTime=.17;headshot=anyCritical;
 if(anyCritical) runHeadshots++;
 if(anyArmored) tone(368,.11,'triangle',.15,106);
 for(const burst of bomberBursts) explodeGrenade(burst);
 hitFeedback(anyCritical,killed>0,anyArmored,killedElite,killedBoss);
}
function melee() {
 if(mode!=='play'||meleeCooldown>0) return;
 meleeCooldown=.72;meleeFlash=.2;recoil=Math.min(.18,recoil+.04);
 const dx=Math.cos(player.angle),dy=Math.sin(player.angle);
 let hit=0,killed=0,killedElite=false,killedBoss=false;
 const bomberBursts=[];
 for(const z of [...enemies]) {
  const vx=z.x-player.x,vy=z.y-player.y,dist=Math.hypot(vx,vy);
  if(dist>1.75||!visible(player.x,player.y,z.x,z.y)) continue;
  if((vx*dx+vy*dy)/Math.max(.01,dist)<.3) continue;
  z.hp-=78;z.flash=.2;hit++;
  bloodBurst(z.x,z.y,1.05,z.x-player.x,z.y-player.y,7,.9);
  const push=.4*Math.max(0,1-dist/2);
  const nx=z.x+vx/Math.max(.01,dist)*push,ny=z.y+vy/Math.max(.01,dist)*push;
  if(fits(nx,z.y,.2)) z.x=nx;
  if(fits(z.x,ny,.2)) z.y=ny;
  if(z.hp<=0) {
   killEnemy(z,Math.atan2(z.y-player.y,z.x-player.x));kills++;killed++;runMeleeKills++;
   const gain=killValue(z.type,false)*(z.elite?3:1);
   earn(gain);killedElite=killedElite||z.elite;killedBoss=killedBoss||z.boss;
   if(z.boss) runBossKills++;else if(z.elite) runEliteKills++;
   if(z.type==='bomber') bomberBursts.push({x:z.x,y:z.y});
  }
 }
 for(const burst of bomberBursts) explodeGrenade(burst);
 tone(135,.13,'square',.075,62);
 if(hit) {
  hitTime=.17;headshot=false;
  hitFeedback(false,killed>0,false,killedElite,killedBoss);
 } else setNotice('近战落空',.5);
}
function throwGrenade() {
 if(mode!=='play'||grenadeCooldown>0||grenadeCount<=0) return;
 grenadeCount--;grenadeCooldown=.65;
 const dx=Math.cos(player.angle),dy=Math.sin(player.angle);
 const sx=player.x+dx*.38,sy=player.y+dy*.38;
 grenadeLive.push({
  x:fits(sx,sy,.12)?sx:player.x,y:fits(sx,sy,.12)?sy:player.y,z:floorAt(sx,sy)+1.25,
  vx:dx*6.6,vy:dy*6.6,vz:3.1+pitch*4.2,fuse:1.25
 });
 tone(380,.12,'triangle',.055,170);
 setNotice('手雷已投出 · G / 投雷键',.8);
}
function explosionSound() {
 if(!audio||muted||!noise) return;
 const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain(),now=audio.currentTime;
 source.buffer=noise;filter.type='lowpass';filter.frequency.setValueAtTime(1500,now);
 filter.frequency.exponentialRampToValueAtTime(180,now+.55);
 gain.gain.setValueAtTime(.55,now);gain.gain.exponentialRampToValueAtTime(.006,now+.6);
 source.connect(filter).connect(gain).connect(audioMaster);source.start();
 tone(62,.7,'sawtooth',.28,22);
}
function detonateBomber(z) {
 const index=enemies.indexOf(z);if(index<0) return;
 killEnemy(z,Math.atan2(z.y-player.y,z.x-player.x));kills++;
 earn(killValue('bomber',false)*(z.elite?3:1));
 if(z.elite) runEliteKills++;
 explodeGrenade({x:z.x,y:z.y});
}
function explodeGrenade(g) {
 explosions.push({x:g.x,y:g.y,t:.55,max:.55});
 blast=.95;explosionSound();
 const radius=4.3,killed=[];
 for(const z of [...enemies]) {
  const d=Math.hypot(z.x-g.x,z.y-g.y);
  if(d>radius||!visible(g.x,g.y,z.x,z.y)) continue;
  z.hp-=230*(1+.15*equipmentLevel('grenadeDamage'))*(1-d/(radius+.9));z.flash=.2;
  bloodBurst(z.x,z.y,1.02,z.x-g.x,z.y-g.y,9,1.3);
  if(z.hp<=0) {
   killEnemy(z,Math.atan2(z.y-g.y,z.x-g.x));kills++;killed.push(z);runGrenadeKills++;
   if(z.boss) runBossKills++;else if(z.elite) runEliteKills++;
   earn(killValue(z.type,false)*(z.elite?3:1));
  }
 }
 const pd=Math.hypot(player.x-g.x,player.y-g.y);
 if(pd<3.4) damagePlayer(Math.round(30*(1-pd/4)),'爆炸冲击',{x:g.x,y:g.y});
 if(killed.length) {
  hitTime=.17;headshot=false;
  hitFeedback(false,true,false,killed.some(z=>z.elite),killed.some(z=>z.boss));
 }
}
function updateGrenades(dt) {
 grenadeCooldown=Math.max(0,grenadeCooldown-dt);blast=Math.max(0,blast-dt*2.4);
 for(let i=grenadeLive.length-1;i>=0;i--) {
  const g=grenadeLive[i];g.fuse-=dt;g.vz-=9.8*dt;
  const nx=g.x+g.vx*dt,ny=g.y+g.vy*dt;
  if(fits(nx,g.y,.1)) g.x=nx; else {g.vx*=-.35;g.vy*=.8;}
  if(fits(g.x,ny,.1)) g.y=ny; else {g.vy*=-.35;g.vx*=.8;}
  g.z+=g.vz*dt;
  const ground=floorAt(g.x,g.y);
  if(g.z<ground+.12) {g.z=ground+.12;g.vz*=-.42;g.vx*=.84;g.vy*=.84;if(Math.abs(g.vz)<.7)g.vz=0;}
  if(g.fuse<=0) {grenadeLive.splice(i,1);explodeGrenade(g);}
 }
 for(let i=explosions.length-1;i>=0;i--) {
  explosions[i].t-=dt;
  if(explosions[i].t<=0) explosions.splice(i,1);
 }
}
function activateAudio() {
 if(muted) return;
 try {
  if(!audio) {
   audio=new (window.AudioContext||window.webkitAudioContext)();
   noise=audio.createBuffer(1,Math.ceil(audio.sampleRate*.22),audio.sampleRate);
   const data=noise.getChannelData(0);
   for(let i=0;i<data.length;i++) data[i]=(Math.random()*2-1)*(1-i/data.length);
  }
  if(!audioMaster) {audioMaster=audio.createGain();audioMaster.gain.value=masterVolume;audioMaster.connect(audio.destination);}
  audioMaster.gain.value=masterVolume;
  audio.resume().catch(()=>{});
 } catch {}
}
function ambientNoise() {
 if(ambientBuffer) return ambientBuffer;
 ambientBuffer=audio.createBuffer(1,Math.ceil(audio.sampleRate*2),audio.sampleRate);
 const data=ambientBuffer.getChannelData(0);
 let last=0;
 for(let i=0;i<data.length;i++) {
  const white=Math.random()*2-1;
  last=last*.94+white*.06;
  data[i]=last*.8+white*.2;
 }
 return ambientBuffer;
}
function stopAmbience() {
 if(!ambience) return;
 try {
  if(ambience.timer) clearTimeout(ambience.timer);
  for(const node of ambience.sources) {try {node.stop();} catch {}}
  const now=audio.currentTime;
  ambience.gain.gain.cancelScheduledValues(now);
  ambience.gain.gain.setValueAtTime(ambience.gain.gain.value,now);
  ambience.gain.gain.linearRampToValueAtTime(0,now+.35);
  const gain=ambience.gain;
  setTimeout(()=>{try {gain.disconnect();} catch {}},500);
 } catch {}
 ambience=null;
}
function ambientLoop(kind,filterType,freq,level,destination) {
 const source=audio.createBufferSource();source.buffer=ambientNoise();source.loop=true;
 const filter=audio.createBiquadFilter();filter.type=filterType;filter.frequency.value=freq;
 const gain=audio.createGain();gain.gain.value=level;
 source.connect(filter).connect(gain).connect(destination);source.start();
 return [source,filter,gain];
}
function startAmbience() {
 stopAmbience();
 if(!audio||muted) return;
 const kind=MAP.theme.ambientSound||'yard';
 const master=audio.createGain();master.gain.value=0;master.connect(audioMaster);
 const sources=[];let timer=null;
 if(kind==='rain') {
  sources.push(...ambientLoop('rain','lowpass',1450,.040,master));
  sources.push(...ambientLoop('rain','lowpass',260,.024,master));
 } else if(kind==='subway') {
  sources.push(...ambientLoop('subway','bandpass',420,.012,master));
  const osc=audio.createOscillator(),g=audio.createGain();
  osc.type='sine';osc.frequency.value=118;g.gain.value=.010;
  osc.connect(g).connect(master);osc.start();sources.push(osc,g);
  const osc2=audio.createOscillator(),g2=audio.createGain();
  osc2.type='sine';osc2.frequency.value=236;g2.gain.value=.004;
  osc2.connect(g2).connect(master);osc2.start();sources.push(osc2,g2);
 } else if(kind==='tunnel') {
  sources.push(...ambientLoop('tunnel','lowpass',240,.035,master));
  const drip=()=>{
   if(!ambience) return;
   const now=audio.currentTime,osc=audio.createOscillator(),g=audio.createGain();
   osc.type='sine';osc.frequency.setValueAtTime(760+Math.random()*360,now);
   osc.frequency.exponentialRampToValueAtTime(220,now+.18);
   g.gain.setValueAtTime(.035,now);g.gain.exponentialRampToValueAtTime(.001,now+.22);
   osc.connect(g).connect(master);osc.start();osc.stop(now+.24);
   ambience.timer=setTimeout(drip,1200+Math.random()*3200);
  };
  timer=setTimeout(drip,900+Math.random()*1500);
 } else if(kind==='hospital') {
  sources.push(...ambientLoop('hospital','bandpass',520,.008,master));
  const osc=audio.createOscillator(),g=audio.createGain();
  osc.type='sine';osc.frequency.value=122;g.gain.value=.007;
  osc.connect(g).connect(master);osc.start();sources.push(osc,g);
  const beep=()=>{
   if(!ambience) return;
   const now=audio.currentTime,o=audio.createOscillator(),gg=audio.createGain();
   o.type='sine';o.frequency.value=880;gg.gain.setValueAtTime(.012,now);
   gg.gain.exponentialRampToValueAtTime(.001,now+.16);
   o.connect(gg).connect(master);o.start();o.stop(now+.18);
   ambience.timer=setTimeout(beep,5200+Math.random()*7800);
  };
  timer=setTimeout(beep,3200+Math.random()*4000);
 } else if(kind==='prison') {
  sources.push(...ambientLoop('prison','bandpass',610,.026,master));
  sources.push(...ambientLoop('prison','lowpass',180,.018,master));
  const clang=()=>{
   if(!ambience) return;
   const now=audio.currentTime,o=audio.createOscillator(),g=audio.createGain();
   o.type='triangle';o.frequency.setValueAtTime(180,now);
   o.frequency.exponentialRampToValueAtTime(72,now+.5);
   g.gain.setValueAtTime(.020,now);g.gain.exponentialRampToValueAtTime(.001,now+.55);
   o.connect(g).connect(master);o.start();o.stop(now+.6);
   ambience.timer=setTimeout(clang,6000+Math.random()*9000);
  };
  timer=setTimeout(clang,3800+Math.random()*5000);
 } else {
  sources.push(...ambientLoop('yard','lowpass',1300,.030,master));
 }
 ambience={gain:master,sources,timer};
 const now=audio.currentTime;
 master.gain.linearRampToValueAtTime(1,now+1.1);
}
function tone(freq,length,type,volume,end) {
 if(!audio||muted) return;
 const oscillator=audio.createOscillator(),gain=audio.createGain(),now=audio.currentTime;
 oscillator.type=type;oscillator.frequency.setValueAtTime(freq,now);
 oscillator.frequency.exponentialRampToValueAtTime(end,now+length);
 gain.gain.setValueAtTime(volume,now);gain.gain.exponentialRampToValueAtTime(.001,now+length);
 oscillator.connect(gain).connect(audioMaster);oscillator.start();oscillator.stop(now+length);
}
const footstepSurfaces={
 yard:[910,.123],subway:[730,.105],tunnel:[540,.143],hospital:[1170,.093],prison:[660,.134]
};
function footstep(volume,pan,muffled,rate,beat) {
 const [cutoff,length]=footstepSurfaces[selectedMap],now=audio.currentTime;
 const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain();
 source.buffer=noise;source.playbackRate.value=rate;
 filter.type='lowpass';filter.frequency.value=muffled?cutoff*.43:cutoff;filter.Q.value=.75;
 gain.gain.setValueAtTime(.001,now);
 gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume),now+.014);
 gain.gain.exponentialRampToValueAtTime(.001,now+length);
 const panNode=typeof audio.createStereoPanner==='function'?audio.createStereoPanner():null;
 source.connect(filter).connect(gain);
 if(panNode) {panNode.pan.value=pan;gain.connect(panNode).connect(audioMaster);}
 else gain.connect(audioMaster);
 source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();panNode?.disconnect();};
 source.start(now,beat%3*.019);
 source.stop(now+length);
}
function enemyFootstep(z,distance,beat) {
 const dx=(z.x-player.x)/distance,dy=(z.y-player.y)/distance;
 const pan=clamp((dy*Math.cos(player.angle)-dx*Math.sin(player.angle))*.92,-.92,.92);
 const clear=ray(player.x,player.y,dx,dy,0).dist>distance-.05;
 const heavy=z.type==='brute'||z.type==='boss'||z.type==='shield';
 const rate=z.type==='runner'?1.20:heavy?.72:1;
 const volume=(heavy?.17:.13)*(clear?1:.34)/(1+distance*distance*.12);
 footstep(volume,pan,!clear,rate,beat);
}
function shotSound(kind) {
 if(!audio||muted||!noise) return;
 const source=audio.createBufferSource(),filter=audio.createBiquadFilter(),gain=audio.createGain(),now=audio.currentTime;
 const shotgun=kind==='shotgun',smg=kind==='smg',dmr=kind==='dmr';
 source.buffer=noise;filter.type='lowpass';filter.frequency.value=shotgun?1700:smg?3400:dmr?2200:kind==='rifle'?2600:3900;
 gain.gain.setValueAtTime(shotgun?.44:smg?.24:dmr?.38:.32,now);
 gain.gain.exponentialRampToValueAtTime(.006,now+(shotgun?.22:.16));
 source.connect(filter).connect(gain).connect(audioMaster);source.start();
 tone(shotgun?68:dmr?92:smg?165:kind==='rifle'?115:170,shotgun?.2:smg?.09:.13,'triangle',shotgun?.32:.24,36);
}
function turnZombie(z,x,y,dt) {
 const target=Math.atan2(y-z.y,x-z.x);
 const angle=z.yaw??target;
 const delta=Math.atan2(Math.sin(target-angle),Math.cos(target-angle));
 z.yaw=angle+delta*Math.min(1,dt*12);
}
function damagePlayer(amount,message='',source=null) {
 wounded=.85;damageTime=.95;
 amount=Math.max(1,Math.round(amount*(1-.08*equipmentLevel('armor'))));
 if(source) damageDir=Math.atan2(source.y-player.y,source.x-player.x);
 runDamage+=Math.min(player.hp,amount);
 player.hp=Math.max(0,player.hp-amount);
 tone(100,.21,'sawtooth',.105,29);
 if(player.hp===0) {
  if(story) {
   const chapter=STORY_CHAPTERS[story.chapter];
   modal('over','信号中断 / KIA','小队失去意识','在「'+chapter.title+'」中倒下。感染者围了上来，但破晓还没有到。','重新部署',true,()=>startStory(storyChapter));
  } else {
   modal('over','信号中断 / KIA','防线失守','抵达第 '+wave+' 波 · 击倒 '+kills+' 名感染者。本次军费 ₡'+runCredits+' · 总计 ₡'+credits,'重新部署',true);
  }
  return;
 }
 if(message) setNotice(message,1.05);
}
function updateAcid(dt) {
 for(let i=acidShots.length-1;i>=0;i--) {
  const a=acidShots[i],travel=6.4*dt;
  const wall=ray(a.x,a.y,a.dx,a.dy).dist;
  const nearest=clamp((player.x-a.x)*a.dx+(player.y-a.y)*a.dy,0,Math.min(wall,travel));
  a.life-=dt;
  if(Math.hypot(player.x-a.x-a.dx*nearest,player.y-a.y-a.dy*nearest)<.34&&visible(a.x,a.y,player.x,player.y)) {
   acidShots.splice(i,1);damagePlayer(14*(a.elite?1.3:1),'被酸液击中',{x:a.x,y:a.y});
   if(mode!=='play') return;
  } else if(a.life<=0||wall<=travel) {
   acidShots.splice(i,1);
  } else {
   a.x+=a.dx*travel;a.y+=a.dy*travel;
  }
 }
}
function specialAttack(z,dist,dt) {
 if(z.boss) {
  z.specialCooldown=Math.max(0,(z.specialCooldown??0)-dt);
  const inRange=dist<5.4&&visible(z.x,z.y,player.x,player.y);
  if(z.specialWindup>0) {
   if(!inRange) {z.specialWindup=0;z.specialCooldown=.8;return false;}
   turnZombie(z,player.x,player.y,dt);
   z.specialWindup=Math.max(0,z.specialWindup-dt);
   if(z.specialWindup>0) return true;
   z.specialCooldown=6.2;z.attackPose=.5;blast=.5;
   explosions.push({x:z.x,y:z.y,t:.5,max:.5});
   tone(58,.5,'sawtooth',.18,26);
   if(dist<4.4) damagePlayer(Math.round(24*(z.damageScale||1)),'暴君震荡',{x:z.x,y:z.y});
   return true;
  }
  if(z.specialCooldown===0&&inRange) {
   z.specialWindup=.72;z.specialCooldown=.5;
   tone(70,.28,'triangle',.12,48);
   return true;
  }
  return false;
 }
 const spit=z.type==='spitter';
 if(!spit&&z.type!=='screamer') return false;
 z.specialCooldown=Math.max(0,(z.specialCooldown??0)-dt);
 const inRange=dist>=(spit?2.1:.84)&&dist<=(spit?9.5:7)&&visible(z.x,z.y,player.x,player.y);
 if(!inRange) {
  if(z.specialWindup>0) {
   // 目标被墙挡住或离开射程：取消本次蓄力，短暂宽限后再判断。
   z.specialWindup=0;z.specialAim=null;z.specialCooldown=.55;
  }
  return false;
 }
 if(z.specialWindup>0) {
  if(spit&&z.specialAim) turnZombie(z,z.x+z.specialAim.dx,z.y+z.specialAim.dy,dt);
  else turnZombie(z,player.x,player.y,dt);
  z.specialWindup=Math.max(0,z.specialWindup-dt);
  if(z.specialWindup>0) return true;
  z.specialCooldown=spit?2.85:6.8;
  z.attackPose=.36;
  if(spit) {
   // 只使用起手瞬间锁定的方向；蓄力中玩家横移即可离开酸液路径。
   const fallback=Math.hypot(player.x-z.x,player.y-z.y)||1;
   const dx=z.specialAim?.dx??(player.x-z.x)/fallback,dy=z.specialAim?.dy??(player.y-z.y)/fallback;
   z.specialAim=null;
   acidShots.push({x:z.x+dx*.25,y:z.y+dy*.25,dx,dy,life:1.85,elite:z.elite});
   tone(290,.16,'sawtooth',.083,75);
  } else {
   let boosted=false;
   for(const other of enemies) {
    if(other===z||other.type==='screamer'||Math.hypot(z.x-other.x,z.y-other.y)>5||!mutuallyVisible(z,other)) continue;
    other.rage=3.4;boosted=true;
   }
   if(boosted) setNotice('尖啸者强化了附近感染者',1.25);
   tone(610,.32,'sawtooth',.095,180);
  }
  return true;
 }
 const canShriek=!spit&&enemies.some(a=>a!==z&&a.type!=='screamer'&&Math.hypot(z.x-a.x,z.y-a.y)<5&&mutuallyVisible(z,a));
 if(z.specialCooldown===0&&(spit||canShriek)&&specialGate[z.type]<=0) {
  turnZombie(z,player.x,player.y,dt);
  z.specialWindup=spit?.55:.60;
  z.specialAim=spit?{dx:(player.x-z.x)/dist,dy:(player.y-z.y)/dist}:null;
  specialGate[z.type]=spit?.24:.30;
  tone(spit?168:310,.20,'triangle',.07,spit?240:670);
  return true;
 }
 if(spit&&dist>=3.2) {turnZombie(z,player.x,player.y,dt);return true;}
 return false;
}

function bloodBurst(x,y,z,dx,dy=0,count=10,power=1) {
 z+=floorAt(x,y);
 const length=Math.hypot(dx,dy)||1,ux=dx/length,uy=dy/length;
 for(let i=0;i<count;i++) {
  const angle=Math.random()*TAU,spread=.4+Math.random()*1.8;
  bloodMotes.push({
   x:x+(Math.random()-.5)*.2,y:y+(Math.random()-.5)*.2,z:z+(Math.random()-.35)*.55,
   vx:ux*power*(.55+Math.random()*1.5)+Math.cos(angle)*spread,
   vy:uy*power*(.55+Math.random()*1.5)+Math.sin(angle)*spread,
   vz:.55+Math.random()*2.3*power,
   life:.45+Math.random()*.55,maxLife:1,size:.018+Math.random()*.03
  });
 }
 if(bloodMotes.length>460) bloodMotes.splice(0,bloodMotes.length-460);
}
function killEnemy(z,dir) {
 const index=enemies.indexOf(z);
 if(index<0) return false;
 enemies.splice(index,1);
 z.dead=true;z.deathT=0;z.deathDir=dir??z.yaw??0;z.deathHold=7+Math.random()*4;z.flash=0;z.attackPose=0;z.specialWindup=0;
 corpses.push(z);
 if(corpses.length>22) {
  let far=0,farDistance=-1;
  for(let i=0;i<corpses.length;i++) {
   const d=Math.hypot(corpses[i].x-player.x,corpses[i].y-player.y);
   if(d>farDistance) {farDistance=d;far=i;}
  }
  corpses.splice(far,1);
 }
 bloodBurst(z.x,z.y,1.08,z.x-player.x,z.y-player.y,20,1.55);
 bloodPools.push({x:z.x,y:z.y,elev:floorAt(z.x,z.y),size:.52+Math.random()*.42,life:26,maxLife:26});
 if(bloodPools.length>28) bloodPools.splice(0,bloodPools.length-28);
 return true;
}
function updateBlood(dt) {
 for(let i=bloodMotes.length-1;i>=0;i--) {
  const p=bloodMotes[i];p.life-=dt;p.vz-=9.8*dt;
  p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
  const ground=floorAt(p.x,p.y);
  if(p.z<=ground+.03) {p.z=ground+.03;p.vx*=.18;p.vy*=.18;p.vz=0;p.life=Math.min(p.life,.34);}
  if(p.life<=0) bloodMotes.splice(i,1);
 }
 for(let i=bloodPools.length-1;i>=0;i--) {
  bloodPools[i].life-=dt;
  if(bloodPools[i].life<=0) bloodPools.splice(i,1);
 }
 for(let i=tracers.length-1;i>=0;i--) {
  tracers[i].life-=dt;
  if(tracers[i].life<=0) tracers.splice(i,1);
 }
 for(let i=corpses.length-1;i>=0;i--) {
  const corpse=corpses[i];corpse.deathT=(corpse.deathT??0)+dt;
  if(corpse.deathT>(corpse.deathHold??8)+1.5) corpses.splice(i,1);
 }
}
function paintBlood(view,dx,dy,look,w,h) {
 if(!bloodPools.length&&!bloodMotes.length&&!tracers.length) return;
 ctx.save();
 for(const pool of bloodPools) {
  const wx=pool.x-view.x,wz=pool.y-view.y,forward=wx*dx+wz*dy;
  if(forward<.5||forward>30) continue;
  const sx=w/2+(wz*dx-wx*dy)*focal/forward;
  const sy=h*(.5+look)+(eye-(pool.elev||0)-.01)*focal/forward;
  const radius=pool.size*focal/forward;
  if(sx<-radius||sx>w+radius) continue;
  const alpha=clamp(pool.life/6,0,.55);
  ctx.fillStyle='rgba(66,7,6,'+alpha+')';
  ctx.beginPath();ctx.ellipse(sx,sy,radius,radius*.36,0,0,TAU);ctx.fill();
  ctx.fillStyle='rgba(124,13,10,'+alpha*.55+')';
  ctx.beginPath();ctx.ellipse(sx,sy,radius*.58,radius*.2,0,0,TAU);ctx.fill();
 }
 for(const drop of bloodMotes) {
  const wx=drop.x-view.x,wz=drop.y-view.y,forward=wx*dx+wz*dy;
  if(forward<.35||forward>26) continue;
  const sx=w/2+(wz*dx-wx*dy)*focal/forward;
  const sy=h*(.5+look)+(eye-drop.z)*focal/forward;
  if(sx<-10||sx>w+10||sy<-10||sy>h+10) continue;
  const radius=clamp(drop.size*focal/forward,1,5);
  ctx.fillStyle='rgba(146,13,11,'+clamp(drop.life*1.7,0,.9)+')';
  ctx.beginPath();ctx.ellipse(sx,sy,radius*.72,radius*1.7,0,0,TAU);ctx.fill();
 }
 ctx.globalCompositeOperation='lighter';
 for(const tracer of tracers) {
  const ax=tracer.x1-view.x,az=tracer.y1-view.y,af=ax*dx+az*dy;
  const bx=tracer.x2-view.x,bz=tracer.y2-view.y,bf=bx*dx+bz*dy;
  if(af<.3||bf<.3) continue;
  const sx1=w/2+(az*dx-ax*dy)*focal/af,sy1=h*(.5+look)+(eye-tracer.z1)*focal/af;
  const sx2=w/2+(bz*dx-bx*dy)*focal/bf,sy2=h*(.5+look)+(eye-tracer.z2)*focal/bf;
  const alpha=clamp(tracer.life/tracer.maxLife,0,1);
  ctx.strokeStyle='rgba(255,236,186,'+(alpha*.85)+')';
  ctx.lineWidth=Math.max(1,2.2*alpha);
  ctx.beginPath();ctx.moveTo(sx1,sy1);ctx.lineTo(sx2,sy2);ctx.stroke();
  ctx.fillStyle='rgba(255,210,120,'+(alpha*.5)+')';
  ctx.beginPath();ctx.arc(sx2,sy2,2.6*alpha+1,0,TAU);ctx.fill();
 }
 ctx.restore();
}
function paintObjectiveBeacon(view,dx,dy,look,w,h) {
 if(!story||!story.objective||mode==='menu'||mode==='over') return;
 const objective=story.objective,wx=objective.x-view.x,wz=objective.y-view.y;
 const forward=wx*dx+wz*dy;
 if(forward<1||forward>42) return;
 const sx=w/2+(wz*dx-wx*dy)*focal/forward;
 const base=floorAt(objective.x,objective.y);
 const ground=h*(.5+look)+(eye-base)*focal/forward;
 const top=h*(.5+look)+(eye-base-3.4)*focal/forward;
 if(sx<-40||sx>w+40) return;
 const pulse=.5+.5*Math.sin(frames*.08);
 const width=clamp(60/forward,6,44);
 const grad=ctx.createLinearGradient(sx,top,sx,ground);
 grad.addColorStop(0,'rgba(214,245,111,0)');
 grad.addColorStop(.55,'rgba(214,245,111,'+(.08+.07*pulse)+')');
 grad.addColorStop(1,'rgba(214,245,111,'+(.16+.12*pulse)+')');
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.fillStyle=grad;
 ctx.fillRect(sx-width/2,top,width,ground-top);
 const markY=h*(.5+look)+(eye-base-1.7)*focal/forward,size=clamp(11/forward,.0,12)+4+pulse*2;
 ctx.fillStyle='rgba(214,245,111,'+(.6+.3*pulse)+')';
 ctx.beginPath();ctx.moveTo(sx,markY-size);ctx.lineTo(sx+size,markY);ctx.lineTo(sx,markY+size);ctx.lineTo(sx-size,markY);ctx.closePath();ctx.fill();
 ctx.restore();
}

function update(dt) {
 if(waveTime>0) {waveTime-=dt;if(waveTime<=0) nextWave();}
 if(spawnQueue.length) {
  spawnClock-=dt;
  if(spawnClock<=0) {spawn(spawnQueue.shift());spawnClock=Math.max(.35,1.05-wave*.073);}
 }
 cooldown=Math.max(0,cooldown-dt);muzzle=Math.max(0,muzzle-dt);
 meleeCooldown=Math.max(0,meleeCooldown-dt);meleeFlash=Math.max(0,meleeFlash-dt);
 heartbeatClock=Math.max(0,heartbeatClock-dt);
 if(player.hp>0&&player.hp<30&&heartbeatClock===0&&mode==='play') {tone(52,.16,'sine',.045,34);heartbeatClock=.82;}
 wounded=Math.max(0,wounded-dt*2.15);hitTime=Math.max(0,hitTime-dt);
 alarm=Math.max(0,alarm-dt);damageTime=Math.max(0,damageTime-dt);
 specialGate.spitter=Math.max(0,specialGate.spitter-dt);specialGate.screamer=Math.max(0,specialGate.screamer-dt);
 recoil*=Math.exp(-dt*13);noticeTime=Math.max(0,noticeTime-dt);
 if(reloadTime>0) {
  reloadTime=Math.max(0,reloadTime-dt);
  if(reloadTime===0) {
   const item=currentGun(),rounds=currentRounds(),amount=Math.min(item.capacity-rounds.mag,rounds.reserve);
   rounds.mag+=amount;rounds.reserve-=amount;tone(175,.08,'triangle',.065,92);
  }
 }
 if(keys.has('ArrowLeft')) player.angle-=2*dt;
 if(keys.has('ArrowRight')) player.angle+=2*dt;
 if(keys.has('ArrowUp')) pitch=clamp(pitch+dt*.45,-.3,.3);
 if(keys.has('ArrowDown')) pitch=clamp(pitch-dt*.45,-.3,.3);
 const hearing=!muted&&audio?.state==='running'&&noise;
 enemyStepCooldown=Math.max(0,enemyStepCooldown-dt);
 const forward=Number(keys.has('KeyW'))-Number(keys.has('KeyS'))-joyY;
 const strafe=Number(keys.has('KeyD'))-Number(keys.has('KeyA'))+joyX;
 const length=Math.hypot(forward,strafe), running=keys.has('ShiftLeft')||keys.has('ShiftRight');
 if(length>.01) {
  const speed=(running?3.9:3.2)*(aiming?.72:1)*dt/Math.max(1,length);
  const c=Math.cos(player.angle), s=Math.sin(player.angle);
  const x=player.x,y=player.y,beat=Math.floor(step/Math.PI);
  move(player,(forward*c-strafe*s)*speed,(forward*s+strafe*c)*speed,.23);
  step+=dt*(running?15:9);
  const newBeat=Math.floor(step/Math.PI);
  if(hearing&&newBeat!==beat&&(x!==player.x||y!==player.y)) {
   footstep(running?.047:.031,0,false,running?1.04:.91,newBeat);
  }
 } else step+=dt*1.3;
 const targetEye=1.35+floorAt(player.x,player.y);
 eye+=(targetEye-eye)*(1-Math.exp(-dt*11));
 if(firing||keys.has('Space')) fire();
 updateAcid(dt);
 updateGrenades(dt);
 updateBlood(dt);
 updateDialogue(dt);
 if(story) updateStory(dt);
 if(mode!=='play') return;
 updateNpcs(dt);
 routeClock-=dt;
 if(routeClock<=0) {routeClock=.23;updateRoute();}
 let approaching=null,approachDist=8,approachBeat=0;
 for(const z of enemies) {
  const kind=types[z.type], dist=Math.hypot(player.x-z.x,player.y-z.y);
  z.attack-=dt;z.flash=Math.max(0,z.flash-dt);z.attackPose=Math.max(0,(z.attackPose??0)-dt);
  z.rage=Math.max(0,(z.rage??0)-dt);
  if(z.type==='bomber'&&dist<1.55&&visible(z.x,z.y,player.x,player.y)) {
   detonateBomber(z);
   if(mode!=='play') return;
   continue;
  }
  if(specialAttack(z,dist,dt)) continue;
  if(dist<(z.boss?1.55:.83) && visible(z.x,z.y,player.x,player.y)) {
   turnZombie(z,player.x,player.y,dt);
   if(z.attack<=0) {
    z.attackPose=.36;
    z.attack=(z.boss?1.05:z.type==='brute'?1.2:.89)/((z.rage>0?1.22:1)*(z.elite?1.12:1));
    damagePlayer(kind.damage*(z.damageScale||1),'',{x:z.x,y:z.y});
    if(mode!=='play') return;
   }
   continue;
  }
  const radius=z.type==='brute'||z.type==='shield'?.27:.2;
  let tx=player.x,ty=player.y;
  if(!walkableLine(z.x,z.y,tx,ty,radius,.65)||!visible(z.x,z.y,tx,ty)) {
   const gx=Math.floor(z.x),gy=Math.floor(z.y),next=route[gy*columns+gx];
   if(next===undefined||next<0) continue;
   tx=next%columns+.5;ty=Math.floor(next/columns)+.5;
   if(!walkableLine(z.x,z.y,tx,ty,radius)) {tx=gx+.5;ty=gy+.5;}
  }
  turnZombie(z,tx,ty,dt);
  const length=Math.max(.01,Math.hypot(tx-z.x,ty-z.y));
  let dx=(tx-z.x)/length,dy=(ty-z.y)/length;
  for(const other of enemies) {
   if(other===z) continue;
   const sx=z.x-other.x,sy=z.y-other.y,between=Math.hypot(sx,sy);
   if(between>.025 && between<.53) {dx+=sx*(.53-between)*2.8;dy+=sy*(.53-between)*2.8;}
  }
  const speed=kind.speed*(z.rage>0?1.36:1)*(z.speedScale||1);
  const distance=Math.min(length,speed*dt);
  const x=z.x,y=z.y;
  move(z,dx*distance,dy*distance,radius);
  if(Math.hypot(z.x-x,z.y-y)<distance*.3) {
   move(z,(tx-z.x)/length*distance,(ty-z.y)/length*distance,radius);
  }
  const beat=Math.floor(z.anim/3);
  z.anim+=dt*speed*4.4;
  const nextBeat=Math.floor(z.anim/3);
  if(hearing&&enemyStepCooldown===0&&nextBeat!==beat&&dist>.55&&dist<approachDist&&(x!==z.x||y!==z.y)) {
   approaching=z;approachDist=dist;approachBeat=nextBeat;
  }
 }
 if(approaching) {
  enemyFootstep(approaching,Math.hypot(approaching.x-player.x,approaching.y-player.y),approachBeat);
  enemyStepCooldown=.105;
 }
 if(!story && waveTime<=0 && !spawnQueue.length && !enemies.length) waveCleared();
}

function zombiePose(z,view,advance=0) {
 const friendly=!!z.friendly, squad=z.squad||{}, qin=friendly&&squad.id==='qin', lin=friendly&&squad.id==='lin', qi=friendly&&squad.id==='qi';
 const kind=z.kind||types[z.type], heavy=!friendly&&(z.type==='brute'||z.type==='boss'), quick=!friendly&&z.type==='runner';
 const shield=z.type==='shield',spitter=z.type==='spitter',screamer=z.type==='screamer',bomber=z.type==='bomber';
 const scale=kind.height/1.75, width=(heavy?1.26:shield?1.12:quick||spitter?.89:1)*(friendly?(squad.build||1):1);
 const hair=friendly?(squad.hairColor||[.09,.08,.07]):[0,0,0], accent=friendly?(squad.accentColor||[.7,.7,.7]):[0,0,0];
 const yaw=z.yaw??Math.atan2(view.y-z.y,view.x-z.x);
 const fz=Math.sin(yaw),fx=Math.cos(yaw),rx=-fz,rz=fx;
 const phase=((z.anim??0)+advance)*TAU/6, stride=Math.sin(phase);
 const attack=Math.max(0,z.attackPose??0),reach=Math.sin(attack/.36*Math.PI)*.18;
 const bob=Math.cos(2*phase)*.012, tilt=z.flash>0?Math.min(.045,z.flash*.36):0;
 const lean=friendly?.012:(spitter?.165:quick?.13:heavy?.088:.095);
 const skin=friendly?(z.skinColor||[.52,.44,.35]):(spitter?[.43,.48,.315]:screamer?[.46,.395,.37]:heavy?[.40,.39,.34]:quick?[.48,.47,.41]:[.516,.502,.425]);
 const cloth=friendly?(z.clothColor||[.24,.28,.24]):(shield?[.155,.206,.245]:spitter?[.43,.369,.218]:screamer?[.37,.181,.174]:heavy?[.20,.227,.215]:quick?[.235,.302,.301]:[.345,.312,.255]);
 const shadowCloth=friendly?[.13,.14,.14]:(heavy?[.14,.16,.17]:quick?[.21,.205,.171]:[.255,.225,.18]);
 const pants=friendly?(z.pantsColor||[.21,.22,.22]):(heavy?[.20,.219,.217]:quick?[.20,.224,.201]:[.244,.251,.234]);
 if(!friendly&&z.tint){const factor=1+z.tint;for(const palette of [skin,cloth,pants]) for(let i=0;i<3;i++) palette[i]=clamp(palette[i]*factor,0,1);}
 const boot=[.132,.136,.126];
 const parts=[];
 function orient(v) {return [(rx*v[0]+fx*v[2])*scale,v[1]*scale,(rz*v[0]+fz*v[2])*scale];}
 function add(p,axes,color,material,tag,shape=0) {
  const center=orient(p);center[0]+=z.x;center[2]+=z.y;
  parts.push({center,axes:axes.map(orient),color,material,tag,shape});
 }
 function orb(x,y,d,w,h,l,color,material,tag,shape) {
  add([x,y,d],[[w,0,0],[0,h,0],[0,0,l]],color,material,tag,shape);
 }
 function bone(a,b,w,d,color,material,tag) {
  const v=b.map((n,i)=>n-a[i]),span=Math.hypot(...v);
  const ey=v.map(n=>n/span),horizontal=Math.hypot(ey[0],ey[1]);
  const ex=horizontal>.01?[ey[1]/horizontal,-ey[0]/horizontal,0]:[1,0,0];
  const ez=[ex[1]*ey[2],-ex[0]*ey[2],ex[0]*ey[1]-ex[1]*ey[0]];
  add(a.map((n,i)=>(n+b[i])*.5),[ex.map(n=>n*w),ey.map(n=>n*(span*.5+w*.24)),ez.map(n=>n*d)],color,material,tag);
 }
 const body='body',head='head', hip=.83+bob, ribs=1.145+bob, shoulders=1.288+bob;
 orb(0,hip,0,.147*width,.129,.093,pants,0,body);
 orb(0,1.025+bob,.025,.142*width,.178,.106,cloth,0,body);
 orb(0,ribs-.035,.047,.185*width,.264,.119,cloth,0,body,2);
 bone([0,1.11+bob,.015],[tilt,1.345+bob,lean],.126*width,.099,cloth,0);
 if(heavy||shield) {
  orb(-.09,1.203+bob,.144,.089,.143,.046,shadowCloth,3);
  orb(.09,1.203+bob,.144,.089,.143,.046,shadowCloth,3);
  for(const x of [-.105,0,.105]) orb(x,1.06+bob,.157,.047,.058,.027,pants,3);
 } else {
  bone([-.105,1.28+bob,.123],[-.065,1.04+bob,.126],.013,.018,shadowCloth,0);
 }
 for(const side of [-1,1]) {
  const strideLeg=side*stride, lift=Math.max(0,Math.cos(phase+(side>0?Math.PI:0)))*.09;
  const pelvis=[side*.087*width,hip-.04,0],knee=[side*.101*width,.47+lift*.22,strideLeg*.093+.045];
  const ankle=[side*.107*width,.11+lift,strideLeg*.175-.028];
  bone(pelvis,knee,.079*width,.080,pants,0,body);
  orb(...knee,.047*width,.050,.048,pants,0);
  bone(knee,ankle,.059*width,.057,pants,0,body);
  orb(ankle[0],ankle[1]-.037,ankle[2]+.032,.066*width,.053,.118,boot,3,body);
  orb(ankle[0],ankle[1]-.067,ankle[2]+.033,.064*width,.022,.111,[.078,.082,.078],3);
  const armSwing=Math.sin(phase+side*1.5)*.058, liftArm=side>0?.032:-.047;
  const s=[side*.177*width,shoulders-(side*.016),lean];
  const elbow=[side*.222*width,1.044+bob+liftArm+reach*.24,.145+armSwing+reach*.53];
  const wrist=[side*.204*width,1.019+bob+liftArm*1.8+reach*.67,.226+armSwing+reach+(side>0?.077:0)];
  orb(...s,.056*width,.064,.057,cloth,0);
  const sleeve=s.map((n,i)=>n+(elbow[i]-n)*(heavy?.69:quick?.83:.53));
  bone(s,sleeve,.067*width,.065,cloth,0,body);
  bone(sleeve,elbow,.053*width,.056,skin,1,body);
  orb(...elbow,.036*width,.038,.040,skin,1);
  bone(elbow,wrist,.046*width,.051,skin,1,body);
  orb(wrist[0],wrist[1]-.007,wrist[2]+.037,.048*width,.027,.052,skin,1,body);
  // 袖管从肩延续到前臂，遮住上臂与肘部的拼装接缝（不参与判定）
  bone(s,[s[0]+(elbow[0]-s[0])*.80,s[1]+(elbow[1]-s[1])*.80,s[2]+(elbow[2]-s[2])*.80],.059*width,.062,cloth,0);
  orb(s[0]+(elbow[0]-s[0])*.80,s[1]+(elbow[1]-s[1])*.80,s[2]+(elbow[2]-s[2])*.80,.045*width,.046,.048,shadowCloth,0);
  for(let digit=-1;digit<=1;digit++) {
   const x=wrist[0]+digit*.021*width;
   bone([x,wrist[1]-.012,wrist[2]+.053],[x+digit*.008,wrist[1]-.030,wrist[2]+.080-Math.abs(digit)*.007],.009,.011,skin,1);
  }
 }
 if(friendly) {
  const gunEnd=qin?.74:lin?.40:.59, gunSize=qin?.038:lin?.026:.030, gunY=qin?1.13:lin?1.08:1.10;
  bone([.205,gunY+bob,.20],[.205,gunY+.02+bob,gunEnd],gunSize,.036,[.105,.11,.118],3);
  orb(.205,gunY-.01+bob,.36,.033,.050,.10,[.14,.10,.06],0);
  if(qin) {
   // 老秦：厚重防寒夹克 + 回收护甲背心，轮廓最宽
   orb(0,1.105+bob,0,.178*width,.185,.118,cloth,0);
   orb(0,1.235+bob,-.004,.192*width,.115,.116,shadowCloth,0);
   orb(0,.975+bob,.01,.166*width,.115,.108,cloth,0);
   orb(-.062,1.135+bob,.168,.072,.145,.008,[.28,.235,.09],3);
   orb(.062,1.135+bob,.168,.072,.145,.008,[.28,.235,.09],3);
   orb(0,1.052+bob,.173,.180,.020,.008,accent,3);
   orb(-.078,1.205+bob,.176,.017,.075,.006,accent,3);
   orb(.078,1.205+bob,.176,.017,.075,.006,accent,3);
   orb(0,1.155+bob,-.176,.135,.11,.010,[.25,.235,.13],3);
  } else if(lin) {
   // 林夏：修身医疗长风衣 + 斜挎药袋，轮廓最窄
   orb(0,1.075+bob,.002,.152*width,.190,.102,[.315,.325,.305],0);
   orb(0,.955+bob,.012,.154*width,.115,.098,[.255,.268,.255],0);
   orb(0,1.17+bob,.174,.056,.056,.010,[.84,.86,.83],3);
   orb(0,1.17+bob,.180,.034,.012,.007,accent,3);
   orb(0,1.17+bob,.180,.012,.034,.007,accent,3);
   orb(-.218,1.21+bob,.060,.028,.019,.028,[.82,.83,.80],3);
   orb(-.070,1.04+bob,.060,.046,.076,.026,[.28,.30,.30],3);
   bone([-.104,1.330+bob,.055],[.108,1.010+bob,.088],.021,.010,[.40,.28,.16],3);
   orb(.112,.990+bob,.086,.046,.058,.028,[.215,.225,.195],3);
   orb(.112,.990+bob,.108,.030,.010,.006,accent,3);
  } else {
   // 小七：兜帽短斗篷 + 层叠围巾，轮廓最碎
   orb(0,1.105+bob,0,.172*width,.165,.112,[.155,.195,.225],0);
   orb(0,1.275+bob,-.008,.196*width,.070,.112,[.125,.165,.195],0);
   orb(0,.945+bob,.010,.158*width,.100,.100,[.140,.170,.190],0);
   orb(0,1.205+bob,.170,.132,.013,.006,[.70,.82,.86],0);
   orb(0,1.075+bob,.170,.132,.011,.006,[.70,.82,.86],0);
   orb(0,1.04+bob,-.170,.135,.20,.055,[.13,.19,.24],3);
   orb(0,1.19+bob,-.196,.10,.052,.022,[.10,.14,.18],3);
   for(const side of [-1,1]) orb(side*.092,1.14+bob,.052,.020,.20,.018,[.12,.16,.21],3);
   orb(0,1.292+bob,.052,.108,.024,.088,accent,0);
   orb(.072,1.238+bob,.072,.028,.070,.020,accent,3);
  }
 } else {
  // 丧尸：将衣领与躯干连成整块，削弱球体拼装感
  orb(0,1.290+bob,lean-.006,.152*width,.050,.098,shadowCloth,0);
  orb(0,1.075+bob,-.004,.152*width,.170,.086,cloth,0);
  orb(0,.952+bob,.004,.150*width,.095,.088,cloth,0);
  orb(-.055*width,1.075+bob,.108,.044,.062,.014,[.21,.035,.03],0,body);
  orb(.072*width,1.01+bob,.104,.032,.042,.012,[.17,.028,.024],0,body);
  orb(.004,1.215+bob,.135,.020,.032,.008,[.24,.045,.034],1);
 }
 if(shield) {
  const plateY=.96+bob,plateZ=.353+reach*.45;
  orb(0,plateY,plateZ,.242,.327,.037,[.19,.248,.28],3,'armor');
  orb(0,plateY,plateZ+.012,.219,.294,.036,[.237,.297,.322],3,'armor',3);
  for(const x of [-.13,.13]) orb(x,plateY+.16,plateZ+.036,.017,.018,.014,[.44,.49,.48],3);
 }
 if(spitter) {
  for(const x of [-.07,.07]) orb(x,1.338+bob,lean+.063,.056,.064,.038,[.37,.48,.188],2);
 }
 if(bomber) {
  orb(0,1.02+bob,lean+.118,.118,.15,.07,[.82,.22,.10],6,'body');
  orb(0,1.02+bob,lean+.185,.045,.06,.02,[1,.55,.18],6);
 }
 const cy=1.525+bob-.024*attack+(screamer&&z.specialWindup>0?.027:0),cz=lean+.019+reach*.33,cx=tilt+(heavy?-.012:.005);
 bone([0,1.290+bob,.068],[cx,cy-.087,cz],.055*width,.069,skin,1,body);
 orb(cx,cy,cz,.104*width,.161,.096,skin,1,head,friendly?0:(screamer?4:1));
 if(shield) orb(cx,cy+.102,cz-.027,.113,.075,.105,[.235,.28,.31],3);
 for(const side of [-1,1]) {
  orb(cx+side*.096*width,cy-.017,cz-.023,.015,.032,.021,skin,1);
 }
 if(friendly) {
  // 收紧五官：小眼白、扁平鼻梁、收敛嘴部，避免假人感
  const eyeX=.030*width,eyeY=cy+.014,eyeD=cz+.090;
  for(const side of [-1,1]) {
   orb(cx+side*eyeX,eyeY,eyeD,.0090,.0072,.0046,[.80,.80,.75],3);
   orb(cx+side*eyeX,eyeY,eyeD+.003,.0046,.0050,.0030,[.06,.055,.05],3);
   orb(cx+side*eyeX,eyeY+.021,eyeD-.011,.023,.0042,.0045,hair,0);
  }
  orb(cx,cy-.008,cz+.091,.011,.022,.009,skin,1);
  if(squad.mask) {
   orb(cx,cy-.058,cz+.076,.056,.030,.013,[.70,.74,.72],3);
   orb(cx,cy-.058,cz+.087,.040,.005,.0035,[.54,.58,.56],3);
   for(const side of [-1,1]) bone([cx+side*.050,cy-.046,cz+.034],[cx+side*.072,cy-.060,cz-.060],.004,.004,[.52,.56,.54],3);
  } else {
   orb(cx,cy-.050,cz+.082,.028,.0062,.0048,[.31,.15,.13],3);
  }
  if(squad.beard) {
   const beard=[.24,.19,.15];
   for(const x of [-.030,-.010,.010,.030]) orb(cx+x*width,cy-.074,cz+.056,.018,.024,.014,beard,3);
  }
  // 自然发帽：一整块包覆头骨，取消箍状的黑带
  orb(cx,cy+.088,cz-.020,.107*width,.078,.090,hair,0);
  orb(cx,cy+.016,cz-.074,.101*width,.116,.064,hair,0);
  orb(cx,cy+.135,cz-.030,.086*width,.030,.070,hair,0);
  for(const side of [-1,1]) orb(cx+side*.088*width,cy+.022,cz-.006,.030,.088,.072,hair,0);
  if(squad.gear==='cap') {
   orb(cx,cy+.104,cz-.008,.110*width,.048,.104,hair,0);
   orb(cx,cy+.056,cz+.082,.094*width,.018,.040,hair,3);
  } else if(squad.gear==='ponytail') {
   orb(cx,cy+.052,cz-.018,.086*width,.048,.084,hair,0);
   bone([cx,cy+.020,cz-.108],[cx,cy-.095,cz-.190],.036,.044,hair,0,body);
   orb(cx,cy-.088,cz-.184,.036,.046,.034,hair,0);
  } else if(squad.gear==='hood') {
   // 兜帽：从后脑连续延伸到肩背
   orb(cx,cy+.050,cz-.052,.124*width,.120,.106,hair,0);
   orb(cx,cy-.030,cz-.086,.130*width,.085,.070,hair,0);
   for(const side of [-1,1]) orb(cx+side*.102*width,cy-.030,cz-.004,.034,.075,.048,hair,0);
   orb(cx,cy-.006,cz+.076,.072,.010,.024,accent,3);
  } else {
   orb(cx,cy+.070,cz+.062,.100*width,.042,.032,hair,0);
   orb(cx,cy+.056,cz+.073,.070*width,.030,.022,hair,0);
  }
  // 高领填住头颈接缝，颜色按角色区分
  const collar=qi?[.16,.20,.23]:lin?[.58,.60,.58]:[.20,.235,.22];
  orb(cx,cy-.118,cz-.006,.094*width,.038,.086,collar,0);
 }
 if(z.dead||z.downed) {
  const fall=z.dead?Math.min(1,(z.deathT??0)/.62):Math.min(1,(z.downT??0)/.62);
  const angle=fall*1.46;
  const dir=(z.dead?z.deathDir:z.downDir)??z.yaw??0;
  const axisX=Math.sin(dir),axisZ=-Math.cos(dir);
  const c=Math.cos(angle),s=Math.sin(angle),one=1-c;
  const pivotX=z.x,pivotZ=z.y;
  for(const part of parts) {
   const cx=part.center[0]-pivotX,cy=part.center[1],cz=part.center[2]-pivotZ;
   const dot=axisX*cx+axisZ*cz,crossX=-axisZ*cy,crossY=axisZ*cx-axisX*cz,crossZ=axisX*cy;
   part.center[0]=cx*c+crossX*s+axisX*dot*one+pivotX;
   part.center[1]=cy*c+crossY*s+.012;
   part.center[2]=cz*c+crossZ*s+axisZ*dot*one+pivotZ;
   part.axes=part.axes.map(axis=>{
    const x=axis[0],y=axis[1],zz=axis[2],dot2=axisX*x+axisZ*zz;
    return [
     x*c+(-axisZ*y)*s+axisX*dot2*one,
     y*c+(axisZ*x-axisX*zz)*s,
     zz*c+axisX*y*s+axisZ*dot2*one
    ];
   });
  }
  if(z.dead) {
   const sink=Math.max(0,Math.min(1,((z.deathT??0)-(z.deathHold??8))/1.1));
   if(sink>0) for(const part of parts) part.center[1]-=sink*.78;
  }
 }
 const elev=floorAt(z.x,z.y);
 if(elev>0) for(const part of parts) part.center[1]+=elev;
 return parts;
}
function hitModel(z,wall,dx,dy,slope) {
 const forward=(z.x-player.x)*dx+(z.y-player.y)*dy;
 const side=(z.y-player.y)*dx-(z.x-player.x)*dy;
 if(forward<-.5||forward>wall+.6||Math.abs(side)>.65) return null;
 const rayVector=[dx,slope,dy], origin=[player.x,eye,player.y];
 let bestDepth=wall,tag=null;
 for(const {center,axes,tag:part} of zombiePose(z,player)) {
  if(!part) continue;
  const o=origin.map((n,i)=>n-center[i]);
  let a=0,b=0,c=-1;
  for(const axis of axes) {
   const length2=axis[0]**2+axis[1]**2+axis[2]**2;
   const ro=(o[0]*axis[0]+o[1]*axis[1]+o[2]*axis[2])/length2;
   const rd=(rayVector[0]*axis[0]+rayVector[1]*axis[1]+rayVector[2]*axis[2])/length2;
   a+=rd*rd;b+=ro*rd;c+=ro*ro;
  }
  const k=b*b-a*c;
  if(k<0) continue;
  const t=(-b-Math.sqrt(k))/a;
  if(t>.035&&t<bestDepth) {bestDepth=t;tag=part;}
 }
 return tag?{depth:bestDepth,critical:tag==='head',armored:tag==='armor'}:null;
}

function paintHud() {
 const item=currentGun(),rounds=currentRounds(),inStory=!!story;
 $('waveLabel').textContent=inStory?'战役章节':'感染波次';
 if(inStory) {
  $('wave').textContent=String(story.chapter+1).padStart(2,'0');
  $('waveMax').textContent='/'+String(STORY_CHAPTERS.length).padStart(2,'0');
  $('remaining').textContent='阶段 '+(story.act+1)+' / '+STORY_CHAPTERS[story.chapter].acts.length;
 } else {
  $('wave').textContent=String(wave).padStart(2,'0');
  $('waveMax').textContent='/'+(gameMode==='endless'?'∞':'08');
  $('remaining').textContent=waveTime>0?'补给时间 '+Math.ceil(waveTime)+' 秒':'剩余 '+(enemies.length+spawnQueue.length);
 }
 $('health').textContent=player.hp;
 $('life').style.width=player.hp+'%';
 $('life').style.background=player.hp<28?'#ec815c':'';
 $('notice').textContent=noticeTime>0?noticeText:reloadTime>0?'装填中…':'';
 const supply=closestSupply();
 $('interact').textContent=supply<0?'':used[supply]===supplyWave()?'本波已领取':(mobile?'':'[E] ')+'补充弹药和生命';
 $('weapon').textContent=item.name;
 $('zone').textContent=zone(player.x,player.y);
 $('mag').textContent=String(rounds.mag).padStart(2,'0');
 $('reserve').textContent='/ '+rounds.reserve;
 $('nades').textContent='手雷 '+grenadeCount;
 $('kills').textContent='击倒 '+kills+' · ₡'+runCredits;
 const boss=enemies.find(z=>z.boss);
 $('bossHud').hidden=!boss;
 if(boss) {$('bossName').textContent=(boss.bossName||'暴君')+' · TYRANT';$('bossFill').style.width=Math.max(0,boss.hp/boss.maxHp*100)+'%';}
 $('cross').classList.toggle('hit',hitTime>0);
 $('cross').classList.toggle('head',hitTime>0&&headshot);
 $('effects').style.opacity=wounded;
 updateStoryHud();
 paintRadar();
}
function aim(dx,dy) {
 player.angle=(player.angle+dx*.0028*sensitivity)%TAU;
 pitch=clamp(pitch-dy*.0021*sensitivity,-.3,.3);
}
function toggleMute() {
 muted=!muted;save('blackout-muted',muted?'1':'0');
 $('mute').textContent='声音 '+(muted?'关':'开');
 $('mute').setAttribute('aria-pressed',String(!muted));
 if(!muted) {activateAudio();if(mode==='play') startAmbience();}
 else stopAmbience();
}
$('start').onclick=start;
for(const button of document.querySelectorAll('.mapChoice')) button.onclick=()=>{
 if(mode==='menu') selectMap(button.dataset.map);
};
$('modeStandard').onclick=()=>{if(mode==='menu')setGameMode('standard');};
$('modeEndless').onclick=()=>{if(mode==='menu')setGameMode('endless');};
$('styleSurvival').onclick=()=>{if(mode==='menu')selectPlayStyle('survival');};
$('styleStory').onclick=()=>{if(mode==='menu')selectPlayStyle('story');};
$('openGuide').onclick=()=>$('guide').showModal();
$('closeGuide').onclick=()=>$('guide').close();
$('openArmory').onclick=()=>{shopWeapon=ownedWeapons()[0]?.id||'rifle';renderArmory();$('armory').showModal();};
$('closeArmory').onclick=()=>$('armory').close();
function applySettings() {
 $('sens').value=sensitivity;$('sensVal').textContent=sensitivity.toFixed(2);
 $('fov').value=fovScale;$('fovVal').textContent=fovScale.toFixed(2)+'×';
 $('vol').value=masterVolume;$('volVal').textContent=Math.round(masterVolume*100)+'%';
 $('fxToggle').checked=effectsOn;$('fxVal').textContent=effectsOn?'开':'关';
}
$('openSettings').onclick=()=>{applySettings();$('settings').showModal();};
$('closeSettings').onclick=()=>$('settings').close();
$('sens').oninput=event=>{sensitivity=Number(event.target.value)||1;save('blackout-sens',sensitivity);applySettings();};
$('fov').oninput=event=>{fovScale=Number(event.target.value)||1;save('blackout-fov',fovScale);applySettings();resize();};
$('vol').oninput=event=>{masterVolume=Number(event.target.value);save('blackout-vol',masterVolume);if(audioMaster)audioMaster.gain.value=masterVolume;applySettings();};
$('fxToggle').onchange=event=>{effectsOn=event.target.checked;save('blackout-fx',effectsOn?'1':'0');applySettings();};
applySettings();
$('mute').onclick=toggleMute;
$('mute').textContent='声音 '+(muted?'关':'开');
$('mute').setAttribute('aria-pressed',String(!muted));
$('home').onclick=()=>{modalActionFn=null;setMode('menu');$('start').focus();};
$('modalAction').onclick=()=>{
 if(mode==='pause') {activateAudio();setMode('play');lockAim();}
 else if(modalActionFn){const action=modalActionFn;modalActionFn=null;action();}
 else start();
};
addEventListener('keydown',event=>{
 const code=event.code;
 if(mode==='map') {
  if((code==='Escape'||code==='KeyM')&&!event.repeat) {event.preventDefault();toggleTactical();}
  return;
 }
 if(code==='KeyM'&&mode==='play') {
  if(!event.repeat) {event.preventDefault();toggleTactical();}
  return;
 }
 if(code==='Escape') {
  if(mode==='play'&&document.pointerLockElement!==W) pause();
  else if(mode==='pause') $('modalAction').click();
  return;
 }
 if(mode!=='play') return;
 if(code.startsWith('Arrow')||code==='Space') event.preventDefault();
 keys.add(code);
 if(event.repeat) return;
 if(code==='KeyR') reload();
 if(code==='KeyG') throwGrenade();
 if(code==='KeyF') melee();
 if(code==='KeyE') resupply();
 for(let i=0;i<5;i++) if(code==='Digit'+(i+1)) switchGun(i);
 if(code==='KeyQ') switchGun((gun+1)%Math.max(1,ownedWeapons().length));
 if(code==='KeyP') pause();
});
addEventListener('keyup',event=>keys.delete(event.code));
addEventListener('blur',()=>{if(mode==='play') pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='play') pause();});
document.addEventListener('pointerlockchange',()=>{
 const locked=document.pointerLockElement===W;
 if(!locked&&pressed&&mode==='play') pause();
 pressed=locked;
});
document.addEventListener('mousemove',event=>{
 if(mode==='play'&&document.pointerLockElement===W) aim(event.movementX,event.movementY);
});
W.addEventListener('contextmenu',event=>event.preventDefault());
addEventListener('mousedown',event=>{if(mode==='play'&&event.button===2)setAiming(true);});
addEventListener('mouseup',event=>{if(event.button===2)setAiming(false);});
W.addEventListener('pointerdown',event=>{
 if(mode!=='play'||event.button!==0) return;
 if(event.pointerType!=='touch') {lockAim();firing=true;fire();}
 if(document.pointerLockElement!==W) {
  aimPointer={id:event.pointerId,x:event.clientX,y:event.clientY};
  W.setPointerCapture(event.pointerId);
 }
});
W.addEventListener('pointermove',event=>{
 if(mode!=='play'||aimPointer?.id!==event.pointerId||document.pointerLockElement===W) return;
 aim(event.clientX-aimPointer.x,event.clientY-aimPointer.y);
 aimPointer.x=event.clientX;aimPointer.y=event.clientY;
});
for(const name of ['pointerup','pointercancel']) addEventListener(name,event=>{
 if(aimPointer?.id===event.pointerId) aimPointer=null;
 if(event.pointerType!=='touch') firing=false;
});
const stick=$('stick');
function pointStick(event) {
 if(joyId!==event.pointerId) return;
 const box=stick.getBoundingClientRect(), x=event.clientX-box.left-box.width/2, y=event.clientY-box.top-box.height/2;
 const distance=Math.max(33,Math.hypot(x,y));
 joyX=x/distance;joyY=y/distance;
 stick.firstElementChild.style.transform='translate('+joyX*31+'px,'+joyY*31+'px)';
}
stick.addEventListener('pointerdown',event=>{if(joyId!==null) return;joyId=event.pointerId;stick.setPointerCapture(joyId);pointStick(event);});
stick.addEventListener('pointermove',pointStick);
for(const name of ['pointerup','pointercancel','lostpointercapture']) stick.addEventListener(name,event=>{
 if(joyId!==event.pointerId) return;
 joyId=null;joyX=joyY=0;stick.firstElementChild.style.transform='none';
});
$('touchFire').onpointerdown=event=>{event.currentTarget.setPointerCapture(event.pointerId);firing=true;fire();};
for(const name of ['pointerup','pointercancel','lostpointercapture']) $('touchFire').addEventListener(name,()=>{firing=false;});
$('touchSwap').onclick=()=>switchGun((gun+1)%Math.max(1,ownedWeapons().length));
$('touchAim').onpointerdown=event=>{event.currentTarget.setPointerCapture(event.pointerId);setAiming(true);};
for(const name of ['pointerup','pointercancel','lostpointercapture']) $('touchAim').addEventListener(name,()=>setAiming(false));
$('touchReload').onclick=reload;
$('touchSupply').onclick=resupply;
$('touchNade').onclick=throwGrenade;
$('touchMelee').onclick=melee;
$('touchPause').onclick=pause;
$('touchMap').onclick=$('tacticalClose').onclick=toggleTactical;
const requestedMap=new URLSearchParams(location.search).get('map') || location.hash.replace(/^#/,'');
if(MAPS[requestedMap] && requestedMap!=='yard') {survivalMap=requestedMap;applyMap(requestedMap,true);}
if(playStyle==='story') applyMap(STORY_CHAPTERS[storyChapter].map,false);
function loop(now) {
 const dt=Math.min(.048,Math.max(0,(now-last)/1000));last=now;frames++;
 if(mode==='play') update(dt);
 paintYard();
 if(mode==='play') paintHud();
 else $('effects').style.opacity=0;
 requestAnimationFrame(loop);
}
