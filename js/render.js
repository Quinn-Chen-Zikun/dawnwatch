'use strict';
/* 破晓守望 · 渲染层：WebGL 场景、丧尸模型、枪械、血迹、雷达与天气 */
const yardPhotography={Ground:'assets/ground.jpg',Concrete:'assets/concrete.jpg',Metal:'assets/metal.jpg',Wood:'assets/wood.jpg'};
function makeViewMesh(kind,up) {
 const data=[],body=0,steel=1,rubber=2,sleeve=3,glove=4,accent=5,optics=6;
 function vertex(p,n,mat,part) {data.push(...p,...n,mat,part);}
 function quad(a,b,c,d,n,mat,part) {
  for(const p of [a,b,c,a,c,d]) vertex(p,n,mat,part);
 }
 function block(x,y,z,w,h,d,mat,part=0) {
  const X=x+w,Y=y+h,Z=z+d;
  const a=[x,y,z],b=[X,y,z],c=[X,y,Z],e=[x,y,Z],f=[x,Y,z],g=[X,Y,z],i=[X,Y,Z],j=[x,Y,Z];
  quad(f,g,i,j,[0,1,0],mat,part);quad(e,c,b,a,[0,-1,0],mat,part);
  quad(a,b,g,f,[0,0,-1],mat,part);quad(c,e,j,i,[0,0,1],mat,part);
  quad(e,a,f,j,[-1,0,0],mat,part);quad(b,c,i,g,[1,0,0],mat,part);
 }
 function tube(a,b,r0,r1,mat,part=0,sides=12) {
  const d=b.map((v,i)=>v-a[i]),L=Math.hypot(...d),D=d.map(v=>v/L);
  const U=Math.abs(D[1])>.8?[D[1],-D[0],0]:[-D[2],0,D[0]];
  const N=Math.hypot(...U),S=U.map(v=>v/N);
  const T=[D[1]*S[2]-D[2]*S[1],D[2]*S[0]-D[0]*S[2],D[0]*S[1]-D[1]*S[0]];
  function ring(i) {const t=i*TAU/sides;return S.map((v,j)=>Math.cos(t)*v+Math.sin(t)*T[j]);}
  for(let i=0;i<sides;i++) {
   const m=ring(i),n=ring(i+1),ap=a.map((v,j)=>v+m[j]*r0),aq=a.map((v,j)=>v+n[j]*r0);
   const bp=b.map((v,j)=>v+m[j]*r1),bq=b.map((v,j)=>v+n[j]*r1);
   vertex(ap,m,mat,part);vertex(aq,n,mat,part);vertex(bq,n,mat,part);
   vertex(ap,m,mat,part);vertex(bq,n,mat,part);vertex(bp,m,mat,part);
   const ab=D.map(v=>-v);
   for(const p of [a,aq,ap])vertex(p,ab,mat,part);
   for(const p of [b,bp,bq])vertex(p,D,mat,part);
  }
 }
 const pistol=kind==='pistol',shotgun=kind==='shotgun',dmr=kind==='dmr',smg=kind==='smg';
 const front=pistol?.36:smg?.57:shotgun?.91:dmr?1.06:.83;
 const coreEnd=pistol?.29:smg?.40:shotgun?.49:.55;
 if(!pistol) {
  block(-.052,-.053,-.23,.104,.115,.236,body);
  block(-.061,-.076,-.245,.122,.16,.037,rubber);
  block(-.059,.035,-.16,.118,.033,.17,rubber);
 }
 block(-.058,-.018,.003,.116,.105,coreEnd,body);
 block(-.049,.078,.02,.098,.025,coreEnd-.033,steel);
 block(-.052,-.072,.018,.104,.068,.106,rubber);
 block(-.039,-.155,.013,.078,.103,.089,body);
 block(-.079,.008,.053,.025,.029,.056,steel);
 block(.052,.001,.069,.029,.022,.108,accent);
 block(-.052,-.058,.124,.104,.022,.073,steel);
 block(-.052,-.029,.183,.021,.033,.022,steel);
 tube([0,.060,coreEnd-.007],[0,.060,front],shotgun?.039:.021,pistol?.022:.018,steel);
 tube([0,.060,front-.026],[0,.060,front+.015],.026,.026,rubber);
 tube([0,.060,front+.015],[0,.060,front+.019],.014,.014,2);
 if(shotgun) {
  tube([0,.001,.41],[0,.001,.83],.030,.029,steel);
  block(-.057,-.023,.49,.114,.069,.25,rubber);
  for(let i=0;i<7;i++) block(-.061,-.019,.51+i*.030,.122,.065,.012,body);
 } else if(!pistol) {
  const start=smg?.23:.29,end=front-.16;
  block(-.060,-.016,start,.120,.080,end-start,body);
  for(let z=start+.016;z<end-.02;z+=.054) block(-.063,.018,z,.126,.012,.012,steel);
  const mag=(smg?.215:dmr?.106:.168)+(up.capacity>=2?.044:0);
  block(-.040,-mag-.041,.206,.080,mag,.095,body,2);
  block(-.044,-mag-.057,.197,.088,.023,.113,rubber,2);
  for(const x of [-.042,.038])block(x,-mag-.022,.23,.006,mag-.025,.011,steel,2);
 } else {
  block(-.042,-.177,.020,.084,.041,.095,rubber,2);
  for(let z=.031;z<.112;z+=.015)block(-.061,.019,z,.122,.039,.004,steel);
 }
 if(dmr) {
  block(-.033,.095,.130,.066,.052,.046,steel);
  block(-.033,.095,.315,.066,.052,.046,steel);
  tube([0,.153,.112],[0,.153,.416],.032,.035,body);
  tube([0,.153,.087],[0,.153,.145],.038,.038,steel);
  tube([0,.153,.377],[0,.153,.429],.042,.042,steel);
  tube([0,.153,.084],[0,.153,.088],.025,.025,optics);
 } else {
  block(-.010,.088,front-.07,.020,.041,.018,rubber);
  block(-.016,.097,.030,.032,.030,.023,rubber);
  block(-.008,.116,front-.07,.016,.011,.018,accent);
 }
 if(up.control>=1&&!pistol) block(-.026,-.11,.33,.052,.10,.055,rubber);
 if(up.control>=2&&!pistol&&!dmr) {
  block(-.031,.095,.12,.062,.022,.061,steel);
  block(-.028,.116,.137,.056,.041,.043,body);
  block(-.014,.133,.132,.028,.018,.007,optics);
 }
 if(up.damage>=2) tube([0,.06,front-.077],[0,.06,front+.01],.034,.030,steel);
 if(up.reload>=2) block(-.060,-.021,.155,.018,.041,.084,accent);
 const nearGrip=[.065,-.098,.062],support=pistol?[-.047,-.103,.156]:[-.059,-.033,shotgun?.533:smg?.335:.41];
 const wristR=[.117,-.168,.009],wristL=[support[0]-.055,support[1]-.069,support[2]-.078];
 tube([.345,-.367,-.14],wristR,.083,.052,sleeve);
 tube([-.33,-.39,-.12],wristL,.082,.049,sleeve,1);
 tube([.16,-.212,-.025],wristR,.056,.053,rubber);
 tube([wristL[0]-.041,wristL[1]-.033,wristL[2]-.025],wristL,.054,.050,rubber,1);
 tube(wristR,nearGrip,.045,.043,glove);
 tube(wristL,support,.045,.040,glove,1);
 for(let i=0;i<4;i++) {
  const z=nearGrip[2]+i*.0173,y=nearGrip[1]-.013+i*.010;
  tube([.083,y,z],[.039,y+.023,z+.016],.0127,.0105,glove,0,8);
  const a=support[2]-.022+i*.0205;
  tube([support[0]-.026,support[1]-.012,a],[support[0]+.030,support[1]+.028,a+.011],.013,.0095,glove,1,8);
 }
 tube([.066,-.075,.046],[.091,-.052,.082],.016,.012,glove,0,8);
 tube([support[0]+.014,support[1]+.009,support[2]-.050],[support[0]+.043,support[1]+.038,support[2]-.020],.016,.012,glove,1,8);
 const flare=[0,.060,front+.069],normal=[0,0,-1];
 for(let i=0;i<14;i++) {
  const theta=i*TAU/14,next=(i+1)*TAU/14;
  const r=i%2===0?.108:.028,R=(i+1)%2===0?.108:.028;
  vertex(flare,normal,7,0);
  vertex([Math.cos(theta)*r,flare[1]+Math.sin(theta)*r,flare[2]],normal,7,0);
  vertex([Math.cos(next)*R,flare[1]+Math.sin(next)*R,flare[2]],normal,7,0);
 }
 return new Float32Array(data);
}

function makeViewPass(gl,program,playerLight) {
 const shader=program(`
 attribute vec3 aPoint,aShadeNormal;
 attribute float aSurface,aPart;
 uniform vec2 uScale;
 uniform vec3 uRest;
 uniform float uSway,uBob,uKick,uLoad;
 varying vec3 vNormal,vLocal;
 varying float vSurface;
 void main() {
  vec3 p=aPoint;
  if(aPart>.5&&aPart<1.5) {
   p.x-=uLoad*.132;p.y-=uLoad*.185;p.z-=uLoad*.118;
  } else if(aPart>1.5) {
   p.x-=uLoad*.053;p.y-=uLoad*.197;p.z-=uLoad*.030;
  }
  float roll=-uLoad*.41+uSway*.28;
  mat2 turn=mat2(cos(roll),sin(roll),-sin(roll),cos(roll));
  p.xy=turn*p.xy;
  p.x-=p.z*.165;p.x+=uSway;
  p.y+=p.z*(.04+uKick*.32)+uBob+uKick*.075-uLoad*.067;
  p.z-=uKick*.64;
  p+=uRest;
  vec3 n=aShadeNormal;n.xy=turn*n.xy;
  vLocal=aPoint;vNormal=n;vSurface=aSurface;
  gl_Position=vec4(p.x*uScale.x,p.y*uScale.y,p.z*1.038-.082,p.z);
 }`, `precision highp float;
 uniform vec3 uBody,uMetal,uAccent,uEnvironment,uPlayerLight;
 uniform float uFire;
 varying vec3 vNormal,vLocal;
 varying float vSurface;
 float grain(vec2 p) {return fract(sin(dot(p,vec2(12.99,78.23)))*43758.54);}
 void main() {
  if(vSurface>6.5) {
   if(uFire<.01) discard;
   gl_FragColor=vec4(mix(vec3(.94,.44,.12),vec3(1.,.98,.68),uFire),1.);return;
  }
  vec3 c;
  if(vSurface<.5)c=uBody;
  else if(vSurface<1.5)c=uMetal;
  else if(vSurface<2.5)c=vec3(.100,.113,.113);
  else if(vSurface<3.5)c=vec3(.235,.252,.213);
  else if(vSurface<4.5)c=vec3(.160,.175,.155);
  else if(vSurface<5.5)c=uAccent;
  else c=vec3(.233,.371,.335);
  vec3 n=normalize(vNormal);
  float sheen=max(0.,dot(n,normalize(vec3(-.28,.73,-.40))));
  float bounce=max(0.,dot(n,normalize(vec3(.70,.10,-.62))));
  float s=grain(floor(vLocal.xz*720.));
  float seam=sin(vLocal.z*170.)*sin(vLocal.y*220.);
  float tex=vSurface>2.5&&vSurface<4.5?.88+.09*seam+.13*s:.92+.07*s;
  vec3 local=uPlayerLight*(.40+.60*max(0.,n.y));
  vec3 lit=c*tex*(vec3(.40,.43,.43)+uEnvironment*.49+local+sheen*.53+bounce*.15);
  if(vSurface<1.5)lit+=pow(sheen,14.)*(vec3(.14,.15,.16)+local*.16);
  if(vSurface>5.5)lit+=pow(bounce,13.)*vec3(.045,.11,.10);
  lit+=uFire*vec3(.16,.071,.033)*(.42+sheen*.5);
  gl_FragColor=vec4(lit,1.);
 }`);
 const p=shader.p,attributes=['aPoint','aShadeNormal','aSurface','aPart'].map(name=>gl.getAttribLocation(p,name));
 const u=Object.fromEntries(['uScale','uRest','uSway','uBob','uKick','uLoad','uBody','uMetal','uAccent','uEnvironment','uPlayerLight','uFire'].map(name=>[name,gl.getUniformLocation(p,name)]));
 const buffers=new Map();
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16)/255);
 return function drawWeapon(item) {
  const up=upgradesOf(item.id),key=[up.capacity>=2,up.control>=1,up.control>=2,up.damage>=2,up.reload>=2].join();
  const skin=skinOf(item.id);
  let mesh=buffers.get(item.kind);
  if(!mesh) {mesh={buffer:gl.createBuffer()};buffers.set(item.kind,mesh);}
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh.buffer);
  if(mesh.key!==key) {
   const data=makeViewMesh(item.kind,up);
   gl.bufferData(gl.ARRAY_BUFFER,data,gl.STATIC_DRAW);mesh.key=key;mesh.count=data.length/8;
  }
  gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);gl.useProgram(p);
  gl.uniform2f(u.uScale,focal*2/W.width,focal*2/W.height);
  gl.uniform3f(u.uRest,.196,-.205*(W.height/W.width)/.625,.62);
  const motion=keys.has('KeyW')||keys.has('KeyA')||keys.has('KeyS')||keys.has('KeyD')||Math.hypot(joyX,joyY)>.08;
  gl.uniform1f(u.uSway,Math.sin(step*.53)*(motion?.013:.003));
  gl.uniform1f(u.uBob,Math.sin(step)*(motion?.013:.004));
  gl.uniform1f(u.uKick,recoil);gl.uniform1f(u.uLoad,Math.sin(Math.PI*reloadTime/item.reload));
  gl.uniform3fv(u.uBody,rgb(skin.body));gl.uniform3fv(u.uMetal,rgb(skin.metal));gl.uniform3fv(u.uAccent,rgb(skin.accent));
  gl.uniform3fv(u.uEnvironment,MAP.theme.ambient);gl.uniform3fv(u.uPlayerLight,playerLight);
  gl.uniform1f(u.uFire,Math.min(1,muzzle/.055));
  for(const [i,n,pos] of [[0,3,0],[1,3,12],[2,1,24],[3,1,28]]) {
   gl.enableVertexAttribArray(attributes[i]);gl.vertexAttribPointer(attributes[i],n,gl.FLOAT,false,32,pos);
  }
  gl.drawArrays(gl.TRIANGLES,0,mesh.count);
  attributes.forEach(i=>gl.disableVertexAttribArray(i));
 };
}

function makeYardRenderer() {
 const canvas=document.createElement('canvas');
 const gl=canvas.getContext('webgl',{alpha:true,antialias:true,premultipliedAlpha:true});
 if(!gl) return null;
 const vertexView=`
 uniform vec2 uCamera,uForward,uScale;
 uniform float uPitch,uEye;
 attribute vec3 aPosition;
 vec4 view(vec3 point) {
   vec2 d=point.xz-uCamera;
   float z=dot(d,uForward);
   float side=dot(d,vec2(-uForward.y,uForward.x));
   return vec4(side*uScale.x,(point.y-uEye)*uScale.y-z*uPitch,z*1.002-.122,z);
 }`;
 const sceneVertex=vertexView+`
 attribute vec3 aNormal,aColor;
 attribute float aMaterial;
 varying vec3 vPosition,vNormal,vColor;
 varying float vMaterial;
 void main() {
   vPosition=aPosition;vNormal=aNormal;vColor=aColor;vMaterial=aMaterial;
   gl_Position=view(aPosition);
 }`;
 const atmosphere=`
 uniform vec2 uCamera;
 uniform float uEye;
 uniform float uTime,uFlash;
 uniform vec4 uLights[12];
 uniform vec3 uFog,uAmbient;
 vec3 illum(vec3 p,vec3 n) {
   vec3 ambient=uAmbient+max(0.,dot(n,normalize(vec3(-.4,.8,-.25))))*vec3(.14,.18,.19);
   for(int i=0;i<12;i++) {
     vec4 l=uLights[i];
     vec3 d=vec3(l.x,l.z,l.y)-p;
     float d2=dot(d,d);
     float facing=max(.23,dot(n,normalize(d)));
     float power=abs(l.w)*facing/(.94+d2*.40);
     ambient+=power*(l.w>0.?vec3(1.63,.72,.29):vec3(.29,1.03,1.30));
   }
   float closeDist=distance(p.xz,uCamera);
   return ambient+uFlash*vec3(2.4,1.08,.36)/(1.+closeDist*closeDist*.78);
 }
 vec3 fog(vec3 finalColor,vec3 p) {
   float d=distance(p.xz,uCamera);
   float fade=1.-exp(-d*(.024+.016*exp(-p.y*.38)));
   return mix(finalColor,uFog,fade*.87);
 }`;
 const sceneFragment=`precision highp float;
 varying vec3 vPosition,vNormal,vColor;
 varying float vMaterial;
 uniform sampler2D uGround,uConcrete,uMetal,uWood;`+atmosphere+`
 float hash(vec2 p) {return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
 float noise(vec2 p) {
   vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
   return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+1.),f.x),f.y);
 }
 float lightness(vec3 c) {return dot(c,vec3(.24,.64,.12));}
 void main() {
   vec3 p=vPosition,n=normalize(vNormal),c=vColor;
   vec2 uv=abs(n.y)>.5?p.xz:vec2(abs(n.x)>.5?p.z:p.x,p.y);
   vec3 v=normalize(vec3(uCamera.x,uEye,uCamera.y)-p);
   float grain=hash(floor(uv*88.))-.5,macro=noise(uv*.79);
   float mat=vMaterial;
   vec3 specular=vec3(0.);
   if(mat<.5) {
     vec3 tex=texture2D(uGround,uv*.39).rgb;
     vec2 tile=abs(fract(uv*.33)-.5);
     float seam=smoothstep(.490,.498,max(tile.x,tile.y));
     float wet=smoothstep(.42,.63,noise(uv*.72)*.74+noise(uv*2.85)*.26);
     c*=.64+lightness(tex)*1.22-seam*.22;
     c+=vec3(.061,.048,.038)*(tex-lightness(tex));
     c=mix(c,c*.68,wet);
     float ripple=sin(uv.x*15.2+uv.y*11.35+uTime*4.1)*sin(uv.y*17.3-uTime*2.9)*.011;
     vec3 reflectedNormal=normalize(vec3(ripple,1.,ripple*.76));
     for(int i=0;i<12;i++) {
       vec4 l=uLights[i];
       vec3 d=vec3(l.x,l.z,l.y)-p;
       vec3 ldir=normalize(d),h=normalize(ldir+v);
       float sharp=pow(max(0.,dot(h,reflectedNormal)),mix(18.,52.,wet));
       float beam=exp(-abs(d.x)*1.2-abs(d.z)*.33);
       float glint=clamp(sharp*(.06+wet*.43)/(1.+dot(d,d)*.05)+beam*(.009+.023*wet),0.,.72);
       specular+=glint*abs(l.w)*(l.w>0.?vec3(.94,.49,.21):vec3(.23,.64,.80));
     }
   } else if(mat<1.5) {
     vec3 tex=texture2D(uConcrete,vec2(uv.x*.43,1.-uv.y*.45)).rgb;
     float streak=noise(vec2(uv.x*11.5,uv.y*.62));
     float damp=smoothstep(.34,.72,streak)*exp(-p.y*.49);
     c*=1.0+lightness(tex)*.93-.29*damp-.13*(1.-macro);
     c+=.16*(tex-lightness(tex));
   } else if(mat<2.5) {
     vec3 tex=texture2D(uMetal,vec2(uv.x*.55,1.-uv.y*.53)).rgb;
     float rib=sin(uv.x*32.5);
     float rust=smoothstep(.38,.80,noise(vec2(uv.x*5.4,uv.y*.78))*.68+(1.-lightness(tex))*.32);
     c*=.63+.14*rib+lightness(tex)*.83+grain*.036;
     c=mix(c,vec3(.36,.187,.100)*(lightness(tex)+.59),rust*.77);
     specular+=pow(max(0.,dot(n,v)),6.)*.025*(1.-rust);
   } else if(mat<3.5) {
     vec3 tex=texture2D(uWood,vec2(uv.y*.66,uv.x*.54)).rgb;
     float board=smoothstep(.94,.99,fract(uv.y*5.17));
     c*=(.46+lightness(tex)*1.43)-board*.35;
     c+=.16*(tex-lightness(tex));
   } else if(mat<4.5) {
     float wear=smoothstep(.59,.85,noise(uv*15.)*.7+grain*.31+.16);
     float pattern=step(.5,fract((uv.x+uv.y)*3.6));
     c=mix(c*.18,c,pattern)*(1.-.68*wear);
   } else if(mat>5.5 && mat<6.5) {
     gl_FragColor=vec4(fog(c,p),1.);return;
   } else if(mat<7.5) {
     float folds=noise(vec2(uv.x*2.4,uv.y*7.0))*noise(vec2(uv.y*3.1,uv.x*1.3));
     float hem=smoothstep(.93,1.0,fract(uv.y*4.2));
     c*=.72+folds*.38-hem*.18;
     c+=.10*(folds-.5);
   } else {
     c*=.86+grain*.14+macro*.25;
   }
   vec3 color=c*illum(p,n)+specular;
   gl_FragColor=vec4(fog(color,p),1.);
 }`;
 const spriteVertex=vertexView+`
 attribute vec2 aUv;
 varying vec3 vPosition;
 varying vec2 vUv;
 void main() {vPosition=aPosition;vUv=aUv;gl_Position=view(aPosition);}
 `;
 const spriteFragment=`precision highp float;
 varying vec3 vPosition;
 varying vec2 vUv;
 uniform sampler2D uTexture;
 uniform float uType;
 uniform vec2 uForward;`+atmosphere+`
 void main() {
   vec4 tex=texture2D(uTexture,vUv);
   if(uType>2.5) {gl_FragColor=tex;return;}
   if(tex.a<.43) discard;
   vec3 light=illum(vPosition,vec3(-uForward.x,.22,-uForward.y));
   vec3 c=tex.rgb*(uType>1.5?vec3(1.10):light+vec3(.10,.07,.05));
   if(uType<.5 && tex.r>.77 && tex.g>.47 && tex.b<.54) c=mix(c,vec3(1.,.65,.24),.32);
   if(uType>.5 && uType<1.5 && tex.g>tex.r*1.1 && tex.g>.68) c=mix(c,vec3(.72,.92,.44),.37);
   gl_FragColor=vec4(fog(c,vPosition),1.);
 }`;
 function program(v,f) {
  function shader(kind,source) {
   const s=gl.createShader(kind);gl.shaderSource(s,source);gl.compileShader(s);
   if(!gl.getShaderParameter(s,gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
   return s;
  }
  const p=gl.createProgram();gl.attachShader(p,shader(gl.VERTEX_SHADER,v));gl.attachShader(p,shader(gl.FRAGMENT_SHADER,f));gl.linkProgram(p);
  if(!gl.getProgramParameter(p,gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(p));
  const uniforms={};
  for(const name of ['uCamera','uForward','uScale','uPitch','uEye','uTime','uFlash','uLights[0]','uType','uFog','uAmbient']) uniforms[name]=gl.getUniformLocation(p,name);
  return {p,uniforms};
 }
 const scene=program(sceneVertex,sceneFragment),spritesProgram=program(spriteVertex,spriteFragment);
 const photoTextures=[];
 let loadedPhotos=0;
 function proceduralPhotoTile(name) {
  const tile=document.createElement('canvas');tile.width=tile.height=512;
  const paint=tile.getContext('2d');
  const base=({Ground:[58,66,62],Concrete:[104,110,112],Metal:[92,112,116],Wood:[104,78,52]})[name]||[100,100,100];
  paint.fillStyle='rgb('+base.join(',')+')';paint.fillRect(0,0,512,512);
  const random=rng(9001+name.length*137);
  for(let i=0;i<4200;i++) {
   const x=random()*512,y=random()*512,r=.4+random()*2.4,shift=(random()-.5)*44;
   paint.fillStyle='rgba('+clamp(base[0]+shift,0,255)+','+clamp(base[1]+shift,0,255)+','+clamp(base[2]+shift,0,255)+','+(.1+random()*.28)+')';
   paint.beginPath();paint.arc(x,y,r,0,TAU);paint.fill();
  }
  if(name==='Concrete'||name==='Metal') {
   paint.strokeStyle='rgba(20,26,28,.22)';paint.lineWidth=2;
   for(let i=0;i<=512;i+=64) {paint.beginPath();paint.moveTo(i,0);paint.lineTo(i,512);paint.stroke();paint.beginPath();paint.moveTo(0,i);paint.lineTo(512,i);paint.stroke();}
  }
  if(name==='Metal') {paint.strokeStyle='rgba(220,240,245,.08)';paint.lineWidth=1;for(let i=0;i<40;i++){paint.beginPath();paint.moveTo(i*13,0);paint.lineTo(i*13,512);paint.stroke();}}
  if(name==='Wood') {paint.strokeStyle='rgba(40,26,14,.25)';paint.lineWidth=3;for(let i=0;i<26;i++){const y=i*20+8;paint.beginPath();paint.moveTo(0,y);paint.bezierCurveTo(160,y+6,340,y-7,512,y+2);paint.stroke();}}
  return tile;
 }
 for(const [i,name] of ['Ground','Concrete','Metal','Wood'].entries()) {
  const tex=gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D,tex);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,1,1,0,gl.RGBA,gl.UNSIGNED_BYTE,new Uint8Array([129,129,129,255]));
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR_MIPMAP_LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.generateMipmap(gl.TEXTURE_2D);
  const uniform=gl.getUniformLocation(scene.p,'u'+name);
  photoTextures.push({tex,uniform});
  const upload=tile=>{
   gl.bindTexture(gl.TEXTURE_2D,tex);
   gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,tile);
   gl.generateMipmap(gl.TEXTURE_2D);loadedPhotos++;
  };
  const fallback=()=>{
   try {upload(proceduralPhotoTile(name));}
   catch(error) {console.warn('Photo texture fallback failed:',name,error.message);}
  };
  const photo=new Image();
  photo.onload=()=>{
   try {
    const tile=document.createElement('canvas');tile.width=tile.height=512;
    tile.getContext('2d').drawImage(photo,0,0,512,512);
    upload(tile);
   } catch(error) {fallback();}
  };
  photo.onerror=fallback;
  if(yardPhotography[name]) photo.src=yardPhotography[name];else fallback();
 }
 const verts=[], lights=[];
 const lightFrame=new Float32Array(48),playerLight=new Float32Array(3);
 const lightOrder=[],lightDistances=[];
 const steel=[.37,.48,.50], black=[.23,.27,.28], hazard=[.78,.56,.27];
 const signObjects=[];
 function face(a,b,c,d,n,color,mat) {
  for(const pt of [a,b,c,a,c,d]) verts.push(...pt,...n,...color,mat);
 }
 const TOP=1,BOTTOM=2,NORTH=4,SOUTH=8,WEST=16,EAST=32,ALL_FACES=63;
 function box(x,y,z,w,h,d,mat,color,faces=ALL_FACES) {
  const X=x+w,Y=y+h,Z=z+d;
  const a=[x,y,z],b=[X,y,z],c=[X,y,Z],d0=[x,y,Z],e=[x,Y,z],f=[X,Y,z],g=[X,Y,Z],h0=[x,Y,Z];
  if(faces&TOP) face(e,f,g,h0,[0,1,0],color,mat);
  if(faces&BOTTOM) face(d0,c,b,a,[0,-1,0],color,mat);
  if(faces&NORTH) face(a,b,f,e,[0,0,-1],color,mat);
  if(faces&SOUTH) face(c,d0,h0,g,[0,0,1],color,mat);
  if(faces&WEST) face(d0,a,e,h0,[-1,0,0],color,mat);
  if(faces&EAST) face(b,c,g,f,[1,0,0],color,mat);
 }
 function tileOccludes(x,z,height) {
  if(x<0||z<0||x>=columns||z>=rows) return true;
  const tile=cell(x,z);
  return (tile==='#'||tile==='M'||tile==='T')&&coverHeight(x,z)>=height;
 }
 function tileSides(x,z,height) {
  let faces=0;
  if(!tileOccludes(x,z-1,height)) faces|=NORTH;
  if(!tileOccludes(x,z+1,height)) faces|=SOUTH;
  if(!tileOccludes(x-1,z,height)) faces|=WEST;
  if(!tileOccludes(x+1,z,height)) faces|=EAST;
  return faces;
 }
 function paintLine(x,z,w,d,color) {
  face([x,.010,z],[x+w,.010,z],[x+w,.010,z+d],[x,.010,z+d],[0,1,0],color,5);
 }
 function paintWet(x,z,w,d,color) {
  face([x,.006,z],[x+w,.006,z],[x+w,.006,z+d],[x,.006,z+d],[0,1,0],color,0);
 }
 function part(x,z,len,wid,y,h,dir,mat,color) {
  const w=dir?wid:len, d=dir?len:wid;
  box(x-w/2,y,z-d/2,w,h,d,mat,color);
 }

 function drawFacility(kind,x,z,h) {
  // The existing cover tile owns collision. Keep every piece inside that tile and its height.
  const base=floorAt(x+.5,z+.5);
  const add=(a,b,c,w,d,e,mat,color)=>box(x+a,base+b*h,z+c,w,d*h,e,mat,color);
  if(kind==='freight') {
   add(0,0,0,1,.13,1,3,[.34,.26,.16]);
   add(.03,.13,.03,.94,.82,.94,3,[.57,.42,.28]);
   add(.01,.95,.01,.98,.05,.98,3,[.40,.29,.17]);
   for(const offset of [.17,.77]) {
    add(offset,.13,.01,.06,.87,.025,5,[.24,.26,.21]);
    add(offset,.13,.965,.06,.87,.025,5,[.24,.26,.21]);
    add(offset,.983,.01,.06,.017,.98,5,[.24,.26,.21]);
   }
   for(const end of [.032,.958]) {
    add(.28,.51,end,.41,.24,.008,8,[.65,.56,.41]);
    for(const offset of [.32,.39,.46,.53,.60]) add(offset,.55,end<.5?end-.006:end+.008,.025,.13,.005,5,[.29,.25,.18]);
   }
  } else if(kind==='cart') {
   add(0,0,0,1,.12,1,5,black);
   add(.04,.12,.05,.92,.54,.90,2,[.62,.44,.16]);
   for(const y of [.19,.34,.49]) {
    add(.13,y,.025,.74,.11,.03,5,[.28,.22,.13]);
    add(.39,y+.04,.01,.22,.029,.03,5,steel);
    add(.13,y,.945,.74,.11,.03,5,[.28,.22,.13]);
    add(.39,y+.04,.96,.22,.029,.03,5,steel);
   }
   add(0,.66,0,1,.074,1,5,[.19,.24,.24]);
   add(.09,.734,.15,.34,.135,.42,2,[.34,.35,.33]);
   add(.55,.734,.23,.32,.095,.14,3,[.56,.37,.19]);
   for(const a of [.11,.83]) add(a,.734,.82,.06,.266,.06,2,steel);
   add(.11,.95,.81,.78,.05,.065,5,steel);
  } else if(kind==='pump') {
   add(0,0,0,1,.18,1,1,[.36,.42,.38]);
   add(.04,.18,.04,.92,.11,.92,5,hazard);
   add(.10,.29,.21,.80,.43,.55,2,[.25,.50,.46]);
   add(.26,.72,.23,.47,.20,.51,2,[.31,.56,.49]);
   add(.39,.92,.33,.21,.08,.29,5,black);
   for(const a of [.16,.25,.34,.43,.52,.61,.70,.79]) {
    add(a,.40,.18,.035,.29,.03,5,[.16,.27,.25]);
    add(a,.40,.75,.035,.29,.035,5,[.16,.27,.25]);
   }
   for(const a of [.02,.86]) {
    add(a,.33,.37,.12,.30,.25,5,[.19,.26,.23]);
    add(a+.015,.40,.34,.07,.17,.31,2,steel);
   }
   add(.29,.70,.195,.09,.045,.03,6,[.67,.83,.59]);
   add(.45,.70,.195,.04,.046,.03,6,[.95,.49,.30]);
  } else if(kind==='bed') {
   add(.03,0,.12,.94,.16,.76,2,black);
   add(.12,.16,.18,.76,.25,.64,2,steel);
   add(.02,.41,.08,.96,.15,.84,2,[.35,.52,.52]);
   add(.03,.56,.09,.94,.15,.82,7,[.71,.79,.76]);
   add(.07,.71,.14,.25,.095,.71,7,[.88,.88,.82]);
   add(.34,.709,.115,.60,.054,.77,7,[.32,.57,.55]);
   for(const a of [.055,.89]) add(a,.41,.05,.05,.51,.90,5,steel);
   for(const a of [.052,.90]) {
    add(.09,.59,a,.046,.35,.05,5,steel);
    add(.77,.59,a,.046,.35,.05,5,steel);
    add(.09,.90,a,.726,.051,.05,5,steel);
   }
   add(.02,.80,.12,.081,.20,.76,2,[.27,.40,.40]);
  } else if(kind==='exercise') {
   add(0,0,0,1,.14,1,1,[.33,.38,.36]);
   add(.065,.14,.09,.87,.42,.82,2,[.38,.44,.42]);
   add(.06,.52,.083,.88,.055,.834,5,black);
   for(const a of [.17,.76]) {
    add(a,.57,.12,.065,.40,.08,2,steel);
    add(a,.57,.80,.065,.40,.08,2,steel);
   }
   add(.155,.943,.12,.686,.057,.08,2,steel);
   add(.155,.943,.80,.686,.057,.08,2,steel);
   add(.21,.20,.085,.58,.17,.02,4,hazard);
  }
 }
 function drawProp(item) {
  const t=item.t,dir=item.dir||0,x=item.x,z=item.z;
  if(t==='rails') {
   for(const dz of [-.25,.25]) part(x,z+dz,item.len,.042,.013,.036,0,2,[.43,.48,.48]);
   for(let dx=.5-item.len/2;dx<item.len/2;dx+=.87)
    part(x+dx,z,.70,.096,.011,.014,1,5,[.27,.30,.29]);
  } else if(t==='court') {
   const line=[.57,.49,.36];
   paintLine(x-2.69,z-2.46,5.38,.07,line);paintLine(x-2.69,z-.13,5.38,.07,line);
   paintLine(x-2.69,z-2.46,.07,2.39,line);paintLine(x+2.62,z-2.46,.07,2.39,line);
   paintLine(x-.94,z-1.46,1.88,.053,line);
   for(const a of [-.93,.88]) paintLine(x+a,z-1.46,.054,1.34,line);
   box(x-.055,2.75,z-.057,.11,.14,.082,5,steel);
   box(x-.54,2.60,z-.074,1.08,.57,.070,5,[.65,.63,.54]);
   box(x-.24,2.70,z-.085,.48,.30,.012,5,[.48,.27,.18]);
   box(x-.206,2.73,z-.094,.412,.238,.011,5,[.62,.60,.52]);
   const rim=[.63,.32,.14];
   for(const a of [-.233,.208]) box(x+a,2.61,z-.54,.025,.032,.45,5,rim);
   for(const dz of [-.54,-.115]) box(x-.21,2.61,z+dz,.42,.032,.025,5,rim);
   for(const dx of [-.16,-.085,0,.085,.16]) box(x+dx,2.43,z-.536,.012,.18,.012,7,[.63,.60,.48]);
  } else if(t==='bench') {
   part(x,z,1.55,.5,.42,.10,dir,3,[.45,.35,.24]);
   part(x,z,1.55,.5,.52,.07,dir,5,[.24,.27,.26]);
   part(x-(dir?0:.24),z-(dir?.24:0),1.55,.07,.52,.40,dir,5,[.31,.35,.34]);
   for(const a of [-.62,.62]) for(const b of [-.16,.16])
    box(x+(dir?b:a)-.035,0,z+(dir?a:b)-.035,.07,.42,.07,5,[.18,.22,.21]);
  } else if(t==='bin') {
   box(x-.19,0,z-.19,.38,.78,.38,2,[.25,.29,.29]);
   box(x-.21,.78,z-.21,.42,.06,.42,5,black);
   box(x-.15,.72,z-.15,.30,.04,.30,6,[.18,.24,.22]);
  } else if(t==='vending') {
   const cx=Math.floor(x)+.5,cz=Math.floor(z)+.5;
   part(cx,cz,1,1,0,VENDING_HEIGHT-.07,dir,2,item.color||[.34,.38,.42]);
   part(cx,cz,1,1,VENDING_HEIGHT-.07,.07,dir,5,black);
   if(dir===0) {
    box(cx-.30,.98,cz+.489,.60,.64,.017,6,[.62,.84,.80]);
    box(cx-.11,.30,cz+.491,.22,.18,.015,5,black);
   } else {
    box(cx+.489,.98,cz-.30,.017,.64,.60,6,[.62,.84,.80]);
    box(cx+.491,.30,cz-.11,.015,.18,.22,5,black);
   }
  } else if(t==='pipe') {
   const len=item.len||4,y=item.y||2.2,r=item.r||.09;
   part(x,z,len,r*2,y,r*2,dir,2,item.color||MAP.theme.metal);
   for(let a=-len/2+1.2;a<len/2;a+=3.2) {
    const px=x+(dir?0:a),pz=z+(dir?a:0);
    box(px-.09,y-.06,pz-.09,.18,.24,.18,5,black);
   }
  } else if(t==='cable') {
   part(x,z,item.len||4,.035,item.y||3.1,.035,dir,5,[.09,.11,.11]);
  } else if(t==='beam') {
   part(x,z,item.len||4,.16,item.y||3.4,.16,dir,5,item.color||[.20,.22,.21]);
  } else if(t==='bed') {
   part(x,z,1.9,.86,.33,.13,dir,2,[.30,.34,.34]);
   part(x,z,1.82,.77,.46,.14,dir,3,[.69,.71,.67]);
   part(x-(dir?0:.62),z-(dir?.62:0),.54,.52,.60,.12,dir,3,[.82,.83,.78]);
   for(const a of [-.86,.86]) for(const b of [-.38,.38])
    box(x+(dir?b:a)-.03,0,z+(dir?a:b)-.03,.06,.34,.06,5,[.20,.24,.23]);
   part(x,z,1.86,.03,.58,.26,dir,2,[.38,.44,.44]);
  } else if(t==='iv') {
   box(x-.02,0,z-.02,.04,1.86,.04,2,steel);
   box(x-.17,.01,z-.17,.34,.05,.34,5,black);
   box(x-.13,1.53,z-.025,.26,.32,.05,5,[.58,.66,.65]);
   box(x-.10,1.57,z+.03,.20,.22,.03,6,[.44,.72,.62]);
  } else if(t==='gurney') {
   part(x,z,1.78,.74,.4,.12,dir,2,[.33,.38,.38]);
   part(x,z,1.7,.67,.50,.13,dir,3,[.66,.70,.68]);
   part(x-(dir?0:.58),z-(dir?.58:0),.45,.46,.63,.10,dir,3,[.80,.82,.78]);
   for(const a of [-.66,.66]) for(const b of [-.36,.36])
    box(x+(dir?b:a)-.05,0,z+(dir?a:b)-.05,.10,.10,.10,5,[.13,.16,.16]);
   part(x+(dir?0:0),z+(dir?0:0),1.9,.04,.86,.03,dir,2,steel);
  } else if(t==='curtain') {
   part(x,z,item.len||2.4,.035,.20,2.48,dir,7,item.color||[.42,.56,.60]);
   part(x,z,item.len||2.4,.05,2.70,.05,dir,5,steel);
  } else if(t==='bunk') {
   for(const a of [-.92,.92]) for(const b of [-.38,.38])
    box(x+(dir?b:a)-.035,0,z+(dir?a:b)-.035,.07,1.62,.07,5,[.22,.26,.26]);
   part(x,z,1.84,.80,.42,.12,dir,3,[.58,.60,.55]);
   part(x,z,1.84,.80,1.18,.12,dir,3,[.58,.60,.55]);
   part(x,z,1.84,.04,1.32,.30,dir,2,steel);
  } else if(t==='locker') {
   part(x,z,.64,.46,0,1.86,dir,2,[.30,.35,.36]);
   part(x,z,.58,.03,1.32,.30,dir,5,[.17,.20,.20]);
   part(x,z,.05,.05,1.0,.16,dir,6,[.50,.56,.52]);
  } else if(t==='washing') {
   part(x,z,.78,.78,0,1.05,dir,2,[.62,.66,.64]);
   if(dir===0) {box(x-.21,.30,z+.39,.42,.42,.025,5,[.22,.27,.28]);box(x-.15,.36,z+.40,.30,.30,.02,6,[.38,.48,.50]);}
   else {box(x+.39,.30,z-.21,.025,.42,.42,5,[.22,.27,.28]);box(x+.40,.36,z-.15,.02,.30,.30,6,[.38,.48,.50]);}
  } else if(t==='workbench') {
   part(x,z,1.7,.62,.80,.11,dir,3,[.38,.31,.22]);
   for(const a of [-.7,.7]) for(const b of [-.22,.22])
    box(x+(dir?b:a)-.04,0,z+(dir?a:b)-.04,.08,.80,.08,5,black);
   part(x,z,1.7,.06,1.05,.72,dir,2,[.27,.31,.31]);
   for(const a of [-.45,-.1,.28]) part(x+(dir?0:a),z+(dir?a:0),.30,.05,.92,.28,dir,5,[.44,.40,.30]);
  } else if(t==='barrier') {
   part(x,z,1.25,.42,0,.30,dir,1,[.40,.42,.40]);
   part(x,z,1.05,.34,.30,.56,dir,1,[.44,.46,.43]);
   part(x,z,1.06,.35,.56,.12,dir,4,hazard);
  } else if(t==='mast') {
   box(x-.07,0,z-.07,.14,4.9,.14,5,[.18,.22,.22]);
   box(x-.32,0,z-.32,.64,.08,.64,5,black);
   box(x-.23,4.78,z-.23,.46,.25,.46,5,black);
   box(x-.16,4.90,z-.16,.32,.04,.32,6,[1,.72,.38]);
  } else if(t==='door') {
   for(const a of [-.58,.58]) box(x+(dir?0:a)-.05,0,z+(dir?a:0)-.05,.10,2.25,.10,5,[.25,.29,.29]);
   box(x-(dir?.60:.62),2.25,z-(dir?.62:.60),dir?.20:1.24,.12,dir?1.24:.20,5,[.25,.29,.29]);
   if(dir===0) {
    const hx=x+.58,oz=z+.47;
    box(hx-.035,0,oz-.45,.07,2.10,.90,2,[.26,.31,.32]);
    for(const a of [-.32,-.16,0,.16,.32]) box(hx-.015,.06,oz+a-.015,.03,1.95,.03,5,steel);
   } else {
    const oz=z+.58,ox=x+.47;
    box(ox-.45,0,oz-.035,.90,2.10,.07,2,[.26,.31,.32]);
    for(const a of [-.32,-.16,0,.16,.32]) box(ox+a-.015,.06,oz-.015,.03,1.95,.03,5,steel);
   }
  } else if(t==='hoop') {
   box(x-.06,0,z-.06,.12,3.15,.12,5,[.20,.24,.25]);
   box(x-.49,3.08,z-.04,.98,.62,.07,3,[.62,.58,.48]);
   box(x-.30,2.86,z-.22,.60,.05,.44,4,hazard);
   box(x-.24,2.80,z-.03,.48,.05,.05,5,[.55,.30,.20]);
   box(x-.24,2.72,z-.03,.05,.10,.05,5,[.55,.30,.20]);
   box(x+.19,2.72,z-.03,.05,.10,.05,5,[.55,.30,.20]);
  } else if(t==='pallet') {
   part(x,z,1.0,.94,.05,.09,dir,3,[.44,.35,.24]);
   for(const a of [-.38,-.12,.14,.38]) part(x+(dir?0:a),z+(dir?a:0),.14,.94,.14,.06,dir,3,[.34,.27,.18]);
  } else if(t==='barrel') {
   box(x-.27,0,z-.27,.54,.92,.54,2,[.36,.30,.22]);
   for(const y of [.18,.62]) box(x-.29,y,z-.29,.58,.09,.58,4,hazard);
   box(x-.22,.92,z-.22,.44,.05,.44,5,black);
  } else if(t==='tank') {
   box(x-.14,0,z-.14,.28,.92,.28,2,[.55,.62,.63]);
   box(x-.17,.92,z-.17,.34,.06,.34,5,black);
   box(x-.04,1.0,z-.04,.08,.14,.08,5,steel);
  } else if(t==='toilet') {
   part(x,z,.56,.42,0,.42,dir,1,[.62,.65,.62]);
   part(x,z,.42,.52,.42,.08,dir,1,[.50,.54,.52]);
   part(x-(dir?0:.36),z-(dir?.36:0),.42,.22,.42,.38,dir,1,[.58,.62,.60]);
  } else if(t==='monitor') {
   box(x-.24,1.55,z-.04,.48,.30,.05,5,black);
   box(x-.20,1.60,z+.02,.40,.20,.02,6,[.40,.68,.64]);
   box(x-.02,1.10,z-.02,.04,.48,.04,5,steel);
  } else if(t==='blood') {
   paintWet(x,z,item.w||1.2,item.d||.6,[.16,.025,.025]);
  } else if(t==='puddle') {
   paintWet(x,z,item.w||2.4,item.d||.8,item.color||[.06,.10,.11]);
  } else if(t==='crate') {
   const s=item.s||1;
   box(x-s*.5,.02,z-s*.5,s,s*.62,s,3,[.48,.37,.25]);
   box(x-s*.42,s*.62,z-s*.42,s*.8,s*.45,s*.8,3,[.53,.41,.28]);
   box(x-s*.5,.12,z-s*.5,s,.08,s,4,hazard);
  } else if(t==='cone') {
   box(x-.18,0,z-.18,.36,.05,.36,5,black);
   box(x-.13,.05,z-.13,.26,.32,.26,4,[.78,.40,.16]);
   box(x-.09,.37,z-.09,.18,.22,.18,4,[.82,.48,.20]);
  } else if(t==='vent') {
   part(x,z,.70,.10,item.y||2.0,.46,dir,5,[.16,.19,.19]);
   for(const a of [-.14,0,.14]) part(x+(dir?0:a),z+(dir?a:0),.58,.02,item.y+0.08||2.08,.05,dir,6,[.28,.32,.30]);
  } else if(t==='valve') {
   box(x-.05,item.y||2.2,z-.05,.10,.10,.10,5,steel);
   for(const a of [-.18,.18]) {
    box(x+a-.03,item.y+.32,z-.02,.06,.06,.04,5,[.46,.38,.24]);
    box(x-.03,item.y+.32,z+a-.02,.04,.06,.06,5,[.46,.38,.24]);
   }
  }
 }
 function makeSign(cap,sub,accent) {
  const img=document.createElement('canvas');img.width=384;img.height=96;
  const g=img.getContext('2d');
  g.fillStyle='#111e22';g.fillRect(0,0,384,96);
  g.fillStyle=accent;g.fillRect(0,0,9,96);g.fillRect(17,77,342,2);
  g.fillStyle='#f1ead4';g.font='900 39px system-ui';g.fillText(cap,24,55);
  g.fillStyle=accent;g.font='800 13px ui-monospace,monospace';g.fillText(sub,26,72);
  return img;
 }
 function gantry(x0,x1,z,title,sub,warm,level) {
  const clr=warm?[1,.64,.31]:[.42,.96,1], post=level-.5;
  box(x0,0,z,.18,level,.16,5,steel);box(x1-.18,0,z,.18,level,.16,5,steel);
  box(x0,post,z-.09,x1-x0,.23,.35,5,steel);
  box(x0+.11,post-.02,z+.26,.61,.052,.055,6,clr);
  box(x1-.72,post-.02,z+.26,.61,.052,.055,6,clr);
  signObjects.push({x:(x0+x1)*.5,y:post-.05,z:z+.276,width:2.88,height:.72,data:makeSign(title,sub,warm?'#e9a85f':'#89e8ed')});
 }
 function buildCeiling(def) {
  const h=def.height,hole=MAP.ceilingHole;
  if(hole) {
   const x0=hole.x0,y0=hole.y0,x1=hole.x1,y1=hole.y1;
   face([1,h,1],[columns-1,h,1],[columns-1,h,y0],[1,h,y0],[0,-1,0],def.color,1);
   face([1,h,y1],[columns-1,h,y1],[columns-1,h,rows-1],[1,h,rows-1],[0,-1,0],def.color,1);
   face([1,h,y0],[x0,h,y0],[x0,h,y1],[1,h,y1],[0,-1,0],def.color,1);
   face([x1,h,y0],[columns-1,h,y0],[columns-1,h,y1],[x1,h,y1],[0,-1,0],def.color,1);
  } else face([1,h,1],[columns-1,h,1],[columns-1,h,rows-1],[1,h,rows-1],[0,-1,0],def.color,1);
  const beamColor=def.beam||[.19,.21,.20],inside=(x,z)=>hole&&x>=hole.x0&&x<=hole.x1&&z>=hole.y0&&z<=hole.y1;
  if(hole) {
   const high=h+4.6,wallColor=[.30,.34,.34];
   for(let z=hole.y0;z<hole.y1;z+=4) box(hole.x0,high-.24,z,hole.x1-hole.x0,.24,.20,5,beamColor);
   for(let x=hole.x0;x<hole.x1;x+=4) box(x,high-.24,hole.y0,.20,.24,hole.y1-hole.y0,5,beamColor);
   face([hole.x0,high,hole.y0],[hole.x1,high,hole.y0],[hole.x1,high,hole.y1],[hole.x0,high,hole.y1],[0,-1,0],def.color,1);
   box(hole.x0,h,hole.y0,hole.x1-hole.x0,high-h,.08,1,wallColor);
   box(hole.x0,h,hole.y1-.08,hole.x1-hole.x0,high-h,.08,1,wallColor);
   box(hole.x0,h,hole.y0,.08,high-h,hole.y1-hole.y0,1,wallColor);
   box(hole.x1-.08,h,hole.y0,.08,high-h,hole.y1-hole.y0,1,wallColor);
   for(const [x,z] of [[57.5,7.5],[54.5,16.5]]) {
    box(x-.38,high-.07,z-.14,.76,.07,.28,6,def.panel);
    box(x-.02,high-.46,z-.02,.04,.39,.04,5,[.13,.15,.15]);
   }
  }
  if(!hole) {
   for(let x=3;x<columns-2;x+=4) box(x,h-.17,1.5,.17,.17,rows-3,5,beamColor);
   for(let z=3;z<rows-2;z+=4) box(1.5,h-.17,z,columns-3,.17,.17,5,beamColor);
  }
  for(const [x,z] of lights) {
   if(inside(x,z)) continue;
   box(x-.38,h-.07,z-.14,.76,.07,.28,6,def.panel);
   box(x-.02,h-.46,z-.02,.04,.39,.04,5,[.13,.15,.15]);
   box(x-.09,h-.52,z-.09,.18,.06,.18,5,[.16,.18,.18]);
  }
 }
 const metalColors=[[.31,.48,.47],[.42,.45,.51],[.53,.30,.248],[.52,.43,.305],[.32,.36,.42]];
 const mesh=gl.createBuffer();
 let vertexCount=0;
 function rebuild() {
  verts.length=0;signObjects.length=0;lights.length=0;
  const theme=MAP.theme,style=theme.style,rand=rng(90210);
  lights.push(...MAP.lights);
  lightOrder.length=0;
  for(let i=0;i<lights.length;i++) lightOrder.push(i);
  face([1,0,1],[columns-1,0,1],[columns-1,0,rows-1],[1,0,rows-1],[0,1,0],theme.ground,0);
  if(MAP.heights) {
   const floorColor=style==='hospital'?[.50,.53,.52]:style==='subway'?[.34,.38,.39]:[.42,.44,.43];
   const stairColor=style==='hospital'?[.38,.40,.39]:[.30,.33,.34];
   const rail=[.30,.34,.35];
   const onStairs=(x,y)=>(MAP.stairs||[]).some(s=>x>=s.x0&&x<=s.x1&&y>=s.y0&&y<=s.y1);
   for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
    const h=MAP.heights[y*columns+x];
    if(h<=.01) continue;
    if(onStairs(x,y)) box(x,0,y,1,h,1,1,stairColor);
    else box(x,h-.16,y,1,.16,1,1,floorColor);
    for(const [side,nx,ny] of [['n',x,y-1],['s',x,y+1],['w',x-1,y],['e',x+1,y]]) {
     if(nx<0||ny<0||nx>=columns||ny>=rows) continue;
     if(solid(nx,ny)) continue;
     const nh=MAP.heights[ny*columns+nx]||0;
     if(nh>h-.25) continue;
     if(side==='n') {box(x,h-.96,y+.04,1,.05,.05,5,rail);box(x+.04,h-.96,y+.04,.05,.88,.05,5,rail);}
     else if(side==='s') {box(x,h-.96,y+.91,1,.05,.05,5,rail);box(x+.04,h-.96,y+.91,.05,.88,.05,5,rail);}
     else if(side==='w') {box(x+.04,h-.96,y,.05,.05,1,5,rail);box(x+.04,h-.96,y+.04,.05,.88,.05,5,rail);}
     else {box(x+.91,h-.96,y,.05,.05,1,5,rail);box(x+.91,h-.96,y+.04,.05,.88,.05,5,rail);}
    }
   }
  }
  for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
   const tile=cell(x,y);
   if(tile==='.'||tile==='V') continue;
   const wallHeight=coverHeight(x,y),out=x===0||y===0||x===columns-1||y===rows-1;
   const facility=MAP.facilities.get(y*columns+x);
   if(facility) {drawFacility(facility,x,y,wallHeight);continue;}
   const edgeNorth=!solid(x,y-1),edgeSouth=!solid(x,y+1),edgeEast=!solid(x+1,y),edgeWest=!solid(x-1,y);
   if(tile==='C') {
    if(style==='yard') {
     box(x,.02,y,1,wallHeight-.02,1,3,theme.crate);
     for(const offset of [.06,.88]) {
      box(x+offset,.025,y+.012,.06,wallHeight-.005,.976,5,black);
      box(x+.012,.025,y+offset,.976,wallHeight-.005,.06,5,black);
     }
     box(x,.14,y,1,.15,1,4,hazard);
    } else if(style==='subway') {
     box(x+.06,.02,y+.06,.88,.52,.88,1,[.44,.47,.45]);
     box(x+.12,.54,y+.12,.76,.34,.76,1,[.38,.42,.40]);
     box(x+.18,.88,y+.18,.64,.30,.64,3,[.25,.34,.24]);
     box(x+.26,.52,y+.02,.48,.06,.06,5,steel);
    } else if(style==='tunnel') {
     box(x+.04,.02,y+.04,.62,.38,.58,1,[.33,.32,.28]);
     box(x+.30,.02,y+.20,.58,.26,.52,1,[.28,.28,.24]);
     box(x+.14,.24,y+.10,.42,.34,.38,1,[.37,.35,.29]);
     box(x+.58,.02,y+.60,.34,.42,.30,1,[.30,.30,.26]);
    } else if(style==='hospital') {
     box(x+.02,.02,y+.02,.96,1.10,.96,1,[.46,.51,.48]);
     box(x-.02,1.08,y-.02,1.04,.09,1.04,5,[.26,.30,.29]);
     box(x+.10,.34,y+.98,.80,.52,.025,6,[.55,.75,.70]);
     box(x+.40,.78,y+.985,.20,.06,.03,6,[.88,.96,.90]);
     box(x+.46,.66,y+.985,.08,.12,.03,6,[.88,.96,.90]);
    } else if(style==='prison') {
     box(x+.02,.02,y+.10,.96,.22,.80,1,[.40,.42,.40]);
     box(x+.14,.24,y+.18,.72,.52,.64,1,[.44,.46,.43]);
     box(x+.14,.76,y+.18,.72,.16,.64,4,hazard);
    } else {
     box(x,.02,y,1,wallHeight-.02,1,3,theme.crate);
     box(x,.13,y,1,.13,1,4,hazard);
    }
    continue;
   }
   if(tile==='T') {
    box(x,0,y,1,wallHeight,1,2,theme.train,TOP|tileSides(x,y,wallHeight));
    const exposed=tileSides(x,y,2.81);
    for(const [side,bx,bz,bw,bd] of [[WEST,x-.014,y,.019,1],[EAST,x+.995,y,.019,1],[NORTH,x,y-.014,1,.019],[SOUTH,x,y+.995,1,.019]]) {
     if(exposed&side) box(bx,1.42,bz,bw,.58,bd,5,[.10,.14,.15]);
    }
    for(const [side,bx,bz,bw,bd] of [[WEST,x-.016,y,.022,1],[EAST,x+.994,y,.022,1],[NORTH,x,y-.016,1,.022],[SOUTH,x,y+.994,1,.022]]) {
     if(exposed&side) box(bx,2.72,bz,bw,.09,bd,5,steel);
    }
    if((x+y)%3===0) {
     if(!solid(x,y-1)) box(x+.20,.06,y-.012,.60,2.20,.025,5,[.11,.15,.17]);
     if(!solid(x,y+1)) box(x+.20,.06,y+.992,.60,2.20,.025,5,[.11,.15,.17]);
    }
    if((x*7+y)%5===0) box(x+.20,wallHeight,y+.22,.58,.20,.56,2,[.24,.29,.30]);
    continue;
   }
   if(tile==='W') {
    if(style==='hospital') {
     box(x+.04,.02,y+.10,.92,.30,.80,2,[.34,.38,.38]);
     box(x+.06,.32,y+.12,.88,.18,.76,3,[.72,.74,.70]);
     box(x+.06,.50,y+.12,.32,.13,.32,3,[.84,.85,.80]);
     for(const a of [.10,.84]) for(const b of [.16,.76]) box(x+a-.02,0,y+b-.02,.04,.32,.04,5,[.18,.22,.21]);
     box(x+.04,.50,y+.86,.92,.05,.05,5,steel);
    } else if(style==='prison') {
     for(const a of [.10,.84]) for(const b of [.16,.76]) box(x+a-.025,0,y+b-.025,.05,1.28,.05,5,[.20,.24,.24]);
     box(x+.08,.38,y+.12,.84,.12,.76,3,[.55,.57,.52]);
     box(x+.08,1.00,y+.12,.84,.12,.76,3,[.55,.57,.52]);
     box(x+.08,.62,y+.12,.84,.05,.76,2,steel);
    } else if(style==='subway') {
     box(x+.10,.42,y+.12,.80,.10,.76,3,[.44,.35,.24]);
     box(x+.86,.52,y+.20,.06,.40,.60,5,[.30,.34,.33]);
     for(const b of [.20,.74]) box(x+.12,0,y+b-.03,.04,.42,.06,5,black);
    } else {
     box(x,0,y,1,wallHeight,1,3,theme.wood);
     box(x,wallHeight-.10,y,1.004,.10,1.004,5,black);
    }
    continue;
   }
   if(tile==='M') {
    box(x,0,y,1,wallHeight,1,2,theme.metal,TOP|tileSides(x,y,wallHeight));
    box(x,wallHeight-.16,y,1.006,.16,1.006,5,black);
    if(style==='prison') {
     box(x+.04,1.48,y-.012,.92,.52,.024,6,[.24,.33,.36]);
     box(x+.04,1.48,y+.988,.92,.52,.024,6,[.24,.33,.36]);
     box(x-.012,1.48,y+.04,.024,.52,.92,6,[.24,.33,.36]);
     box(x+.988,1.48,y+.04,.024,.52,.92,6,[.24,.33,.36]);
     box(x+.10,2.18,y+.10,.80,.10,.80,5,black);
    } else {
     if(edgeNorth) box(x,wallHeight*.46,y-.016,1,.12,.019,5,hazard);
     if(edgeSouth) box(x,wallHeight*.46,y+.995,1,.12,.020,5,hazard);
    }
    continue;
   }
   if(style==='yard') {
    const container=!out&&(x>=28||y>=23||(x>=14&&y>=10));
    const color=container?metalColors[(Math.floor(x/4)*3+Math.floor(y/3))%metalColors.length]:[.39+rand()*.065,.43+rand()*.047,.45+rand()*.04];
    box(x,0,y,1,wallHeight,1,container?2:1,color,TOP|tileSides(x,y,wallHeight));
    if(out) continue;
    if(edgeNorth||edgeSouth||edgeEast||edgeWest) box(x,wallHeight-.15,y,1.006,.153,1.006,5,black);
    const bandH=container?.28:.17,bandY=container?.27:.58,bandMat=container?4:5;
    if(edgeNorth) box(x,bandY,y-.016,1,bandH,.019,bandMat,container?hazard:steel);
    if(edgeSouth) box(x,bandY,y+.995,1,bandH,.020,bandMat,container?hazard:steel);
    if(edgeWest) box(x-.016,bandY,y,.019,bandH,1,bandMat,container?hazard:steel);
    if(edgeEast) box(x+.995,bandY,y,.020,bandH,1,bandMat,container?hazard:steel);
    if(container&&edgeSouth) {
     const frame=[.25,.272,.25],bolt=[.39,.372,.31];
     box(x+.038,.51,y+.999,.039,wallHeight-.65,.036,5,frame);
     box(x+.929,.51,y+.999,.039,wallHeight-.65,.036,5,frame);
     if(x%3===1) {
      box(x+.26,.49,y+1.007,.047,wallHeight-.72,.051,5,frame);
      for(const lift of [.62,1.17,wallHeight-.32]) box(x+.20,lift,y+1.023,.16,.068,.064,5,bolt);
     }
    }
    if(container&&edgeWest) for(const offset of [.09,.91]) {
     box(x-.033,.52,y+offset,.036,wallHeight-.70,.044,5,[.245,.257,.236]);
    }
   } else {
    const color=out?theme.outer:theme.wall;
    box(x,0,y,1,wallHeight,1,1,color,TOP|tileSides(x,y,wallHeight));
    if(out) continue;
    if(edgeNorth||edgeSouth||edgeEast||edgeWest) box(x,wallHeight-.15,y,1.006,.153,1.006,5,black);
    const bandY=wallHeight*.47,bandMat=style==='prison'?4:5,bandColor=style==='prison'?hazard:steel;
    if(edgeNorth) box(x,bandY,y-.016,1,.12,.019,bandMat,bandColor);
    if(edgeSouth) box(x,bandY,y+.995,1,.12,.020,bandMat,bandColor);
    if(edgeWest) box(x-.016,bandY,y,.019,.12,1,bandMat,bandColor);
    if(edgeEast) box(x+.995,bandY,y,.020,.12,1,bandMat,bandColor);
    if(style==='prison'&&(y===9||y===23)) {
     const onSouth=y===9&&edgeSouth,onNorth=y===23&&edgeNorth;
     if(onSouth||onNorth) {
      const zz=onSouth?y+.991:y-.011;
      box(x+.16,1.78,zz,.68,.68,.020,5,[.08,.11,.13]);
      for(const bx of [.24,.41,.58,.75]) box(x+bx,1.80,zz+.002,.035,.64,.025,5,[.33,.39,.42]);
     }
    }
   }
  }
  if(theme.ceiling) buildCeiling(theme.ceiling);
  for(const item of MAP.props) drawProp(item);
  if(style==='yard') {
   for(const x of [17.31,24.63]) {
    box(x,3.17,13.20,.09,.09,3.7,2,[.29,.31,.29]);
    box(x-.03,3.142,15.02,.15,.15,.11,5,[.31,.31,.286]);
   }
   for(const [x,z] of [[16.50,22.18],[26.12,22.16],[31.65,18.02],[13.25,17.30]]) {
    box(x,0,z,.12,.72,.13,4,[.64,.454,.225]);
    box(x-.023,.015,z-.023,.167,.081,.177,5,[.293,.30,.283]);
   }
   for(let y=1.5;y<29;y+=1.65) {
    if(!solid(21,Math.floor(y))) paintLine(21.43,y,.13,.68,[.64,.54,.32]);
    if(!solid(20,Math.floor(y))) paintLine(20.05,y,.035,1.28,[.41,.50,.49]);
   }
  }
  for(const [x,z,w,d,color] of MAP.decor) paintLine(x,z,w,d,color);
  for(const [x,y] of supplies) {
   paintLine(x-.68,y-.68,1.36,.055,[.5,.67,.45]);paintLine(x-.68,y+.63,1.36,.055,[.5,.67,.45]);
   paintLine(x-.68,y-.68,.055,1.36,[.5,.67,.45]);paintLine(x+.63,y-.68,.055,1.36,[.5,.67,.45]);
  }
  for(const [x0,x1,z,title,sub,warm,level] of MAP.signs) gantry(x0,x1,z,title,sub,warm,level);
  for(const s of MAP.wallSigns) signObjects.push({x:s.x,y:s.y,z:s.z,width:s.w,height:s.h,data:makeSign(s.text,s.sub,s.accent)});
  for(const [x,z,y,w] of lights) {
   const clr=w>0?[1,.66,.35]:[.38,.94,1];
   let arm=null;
   for(let dist=1;dist<12&&!arm;dist++) {
    arm=[[dist,0],[-dist,0],[0,dist],[0,-dist]].find(([dx,dz])=>solid(Math.floor(x+dx),Math.floor(z+dz)));
   }
   if(arm) {
    const [dx,dz]=arm;
    box(Math.min(x,x+dx)-.03,y+.36,Math.min(z,z+dz)-.03,Math.abs(dx)+.06,.061,Math.abs(dz)+.06,5,black);
    box(x+dx-.039,0,z+dz-.039,.078,y+.42,.078,5,black);
    box(x-.033,y+.085,z-.033,.066,.33,.066,5,black);
   }
   box(x-.23,y-.01,z-.085,.46,.11,.17,5,black);
   box(x-.18,y-.026,z-.068,.36,.035,.136,6,clr);
   box(x-.14,y+.025,z+.06,.28,.038,.055,6,clr);
  }
  vertexCount=verts.length/10;
  gl.bindBuffer(gl.ARRAY_BUFFER,mesh);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(verts),gl.STATIC_DRAW);
  verts.length=0;
 }
 rebuild();
 const spriteBuffer=gl.createBuffer(), textures=new WeakMap();
 const shadowImage=document.createElement('canvas');shadowImage.width=shadowImage.height=48;
 const shadowCtx=shadowImage.getContext('2d');
 const shadowGradient=shadowCtx.createRadialGradient(24,24,2,24,24,23.5);
 shadowGradient.addColorStop(0,'rgba(4,7,8,.70)');shadowGradient.addColorStop(.39,'rgba(4,7,8,.48)');shadowGradient.addColorStop(1,'rgba(4,7,8,0)');
 shadowCtx.fillStyle=shadowGradient;shadowCtx.fillRect(0,0,48,48);
 const modelExt=gl.getExtension('ANGLE_instanced_arrays');
 let modelProgram=null;
 if(modelExt) {
  const vertex=vertexView+`
   attribute vec3 aCenter,aAxisX,aAxisY,aAxisZ,aTint;
   attribute vec2 aDetails;
   varying vec3 vPosition,vNormal,vTint,vLocal;
   varying vec2 vDetails;
   void main(){
     vec3 shape=aPosition;
     float style=fract(aDetails.x)*8.;
     if(abs(style-1.)<.1||abs(style-4.)<.1) {
       float front=smoothstep(.30,.93,aPosition.z);
       float nose=exp(-pow(aPosition.x*5.3,2.)-pow((aPosition.y+.02)*3.9,2.));
       float sockets=exp(-pow((abs(aPosition.x)-.35)*5.1,2.)-pow((aPosition.y-.20)*4.7,2.));
       shape.z+=front*(.235*nose-.108*sockets);
       shape.x*=mix(.78,1.,smoothstep(-.8,.4,aPosition.y));
     }
     vec3 p=aCenter+shape.x*aAxisX+shape.y*aAxisY+shape.z*aAxisZ;
     vPosition=p;vLocal=aPosition;vTint=aTint;vDetails=aDetails;
     vNormal=normalize(aPosition.x*aAxisX/dot(aAxisX,aAxisX)+aPosition.y*aAxisY/dot(aAxisY,aAxisY)+aPosition.z*aAxisZ/dot(aAxisZ,aAxisZ));
     gl_Position=view(p);
   }`;
  const fragment=`precision highp float;
   varying vec3 vPosition,vNormal,vTint,vLocal;
   varying vec2 vDetails;`+atmosphere+`
   float h(vec3 p){return fract(sin(dot(p,vec3(17.9,53.17,19.31)))*45754.443);}
   float noise(vec3 p){
     vec3 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);
     float a=mix(mix(h(i),h(i+vec3(1,0,0)),f.x),mix(h(i+vec3(0,1,0)),h(i+vec3(1,1,0)),f.x),f.y);
     vec3 j=i+vec3(0,0,1);
     float b=mix(mix(h(j),h(j+vec3(1,0,0)),f.x),mix(h(j+vec3(0,1,0)),h(j+vec3(1,1,0)),f.x),f.y);
     return mix(a,b,f.z);
   }
   void main(){
     vec3 p=vPosition,n=normalize(vNormal),c=vTint,v=normalize(vec3(uCamera.x,uEye,uCamera.y)-p);
     float mat=floor(vDetails.x),shape=fract(vDetails.x)*8.;
     float coarse=noise(vLocal*3.6),fine=h(floor(vLocal*49.));
     if(mat<.5) {
       float weave=sin(vLocal.x*98.)*sin(vLocal.y*119.);
       float fold=sin(vLocal.y*24.+vLocal.x*9.+2.9*coarse);
       c*=.81+.25*coarse+.023*weave+.042*fold+.069*fine;
       if(shape>1.5) {
         float front=smoothstep(.5,.8,vLocal.z);
         float seam=1.-smoothstep(.02,.06,abs(vLocal.x+.015+.012*sin(vLocal.y*7.)));
         float tear=smoothstep(.7,.84,noise(vLocal*7.0))*smoothstep(-.78,.01,-vLocal.y);
         c*=1.-front*(seam*.23+tear*.38);
         c+=front*tear*vec3(.022,.006,.002);
       }
       c=mix(c,vec3(.245,.207,.161)*(.5+coarse),.27*smoothstep(.56,.73,coarse));
     } else if(mat<1.5) {
       c*=.85+coarse*.24+fine*.043;
       c=mix(c,vec3(.309,.223,.169),smoothstep(.58,.83,coarse)*.42);
       float furrow=sin(vLocal.y*42.+vLocal.x*21.+coarse*7.);
       c*=1.-.086*smoothstep(.77,.97,furrow)*smoothstep(.51,.76,coarse);
       if(shape>.7) {
         vec2 q=vLocal.xy; float front=smoothstep(.39,.70,vLocal.z);
         float sockets=exp(-pow((abs(q.x)-.368)*5.0,2.)-pow((q.y-.195)*7.0,2.));
         float cheek=exp(-pow((abs(q.x)-.58)*4.0,2.)-pow((q.y+.14)*3.3,2.));
         float mouth=1.-smoothstep(.65,1.15,length(vec2(q.x*3.5,(q.y+.37+.024*sin(q.x*10.))*(shape>3.5?6.4:11.2))));
         float eyes=1.-smoothstep(.69,1.08,length(vec2((abs(q.x)-.365)*8.1,(q.y-.20+.012*sin(q.x*11.))*19.0)));
         float pupil=1.-smoothstep(.56,1.05,length(vec2((abs(q.x)-.365)*37.,(q.y-.201)*34.)));
         float teeth=mouth*smoothstep(-.41,-.362,q.y)*smoothstep(.1,.46,fract(q.x*20.))*.48;
         c=mix(c,vec3(.106,.081,.061),front*max(mouth*.87,sockets*.66));
         c*=1.-front*cheek*.16;
         c=mix(c,vec3(.61,.597,.472),front*(eyes*(.66-.55*pupil)+teeth));
         float stubble=smoothstep(.58,.86,q.y+.2*coarse-.15*vLocal.z)*smoothstep(.19,.75,vLocal.z*-1.+.31);
         c=mix(c,vec3(.192,.165,.139)*(.68+coarse*.44),stubble*.85);
       }
     } else if(mat>2.5) {
       c*=.77+coarse*.30+fine*.11;
       if(abs(shape-3.)<.1&&vLocal.z>.35) c=mix(c,vec3(.45,.5,.50),.39*smoothstep(.57,.72,vLocal.y)*(1.-smoothstep(.74,.85,vLocal.y)));
     }
     float rim=pow(1.-max(0.,dot(v,n)),3.);
     vec3 lit=c*(illum(p,n)+vec3(.21,.17,.145))+rim*vec3(.018,.029,.028);
     if(mat>.5&&mat<1.5) lit+=pow(max(0.,dot(normalize(vec3(-.46,.79,.38)+v),n)),18.)*.046;
     lit=mix(lit,lit+vec3(.36,.095,.045),vDetails.y);
     gl_FragColor=vec4(fog(lit,p),1.);
   }`;
  try {modelProgram=program(vertex,fragment);} catch(error){console.warn('3D characters unavailable:',error.message);}
 }
 const unitBuffer=gl.createBuffer(),instanceBuffer=gl.createBuffer();
 const unitVertices=[];
 if(modelProgram) {
  const latitude=10,longitude=14;
  function unit(row,col) {
   const a=row/latitude*Math.PI,b=col/longitude*TAU,s=Math.sin(a);
   return [s*Math.cos(b),Math.cos(a),s*Math.sin(b)];
  }
  for(let row=0;row<latitude;row++) for(let col=0;col<longitude;col++) {
   const a=unit(row,col),b=unit(row,col+1),c=unit(row+1,col+1),d=unit(row+1,col);
   if(row>0) unitVertices.push(...a,...b,...d);
   if(row<latitude-1) unitVertices.push(...b,...c,...d);
  }
  gl.bindBuffer(gl.ARRAY_BUFFER,unitBuffer);gl.bufferData(gl.ARRAY_BUFFER,new Float32Array(unitVertices),gl.STATIC_DRAW);
 }
 let instances=new Float32Array(17*1024);
 function drawModels(view,dx,dy,look,items) {
  if(!modelProgram||!items.length) return;
  let count=0;
  for(const item of items) {
   const z=item.actor;
   for(const {center,axes,color,material,shape} of zombiePose(z,view,item.advance)) {
    if((count+1)*17>instances.length) {const grown=new Float32Array(instances.length*2);grown.set(instances);instances=grown;}
    const off=count*17;
    instances.set(center,off);instances.set(axes[0],off+3);instances.set(axes[1],off+6);
    instances.set(axes[2],off+9);instances.set(color,off+12);
    instances[off+15]=material+shape*.125;instances[off+16]=z.dead?0:Math.max(Math.max(0,z.flash)*1.2,z.rage>0?.10:0,z.specialWindup>0?.065:0,z.elite?.22:0,z.type==='bomber'?.12:0);count++;
   }
  }
  sceneUniforms(modelProgram,view,dx,dy,look);
  gl.bindBuffer(gl.ARRAY_BUFFER,unitBuffer);
  const unitIndex=bind(modelProgram,'aPosition',3,12,0);
  gl.bindBuffer(gl.ARRAY_BUFFER,instanceBuffer);
  gl.bufferData(gl.ARRAY_BUFFER,instances.subarray(0,count*17),gl.DYNAMIC_DRAW);
  const att=[['aCenter',3,0],['aAxisX',3,12],['aAxisY',3,24],['aAxisZ',3,36],['aTint',3,48],['aDetails',2,60]]
    .map(([name,size,off])=>bind(modelProgram,name,size,68,off));
  for(const index of att) modelExt.vertexAttribDivisorANGLE(index,1);
  modelExt.drawArraysInstancedANGLE(gl.TRIANGLES,0,unitVertices.length/3,count);
  for(const index of att) {modelExt.vertexAttribDivisorANGLE(index,0);gl.disableVertexAttribArray(index);}
  gl.disableVertexAttribArray(unitIndex);
 }

 const bind=(program,name,size,stride,offset)=>{
  const att=gl.getAttribLocation(program.p,name);gl.enableVertexAttribArray(att);gl.vertexAttribPointer(att,size,gl.FLOAT,false,stride,offset);
  return att;
 };
 function imageTexture(img) {
  if(textures.has(img)) return textures.get(img);
  const texture=gl.createTexture();gl.bindTexture(gl.TEXTURE_2D,texture);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MIN_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_MAG_FILTER,gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_S,gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D,gl.TEXTURE_WRAP_T,gl.CLAMP_TO_EDGE);
  gl.texImage2D(gl.TEXTURE_2D,0,gl.RGBA,gl.RGBA,gl.UNSIGNED_BYTE,img);
  textures.set(img,texture);return texture;
 }
 function billboard(img,x,y,z,w,h,rx,rz,type) {
  const a=x-rx*w*.5,b=z-rz*w*.5,c=x+rx*w*.5,d=z+rz*w*.5,t=y+h;
  gl.bindTexture(gl.TEXTURE_2D,imageTexture(img));
  gl.uniform1f(spritesProgram.uniforms.uType,type);
  gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([a,y,b,0,1,c,y,d,1,1,c,t,d,1,0,a,y,b,0,1,c,t,d,1,0,a,t,b,0,0]),gl.DYNAMIC_DRAW);
  gl.drawArrays(gl.TRIANGLES,0,6);
 }
 function groundShadows(items) {
  if(!items.length) return;
  gl.uniform1f(spritesProgram.uniforms.uType,3);
  gl.bindTexture(gl.TEXTURE_2D,imageTexture(shadowImage));
  gl.enable(gl.BLEND);gl.blendFunc(gl.SRC_ALPHA,gl.ONE_MINUS_SRC_ALPHA);gl.depthMask(false);
  for(const item of items) {
   const x=item.x,z=item.y,r=item.actor.type==='brute'?.41:.34,ground=floorAt(item.x,item.y)+.012;
   gl.bufferData(gl.ARRAY_BUFFER,new Float32Array([x-r,ground,z-r,0,0,x+r,ground,z-r,1,0,x+r,ground,z+r,1,1,x-r,ground,z-r,0,0,x+r,ground,z+r,1,1,x-r,ground,z+r,0,1]),gl.DYNAMIC_DRAW);
   gl.drawArrays(gl.TRIANGLES,0,6);
  }
  gl.depthMask(true);gl.disable(gl.BLEND);
 }
 function prepareLights(view) {
  for(let i=0;i<lights.length;i++) {
   const [x,z]=lights[i];
   lightDistances[i]=(x-view.x)**2+(z-view.y)**2;
  }
  lightOrder.sort((a,b)=>lightDistances[a]-lightDistances[b]||a-b);
  const flicker=MAP.theme.flicker||0,now=frames/60;
  lightFrame.fill(0);playerLight.fill(0);
  for(let slot=0;slot<Math.min(lightOrder.length,12);slot++) {
   const index=lightOrder[slot],lamp=lights[index],px=slot*4;
   lightFrame.set(lamp,px);
   if(flicker>0) {
    const pulse=Math.sin(now*(7.1+index*1.31)+index*2.17)*Math.sin(now*(19.3+index*.73)+index*.91);
    lightFrame[px+3]*=clamp(1+flicker*pulse*1.7,.28,1.45);
   }
   const d2=lightDistances[index];
   if(view!==player||d2>30) continue;
   const [x,z,height]=lamp,d=Math.sqrt(d2),dy=height-1.22;
   if(d>.15&&ray(view.x,view.y,(x-view.x)/d,(z-view.y)/d,(height-eye)/d).dist<d-.12) continue;
   const power=lightFrame[px+3];
   const strength=Math.abs(power)*.45/(1.1+d2*.58+dy*dy*.32);
   playerLight[0]+=strength*(power>0?1.40:.32);
   playerLight[1]+=strength*(power>0?.63:.92);
   playerLight[2]+=strength*(power>0?.26:1.18);
  }
 }
 function sceneUniforms(program,view,dx,dy,look) {
  const u=program.uniforms;
  gl.useProgram(program.p);
  gl.uniform2f(u.uCamera,view.x,view.y);gl.uniform2f(u.uForward,dx,dy);
  gl.uniform2f(u.uScale,focal*2/W.width,focal*2/W.height);
  gl.uniform1f(u.uPitch,look*2);gl.uniform1f(u.uEye,eye);gl.uniform1f(u.uTime,frames/60);
  gl.uniform1f(u.uFlash,muzzle>0?.66:0);
  gl.uniform4fv(u['uLights[0]'],lightFrame);
  gl.uniform3fv(u.uFog,MAP.theme.fog);gl.uniform3fv(u.uAmbient,MAP.theme.ambient);
 }
 let viewPass=null;
 try {viewPass=makeViewPass(gl,program,playerLight);} catch(error) {console.warn('Player viewmodel unavailable:',error.message);}
 function draw(view,dx,dy,look,drawables) {
  prepareLights(view);
  if(canvas.width!==W.width||canvas.height!==W.height) {canvas.width=W.width;canvas.height=W.height;}
  gl.viewport(0,0,W.width,W.height);gl.clearColor(0,0,0,0);gl.clear(gl.COLOR_BUFFER_BIT|gl.DEPTH_BUFFER_BIT);
  gl.enable(gl.DEPTH_TEST);gl.depthFunc(gl.LEQUAL);
  sceneUniforms(scene,view,dx,dy,look);gl.bindBuffer(gl.ARRAY_BUFFER,mesh);
  photoTextures.forEach(({tex,uniform},i)=>{gl.activeTexture(gl.TEXTURE0+i);gl.bindTexture(gl.TEXTURE_2D,tex);gl.uniform1i(uniform,i);});
  gl.activeTexture(gl.TEXTURE0);
  const indices=[bind(scene,'aPosition',3,40,0),bind(scene,'aNormal',3,40,12),bind(scene,'aColor',3,40,24),bind(scene,'aMaterial',1,40,36)];
  gl.drawArrays(gl.TRIANGLES,0,vertexCount);
  indices.forEach(index=>gl.disableVertexAttribArray(index));
  sceneUniforms(spritesProgram,view,dx,dy,look);gl.bindBuffer(gl.ARRAY_BUFFER,spriteBuffer);
  const spr=[bind(spritesProgram,'aPosition',3,20,0),bind(spritesProgram,'aUv',2,20,12)];
  for(const s of signObjects) if(Math.abs(s.z-view.y)<24) {
   const front=view.y>s.z;
   billboard(s.data,s.x,s.y-.65,s.z,s.width,s.height,front?1:-1,0,2);
  }
  const modelItems=[];
  for(const item of drawables) {
   if(item.actor) {
    const x=item.x-view.x,y=item.y-view.y;
    const d=x*dx+y*dy,side=y*dx-x*dy;
    if(d>-.31&&d<34&&Math.abs(side)<Math.max(0,d)*.85+.82) modelItems.push(item);
    continue;
   }
   const wide=item.height*item.img.width/item.img.height;
   billboard(item.img,item.x,item.base??0,item.y,wide,item.height,-dy,dx,item.kind);
  }
  groundShadows(modelItems);
  spr.forEach(index=>gl.disableVertexAttribArray(index));
  drawModels(view,dx,dy,look,modelItems);
  return canvas;
 }
 return {draw,canvas,lights,rebuild,viewPass,hasModels:()=>!!modelProgram&&!gl.isContextLost(),photoCount:()=>loadedPhotos};
}
try {yard3D=makeYardRenderer();} catch(error) {console.warn('WebGL renderer unavailable:',error.message);}

const rainRandom=rng(2117);
const rainDrops=Array.from({length:73},()=>[rainRandom(),rainRandom(),rainRandom(),rainRandom()]);
const dustRandom=rng(3301);
const dustMotes=Array.from({length:46},()=>[dustRandom(),dustRandom(),dustRandom()]);
const splashRandom=rng(4407);
const splashRings=Array.from({length:22},()=>[splashRandom(),splashRandom(),splashRandom()]);
const cloudRandom=rng(621);
const cloudBanks=Array.from({length:14},()=>[cloudRandom(),cloudRandom(),cloudRandom()]);
function yardActors(demo) {
 const out=(demo?previewEnemies:enemies).map(z=>{
  const advance=demo?frames*.023:0;
  if(yard3D.hasModels()) return {x:z.x,y:z.y,actor:z,advance};
  const {canvas}=zombieFrame(z,advance);
  return {x:z.x,y:z.y,height:types[z.type].height,img:canvas,kind:0};
 });
 if(!demo) {
  for(const z of corpses) out.push({x:z.x,y:z.y,actor:z,advance:0});
  for(const n of npcs) out.push({x:n.x,y:n.y,actor:n,advance:0});
 }
 for(let i=0;i<supplies.length;i++) {
  const [x,y]=supplies[i];
  const mapSprites=supplySprites[selectedMap]||supplySprites.yard;
  const usedSprites=usedSupplySprites[selectedMap]||usedSupplySprites.yard;
  out.push({x,y,height:.59,base:floorAt(x,y),img:!demo&&used[i]===supplyWave()?usedSprites:mapSprites,kind:1});
 }
 if(!demo) out.push(...warningDrawables(enemies),...acidDrawables());
 return out;
}
function paintSky(view,look) {
 const w=W.width,h=W.height,mid=h*(.5+look),theme=MAP.theme;
 const fill=ctx.createLinearGradient(0,0,0,Math.max(1,mid+h*.32));
 fill.addColorStop(0,theme.sky[0]);fill.addColorStop(.43,theme.sky[1]);fill.addColorStop(.81,theme.sky[2]);fill.addColorStop(1,theme.sky[3]);
 ctx.fillStyle=fill;ctx.fillRect(0,0,w,h);
 if(theme.clouds) for(const [left,level,size] of cloudBanks) {
  const x=((left*w*1.8+w*4-view.angle*w*.55)%(w*1.8))-w*.35;
  const y=mid-h*(.095+level*.5),radius=w*(.13+size*.25);
  ctx.save();ctx.translate(x,y);ctx.scale(1,.21);
  const cloud=ctx.createRadialGradient(0,0,0,0,0,radius);
  cloud.addColorStop(0,level>.45?'#28444d84':'#48686e65');cloud.addColorStop(1,'#20333b00');
  ctx.fillStyle=cloud;ctx.fillRect(-radius,-radius,radius*2,radius*2);ctx.restore();
 }
 if(theme.moon) {
  const moonAngle=-1.01,delta=Math.atan2(Math.sin(moonAngle-view.angle),Math.cos(moonAngle-view.angle));
  if(Math.abs(delta)<.70) {
   const x=w*.5+Math.tan(delta)*focal,y=mid-focal*.39/Math.cos(delta),radius=Math.max(w*.020,7);
   const glow=ctx.createRadialGradient(x,y,1,x,y,radius*4.2);
   glow.addColorStop(0,'#a5d5da71');glow.addColorStop(.25,'#9dcbcf41');glow.addColorStop(1,'#8ebdc400');
   ctx.fillStyle=glow;ctx.fillRect(x-radius*5,y-radius*5,radius*10,radius*10);
   ctx.beginPath();ctx.arc(x,y,radius*.40,0,TAU);ctx.fillStyle='#b5d9d0ad';ctx.fill();
  }
 }
}
function paintMelee(w,h) {
 if(meleeFlash<=0) return;
 const a=clamp(meleeFlash*3.2,0,.8),r=Math.min(w,h)*.105;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 ctx.strokeStyle=`rgba(226,244,220,${a})`;ctx.lineWidth=Math.max(4,r*.10);
 ctx.beginPath();ctx.arc(w*.5,h*.53,r,-2.45,-.75);ctx.stroke();
 ctx.strokeStyle=`rgba(255,255,236,${a*.55})`;ctx.lineWidth=Math.max(2,r*.045);
 ctx.beginPath();ctx.arc(w*.5,h*.53,r*1.12,-2.38,-.82);ctx.stroke();
 ctx.restore();
}
function paintDamageDir(view,w,h) {
 if(damageTime<=0) return;
 const rel=damageDir-view.angle,center=rel-Math.PI/2;
 const alpha=clamp(damageTime*1.2,0,1);
 const cx=w*.5,cy=h*.5,r=Math.min(w,h)*.315;
 ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
 ctx.strokeStyle=`rgba(255,72,52,${.52*alpha})`;ctx.lineWidth=Math.max(5,Math.min(w,h)*.009);
 ctx.beginPath();ctx.arc(cx,cy,r,center-.19,center+.19);ctx.stroke();
 ctx.strokeStyle=`rgba(255,150,105,${.17*alpha})`;ctx.lineWidth*=2.8;
 ctx.beginPath();ctx.arc(cx,cy,r,center-.22,center+.22);ctx.stroke();
 ctx.restore();
}
function paintYard() {
 const demo=mode==='menu',view=demo?preview:player,look=demo?.045:pitch;
 if(demo) eye=1.35;
 if(!yard3D||yard3D.canvas.getContext('webgl').isContextLost()) {paintLegacy();return;}
 const dx=Math.cos(view.angle),dy=Math.sin(view.angle),w=W.width,h=W.height;
 paintSky(view,look);
 ctx.drawImage(yard3D.draw(view,dx,dy,look,yardActors(demo)),0,0);
 paintBlood(view,dx,dy,look,w,h);
 const theme=MAP.theme;
 if(effectsOn&&(theme.lightCone||0)>0) {
  ctx.globalCompositeOperation='lighter';
  for(const [x,z,y,color] of yard3D.lights) {
   const wx=x-view.x,wz=z-view.y,forward=wx*dx+wz*dy;
   if(forward<1||forward>22||!visible(view.x,view.y,x,z)) continue;
   const sx=w/2+(wz*dx-wx*dy)*focal/forward;
   const floor=floorAt(x,z);
   const sy=h*(.5+look)+(eye-y)*focal/forward;
   const floorY=h*(.5+look)+(eye-floor)*focal/forward;
   if(sx<-140||sx>w+140) continue;
   const spread=clamp(150/forward,18,110)*theme.lightCone;
   const grad=ctx.createLinearGradient(sx,sy,sx,floorY);
   grad.addColorStop(0,color>0?`rgba(255,186,110,${.105*theme.lightCone})`:`rgba(150,238,255,${.09*theme.lightCone})`);
   grad.addColorStop(1,'rgba(0,0,0,0)');
   ctx.fillStyle=grad;ctx.beginPath();ctx.moveTo(sx,sy);ctx.lineTo(sx-spread,floorY);ctx.lineTo(sx+spread,floorY);ctx.closePath();ctx.fill();
  }
  ctx.globalCompositeOperation='source-over';
 }
 paintObjectiveBeacon(view,dx,dy,look,w,h);
 ctx.globalCompositeOperation='screen';
 for(const [x,z,y,color] of yard3D.lights) {
  const wx=x-view.x,wz=z-view.y,forward=wx*dx+wz*dy;
  if(forward<.7 || forward>24||!visible(view.x,view.y,x,z)) continue;
  const sx=w/2+(wz*dx-wx*dy)*focal/forward,sy=h*(.5+look)+(eye-y)*focal/forward;
  const size=clamp(72/forward,8,50);
  if(sx<-size||sx>w+size||sy<-size||sy>h+size) continue;
  const glow=ctx.createRadialGradient(sx,sy,0,sx,sy,size);
  glow.addColorStop(0,color>0?'#ffc080a9':'#86f8ffaf');
  glow.addColorStop(.28,color>0?'#f394463b':'#45c8d242');
  glow.addColorStop(1,'#00000000');ctx.fillStyle=glow;
  ctx.fillRect(sx-size,sy-size,size*2,size*2);
 }
 if(!demo) {
  ctx.globalCompositeOperation='lighter';
  for(const z of enemies) {
   if(!z.elite||!visible(view.x,view.y,z.x,z.y)) continue;
   const wx=z.x-view.x,wz=z.y-view.y,forward=wx*dx+wz*dy;
   if(forward<.8||forward>24) continue;
   const sx=w/2+(wz*dx-wx*dy)*focal/forward;
   const zFloor=floorAt(z.x,z.y);
   const gy=h*(.5+look)+(eye-zFloor)*focal/forward;
   const size=clamp((z.boss?84:58)/forward,9,z.boss?54:42);
   const glow=ctx.createRadialGradient(sx,gy,0,sx,gy,size);
   glow.addColorStop(0,z.boss?'rgba(255,96,66,.50)':'rgba(255,196,96,.42)');
   glow.addColorStop(.55,z.boss?'rgba(255,72,46,.17)':'rgba(255,150,60,.14)');
   glow.addColorStop(1,'rgba(255,120,40,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.ellipse(sx,gy,size,size*.34,0,0,TAU);ctx.fill();
   ctx.strokeStyle=z.boss?'rgba(255,132,96,.48)':'rgba(255,208,116,.38)';ctx.lineWidth=1.4;ctx.beginPath();ctx.ellipse(sx,gy,size*.72,size*.24,0,0,TAU);ctx.stroke();
   const bodyY=h*(.5+look)+(eye-zFloor-types[z.type].height*.56)*focal/forward;
   const bodyGlow=ctx.createRadialGradient(sx,bodyY,0,sx,bodyY,clamp(64/forward,9,44));
   bodyGlow.addColorStop(0,z.boss?'rgba(255,102,74,.20)':'rgba(255,168,72,.16)');bodyGlow.addColorStop(.6,z.boss?'rgba(255,70,44,.07)':'rgba(255,140,54,.055)');bodyGlow.addColorStop(1,'rgba(255,120,40,0)');
   ctx.fillStyle=bodyGlow;ctx.fillRect(sx-clamp(64/forward,9,44),bodyY-clamp(64/forward,9,44),clamp(128/forward,18,88),clamp(128/forward,18,88));
   const hy=h*(.5+look)+(eye-zFloor-types[z.type].height-.16)*focal/forward;
   const pulse=1.5+Math.sin(frames*.18)*1.2;
   ctx.fillStyle=z.boss?'rgba(255,168,132,.88)':'rgba(255,222,138,.78)';ctx.beginPath();ctx.moveTo(sx,hy-5-pulse);ctx.lineTo(sx+5+pulse,hy);ctx.lineTo(sx,hy+5+pulse);ctx.lineTo(sx-5-pulse,hy);ctx.closePath();ctx.fill();
   ctx.fillStyle='rgba(255,246,190,.95)';ctx.fillRect(sx-1,hy-1,2,2);
   if(forward<18) {
    const fs=clamp(70/forward,7,13);
    ctx.font=`800 ${fs}px ui-monospace,monospace`;ctx.textAlign='center';
    ctx.fillStyle=z.boss?'rgba(255,170,132,.86)':'rgba(255,214,126,.72)';ctx.fillText(z.boss?(z.bossName||'暴君'):'精英',sx,hy-11-fs);
   }
  }
 }
 if(grenadeLive.length||explosions.length) {
  ctx.globalCompositeOperation='lighter';
  for(const g of grenadeLive) {
   if(!visible(view.x,view.y,g.x,g.y)) continue;
   const wx=g.x-view.x,wz=g.y-view.y,forward=wx*dx+wz*dy;
   if(forward<.4||forward>26) continue;
   const sx=w/2+(wz*dx-wx*dy)*focal/forward;
   const sy=h*(.5+look)+(eye-g.z)*focal/forward;
   const r=clamp(9/forward,2.5,9);
   ctx.fillStyle='#111614';ctx.beginPath();ctx.arc(sx,sy,r,0,TAU);ctx.fill();
   ctx.strokeStyle='#8a9a74';ctx.lineWidth=1;ctx.stroke();
   const blink=(Math.sin(frames*.55+g.fuse*9)+1)*.5;
   ctx.fillStyle=`rgba(255,110,60,${.35+blink*.5})`;ctx.beginPath();ctx.arc(sx,sy-r*.2,r*.28,0,TAU);ctx.fill();
  }
  for(const e of explosions) {
   const wx=e.x-view.x,wz=e.y-view.y,forward=wx*dx+wz*dy;
   if(forward<.35||forward>30) continue;
   const sx=w/2+(wz*dx-wx*dy)*focal/forward;
   const eFloor=floorAt(e.x,e.y);
   const gy=h*(.5+look)+(eye-eFloor)*focal/forward;
   const sy=h*(.5+look)+(eye-eFloor-.55)*focal/forward;
   const p=1-e.t/e.max;
   const size=clamp((1.2+p*4.8)*focal/forward,10,w*.45);
   const glow=ctx.createRadialGradient(sx,sy,0,sx,sy,size);
   glow.addColorStop(0,`rgba(255,242,190,${.55*(1-p)})`);
   glow.addColorStop(.25,`rgba(255,168,80,${.42*(1-p)})`);
   glow.addColorStop(.62,`rgba(255,92,40,${.18*(1-p)})`);
   glow.addColorStop(1,'rgba(255,70,30,0)');
   ctx.fillStyle=glow;ctx.beginPath();ctx.arc(sx,sy,size,0,TAU);ctx.fill();
   ctx.strokeStyle=`rgba(255,196,120,${.42*(1-p)})`;ctx.lineWidth=2;
   ctx.beginPath();ctx.ellipse(sx,gy,size*.9,size*.28,0,0,TAU);ctx.stroke();
  }
 }
 ctx.globalCompositeOperation='source-over';
 const weather=MAP.theme.weather;
 if(weather!=='none') {
  ctx.lineWidth=.65;
  const drops=weather==='drip'?rainDrops.slice(0,24):rainDrops;
  for(const [u,v,s,offset] of drops) {
   const x=((u*w+frames*(s+.23)*.58+view.angle*w*.09)%w+w)%w;
   if(weather==='drip') {
    const y=(v*h+frames*(s+.20)*1.7+offset*h)%h;
    ctx.strokeStyle=s>.7?'#a8d4d02e':'#93aaa62a';ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x-.5,y+6+s*9);ctx.stroke();
   } else {
    const y=(v*h+frames*(s+.26)*5.9)%h;
    ctx.strokeStyle=s>.75?'#b7e9e341':'#a3bac621';ctx.beginPath();ctx.moveTo(x,y);
    ctx.lineTo(x-2-s*3,y+4+s*14+offset*3);ctx.stroke();
   }
  }
 }
 const dust=theme.dust||0;
 if(effectsOn&&dust>0) {
  ctx.globalCompositeOperation='lighter';
  const t=frames*.011;
  for(const [u,v,p] of dustMotes) {
   const x=((u*w+Math.sin(t*2.1+p*8.7)*28+view.angle*w*.025)%w+w)%w;
   const y=(v*h+t*16+p*47)%h;
   ctx.fillStyle=`rgba(205,228,220,${.035+dust*.06})`;
   ctx.fillRect(x,y,1.3,1.3);
  }
 }
 if(effectsOn&&weather==='rain') {
  for(const [u,v,p] of splashRings) {
   const phase=(frames*.010+p*3.1)%1;
   const x=((u*w+view.angle*w*.035)%w+w)%w;
   const y=h*(.48+v*.47);
   const r=1.5+phase*8;
   ctx.strokeStyle=`rgba(190,225,232,${(1-phase)*.09})`;
   ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
  }
 } else if(effectsOn&&weather==='drip') {
  for(const [u,v,p] of splashRings.slice(0,10)) {
   const phase=(frames*.006+p*4.3)%1;
   const x=((u*w+view.angle*w*.02)%w+w)%w;
   const y=h*(.52+v*.4);
   const r=1+phase*10;
   ctx.strokeStyle=`rgba(150,205,190,${(1-phase)*.11})`;
   ctx.beginPath();ctx.arc(x,y,r,0,TAU);ctx.stroke();
  }
 }
 if(dust>0||weather==='rain'||weather==='drip') ctx.globalCompositeOperation='source-over';
 if(effectsOn&&theme.lightning) {
  if(frames>nextLightning) {
   lightning=1;nextLightning=frames+900+Math.random()*1300;
   tone(58,.45,'sawtooth',.045,28);
  }
  if(lightning>0) {
   ctx.fillStyle=`rgba(205,230,240,${.10*lightning})`;ctx.fillRect(0,0,w,h);
   lightning=Math.max(0,lightning-.045);
  }
 }
 if(alarm>0) {
  const pulse=alarm*(.045+.035*Math.sin(frames*.55));
  ctx.fillStyle=`rgba(180,32,22,${clamp(pulse,0,.11)})`;ctx.fillRect(0,0,w,h);
 }
 if(theme.grade) {
  ctx.save();ctx.globalCompositeOperation='soft-light';ctx.globalAlpha=.17;
  ctx.fillStyle=theme.grade;ctx.fillRect(0,0,w,h);ctx.restore();
 }
 if(blast>0) {
  ctx.fillStyle=`rgba(255,196,120,${clamp(.16*blast,0,.16)})`;ctx.fillRect(0,0,w,h);
 }
 paintMelee(w,h);
 paintDamageDir(view,w,h);
 const vignette=ctx.createRadialGradient(w*.50,h*.48,Math.min(w,h)*.36,w*.50,h*.48,Math.max(w,h)*.65);
 vignette.addColorStop(0,'#0b161600');vignette.addColorStop(1,'#04121a65');
 ctx.fillStyle=vignette;ctx.fillRect(0,0,w,h);
 if(mode==='play'||mode==='pause') {
  if(yard3D.viewPass) {yard3D.viewPass(currentGun());ctx.drawImage(yard3D.canvas,0,0);}
  else paintGun();
 }
}
function paintLegacy() {
 const demo=mode==='menu', view=demo?preview:player;
 const width=W.width,height=W.height,look=demo?.007:pitch;
 const horizon=height*(.5+look);
 const dx=Math.cos(view.angle),dy=Math.sin(view.angle);
 ctx.fillStyle=sky;ctx.fillRect(0,0,width,height);
 ctx.fillStyle=floor;ctx.fillRect(0,horizon,width,height-horizon);
 ctx.strokeStyle='#b5ab8127';ctx.lineWidth=1;
 for(let i=2;i<=30;i+=.75) {
  const y=horizon+eye*focal/i;
  if(y>height) continue;
  ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(width,y);ctx.stroke();
 }
 const stride=width>790?2:1;
 ctx.imageSmoothingEnabled=false;
 for(let sx=0;sx<width;sx+=stride) {
  const offset=rays[sx];
  const hit=ray(view.x,view.y,dx-dy*offset,dy+dx*offset);
  const d=Math.max(.035,hit.dist);
  for(let i=0;i<stride && sx+i<width;i++) depth[sx+i]=d;
  const wallHeight=coverHeight(hit.gx,hit.gy);
  const tex=hit.kind==='V'?texture.steel:hit.kind==='C'?texture.crate:(hit.gx*13+hit.gy*5)%7<3?texture.steel:texture.brick;
  const bottom=horizon+eye*focal/d;
  const wall=horizon+(eye-wallHeight)*focal/d;
  const u=Math.min(63,Math.floor(hit.u*64));
  ctx.drawImage(tex,u,0,1,64,sx,wall,stride,bottom-wall+.5);
  const shade=clamp(.09+d*.039+(hit.side?.11:0),.12,.78);
  ctx.fillStyle='rgba(12,18,17,'+shade+')';ctx.fillRect(sx,wall,stride,bottom-wall+.5);
  if(hit.kind==='#' && (hit.gx*17+hit.gy*19)%8===0 && hit.u>.36 && hit.u<.64) {
   const lampY=wall+.31*(bottom-wall),lampHeight=Math.max(1,12/d);
   ctx.fillStyle='rgba(255,184,97,'+clamp(.85-d*.025,.2,.9)+')';
   ctx.fillRect(sx,lampY,stride,lampHeight);
   ctx.fillStyle='rgba(255,169,79,.12)';ctx.fillRect(sx,lampY+lampHeight,stride,Math.max(3,90/d));
  }
 }
 const drawables=(demo?previewEnemies:enemies).map(z=>{
  const {canvas}=zombieFrame(z,demo?frames*.018:0);
  return {x:z.x,y:z.y,height:types[z.type].height,img:canvas};
 });
 for(let i=0;i<supplies.length;i++) {
  const [x,y]=supplies[i];drawables.push({x,y,height:.56,img:supplySprites[selectedMap]||supplySprites.yard,dim:!demo&&used[i]===supplyWave()});
 }
 if(!demo) drawables.push(...warningDrawables(enemies),...acidDrawables());
 for(const item of drawables) {
  const x=item.x-view.x,y=item.y-view.y;
  item.z=x*dx+y*dy;item.side=y*dx-x*dy;
 }
 drawables.sort((a,b)=>b.z-a.z);
 for(const item of drawables) {
  if(item.z<.19) continue;
  const h=item.height*focal/item.z, w=h*item.img.width/item.img.height;
  const left=width/2+item.side*focal/item.z-w/2;
  const top=horizon+(eye-(item.base??0))*focal/item.z-h;
  if(left+w<0||left>width) continue;
  ctx.globalAlpha=item.dim?.55:Math.max(.43,1-item.z*.028);
  for(let x=Math.max(0,Math.floor(left));x<Math.min(width,left+w);x+=stride) {
   if(item.z>=depth[x]) continue;
   const u=clamp(Math.floor((x-left)*item.img.width/w),0,item.img.width-1);
   ctx.drawImage(item.img,u,0,1,item.img.height,x,top,stride,h);
  }
 }
 ctx.globalAlpha=1;
 if(demo) {
  const haze=ctx.createRadialGradient(width*.73,horizon,3,width*.73,horizon,width*.47);
  haze.addColorStop(0,'#d89a5a32');haze.addColorStop(1,'#d89a5a00');
  ctx.fillStyle=haze;ctx.fillRect(0,0,width,height);
 }
 if(blast>0) {ctx.fillStyle=`rgba(255,196,120,${clamp(.16*blast,0,.16)})`;ctx.fillRect(0,0,width,height);}
 paintMelee(width,height);
 paintDamageDir(view,width,height);
 if(mode==='play'||mode==='pause') paintGun();
}
function tint(hex,factor) {
 const n=parseInt(hex.slice(1),16);
 const r=clamp(Math.round(((n>>16)&255)*factor),0,255);
 const g=clamp(Math.round(((n>>8)&255)*factor),0,255);
 const b=clamp(Math.round((n&255)*factor),0,255);
 return `rgb(${r},${g},${b})`;
}
function paintGun() {
 const height=W.height,width=W.width,scale=Math.min(width,height*1.52)/540;
 const item=currentGun(),skin=skinOf(item.id),up=upgradesOf(item.id),kind=item.kind;
 ctx.save();
 ctx.translate(width*.61+Math.sin(step*.5)*3,height+Math.abs(Math.cos(step))*4+recoil*height*.61+Math.sin(Math.PI*reloadTime/item.reload)*height*.32);
 ctx.scale(scale,scale);
 const body=ctx.createLinearGradient(-30,-120,38,-30);
 body.addColorStop(0,tint(skin.body,1.35));body.addColorStop(.36,skin.body);body.addColorStop(1,tint(skin.body,.48));
 const metal=ctx.createLinearGradient(-31,-127,35,-48);
 metal.addColorStop(0,tint(skin.metal,1.22));metal.addColorStop(.35,skin.metal);
 metal.addColorStop(.75,tint(skin.metal,.72));metal.addColorStop(1,tint(skin.metal,1.08));
 const dark=tint(skin.body,.32),accent=skin.accent;
 polygon(ctx,[-43,10,-59,-39,-38,-75,0,-66,53,-11,71,16],dark);
 polygon(ctx,[76,20,39,-22,30,-61,61,-76,101,-39,174,15],tint(skin.body,.83));
 if(kind==='pistol') {
  polygon(ctx,[-41,-88,-45,-113,-28,-122,18,-97,41,-75,40,-56,22,-48,-8,-69],body);
  polygon(ctx,[-44,-112,-27,-121,19,-95,42,-75,29,-70,0,-91],metal);
  polygon(ctx,[5,-70,28,-61,20,-28,-1,-24,-12,-42],dark);
  polygon(ctx,[-35,-118,-31,-125,-25,-125,-23,-116],tint(skin.body,.55));
  polygon(ctx,[17,-94,19,-101,26,-96,26,-89],accent);
 } else if(kind==='smg') {
  polygon(ctx,[-52,-72,-60,-106,-44,-128,10,-102,40,-72,37,-50,12,-40,-14,-60],body);
  polygon(ctx,[-59,-100,-48,-121,-30,-121,-12,-102,22,-86,42,-72,28,-68,2,-88],metal);
  polygon(ctx,[5,-68,28,-58,21,-8,-1,-3,-11,-27],dark);
  polygon(ctx,[-38,-44,-25,-53,-9,-46,-17,-31],tint(skin.body,.62));
  polygon(ctx,[-59,-108,-51,-117,-45,-115,-42,-105],accent);
  ctx.strokeStyle=tint(skin.metal,.8);ctx.lineWidth=5;
  ctx.beginPath();ctx.moveTo(18,-76);ctx.lineTo(66,-58);ctx.stroke();
 } else if(kind==='shotgun') {
  polygon(ctx,[-48,12,-64,-34,-42,-74,0,-64,54,-8,72,18],dark);
  polygon(ctx,[-56,-76,-66,-118,-44,-132,8,-104,44,-70,40,-48,10,-38,-18,-64],body);
  polygon(ctx,[-62,-104,-54,-124,-30,-121,-4,-104,26,-84,50,-66,36,-62,4,-82],metal);
  polygon(ctx,[-74,-128,-84,-158,-71,-161,-58,-132],metal);
  polygon(ctx,[-58,-104,-48,-96,-6,-72,-12,-60,-38,-74],tint(skin.body,.7));
  polygon(ctx,[-52,-116,-42,-132,-30,-134,-26,-122],dark);
  for(const x of [-34,-18,-2]) polygon(ctx,[x,-92,x+9,-95,x+6,-76,x-4,-73],accent);
  polygon(ctx,[-68,-152,-62,-132,-52,-136,-57,-154],tint(skin.metal,.9));
 } else {
  const dmr=kind==='dmr';
  polygon(ctx,[-47,-94,-66,-130,-62,-142,-48,-143,-24,-112,-3,-97],dark);
  polygon(ctx,[-61,-143,-49,-146,-21,-115,-30,-112],tint(skin.metal,1.1));
  polygon(ctx,[-65,-102,-51,-126,-34,-123,-2,-106,29,-89,65,-45,57,-17,26,-18,-21,-56],body);
  polygon(ctx,[-61,-104,-51,-123,-34,-120,-4,-104,26,-85,54,-52,40,-53,12,-75,-25,-94],metal);
  polygon(ctx,[-25,-55,6,-41,1,-13,-16,3,-37,-9,-17,-31],dark);
  polygon(ctx,[-47,-110,-40,-116,-39,-126,-33,-125,-30,-110],tint(skin.body,.5));
  polygon(ctx,[-23,-100,-16,-115,5,-106,18,-91,4,-86],tint(skin.body,.7));
  polygon(ctx,[-17,-109,-13,-116,5,-109,11,-101,-2,-100],accent);
  ctx.strokeStyle=tint(skin.metal,.7);ctx.lineWidth=2;
  for(let i=0;i<10;i++) {
   const x=-43+i*4,y=-114+i*2.25;
   ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x-7,y+11);ctx.stroke();
  }
  polygon(ctx,[6,-73,24,-64,38,-46,30,-39,13,-48],dark);
  polygon(ctx,[8,-71,17,-65,23,-58,16,-61],accent);
  polygon(ctx,[-22,-81,-6,-72,12,-55,2,-55,-15,-69],tint(skin.body,.55));
  polygon(ctx,[-14,-91,-8,-98,-1,-94,-3,-88],accent);
  if(dmr) {
   polygon(ctx,[-78,-132,-112,-168,-102,-174,-64,-140],metal);
   polygon(ctx,[-58,-128,-34,-145,-18,-141,-20,-124,-42,-116],dark);
   polygon(ctx,[-34,-139,-16,-137,-14,-130,-32,-130],accent);
   polygon(ctx,[-96,-164,-84,-158,-82,-147,-94,-152],tint(skin.metal,.8));
  }
 }
 if(up.capacity>=2&&kind!=='pistol') {
  polygon(ctx,[2,-52,34,-40,28,6,0,0,-8,-30],tint(skin.body,.58));
  polygon(ctx,[8,-42,26,-36,22,-2,8,2],tint(skin.metal,.55));
 }
 if(up.control>=1) {
  polygon(ctx,[-42,-88,-30,-82,-30,-58,-40,-62],tint(skin.body,.65));
  polygon(ctx,[-36,-78,-32,-75,-33,-62,-37,-65],accent);
 }
 if(up.control>=2&&kind!=='pistol') {
  polygon(ctx,[-42,-126,-16,-139,12,-130,8,-118,-20,-114],dark);
  polygon(ctx,[-38,-127,-16,-135,6,-128,4,-122,-20,-118],tint(skin.metal,.65));
  polygon(ctx,[-34,-126,-18,-132,-2,-126,-4,-122,-20,-121],accent);
 }
 if(up.damage>=2) {
  polygon(ctx,[-74,-144,-62,-150,-58,-136,-70,-132],tint(skin.metal,.9));
 }
 if(up.reload>=2) polygon(ctx,[-20,-100,6,-88,10,-80,-16,-92],accent);
 ctx.globalAlpha=.20;ctx.strokeStyle=accent;ctx.lineWidth=3;
 for(let i=0;i<3;i++) {
  ctx.beginPath();ctx.moveTo(-34+i*20,-96);ctx.lineTo(-20+i*20,-58);ctx.stroke();
 }
 ctx.globalAlpha=1;
 if(muzzle>0) {
  ctx.globalCompositeOperation='lighter';
  const muzzleX=kind==='pistol'?-46:kind==='shotgun'?-92:kind==='smg'?-64:kind==='dmr'?-108:-65;
  const muzzleY=kind==='pistol'?-116:kind==='shotgun'?-158:kind==='smg'?-126:kind==='dmr'?-172:-148;
  const glow=ctx.createRadialGradient(muzzleX,muzzleY,0,muzzleX,muzzleY,kind==='shotgun'?62:48);
  glow.addColorStop(0,'#fff1bccc');glow.addColorStop(.38,'#ff964459');glow.addColorStop(1,'#ff962000');
  ctx.fillStyle=glow;ctx.fillRect(muzzleX-64,muzzleY-64,128,128);
  polygon(ctx,[muzzleX-36,muzzleY-6,muzzleX-17,muzzleY-9,muzzleX-20,muzzleY-25,muzzleX-7,muzzleY-16,muzzleX+9,muzzleY-27,muzzleX+4,muzzleY-11,muzzleX+15,muzzleY-7,muzzleX+5,muzzleY+1,muzzleX+6,muzzleY+11,muzzleX-9,muzzleY+7,muzzleX-25,muzzleY+14,muzzleX-20,muzzleY+2],'#ffb861');
  polygon(ctx,[muzzleX-28,muzzleY-4,muzzleX-13,muzzleY-7,muzzleX-16,muzzleY-16,muzzleX-1,muzzleY-10,muzzleX+7,muzzleY-13,muzzleX+3,muzzleY-1,muzzleX-7,muzzleY+3,muzzleX-19,muzzleY+6],'#fff3c2');
 }
 ctx.restore();
}
function drawMapTerrain(target,detailed) {
 const size=target.canvas.width,scale=size/Math.max(columns,rows),off=(size-rows*scale)/2;
 target.clearRect(0,0,size,size);
 if(detailed) {
  target.fillStyle='#112a2e';target.fillRect(0,0,size,size);
  target.fillStyle='#1b3838';target.fillRect(0,off+ROWS*scale,size,(rows-ROWS)*scale);
  target.fillStyle='#abbfb921';
  for(let i=5;i<Math.max(columns,rows);i+=5) {
   target.fillRect(i*scale,off,1,rows*scale);
   target.fillRect(0,off+i*scale,columns*scale,1);
  }
 }
 for(let y=0;y<rows;y++) for(let x=0;x<columns;x++) {
  const tile=cell(x,y);
  if(tile==='.') continue;
  target.fillStyle=detailed?(tile==='W'||tile==='C'?'#4c6961':'#587780'):'#66735b7d';
  target.fillRect(x*scale,off+y*scale,scale-.6,scale-.6);
 }
 target.fillStyle='#e6b668';
 for(const [lo,hi] of ANNEXES[selectedMap].gates) {
  target.fillRect(lo*scale,off+(ROWS-.4)*scale,(hi-lo+1)*scale,detailed?4:1.6);
 }
}
function drawMapMarkers(target,detailed) {
 const size=target.canvas.width,scale=size/Math.max(columns,rows),off=(size-rows*scale)/2;
 const waveIndex=supplyWave();
 for(let i=0;i<supplies.length;i++) {
  const x=supplies[i][0]*scale,y=off+supplies[i][1]*scale,collected=used[i]===waveIndex;
  if(!detailed) {
   target.fillStyle=collected?'#6b7c52':'#b9d65b';
   target.fillRect(x-1.5,y-1.5,3,3);
   continue;
  }
  target.beginPath();target.moveTo(x,y-5.2);target.lineTo(x+5.2,y);target.lineTo(x,y+5.2);target.lineTo(x-5.2,y);target.closePath();
  if(collected) {target.lineWidth=1.7;target.strokeStyle='#95ad83';target.stroke();}
  else {target.fillStyle='#bfe873';target.fill();}
 }
 if(story) {
  if(story.objective) {
   const mx=story.objective.x*scale,my=off+story.objective.y*scale,pulse=1+Math.sin(frames*.09)*.35;
   target.save();target.translate(mx,my);target.rotate(Math.PI/4);
   target.fillStyle='#d6f56f';const s=(detailed?7:3.8)*pulse;target.fillRect(-s/2,-s/2,s,s);target.restore();
   if(detailed) {target.strokeStyle='#d6f56f';target.lineWidth=1.4;target.beginPath();target.arc(mx,my,11*pulse,0,TAU);target.stroke();}
  }
  for(const n of npcs) {
   target.fillStyle=n.downed?'#ff9c70':'#8fe8c0';
   target.fillRect(n.x*scale-(detailed?2.6:1.8),off+n.y*scale-(detailed?2.6:1.8),detailed?5.2:3.6,detailed?5.2:3.6);
  }
 }
 if(!detailed) for(const z of enemies) {
  if(Math.hypot(z.x-player.x,z.y-player.y)>9) continue;
  target.fillStyle=z.boss?'#ff6a4a':z.elite?'#ffd45e':z.type==='shield'?'#8dafcc':z.type==='spitter'?'#d8ef8a':z.type==='screamer'?'#ee9ca5':'#fb935d';
  const s=z.boss?5.6:z.elite?4.2:2.8;
  target.fillRect(z.x*scale-s/2,off+z.y*scale-s/2,s,s);
  if(z.elite) {target.strokeStyle=z.boss?'#ffd0b8':'#fff0a8';target.lineWidth=1;target.strokeRect(z.x*scale-s/2-.8,off+z.y*scale-s/2-.8,s+1.6,s+1.6);}
 }
 target.save();
 target.translate(player.x*scale,off+player.y*scale);target.rotate(player.angle);
 if(detailed) target.scale(2.25,2.25);
 polygon(target,[5,0,-3,3,-2,0,-3,-3],'#f3f6e5');
 target.restore();
}
function paintRadar() {
 const size=radar.canvas.width;
 if(radarMap!==MAP||radarTerrain.canvas.width!==size) {
  radarMap=MAP;
  radarTerrain.canvas.width=radarTerrain.canvas.height=size;
  drawMapTerrain(radarTerrain,false);
 }
 radar.clearRect(0,0,size,size);
 radar.drawImage(radarTerrain.canvas,0,0);
 drawMapMarkers(radar,false);
}
