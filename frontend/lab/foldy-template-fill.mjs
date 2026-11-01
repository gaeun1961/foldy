// 원본 5·6쪽을 복제한다. 원본 CSS·배경·배치 수정 금지, 내용만 교체.
import fs from 'node:fs/promises';
const dir=new URL('../../docs/design/',import.meta.url);
const source=await fs.readFile(new URL('foldy-layout-board.html',dir),'utf8');
const original=[...source.matchAll(/<section class="slide[\s\S]*?<\/section>/g)].map(m=>m[0]);
const photo='data:image/png;base64,'+(await fs.readFile(new URL('assets/technical-live/half.png',dir))).toString('base64');
let one=original[4].replace('data-index="4"','data-index="0"').replace('5쪽 디자인','1쪽 면과 선').replace('<b>05</b>','<b>01</b>').replace('<h2>디자인</h2>','<h2>면과 선을 함께 접기</h2>').replace('05 / 08','01 / 02');
one=one.replace('<div class="placeholder tall"><span>앱 화면 캡처 자리</span><i></i><i></i></div>',`<img src="${photo}" alt="로컬 앱에서 직접 만든 직육면체의 접기 50% 화면. 초록색 선이 면과 함께 움직입니다. 사진 인식 결과가 아닙니다." style="display:block;width:100%;height:100%;object-fit:contain;border-radius:1.2cqw">`);
// 이미지 고유 크기가 grid 행을 늘리지 않도록 원본의 빈자리 div 안에 배경으로 담는다.
one=one.replace(/<img src="data:image\/png;base64,[^"]+" alt="([^"]+)" style="[^"]+">/,`<div class="placeholder tall" role="img" aria-label="$1" style="background-image:url('${photo}');background-size:contain;background-position:center;background-repeat:no-repeat"></div>`);
one=one.replace('[ 색의 의미 ]','접히는 원리');
for(const text of ['면을 모서리로 연결','모서리를 축으로 회전','선은 면에 붙여 이동','중간에 멈춰 확인'])one=one.replace('<span>설명 자리</span><i></i><i></i>',`<span>${text}</span>`);
let two=original[5].replace('data-index="5"','data-index="1"').replace('6쪽 만든 방식','2쪽 만든 방식').replace('<b>06</b>','<b>02</b>').replace('06 / 08','02 / 02');
for(const text of ['사진에서 고르기','AI가 읽기','도형 정보 전달','3D로 확인'])two=two.replace(/\[ (입력|인식|데이터|출력) 단계 \]/,text);
for(const text of ['픽셀 규칙<br>후보 영역 탐지','비전 LLM<br>구조화 출력','ShapeScene<br>데이터 계약'])two=two.replace('<span>아이콘·도식 자리</span><i></i><i></i>',`<span>${text}</span>`);
for(const text of ['문제와 도형 영역 선택','도형·치수·면·선 읽기','읽거나 고친 정보를 연결','면 트리 · three.js'])two=two.replace('<span>설명 자리</span><i></i><i></i>',`<span>${text}</span>`);
two=two.replace('<span>보완 경로 설명 자리</span><i></i><i></i>','<span>인식이 틀리면 직접 고치고, 막히면 챗봇 힌트를 받습니다.</span>');
let html=source.slice(0,source.indexOf('<div id="slides">'))+'<div id="slides">'+one+two+source.slice(source.indexOf('</section></div><div class="controls">')+'</section>'.length);
html=html.replace('<title>Foldy · 8쪽 디자인 보드</title>','<title>Foldy · 원본에 내용만 넣은 2쪽</title>').replace('foldy · 목차별 디자인 보드','foldy · 원본 템플릿 내용 대입').replace('8쪽 레이아웃 / CI 스타일 배경 / 본문 입력 전 검토','원본 5·6쪽 복제 / CSS 변경 없음 / 제목·본문·이미지만 교체').replace('8쪽 한눈에','2쪽 한눈에');
html=html.replace(/<div class="notes">[\s\S]*?<\/div><\/main>/,'<div class="notes"><b>원본 복기용 비교본</b><br>원본 5쪽(디자인)과 6쪽(만든 방식)의 레이아웃·사진 박스·여백·글자 크기·배경·그림자를 유지했습니다.<br>1쪽은 로컬 앱에서 직접 만든 도형의 접기 50% 캡처이며, 사진 자동 인식 결과가 아닙니다. 기술 흐름은 구현 구조를 설명합니다.<br>사진 인식 성공 장면은 미확보입니다. 기술명은 보조 표기로 두고 발표에서는 동작만 설명합니다.</div></main>');
const start=html.indexOf('const titles=');
html=html.slice(0,start)+`const titles=['면과 선을 함께 접기','만든 방식'];const bgLabels=['원본 5쪽 배경','원본 6쪽 배경'];let current=0;
function render(){document.getElementById('bg-caption').textContent=bgLabels[current];document.querySelectorAll('.slide').forEach((s,i)=>s.classList.toggle('active',i===current));document.getElementById('label').textContent=(current+1)+' / 2 · '+titles[current]}
document.getElementById('next').onclick=()=>{current=(current+1)%2;render()};document.getElementById('prev').onclick=()=>{current=(current+1)%2;render()};document.getElementById('board').onclick=()=>{document.body.classList.remove('full');document.body.classList.toggle('board')};document.getElementById('present').onclick=()=>{document.body.classList.remove('board');document.body.classList.toggle('full')};document.querySelectorAll('.slide').forEach(s=>s.onclick=()=>{if(document.body.classList.contains('board')){current=+s.dataset.index;document.body.classList.remove('board');render();window.scrollTo(0,0)}});document.getElementById('opacity').oninput=e=>{document.documentElement.style.setProperty('--ambient',e.target.value/100);document.getElementById('density').value=e.target.value+'%'};document.addEventListener('keydown',e=>{if(e.target.tagName==='INPUT')return;if(e.key==='ArrowRight'||e.key==='ArrowLeft'){current=1-current;render()}else if(e.key==='Escape')document.body.classList.remove('full','board')});if(new URLSearchParams(location.search).has('board'))document.body.classList.add('board');render();</script></body></html>`;
const css=s=>[...s.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('');
if(css(source)!==css(html))throw new Error('원본 CSS가 변경되었습니다');
if((html.match(/<section class="slide/g)||[]).length!==2)throw new Error('페이지 수 오류');
await fs.writeFile(new URL('foldy-template-filled.html',dir),html);
console.log('2쪽 생성 완료. 원본 CSS 동일 확인.');
