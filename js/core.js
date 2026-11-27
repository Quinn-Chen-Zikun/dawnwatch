'use strict';
/* 破晓守望 · 核心层：DOM 引用、玩家档案命名空间、本地存档与通用数学/射线工具 */
const $ = id => document.getElementById(id);
const W = $('world'), ctx = W.getContext('2d', {alpha:false});
const radar=$('radar').getContext('2d'),overview=$('overview').getContext('2d'),keys=new Set();
const radarTerrain=document.createElement('canvas').getContext('2d');
let radarMap=null;
const mobile = matchMedia('(pointer:coarse)').matches;
$('desktopHelp').hidden = mobile;
$('touchHelp').hidden = !mobile;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));

/* ------------------------------------------------------------
   玩家档案 / 存储命名空间
   - 默认档案（default）继续读写原有 blackout-* 键，旧存档完全保留。
   - 新档案统一读写 blackout-profile-<安全随机 ID>-blackout-*，
     军费、已购内容、剧情、最佳波次与设置都不会互相共享。
   - 档案注册表和“当前档案”键本身不参与命名空间映射。
   ------------------------------------------------------------ */
const DEFAULT_PROFILE_ID='default';
const PROFILE_REGISTRY_KEY='blackout-profiles-v1';
const PROFILE_ACTIVE_KEY='blackout-active-profile-v1';
const PROFILE_ID_PATTERN=/^[a-f0-9]{16,32}$/;
const PROFILE_KEY_PREFIX='blackout-profile-';
const MAX_PROFILES=12;
const MAX_PROFILE_NAME=24;

function readStorageRaw(key) {
 try {return localStorage.getItem(key);} catch {return null;}
}
function writeStorageRaw(key,value) {
 try {localStorage.setItem(key,String(value));return true;} catch {return false;}
}
function removeStorageRaw(key) {
 try {localStorage.removeItem(key);return true;} catch {return false;}
}
function storageReadable() {
 try {localStorage.getItem(PROFILE_REGISTRY_KEY);return true;} catch {return false;}
}
function sanitizeProfileName(value) {
 if(typeof value!=='string') return '';
 const name=value.trim().replace(/\s+/g,' ');
 if(!name||name.length>MAX_PROFILE_NAME) return '';
 if(/[\u0000-\u001f\u007f]/.test(name)) return '';
 return name;
}
function newProfileId() {
 const cryptoObj=globalThis.crypto;
 if(!cryptoObj||typeof cryptoObj.getRandomValues!=='function')
  throw new Error('当前浏览器不支持安全随机数，无法创建档案。');
 const bytes=new Uint8Array(12);
 cryptoObj.getRandomValues(bytes);
 let id='';
 for(const byte of bytes) id+=byte.toString(16).padStart(2,'0');
 return id;
}
function defaultProfileEntry() {
 return {id:DEFAULT_PROFILE_ID,name:'默认档案',legacy:true,createdAt:null};
}
function parseProfileRegistry(raw) {
 const base=defaultProfileEntry();
 let data=null;
 try {data=JSON.parse(raw||'null');} catch {return {version:1,profiles:[base]};}
 if(!data||typeof data!=='object'||!Array.isArray(data.profiles))
  return {version:1,profiles:[base]};
 const profiles=[base],seen=new Set([base.id]);
 for(const entry of data.profiles) {
  if(!entry||typeof entry!=='object') continue;
  const id=typeof entry.id==='string'?entry.id:'';
  if(!PROFILE_ID_PATTERN.test(id)||seen.has(id)) continue;
  const name=sanitizeProfileName(entry.name);
  if(!name) continue;
  const createdAt=Number(entry.createdAt);
  profiles.push({
   id,name,legacy:false,
   createdAt:Number.isFinite(createdAt)&&createdAt>0?createdAt:null
  });
  seen.add(id);
  if(profiles.length>=MAX_PROFILES) break;
 }
 return {version:1,profiles};
}
function loadProfileRegistry() {
 return parseProfileRegistry(readStorageRaw(PROFILE_REGISTRY_KEY));
}
function saveProfileRegistry(registry) {
 const profiles=(registry&&Array.isArray(registry.profiles)?registry.profiles:[])
  .filter(profile=>profile&&profile.id!==DEFAULT_PROFILE_ID&&PROFILE_ID_PATTERN.test(profile.id))
  .map(profile=>({
   id:profile.id,
   name:sanitizeProfileName(profile.name),
   createdAt:Number(profile.createdAt)||Date.now()
  }))
  .filter(profile=>profile.name)
  .slice(0,MAX_PROFILES-1);
 const payload=JSON.stringify({version:1,profiles});
 return writeStorageRaw(PROFILE_REGISTRY_KEY,payload);
}
function activeProfileIdFor(registry) {
 const stored=readStorageRaw(PROFILE_ACTIVE_KEY);
 return registry.profiles.some(profile=>profile.id===stored)?stored:DEFAULT_PROFILE_ID;
}
const profileRegistry=loadProfileRegistry();
const activeProfile=profileRegistry.profiles.find(profile=>profile.id===activeProfileIdFor(profileRegistry))
 ||profileRegistry.profiles[0]||defaultProfileEntry();
const activeProfileId=activeProfile.id;

function profileStorageKey(profileId,key) {
 if(profileId===DEFAULT_PROFILE_ID) return key;
 return PROFILE_KEY_PREFIX+profileId+'-'+key;
}
function activeStorageKey(key) {
 return profileStorageKey(activeProfileId,key);
}

let storageNoticeTimer=0,lastStorageFailureAt=0;
function notifyStorageFailure(message) {
 const text=message||'本地存档写入失败：浏览器存储不可用或已满。数据不会被自动清除，请先导出备份。';
 try {window.dispatchEvent(new CustomEvent('dawnwatch-storage-error',{detail:{message:text}}));} catch {}
 const now=Date.now();
 if(now-lastStorageFailureAt<4000) return;
 lastStorageFailureAt=now;
 const node=document.getElementById('storageNotice');
 if(node) {
  node.hidden=false;
  node.textContent=text;
  clearTimeout(storageNoticeTimer);
  storageNoticeTimer=setTimeout(()=>{node.hidden=true;},9000);
 }
 try {console.warn('[破晓守望] '+text);} catch {}
}

function read(key,fallback) {
 try {return localStorage.getItem(activeStorageKey(key))||fallback;}
 catch {notifyStorageFailure('本地存档读取失败：浏览器存储不可用。');return fallback;}
}
function save(key,value) {
 try {localStorage.setItem(activeStorageKey(key),String(value));return true;}
 catch {notifyStorageFailure();return false;}
}

window.DawnProfiles=Object.freeze({
 DEFAULT_PROFILE_ID,
 PROFILE_REGISTRY_KEY,
 PROFILE_ACTIVE_KEY,
 MAX_PROFILES,
 MAX_PROFILE_NAME,
 activeProfileId,
 activeProfileName:activeProfile.name,
 activeProfileLegacy:!!activeProfile.legacy,
 sanitizeName:sanitizeProfileName,
 newId:newProfileId,
 loadRegistry:loadProfileRegistry,
 saveRegistry:saveProfileRegistry,
 storageKey:profileStorageKey,
 activeKey:activeStorageKey,
 readRaw:readStorageRaw,
 writeRaw:writeStorageRaw,
 removeRaw:removeStorageRaw,
 storageReadable,
 notifyStorageFailure
});
