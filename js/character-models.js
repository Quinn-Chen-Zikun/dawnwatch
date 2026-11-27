'use strict';
/* 破晓守望 · 骨骼角色层。在现有 WebGL1 canvas 上追加 three r152.2 GLB 人形角色。 */
import * as THREE from 'three';
import { GLTFLoader } from '../vendor/three/GLTFLoader.js';
import { clone as cloneSkeleton } from '../vendor/three/SkeletonUtils.js';
import { MeshoptDecoder } from '../vendor/three/meshopt_decoder.js';

const FILES={qin:'./assets/characters/qin.glb',lin:'./assets/characters/lin.glb',qi:'./assets/characters/qi.glb',walker:'./assets/characters/walker.glb',runner:'./assets/characters/runner.glb',brute:'./assets/characters/brute.glb'};
const MAX_DIST=23,MAX_ACTIVE=16,CLONES_PER_FRAME=2,LOADS_PER_FRAME=2,RELEASE_AFTER=9,TAU=Math.PI*2;
const RAW_STYLES={
 qin:{model:'qin',cloth:'#4b4d3a',pants:'#2d2f2a',skin:'#c3a688',hair:'#1c1a17',accent:'#c98d3d'},
 lin:{model:'lin',cloth:'#a8ada8',pants:'#4b5152',skin:'#c9b09a',hair:'#1b1713',accent:'#b34a3b'},
 qi:{model:'qi',cloth:'#3a5b70',pants:'#2d3640',skin:'#c0a58a',hair:'#191a1d',accent:'#a7d4da'},
 walker:{model:'walker',cloth:'#65644c',pants:'#3b3c33',skin:'#939b83',hair:'#2a2620',accent:'#8d7b46'},
 runner:{model:'runner',cloth:'#874838',pants:'#40372f',skin:'#9f9c8c',hair:'#2c211b',accent:'#c46a4b'},
 brute:{model:'brute',cloth:'#4c4e63',pants:'#30313a',skin:'#a3a68f',hair:'#201e1b',accent:'#707889'},
 shield:{model:'brute',cloth:'#3e4c5d',pants:'#30363d',skin:'#b7b39a',hair:'#211f1c',accent:'#7f97a8'},
 spitter:{model:'walker',cloth:'#766d3e',pants:'#3e3d2d',skin:'#c0c394',hair:'#2a2820',accent:'#a8b45f'},
 screamer:{model:'runner',cloth:'#7c4345',pants:'#3b3030',skin:'#c4ab97',hair:'#251d1c',accent:'#b15b5d'},
 bomber:{model:'walker',cloth:'#634131',pants:'#382e27',skin:'#c2a885',hair:'#28201a',accent:'#b07a3f'},
 boss:{model:'brute',cloth:'#5c3130',pants:'#312b2a',skin:'#b6a58c',hair:'#1d1917',accent:'#8d5142'}
};
const STYLES={};
for(const id in RAW_STYLES){const s=RAW_STYLES[id];STYLES[id]={...s,key:id,colors:{cloth:new THREE.Color(s.cloth),pants:new THREE.Color(s.pants),skin:new THREE.Color(s.skin),hair:new THREE.Color(s.hair),accent:new THREE.Color(s.accent),neutral:new THREE.Color('#96938a')}};}
const CLIP_GROUPS={idle:['idle','stand','breath'],walk:['walk','walking'],shuffle:['slouch walk','walk_slouch','walkslouch'],run:['run','running','sprint','jog'],hit:['hit','hurt','damage','flinch','impact'],death:['death','dead','die','dying','lie_down','liedown','fall','lying'],down:['down','downed','kneel','crouch']};
const state={ready:false,disabled:false,renderer:null,gl:null,canvas:null,scene:null,camera:null,loader:null,models:new Map(),loadQueue:[],active:new Map(),pool:new Map(),claimed:new Set(),candidates:[],frameRecs:[],lastTime:0,lastCleanup:0,theme:null};
let camFill=null,ambient=null,hemi=null,keyLight=null;
const proj=new THREE.Matrix4();

function styleFor(actor){
 if(actor.friendly||actor.squad){const id=actor.squad&&actor.squad.id||actor.role;return STYLES[id]||STYLES.walker;}
 return STYLES[actor.type]||STYLES.walker;
}
function normName(name){return String(name||'').toLowerCase().replace(/^.*\|/,'').replace(/[^a-z0-9]/g,'');}
function pickClip(clips,aliases){
 for(const alias of aliases){const a=normName(alias);for(const c of clips)if(normName(c.name)===a)return c;for(const c of clips)if(normName(c.name).indexOf(a)>=0)return c;}
 return null;
}
function tuneMaterial(m){
 const c=m.clone();
 c.depthTest=true;c.depthWrite=true;c.fog=true;
 if(c.isMeshStandardMaterial){c.metalness=0;c.roughness=Math.max(.62,Math.min(1,c.roughness==null?1:c.roughness));c.envMapIntensity=0;c.emissiveIntensity=0;if(c.emissive)c.emissive.setRGB(0,0,0);}
 if(c.transparent&&c.map){c.transparent=false;c.alphaTest=Math.max(c.alphaTest||0,.3);}else if(c.transparent){c.transparent=false;}
 c.side=m.side;
 return c;
}
function init(ctx){
 state.ready=true;state.gl=ctx.gl;state.canvas=ctx.canvas;
 try{
  const r=new THREE.WebGLRenderer({canvas:ctx.canvas,context:ctx.gl,alpha:true,antialias:true,premultipliedAlpha:true,powerPreference:'high-performance'});
  r.autoClear=false;r.autoClearColor=false;r.autoClearDepth=false;r.autoClearStencil=false;
  r.setPixelRatio(1);r.shadowMap.enabled=false;r.sortObjects=true;
  if('outputColorSpace' in r)r.outputColorSpace=THREE.SRGBColorSpace;
  r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=.92;
  r.setViewport(0,0,ctx.width,ctx.height);
  state.renderer=r;
 }catch(error){state.disabled=true;console.warn('Character mesh renderer unavailable:',error.message);return;}
 const scene=new THREE.Scene();
 scene.fog=new THREE.Fog(0x0a1112,11,38);
 ambient=new THREE.AmbientLight(0x9aa7a2,.42);scene.add(ambient);
 hemi=new THREE.HemisphereLight(0x9fc1c2,0x26251d,.5);scene.add(hemi);
 keyLight=new THREE.DirectionalLight(0xffdfb8,.48);keyLight.position.set(-4,8,3);scene.add(keyLight);scene.add(keyLight.target);
 camFill=new THREE.DirectionalLight(0xdfe8ff,.5);scene.add(camFill);scene.add(camFill.target);
 state.scene=scene;
 state.camera=new THREE.PerspectiveCamera(60,1,.05,120);state.camera.rotation.order='YXZ';
 state.loader=new GLTFLoader().setMeshoptDecoder(MeshoptDecoder);
}
function applyTheme(theme){
 if(!theme||state.theme===theme)return;state.theme=theme;
 if(state.scene&&state.scene.fog&&theme.fog){state.scene.fog.color.setRGB(theme.fog[0],theme.fog[1],theme.fog[2]);}
 if(ambient&&theme.ambient){ambient.color.setRGB(theme.ambient[0]+.02,theme.ambient[1]+.02,theme.ambient[2]+.02);}
}
function updateCamera(ctx){
 const cam=state.camera;if(!cam)return;
 cam.position.set(ctx.view.x,ctx.eye,ctx.view.y);cam.up.set(0,1,0);
 cam.lookAt(ctx.view.x+ctx.dx,ctx.eye,ctx.view.y+ctx.dy);
 cam.updateMatrixWorld(true);cam.matrixWorldInverse.copy(cam.matrixWorld).invert();
 const sx=ctx.focal*2/ctx.width,sy=ctx.focal*2/ctx.height,uPitch=ctx.look*2;
 proj.set(sx,0,0,0, 0,sy,uPitch,0, 0,0,-1.002,-.122, 0,0,-1,0);
 cam.projectionMatrix.copy(proj);cam.projectionMatrixInverse.copy(proj).invert();
 if(camFill){camFill.position.copy(cam.position);camFill.position.y+=.25;camFill.target.position.set(cam.position.x+ctx.dx*3,cam.position.y-.1,cam.position.z+ctx.dy*3);}
}
function queueModel(key){
 let m=state.models.get(key);if(m)return;
 m={status:'queued',root:null,clips:[],nativeHeight:1.75,footY:0};state.models.set(key,m);state.loadQueue.push(key);
}
function pumpLoads(){
 let n=0;
 while(state.loadQueue.length&&n<LOADS_PER_FRAME){
  const key=state.loadQueue.shift(),m=state.models.get(key);
  if(!m||m.status!=='queued')continue;
  m.status='loading';n++;
  state.loader.load(FILES[key],gltf=>{
   const root=gltf.scene||gltf.scenes[0];
   root.updateMatrixWorld(true);
   let box;try{box=new THREE.Box3().setFromObject(root);}catch(error){box=null;}
   let h=box&&isFinite(box.max.y-box.min.y)?box.max.y-box.min.y:1.75;
   if(!isFinite(h)||h<.5)h=1.75;
   m.root=root;m.clips=gltf.animations||[];m.nativeHeight=h;m.footY=box&&isFinite(box.min.y)?box.min.y:0;m.status='ready';
  },undefined,error=>{m.status='failed';console.warn('Character GLB unavailable:',key,error&&error.message||error);});
 }
}
function createRecord(key,def){
 const root=new THREE.Group(),fall=new THREE.Group(),scaled=new THREE.Group(),model=cloneSkeleton(def.root);
 model.position.set(0,-def.footY,0);scaled.add(model);fall.add(scaled);root.add(fall);state.scene.add(root);root.visible=false;
 const materials=[];
 model.traverse(o=>{
  if(!o.isMesh&&!o.isSkinnedMesh)return;
  o.frustumCulled=false;o.castShadow=false;o.receiveShadow=false;
  const src=o.material;
  const conv=m=>{const c=tuneMaterial(m);materials.push({mat:c,base:c.color?c.color.clone():new THREE.Color(1,1,1),name:(m.name||'').toLowerCase()});return c;};
  o.material=Array.isArray(src)?src.map(conv):conv(src);
 });
 const rec={root,fall,scaled,model,mixer:new THREE.AnimationMixer(model),actions:{},materials,modelKey:key,actor:null,style:null,styleSig:null,mode:null,action:null,speed:0,yaw:0,lastX:0,lastY:0,hitUntil:0,hitReady:0,bobPhase:0,lastSeen:0};
 for(const kind in CLIP_GROUPS){const clip=pickClip(def.clips,CLIP_GROUPS[kind]);if(clip)rec.actions[kind]=rec.mixer.clipAction(clip);}
 return rec;
}
function grimeMaterial(material,kind){
 const shade=kind==='skin'
  ? 'float gray=dot(diffuseColor.rgb,vec3(.299,.587,.114)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(gray*.74,gray*.88,gray*.73),.63);'
  : 'float gray=dot(diffuseColor.rgb,vec3(.299,.587,.114)); diffuseColor.rgb=mix(diffuseColor.rgb,vec3(gray*.75,gray*.72,gray*.61),.44);';
 material.onBeforeCompile=shader=>{
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',['#include <color_fragment>',shade].join(String.fromCharCode(10)));
 };
 material.customProgramCacheKey=()=>('dawnwatch-grime-'+kind);
 material.needsUpdate=true;
}
function applyStyle(rec,style){
 if(!style||rec.styleSig===style.key)return;rec.styleSig=style.key;
 for(const item of rec.materials){
  const n=item.name;let target=style.colors.neutral,strength=.1;
  if(/eye|iris|pupil|cornea/.test(n)){item.mat.color.copy(item.base);continue;}
  if(/lash|brow|hair|beard|stubble/.test(n)){target=style.colors.hair;strength=.72;}
  else if(/pant|trouser|jean|short|skirt|leg/.test(n)){target=style.colors.pants;strength=item.mat.map?.55:.8;}
  else if(/shoe|boot|foot/.test(n)){target=new THREE.Color('#2b2d2a');strength=.6;}
  else if(/shirt|cloth|jacket|coat|top|tunic|uniform|vest|sleeve|sweater/.test(n)){target=style.colors.cloth;strength=item.mat.map?.52:.8;}
  else if(/accent|strap|patch|gear|badge|belt/.test(n)){target=style.colors.accent;strength=.62;}
  else if(/skin|body|face|head|hand|arm|neck|flesh/.test(n)){target=style.colors.skin;strength=item.mat.map?(['qin','lin','qi'].includes(style.key)?.12:.36):.58;}
  else {target=item.mat.map?style.colors.neutral:style.colors.cloth;strength=item.mat.map?.1:.42;}
  item.mat.color.copy(item.base).lerp(target,strength);
  const infected=!['qin','lin','qi'].includes(style.key);
  if(infected&&item.mat.isMeshStandardMaterial){
   if(/skin|body|face|head|hand|arm|neck|flesh/.test(n))grimeMaterial(item.mat,'skin');
   else if(/pant|trouser|jean|short|skirt|shirt|cloth|jacket|coat|top|tunic|uniform|vest|sleeve|sweater|outfit/.test(n))grimeMaterial(item.mat,'cloth');
  }else {
   item.mat.onBeforeCompile=()=>{};
   item.mat.customProgramCacheKey=()=>('dawnwatch-clean');
   item.mat.needsUpdate=true;
  }
 }
}
function applyHeight(rec,actor,ctx,def){
 const kind=actor.squad&&actor.squad.height||actor.kind&&actor.kind.height||ctx.types&&actor.type&&ctx.types[actor.type]&&ctx.types[actor.type].height||1.75;
 const s=Math.max(.45,Math.min(2.4,kind/(def.nativeHeight||1.75)));
 rec.scaled.scale.setScalar(s);
}
function acquire(actor,style,dist,def,ctx){
 let rec=null;const pool=state.pool.get(style.model);
 if(pool&&pool.length)rec=pool.pop();
 if(!rec)rec=createRecord(style.model,def);
 rec.actor=actor;rec.modelKey=style.model;rec.style=style;rec.styleSig=null;
 rec.root.visible=true;rec.speed=0;rec.mode=null;rec.action=null;rec.hitUntil=0;rec.hitReady=0;rec.bobPhase=0;
 rec.fall.rotation.set(0,0,0);rec.fall.position.y=0;rec.mixer.stopAllAction();
 rec.lastX=actor.x;rec.lastY=actor.y;rec.lastSeen=performance.now()/1000;
 rec.yaw=Number.isFinite(actor.yaw)?actor.yaw:Math.atan2(ctx.view.y-actor.y,ctx.view.x-actor.x);
 applyStyle(rec,style);applyHeight(rec,actor,ctx,def);
 state.active.set(actor,rec);return rec;
}
function release(rec){
 if(!rec.actor)return;state.active.delete(rec.actor);rec.actor=null;rec.root.visible=false;
 const pool=state.pool.get(rec.modelKey)||[];
 if(pool.length<10){pool.push(rec);state.pool.set(rec.modelKey,pool);}
 else {state.scene.remove(rec.root);for(const item of rec.materials)item.mat.dispose();}
}
function playAction(rec,action,once,fade){
 if(!action){if(rec.action){rec.action.fadeOut(fade||.2);rec.action=null;}return;}
 if(rec.action===action&&!once)return;
 const prev=rec.action;
 action.reset();action.enabled=true;action.setEffectiveWeight(1);action.setEffectiveTimeScale(1);
 action.setLoop(once?THREE.LoopOnce:THREE.LoopRepeat,once?1:Infinity);action.clampWhenFinished=!!once;
 action.play();
 if(prev&&prev!==action&&prev.isRunning())action.crossFadeFrom(prev,fade||.2,true);
 else if(!prev)action.fadeIn(fade||.15);
 rec.action=action;
}
function updateActor(rec,ctx,dt,now){
 const a=rec.actor;if(!a)return;
 rec.lastSeen=now;
 const floor=typeof ctx.floorAt==='function'?ctx.floorAt(a.x,a.y):0;
 rec.root.position.set(a.x,(Number.isFinite(floor)?floor:0)+.012,a.y);
 let inst=Math.hypot(a.x-rec.lastX,a.y-rec.lastY)/Math.max(dt,.0001);
 if(!Number.isFinite(inst)||inst>8)inst=0;
 rec.speed+=(Math.min(7,inst)-rec.speed)*Math.min(1,dt*10);
 rec.lastX=a.x;rec.lastY=a.y;
 const dead=!!a.dead,down=!!a.downed;
 if(dead||down)rec.speed=0;
 let yaw=Number.isFinite(a.yaw)?a.yaw:Math.atan2(ctx.view.y-a.y,ctx.view.x-a.x);
 if(dead&&Number.isFinite(a.deathDir))yaw=a.deathDir;
 else if(down&&Number.isFinite(a.downDir))yaw=a.downDir;
 let diff=((yaw-rec.yaw+Math.PI)%TAU+TAU)%TAU-Math.PI;
 rec.yaw+=diff*Math.min(1,dt*(dead||down?13:8));
 rec.root.rotation.y=Math.PI/2-rec.yaw;
 if(!dead&&!down&&a.flash>0&&now>=rec.hitReady){rec.hitReady=now+.55;const hit=rec.actions.hit;rec.hitUntil=now+(hit?Math.max(.22,hit.getClip().duration*.85):.2);}
 const hit=!dead&&!down&&now<rec.hitUntil;
 let mode=dead?'death':down?'down':hit?'hit':rec.speed>.18?((rec.speed>2.1||(a.type==='runner'&&rec.speed>1))?'run':'walk'):'idle';
 let action=null;
 if(mode==='death')action=rec.actions.death||null;
 else if(mode==='down')action=rec.actions.down||rec.actions.death||null;
 else if(mode==='hit')action=rec.actions.hit||rec.actions.walk||rec.actions.idle||null;
 else if(mode==='run')action=rec.actions.run||rec.actions.walk||rec.actions.idle||null;
 else if(mode==='walk')action=(!a.friendly&&a.type!=='runner'?rec.actions.shuffle:null)||rec.actions.walk||rec.actions.run||rec.actions.idle||null;
 else action=rec.actions.idle||null;
 const once=mode==='death'||mode==='down';
 if(mode!==rec.mode||(once&&rec.action!==action)){playAction(rec,action,once,.22);rec.mode=mode;}
 if(action&&(mode==='walk'||mode==='run'))action.setEffectiveTimeScale(Math.max(.65,Math.min(1.55,rec.speed/(mode==='run'?3.2:1.25))));
 let fallTarget=!a.friendly&&!dead&&!down?(a.type==='runner'?.11:a.type==='brute'?.07:.13):0;
 if(mode==='death'&&!rec.actions.death){const t=Math.max(0,Math.min(1,(a.deathT||0)/.62));fallTarget=-1.45*t*t*(3-2*t);}
 else if(mode==='down'&&!rec.actions.down&&!rec.actions.death){const t=Math.max(0,Math.min(1,(a.downT||0)/.62));fallTarget=-1.35*t*t*(3-2*t);}
 if(mode==='hit')fallTarget-=Math.min(.12,Math.max(0,a.flash||0)*.8);
 rec.fall.rotation.x+=(fallTarget-rec.fall.rotation.x)*Math.min(1,dt*9);
 rec.bobPhase+=dt*(mode==='run'?10.5:mode==='walk'?6.2:2.1);
 const amp=dead||down?0:mode==='run'?.026:mode==='walk'?.016:.004;
 rec.fall.position.y+=(Math.abs(Math.sin(rec.bobPhase))*amp-rec.fall.position.y)*Math.min(1,dt*12);
 rec.mixer.update(dt);
}
function claim(ctx){
 if(state.disabled)return null;
 if(!state.ready)init(ctx);
 if(state.disabled||!state.renderer)return null;
 const gl=state.gl;if(gl.isContextLost&&gl.isContextLost())return null;
 const now=performance.now()/1000;let dt=now-state.lastTime;state.lastTime=now;
 if(!(dt>0)||dt>.15)dt=1/60;
 updateCamera(ctx);applyTheme(ctx.theme);pumpLoads();
 const claimed=state.claimed;claimed.clear();const candidates=state.candidates;candidates.length=0;
 for(const item of ctx.items){
  const actor=item&&item.actor;if(!actor)continue;
  const style=styleFor(actor);if(!style||!FILES[style.model])continue;
  if(!Number.isFinite(actor.x)||!Number.isFinite(actor.y))continue;
  const dx=actor.x-ctx.view.x,dz=actor.y-ctx.view.y,dist=Math.hypot(dx,dz);
  if(dist>MAX_DIST)continue;
  const def=state.models.get(style.model);
  if(!def){queueModel(style.model);continue;}
  if(def.status==='failed')continue;
  if(def.status!=='ready')continue;
  let rec=state.active.get(actor);
  if(rec&&rec.modelKey!==style.model){release(rec);rec=null;}
  if(rec){claimed.add(actor);rec.style=style;rec.lastSeen=now;continue;}
  candidates.push({actor,style,dist});
 }
 candidates.sort((a,b)=>a.dist-b.dist);
 let clones=0;
 for(const c of candidates){
  if(clones>=CLONES_PER_FRAME||state.active.size>=MAX_ACTIVE)break;
  const def=state.models.get(c.style.model);
  if(!def||def.status!=='ready')continue;
  if(acquire(c.actor,c.style,c.dist,def,ctx)){claimed.add(c.actor);clones++;}
 }
 if(now-state.lastCleanup>2){state.lastCleanup=now;for(const rec of Array.from(state.active.values()))if(now-rec.lastSeen>RELEASE_AFTER)release(rec);}
 const recs=state.frameRecs;recs.length=0;
 for(const entry of state.active){const actor=entry[0],rec=entry[1];if(claimed.has(actor)){rec.root.visible=true;recs.push(rec);}else rec.root.visible=false;}
 for(const rec of recs)updateActor(rec,ctx,dt,now);
 if(state.renderer)state.renderer.setViewport(0,0,ctx.width,ctx.height);
 return claimed;
}
function render(){
 if(state.disabled||!state.renderer||!state.claimed.size)return;
 const r=state.renderer,gl=state.gl;
 try{
  if(r.resetState)r.resetState();
  r.setViewport(0,0,gl.drawingBufferWidth||state.canvas.width,gl.drawingBufferHeight||state.canvas.height);
  r.autoClear=false;r.autoClearColor=false;r.autoClearDepth=false;r.autoClearStencil=false;
  r.render(state.scene,state.camera);
 }catch(error){state.disabled=true;console.warn('Character mesh draw disabled:',error.message);}
 gl.viewport(0,0,gl.drawingBufferWidth||state.canvas.width,gl.drawingBufferHeight||state.canvas.height);
 gl.bindFramebuffer(gl.FRAMEBUFFER,null);gl.disable(gl.SCISSOR_TEST);gl.disable(gl.BLEND);gl.disable(gl.CULL_FACE);
 gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.depthMask(true);gl.colorMask(true,true,true,true);
 gl.activeTexture(gl.TEXTURE0);gl.bindTexture(gl.TEXTURE_2D,null);
 gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL,false);gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL,false);gl.pixelStorei(gl.UNPACK_ALIGNMENT,4);
}
window.DawnwatchCharacters={claim,render,status:()=>({disabled:state.disabled,models:Array.from(state.models,([key,data])=>[key,data.status]),active:state.active.size,claimed:state.claimed.size,lost:!!state.gl?.isContextLost()})};
