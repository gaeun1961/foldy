// 발표 디자인 보드 전용. 서비스 파일을 수정하지 않고 기존 면 트리의 투영을 사용한다.
// 실행: node frontend/lab/foldy-deck-backgrounds.mjs
// 1단계: 정적 8쪽 배경. 2단계: 별도 표지 모션(6초 1회). 3단계는 팀 피드백 후.
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as THREE from 'three';
import { polyhedronOf } from '../src/viewer/polyhedra.ts';
import { buildFaceTree, applyUnfold } from '../src/viewer/faceTree.ts';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dir = path.join(root, 'docs/design');
const boardPath = path.join(dir, 'foldy-layout-board.html');
let board = await fs.readFile(boardPath, 'utf8');
// 제공된 CI에서 읽은 시각 토큰. 모든 배경은 동일한 잉크/크림/분홍/하늘색만 쓴다.
const colors = ['#faf4eb', '#d9ecf8', '#e8477b', '#faf4eb', '#d9ecf8', '#faf4eb'];
const iconInk = '#4a443d';
const iconStroke = 18;
const camera = new THREE.OrthographicCamera(-12, 12, 12, -12, .1, 100);
camera.position.set(7, 6, 10); camera.lookAt(0, 0, 0); camera.updateMatrixWorld();
const materials = [new THREE.MeshBasicMaterial({side:THREE.FrontSide}),new THREE.MeshBasicMaterial({side:THREE.BackSide})];
const edgeMaterial = new THREE.LineBasicMaterial();
const make = (shape, size) => polyhedronOf({shape,size,net:{layout:shape==='cuboid'||shape==='cube'?'cross':'default'},vertexLabels:[],lines:[]});
const box = make('cuboid',{width:2.7,depth:1.9,height:2.2});
const cube = make('cube',{edge:2.3});
const pyramid = make('pyramid',{sides:4,edge:2.4,height:2.8});
const octa = make('regular-octahedron',{edge:2.8});

function worldFaces(poly, unfold=0, explode=0) {
  const tree = buildFaceTree(poly,materials,edgeMaterial);
  applyUnfold(tree,unfold);
  // 앞면(면 트리 루트)을 종이 위의 수평 기준면으로 둔다.
  tree.root.rotation.x=Math.PI/2;
  tree.root.updateMatrixWorld(true);
  const faces=tree.nodes.map(n=>{
    const pts=n.vertices.map(i=>new THREE.Vector3(...poly.positions[i]).applyMatrix4(n.mesh.matrixWorld));
    const center=pts.reduce((a,p)=>a.add(p),new THREE.Vector3()).multiplyScalar(1/pts.length);
    const normal=new THREE.Vector3().subVectors(pts[1],pts[0]).cross(new THREE.Vector3().subVectors(pts[2],pts[0])).normalize();
    if(explode)pts.forEach(p=>p.addScaledVector(normal,explode));
    return {id:n.face,pts,normal,center};
  });
  tree.nodes.forEach(n=>{n.mesh.geometry.dispose();n.mesh.children.forEach(c=>c.geometry?.dispose());});
  return faces;
}
function projected(faces) {
  return faces.map(f=>({id:f.id,pts:f.pts.map(p=>p.clone().applyMatrix4(camera.matrixWorldInverse)),front:f.normal.dot(camera.position.clone().sub(f.center))>0,normal:f.normal}));
}
function bounds(faces) {
  const pts=faces.flatMap(f=>f.pts);return {minX:Math.min(...pts.map(p=>p.x)),maxX:Math.max(...pts.map(p=>p.x)),minY:Math.min(...pts.map(p=>p.y)),maxY:Math.max(...pts.map(p=>p.y))};
}
function paths(faces,frame,wire=false) {
  const b=frame||bounds(faces),scale=470/Math.max(b.maxX-b.minX,b.maxY-b.minY),cx=(b.maxX+b.minX)/2,cy=(b.maxY+b.minY)/2;
  return faces.sort((a,b)=>a.pts.reduce((v,p)=>v+p.z,0)/a.pts.length-b.pts.reduce((v,p)=>v+p.z,0)/b.pts.length).map(f=>{
    const points=f.pts.map(p=>[(300+(p.x-cx)*scale).toFixed(2),(300-(p.y-cy)*scale).toFixed(2)]);
    const d='M'+points.map(p=>p.join(',')).join('L')+'Z';
    return {id:f.id,d,fill:wire?'#f9f2e6':colors[f.id%colors.length],opacity:wire?.12:1,dash:wire&&!f.front?'9 10':''};
  });
}
function contentFor(poly,unfold=0,explode=0,wire=false){
  // 와이어프레임 역시 같은 아이콘 계열의 닫힌 입체로 표현. 서로 다른 선 언어를 섞지 않는다.
  const faces=projected(worldFaces(poly,unfold,explode));
  const fitted=bounds(faces);
  const visible=unfold===0&&explode===0?faces.filter(f=>f.front):faces;
  return paths(visible,fitted,false).map(p=>`<path d="${p.d}" fill="url(#ci-face-${p.id%colors.length})" stroke="${iconInk}" stroke-width="${iconStroke}" stroke-linejoin="round" stroke-linecap="round"/>`).join('');
}
const svg=(content,label)=>`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 600" role="img" aria-label="${label}"><defs>${colors.map((color,i)=>`<linearGradient id="ci-face-${i}" x1="0" y1="0" x2="1" y2="1"><stop stop-color="${color}"/><stop offset="1" stop-color="${color}"/><stop offset=".42" stop-color="${color}"/></linearGradient>`).join('')}</defs>${content}</svg>`;
const cylinderFaces=()=>{
  const count=48,r=1.2,h=2.5,ring=y=>Array.from({length:count},(_,i)=>new THREE.Vector3(r*Math.cos(i/count*Math.PI*2),y,r*Math.sin(i/count*Math.PI*2)));
  const top=ring(h/2),bottom=ring(-h/2);
  return [{id:3,pts:top,normal:new THREE.Vector3(0,1,0),center:new THREE.Vector3(0,h/2,0)},...top.map((p,i)=>{const j=(i+1)%count;const center=p.clone().add(top[j]).multiplyScalar(.5);center.y=0;return {id:1,pts:[bottom[i],bottom[j],top[j],p],normal:center.clone().normalize(),center};})];
};
const cylinder=`<path d="M135 190 C135 100 465 100 465 190 L465 410 C465 500 135 500 135 410 Z" fill="url(#ci-face-1)" stroke="${iconInk}" stroke-width="${iconStroke}" stroke-linejoin="round"/><ellipse cx="300" cy="190" rx="165" ry="68" fill="url(#ci-face-0)" stroke="${iconInk}" stroke-width="${iconStroke}"/>`;
const group=(content,x,y,s)=>`<g transform="translate(${x} ${y}) scale(${s})">${content}</g>`;
const backgrounds=[
  svg(contentFor(box,.55),'접히는 직육면체'),
  svg(contentFor(cube,1),'펼쳐진 전개도'),
  svg(group(contentFor(box,1),-30,100,.5)+group(contentFor(box,.5),160,140,.5)+group(contentFor(box,0),340,190,.46),'펼침·반접힘·완성'),
  svg(group(contentFor(cube),-50,190,.55)+group(contentFor(pyramid),170,120,.6)+group(cylinder,350,200,.5),'정육면체·각뿔·원기둥'),
  svg(contentFor(cube),'색이 다른 정육면체 면'),
  svg(contentFor(box,0,0,true),'직육면체의 모서리 구조'),
  svg(contentFor(cube,0,.7),'모이는 여섯 면'),
  svg(contentFor(octa),'완성된 정팔면체'),
];
const labels=['접히는 직육면체','펼쳐진 전개도','펼침 → 접힘 → 완성','정육면체 · 각뿔 · 원기둥','색이 다른 정육면체 면','직육면체의 모서리 구조','모이는 여섯 면','완성된 정팔면체'];
let assets;
if(board.includes('id="foldy-assets"')){
  assets=JSON.parse(board.match(/<script id="foldy-assets" type="application\/json">([\s\S]*?)<\/script>/)[1]);
}else{
  // 동일 CI를 여러 번 내장한 부분만 정규화. 원본 이미지 픽셀은 그대로 보존한다.
  assets={};const unique=[...new Set(board.match(/data:image\/png;base64,[A-Za-z0-9+/=]+/g))];
  unique.forEach((uri,i)=>{assets['ci'+i]=uri;board=board.split(`src="${uri}"`).join(`data-asset="ci${i}"`);});
  board=board.replace('<script>','<script id="foldy-assets" type="application/json">'+JSON.stringify(assets)+'</script><script>document.querySelectorAll("[data-asset]").forEach(e=>e.src=JSON.parse(document.getElementById("foldy-assets").textContent)[e.dataset.asset]);</script><script>');
}
if(!board.includes('id="background-v2-css"')){
  let i=0;
  board=board.replace(/<img class="ambient"[^>]*>/g,()=>`<div class="ambient ambient-${i}" aria-hidden="true">${backgrounds[i++]}</div>`);
  if(i!==8)throw new Error('Expected eight backgrounds, got '+i);
  board=board.replace(/8쪽 레이아웃 \/ 실제 CI \/ 본문 입력 전 검토/,'8쪽 레이아웃 / 목차별 도형 배경 / 본문 입력 전 검토');
  board=board.replace('background:rgb(255 252 246 / 86%)','background:rgb(255 252 246 / 90%)');
  board=board.replace('</style>',`</style><style id="background-v2-css">
  .ambient{width:46%;height:auto;top:auto;right:auto;transform:none;opacity:var(--ambient,.23);z-index:-1}
  .ambient svg{display:block;width:100%;height:auto}
  .ambient-0{width:43%;right:-4%;top:-14%;transform:rotate(-9deg)}
  .ambient-1{width:49%;left:-17%;bottom:-17%;transform:rotate(-18deg)}
  .ambient-2{width:63%;right:-8%;top:-13%;transform:rotate(-7deg)}
  .ambient-3{width:70%;left:18%;bottom:-31%}
  .ambient-4{width:48%;right:-12%;top:-10%;transform:rotate(12deg)}
  .ambient-5{width:43%;right:-13%;top:-10%;transform:rotate(-13deg)}
  .ambient-6{width:50%;left:-20%;top:6%;transform:rotate(-13deg)}
  .ambient-7{width:44%;right:-9%;bottom:-14%;transform:rotate(12deg)}
  .bg-caption{font-size:12px;color:#85745f;border-left:2px solid #d7c9b6;padding-left:12px}
  .review-link{color:#5c5249;font-size:13px;padding:10px 14px;background:#fffaf2;border:1px solid #dfd4c4;border-radius:12px;text-decoration:none}
  </style>`);
  board=board.replace('<button id="board">','<a class="review-link" href="foldy-cover-motion.html">2단계 · 표지 모션</a><button id="board">');
  board=board.replace('<span>불투명도 23%', '<span class="bg-caption" id="bg-caption"></span><span>불투명도 23%');
  board=board.replace("function render(){",`const bgLabels=${JSON.stringify(labels)};function render(){document.getElementById('bg-caption').textContent='배경: '+bgLabels[current];`);
  board=board.replace('도형 농도는 제안값이며','배경 도형은 Foldy 면 트리 좌표를 투영한 정적 도식입니다. 페이지별로 도형·위치·크기를 달리했습니다. 도형 농도는 제안값이며');
}
// 재실행해도 CI·원고 자리·패널은 유지하고 투영 배경만 새로 계산한다.
board=board.replace(/<div class="ambient ambient-(\d)" aria-hidden="true">[\s\S]*?<\/svg><\/div>/g,(_,i)=>`<div class="ambient ambient-${i}" aria-hidden="true">${backgrounds[+i]}</div>`);
if(!board.includes('id="ci-background-style"')){
  board=board.replace('</head>',`<style id="ci-background-style">
  .ambient svg{filter:drop-shadow(0 3px 2px #4a443d0b)}
  .ambient-0{width:42%;right:-6%;top:-11%;transform:rotate(-6deg)}
  .ambient-1{width:46%;left:-14%;bottom:-14%;transform:rotate(-12deg)}
  .ambient-2{width:61%;right:-5%;top:-15%;transform:rotate(-4deg)}
  .ambient-3{width:64%;left:25%;bottom:-29%}
  .ambient-4{width:42%;right:-10%;top:-7%;transform:rotate(8deg)}
  .ambient-5{width:39%;right:-10%;top:-7%;transform:rotate(-8deg)}
  .ambient-6{width:44%;left:-17%;top:13%;transform:rotate(-8deg)}
  .ambient-7{width:39%;right:-7%;bottom:-11%;transform:rotate(8deg)}
  </style></head>`);
  board=board.replace('목차별 도형 배경 / 본문 입력 전 검토','CI 스타일 배경 / 본문 입력 전 검토');
  board=board.replace('배경 도형은 Foldy 면 트리 좌표를 투영한 정적 도식입니다.','배경 도형은 CI의 굵은 둥근 잉크선과 크림·분홍·하늘색으로 통일했습니다. 원본 CI 이미지는 변경하지 않았습니다.');
}
await fs.writeFile(boardPath,board);
if(process.argv.includes('--backgrounds-only')){
  console.log(JSON.stringify({boardBytes:(await fs.stat(boardPath)).size,backgrounds:8,style:'CI 일치',motion:'변경 없음'}));
  process.exit(0);
}

// 표지 실험은 보드와 별도 파일. 실제 앱의 applyUnfold 결과를 121개 프레임으로 저장한다.
// 영상 생성/왜곡 없이 수학적 면의 연결 관계를 유지한다. 외부 라이브러리 없이 오프라인 재생.
const frameCount=121;
const projectionFrames=Array.from({length:frameCount},(_,i)=>projected(worldFaces(box,1-i/(frameCount-1))));
const allBounds=bounds(projectionFrames.flat());
const frames=projectionFrames.map(f=>paths(f,allBounds));
const stage=(frame)=>svg(frame.map(p=>`<path data-face="${p.id}" d="${p.d}" fill="${p.fill}" stroke="#5c5249" stroke-width="3.2" stroke-linejoin="round"/>`).join(''),'전개도가 직육면체로 접히는 표지 모션');
const cover=board.match(/<section class="slide active"[\s\S]*?<\/section>/)[0];
const heroAsset=cover.match(/class="hero-icon" data-asset="([^"]+)"/)[1];
const logoAsset=cover.match(/class="wordmark" data-asset="([^"]+)"/)[1];
const onlyCover=cover.replace(/<img class="hero-icon"[^>]*>/,`<div class="fold-stage" id="fold-stage">${stage(frames[frameCount-1])}</div>`);
const baseStyles=[...board.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map(m=>m[1]).join('\n');
const motion=`<!doctype html><html lang="ko"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>foldy · 2단계 표지 모션</title><style>${baseStyles}
  .fold-stage{position:absolute;right:0;top:22%;width:49%;height:70%;filter:drop-shadow(.4cqw .8cqw .7cqw #6b533025)}
  .fold-stage svg{width:100%;height:100%;overflow:visible}
  .pedestal{right:6%;bottom:17%;width:42%;height:13%}
  .cover-copy{width:48%}.ambient-0{width:37%;opacity:.13;top:-20%;right:-12%}
  .motion-tools{display:flex;gap:12px;align-items:center;flex-wrap:wrap;margin:24px 0 14px}
  .motion-tools label{font-size:13px;display:flex;gap:10px;align-items:center}
  .motion-tools input{width:200px;accent-color:#5c5249}
  .motion-tools button[aria-pressed=true]{background:#5c5249;color:#fff}
  .status{color:#796d5c;font-size:14px;min-width:170px}
  .motion-plan{display:grid;grid-template-columns:repeat(4,1fr);gap:16px;margin:18px 0}
  .motion-plan article{border-top:2px solid #cbbba3;padding:12px 0;font-size:13px;line-height:1.8;color:#80705b}
  .motion-plan b{display:block;color:#51483e;font-size:14px}
  .full .motion-tools,.full .motion-plan,.full .notes{display:none}.full .slide{display:block}
  .transport a{color:#51483e}.pause-hint{font-size:12px;color:#857762}
  @media(max-width:700px){.motion-plan{grid-template-columns:1fr 1fr}.motion-tools input{width:130px}}
  @media print{.motion-tools,.motion-plan{display:none!important}}
  </style></head><body><header><div><h1>foldy · 표지 모션 시안</h1><p>2단계 / 한 장만 / 본문 입력 전 / MP4가 아닌 브라우저 모션 검토본</p></div><nav class="transport"><a href="foldy-layout-board.html?board=1">수정된 8쪽 배경 보기</a><button id="present">발표 보기</button></nav></header><main>${onlyCover}
  <div class="motion-tools"><button id="play">6초 재생</button><button id="pause" disabled>일시정지</button><button id="static" aria-pressed="true">정적 표지</button><label>접기 과정 <input aria-label="접기 과정" id="scrub" type="range" min="0" max="120" value="120"></label><span class="status" id="status" role="status">정적 표지 · 접힌 상태</span></div>
  <div class="motion-plan"><article><b>0.0–0.8초 · 관찰</b>펼친 전개도를 잠깐 보여 줍니다.</article><article><b>0.8–4.8초 · 접기</b>같은 면들이 부드럽게 접힙니다.</article><article><b>4.8–6.0초 · 마무리</b>완성된 직육면체로 멈춥니다.</article><article><b>6.0초 이후 · 정지</b>CI와 부제 자리는 계속 고정됩니다.</article></div>
  <div class="notes"><b>이번에 확인할 것</b>　속도 · 도형 크기 · 정적 표지와의 비교<br>한 번만 재생하며 자동 반복하지 않습니다. 화면을 벗어나면 일시정지합니다. 모션 감소 설정에서는 자동 재생 없이 정적 상태로 시작합니다. 이 파일은 공유 가능한 오프라인 모션 시안이며, 실제 PPT 삽입용 영상은 피드백 이후 확정합니다.<br><span class="pause-hint">Space 재생/일시정지 · R 다시 재생 · Esc 발표 보기 종료</span></div></main>
  <script id="foldy-assets" type="application/json">${JSON.stringify({[logoAsset]:assets[logoAsset],[heroAsset]:assets[heroAsset]})}</script><script>
  const assets=JSON.parse(document.getElementById('foldy-assets').textContent);document.querySelectorAll('[data-asset]').forEach(e=>e.src=assets[e.dataset.asset]);
  const frames=${JSON.stringify(frames)};const svg=document.querySelector('#fold-stage svg');const nodes=new Map([...svg.querySelectorAll('[data-face]')].map(e=>[+e.dataset.face,e]));
  const scrub=document.getElementById('scrub'),status=document.getElementById('status'),pauseButton=document.getElementById('pause'),staticButton=document.getElementById('static');
  let elapsed=6000,playing=false,last=0,raf=0;
  function draw(index){index=Math.max(0,Math.min(120,Math.round(index)));frames[index].forEach(p=>{const el=nodes.get(p.id);el.setAttribute('d',p.d);svg.appendChild(el)});scrub.value=index;svg.dataset.frame=index;}
  function ease(t){return t<.5?4*t*t*t:1-Math.pow(-2*t+2,3)/2}
  function renderTime(){const progress=Math.max(0,Math.min(1,(elapsed-800)/4000));draw(ease(progress)*120);status.textContent=elapsed<800?'전개도 관찰':elapsed<4800?'접는 중 · '+(elapsed/1000).toFixed(1)+'초':elapsed<6000?'완성 · 멈춤':'재생 완료 · 정지';}
  function stop(){playing=false;cancelAnimationFrame(raf);pauseButton.disabled=true;document.getElementById('play').textContent='다시 6초 재생';}
  function tick(now){if(!playing)return;elapsed=Math.min(6000,elapsed+Math.min(100,now-last));last=now;renderTime();if(elapsed>=6000){stop();return}raf=requestAnimationFrame(tick);}
  function start(reset=true){cancelAnimationFrame(raf);if(reset||elapsed>=6000)elapsed=0;playing=true;last=performance.now();pauseButton.disabled=false;staticButton.setAttribute('aria-pressed','false');document.getElementById('play').textContent='처음부터 다시';renderTime();raf=requestAnimationFrame(tick);}
  document.getElementById('play').onclick=()=>start();pauseButton.onclick=()=>{stop();status.textContent='일시정지 · '+(elapsed/1000).toFixed(1)+'초';};
  staticButton.onclick=()=>{stop();elapsed=6000;draw(120);status.textContent='정적 표지 · 접힌 상태';staticButton.setAttribute('aria-pressed','true');};
  scrub.oninput=()=>{stop();draw(+scrub.value);staticButton.setAttribute('aria-pressed','false');status.textContent='과정 확인 · '+Math.round(+scrub.value/120*100)+'%';const t=+scrub.value/120;elapsed=800+4000*(t<.5?Math.cbrt(t/4):1-Math.cbrt((1-t)/4));};
  document.getElementById('present').onclick=()=>document.body.classList.toggle('full');document.addEventListener('visibilitychange',()=>{if(document.hidden&&playing){stop();status.textContent='화면 전환으로 일시정지';}});
  document.addEventListener('keydown',e=>{if(['INPUT','BUTTON','A'].includes(e.target.tagName))return;if(e.code==='Space'){e.preventDefault();if(playing)pauseButton.click();else start(false)}else if(e.key.toLowerCase()==='r'){start()}else if(e.key==='Escape'){document.body.classList.remove('full')}});
  window.foldyMotion={get playing(){return playing},get elapsed(){return elapsed},draw,stop};draw(120);
  if(!matchMedia('(prefers-reduced-motion: reduce)').matches&&!new URLSearchParams(location.search).has('static'))start();
  </script></body></html>`;
await fs.writeFile(path.join(dir,'foldy-cover-motion.html'),motion);
console.log(JSON.stringify({boardBytes:(await fs.stat(boardPath)).size,motionBytes:Buffer.byteLength(motion),backgrounds:8,motionFrames:frameCount}));
