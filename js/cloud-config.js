'use strict';
/* 破晓守望 · 云存档配置（ES module，仅被 js/cloud-ui.js 按需导入）
 *
 * 默认全部留空：不加载 Supabase SDK、不发出任何外部请求，游戏完全使用本地存档。
 * 只有项目所有者填入自己的 Supabase Project URL 与以 sb_publishable_ 开头的
 * 公开 key 后，档案窗口才会出现邮箱验证码登录与手动上传/下载。
 *
 * 绝对不要把 service_role / sb_secret_ 密钥写进这个文件：
 * 浏览器里的任何人都能读到它，RLS 也会被 service_role 绕过。
 */

export const CLOUD_UNCONFIGURED_MESSAGE='云存档尚未配置。';

export const CLOUD_CONFIG=Object.freeze({
  // 例：'https://your-project-ref.supabase.co'（必须使用 HTTPS，不要带路径、查询或 #）
  url:'',
  // 例：'sb_publishable_xxx'（只接受 Supabase 的 publishable 公钥）
  publishableKey:''
});

function error(text) {
 return {text};
}
function decodeJwtPayload(part) {
 try {
  if(typeof atob!=='function') return null;
  const normalized=part.replace(/-/g,'+').replace(/_/g,'/');
  const padded=normalized+'==='.slice((normalized.length+3)%4);
  return JSON.parse(atob(padded));
 } catch {return null;}
}
function looksLikeServiceRoleJwt(key) {
 if(!/^eyJ[A-Za-z0-9_-]*\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/.test(key)) return false;
 const payload=decodeJwtPayload(key.split('.')[1]);
 return !!payload&&payload.role==='service_role';
}
function validateProjectUrl(raw) {
 if(typeof raw!=='string'||!raw.trim()) return error('缺少 Supabase 项目 URL');
 const text=raw.trim();
 let parsed=null;
 try {parsed=new URL(text);} catch {return error('项目 URL 不是有效地址');}
 if(parsed.protocol!=='https:') return error('项目 URL 必须使用 HTTPS');
 if(parsed.username||parsed.password) return error('项目 URL 不能包含用户名或密码');
 if(parsed.pathname!=='/'&&parsed.pathname!=='') return error('项目 URL 只能填写项目根地址，不能带路径');
 if(parsed.search||parsed.hash) return error('项目 URL 不能包含查询参数或 # 片段');
 if(!parsed.hostname) return error('项目 URL 缺少主机名');
 return {value:'https://'+parsed.host};
}
function validatePublishableKey(raw) {
 if(typeof raw!=='string'||!raw.trim()) return error('缺少 publishable key');
 const key=raw.trim();
 if(key.length>4096) return error('publishable key 过长');
 if(/\s/.test(key)) return error('publishable key 不能包含空白字符');
 if(/^sb_secret_/i.test(key)||/service_role/i.test(key)||looksLikeServiceRoleJwt(key))
  return error('检测到 secret/service_role 密钥，已拒绝。网页端只能使用公开的 publishable key');
 if(!/^sb_publishable_[A-Za-z0-9_-]+$/.test(key))
  return error('只接受以 sb_publishable_ 开头的公开 key（不接受旧式 anon/service_role JWT）');
 return {value:key};
}

/**
 * 校验配置。返回值：
 *   {state:'unconfigured'|'invalid'|'ready', errors:[], url, publishableKey}
 * 默认两个字段都为空时是 unconfigured，界面只显示“云存档尚未配置”。
 */
export function validateCloudConfig(config=CLOUD_CONFIG) {
 const source=config&&typeof config==='object'?config:{};
 const rawUrl=typeof source.url==='string'?source.url:'';
 const rawKey=typeof source.publishableKey==='string'?source.publishableKey:'';
 if(!rawUrl.trim()&&!rawKey.trim())
  return Object.freeze({state:'unconfigured',errors:[],url:'',publishableKey:''});

 const errors=[];
 const urlResult=validateProjectUrl(rawUrl);
 const keyResult=validatePublishableKey(rawKey);
 if(urlResult.text) errors.push(urlResult.text);
 if(keyResult.text) errors.push(keyResult.text);
 if(errors.length)
  return Object.freeze({state:'invalid',errors,url:'',publishableKey:''});
 return Object.freeze({
  state:'ready',
  errors:[],
  url:urlResult.value,
  publishableKey:keyResult.value
 });
}
