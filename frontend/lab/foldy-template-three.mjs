import fs from 'node:fs/promises';
const dir=new URL('../../docs/design/',import.meta.url);
const source=await fs.readFile(new URL('foldy-layout-board.html',dir),'utf8');
const sections=[...source.matchAll(/<section class="slide[\s\S]*?<\/section>/g)].map(m=>m[0]);
const renumber=(s,from,to)=>s.replace(`data-index="${from-1}"`,`data-index="${to-1}"`).replace(/aria-label="[^"]+"/,`aria-label="기술 ${to}쪽"`).replace(`<b>${String(from).padStart(2,'0')}</b>`,`<b>${String(to).padStart(2,'0')}</b>`).replace(`${String(from).padStart(2,'0')} / 08`,`${String(to).padStart(2,'0')} / 03`);
let first=renumber(sections[5],6,1).replace('<h2>만든 방식</h2>','<h2>사진을 도형 정보로</h2>');
for(const t of ['영역 선택','도형 읽기','정보 연결','3D로 확인'])first=first.replace(/\[ (입력|인식|데이터|출력) 단계 \]/,t);
for(const t of ['픽셀 규칙<br>후보 영역 탐지','비전 LLM<br>구조화 출력','ShapeScene<br>데이터 계약'])first=first.replace('<span>아이콘·도식 자리</span><i></i><i></i>',`<span>${t}</span>`);
for(const t of ['문제와 도형을 고릅니다','종류·치수·면·선을 읽습니다','같은 데이터 형식으로 전달','기하 코드 · three.js'])first=first.replace('<span>설명 자리</span><i></i><i></i>',`<span>${t}</span>`);
first=first.replace('<span>보완 경로 설명 자리</span><i></i><i></i>','<span>AI가 읽은 정보를 바탕으로, 코드가 도형과 움직임을 만듭니다.</span>');
let second=renumber(sections[2],3,2).replace('<h2>foldy 소개</h2>','<h2>면과 선을 함께 접기</h2>');
const cards=[...second.matchAll(/<div class="scene-card"[\s\S]*?<div class="caption">[\s\S]*?<\/div><\/div>/g)].map(m=>m[0]);
const replacements=[];
for(const [i,name] of ['unfolded','half','folded'].entries()){
 const uri='data:image/png;base64,'+(await fs.readFile(new URL('assets/technical-live/'+name+'.png',dir))).toString('base64');
 replacements.push(cards[i].replace(/<div class="placeholder shot">[\s\S]*?<\/div>/,`<div class="placeholder shot" role="img" aria-label="수동 입력 도형의 접기 ${[0,50,100][i]}% 실제 캡처" style="background-image:url('${uri}');background-size:contain;background-position:center;background-repeat:no-repeat"></div>`).replace(/\[ 단계 이름 \]/,['0% · 펼친 상태','50% · 접는 중간','100% · 접힌 상태'][i]));
}
second=second.replace(cards.join(''),replacements.join('')).replace('<div class="journey">','<div class="journey" style="grid-template-columns:repeat(3,1fr)">');
second=second.replace('<span>보조 기능 설명 자리</span><i></i><i></i>','<span>Grid 전개도 · 면 트리 · 모서리 축 회전 · 면 기준 좌표</span>');
let third=renumber(sections[6],7,3).replace('<h2>협업 방식</h2>','<h2>고치고 질문하며 이어가기</h2>').replace('[ 공통 계약 ]','지금 보고 있는 도형').replace('<span>공유 기준 자리</span><i></i><i></i>','<span>ShapeScene으로 상태 공유</span>');
for(const [role,description] of [['직접 수정','치수·전개도 입력<br>공통 데이터에 반영'],['챗봇 힌트','현재 도형과 질문 전달<br>답변 + 화면 명령'],['화면 조작','꼭짓점 강조 · 접기 조절<br>없는 꼭짓점 제거 · 범위 제한']]){
 third=third.replace(/\[ 역할 [ABC] \]/,role).replace('<span>담당 영역 자리</span><i></i><i></i>',`<span>${description}</span>`);
}
third=third.replace('[ 작업 단위 ]','틀리면 직접 고치기').replace('[ 검토 방식 ]','막히면 힌트 받기').replace('[ 기록 방식 ]','화면에서 다시 확인');
let html=source.slice(0,source.indexOf('<div id="slides">'))+'<div id="slides">'+first+second+third+source.slice(source.indexOf('</section></div><div class="controls">')+'</section>'.length);
html=html.replace('<title>Foldy · 8쪽 디자인 보드</title>','<title>Foldy · 원본 기반 기술 3쪽</title>').replace('foldy · 목차별 디자인 보드','foldy · 원본 기반 기술 3쪽').replace('8쪽 레이아웃 / CI 스타일 배경 / 본문 입력 전 검토','원본 만든 방식·소개·협업 복제 / 소개 사진만 4칸 → 3칸').replace('8쪽 한눈에','3쪽 한눈에');
html=html.replace(/<div class="notes">[\s\S]*?<\/div><\/main>/,`<div class="notes"><b>발표자 메모</b><br>1쪽: 사진에서 정보를 읽고, 공통 데이터로 전달하면 기하 코드가 도형을 만듭니다. 작은 기술명은 낭독하지 않습니다.<br>2쪽: 면은 붙은 모서리를 축으로 접히고, 선도 자기 면을 따라 움직입니다. 세 장면은 같은 수동 입력 도형의 실제 로컬 캡처입니다. 사진 인식 성공 결과가 아닙니다.<br>3쪽: 현재 도형을 직접 고치거나 챗봇에 질문합니다. 챗봇이 요청한 화면 조작은 꼭짓점과 접기 범위를 검증한 뒤 반영합니다. 정답·힌트의 정확성까지 보장하는 검증은 아닙니다.<br><b>확인 상태</b>: 사진 인식 성공 캡처 미확보. 퓨샷은 실험안으로 본문에서 제외. 원본 CSS는 그대로이며 소개의 장면 수만 3개로 변경했습니다.</div></main>`);
html=html.slice(0,html.indexOf('const titles='))+`const titles=['사진을 도형 정보로','면과 선을 함께 접기','고치고 질문하며 이어가기'];const bgLabels=['원본 만든 방식','원본 소개','원본 협업'];let current=0;
function render(){document.getElementById('bg-caption').textContent=bgLabels[current];document.querySelectorAll('.slide').forEach((s,i)=>s.classList.toggle('active',i===current));document.getElementById('label').textContent=(current+1)+' / 3 · '+titles[current]}
function move(n){current=(current+n+3)%3;render()}document.getElementById('next').onclick=()=>move(1);document.getElementById('prev').onclick=()=>move(-1);document.getElementById('board').onclick=()=>{document.body.classList.remove('full');document.body.classList.toggle('board')};document.getElementById('present').onclick=()=>{document.body.classList.remove('board');document.body.classList.toggle('full')};document.querySelectorAll('.slide').forEach(s=>s.onclick=()=>{if(document.body.classList.contains('board')){current=+s.dataset.index;document.body.classList.remove('board');render();window.scrollTo(0,0)}});document.getElementById('opacity').oninput=e=>{document.documentElement.style.setProperty('--ambient',e.target.value/100);document.getElementById('density').value=e.target.value+'%'};document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight')move(1);if(e.key==='ArrowLeft')move(-1);if(e.key==='Escape')document.body.classList.remove('full','board')});if(new URLSearchParams(location.search).has('board'))document.body.classList.add('board');render();</script></body></html>`;
const css=s=>[...s.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('');
if(css(source)!==css(html))throw new Error('원본 CSS 변경 감지');
if((html.match(/class="scene-card"/g)||[]).length!==3)throw new Error('캡처 카드 수 오류');
await fs.writeFile(new URL('foldy-template-three.html',dir),html);
console.log('원본 CSS 동일 · 기술 3쪽 생성');
