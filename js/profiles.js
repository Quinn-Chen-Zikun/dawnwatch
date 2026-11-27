'use strict';
/* 破晓守望 · 玩家档案：本地多档案、备份导出与全新档案导入。
   备份只包含白名单内的 blackout-* 存档键，不含账号、令牌或身份信息。 */
(() => {
 const P=window.DawnProfiles;
 if(!P) return;

 const BACKUP_FORMAT='dawnwatch-save-backup';
 const BACKUP_VERSION=1;
 const BACKUP_MAX_BYTES=192*1024;
 const BACKUP_MAX_VALUE_BYTES=128*1024;
 const BACKUP_MAX_KEYS=32;
 const MAP_IDS=Object.keys(MAPS);
 const STORY_CHAPTER_MAX=STORY_CHAPTERS.length-1;
 const STORY_PROGRESS_MAX=STORY_CHAPTERS.length;
 const BASE_KEYS=[
  SAVE_KEY,'blackout-best','blackout-mode','blackout-style','blackout-map',
  'blackout-story-chapter','blackout-story-progress',
  'blackout-muted','blackout-sens','blackout-fov','blackout-fx','blackout-vol'
 ];
 const BACKUP_TOP_LEVEL_KEYS=new Set(['format','version','exportedAt','data']);

 function byteSize(text) {
  try {return new TextEncoder().encode(String(text)).byteLength;}
  catch {return String(text).length*2;}
 }
 function setStatus(message,state) {
  const node=$('profileStatus');
  if(!node) return;
  node.textContent=message;
  node.dataset.state=state||'';
 }
 function formatCreatedAt(createdAt) {
  if(!createdAt) return '';
  const date=new Date(createdAt);
  if(Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('zh-CN');
 }
 function isWhitelistedKey(key) {
  if(BASE_KEYS.includes(key)) return true;
  return key.startsWith('blackout-best-')&&MAP_IDS.includes(key.slice('blackout-best-'.length));
 }
 function currentProfileKeys() {
  return [SAVE_KEY,...MAP_IDS.map(id=>'blackout-best-'+id),...BASE_KEYS.filter(key=>key!==SAVE_KEY)];
 }
 function readProfileRaw(profileId,key) {
  return P.readRaw(P.storageKey(profileId,key));
 }

 function validateRange(value,min,max,label) {
  const text=String(value).trim();
  if(!text) return {error:label+'不能为空'};
  const number=Number(text);
  if(!Number.isFinite(number)) return {error:label+'必须是数字'};
  if(number<min||number>max) return {error:label+'超出允许范围（'+min+'–'+max+'）'};
  return {value:String(number)};
 }
 function validateInteger(value,min,max,label) {
  const text=String(value).trim();
  if(!text) return {error:label+'不能为空'};
  const number=Number(text);
  if(!Number.isInteger(number)) return {error:label+'必须是整数'};
  if(number<min||number>max) return {error:label+'超出允许范围（'+min+'–'+max+'）'};
  return {value:String(number)};
 }
 function validateBackupEntry(key,value) {
  if(typeof value!=='string') return {error:key+' 的值必须是字符串'};
  if(byteSize(value)>BACKUP_MAX_VALUE_BYTES)
   return {error:key+' 的内容超过 '+Math.round(BACKUP_MAX_VALUE_BYTES/1024)+' KB 限制'};
  if(key===SAVE_KEY) {
   const armory=parseArmory(value);
   if(!armory) return {error:'军械库存档不是有效 JSON 或结构不符合要求'};
   return {value:JSON.stringify(armory)};
  }
  if(key==='blackout-best'||key.startsWith('blackout-best-'))
   return validateInteger(value,0,100000,'最佳波次');
  if(key==='blackout-mode') {
   if(value!=='standard'&&value!=='endless') return {error:'游戏强度只能是 standard 或 endless'};
   return {value};
  }
  if(key==='blackout-style') {
   if(value!=='survival'&&value!=='story') return {error:'玩法只能是 survival 或 story'};
   return {value};
  }
  if(key==='blackout-map') {
   if(!Object.prototype.hasOwnProperty.call(MAPS,value)) return {error:'战区编号不在白名单内'};
   return {value};
  }
  if(key==='blackout-story-chapter') {
   const result=validateInteger(value,0,STORY_CHAPTER_MAX,'剧情章节');
   if(result.error) return result;
   return {value:result.value};
  }
  if(key==='blackout-story-progress') {
   const result=validateInteger(value,0,STORY_PROGRESS_MAX,'剧情进度');
   if(result.error) return result;
   return {value:result.value};
  }
  if(key==='blackout-muted'||key==='blackout-fx') {
   if(value!=='0'&&value!=='1') return {error:key+' 只能是 0 或 1'};
   return {value};
  }
  if(key==='blackout-sens') return validateRange(value,.5,2,'鼠标灵敏度');
  if(key==='blackout-fov') return validateRange(value,.85,1.15,'视野');
  if(key==='blackout-vol') return validateRange(value,0,1,'音量');
  return {error:'不允许的存档键：'+key};
 }

/* 校验一组“键 -> 字符串值”的普通存档项；本地导入与云端下载共用这一份规则。 */
 function validateEntries(rawEntries) {
  if(!rawEntries||typeof rawEntries!=='object'||Array.isArray(rawEntries))
   throw new Error('存档数据必须是一个对象');
  const keys=Object.keys(rawEntries);
  if(keys.length>BACKUP_MAX_KEYS)
   throw new Error('存档项过多（上限 '+BACKUP_MAX_KEYS+' 项）');
  const entries={};
  for(const key of keys) {
   if(!isWhitelistedKey(key)) throw new Error('不允许的存档键：'+key);
   const result=validateBackupEntry(key,rawEntries[key]);
   if(result.error) throw new Error(result.error);
   entries[key]=result.value;
  }
  if(Object.prototype.hasOwnProperty.call(entries,'blackout-story-chapter')
   &&Object.prototype.hasOwnProperty.call(entries,'blackout-story-progress')
   &&Number(entries['blackout-story-chapter'])>Number(entries['blackout-story-progress']))
   throw new Error('剧情章节不能超过剧情进度');
  return entries;
 }

 function gatherExportData() {
  const entries={},errors=[];
  for(const key of currentProfileKeys()) {
   const raw=readProfileRaw(P.activeProfileId,key);
   if(raw===null) continue;
   const result=validateBackupEntry(key,raw);
   if(result.error) errors.push(result.error);
   else entries[key]=result.value;
  }
  if(errors.length) throw new Error('导出前校验失败：'+errors.join('；'));
  return entries;
 }
 function downloadFileName() {
  const date=new Date(),pad=value=>String(value).padStart(2,'0');
  return 'dawnwatch-save-'+date.getFullYear()+pad(date.getMonth()+1)+pad(date.getDate())
   +'-'+pad(date.getHours())+pad(date.getMinutes())+'.json';
 }
 function exportBackup() {
  if(!P.storageReadable()) {
   setStatus('导出失败：浏览器本地存储不可读（可能被隐私设置禁用）。现有数据没有被清除。','error');
   return;
  }
  try {
   const backup={
    format:BACKUP_FORMAT,
    version:BACKUP_VERSION,
    exportedAt:new Date().toISOString(),
    data:gatherExportData()
   };
   const text=JSON.stringify(backup,null,2);
   if(byteSize(text)>BACKUP_MAX_BYTES)
    throw new Error('当前档案超过 '+Math.round(BACKUP_MAX_BYTES/1024)+' KB 导出上限');
   const blob=new Blob([text],{type:'application/json'});
   const url=URL.createObjectURL(blob);
   const link=document.createElement('a');
   link.href=url;link.download=downloadFileName();
   document.body.appendChild(link);link.click();link.remove();
   setTimeout(()=>URL.revokeObjectURL(url),0);
   setStatus('已导出本地备份（仅含存档键，不含账号、令牌或身份信息）。','ok');
  } catch(error) {
   setStatus('导出失败：'+(error&&error.message?error.message:'未知错误'),'error');
  }
 }

 function readFileText(file) {
  if(typeof file.text==='function') return file.text();
  return new Promise((resolve,reject)=>{
   const reader=new FileReader();
   reader.onload=()=>resolve(String(reader.result||''));
   reader.onerror=()=>reject(reader.error||new Error('读取文件失败'));
   reader.readAsText(file);
  });
 }
 function parseBackup(text) {
  let backup=null;
  try {backup=JSON.parse(text);} catch {throw new Error('文件不是有效的 JSON');}
  if(!backup||typeof backup!=='object'||Array.isArray(backup))
   throw new Error('备份根节点必须是一个对象');
  for(const key of Object.keys(backup))
   if(!BACKUP_TOP_LEVEL_KEYS.has(key)) throw new Error('备份包含未定义字段：'+key);
  if(backup.format!==BACKUP_FORMAT)
   throw new Error('不是《破晓守望》本地备份文件（format 不匹配）');
  if(backup.version!==BACKUP_VERSION)
   throw new Error('不支持的备份版本：'+String(backup.version));
  if('exportedAt' in backup&&typeof backup.exportedAt!=='string')
   throw new Error('exportedAt 字段格式不正确');
  const data=backup.data;
  if(!data||typeof data!=='object'||Array.isArray(data))
   throw new Error('备份缺少 data 对象');
  return validateEntries(data);
 }

 function uniqueProfileId(registry) {
  for(let attempt=0;attempt<8;attempt++) {
   const id=P.newId();
   if(!registry.profiles.some(profile=>profile.id===id)) return id;
  }
  throw new Error('无法生成唯一档案 ID，请重试');
 }
 function freshProfileName(prefix) {
  const date=new Date(),pad=value=>String(value).padStart(2,'0');
  const text=prefix+' '+pad(date.getMonth()+1)+'-'+pad(date.getDate())
   +' '+pad(date.getHours())+':'+pad(date.getMinutes());
  return P.sanitizeName(text)||'导入档案';
 }
 /**
  * 把已经校验的存档项写成全新独立档案。绝不覆盖或删除现有档案。
  * options.name 可指定名称；否则使用 options.prefix + 时间生成。
  * 返回 {id,name}；写入中途失败会回滚本次新建的存储键。
  */
 function createProfileFromEntries(rawEntries,options) {
  const opts=options||{};
  const entries=validateEntries(rawEntries);
  if(!P.storageReadable())
   throw new Error('浏览器本地存储不可读（可能被隐私设置禁用）。现有数据没有被清除');
  const registry=P.loadRegistry();
  if(registry.profiles.length>=P.MAX_PROFILES)
   throw new Error('档案数量已达上限（'+P.MAX_PROFILES+' 个，含默认档案）');
  let profileName='';
  if(opts.name) {
   profileName=P.sanitizeName(String(opts.name));
   if(!profileName) throw new Error('档案名称需为 1–'+P.MAX_PROFILE_NAME+' 个可见字符');
  } else {
   const prefix=P.sanitizeName(String(opts.prefix||'导入档案'))||'导入档案';
   profileName=freshProfileName(prefix);
  }
  const id=uniqueProfileId(registry);
  const written=[];
  try {
   for(const [key,value] of Object.entries(entries)) {
    const storageKey=P.storageKey(id,key);
    if(!P.writeRaw(storageKey,value))
     throw new Error('浏览器存储写入失败（可能空间已满）');
    written.push(storageKey);
   }
   const nextRegistry={version:1,profiles:[...registry.profiles,{
    id,name:profileName,legacy:false,createdAt:Date.now()
   }]};
   if(!P.saveRegistry(nextRegistry)) throw new Error('无法保存档案列表');
  } catch(error) {
   for(const storageKey of written) P.removeRaw(storageKey);
   throw error;
  }
  renderProfiles();
  return {id,name:profileName};
 }
 function importBackupFile(file) {
  if(!file) return;
  if(file.size===0) {setStatus('导入失败：文件为空。','error');return;}
  if(file.size>BACKUP_MAX_BYTES) {
   setStatus('导入失败：文件超过 '+Math.round(BACKUP_MAX_BYTES/1024)+' KB 上限。','error');
   return;
  }
  setStatus('正在校验备份…');
  return readFileText(file).then(text=>{
   if(byteSize(text)>BACKUP_MAX_BYTES)
    throw new Error('文件超过 '+Math.round(BACKUP_MAX_BYTES/1024)+' KB 上限');
   const entries=parseBackup(text);
   const typedName=String($('profileName').value||'').trim();
   const created=createProfileFromEntries(entries,{
    name:typedName,prefix:'导入档案'
   });
   $('profileName').value='';
   setStatus('已导入为全新档案「'+created.name+'」。原档案未被覆盖；点击该档案的「切换」后刷新即可加载。','ok');
  }).catch(error=>{
   setStatus('导入失败：'+(error&&error.message?error.message:'未知错误'),'error');
  });
 }

 function createProfile() {
  const typedName=String($('profileName').value||'').trim();
  if(!typedName) {setStatus('请先输入新档案名称。','error');return;}
  const name=P.sanitizeName(typedName);
  if(!name) {
   setStatus('档案名称需为 1–'+P.MAX_PROFILE_NAME+' 个可见字符。','error');
   return;
  }
  const registry=P.loadRegistry();
  if(registry.profiles.length>=P.MAX_PROFILES) {
   setStatus('档案数量已达上限（'+P.MAX_PROFILES+' 个，含默认档案）。','error');
   return;
  }
  let id='';
  try {id=uniqueProfileId(registry);}
  catch(error) {setStatus('创建失败：'+error.message,'error');return;}
  const nextRegistry={version:1,profiles:[...registry.profiles,{
   id,name,legacy:false,createdAt:Date.now()
  }]};
  if(!P.saveRegistry(nextRegistry)) {
   setStatus('创建失败：无法写入档案列表（浏览器存储不可用或已满）。未改动任何现有存档。','error');
   return;
  }
  if(!P.writeRaw(P.PROFILE_ACTIVE_KEY,id)) {
   renderProfiles();
   setStatus('档案已创建，但无法切换：浏览器存储写入失败。可稍后在列表中重试。','error');
   return;
  }
  setStatus('正在切换到「'+name+'」…');
  location.reload();
 }

 function switchProfile(id) {
  const registry=P.loadRegistry();
  const profile=registry.profiles.find(item=>item.id===id);
  if(!profile) {setStatus('该档案已不存在，请刷新后重试。','error');return;}
  if(id===P.activeProfileId) {setStatus('当前已经是「'+profile.name+'」档案。','ok');return;}
  if(!P.writeRaw(P.PROFILE_ACTIVE_KEY,id)
   ||P.readRaw(P.PROFILE_ACTIVE_KEY)!==id) {
   setStatus('切换失败：无法保存当前档案选择（浏览器存储不可用或已满）。原档案未被修改。','error');
   return;
  }
  setStatus('正在切换到「'+profile.name+'」…');
  location.reload();
 }

 function renderProfiles() {
  const registry=P.loadRegistry();
  const current=$('profileCurrentName');
  if(current) current.textContent=P.activeProfileName+(P.activeProfileLegacy?'（旧存档）':'');
  const badge=$('profileBadge');
  if(badge) badge.textContent='档案 · '+P.activeProfileName;
  const list=$('profileList');
  if(!list) return;
  list.textContent='';
  for(const profile of registry.profiles) {
   const row=document.createElement('div');
   row.className='profileRow'+(profile.id===P.activeProfileId?' active':'');
   const info=document.createElement('div');
   info.className='profileRowInfo';
   const name=document.createElement('strong');
   name.textContent=profile.name;
   info.appendChild(name);
   const meta=document.createElement('small');
   if(profile.id===P.activeProfileId) {
    meta.textContent=profile.legacy?'当前 · 旧存档键（原数据未迁移、未删除）':'当前 · 独立本地存档';
   } else if(profile.legacy) {
    meta.textContent='旧存档键 · 原数据未迁移、未删除';
   } else {
    const created=formatCreatedAt(profile.createdAt);
    meta.textContent='独立本地存档'+(created?' · 创建于 '+created:'');
   }
   info.appendChild(meta);
   row.appendChild(info);
   if(profile.id===P.activeProfileId) {
    const state=document.createElement('span');
    state.className='profileCurrentTag';
    state.textContent='使用中';
    row.appendChild(state);
   } else {
    const button=document.createElement('button');
    button.type='button';
    button.className='subtle profileSwitch';
    button.textContent='切换';
    button.addEventListener('click',()=>switchProfile(profile.id));
    row.appendChild(button);
   }
   list.appendChild(row);
  }
 }

 /* 供 js/cloud-ui.js 复用：同一份白名单校验与“导入为全新档案”逻辑。
    云存档前端不得再复制一套不同的键/值规则。 */
 window.DawnProfileBackup=Object.freeze({
  BACKUP_FORMAT,
  BACKUP_VERSION,
  BACKUP_MAX_BYTES,
  BACKUP_MAX_VALUE_BYTES,
  BACKUP_MAX_KEYS,
  byteSize,
  isWhitelistedKey,
  currentProfileKeys,
  validateEntry:(key,value)=>validateBackupEntry(key,value),
  validateEntries,
  parseBackup,
  gatherExportData,
  createProfileFromEntries
 });

 const openButton=$('openProfiles');
 if(openButton) openButton.addEventListener('click',()=>{
  setStatus('');
  renderProfiles();
  $('profiles').showModal();
 });
 const closeButton=$('closeProfiles');
 if(closeButton) closeButton.addEventListener('click',()=>$('profiles').close());
 const createForm=$('profileCreateForm');
 if(createForm) createForm.addEventListener('submit',event=>{
  event.preventDefault();
  createProfile();
 });
 const exportButton=$('profileExport');
 if(exportButton) exportButton.addEventListener('click',exportBackup);
 const importInput=$('profileImport');
 const importPick=$('profileImportPick');
 if(importPick&&importInput) importPick.addEventListener('click',()=>importInput.click());
 if(importInput) importInput.addEventListener('change',event=>{
  const input=event.target;
  const file=input.files&&input.files[0];
  Promise.resolve(importBackupFile(file)).finally(()=>{input.value='';});
 });
 window.addEventListener('dawnwatch-storage-error',event=>{
  const dialog=$('profiles');
  if(dialog&&dialog.open) setStatus(event.detail&&event.detail.message||'本地存档写入失败。','error');
 });

 renderProfiles();
})();
