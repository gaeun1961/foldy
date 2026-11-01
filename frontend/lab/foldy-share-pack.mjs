// 승인된 HTML의 실제 배치를 읽어 벡터 도형·텍스트·이미지로 분리한 공유자료.
import fs from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import puppeteer from 'file:///C:/Users/ektlaksskgodqhrgo/AppData/Local/npm-cache/_npx/bb964472b4759b27/node_modules/puppeteer/lib/esm/puppeteer/puppeteer.js';
const design=new URL('../../docs/design/',import.meta.url);
const out=new URL('foldy-page6-share/',design);
await fs.mkdir(out,{recursive:true});
const original=await fs.readFile(new URL('foldy-method-research.html',design),'utf8');
const esc=s=>String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;');
const notes=`6페이지 제작용 공유자료 — 기존 팀원 원고는 유지

1. 디자인 참고자료
01-flow.svg: 전체 처리 흐름과 수동 보완 경로.
02-research.svg: 퓨샷 실험 과정과 실제 결과 비교.
두 시안 모두 반드시 발표에 넣는 것이 아니라 6페이지 구성에 맞게 선택할 재료입니다.
SVG는 텍스트(text), 패널(rect), 이미지(image)가 분리된 원본입니다.
Figma 가져오기 결과에 따라 텍스트가 윤곽선으로 변환될 수 있습니다. 그 경우 아래 원고로 텍스트 상자를 만드세요.
캡처는 비트맵으로 교체 가능한 이미지이며 내부 도형까지 편집되는 것은 아닙니다.
HTML 미리보기의 문구는 클릭해 수정할 수 있습니다. 수정본 저장 버튼으로 별도 HTML을 저장하세요.
HTML 수정 내용은 기존 SVG에 자동 반영되지 않습니다.

2. 슬라이드용 짧은 문구
제목: 학습지의 면과 선을, 접히는 3D로
핵심: AI는 그림의 정보를 읽고, 기하 코드는 면과 선을 움직입니다.
흐름: 사진 선택 → 영역 확인 → AI가 읽기 → ShapeScene 검증 → 3D 표현
기술적으로 해결한 부분:
• 다양한 전개도 배치를 Grid 데이터로 표현하고 면 트리로 연결합니다.
• 공통 모서리를 축으로 면을 회전시키고, 면 위 선도 같은 변환을 따르게 합니다.
• 영역 선택과 수동 입력을 두어 인식 실패 뒤에도 도형을 조작할 수 있게 합니다.
작은 기술 표기: 비전 LLM / ShapeScene / Grid / 면 트리 / three.js
실패 경로: 영역 오류는 영역 재선택, 인식 오류는 직접 수정 후 데이터 검증 경로로 합류.

3. 발표 원고 — 기본안
학습지에서 읽어야 하는 것은 도형 이름만이 아니라 면의 배치와 선의 위치입니다. AI가 읽은 정보를 ShapeScene이라는 공통 형식으로 받고, 그 데이터로 3D를 그리도록 역할을 나눴습니다. 전개도는 격자 위의 면으로 표현하고 연결 관계를 면 트리로 바꿉니다. 접을 때는 공통 모서리를 축으로 면을 회전시키며, 면 위의 선도 함께 움직입니다. 영역을 잘못 잡으면 다시 선택하고, 인식이 틀리면 수동 입력으로 이어갈 수 있게 했습니다. 다만 데이터 형식이 맞아도 원문과 같은 도형이라는 보장은 없어, 인식 결과는 별도로 비교했습니다.

연구를 설명할 때 덧붙일 원고
검수한 그림과 정답 데이터 세 쌍을 예시로 주는 퓨샷 방식을 시험했습니다. 예시에 넣지 않은 문제 세 개를 골라, 예시가 없는 조건과 있는 조건을 비교했습니다. 여섯 응답 모두 데이터 형식은 통과했지만, 전개도 두 문제는 두 조건 모두 배치가 틀렸습니다. 이번에는 예시 추가만으로 개선을 확인하지 못했고, 면 연결과 크기를 확인하는 기하 검증이 추가 과제로 남았습니다.

4. 연구 결과와 주의사항
실험: Gemini 3.5 Flash Lite, 동일 JSON Schema, temperature 0, 수동 크롭한 문제 문맥+대상 이미지.
고정 예시: D02, D01, H03. 대상: U01, U02, U03. 대상 정답은 모델에 제공하지 않음.
3문제 병렬, 각 문제에서 0-shot 뒤 3-shot 순서로 각 1회. 총 6회. 재시도 없음.
0-shot: 형식 3/3, 핵심 기하 1/3, 전개도 배치·크기 0/2.
3-shot: 형식 3/3, 핵심 기하 1/3, 전개도 배치·크기 0/2.
U01: 9×4×6 치수는 맞지만 색칠 면 정보 누락. 데이터 계약의 표현 한계도 포함.
U02: 면 크기와 부착 위치 오류. U03: 계단형 배치를 잘못 읽음.
API 중앙값 2.737초 / 2.537초. 표본이 작고 각 1회여서 속도 개선 주장 금지.
기존 34/35는 대상과 동일한 정답 예시를 제공한 재현 결과. 신규 사진 인식 정확도가 아님.
기존 CV 후보 없음 40/50은 별도 실험. 이번 실험은 수동 크롭으로 CV를 우회함.
같은 교재의 다른 문제 3건에 대한 탐색 비교로, 일반화·안정성·전체 서비스 성공률을 입증하지 않음.
교사 JSON 정리는 수행했으나 모델 가중치를 학습하는 증류는 수행하지 않음.
검수 문제 선택→정답은행 조회는 시연 방안 제안이며 제품에 구현됐다고 표현하지 않음.
평가는 에이전트 검토이며 사람 최종 검수 전. 외부 공유 전 학습지 이용 권한 확인 필요.
1쪽 캡처는 수동 입력 도형. 2쪽은 실험 응답을 보정 없이 실제 Viewer에 넣은 캡처.

5. 배치 안내
Figma의 해당 페이지에서 기존 원고 아래 빈 공간으로 이동해 01-flow.svg와 02-research.svg를 끌어다 놓으세요.
기존 객체를 덮지 않도록 새 프레임으로 배치한 뒤, 아래에 본 원고를 텍스트 상자로 붙여넣으세요.
6페이지에 넣을 최종 분량은 팀원이 선택합니다. 연구 수치는 전체 흐름의 구현 성과와 구분합니다.
Figma 직접 삽입은 이 세션의 연결 기능 부재로 수행하지 않았습니다.
`;
await fs.writeFile(new URL('원고와-사용안내.txt',out),notes);
const browser=await puppeteer.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
const page=await browser.newPage();await page.setViewport({width:1600,height:1050,deviceScaleFactor:1});
await page.goto(new URL('foldy-method-research.html',design).href,{waitUntil:'networkidle0'});await page.evaluate(()=>document.fonts.ready);
for(let i=0;i<2;i++){
 const data=await page.evaluate(()=>{
  const root=document.querySelector('.slide.active'), b=root.getBoundingClientRect();
  const items=[];const transparent=c=>c==='transparent'||c==='rgba(0, 0, 0, 0)';
  function visit(el){const cs=getComputedStyle(el),r=el.getBoundingClientRect();if(cs.display==='none'||cs.visibility==='hidden'||!r.width||!r.height)return;
   const g={x:r.x-b.x,y:r.y-b.y,w:r.width,h:r.height};
   if(!transparent(cs.backgroundColor)||parseFloat(cs.borderWidth)>0)items.push({type:'rect',...g,fill:cs.backgroundColor,stroke:cs.borderColor,sw:parseFloat(cs.borderWidth)||0,rx:parseFloat(cs.borderRadius)||0});
   if(el.tagName==='IMG')items.push({type:'image',...g,src:el.currentSrc,opacity:cs.opacity});
   for(const child of el.childNodes){if(child.nodeType===1){visit(child);continue}if(child.nodeType!==3||!child.textContent.trim())continue;
    const lines=[];for(let j=0;j<child.length;j++){const range=document.createRange();range.setStart(child,j);range.setEnd(child,j+1);const q=range.getBoundingClientRect();if(!q.width||!q.height)continue;let l=lines.at(-1);if(!l||Math.abs(l.y-(q.y-b.y))>2){l={x:q.x-b.x,y:q.y-b.y,t:''};lines.push(l)}l.t+=child.textContent[j]}
    for(const line of lines)items.push({type:'text',...line,size:parseFloat(cs.fontSize),weight:cs.fontWeight,font:cs.fontFamily,color:cs.color});
   }
  }visit(root);return {w:b.width,h:b.height,items};
 });
 const shapes=data.items.map(v=>v.type==='rect'?`<rect x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" rx="${v.rx}" fill="${esc(v.fill)}" stroke="${esc(v.stroke)}" stroke-width="${v.sw}"/>`:v.type==='image'?`<image x="${v.x}" y="${v.y}" width="${v.w}" height="${v.h}" href="${esc(v.src)}" opacity="${v.opacity}" preserveAspectRatio="xMidYMid meet"/>`:`<text x="${v.x}" y="${v.y+v.size*.9}" font-family="${esc(v.font)}" font-size="${v.size}" font-weight="${v.weight}" fill="${esc(v.color)}">${esc(v.t)}</text>`).join('\n');
 await fs.writeFile(new URL(i?'02-research.svg':'01-flow.svg',out),`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${data.w}" height="${data.h}" viewBox="0 0 ${data.w} ${data.h}"><title>Foldy 6페이지 참고 ${i+1}</title>${shapes}</svg>`);
 await page.click('#next');
}
let html=original.replaceAll('href="assets/','href="../assets/');
const share=`<section id="share-material" style="max-width:1300px;margin:40px auto;padding:36px;background:#fffdf8;border-radius:24px;line-height:1.8;color:#514940"><h2>6페이지 아래에 둘 공유자료</h2><p>기존 원고는 유지하고 필요한 내용만 선택해서 사용하세요. Figma 직접 삽입은 아직 하지 않았습니다.</p><p><a href="01-flow.svg" download>흐름 디자인 SVG</a>　<a href="02-research.svg" download>연구 디자인 SVG</a>　<a href="원고와-사용안내.txt" download>원고 TXT</a>　<button id="save-edited">수정본 HTML 저장</button></p><p>슬라이드의 제목과 문구, 아래 원고는 클릭해서 수정할 수 있습니다. HTML 수정은 SVG에 자동 반영되지 않습니다. SVG 가져오기 시 글자가 윤곽선으로 바뀔 수 있으므로 원고를 함께 제공합니다.</p><pre contenteditable="true" style="font:20px/1.8 'Malgun Gothic',sans-serif;white-space:pre-wrap">${esc(notes)}</pre></section><script>document.querySelectorAll('.slide h2,.slide h3,.slide .placeholder span,.slide .caption').forEach(e=>e.contentEditable='true');document.addEventListener('keydown',e=>{if(e.target.isContentEditable)e.stopImmediatePropagation()},true);document.getElementById('save-edited').onclick=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob(['<!doctype html>'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'}));a.download='foldy-page6-edited.html';a.click();setTimeout(()=>URL.revokeObjectURL(a.href),1000)};</script>`;
html=html.replace('</body>',share+'</body>');await fs.writeFile(new URL('공유자료.html',out),html);
await page.goto(new URL('공유자료.html',out).href,{waitUntil:'networkidle0'});await page.locator('#share-material').scroll();await page.screenshot({path:fileURLToPath(new URL('preview.png',out))});
console.log({output:fileURLToPath(out),svgCount:2,editableTextNodes:await page.evaluate(()=>document.querySelectorAll('[contenteditable]').length),brokenImages:await page.evaluate(()=>[...document.images].filter(i=>!i.complete||!i.naturalWidth).length)});
await browser.close();
