'use strict';
/* 破晓守望 · 数据层：战区地图、武器、感染者、剧情章节与军械库数据 */
const COLS=43, ROWS=31, VENDING_HEIGHT=1.97;
const yardBlocks=[
 [2,2,9,3],[12,2,18,3],[24,2,32,4],[35,2,40,3],
 [4,5,5,10],[8,7,13,8],[8,9,8,11],[14,6,17,7],
 [26,6,30,7],[34,6,39,7],[36,9,40,10],[32,10,33,13],
 [2,14,6,15],[9,14,12,15],[13,10,13,13],[13,17,13,20],
 [16,12,17,16],[24,13,25,16],[29,10,30,15],[36,13,40,14],
 [2,19,5,21],[7,19,10,19],[8,21,10,22],[15,22,17,24],
 [24,22,28,23],[30,18,31,20],[34,17,40,18],[36,20,40,21],
 [3,25,6,27],[10,25,13,28],[26,26,29,28],[34,24,40,25],
 [34,27,35,28],[38,27,40,28]
];
const yardCrates=[[3,8],[10,5],[16,9],[20,4],[28,9],[38,5],[6,12],[11,12],
 [3,17],[7,17],[11,17],[28,17],[32,16],[39,16],[19,14],[22,11],[23,18],
 [31,24],[32,26],[6,24],[11,23],[20,22],[18,26],[24,25],[7,28],[24,28],[38,23]];
function yardRows() {
 const grid=Array.from({length:ROWS},(_,y)=>Array.from({length:COLS},(_,x)=>
  x===0||y===0||x===COLS-1||y===ROWS-1?'#':'.'
 ));
 for(const [x0,y0,x1,y1] of yardBlocks) for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) grid[y][x]='#';
 for(const [x,y] of yardCrates) grid[y][x]='C';
 return grid.map(row=>row.join(''));
}
const PROPS={
 yard:[
  {t:'pallet',x:8.5,z:22.4,dir:0},{t:'pallet',x:35.5,z:18.4,dir:1},
  {t:'barrel',x:15.5,z:24.4},{t:'barrel',x:27.5,z:6.6},{t:'barrel',x:37.6,z:22.4},
  {t:'puddle',x:19.4,z:10.4,w:4.2,d:1.1,color:[.075,.115,.125]},
  {t:'puddle',x:25.2,z:24.6,w:3.2,d:1.0,color:[.075,.115,.125]},
  {t:'puddle',x:10.4,z:16.9,w:2.8,d:.9,color:[.075,.115,.125]},
  {t:'crate',x:18.4,z:20.6,s:1.1},{t:'crate',x:29.6,z:12.4,s:1.0},
  {t:'cone',x:22.4,z:19.8},{t:'cone',x:23.6,z:19.8},
  {t:'vent',x:31.5,z:10.2,dir:1,y:2.3}
 ],
 subway:[
  {t:'bench',x:8.5,z:6.62,dir:0},{t:'bench',x:14.5,z:6.62,dir:0},
  {t:'bench',x:26.5,z:6.62,dir:0},{t:'bench',x:32.5,z:6.62,dir:0},
  {t:'bench',x:8.5,z:24.38,dir:0},{t:'bench',x:14.5,z:24.38,dir:0},
  {t:'bench',x:26.5,z:24.38,dir:0},{t:'bench',x:32.5,z:24.38,dir:0},
  {t:'bench',x:21.5,z:6.62,dir:0},
  {t:'bin',x:10.9,z:6.7},{t:'bin',x:30.9,z:6.7},
  {t:'bin',x:10.9,z:24.3},{t:'bin',x:30.9,z:24.3},
  {t:'vending',x:3.6,z:6.72,dir:0,color:[.28,.42,.46]},
  {t:'vending',x:39.4,z:24.28,dir:0,color:[.46,.30,.26]},
  {t:'vending',x:21.5,z:2.5,dir:0,color:[.30,.36,.44]},
  {t:'pipe',x:12,z:5.86,len:11,dir:0,y:3.18,color:[.32,.38,.37]},
  {t:'pipe',x:30,z:5.86,len:11,dir:0,y:3.18,color:[.32,.38,.37]},
  {t:'pipe',x:12,z:25.14,len:11,dir:0,y:3.18,color:[.32,.38,.37]},
  {t:'pipe',x:30,z:25.14,len:11,dir:0,y:3.18,color:[.32,.38,.37]},
  {t:'cable',x:21.5,z:6.08,len:35,dir:0,y:3.72},
  {t:'cable',x:21.5,z:24.92,len:35,dir:0,y:3.72},
  {t:'puddle',x:9.3,z:20.15,w:3.4,d:.7,color:[.07,.115,.12]},
  {t:'puddle',x:20.0,z:11.35,w:4.2,d:.65,color:[.07,.115,.12]},
  {t:'puddle',x:30.8,z:20.2,w:2.8,d:.7,color:[.07,.115,.12]},
  {t:'barrel',x:5.6,z:11.2},{t:'barrel',x:37.4,z:20.8},
  {t:'pallet',x:14.4,z:11.1,dir:0},{t:'pallet',x:26.4,z:20.7,dir:0},
  {t:'door',x:4.5,z:5.0,dir:0},{t:'door',x:38.5,z:5.0,dir:0},
  {t:'door',x:4.5,z:25.0,dir:0},{t:'door',x:38.5,z:25.0,dir:0}
 ],
 tunnel:[
  {t:'pipe',x:21.5,z:14.16,len:40,dir:0,y:2.35,color:[.29,.31,.27]},
  {t:'pipe',x:21.5,z:16.84,len:40,dir:0,y:2.52,color:[.25,.26,.23]},
  {t:'cable',x:21.5,z:14.28,len:40,dir:0,y:3.05},
  {t:'cable',x:21.5,z:16.72,len:40,dir:0,y:3.22},
  {t:'puddle',x:6.2,z:16.2,w:3.0,d:.75,color:[.055,.085,.065]},
  {t:'puddle',x:15.0,z:15.1,w:2.6,d:.7,color:[.055,.085,.065]},
  {t:'puddle',x:24.5,z:16.3,w:3.2,d:.75,color:[.055,.085,.065]},
  {t:'puddle',x:33.0,z:15.2,w:2.8,d:.7,color:[.055,.085,.065]},
  {t:'valve',x:4.0,z:14.2},{t:'valve',x:12.0,z:16.8},
  {t:'valve',x:24.0,z:14.2},{t:'valve',x:34.0,z:16.8},
  {t:'barrel',x:9.4,z:14.45},{t:'barrel',x:27.4,z:16.6},
  {t:'crate',x:6.4,z:7.1,s:1.0},{t:'crate',x:18.4,z:6.9,s:1.0},
  {t:'crate',x:7.4,z:24.0,s:1.0},{t:'crate',x:34.4,z:25.0,s:1.0},
  {t:'locker',x:17.6,z:6.55,dir:0},{t:'locker',x:22.4,z:6.55,dir:0},
  {t:'workbench',x:20.5,z:2.7,dir:0},
  {t:'workbench',x:5.5,z:27.2,dir:0},{t:'workbench',x:33.5,z:23.2,dir:0},
  {t:'vent',x:2.2,z:12.4,dir:1,y:2.1},{t:'vent',x:40.8,z:19.6,dir:1,y:2.1}
 ],
 hospital:[
  {t:'door',x:10.0,z:7.5,dir:0},{t:'door',x:34.0,z:7.5,dir:0},
  {t:'door',x:10.0,z:13.5,dir:0},{t:'door',x:33.0,z:13.5,dir:0},
  {t:'door',x:10.0,z:19.5,dir:0},{t:'door',x:33.0,z:19.5,dir:0},
  {t:'iv',x:4.0,z:3.1},{t:'iv',x:9.0,z:3.1},{t:'iv',x:14.0,z:3.1},
  {t:'iv',x:27.0,z:3.1},{t:'iv',x:32.0,z:3.1},{t:'iv',x:37.0,z:3.1},
  {t:'iv',x:4.0,z:11.1},{t:'iv',x:9.0,z:11.1},{t:'iv',x:14.0,z:11.1},
  {t:'iv',x:27.0,z:11.1},{t:'iv',x:32.0,z:11.1},{t:'iv',x:37.0,z:11.1},
  {t:'iv',x:4.0,z:21.1},{t:'iv',x:9.0,z:21.1},{t:'iv',x:14.0,z:21.1},
  {t:'iv',x:27.0,z:21.1},{t:'iv',x:32.0,z:21.1},{t:'iv',x:37.0,z:21.1},
  {t:'curtain',x:5.5,z:3.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:10.5,z:3.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:15.5,z:3.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:28.5,z:3.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:33.5,z:3.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:38.5,z:3.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:5.5,z:21.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:10.5,z:21.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:15.5,z:21.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:28.5,z:21.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:33.5,z:21.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'curtain',x:38.5,z:21.2,len:2.6,dir:1,color:[.42,.56,.60]},
  {t:'gurney',x:19.5,z:10.4,dir:1},{t:'gurney',x:23.5,z:20.4,dir:1},
  {t:'gurney',x:21.5,z:7.5,dir:0},
  {t:'wheelchair',x:18.5,z:12.4,dir:1},{t:'wheelchair',x:24.5,z:18.5,dir:1},
  {t:'tank',x:4.6,z:4.8},{t:'tank',x:9.6,z:4.8},{t:'tank',x:14.6,z:4.8},
  {t:'tank',x:27.6,z:4.8},{t:'tank',x:32.6,z:4.8},{t:'tank',x:37.6,z:4.8},
  {t:'monitor',x:20.0,z:14.4,dir:1},{t:'monitor',x:23.0,z:14.4,dir:1},
  {t:'blood',x:19.8,z:16.2,w:1.5,d:.8},{t:'blood',x:14.0,z:8.4,w:1.1,d:.5},
  {t:'blood',x:30.2,z:16.1,w:1.3,d:.6},{t:'blood',x:21.4,z:9.1,w:1.4,d:.6},
  {t:'puddle',x:21.2,z:12.4,w:2.2,d:.55,color:[.065,.105,.11]},
  {t:'puddle',x:7.0,z:16.0,w:2.6,d:.6,color:[.065,.105,.11]}
 ],
 prison:[
  {t:'door',x:3.5,z:9.5,dir:0,open:1},{t:'door',x:10.5,z:9.5,dir:0,open:1},
  {t:'door',x:16.5,z:9.5,dir:0,open:1},{t:'door',x:22.5,z:9.5,dir:0,open:1},
  {t:'door',x:28.5,z:9.5,dir:0,open:1},{t:'door',x:34.5,z:9.5,dir:0,open:1},
  {t:'door',x:39.5,z:9.5,dir:0,open:1},
  {t:'door',x:3.5,z:23.5,dir:0,open:1},{t:'door',x:10.5,z:23.5,dir:0,open:1},
  {t:'door',x:16.5,z:23.5,dir:0,open:1},{t:'door',x:22.5,z:23.5,dir:0,open:1},
  {t:'door',x:28.5,z:23.5,dir:0,open:1},{t:'door',x:34.5,z:23.5,dir:0,open:1},
  {t:'door',x:39.5,z:23.5,dir:0,open:1},
  {t:'toilet',x:5.5,z:2.5,dir:1},{t:'toilet',x:11.5,z:2.5,dir:1},
  {t:'toilet',x:17.5,z:2.5,dir:1},{t:'toilet',x:23.5,z:2.5,dir:1},
  {t:'toilet',x:29.5,z:2.5,dir:1},{t:'toilet',x:35.5,z:2.5,dir:1},
  {t:'toilet',x:5.5,z:29.5,dir:1},{t:'toilet',x:11.5,z:29.5,dir:1},
  {t:'toilet',x:17.5,z:29.5,dir:1},{t:'toilet',x:23.5,z:29.5,dir:1},
  {t:'toilet',x:29.5,z:29.5,dir:1},{t:'toilet',x:35.5,z:29.5,dir:1},
  {t:'locker',x:2.5,z:8.4,dir:1},{t:'locker',x:8.5,z:8.4,dir:1},
  {t:'locker',x:14.5,z:8.4,dir:1},{t:'locker',x:20.5,z:8.4,dir:1},
  {t:'locker',x:26.5,z:8.4,dir:1},{t:'locker',x:32.5,z:8.4,dir:1},
  {t:'mast',x:10.5,z:16.0},{t:'mast',x:32.5,z:16.0},
  {t:'hoop',x:14.5,z:19.6,dir:0},{t:'hoop',x:28.5,z:12.4,dir:0},
  {t:'washing',x:2.0,z:13.8,dir:0},{t:'washing',x:3.0,z:13.8,dir:0},{t:'washing',x:4.0,z:13.8,dir:0},
  {t:'workbench',x:40.4,z:14.5,dir:1},{t:'workbench',x:40.4,z:18.0,dir:1},
  {t:'barrel',x:12.5,z:14.5},{t:'barrel',x:29.5,z:17.5},{t:'barrel',x:16.5,z:19.0},
  {t:'pallet',x:24.5,z:13.0,dir:0},{t:'pallet',x:9.5,z:17.5,dir:0},
  {t:'barrier',x:20.5,z:12.2,dir:0},{t:'barrier',x:23.5,z:19.8,dir:0},
  {t:'puddle',x:18.5,z:15.2,w:3.0,d:.8,color:[.055,.085,.105]},
  {t:'puddle',x:26.5,z:18.5,w:2.2,d:.7,color:[.055,.085,.105]}
 ]
};
const WALL_SIGNS={
 yard:[],
 subway:[
  {x:21.5,y:2.7,z:5.83,text:'地铁站',sub:'DAWN LINE  /  L2',w:3.2,h:.8,accent:'#89e8ed'},
  {x:8.5,y:2.35,z:10.18,text:'一号站台',sub:'PLATFORM 1',w:2.4,h:.62,accent:'#89e8ed'},
  {x:34.5,y:2.35,z:10.18,text:'二号站台',sub:'PLATFORM 2',w:2.4,h:.62,accent:'#89e8ed'},
  {x:4.5,y:2.25,z:10.18,text:'← 出口',sub:'EXIT',w:1.6,h:.5,accent:'#8df06a'},
  {x:38.5,y:2.25,z:21.82,text:'换乘通道',sub:'TRANSFER',w:2.0,h:.55,accent:'#89e8ed'}
 ],
 tunnel:[
  {x:8.5,y:2.2,z:13.82,text:'B2 检修通道',sub:'MAINTENANCE',w:2.6,h:.65,accent:'#e9a85f'},
  {x:24.5,y:2.2,z:13.82,text:'排水暗渠',sub:'DRAINAGE →',w:2.4,h:.6,accent:'#89e8ed'},
  {x:6.5,y:2.1,z:18.18,text:'禁止入内',sub:'RESTRICTED',w:2.0,h:.55,accent:'#ff7959'},
  {x:36.5,y:2.1,z:18.18,text:'应急出口',sub:'EMERGENCY EXIT',w:2.2,h:.55,accent:'#8df06a'}
 ],
 hospital:[
  {x:21.5,y:2.75,z:13.8,text:'住院部',sub:'INPATIENT WARD  /  L3',w:3.0,h:.75,accent:'#89e8ed'},
  {x:18.2,y:2.2,z:8.52,text:'西侧病区',sub:'WARD WEST',w:2.2,h:.6,accent:'#89e8ed'},
  {x:24.8,y:2.2,z:8.52,text:'东侧病区',sub:'WARD EAST',w:2.2,h:.6,accent:'#89e8ed'},
  {x:18.2,y:2.2,z:18.2,text:'诊疗区',sub:'CLINIC',w:2.0,h:.55,accent:'#8df06a'},
  {x:21.5,y:2.9,z:1.2,text:'↑ 药房',sub:'PHARMACY',w:1.8,h:.5,accent:'#8df06a'}
 ],
 prison:[
  {x:21.5,y:2.8,z:11.82,text:'中央放风场',sub:'PRISON YARD',w:3.0,h:.75,accent:'#e9a85f'},
  {x:16.5,y:2.2,z:11.82,text:'A 区',sub:'BLOCK A',w:1.6,h:.5,accent:'#89e8ed'},
  {x:26.5,y:2.2,z:11.82,text:'B 区',sub:'BLOCK B',w:1.6,h:.5,accent:'#89e8ed'},
  {x:8.5,y:2.2,z:20.2,text:'洗衣房',sub:'LAUNDRY',w:1.8,h:.5,accent:'#e9a85f'},
  {x:34.5,y:2.2,z:20.2,text:'工场',sub:'WORKSHOP',w:1.8,h:.5,accent:'#e9a85f'}
 ]
};

const MAPS={
 yard:{
  name:'雨夜货运港', code:'SECTOR 07', short:'港口', tagline:'雨夜 · 集装箱码头',
  blurb:'雨夜货运港已失守。穿过集装箱区、维修站和装卸场，守住八波感染者。',
  rows:yardRows(),
  supplies:[[22.5,24.5],[12.5,16.5],[22.5,8.5],[33.5,15.5],[6.5,23.5]],
  spawnPoints:[[2.5,7.5],[7.5,4.5],[19.5,5.5],[33.5,5.5],[40.5,7.5],
   [14.5,11.5],[23.5,11.5],[38.5,12.5],[2.5,16.5],[8.5,16.5],
   [27.5,16.5],[41.5,19.5],[4.5,24.5],[11.5,21.5],[16.5,28.5],
   [24.5,20.5],[33.5,22.5],[41.5,27.5],[6.5,11.5]],
  start:{x:21.5,y:26.5,angle:-Math.PI/2},
  preview:{x:20.55,y:27.75,angle:-1.46},
  previewEnemies:[
   {x:21.92,y:23.32,type:'shield',anim:.6,flash:0},
   {x:23.87,y:22.86,type:'spitter',anim:2.5,flash:0},
   {x:20.7,y:19.82,type:'brute',anim:3,flash:0},
   {x:19.35,y:21.5,type:'screamer',anim:4,flash:0}
  ],
  zones:[
   {name:'南侧闸门',x0:14,y0:24,x1:30,y1:30},
   {name:'集装箱区',x0:31,y0:0,x1:42,y1:30},
   {name:'维修站',x0:0,y0:0,x1:13,y1:14},
   {name:'卸货仓',x0:0,y0:15,x1:13,y1:30},
   {name:'北侧泵站',x0:0,y0:0,x1:30,y1:9},
   {name:'中央装卸区',x0:0,y0:0,x1:42,y1:30}
  ],
  signs:[
   [17.55,24.8,22.58,'中央装卸区','CARGO TRANSFER  /  07',true,3.94],
   [17.55,25.4,13.38,'北侧泵站','PUMP STATION  /  08',false,4.44],
   [31.48,36.32,20.56,'集装箱区','CONTAINER STACK  /  03',false,4.52],
   [5.15,10.65,20.54,'卸货仓','SERVICE BAY  /  02',true,3.98]
  ],
  lights:[[21.6,22.2,2.9,2.7],[22.4,18.9,2.2,-2.1],[20.6,12.5,3.1,-2.4],[20.9,7.5,2.8,2.1],
   [11.5,16.0,2.85,2.3],[7.1,11.3,2.5,-2.2],[34.2,15.8,2.8,2.55],[34.7,22.0,2.95,-2.3],
   [6.4,23.5,2.7,1.9],[33.5,8.7,2.65,-2.6],[23.5,27.8,2.05,2.55],[12.8,5.7,2.7,-2.2]],
  decor:[],
  props:PROPS.yard,wallSigns:WALL_SIGNS.yard,
  theme:{style:'yard',ground:[.255,.274,.274],fog:[.104,.184,.190],ambient:[.34,.44,.47],
   sky:['#07141d','#142731','#354f57','#16252a'],floor:['#635946','#3c3d33','#171b17'],
   weather:'rain',clouds:true,moon:true,wallHeight:3.35,outerHeight:4.6,crateHeight:1.55,
   trainHeight:4.4,woodHeight:1.2,metalHeight:2.55,wall:[.39,.43,.45],outer:[.32,.36,.37],
   crate:[.53,.38,.25],wood:[.53,.40,.27],metal:[.37,.48,.50],train:[.31,.48,.47],
   flicker:.08,dust:.06,lightCone:.5,grade:'#07161c',ambientSound:'rain',lightning:true,alarmWaves:false}
 },
 subway:{
  name:'地铁站',code:'SECTOR 11',short:'地铁',tagline:'停摆列车 · 候车月台',
  blurb:'末班车停在了站台之间。沿两侧月台穿行，借列车和立柱躲避感染者。',
  rows:[
   '###########################################',
   '#........#.......................#........#',
   '#.W....W.#.......................#.W....W.#',
   '#........#.......................#........#',
   '#........#.......................#........#',
   '####.####.........................####.####',
   '#.........................................#',
   '#.........................................#',
   '#.....C.....C.....C.....C.....C.....C.....#',
   '#.........................................#',
   '#.........................................#',
   '#.........................................#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.....TTTTTTTT.TTTTTTT.TTTTTTT.TTTTTTT....#',
   '#.........................................#',
   '#.........................................#',
   '#.....C.....C.....C.....C.....C.....C.....#',
   '#.........................................#',
   '#.........................................#',
   '####.####.........................####.####',
   '#........#.......................#........#',
   '#........#.......................#........#',
   '#.W....W.#.......................#.W....W.#',
   '#........#.......................#........#',
   '###########################################',
  ],
  supplies:[[4.5,2.5],[38.5,2.5],[4.5,28.5],[38.5,28.5],[21.5,8.5]],
  spawnPoints:[[1.5,15.5],[41.5,15.5],[4.5,1.5],[38.5,1.5],[4.5,29.5],[38.5,29.5],
   [2.5,8.5],[40.5,8.5],[2.5,22.5],[40.5,22.5],[14.5,20.5],[30.5,11.5],[22.5,11.5]],
  start:{x:21.5,y:24.5,angle:0},
  preview:{x:9.5,y:23.6,angle:0},
  previewEnemies:[
   {x:15.5,y:22.5,type:'shield',anim:.6,flash:0},
   {x:21.5,y:23.5,type:'spitter',anim:2.4,flash:0},
   {x:27.5,y:22.5,type:'runner',anim:3.2,flash:0},
   {x:33.5,y:23.5,type:'brute',anim:4.1,flash:0}
  ],
  zones:[
   {name:'站厅夹层',x0:0,y0:0,x1:42,y1:5},
   {name:'换乘通道',x0:0,y0:25,x1:42,y1:30},
   {name:'二号站台',x0:0,y0:21,x1:42,y1:24},
   {name:'一号站台',x0:0,y0:6,x1:42,y1:10},
   {name:'停摆列车',x0:0,y0:11,x1:42,y1:20}
  ],
  signs:[
   [5.5,12.5,10.62,'一号站台','PLATFORM 1  /  L2',false,3.98],
   [30.2,37.2,10.62,'二号站台','PLATFORM 2  /  L2',false,3.98],
   [18.0,25.0,20.52,'停摆列车','TRAIN 07  /  STOPPED',true,4.18],
   [2.6,8.4,24.62,'检票大厅','TICKET HALL',true,3.88]
  ],
  lights:[[6.5,9.6,3.05,-2.5],[12.5,9.6,3.05,-2.5],[18.5,9.6,3.05,-2.5],[24.5,9.6,3.05,-2.5],
   [30.5,9.6,3.05,-2.5],[36.5,9.6,3.05,-2.5],[6.5,21.4,3.05,-2.3],[12.5,21.4,3.05,-2.3],
   [18.5,21.4,3.05,-2.3],[24.5,21.4,3.05,2.2],[30.5,21.4,3.05,2.2],[36.5,21.4,3.05,2.2]],
  decor:[[1.5,11.34,40,.14,[.66,.55,.24]],[1.5,20.52,40,.14,[.66,.55,.24]],
   [21.2,6.2,.18,17,[.33,.40,.40]]],
  props:PROPS.subway,wallSigns:WALL_SIGNS.subway,
  theme:{style:'subway',ground:[.225,.245,.245],fog:[.072,.100,.106],ambient:[.31,.37,.38],
   sky:['#090d0f','#131a1d','#222c2e','#0f1517'],floor:['#3b4748','#26302f','#111817'],
   weather:'none',clouds:false,moon:false,wallHeight:4.15,outerHeight:4.6,crateHeight:1.5,
   trainHeight:3.0,woodHeight:1.15,metalHeight:2.6,wall:[.42,.48,.48],outer:[.27,.33,.34],
   crate:[.57,.57,.52],wood:[.43,.36,.27],metal:[.34,.40,.42],train:[.30,.43,.47],
   ceiling:{height:4.15,color:[.27,.32,.32],panel:[.58,.68,.64],beam:[.17,.20,.20]},
   flicker:.24,dust:.30,lightCone:.4,grade:'#06161a',ambientSound:'subway',lightning:false,alarmWaves:true}
 },
 tunnel:{
  name:'地下隧道',code:'SECTOR 03',short:'隧道',tagline:'检修管廊 · 应急照明',
  blurb:'城市地下的检修隧道已经断电。沿着应急灯走，在侧室之间寻找补给。',
  rows:[
   '###########################################',
   '###########################################',
   '################........###################',
   '###.....C.######......W.#######........####',
   '###.......######......C.#######.....W..####',
   '###...C...######.C......#######.C......####',
   '###.......######........#######........####',
   '###.......######........#######.......C####',
   '#####...###########..##########........####',
   '#####...###########..#############..#######',
   '#..##...###########..#############..#######',
   '#..#C...###########..#############..#######',
   '#..##...###########..#############..#######',
   '#..##...###########..#############..#######',
   '#.........................................#',
   '#.........C...............C...........C...#',
   '#.............C...............C...........#',
   '#.........................................#',
   '####...###########...##############...##..#',
   '####...###########...##############...##..#',
   '####...###########...##############...##C.#',
   '####...###########...##############...##..#',
   '####...#########.......########.........###',
   '###......#######....W..########.........###',
   '###.C....#######.C.....########.C.......###',
   '###..W...#######.......########.........###',
   '###......#######.....C.########.........###',
   '###....C.#######.......########.......C.###',
   '###......######################.........###',
   '###########################################',
   '###########################################',
  ],
  supplies:[[6.5,6.5],[20.5,5.5],[35.5,6.5],[5.5,26.5],[19.5,24.5],[36.5,26.5]],
  spawnPoints:[[4.5,3.5],[8.5,6.5],[18.5,3.5],[22.5,6.5],[32.5,4.5],[37.5,7.5],
   [4.5,27.5],[7.5,23.5],[17.5,26.5],[21.5,23.5],[32.5,27.5],[38.5,23.5],
   [1.5,15.5],[41.5,16.5]],
  start:{x:21.5,y:15.5,angle:0},
  preview:{x:21.5,y:16.5,angle:0},
  previewEnemies:[
   {x:24.5,y:15.5,type:'walker',anim:.8,flash:0},
   {x:28.5,y:16.5,type:'runner',anim:2.2,flash:0},
   {x:18.5,y:15.5,type:'spitter',anim:3.4,flash:0},
   {x:12.5,y:16.5,type:'brute',anim:4.3,flash:0}
  ],
  zones:[
   {name:'北侧检修室',x0:0,y0:0,x1:42,y1:13},
   {name:'南侧排水室',x0:0,y0:18,x1:42,y1:30},
   {name:'西段主隧道',x0:0,y0:14,x1:13,y1:17},
   {name:'东段主隧道',x0:31,y0:14,x1:42,y1:17},
   {name:'中央联络段',x0:0,y0:14,x1:42,y1:17}
  ],
  signs:[
   [7.5,15.0,13.36,'主隧道','SERVICE TUNNEL  /  B2',true,3.8],
   [23.5,31.0,13.36,'排水暗渠','DRAINAGE  /  B3',false,3.8],
   [16.0,23.0,21.84,'风机房','AIR SHAFT  /  B2',true,3.6],
   [2.0,8.5,17.5,'西侧检修口','MAINTENANCE',false,3.4]
  ],
  lights:[[5.0,15.0,2.7,2.3],[11.0,16.0,2.7,-2.1],[17.0,15.0,2.7,2.3],[23.0,16.0,2.7,-2.1],
   [29.0,15.0,2.7,2.3],[35.0,16.0,2.7,-2.1],[6.0,5.0,2.6,1.9],[20.0,4.0,2.6,-1.7],
   [35.0,6.0,2.6,1.9],[6.0,26.0,2.6,-1.7],[19.0,24.0,2.6,1.9],[36.0,26.0,2.6,-1.7]],
  decor:[[1.5,17.35,40,.16,[.20,.32,.31]],[1.5,13.68,40,.11,[.40,.33,.16]],
   [3.5,6.4,5,.08,[.22,.30,.29]],[16.5,4.4,6,.08,[.22,.30,.29]]],
  props:PROPS.tunnel,wallSigns:WALL_SIGNS.tunnel,
  theme:{style:'tunnel',ground:[.195,.205,.190],fog:[.055,.072,.058],ambient:[.235,.255,.220],
   sky:['#080a08','#121510','#23251b','#0c0e0b'],floor:['#3b3a2d','#25251c','#10110c'],
   weather:'drip',clouds:false,moon:false,wallHeight:3.65,outerHeight:4.6,crateHeight:1.35,
   trainHeight:4.2,woodHeight:1.1,metalHeight:2.5,wall:[.32,.31,.26],outer:[.24,.24,.20],
   crate:[.40,.35,.26],wood:[.42,.33,.22],metal:[.30,.32,.29],train:[.32,.34,.30],
   ceiling:{height:3.65,color:[.19,.20,.17],panel:[.46,.40,.24],beam:[.15,.16,.14]},
   flicker:.32,dust:.48,lightCone:.3,grade:'#071008',ambientSound:'tunnel',lightning:false,alarmWaves:true}
 },
 hospital:{
  name:'医院',code:'SECTOR 22',short:'医院',tagline:'白炽病房 · 封锁病区',
  blurb:'病区已经封锁，走廊只剩应急灯。穿过病房和护士站，守住每一扇门。',
  rows:[
   '###########################################',
   '#.........................................#',
   '#.################.......################.#',
   '#.#W....W....W...#.......#W....W....W...#.#',
   '#.#W....W....W..W#.......#W....W....W..W#.#',
   '#.#..............#.......#..............#.#',
   '#.#..............#.......#..............#.#',
   '#.#######..#######.......########..######.#',
   '#.........................................#',
   '#.################.......################.#',
   '#.#..............#.......#..............#.#',
   '#.#W....W....W..W#.......#W....W....W..W#.#',
   '#.#..............#.......#..............#.#',
   '#.#######..#######.......#######..#######.#',
   '#.........................................#',
   '#..................CC.CC..................#',
   '#.........................................#',
   '#.........................................#',
   '#.........................................#',
   '#.#######..#######.......#######..#######.#',
   '#.#..............#.......#..............#.#',
   '#.#W....W....W..W#.......#W....W....W..W#.#',
   '#.#..............#.......#..............#.#',
   '#.#..............#.......#..............#.#',
   '#.################.......################.#',
   '#.........................................#',
   '#.........................................#',
   '#.........................................#',
   '#.........................................#',
   '#.........................................#',
   '###########################################',
  ],
  supplies:[[6.5,5.5],[30.5,5.5],[6.5,11.5],[30.5,11.5],[6.5,22.5]],
  spawnPoints:[[4.5,3.5],[16.5,6.5],[27.5,3.5],[39.5,6.5],[3.5,10.5],[16.5,12.5],
   [26.5,10.5],[39.5,12.5],[3.5,20.5],[16.5,23.5],[26.5,20.5],[39.5,23.5],
   [21.5,1.5],[21.5,29.5],[1.5,15.5],[41.5,16.5]],
  start:{x:21.5,y:16.5,angle:0},
  preview:{x:21.5,y:16.5,angle:0},
  previewEnemies:[
   {x:28.5,y:15.5,type:'walker',anim:.7,flash:0},
   {x:32.5,y:16.5,type:'runner',anim:2.1,flash:0},
   {x:25.5,y:14.5,type:'screamer',anim:3.3,flash:0},
   {x:35.5,y:15.5,type:'brute',anim:4.2,flash:0}
  ],
  zones:[
   {name:'西侧住院部',x0:0,y0:0,x1:18,y1:8},
   {name:'东侧住院部',x0:24,y0:0,x1:42,y1:8},
   {name:'西侧诊疗区',x0:0,y0:18,x1:18,y1:30},
   {name:'东侧诊疗区',x0:24,y0:18,x1:42,y1:30},
   {name:'门诊西走廊',x0:0,y0:9,x1:18,y1:17},
   {name:'门诊东走廊',x0:24,y0:9,x1:42,y1:17},
   {name:'中央护士站',x0:0,y0:0,x1:42,y1:30}
  ],
  signs:[
   [17.4,24.6,13.62,'中央走廊','CENTRAL WARD  /  L3',false,4.05],
   [4.0,15.0,8.52,'西侧住院部','WARD WEST',false,3.9],
   [26.0,37.0,8.52,'东侧住院部','WARD EAST',false,3.9],
   [4.0,15.0,18.22,'门诊诊疗区','CLINIC',true,3.9]
  ],
  lights:[[21.5,5.0,3.2,-2.8],[21.5,11.0,3.2,-2.6],[21.5,17.0,3.2,-2.6],[21.5,23.0,3.2,-2.6],
   [21.5,29.0,3.2,-2.4],[6.0,5.0,3.0,-2.3],[30.0,5.0,3.0,-2.3],[6.0,11.0,3.0,-2.3],
   [30.0,11.0,3.0,-2.3],[6.0,22.0,3.0,1.8],[30.0,22.0,3.0,1.8],[21.5,15.0,3.2,2.0]],
  decor:[[18.9,9.5,.13,18,[.38,.14,.12]],[24.9,9.5,.13,18,[.38,.14,.12]],
   [1.5,14.4,40,.10,[.34,.38,.36]]],
  props:PROPS.hospital,wallSigns:WALL_SIGNS.hospital,
  theme:{style:'hospital',ground:[.300,.325,.315],fog:[.095,.125,.126],ambient:[.40,.45,.44],
   sky:['#0b1011','#161d1e','#293231','#111819'],floor:['#5b625b','#3a413c','#181d1a'],
   weather:'none',clouds:false,moon:false,wallHeight:3.95,outerHeight:4.6,crateHeight:1.35,
   trainHeight:4.2,woodHeight:1.1,metalHeight:2.5,wall:[.58,.62,.58],outer:[.38,.42,.40],
   crate:[.44,.50,.47],wood:[.55,.50,.41],metal:[.42,.47,.48],train:[.42,.47,.48],
   ceiling:{height:3.95,color:[.32,.37,.36],panel:[.72,.80,.75],beam:[.24,.28,.27]},
   flicker:.18,dust:.34,lightCone:.42,grade:'#0a1718',ambientSound:'hospital',lightning:false,alarmWaves:true}
 },
 prison:{
  name:'监狱',code:'SECTOR 18',short:'监狱',tagline:'放风场 · 高压探照灯',
  blurb:'监狱的封锁门全部打开。穿过牢房区和中央放风场，挡住从两翼涌来的感染者。',
  rows:[
   '###########################################',
   '#......#.....#.....#.....#.....#.....#....#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#.W.W..#.W.W.#.W.W.#.W.W.#.W.W.#.W.W.#.WW.#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#.W.W..#.W.W.#.W.W.#.W.W.#.W.W.#.W.W.#.WW.#',
   '#......#.....#.....#.....#.....#.....#....#',
   '###.######.#####.#####.#####.#####.####.###',
   '#.........................................#',
   '#.........................................#',
   '#.................C.......................#',
   '#....#....C.........................#.....#',
   '#....#........................C.....#.....#',
   '#....#..............MMM.............#.....#',
   '#...................MMM...................#',
   '#....#..............MMM.............#.....#',
   '#....#......C....................C..#.....#',
   '#....#..............................#.....#',
   '#.......................C.................#',
   '#.........................................#',
   '#.........................................#',
   '###.######.#####.#####.#####.#####.####.###',
   '#......#.....#.....#.....#.....#.....#....#',
   '#.W.W..#.W.W.#.W.W.#.W.W.#.W.W.#.W.W.#.WW.#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#......#.....#.....#.....#.....#.....#....#',
   '#.W.W..#.W.W.#.W.W.#.W.W.#.W.W.#.W.W.#.WW.#',
   '###########################################',
  ],
  supplies:[[17.5,18.5],[2.5,16.5],[39.5,16.5],[10.5,10.5],[28.5,21.5]],
  spawnPoints:[[3.5,4.5],[10.5,6.5],[16.5,3.5],[22.5,6.5],[28.5,3.5],[34.5,6.5],[39.5,4.5],
   [3.5,26.5],[10.5,27.5],[16.5,25.5],[22.5,27.5],[28.5,25.5],[34.5,27.5],[39.5,26.5],
   [2.5,14.5],[39.5,18.5],[1.5,10.5],[41.5,21.5]],
  start:{x:10.5,y:19.5,angle:-Math.PI/2},
  preview:{x:10.5,y:19.5,angle:-Math.PI/2},
  previewEnemies:[
   {x:11.5,y:15.5,type:'walker',anim:.7,flash:0},
   {x:9.5,y:16.5,type:'runner',anim:2.2,flash:0},
   {x:12.5,y:14.5,type:'shield',anim:3.1,flash:0},
   {x:10.5,y:12.5,type:'brute',anim:4.2,flash:0}
  ],
  zones:[
   {name:'A 区牢房',x0:0,y0:0,x1:42,y1:11},
   {name:'B 区牢房',x0:0,y0:21,x1:42,y1:30},
   {name:'洗衣房',x0:0,y0:12,x1:6,y1:20},
   {name:'工场',x0:35,y0:12,x1:42,y1:20},
   {name:'中央放风场',x0:0,y0:12,x1:42,y1:20}
  ],
  signs:[
   [7.0,14.0,11.62,'中央放风场','PRISON YARD  /  A',true,4.2],
   [27.0,35.0,11.62,'工场','WORKSHOP  /  B',true,4.2],
   [15.0,29.0,21.62,'B 区牢房','BLOCK B',false,3.9],
   [15.0,29.0,9.38,'A 区牢房','BLOCK A',false,3.9]
  ],
  lights:[[21.5,12.0,4.0,2.4],[21.5,20.0,4.0,2.4],[10.5,16.0,3.6,2.2],[32.5,16.0,3.6,2.2],
   [3.0,10.0,3.0,-1.9],[21.0,10.0,3.0,-1.9],[39.0,10.0,3.0,-1.9],[3.0,21.0,3.0,-1.9],
   [21.0,21.0,3.0,-1.9],[39.0,21.0,3.0,-1.9],[21.5,14.0,3.2,-2.0],[21.5,18.0,3.2,-2.0]],
  decor:[[7.5,12.5,27,.12,[.54,.45,.22]],[7.5,19.5,27,.12,[.54,.45,.22]],
   [14.5,15.5,.10,2,[.42,.47,.49]],[27.5,15.5,.10,2,[.42,.47,.49]]],
  props:PROPS.prison,wallSigns:WALL_SIGNS.prison,
  theme:{style:'prison',ground:[.235,.250,.255],fog:[.068,.085,.100],ambient:[.29,.33,.37],
   sky:['#070a0d','#11171c','#232d35','#0d1318'],floor:['#41474b','#292f33','#13181c'],
   weather:'none',clouds:false,moon:false,wallHeight:3.45,outerHeight:5.0,crateHeight:1.5,
   trainHeight:4.2,woodHeight:1.1,metalHeight:2.7,wall:[.37,.41,.44],outer:[.23,.27,.30],
   crate:[.43,.45,.43],wood:[.37,.33,.27],metal:[.30,.35,.39],train:[.32,.36,.39],
   flicker:.12,dust:.18,lightCone:.45,grade:'#080f16',ambientSound:'prison',lightning:false,alarmWaves:true}
 }
};
const ANNEXES={
 yard:{name:'南货栈',sub:'SOUTH FREIGHT DEPOT',gates:[[8,10],[32,34]],
  blocks:[[3,33,6,36,'#'],[11,35,18,36,'M'],[24,33,29,34,'#'],[34,36,38,37,'M'],[17,39,22,40,'#'],[4,39,7,40,'M']],
  cover:[[9,35,'C'],[12,38,'C'],[22,35,'C'],[26,38,'C'],[32,40,'C'],[39,33,'C']],
  facilities:[[9,35,'freight'],[22,35,'freight'],[26,38,'freight'],[39,33,'freight']],
  supply:[[7,38],[36,39]],spawns:[[2,34],[9,40],[20,32],[31,35],[40,40],[23,40]],
  lights:[[9.5,32.3,3.1,2.65],[20.8,36.5,3.3,-2.55],[33.4,34.4,3.1,2.3],[35.8,40.0,3.1,-2.55]],
  markings:[[8.4,29.7,.18,7.6],[33.25,29.7,.18,4.5]],label:[9.5,31.05,2.77]
 },
 subway:{name:'列车检修库',sub:'TRAIN SERVICE DEPOT',gates:[[14,16],[27,29]],
  blocks:[[4,34,10,36,'T'],[19,33,25,35,'T'],[29,37,37,39,'T'],[4,39,8,40,'#'],[13,38,18,39,'M'],[37,33,39,34,'#']],
  cover:[[12,34,'C'],[17,35,'C'],[27,35,'W'],[26,39,'C'],[11,40,'C'],[39,39,'C']],
  facilities:[[12,34,'cart'],[17,35,'cart'],[27,35,'cart'],[39,39,'cart']],
  props:[{t:'rails',x:16.2,z:36.94,len:24.5}],
  supply:[[12,37],[33,35]],spawns:[[2,39],[10,32],[20,39],[30,33],[39,40],[24,41]],
  lights:[[15.5,32,3.0,-2.7],[9.5,37,3.1,-2.2],[28.5,35.4,3.0,2.4],[27.6,40,3.1,-2.65]],
  markings:[[6,36.55,20,.1],[6,37.29,20,.1],[28.22,30.1,.14,5]],label:[15.5,31.05,2.79]
 },
 tunnel:{name:'深层泵房',sub:'LOWER PUMP CHAMBER',gates:[[5,7],[34,36]],cutFrom:29,
  blocks:[[3,34,7,35,'#'],[10,32,15,35,'#'],[19,34,23,36,'M'],[29,32,33,35,'#'],[36,37,39,39,'#'],[10,38,15,40,'M'],[23,39,27,40,'#']],
  cover:[[8,33,'C'],[16,36,'C'],[18,39,'C'],[27,34,'C'],[34,39,'C'],[40,35,'C']],
  facilities:[[8,33,'pump'],[16,36,'pump'],[27,34,'pump'],[34,39,'pump']],
  props:[{t:'pipe',x:13,z:36.025,y:2.38,len:5.4,r:.073,color:[.29,.46,.38]},
   {t:'pipe',x:31.5,z:36.025,y:2.25,len:4.5,r:.078,color:[.37,.47,.35]},
   {t:'puddle',x:17.82,z:36.64,w:4.1,d:.72}],
  supply:[[6,38],[31,38]],spawns:[[2,37],[9,36],[18,32],[28,37],[39,33],[22,41]],
  lights:[[6.45,31.9,2.75,2.75],[15.9,37.4,2.7,2.5],[27.7,37.5,2.74,-2.1],[35.1,32,2.78,2.65]],
  markings:[[6.2,29.2,.13,4.4],[35.1,29.2,.13,5.7],[2.4,37.05,32,.14]],label:[6.5,31.03,2.58]
 },
 hospital:{name:'急诊留观区',sub:'EMERGENCY OBSERVATION',gates:[[12,14],[28,30]],
  blocks:[[5,33,9,35,'#'],[15,35,18,36,'#'],[22,32,25,35,'#'],[32,34,37,35,'#'],[4,39,9,40,'#'],[31,39,37,40,'#']],
  cover:[[11,34,'W'],[12,35,'W'],[13,36,'W'],[20,37,'W'],[28,36,'W'],[29,37,'W'],[20,40,'C'],[14,39,'C'],[39,37,'W']],
  facilities:[[11,34,'bed'],[12,35,'bed'],[13,36,'bed'],[20,37,'bed'],[28,36,'bed'],[29,37,'bed'],[39,37,'bed']],
  props:[{t:'cable',x:14.86,z:34.12,y:3.16,len:5.2,dir:1}],
  supply:[[11,38],[28,40]],spawns:[[2,35],[10,32],[16,39],[21,33],[30,32],[39,36],[37,41]],
  lights:[[13.5,32,3.05,-2.75],[12.4,37.3,3.05,-2.65],[24.2,37.9,3.08,-2.8],[29.5,33,3.05,2.1]],
  markings:[[13.11,30.15,.12,5.7],[29.12,30.15,.12,5.4],[10.5,37.05,24,.12]],label:[13.5,31.06,2.69]
 },
 prison:{name:'二号放风场',sub:'EXERCISE YARD TWO',gates:[[5,6],[34,34]],
  blocks:[[4,33,12,34,'#'],[16,34,23,35,'#'],[29,33,32,35,'#'],[36,34,40,36,'#'],[5,39,8,40,'#'],[28,39,32,40,'#']],
  cover:[[13,32,'W'],[17,38,'C'],[22,39,'C'],[26,36,'C'],[34,37,'W'],[37,40,'C'],[11,39,'W']],
  facilities:[[13,32,'exercise'],[17,38,'exercise'],[26,36,'exercise'],[34,37,'exercise']],
  props:[{t:'court',x:29.8,z:38.96}],
  supply:[[10,37],[34,40]],spawns:[[2,37],[10,32],[19,32],[24,40],[34,32],[40,39]],
  lights:[[5.8,31.8,3.36,2.7],[14.5,36.7,4.0,-2.9],[27.4,38,3.85,-2.7],[34.5,32.2,3.33,2.55]],
  markings:[[5.48,29.7,.15,3.1],[34.42,29.7,.15,3.4],[9.2,37.0,28,.13]],label:[5.95,31.04,2.85]
 }
};
for(const [id,annex] of Object.entries(ANNEXES)) {
 const def=MAPS[id],expanded=def.rows.map(row=>row.split(''));
 for(let y=ROWS;y<43;y++) expanded.push(Array.from({length:COLS},(_,x)=>y===42||x===0||x===COLS-1?'#':'.'));
 for(const [lo,hi] of annex.gates) for(let y=annex.cutFrom??ROWS-1;y<ROWS;y++) {
  for(let x=lo;x<=hi;x++) expanded[y][x]='.';
 }
 for(const [x0,y0,x1,y1,tile] of annex.blocks) {
  for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) expanded[y][x]=tile;
 }
 for(const [x,y,tile] of annex.cover) expanded[y][x]=tile;
 const centered=points=>points.map(([x,y])=>[x+.5,y+.5]);
 def.rows=expanded.map(row=>row.join(''));
 def.supplies.push(...centered(annex.supply));
 def.spawnPoints.push(...centered(annex.spawns));
 def.facilities=new Map(annex.facilities.map(([x,z,kind])=>[z*COLS+x,kind]));
 def.props.push(...(annex.props??[]));
 def.zones.push({name:annex.name,x0:0,y0:ROWS,x1:COLS-1,y1:41});
 def.lights.push(...annex.lights);
 def.decor.push(...annex.markings.map(box=>[...box,[.61,.55,.33]]));
 const [x,z,y]=annex.label;
 def.wallSigns.push({x,z,y,text:annex.name,sub:annex.sub,w:2.42,h:.57,accent:'#d3b16f'});
}


const WING_NAMES={
 yard:['东侧货场','南侧堆场','中央货运通道'],
 subway:['东侧站厅','南侧换乘厅','中央连廊'],
 tunnel:['东侧管廊','南侧泵站','中央管廊'],
 hospital:['东翼病房','南翼诊疗区','中央连廊'],
 prison:['东侧监区','南侧放风场','中央巡道']
};
function expandWorldMap(def,id) {
 const oldCols=def.rows[0].length,oldRows=def.rows.length,extra=20,cols=oldCols+extra,rows=oldRows+extra;
 const g=def.rows.map(row=>row.split(''));
 const eastGates=[6,15,24,35],southGates=[8,21,34];
 // 保留旧设施，用新列宽重建索引
 const facilities=[];
 for(let y=0;y<oldRows;y++) for(let x=0;x<oldCols;x++) {
  const kind=def.facilities.get(y*oldCols+x);
  if(kind) facilities.push([x,y,kind]);
 }
 // 旧东墙变内部墙，开四道门；东侧补 20 列
 for(let y=0;y<oldRows;y++) {
  if(y>0&&y<oldRows-1) g[y][oldCols-1]=eastGates.includes(y)?'.':'#';
  for(let x=oldCols;x<cols;x++) g[y][x]='.';
  g[y][cols-1]='#';
 }
 // 旧南墙开三道门；南侧补 20 行
 for(const x of southGates) g[oldRows-1][x]='.';
 for(let y=oldRows;y<rows;y++) g.push(Array.from({length:cols},(_,x)=>x===0||x===cols-1?'#':'.'));
 g[rows-1].fill('#');
 // 房间网格
 const carve=(x0,y0,x1,y1,cw,ch)=>{
  for(let x=x0+cw;x<x1;x+=cw) for(let y=y0;y<=y1;y++) g[y][x]='#';
  for(let y=y0+ch;y<y1;y+=ch) for(let x=x0;x<=x1;x++) g[y][x]='#';
  for(let x=x0+cw;x<x1;x+=cw) for(let y=y0;y<=y1;y+=ch) {
   const doorY=Math.min(y1-1,y+Math.floor(ch*.42));
   g[doorY][x]='.';if(doorY+1<y1)g[doorY+1][x]='.';
  }
  for(let y=y0+ch;y<y1;y+=ch) for(let x=x0;x<=x1;x+=cw) {
   const doorX=Math.min(x1-1,x+Math.floor(cw*.42));
   g[y][doorX]='.';if(doorX+1<x1)g[y][doorX+1]='.';
  }
 };
 carve(oldCols,1,cols-2,rows-2,6,8);
 carve(1,oldRows,oldCols-2,rows-2,8,6);
 // 主连廊
 for(let y=1;y<rows-1;y++) {g[y][oldCols+8]='.';g[y][oldCols+9]='.';}
 for(let x=1;x<cols-1;x++) {g[oldRows+9][x]='.';g[oldRows+10][x]='.';}
 // 旧门到新区的引导通道
 for(const y of eastGates) for(let x=oldCols-1;x<=oldCols+3;x++) {g[y][x]='.';if(y+1<rows-1)g[y+1][x]='.';}
 for(const x of southGates) for(let y=oldRows-1;y<=oldRows+3;y++) {g[y][x]='.';if(x+1<cols-1)g[y][x+1]='.';}
 for(let y=0;y<rows;y++) {g[y][0]='#';g[y][cols-1]='#';}
 for(let x=0;x<cols;x++) {g[0][x]='#';g[rows-1][x]='#';}
 // 每个房间放一件主题设施
 const style=def.theme.style;
 const facilityKind={yard:'freight',subway:'cart',tunnel:'pump',hospital:'bed',prison:'exercise'}[style]||'cart';
 const facilityTile={yard:'C',subway:'C',tunnel:'M',hospital:'W',prison:'W'}[style]||'C';
 const roomCells=[];
 for(let x=oldCols+3;x<cols-2;x+=6) for(let y=5;y<rows-2;y+=8) roomCells.push([x,y]);
 for(let x=5;x<oldCols-2;x+=8) for(let y=oldRows+3;y<rows-2;y+=6) roomCells.push([x,y]);
 for(const [x,y] of roomCells) {
  if(x===oldCols+8||x===oldCols+9||y===oldRows+9||y===oldRows+10) continue;
  if(g[y]?.[x]!=='.') continue;
  g[y][x]=facilityTile;facilities.push([x,y,facilityKind]);
 }
 // 灯、补给、出生点、区域
 const lightHeight={yard:2.8,subway:3.0,tunnel:2.7,hospital:3.15,prison:3.4}[style]||3;
 const cool=style==='hospital'||style==='subway',tint=cool?-1:1;
 for(let y=9;y<rows-6;y+=12) def.lights.push([oldCols+8.5,y+.5,lightHeight,tint*1.0]);
 for(let x=9;x<cols-6;x+=12) def.lights.push([x+.5,oldRows+9.5,lightHeight,tint*1.0]);
 def.supplies.push([oldCols+8.5,10.5],[oldCols+8.5,34.5],[10.5,oldRows+9.5],[44.5,oldRows+9.5]);
 def.spawnPoints.push([oldCols+4.5,4.5],[oldCols+14.5,20.5],[oldCols+4.5,44.5],[24.5,oldRows+4.5],[40.5,oldRows+15.5],[12.5,oldRows+16.5]);
 const names=WING_NAMES[id]||['东翼','南翼','中央通道'];
 def.zones.push({name:names[0],x0:oldCols,y0:1,x1:cols-2,y1:rows-2});
 def.zones.push({name:names[1],x0:1,y0:oldRows,x1:oldCols-2,y1:rows-2});
 def.zones.push({name:names[2],x0:oldCols+7,y0:1,x1:oldCols+10,y1:rows-2});
 def.rows=g.map(row=>row.join(''));
 def.facilities=new Map(facilities.map(([x,y,kind])=>[y*cols+x,kind]));
 def.expanded={oldCols,oldRows,cols,rows};
}
for(const id of Object.keys(MAPS)) expandWorldMap(MAPS[id],id);

function buildMezzanine(def,id) {
 if(id!=='hospital'&&id!=='subway') return;
 const cols=def.rows[0].length,rows=def.rows.length;
 const g=def.rows.map(row=>row.split(''));
 const height=id==='hospital'?3.0:2.4;
 const x0=54,x1=60,y0=3,y1=12,sx0=54,sx1=55,sy0=13,sy1=id==='hospital'?20:19;
 for(let y=y0;y<=y1;y++) for(let x=x0;x<=x1;x++) g[y][x]='.';
 for(let y=sy0;y<=sy1;y++) for(let x=sx0;x<=sx1;x++) g[y][x]='.';
 for(let x=53;x<=56;x++) g[sy1+1][x]='.';
 for(let x=53;x<=61;x++) g[2][x]='#';
 for(let y=2;y<=13;y++) {g[y][53]='#';g[y][61]='#';}
 for(let x=56;x<=61;x++) g[13][x]='#';
 for(let y=13;y<=sy1;y++) {g[y][53]='#';g[y][56]='#';}
 def.platforms=[{x0,y0,x1,y1,h:height}];
 def.stairs=[{x0:sx0,x1:sx1,y0:sy0,y1:sy1,top:height,bottom:0}];
 def.ceilingHole={x0:52,y0:1,x1:61,y1:sy1+2};
 def.mezzanine={x0,y0,x1,y1,h:height,stairs:{x0:sx0,x1:sx1,y0:sy0,y1:sy1}};
 def.zones.push({name:'东翼二层连廊',x0:53,y0:2,x1:61,y1:13});
 def.lights.push([57.5,7.5,height+3.4,-3.0],[59.5,5.2,height+1.8,-2.0],[55.0,10.2,height+1.8,-2.0],[54.5,sy0+3,height+1.6,-.5]);
 def.supplies.push([58.5,6.5],[56.5,10.5]);
 for(const [fx,fy,kind,tile] of [[57,4,'bed','W'],[59,9,'bed','W'],[55,5,'cart','C'],[56,8,'cart','C']]) {
  if(g[fy]?.[fx]!=='.') continue;
  g[fy][fx]=tile;def.facilities.set(fy*cols+fx,kind);
 }
 def.rows=g.map(row=>row.join(''));
}
function buildMapHeights(def) {
 const cols=def.rows[0].length,rows=def.rows.length;
 const heights=new Float32Array(cols*rows);
 for(const p of def.platforms||[]) for(let y=p.y0;y<=p.y1;y++) for(let x=p.x0;x<=p.x1;x++) heights[y*cols+x]=p.h;
 for(const s of def.stairs||[]) for(let y=s.y0;y<=s.y1;y++) for(let x=s.x0;x<=s.x1;x++) {
  const t=(y-s.y0)/Math.max(1,s.y1-s.y0);
  heights[y*cols+x]=s.top+(s.bottom-s.top)*t;
 }
 def.heights=heights;
}
buildMezzanine(MAPS.hospital,'hospital');
buildMezzanine(MAPS.subway,'subway');
for(const id of Object.keys(MAPS)) buildMapHeights(MAPS[id]);


let MAP=MAPS.yard,selectedMap='yard',columns=COLS,rows=ROWS,layout,map,supplies,spawnPoints,worldStart,preview,previewEnemies=[];
let yard3D=null,best=0;
function bestKey(id) {return 'blackout-best-'+id;}
function applyMap(id,interactive=true) {
 const def=MAPS[id]||MAPS.yard;
 selectedMap=def===MAPS[id]?id:'yard';MAP=def;
 columns=def.rows[0].length;rows=def.rows.length;
 layout=def.rows.map(row=>row.split(''));
 for(const {t,x,z} of def.props) {
  if(t!=='vending') continue;
  const col=Math.floor(x),row=Math.floor(z);
  if(layout[row]?.[col]==='.') layout[row][col]='V';
 }
 map=layout.map(row=>row.join(''));
 supplies=def.supplies;spawnPoints=def.spawnPoints;worldStart=def.start;
 preview=def.preview;previewEnemies=def.previewEnemies||[];
 best=Number(read(bestKey(selectedMap),selectedMap==='yard'?read('blackout-best','0'):'0'))||0;
 if(interactive) {
  if(typeof resize==='function') resize();
  if(yard3D) yard3D.rebuild();
  syncMenu();
 }
}
function zone(x,y) {
 const cx=Math.floor(x),cy=Math.floor(y);
 for(const area of MAP.zones) if(cx>=area.x0&&cx<=area.x1&&cy>=area.y0&&cy<=area.y1) return area.name;
 return '隔离区';
}
function coverHeight(x,y) {
 const tile=cell(x,y),t=MAP.theme;
 if(tile==='T') return t.trainHeight??4.2;
 if(tile==='V') return VENDING_HEIGHT;
 if(tile==='C') return t.crateHeight??1.55;
 if(tile==='W') return t.woodHeight??1.2;
 if(tile==='M') return t.metalHeight??2.55;
 if(tile==='#') {
  const out=x===0||y===0||x===columns-1||y===rows-1;
  return out?(t.outerHeight??4.6):(t.wallHeight??3.35);
 }
 return 0;
}
const TAU = 2 * Math.PI, MAX_WAVE = 8;
const WEAPONS=[
 {id:'rifle',name:'K-07 突击步枪',short:'K-07',kind:'rifle',price:0,tier:1,
  desc:'全能自动步枪。射速、精度和弹匣容量均衡，适合守住任何一条走廊。',
  capacity:30,startReserve:150,maxReserve:240,damage:34,headMultiplier:2.5,delay:.13,reload:1.45,kick:.031,pellets:1,spread:.003},
 {id:'pistol',name:'M-9 手枪',short:'M-9',kind:'pistol',price:0,tier:.7,
  desc:'可靠的备用武器。单发伤害高，弹药紧张时用来点爆头。',
  capacity:12,startReserve:60,maxReserve:120,damage:42,headMultiplier:2,delay:.28,reload:.95,kick:.047,pellets:1,spread:.005},
 {id:'smg',name:'V-9 冲锋枪',short:'V-9',kind:'smg',price:650,tier:1,
  desc:'射速极快的近战压制武器。弹匣大，但单发伤害和远距离精度较低。',
  capacity:36,startReserve:180,maxReserve:300,damage:21,headMultiplier:2,delay:.075,reload:1.12,kick:.022,pellets:1,spread:.013},
 {id:'shotgun',name:'S-12 战术霰弹枪',short:'S-12',kind:'shotgun',price:900,tier:1.25,
  desc:'一次喷出 7 枚弹丸。近距离能瞬杀普通感染者，远距离威力迅速衰减。',
  capacity:6,startReserve:24,maxReserve:48,damage:19,headMultiplier:1.6,delay:.72,reload:2.15,kick:.12,pellets:7,spread:.085},
 {id:'dmr',name:'R-7 精确步枪',short:'R-7',kind:'dmr',price:1200,tier:1.35,
  desc:'高伤害半自动精确步枪。爆头收益最高，适合在月台和长走廊点名。',
  capacity:8,startReserve:40,maxReserve:80,damage:78,headMultiplier:3,delay:.42,reload:1.75,kick:.07,pellets:1,spread:.002}
];
const WEAPON_BY_ID=Object.fromEntries(WEAPONS.map(w=>[w.id,w]));
const UPGRADE_DEFS={
 damage:{name:'伤害',max:5,base:140,effect:'每级 +8%'},
 capacity:{name:'弹匣',max:4,base:120,effect:'每级 +20%'},
 reload:{name:'装填',max:4,base:110,effect:'每级 -8% 时间'},
 control:{name:'稳定',max:4,base:100,effect:'每级 -12% 后坐/扩散'}
};
const SKINS={
 default:{name:'制式',price:0,body:'#28363a',metal:'#586b70',accent:'#b99d5b'},
 urban:{name:'都市迷彩',price:260,body:'#3d4b46',metal:'#727b75',accent:'#9fb3a5'},
 ember:{name:'余烬',price:420,body:'#4a2f27',metal:'#9a6a4f',accent:'#ff9f62'},
 arctic:{name:'极地',price:520,body:'#33454f',metal:'#8fa6ad',accent:'#bfe8f2'},
 neon:{name:'霓虹',price:680,body:'#1d2a2e',metal:'#4b6a70',accent:'#d6f56f'}
};
const EQUIPMENT_DEFS={
 grenades:{name:'手雷携行',max:2,base:320,effect:'每级 +1 枚，补给上限 +1'},
 grenadeDamage:{name:'手雷装药',max:3,base:260,effect:'每级 +15% 爆炸伤害'},
 armor:{name:'防弹护具',max:3,base:360,effect:'每级 -8% 受到伤害'}
};
const SAVE_KEY='blackout-armory-v1';
function makeWeaponState(){return {upgrades:{damage:0,capacity:0,reload:0,control:0},skins:['default'],skin:'default'};}
function defaultArmory(){
 const weapons={};for(const def of WEAPONS) weapons[def.id]=makeWeaponState();
 return {credits:0,owned:['rifle','pistol'],weapons,equipment:{grenades:0,grenadeDamage:0,armor:0}};
}
function loadArmory(){
 let data=null;
 try {data=JSON.parse(read(SAVE_KEY,'')||'null');} catch {}
 if(!data||typeof data!=='object') return defaultArmory();
 const base=defaultArmory();
 const owned=Array.isArray(data.owned)?data.owned.filter(id=>WEAPON_BY_ID[id]):base.owned.slice();
 if(!owned.includes('rifle')) owned.unshift('rifle');
 if(!owned.includes('pistol')) owned.push('pistol');
 const weapons={};
 for(const def of WEAPONS){
  const src=data.weapons&&data.weapons[def.id]||{};
  const st=makeWeaponState();
  for(const key of Object.keys(UPGRADE_DEFS))
   st.upgrades[key]=Math.min(UPGRADE_DEFS[key].max,Math.max(0,Number(src.upgrades&&src.upgrades[key])||0));
  st.skins=Array.isArray(src.skins)?src.skins.filter(key=>SKINS[key]):['default'];
  if(!st.skins.includes('default')) st.skins.unshift('default');
  st.skin=SKINS[src.skin]?src.skin:'default';
  if(!st.skins.includes(st.skin)) st.skin='default';
  weapons[def.id]=st;
 }
 const equipment={};
 for(const key of Object.keys(EQUIPMENT_DEFS))
  equipment[key]=Math.min(EQUIPMENT_DEFS[key].max,Math.max(0,Number(data.equipment&&data.equipment[key])||0));
 return {credits:Math.max(0,Number(data.credits)||0),owned,weapons,equipment};
}
const armory=loadArmory();
let credits=armory.credits,runCredits=0,shopWeapon='rifle';
function saveArmory(){try {localStorage.setItem(SAVE_KEY,JSON.stringify(armory));} catch {}}
function ownedWeapons(){return WEAPONS.filter(w=>armory.owned.includes(w.id));}
function ensureWeaponState(id){if(!armory.weapons[id]) armory.weapons[id]=makeWeaponState();}
function upgradesOf(id){ensureWeaponState(id);return armory.weapons[id].upgrades;}
function equipmentLevel(key){return armory.equipment?.[key]||0;}
function equipmentCost(key){return Math.round(EQUIPMENT_DEFS[key].base*Math.pow(equipmentLevel(key)+1,1.22));}
function grenadeCapacity(){return 3+equipmentLevel('grenades');}
function grenadeStartCount(){return 2+equipmentLevel('grenades');}
function skinOf(id){ensureWeaponState(id);return SKINS[armory.weapons[id].skin]||SKINS.default;}
function gunStats(item){
 const up=upgradesOf(item.id);
 return {...item,
  capacity:Math.round(item.capacity*(1+.20*up.capacity)),
  damage:item.damage*(1+.08*up.damage),
  reload:item.reload*Math.max(.55,1-.08*up.reload),
  kick:item.kick*Math.max(.4,1-.12*up.control),
  spread:item.spread*Math.max(.4,1-.12*up.control)};
}
function currentGun(){const list=ownedWeapons();return gunStats(list[Math.min(gun,list.length-1)]||WEAPONS[0]);}
function currentRounds(){return ammo[currentGun().id];}
function upgradeCost(id,key){const w=WEAPON_BY_ID[id];return Math.round(UPGRADE_DEFS[key].base*(w?w.tier:1)*Math.pow(upgradesOf(id)[key]+1,1.35));}
function killValue(type,critical){return ({walker:8,runner:10,bomber:16,shield:14,spitter:14,screamer:16,brute:24,boss:150}[type]||8)+(critical?4:0);}
function earn(amount){credits+=amount;runCredits+=amount;armory.credits=credits;saveArmory();}
const types = {
 walker:{speed:1.17,hp:76,damage:11,height:1.75,shirt:'#5b5947',skin:'#a0a073'},
 runner:{speed:2.4,hp:58,damage:8,height:1.62,shirt:'#6f3f34',skin:'#bb906b'},
 bomber:{speed:1.55,hp:64,damage:9,height:1.68,shirt:'#5a3a2c',skin:'#b18a6a'},
 brute:{speed:.88,hp:218,damage:21,height:2.04,shirt:'#454658',skin:'#a8a286'},
 boss:{speed:.72,hp:1500,damage:34,height:2.7,shirt:'#4a2b29',skin:'#8f7d63'},
 shield:{speed:1.04,hp:104,damage:12,height:1.84,shirt:'#343c4a',skin:'#a6a48d'},
 spitter:{speed:1.03,hp:82,damage:8,height:1.71,shirt:'#6b613a',skin:'#a3a879'},
 screamer:{speed:1.28,hp:88,damage:9,height:1.78,shirt:'#753f40',skin:'#b29c8e'}
};
const BOSS_PROFILES={
 yard:{name:'码头监工',hp:1500,speed:.74,damage:34},
 subway:{name:'末班车长',hp:1350,speed:.83,damage:32},
 tunnel:{name:'泵房看守',hp:1650,speed:.68,damage:36},
 hospital:{name:'夜班主治',hp:1450,speed:.76,damage:34},
 prison:{name:'典狱长',hp:1600,speed:.70,damage:38}
};
const waveSpecials=[
 [],
 ['runner','runner'],
 ['runner','shield','runner'],
 ['runner','brute','bomber','shield','runner','brute'],
 ['runner','spitter','bomber','shield','brute','runner','spitter'],
 ['runner','screamer','bomber','spitter','runner','brute','shield'],
 ['shield','spitter','screamer','bomber','runner','brute','shield','spitter','runner'],
 ['runner','shield','brute','spitter','bomber','screamer','runner','shield','spitter','brute','screamer','bomber']
];
const firstContact={2:'疾跑者出没',3:'盾卫出没',4:'巨化感染者 / 自爆者出没',5:'喷吐者出没',6:'尖啸者出没'};
const STORY_CHAPTERS=[
 {
  map:'yard',code:'第一章',title:'雨夜集结',place:'货运港 · 02:40',
  brief:'广播断了。南货栈的幸存者还在等你。沿码头穿过卸货仓与集装箱区，把三个人带出去。',
  intro:[
   ['narr','02:17。货运港的广播只剩下杂音。'],
   ['lin','陈默，能听见吗？我们在南货栈撑不了多久。'],
   ['qin','码头东边的闸门还能走。跟紧我。'],
   ['qi','我在集装箱顶上给你们打灯，快过来！']
  ],
  acts:[
   {type:'reach',label:'前往西侧维修站',point:[2.5,16.5],cap:5,
    dialogue:[['qin','穿过卸货仓，别在开阔地停下。']]},
   {type:'clear',label:'肃清维修站周边感染者',count:7,cap:5,
    dialogue:[['lin','枪声把它们都引过来了，稳住。']]},
   {type:'reach',label:'抵达东侧集装箱区',point:[33.5,22.5],cap:6,
    dialogue:[['qi','东边那条路我熟，跟我来。']]}
  ],
  outro:'你们在集装箱区找到了地铁检修口的钥匙。老秦说，末班车还停在站台之间，那是绕过封锁线的唯一通道。'
 },
 {
  map:'subway',code:'第二章',title:'末班车',place:'地铁站 · 03:05',
  brief:'检修通道能绕过闸机，但停摆的列车里并不安静。穿过东侧新站厅，登上二层连廊，从高处绕开月台。',
  intro:[
   ['qi','检修库有条路，不经过闸机。'],
   ['qin','这地方黑得像口棺材。'],
   ['lin','别走散。它们对声音很敏感。'],
   ['narr','远处，有什么东西在车厢里敲打车门。']
  ],
  acts:[
   {type:'reach',label:'抵达东侧站厅',point:[47.5,10.5],cap:6,
    dialogue:[['qi','这边是新站厅，跟我来。']]},
   {type:'clear',label:'肃清停摆列车周边',count:8,cap:5,
    dialogue:[['lin','它们就在车厢里……数量不少。']]},
   {type:'reach',label:'登上东侧二层连廊',point:[58.5,7.5],cap:6,
    dialogue:[['qin','上楼，从上面能看清整个站台。']]}
  ],
  outro:'你们钻进换乘通道。尽头传来水泵的轰鸣，那是通往地下隧道的路。林夏一路没说话，只是把样本箱抱得更紧。'
 },
 {
  map:'tunnel',code:'第三章',title:'地下的水',place:'地下隧道 · 03:40',
  brief:'积水漫过脚踝，泵房还在运转。林夏说，这里的积水样本和疫情报告一模一样。',
  intro:[
   ['qin','水里有东西。'],
   ['lin','积水样本……和爆发那天的报告完全相同。'],
   ['qi','那我们别喝。'],
   ['narr','泵房的应急灯每隔几秒闪一下，照亮漂浮的碎屑。']
  ],
  acts:[
   {type:'reach',label:'前往南侧排水室',point:[4.5,27.5],cap:6,
    dialogue:[['lin','这里的记录不能丢。']]},
   {type:'clear',label:'清理泵房周边的感染者',count:9,cap:6,
    dialogue:[['qin','它们顺着管道爬上来了！']]},
   {type:'reach',label:'抵达东侧检修梯',point:[38.5,23.5],cap:7,
    dialogue:[['qi','检修梯通向医院，快走！']]}
  ],
  outro:'你们爬出检修井时，医院的白光刺得人睁不开眼。林夏说，她的导师把研究记录留在东侧诊疗区，只要拿到它，就能证明感染源。'
 },
 {
  map:'hospital',code:'第四章',title:'夜班主治',place:'医院 · 04:20',
  brief:'走廊空了，手术室的门却还锁着。找到林夏导师留下的研究记录，然后活着离开。',
  intro:[
   ['lin','老师答应过，会在这里等我把血样送回来。'],
   ['qi','可是医院看起来已经……空了。'],
   ['qin','空？你听听那声音。'],
   ['narr','广播循环播放着一段录音：请留在病房，等待夜班主治查房。']
  ],
  acts:[
   {type:'reach',label:'前往东翼病房',point:[47.5,20.5],cap:6,
    dialogue:[['lin','样本柜在东翼最里面。']]},
   {type:'clear',label:'肃清门诊走廊',count:9,cap:6,
    dialogue:[['qin','门后面有东西。']]},
   {type:'boss',label:'击倒夜班主治 · 二层连廊',point:[57.5,7.5],cap:3,
    dialogue:[['lin','那不是老师了……开枪。'],['radio','所有单位注意，撤离车队将在 05:40 离开北岭大桥。']]}
  ],
  outro:'林夏从主治的白大褂里抽出研究记录：感染通过供水系统扩散，源头就在地下泵房。撤离车队在北岭大桥，而最近的桥头堡是旧监狱。'
 },
 {
  map:'prison',code:'第五章',title:'破晓之前',place:'监狱 · 05:10',
  brief:'穿过放风场就是桥头堡。天快亮了，典狱长却不肯开门。',
  intro:[
   ['qi','穿过放风场就是桥头堡，车队的信号就在前面。'],
   ['qin','天要亮了。这是我最后一次陪你们走这条路。'],
   ['lin','陈默，不管发生什么，把样本带出去。'],
   ['narr','探照灯扫过放风场，铁门后传来沉重的脚步声。']
  ],
  acts:[
   {type:'reach',label:'抵达 A 区牢房北廊',point:[39.5,4.5],cap:7,
    dialogue:[['qi','桥头堡的闸门在东北角。']]},
   {type:'clear',label:'肃清放风场',count:11,cap:7,
    dialogue:[['qin','都到齐了。来吧！']]},
   {type:'boss',label:'死守南区：击倒典狱长',point:[22.5,27.5],cap:3,
    dialogue:[['lin','别让它靠近样本箱！'],['radio','守望小组，车队在桥头等你们。']]}
  ],
  outro:'05:40。北岭大桥的晨雾被车灯切开。老秦说，他就知道码头不会骗人；林夏把样本箱交给了车队；小七站在桥栏上，朝你们挥手。'
 }
];
const STORY_SQUAD=[
 {id:'qin',name:'老秦',role:'霰弹枪 · 前锋',clothColor:[.20,.24,.17],skinColor:[.58,.48,.39],pantsColor:[.20,.21,.19],hairColor:[.09,.085,.075],accentColor:[.87,.58,.20],build:1.10,height:1.82,damage:27,rate:.98,range:8.5,gear:'cap',beard:true,line:'码头不会骗人。'},
 {id:'lin',name:'林夏',role:'手枪 · 医疗',clothColor:[.56,.60,.59],skinColor:[.60,.51,.43],pantsColor:[.30,.32,.33],hairColor:[.09,.075,.065],accentColor:[.72,.14,.12],build:.93,height:1.70,damage:18,rate:.74,range:11,gear:'ponytail',mask:true,line:'撑住，我带了药品。'},
 {id:'qi',name:'小七',role:'冲锋枪 · 斥候',clothColor:[.19,.31,.42],skinColor:[.56,.47,.36],pantsColor:[.18,.21,.25],hairColor:[.07,.075,.08],accentColor:[.74,.86,.90],build:.96,height:1.66,damage:12,rate:.36,range:12,gear:'hood',backpack:true,line:'跟着我，这条路我熟。'}
];
