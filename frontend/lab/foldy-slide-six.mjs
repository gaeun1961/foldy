// 전체 발표의 6쪽만 담당한다. 원본 템플릿과 기존 발표 파일은 수정하지 않는다.
import fs from 'node:fs/promises';
const dir=new URL('../../docs/design/',import.meta.url);
const source=await fs.readFile(new URL('foldy-layout-board.html',dir),'utf8');
let slide=[...source.matchAll(/<section class="slide[\s\S]*?<\/section>/g)][5][0];
slide=slide.replace('class="slide "','class="slide active"').replace('data-index="5"','data-index="0"');
for(const text of ['영역 선택','AI가 읽기','도형 정보 연결','3D로 표현'])slide=slide.replace(/\[ (입력|인식|데이터|출력) 단계 \]/,text);
for(const text of ['픽셀 규칙 기반<br>도형 후보 탐지','비전 LLM<br>구조화 출력','ShapeScene<br>공통 데이터 형식'])slide=slide.replace('<span>아이콘·도식 자리</span><i></i><i></i>',`<span>${text}</span>`);
for(const text of ['문제와 도형을 선택','종류·치수·면·선 추출','학습지 면 배치를 전달','면 트리 · three.js'])slide=slide.replace('<span>설명 자리</span><i></i><i></i>',`<span>${text}</span>`);
slide=slide.replace('<span>보완 경로 설명 자리</span><i></i><i></i>','<span>후속 실험(미검증): 문맥 통합 인식 · 퓨샷 비교</span>');
slide=slide.replace('<footer>',`<svg class="recovery-wires" viewBox="0 0 1000 562.5" aria-label="영역 오류는 다시 선택으로, 인식 오류는 직접 수정 후 도형 정보 연결로 돌아갑니다" role="img"><defs><marker id="return-tip" markerWidth="8" markerHeight="8" refX="6" refY="4" orient="auto"><path d="M1 1L6 4L1 7" fill="none" stroke="#a18d75" stroke-width="1.4"/></marker></defs><g fill="none" stroke="#a18d75" stroke-width="1.5" stroke-linejoin="round" marker-end="url(#return-tip)"><path d="M170 324V370"/><path d="M80 370V324"/><path d="M380 324V370"/><path d="M470 398H615V324"/></g><text x="80" y="351" text-anchor="middle">재선택</text><text x="541" y="389" text-anchor="middle">수정한 데이터</text></svg><div class="glass recovery-small retry-region"><span>영역이 잘못 잡힘</span><b>다시 선택</b></div><div class="glass recovery-small retry-read"><span>인식 실패 · 결과 오류</span><b>직접 수정</b></div><footer>`);
// 담당자 정의에 맞춰 동작 순서 대신 해결한 문제와 실험의 경계를 보여 준다.
slide=[...source.matchAll(/<section class="slide[\s\S]*?<\/section>/g)][5][0]
 .replace('class="slide "','class="slide active"').replace('data-index="5"','data-index="0"')
 .replace('<h2>만든 방식</h2>','<h2>만든 방식: 해결한 문제와 검증</h2>');
const evidence=[
 ['배치 보존','십자형만으로는<br>학습지 표현에 한계','Grid 전개도로 확장<br>잘못된 배치도 보존'],
 ['면과 선의 연결','접는 중에도<br>선의 위치가 유지돼야 함','면 트리 · 모서리 축 회전<br>선을 해당 면에 연결'],
 ['재현 실험','동일 정답 예시 제공<br>34 / 35 엄밀 일치','API 중앙값 2.49초<br>새 사진 인식 성능 아님'],
 ['남은 병목','현재 CV 후보 없음<br>40 / 50 자료','자동 탐지는 미해결<br>검수 문제 선택 시연 제안']
];
let ix=0;
slide=slide.replace(/<div class="tech-node[^\"]*">[\s\S]*?<\/div>(?=<span class="arrow">|<\/div><div class="glass bottom-strip">)/g,()=>{const [title,problem,solution]=evidence[ix];return `<div class="tech-node"><span class="number">0${++ix}</span><div class="placeholder node-image"><span>${problem}</span></div><h3>${title}</h3><div class="placeholder"><span>${solution}</span></div></div>`;});
if(ix!==4)throw new Error('기술 카드 치환 오류');
slide=slide.replace(/<span class="arrow">→<\/span>/g,'<span class="arrow" aria-hidden="true"></span>');
slide=slide.replace('<span>보완 경로 설명 자리</span><i></i><i></i>','<span>시연 제안: 검수 문제 선택 → 정답은행 조회 · 서비스 연결 전</span>');
let html=source.slice(0,source.indexOf('<div id="slides">'))+'<div id="slides">'+slide+source.slice(source.indexOf('</section></div><div class="controls">')+'</section>'.length);
html=html.replace('<title>Foldy · 8쪽 디자인 보드</title>','<title>Foldy · 발표 6쪽 만든 방식</title>').replace('foldy · 목차별 디자인 보드','foldy · 발표 6쪽 만든 방식').replace('8쪽 레이아웃 / CI 스타일 배경 / 본문 입력 전 검토','담당 범위: 6쪽 한 장 / 원본 레이아웃·CSS 유지').replace('8쪽 한눈에','한눈에 보기');
html=html.replace(/<a class="review-link"[^>]*>[\s\S]*?<\/a>/,'');
html=html.replace(/<div class="controls">[\s\S]*?<\/div><div class="notes">[\s\S]*?<\/div><\/main>/,`<div class="notes"><b>6쪽 발표 흐름 · 약 35~40초 초안</b><br>“사진에서 문제와 도형 영역을 고르면, AI가 종류와 치수, 면과 선을 읽습니다. 읽은 정보는 공통 형식인 ShapeScene으로 전달합니다. 그다음에는 기하 코드가 면을 구성하고 접히는 과정을 계산합니다. 학습지에 있는 배치를 보존하기 위해, 인식과 도형을 그리는 역할을 나눴습니다.”<br><br><b>연구·선택의 맥락 — 질문이 나올 때만</b><br>• 초기 십자형만으로 실제 학습지의 다양한 배치를 담기 어려워 Grid 전개도로 확장했습니다. 잘못된 전개도도 학습 대상이므로 임의로 정상 도형으로 보정하지 않습니다.<br>• 접기는 면의 연결 관계와 모서리 축 회전으로 구현합니다. 선도 해당 면에 붙어 움직입니다.<br>• 현재 도형 인식과 문제 글 읽기는 별도 처리 경로입니다. 슬라이드는 개념 흐름이며 단일 AI 호출을 뜻하지 않습니다.<br>• 문제 문맥과 도형을 함께 읽는 통합 호출, 퓨샷 비교는 후속 실험안입니다. 증류는 구현 성과로 제시하지 않습니다.<br><br><b>로컬 근거</b><br>docs/reports/T00-grid-net.md · docs/reports/T02-face-tree.md · docs/specs/shape-scene.md · frontend/src/ui/suggestBoxes.ts · backend/app/ai/vision.py<br>후속 연구안: docs/design/foldy-flow-comparison.html<br><br>사진 인식 성공 캡처·정확도·속도 개선 수치를 제시하는 페이지가 아닙니다. 본문에는 현재 구현 구조와 설계 기준만 담았습니다. 나머지 발표 페이지는 변경하지 않았습니다.</div></main>`);
html=html.slice(0,html.indexOf('const titles='))+`document.getElementById('bg-caption').textContent='전체 발표 중 06 / 08';document.getElementById('board').onclick=()=>{document.body.classList.remove('full');document.body.classList.toggle('board')};document.getElementById('present').onclick=()=>{document.body.classList.remove('board');document.body.classList.toggle('full')};document.querySelector('.slide').onclick=()=>document.body.classList.remove('board');document.getElementById('opacity').oninput=e=>{document.documentElement.style.setProperty('--ambient',e.target.value/100);document.getElementById('density').value=e.target.value+'%'};document.addEventListener('keydown',e=>{if(e.key==='Escape')document.body.classList.remove('full','board')});</script></body></html>`;
const css=t=>[...t.matchAll(/<style[^>]*>[\s\S]*?<\/style>/g)].map(m=>m[0]).join('');
if(css(source)!==css(html))throw new Error('원본 CSS 변경');
// 원본 스타일은 그대로 두고 새 보완 경로의 배치만 추가한다. 패널은 원본 glass 재사용.
html=html.replace('</head>',`<style id="recovery-layout">
.recovery-wires{position:absolute;inset:0;width:100%;height:100%;pointer-events:none;z-index:1}
.recovery-wires text{font-family:inherit;font-size:10px;fill:#8b7861}
.recovery-small{position:absolute;top:66%;width:19%;padding:.8cqw 1.2cqw;z-index:2;min-height:6cqw}
.retry-region{left:4.5%}.retry-read{left:28%}
.recovery-small span{display:block;color:#8b7861;font-size:1cqw;line-height:1.5}
.recovery-small b{display:block;font-size:1.3cqw;line-height:1.5;margin-top:.2cqw;font-weight:600}
</style></head>`).replace('담당 범위: 6쪽 한 장 / 원본 레이아웃·CSS 유지','담당 범위: 6쪽 한 장 / 원본 스타일 유지 · 보완 경로 추가');
html=html.replace(/<div class="notes">[\s\S]*?<\/div><\/main>/,`<div class="notes"><b>발표자 메모 · 기술적 문제와 검증</b><br>“다양한 학습지를 표현하려고 면 배치를 담는 Grid 형식을 만들고, 면 트리와 회전축으로 선이 면을 따라 접히게 했습니다. 인식 연구에서는 문제 자료 50개를 정리하고 교사 3D 장면 35개를 검증했습니다. 같은 정답 예시를 제공했을 때 34개가 엄밀히 일치했지만, 자동 탐지는 50개 중 40개에서 후보를 찾지 못했습니다. 그래서 시연은 검수한 문제를 선택해 정답은행에서 불러오는 방식을 제안합니다.”<br><br><b>수치의 범위</b><br>• 50개는 문제 레코드 46개와 선택부분 4개입니다. 완전한 새 문제 사진 50장이나 미공개 테스트셋이 아닙니다.<br>• 35개 교사 장면은 에이전트 검수이며 사용자 최종 승인과 구분합니다. 15개는 이번 검증에서 보류했습니다.<br>• 34/35는 해당 문제의 정답 JSON을 예시로 제공한 1-shot 재현입니다. 항목당 1회이며 반복 안정성·새 사진 인식 개선·증류 학습 성과가 아닙니다.<br>• 2.49초는 네트워크 포함 API 왕복 중앙값입니다. 촬영·CV·렌더까지의 전체 시간이 아닙니다.<br>• H05는 원문자 표기가 바뀌고 구체적인 치수 가정 안내가 빠졌습니다. 데이터 재현에서도 검토가 필요합니다.<br>• CV의 40/50은 이번 자료·설정에서 후보가 없었던 수입니다. 일반 정확도가 아니며, 후보가 나온 나머지 10개가 모두 맞았다는 뜻도 아닙니다.<br>• 검수 문제 선택 → 정답은행 조회는 시연 제안입니다. 자동 사진 매칭과 제품 연결은 이번 연구에서 구현하지 않았습니다.<br><br><b>연구 근거</b><br>D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50/reports/results.html<br>제품 근거: docs/reports/T00-grid-net.md · docs/reports/T02-face-tree.md · docs/reports/T04-face-lines.md<br>원본 프레임·배경·글자 스타일을 유지했습니다. 동작 순서를 뜻하는 카드 사이 화살표는 제거했습니다.</div></main>`);
await fs.writeFile(new URL('foldy-slide-06.html',dir),html);
console.log('원본 6쪽 단일 페이지 작성 완료');
