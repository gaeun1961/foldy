// 승인된 원본 CSS/CI를 보존하고, 내용과 필요한 배치만 채운 기술 2쪽.
import fs from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const dir=new URL('../../docs/design/',import.meta.url);
const opts={};for(let i=2;i<process.argv.length;i+=2)opts[process.argv[i].replace(/^--/,'')]=process.argv[i+1];
const read=async p=>JSON.parse((await fs.readFile(p,'utf8')).replace(/^\uFEFF/,''));
const manifest=opts.manifest?await read(opts.manifest):null;
const results=opts.results?await read(opts.results):null;
const evaluation=opts.evaluation?await read(opts.evaluation):null;
const captures=opts.captures?await read(opts.captures):{};
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uri=async p=>`data:image/${/\.jpe?g$/i.test(p)?'jpeg':'png'};base64,${(await fs.readFile(p)).toString('base64')}`;
const source=await fs.readFile(new URL('foldy-layout-board.html',dir),'utf8');
const original=[...source.matchAll(/<section class="slide[\s\S]*?<\/section>/g)][5][0];
const prefix=original.slice(0,original.indexOf('<div class="tech-flow">'));
const footer=original.slice(original.indexOf('<footer>'));
const stage=(number,title,body)=>prefix.replace('data-index="5"',`data-index="${number-1}"`).replace('aria-label="6쪽 만든 방식"',`aria-label="기술 ${number}쪽 ${title}"`).replace('<h2>만든 방식</h2>',`<h2>${title}</h2>`)+body+footer.replace('06 / 08',`06-${number} / 02`);
const node=(n,title,detail)=>`<div class="tech-node" style="padding:1.15cqw;align-self:stretch"><span class="number">${String(n).padStart(2,'0')}</span><h3 style="margin:.5cqw 0">${title}</h3><div class="placeholder"><span>${detail}</span></div></div>`;
const flow=(nodes,columns)=>`<div class="tech-flow" style="position:absolute;left:4.5%;right:4.5%;top:25%;margin:0;grid-template-columns:${columns}">${nodes.join('<span class="arrow" aria-hidden="true">→</span>')}</div>`;
async function shot(item,height){
 const photo=item?.path?`<img src="${await uri(item.path)}" alt="${esc(item.caption)}" style="width:100%;height:${height}cqw;object-fit:contain;display:block;border-radius:1.2cqw">`:`<div class="placeholder tall" style="height:${height}cqw">실제 화면 캡처 대기</div>`;
 return `<div class="screen" style="padding:1.1cqw;min-width:0">${photo}<div class="caption">${esc(item?.caption||'자료 확인 후 삽입')}</div></div>`;
}
const flowImages=captures.flow||[
 {path:fileURLToPath(new URL('assets/technical-live/unfolded.png',dir)),caption:'수동 입력 도형의 실제 화면 · 펼친 상태'},
 {path:fileURLToPath(new URL('assets/technical-live/folded.png',dir)),caption:'같은 도형의 실제 화면 · 접힌 상태'}
];
let body1=flow([
 node(1,'사진 선택','문제와 도형 영역'),
 node(2,'영역 확인','픽셀 규칙 후보 탐지'),
 node(3,'AI가 읽기','비전 LLM · 구조화 출력'),
 node(4,'데이터 검증','ShapeScene · 계약 검사'),
 node(5,'3D로 표현','Grid · 면 트리 · three.js')
],'1fr .12fr 1fr .12fr 1fr .12fr 1fr .12fr 1fr');
body1+=`<div style="position:absolute;left:4.5%;right:4.5%;top:45%;display:grid;grid-template-columns:1fr 1fr;gap:2.5cqw">${await shot(flowImages[0],16.2)}${await shot(flowImages[1],16.2)}</div>`;
body1+=`<div style="position:absolute;left:4.5%;right:4.5%;top:84%;display:grid;grid-template-columns:1fr 1.4fr;gap:2cqw"><div class="glass" style="padding:.8cqw 1.2cqw"><div class="placeholder"><span>영역 오류 ↶ <b>영역 다시 선택</b></span></div></div><div class="glass" style="padding:.8cqw 1.2cqw"><div class="placeholder"><span>인식 오류 → <b>직접 수정</b> → 데이터 검증으로 합류</span></div></div></div>`;
const first=stage(1,'만든 방식: 사진에서 접히는 도형까지',body1);
const query3=manifest?.queries.find(q=>q.id==='U03');
const researchImages=captures.research||(query3?[
 {path:path.resolve(path.dirname(opts.manifest),query3.shape),caption:'U03 원본 · 예시에 넣지 않은 전개도'},
 {path:path.resolve(path.dirname(opts.manifest),'captures/U03-few-detail.png'),caption:'3-shot 응답을 실제 뷰어로 표시 · 배치 오류'}
]:[]);
let body2=flow([
 node(1,'예시 3개 고정','그림 + 검수한 교사 JSON'),
 node(2,'새 문제 3개','대상 정답은 입력에서 제외'),
 node(3,'두 조건 비교','예시 없음 / 예시 3개'),
 node(4,'응답 검증','계약 검사 + 원본과 비교')
],'1fr .12fr 1fr .12fr 1fr .12fr 1fr');
body2+=`<div style="position:absolute;left:4.5%;right:4.5%;top:44%;display:grid;grid-template-columns:1fr 1.5fr;gap:2cqw">${(await Promise.all([0,1].map(i=>shot(researchImages[i],14.6)))).join('')}</div>`;
function resultText(condition){
 if(!results)return condition==='zero'?'예시 없음: 실측 대기':'예시 3개: 실측 대기';
 if(evaluation){const a=evaluation.aggregate[condition];return `${condition==='zero'?'예시 없음':'예시 3개'}: 형식 ${a.schema_valid}/${a.n} · 전개도 배치 ${a.net_geometry_pass}/${a.net_cases}`;}
 const rows=results.filter(r=>r.condition===condition);
 const valid=rows.filter(r=>r.schema_valid).length;
 const times=rows.filter(r=>r.status==='response').map(r=>r.seconds).sort((a,b)=>a-b);
 const median=times.length?times.length%2?times[(times.length-1)/2]:(times[times.length/2-1]+times[times.length/2])/2:null;
 return `${condition==='zero'?'예시 없음':'예시 3개'}: 계약 통과 ${valid}/${rows.length}${median!==null?` · API 중앙값 ${median.toFixed(2)}초`:''}`;
}
body2+=`<div class="glass" style="position:absolute;left:4.5%;right:4.5%;top:78%;padding:.8cqw 1.2cqw;display:grid;grid-template-columns:1fr 1fr;gap:1cqw"><div class="placeholder"><span>${esc(resultText('zero'))}</span></div><div class="placeholder"><span>${esc(resultText('few'))}</span></div></div><div class="placeholder" style="position:absolute;left:4.5%;right:4.5%;top:85%;font-size:1cqw"><span>${evaluation?'3문제에서 개선 확인 못함 · 에이전트 검토 / 사람 검수 전<br>':''}기존 34/35는 동일 정답 예시 재현 · 별도 실험 · 증류 학습 미수행</span></div>`;
const second=stage(2,'인식 연구: 예시 밖의 문제도 읽을 수 있을까',body2);
let html=source.slice(0,source.indexOf('<div id="slides">'))+'<div id="slides">'+first+second+source.slice(source.indexOf('</section></div><div class="controls">')+'</section>'.length);
html=html.replace('<title>Foldy · 8쪽 디자인 보드</title>','<title>Foldy · 만든 방식과 인식 연구</title>').replace('foldy · 목차별 디자인 보드','foldy · 만든 방식과 인식 연구').replace('8쪽 레이아웃 / CI 스타일 배경 / 본문 입력 전 검토','원본 템플릿 기반 / 기술 흐름 1쪽 + 연구 1쪽').replace('8쪽 한눈에','2쪽 한눈에').replace(/<a class="review-link"[^>]*>[\s\S]*?<\/a>/,'');
html=html.replace(/<div class="notes">[\s\S]*?<\/div><\/main>/,`<div class="notes"><b>1쪽 발표 메모</b><br>사진에서 문제와 도형 영역을 고르면 AI가 정보를 읽습니다. 공통 데이터 계약으로 검증한 다음 기하 코드가 면을 만들고 접습니다. 다양한 면 배치는 Grid, 접는 과정의 면과 선은 면 트리와 모서리 회전으로 처리합니다. 잘못된 영역은 다시 고르고, 인식 오류는 수동 입력으로 보완합니다.<br><br><b>2쪽 발표 메모</b><br>검수한 그림과 교사 JSON 세 쌍을 고정하고, 그 예시에 넣지 않은 문제 세 개를 읽게 했습니다. 예시 없는 조건과 예시 세 개를 제공한 조건은 같은 모델·공통 데이터 계약을 사용합니다. 대상 문제의 정답은 요청에 넣지 않습니다. 결과의 계약 통과 여부와 사진의 도형을 정확히 보존했는지는 별도로 확인합니다.<br><br><b>실험 범위</b><br>기존 34/35는 동일 이미지와 정답 JSON을 예시로 제공한 1-shot 재현 결과입니다. 새 문제 일반화 수치가 아닙니다. 신규 비교는 수동으로 고른 도형 크롭 3문제, 조건당 1회씩 총 6요청의 탐색 실험입니다. 자동 탐지와 모델 증류를 수행한 실험이 아닙니다. 시간은 네트워크 포함 API 응답 시간이며 전체 서비스 시간과 구분합니다. 샘플 3개로 일반 정확도나 안정적인 성능 향상을 주장하지 않습니다. 계약 통과는 의미·기하의 정답 보장이 아닙니다. 기존 CV 후보 없음 40/50은 자동 탐지가 별도 병목임을 보여 준 자료입니다.<br><br><b>자료 근거</b><br>docs/specs/shape-scene.md · docs/reports/T00-grid-net.md · docs/reports/T02-face-tree.md · docs/reports/T04-face-lines.md · bank50/reports/results.html<br>재현 스크립트: backend/evals/foldy_unseen_three.py. ${opts.results?'신규 API 기록을 연결했습니다.':'신규 API 결과는 대기 중입니다.'} 캡처가 수동 입력·정답은행 로드인 경우 자동 사진 인식 성공으로 설명하지 않습니다.</div></main>`);
html=html.slice(0,html.indexOf('const titles='))+`const titles=['만든 방식','인식 연구'];let current=0;
function render(){document.getElementById('bg-caption').textContent='기술 파트 · '+titles[current];document.querySelectorAll('.slide').forEach((s,i)=>s.classList.toggle('active',i===current));document.getElementById('label').textContent=(current+1)+' / 2 · '+titles[current]}
function move(n){current=(current+n+2)%2;render()}document.getElementById('next').onclick=()=>move(1);document.getElementById('prev').onclick=()=>move(-1);document.getElementById('board').onclick=()=>{document.body.classList.remove('full');document.body.classList.toggle('board')};document.getElementById('present').onclick=()=>{document.body.classList.remove('board');document.body.classList.toggle('full')};document.querySelectorAll('.slide').forEach(s=>s.onclick=()=>{if(document.body.classList.contains('board')){current=+s.dataset.index;document.body.classList.remove('board');render();window.scrollTo(0,0)}});document.getElementById('opacity').oninput=e=>{document.documentElement.style.setProperty('--ambient',e.target.value/100);document.getElementById('density').value=e.target.value+'%'};document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);if(e.key==='Escape')document.body.classList.remove('full','board')});if(new URLSearchParams(location.search).has('board'))document.body.classList.add('board');render();</script></body></html>`;
const css=s=>[...s.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('');
html=html.replace('<b>자료 근거</b>',`<b>신규 실측 결과</b><br>계약은 6개 응답 모두 통과했지만, 완전한 문제 정보 보존은 0-shot과 3-shot 모두 0/3입니다. 핵심 기하는 각 1/3이며 전개도 2건의 배치 오류는 두 조건 모두 남았습니다. U01은 치수는 맞지만 색칠 면이 계약에 남지 않았습니다. 이는 모델 인식과 데이터 표현 한계를 함께 검토해야 하는 사례입니다. 에이전트의 원문·JSON 대조 결과이며 사람 최종 승인 전입니다. API 응답 중앙값은 각각 2.737초와 2.537초이고, 문제당 1회이므로 속도 개선으로 해석하지 않습니다.<br><a href="assets/unseen-three/report.html">6회 실측 상세 보고서</a><br><br><b>자료 근거</b>`);
if(css(source)!==css(html))throw new Error('원본 CSS 변경');
await fs.writeFile(new URL('foldy-method-research.html',dir),html);
console.log('기술 2쪽 생성: 원본 CSS·CI 유지, 이미지 내장, 신규 결과 '+(results?'연결':'대기'));
