import React, {useState} from 'react'
import {createRoot} from 'react-dom/client'
import {Viewer} from '../src/viewer'
import type {ShapeScene} from '../src/shared/types'
function App(){
 const [scene,setScene]=useState<ShapeScene|null>(null)
 const [label,setLabel]=useState('응답 JSON을 선택하세요')
 const [unfold,setUnfold]=useState(1)
 return <main style={{fontFamily:'sans-serif',background:'#faf6ee',height:'100vh',margin:0}}>
 <header style={{height:64,padding:'0 24px',display:'flex',alignItems:'center',gap:20}}><b>foldy · 실험 응답 렌더</b><span>{label}</span><input type="file" accept=".json" onChange={async e=>{const f=e.target.files?.[0];if(!f)return;const r=JSON.parse(await f.text());setLabel(`${r.id} / ${r.condition==='few'?'고정 예시 3개':'예시 없음'}`);setScene(r.output.scene)}}/><input aria-label="펼침" type="range" min="0" max="1" step=".01" value={unfold} onChange={e=>setUnfold(Number(e.target.value))}/></header>
 <div id="viewer" style={{height:'calc(100vh - 64px)',position:'relative'}}>{scene&&<Viewer key={label} scene={scene} unfold={unfold} showMatchingEdges={false} pageText={['실험 응답 원문', '보정 없이 실제 Viewer로 렌더']} />}</div>
 </main>
}
document.body.style.margin='0'
createRoot(document.getElementById('root')!).render(<App/> )
