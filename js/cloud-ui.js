'use strict';
/* 破晓守望 · 云存档界面（ES module，由 index.html 的模块 script 加载）
 *
 * 默认配置为空时：只显示“云存档尚未配置。”，不加载 SDK、不请求网络，
 * 也不要求输入邮箱。本地档案、导出/导入继续完全可用。
 *
 * 配置有效时：用户必须主动点击发送邮箱验证码 / 验证 / 上传 / 下载。
 * 上传前若云端已有记录，会展示服务端更新时间并要求再次确认覆盖。
 * 下载只会调用 P0 的 DawnProfileBackup.createProfileFromEntries，
 * 生成全新本地档案，绝不覆盖当前或旧档案。
 */
import {
 CLOUD_CONFIG,
 CLOUD_UNCONFIGURED_MESSAGE,
 validateCloudConfig
} from './cloud-config.js';
import {
 CLOUD_DEFAULT_SLOT,
 createClientFromConfig,
 createCloudSaveSync,
 loadSupabaseSdk
} from './cloud-sync.js';

const configState=validateCloudConfig(CLOUD_CONFIG);
const slots={
 section:null,
 status:null,
 tag:null,
 subtitle:null,
 hint:null,
 auth:null,
 signedOut:null,
 signedIn:null,
 email:null,
 sendOtp:null,
 otpRow:null,
 otp:null,
 verifyOtp:null,
 checkSession:null,
 signOut:null,
 upload:null,
 download:null,
 overwrite:null,
 overwriteText:null,
 overwriteConfirm:null,
 overwriteCancel:null
};

let client=null;
let cloudSync=null;
let currentUser=null;
let busy=false;
let pendingOverwrite=null;
let pendingEmail='';

function profileBackup() {
 return typeof window==='object'?window.DawnProfileBackup:null;
}
function displayError(message) {
 const error=new Error(message);
 error.dawnSafe=true;
 error.code='CLOUD_UI';
 return error;
}
function setStatus(message,state) {
 if(!slots.status) return;
 slots.status.textContent=message;
 slots.status.dataset.state=state||'';
}
function setTag(text,state) {
 if(!slots.tag) return;
 slots.tag.hidden=false;
 slots.tag.textContent=text;
 slots.tag.dataset.state=state||'';
}
function hideTag() {
 if(!slots.tag) return;
 slots.tag.hidden=true;
 slots.tag.textContent='';
 slots.tag.dataset.state='';
}
function formatTime(value) {
 if(!value) return '未知时间';
 const date=new Date(value);
 if(Number.isNaN(date.getTime())) return '未知时间';
 try {
  return date.toLocaleString('zh-CN',{
   year:'numeric',month:'2-digit',day:'2-digit',
   hour:'2-digit',minute:'2-digit'
  });
 } catch {return date.toISOString();}
}
function hideOverwrite() {
 pendingOverwrite=null;
 if(slots.overwrite) slots.overwrite.hidden=true;
 if(slots.overwriteText) slots.overwriteText.textContent='';
}
function showOverwrite(updatedAt) {
 pendingOverwrite={updatedAt:typeof updatedAt==='string'?updatedAt:null};
 if(slots.overwriteText)
  slots.overwriteText.textContent='云端已有记录，更新时间：'+formatTime(pendingOverwrite.updatedAt)
   +'。继续上传会覆盖这条云端记录；本地档案不会受到影响。';
 if(slots.overwrite) slots.overwrite.hidden=false;
}
function setUser(user) {
 currentUser=user||null;
 if(slots.signedOut) slots.signedOut.hidden=!!currentUser;
 if(slots.signedIn) slots.signedIn.hidden=!currentUser;
 if(currentUser) {
  setTag('已登录','on');
 } else {
  hideOverwrite();
  if(configState.state==='ready') setTag('待登录','ready');
 }
}
function setBusyUi(disabled) {
 if(!slots.section) return;
 for(const element of slots.section.querySelectorAll('button'))
  element.disabled=disabled;
}
async function run(label,task) {
 if(busy) return;
 busy=true;
 setBusyUi(true);
 try {await task();}
 catch(error) {handleFailure(error,label);}
 finally {
  busy=false;
  setBusyUi(false);
 }
}
function handleFailure(error,label) {
 if(error&&error.code==='CLOUD_AUTH_REQUIRED') {
  setUser(null);
  setStatus('登录状态已失效，请重新登录后再试。','error');
  return;
 }
 setStatus(describeError(error,label),'error');
}
function isNetworkProblem(error) {
 const name=String(error&&error.name||'');
 return name==='TypeError'||name==='AuthRetryableFetchError'
  ||name==='FunctionsFetchError'||name==='FetchError';
}
function describeError(error,label) {
 if(error&&error.dawnSafe&&error.message) return error.message;
 if(isNetworkProblem(error))
  return '无法连接云服务，请检查网络与 Supabase 项目 URL。';
 const code=String(error&&error.code||'').toLowerCase();
 const status=Number(error&&error.status)||0;
 if(label==='send') {
  if(code==='over_email_send_rate_limit'||status===429)
   return '发送验证码过于频繁，请稍后再试。';
  if(code==='signup_disabled') return '该 Supabase 项目未开放邮箱注册。';
  if(code==='email_address_invalid'||status===400||status===422)
   return '邮箱地址无效或不被服务器接受。';
  return '发送验证码失败，请稍后重试。';
 }
 if(label==='verify') {
  if(code==='over_email_send_rate_limit'||status===429)
   return '尝试次数过多，请稍后再试。';
  if(code==='otp_expired'||code==='invalid_credentials'
   ||status===400||status===401||status===403||status===422)
   return '验证码无效或已过期，请重新发送。';
  return '验证失败，请稍后重试。';
 }
 if(label==='session') {
  if(status>=400) return '无法检查登录状态，请稍后重试。';
  if(error&&error.name==='Error'&&error.message) return error.message;
  return '检查登录状态失败，请稍后重试。';
 }
 if(label==='signout') {
  if(status>=400) return '退出登录失败，请稍后重试。';
  return '退出登录失败，请稍后重试。';
 }
 if(label==='upload'||label==='download') {
  if(String(error&&error.code||'')==='23505')
   return '云端刚刚出现了新的记录，未覆盖。请重新点击上传并确认更新时间。';
  if(error&&error.name==='PostgrestError') return '云端存档请求失败。请确认已执行 cloud/save-schema.sql、登录状态有效且网络正常。';
  if(status>=400||/^PGRST/i.test(String(error&&error.code||''))
   ||/^\d{5}$/.test(String(error&&error.code||'')))
   return '云端存档请求失败。请确认已执行 cloud/save-schema.sql、登录状态有效且网络正常。';
  if(error&&error.name==='Error'&&error.message) return error.message;
  return label==='upload'?'上传失败，请稍后重试。':'下载失败，请稍后重试。';
 }
 return '操作失败，请稍后重试。';
}

function readEmail() {
 const email=String(slots.email&&slots.email.value||'').trim();
 if(!email) throw displayError('请输入邮箱地址。');
 if(email.length>254||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))
  throw displayError('邮箱格式不正确。');
 return email;
}
async function ensureSync() {
 if(configState.state!=='ready') throw displayError(CLOUD_UNCONFIGURED_MESSAGE);
 const backup=profileBackup();
 if(!backup||typeof backup.validateEntries!=='function')
  throw displayError('本地档案校验模块不可用，无法连接云存档。');
 if(cloudSync) return cloudSync;
 setStatus('正在加载官方 Supabase SDK…');
 await loadSupabaseSdk();
 client=createClientFromConfig(configState);
 cloudSync=createCloudSaveSync({
  client,
  slot:CLOUD_DEFAULT_SLOT,
  validateEntries:backup.validateEntries
 });
 return cloudSync;
}

async function sendOtp() {
 const email=readEmail();
 await ensureSync();
 setStatus('正在发送验证码…');
 const {error}=await client.auth.signInWithOtp({
  email,
  options:{shouldCreateUser:true}
 });
 if(error) throw error;
 if(String(slots.email&&slots.email.value||'').trim()!==email) {
  setStatus('邮箱在发送过程中被修改，请重新发送验证码。','error');
  return;
 }
 pendingEmail=email;
 if(slots.otpRow) slots.otpRow.hidden=false;
 if(slots.otp) {
  slots.otp.value='';
  slots.otp.focus();
 }
 setStatus('验证码已发送，请查收邮箱并输入验证码。若没有收到数字验证码，请把 Supabase 邮件模板改为包含 {{ .Token }}。','ok');
}

async function verifyOtp() {
 if(!pendingEmail) throw displayError('请先点击“发送验证码”。');
 const pending=pendingEmail;
 const token=String(slots.otp&&slots.otp.value||'').trim();
 if(!/^\d{6,10}$/.test(token))
  throw displayError('请输入邮件中的 6–10 位数字验证码。');
 await ensureSync();
 if(pendingEmail!==pending)
  throw displayError('邮箱已修改，请重新发送验证码。');
 setStatus('正在验证验证码…');
 const {error}=await client.auth.verifyOtp({
  email:pending,
  token,
  type:'email'
 });
 if(error) throw error;
 let user=null;
 try {user=await cloudSync.getUser();}
 catch {
  setUser(null);
  throw displayError('验证码已通过，但无法确认登录状态。请点击“检查已有登录状态”重试。');
 }
 pendingEmail='';
 if(slots.otp) slots.otp.value='';
 if(slots.otpRow) slots.otpRow.hidden=true;
 if(slots.email) slots.email.value='';
 setUser(user);
 setStatus('登录成功。可以手动上传当前档案，或从云端下载为全新档案。','ok');
}

async function checkSession() {
 setStatus('正在检查登录状态…');
 const sync=await ensureSync();
 const user=await sync.getUser({required:false});
 if(user) {
  setUser(user);
  setStatus('已恢复登录会话，可以手动上传或下载。','ok');
 } else {
  setUser(null);
  setStatus('没有已保存的登录会话，请发送邮箱验证码。','');
 }
}

async function signOut() {
 setStatus('正在退出登录…');
 await ensureSync();
 const {error}=await client.auth.signOut({scope:'local'});
 if(error) throw error;
 setUser(null);
 pendingEmail='';
 if(slots.otpRow) slots.otpRow.hidden=true;
 if(slots.otp) slots.otp.value='';
 if(slots.email) slots.email.value='';
 setStatus('已退出登录，云操作已停止。本地档案不受影响。','ok');
}

async function pushCurrent(sync,expectedUpdatedAt,{createOnly=false,recheck=false}={}) {
 const backup=profileBackup();
 if(!backup||typeof backup.gatherExportData!=='function')
  throw displayError('本地档案导出模块不可用，无法上传。');
 const entries=backup.gatherExportData();
 if(!entries||!Object.keys(entries).length)
  throw displayError('当前档案没有可上传的存档内容。');
 if(recheck) {
  const remote=await sync.pull();
  if(!remote) {
   hideOverwrite();
   throw displayError('云端记录在上传前已不存在，请重新点击上传。');
  }
  if(remote.updatedAt!==expectedUpdatedAt) {
   hideOverwrite();
   throw displayError('云端记录在上传前发生了更新，已取消。请重新检查并确认。');
  }
 }
 setStatus('正在上传当前档案…');
 const result=await sync.push(entries,{createOnly,expectedUpdatedAt});
 hideOverwrite();
 setStatus('已上传当前档案到账号默认槽。云端更新时间：'+formatTime(result.updatedAt)+'。','ok');
}

async function startUpload() {
 if(!currentUser) throw displayError('请先登录后再上传。');
 const sync=await ensureSync();
 hideOverwrite();
 setStatus('正在检查云端是否已有记录…');
 const remote=await sync.pull();
 if(remote) {
  showOverwrite(remote.updatedAt);
  setStatus('云端已有记录，上传会覆盖它。请核对更新时间后确认。','');
  return;
 }
 await pushCurrent(sync,null,{createOnly:true});
}

async function confirmUpload() {
 if(!currentUser) throw displayError('请先登录后再上传。');
 if(!pendingOverwrite) {
  setStatus('没有待确认的覆盖操作。','');
  return;
 }
 const sync=await ensureSync();
 await pushCurrent(sync,pendingOverwrite.updatedAt,{recheck:true});
}

async function downloadRemote() {
 if(!currentUser) throw displayError('请先登录后再下载。');
 const backup=profileBackup();
 if(!backup||typeof backup.createProfileFromEntries!=='function')
  throw displayError('本地档案导入模块不可用，无法下载。');
 const sync=await ensureSync();
 setStatus('正在下载并校验云端存档…');
 const remote=await sync.pull();
 if(!remote) {
  setStatus('云端还没有这个账号的存档。','error');
  return;
 }
 const created=backup.createProfileFromEntries(remote.entries,{prefix:'云端档案'});
 setStatus('已从云端导入为全新本地档案「'+created.name+'」（云端更新时间：'
  +formatTime(remote.updatedAt)+'）。当前档案与旧档案均未被覆盖；点击新档案的「切换」后刷新即可加载。','ok');
}

function cancelOverwrite() {
 hideOverwrite();
 setStatus('已取消上传；云端记录未被修改。','');
}

function renderUnconfigured() {
 hideTag();
 if(slots.subtitle) slots.subtitle.hidden=true;
 if(slots.auth) slots.auth.hidden=true;
 if(slots.hint) slots.hint.hidden=true;
 hideOverwrite();
 setStatus(CLOUD_UNCONFIGURED_MESSAGE,'');
}
function renderInvalid() {
 setTag('配置无效','error');
 if(slots.subtitle) slots.subtitle.hidden=true;
 if(slots.auth) slots.auth.hidden=true;
 if(slots.hint) slots.hint.hidden=true;
 hideOverwrite();
 setStatus('云存档配置无效：'+configState.errors.join('；'),'error');
}
function renderUnavailable() {
 setTag('不可用','error');
 if(slots.subtitle) slots.subtitle.hidden=true;
 if(slots.auth) slots.auth.hidden=true;
 if(slots.hint) slots.hint.hidden=true;
 hideOverwrite();
 setStatus('云存档界面不可用：本地档案校验模块未加载。','error');
}
function renderReady() {
 setTag('待登录','ready');
 if(slots.subtitle) slots.subtitle.hidden=false;
 if(slots.auth) slots.auth.hidden=false;
 if(slots.signedOut) slots.signedOut.hidden=false;
 if(slots.signedIn) slots.signedIn.hidden=true;
 if(slots.hint) slots.hint.hidden=false;
 hideOverwrite();
 setStatus('云存档已配置，尚未登录。只有你主动操作时才会连接云端。','');
}

function bindEvents() {
 if(slots.sendOtp)
  slots.sendOtp.addEventListener('click',()=>run('send',sendOtp));
 if(slots.verifyOtp)
  slots.verifyOtp.addEventListener('click',()=>run('verify',verifyOtp));
 if(slots.checkSession)
  slots.checkSession.addEventListener('click',()=>run('session',checkSession));
 if(slots.signOut)
  slots.signOut.addEventListener('click',()=>run('signout',signOut));
 if(slots.upload)
  slots.upload.addEventListener('click',()=>run('upload',startUpload));
 if(slots.download)
  slots.download.addEventListener('click',()=>run('download',downloadRemote));
 if(slots.overwriteConfirm)
  slots.overwriteConfirm.addEventListener('click',()=>run('upload',confirmUpload));
 if(slots.overwriteCancel)
  slots.overwriteCancel.addEventListener('click',cancelOverwrite);
 if(slots.email)
  slots.email.addEventListener('input',()=>{
   pendingEmail='';
   if(slots.otpRow) slots.otpRow.hidden=true;
   if(slots.otp) slots.otp.value='';
  });
}

function init() {
 slots.section=document.getElementById('cloudSave');
 slots.status=document.getElementById('cloudStatus');
 slots.tag=document.getElementById('cloudStateTag');
 slots.subtitle=document.getElementById('cloudSubtitle');
 slots.hint=document.getElementById('cloudHint');
 slots.auth=document.getElementById('cloudAuth');
 slots.signedOut=document.getElementById('cloudSignedOut');
 slots.signedIn=document.getElementById('cloudSignedIn');
 slots.email=document.getElementById('cloudEmail');
 slots.sendOtp=document.getElementById('cloudSendOtp');
 slots.otpRow=document.getElementById('cloudOtpRow');
 slots.otp=document.getElementById('cloudOtp');
 slots.verifyOtp=document.getElementById('cloudVerifyOtp');
 slots.checkSession=document.getElementById('cloudCheckSession');
 slots.signOut=document.getElementById('cloudSignOut');
 slots.upload=document.getElementById('cloudUpload');
 slots.download=document.getElementById('cloudDownload');
 slots.overwrite=document.getElementById('cloudOverwrite');
 slots.overwriteText=document.getElementById('cloudOverwriteText');
 slots.overwriteConfirm=document.getElementById('cloudOverwriteConfirm');
 slots.overwriteCancel=document.getElementById('cloudOverwriteCancel');
 if(!slots.section||!slots.status) return;
 bindEvents();
 if(configState.state==='unconfigured') {renderUnconfigured();return;}
 if(configState.state==='invalid') {renderInvalid();return;}
 const backup=profileBackup();
 if(!backup||typeof backup.validateEntries!=='function'
  ||typeof backup.gatherExportData!=='function'
  ||typeof backup.createProfileFromEntries!=='function') {
  renderUnavailable();
  return;
 }
 renderReady();
}

if(document.readyState==='loading')
 document.addEventListener('DOMContentLoaded',init,{once:true});
else init();
