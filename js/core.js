'use strict';
/* 破晓守望 · 核心层：DOM 引用、本地存档与通用数学/射线工具 */
const $ = id => document.getElementById(id);
const W = $('world'), ctx = W.getContext('2d', {alpha:false});
const radar=$('radar').getContext('2d'),overview=$('overview').getContext('2d'),keys=new Set();
const radarTerrain=document.createElement('canvas').getContext('2d');
let radarMap=null;
const mobile = matchMedia('(pointer:coarse)').matches;
$('desktopHelp').hidden = mobile;
$('touchHelp').hidden = !mobile;
const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
function read(key,fallback) { try {return localStorage.getItem(key) || fallback;} catch {return fallback;} }
function save(key,value) { try {localStorage.setItem(key,String(value));} catch {} }
