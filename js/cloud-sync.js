/* 破晓守望 · 云存档客户端适配层（ES module，由 js/cloud-ui.js 导入）
 *
 * 设计边界：
 *   * 本文件不包含任何 Supabase URL、密钥或登录界面，导入时不会发出网络请求。
 *   * 官方 Supabase JS 2.x UMD 包只在用户主动使用云功能时才从同源
 *     vendor/supabase/supabase.js 按需加载；未配置时永远不加载。
 *   * 只使用 publishable key。service_role 密钥绝不能出现在浏览器中。
 *   * 身份只取 client.auth.getUser()，不接受调用方传入 user_id。
 *   * 上传/下载的存档键与值必须交给 P0 的 DawnProfileBackup.validateEntries
 *     校验；本文件只额外负责云端信封（format/version/data）与 128 KiB 上限。
 *   * 云同步是明确的手动上传/下载，没有自动同步或合并。
 */
import { validateCloudConfig } from './cloud-config.js';

export const CLOUD_SAVE_TABLE='cloud_saves';
export const CLOUD_SAVE_SCHEMA_VERSION=1;
export const CLOUD_SAVE_MAX_BYTES=131072;
export const CLOUD_SAVE_MAX_ENTRIES=32;
export const CLOUD_SAVE_MAX_VALUE_BYTES=131072;
export const CLOUD_SAVE_PAYLOAD_FORMAT='dawnwatch-cloud-save';
export const CLOUD_SAVE_PAYLOAD_VERSION=1;
export const CLOUD_DEFAULT_SLOT='default';
export const CLOUD_SDK_PATH='vendor/supabase/supabase.js';

let sdkPromise=null;

function byteSize(text) {
 try {return new TextEncoder().encode(String(text)).byteLength;}
 catch {return String(text).length*2;}
}
function cloudError(message,code) {
 const error=new Error(message);
 error.dawnSafe=true;
 if(code) error.code=code;
 return error;
}
function validateSlot(slot) {
 if(typeof slot!=='string'||!/^[a-z0-9][a-z0-9_-]{0,31}$/.test(slot))
  throw cloudError('云存档槽位格式不正确。','CLOUD_CONFIG');
}
function normalizeSdkPath(path) {
 if(typeof path!=='string'||!path)
  throw cloudError('Supabase SDK 路径为空。','CLOUD_SDK');
 if(/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(path))
  throw cloudError('Supabase SDK 只能从同源相对路径加载。','CLOUD_SDK');
 if(path.includes('\\')||path.includes('?')||path.includes('#'))
  throw cloudError('Supabase SDK 路径不能包含反斜杠、查询参数或 #。','CLOUD_SDK');
 return path;
}

/**
 * 从同源路径按需加载官方 @supabase/supabase-js 2.x UMD 包。
 * 该包应暴露 window.supabase.createClient。未配置时调用方不应调用本函数。
 */
export function loadSupabaseSdk(path=CLOUD_SDK_PATH) {
 if(typeof window==='undefined'||typeof document==='undefined')
  return Promise.reject(cloudError('当前环境不能加载 Supabase SDK。','CLOUD_SDK'));
 if(window.supabase&&typeof window.supabase.createClient==='function')
  return Promise.resolve(window.supabase);
 if(sdkPromise) return sdkPromise;
 const src=normalizeSdkPath(path);
 sdkPromise=new Promise((resolve,reject)=>{
  const script=document.createElement('script');
  script.src=src;
  script.async=true;
  script.dataset.dawnwatchSupabase='1';
  script.onload=()=>{
   if(window.supabase&&typeof window.supabase.createClient==='function') {
    resolve(window.supabase);
    return;
   }
   sdkPromise=null;
   script.remove();
   reject(cloudError('Supabase SDK 已加载，但没有提供 createClient。请使用官方 UMD 包。','CLOUD_SDK'));
  };
  script.onerror=()=>{
   sdkPromise=null;
   script.remove();
   reject(cloudError('无法从同源路径加载 Supabase SDK（'+src+'）。','CLOUD_SDK'));
  };
  document.head.appendChild(script);
 });
 return sdkPromise;
}

/**
 * 使用官方 createClient 创建客户端。会再次执行 validateCloudConfig，
 * 因此即使调用方绕过 UI，secret/service_role 密钥也会被拒绝。
 * detectSessionInUrl 关闭：本项目使用邮箱验证码，不依赖 URL 里的 magic link。
 */
export function createClientFromConfig(config) {
 const validated=validateCloudConfig(config);
 if(validated.state!=='ready')
  throw cloudError('云存档配置无效或未完成，已拒绝创建 Supabase 客户端。','CLOUD_CONFIG');
 if(typeof window==='undefined'||!window.supabase
  ||typeof window.supabase.createClient!=='function')
  throw cloudError('尚未加载官方 Supabase SDK。','CLOUD_SDK');
 try {
  return window.supabase.createClient(validated.url,validated.publishableKey,{
   auth:{
    persistSession:true,
    autoRefreshToken:true,
    detectSessionInUrl:false
   }
  });
 } catch {
  throw cloudError('无法创建 Supabase 客户端，请检查项目 URL 与 publishable key。','CLOUD_CONFIG');
 }
}

function requireEntryValidator(validateEntries) {
 if(typeof validateEntries!=='function')
  throw cloudError('云存档必须复用本地备份校验器（DawnProfileBackup.validateEntries）。','CLOUD_CONFIG');
 return validateEntries;
}

/** 基础结构检查 + 交给 P0 白名单/范围校验，绝不复制另一套存档规则。 */
function normalizeEntries(entries,validateEntries) {
 if(!entries||typeof entries!=='object'||Array.isArray(entries))
  throw cloudError('存档数据必须是一个对象。','CLOUD_VALIDATION');
 const keys=Object.keys(entries);
 if(!keys.length) throw cloudError('没有可上传或导入的存档项。','CLOUD_VALIDATION');
 if(keys.length>CLOUD_SAVE_MAX_ENTRIES)
  throw cloudError('存档项过多（上限 '+CLOUD_SAVE_MAX_ENTRIES+' 项）。','CLOUD_VALIDATION');
 for(const key of keys) {
  if(typeof key!=='string'||!key.startsWith('blackout-'))
   throw cloudError('云端存档键必须以 blackout- 开头。','CLOUD_VALIDATION');
  const value=entries[key];
  if(typeof value!=='string')
   throw cloudError('云端存档值必须是字符串：'+key,'CLOUD_VALIDATION');
  if(byteSize(value)>CLOUD_SAVE_MAX_VALUE_BYTES)
   throw cloudError('单个存档值超过 128 KiB 上限：'+key,'CLOUD_VALIDATION');
 }
 let validated=null;
 try {validated=validateEntries(entries);}
 catch(error) {
  throw cloudError('存档校验失败：'+(error&&error.message?error.message:'未知错误'),'CLOUD_VALIDATION');
 }
 if(!validated||typeof validated!=='object'||Array.isArray(validated))
  throw cloudError('本地校验器没有返回有效存档对象。','CLOUD_VALIDATION');
 const clean={};
 for(const [key,value] of Object.entries(validated)) {
  if(!Object.prototype.hasOwnProperty.call(entries,key)||typeof value!=='string')
   throw cloudError('本地校验器返回了未定义或非字符串的存档项。','CLOUD_VALIDATION');
  clean[key]=value;
 }
 if(!Object.keys(clean).length)
  throw cloudError('没有可上传或导入的存档项。','CLOUD_VALIDATION');
 return clean;
}

/** 严格解析云端 save_data 信封，再复用 P0 校验器。 */
function parseCloudPayload(saveData,validateEntries) {
 if(!saveData||typeof saveData!=='object'||Array.isArray(saveData))
  throw cloudError('云端 save_data 必须是一个对象。','CLOUD_VALIDATION');
 let serialized='';
 try {serialized=JSON.stringify(saveData);}
 catch {throw cloudError('云端 save_data 不是有效 JSON。','CLOUD_VALIDATION');}
 if(byteSize(serialized)>CLOUD_SAVE_MAX_BYTES)
  throw cloudError('云端存档超过 128 KiB 上限。','CLOUD_SIZE');
 for(const key of Object.keys(saveData))
  if(key!=='format'&&key!=='version'&&key!=='data')
   throw cloudError('云端存档包含未定义字段：'+key,'CLOUD_VALIDATION');
 if(saveData.format!==CLOUD_SAVE_PAYLOAD_FORMAT)
  throw cloudError('不是《破晓守望》云存档（format 不匹配）。','CLOUD_VALIDATION');
 if(saveData.version!==CLOUD_SAVE_PAYLOAD_VERSION)
  throw cloudError('不支持的云存档版本：'+String(saveData.version),'CLOUD_VALIDATION');
 if(!saveData.data||typeof saveData.data!=='object'||Array.isArray(saveData.data))
  throw cloudError('云端存档缺少 data 对象。','CLOUD_VALIDATION');
 return normalizeEntries(saveData.data,validateEntries);
}

function sessionMissing(error) {
 if(!error) return false;
 const name=String(error.name||'');
 const code=String(error.code||'').toLowerCase();
 const status=Number(error.status)||0;
 if(name==='AuthSessionMissingError') return true;
 if(code==='session_missing'||code==='session_not_found'
  ||code==='bad_jwt'||code==='refresh_token_not_found') return true;
 return (status===401||status===403)
  &&/session|jwt|token|credential|auth/i.test(String(error.message||''));
}
function authRequiredError() {
 return cloudError('云同步需要先登录邮箱账号。','CLOUD_AUTH_REQUIRED');
}

/**
 * 创建云同步适配器。
 *   client: 官方 createClient 创建的客户端
 *   slot:   账号内槽位，本前端固定为 default
 *   validateEntries: P0 导出的 window.DawnProfileBackup.validateEntries
 * pull() 返回 null 或 { entries, schemaVersion, updatedAt }。
 * push(entries) 只写入当前 getUser() 用户自己的记录。
 */
export function createCloudSaveSync({client,slot=CLOUD_DEFAULT_SLOT,validateEntries}={}) {
 if(!client||typeof client.from!=='function'||!client.auth
  ||typeof client.auth.getUser!=='function')
  throw cloudError('需要传入使用官方 @supabase/supabase-js 2.x 创建并已登录的客户端。','CLOUD_CONFIG');
 validateSlot(slot);
 requireEntryValidator(validateEntries);

 async function getUser({required=true}={}) {
  let result=null;
  try {result=await client.auth.getUser();}
  catch(error) {
   if(sessionMissing(error)) {
    if(!required) return null;
    throw authRequiredError();
   }
   throw error;
  }
  const {data,error}=result||{};
  if(error) {
   if(sessionMissing(error)) {
    if(!required) return null;
    throw authRequiredError();
   }
   throw error;
  }
  if(!data||!data.user) {
   if(!required) return null;
   throw authRequiredError();
  }
  return data.user;
 }
 async function requireUser() {
  return getUser({required:true});
 }

 async function pull() {
  const user=await requireUser();
  const {data,error}=await client.from(CLOUD_SAVE_TABLE)
   .select('save_data,schema_version,updated_at')
   .eq('user_id',user.id)
   .eq('slot',slot)
   .maybeSingle();
  if(error) throw error;
  if(!data) return null;
  if(data.schema_version!==CLOUD_SAVE_SCHEMA_VERSION)
   throw cloudError('云端存档版本不受支持：'+String(data.schema_version),'CLOUD_VERSION');
  const entries=parseCloudPayload(data.save_data,validateEntries);
  return {
   entries,
   schemaVersion:data.schema_version,
   updatedAt:typeof data.updated_at==='string'?data.updated_at:null
  };
 }

 async function push(entries,{createOnly=false,expectedUpdatedAt=null}={}) {
  const user=await requireUser();
  const clean=normalizeEntries(entries,validateEntries);
  const payload={
   format:CLOUD_SAVE_PAYLOAD_FORMAT,
   version:CLOUD_SAVE_PAYLOAD_VERSION,
   data:clean
  };
  const serialized=JSON.stringify(payload);
  if(byteSize(serialized)>CLOUD_SAVE_MAX_BYTES)
   throw cloudError('云端存档超过 128 KiB 上限。','CLOUD_SIZE');
  // user_id 只来自 getUser()，不接受调用方传入；RLS 仍会再次强制隔离。
  const row={
   user_id:user.id,
   slot,
   schema_version:CLOUD_SAVE_SCHEMA_VERSION,
   save_data:payload
  };
  // 首次创建用 INSERT；覆盖用服务端原子条件 UPDATE，消除复查与实际上传之间的竞态。
  let request;
  if(createOnly) request=client.from(CLOUD_SAVE_TABLE).insert(row);
  else {
   if(typeof expectedUpdatedAt!=='string'||!expectedUpdatedAt||expectedUpdatedAt.length>80)
    throw cloudError('覆盖前必须确认云端记录的更新时间。','CLOUD_CONFLICT');
   request=client.from(CLOUD_SAVE_TABLE)
    .update({schema_version:CLOUD_SAVE_SCHEMA_VERSION,save_data:payload})
    .eq('user_id',user.id).eq('slot',slot).eq('updated_at',expectedUpdatedAt);
  }
  const {data,error}=await request.select('updated_at').maybeSingle();
  if(error) throw error;
  if(!data||typeof data.updated_at!=='string')
   throw cloudError('云端记录已改变，未覆盖。请重新检查并确认。','CLOUD_CONFLICT');
  return {updatedAt:data.updated_at};
 }

 return Object.freeze({slot,pull,push,getUser});
}
