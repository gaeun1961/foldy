// 외부 픽셀 manifest로 실제 추천 알고리즘을 검사한다. 사진은 저장소 밖에 둔다.
import fs from 'node:fs'
import path from 'node:path'
import { findShapeBoxes, sideways, TUNE } from '../src/ui/suggestBoxes.ts'

const args = process.argv.slice(2)
const manifestArg = args[args.indexOf('--manifest') + 1]
if (!args.includes('--manifest') || !manifestArg) throw new Error('사용법: npm run test:cases -- --manifest 절대경로 [--tune]')
const manifest = path.resolve(manifestArg)
const cases = JSON.parse(fs.readFileSync(manifest, 'utf8'))
if (!Array.isArray(cases) || !cases.length) throw new Error('검사 자료가 없습니다')
const splits = new Map()
for (const item of cases) {
  if (!['development', 'heldout'].includes(item.split) || !item.source) throw new Error('split과 source가 필요합니다')
  if (splits.has(item.source) && splits.get(item.source) !== item.split) throw new Error('동일 원본의 평가 자료 누출')
  splits.set(item.source, item.split)
  const pixels = JSON.parse(fs.readFileSync(path.resolve(path.dirname(manifest), item.pixels), 'utf8'))
  if (!Number.isInteger(pixels.width) || !Number.isInteger(pixels.height) || pixels.width < 1 || pixels.height < 1 || Math.max(pixels.width,pixels.height) > 480 || pixels.data.length !== pixels.width * pixels.height * 4) throw new Error('긴 변 480 이하 RGBA 픽셀이 필요합니다')
  item.px = { ...pixels, data: new Uint8ClampedArray(pixels.data) }
  if (!Array.isArray(item.expected) || item.expected.some((b) => !['x','y','w','h'].every((k) => Number.isFinite(b[k])) || b.w <= 0 || b.h <= 0)) throw new Error('검수 네모가 필요합니다')
}
function iou(a,b) {
  const area = Math.max(0, Math.min(a.x+a.w,b.x+b.w)-Math.max(a.x,b.x))*Math.max(0,Math.min(a.y+a.h,b.y+b.h)-Math.max(a.y,b.y))
  return area/(a.w*a.h+b.w*b.h-area)
}
function score(items) {
  let tp=0,fp=0,fn=0
  const rows=[]
  for (const item of items) {
    const found=sideways(item.px)?[]:findShapeBoxes(item.px), assigned=new Map()
    function visit(i,seen) {
      for(let j=0;j<item.expected.length;j++) {
        if(seen.has(j)||iou(found[i],item.expected[j])<.5) continue
        seen.add(j)
        if(!assigned.has(j)||visit(assigned.get(j),seen)){assigned.set(j,i);return true}
      }
      return false
    }
    const count=found.reduce((sum,_,i)=>sum+Number(visit(i,new Set())),0)
    tp+=count; fp+=found.length-count; fn+=item.expected.length-count
    rows.push({id:item.id,matched:count,extra:found.length-count,missed:item.expected.length-count})
  }
  return {cases:items.length,tp,fp,fn,f1:2*tp+fp+fn ? 2*tp/(2*tp+fp+fn):null,rows}
}
const original={...TUNE}, development=cases.filter((c)=>c.split==='development'), heldout=cases.filter((c)=>c.split==='heldout')
let chosen={...original}, best=score(development), trials=1
if(args.includes('--tune')) {
  if(!development.length || !heldout.length) throw new Error('맞춤에는 development와 heldout이 모두 필요합니다')
  for(const drop of [.85,.875,.9]) for(const ink of [.6,.65,.7]) for(const open of [3,4,5]) {
    Object.assign(TUNE,original,{drop,ink,open})
    const candidate=score(development); trials++
    if((candidate.f1??-1)>(best.f1??-1)){best=candidate;chosen={...TUNE}}
  }
}
Object.assign(TUNE,chosen)
const evaluation=score(heldout)
Object.assign(TUNE,original)
console.log(JSON.stringify({trials,proposal:chosen,development:best,heldout:evaluation,applied:false},null,2))
if(!args.includes('--tune') && [...best.rows,...evaluation.rows].some((r)=>r.extra||r.missed)) process.exitCode=1
