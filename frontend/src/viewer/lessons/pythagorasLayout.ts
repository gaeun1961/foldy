// 피타고라스 설명(TODO-30)의 계산 쪽: 입체 대각선의 두 직각삼각형, 겉면 최단 거리 후보와 그 직각삼각형. 화면 물체는 만들지 않는다 (viewer.md "설명 모드").
// 겉면 길 찾기는 선 긋기와 같은 surfaceRoutes 를 쓴다
import type { BoxSize } from '../../shared/types.ts'
import { placeLines, surfaceRoutes } from '../faceTree.ts'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'

const sub = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]]
const dist = (a: Vec3, b: Vec3) => Math.hypot(...sub(a, b))

// 입체 대각선: 밑면 앞 왼쪽(꼭짓점 0) → 밑면 뒤 오른쪽(2) → 그 위(6). 좌표는 접힌 입체 기준(도형 중심이 원점, shape-scene.md 꼭짓점 규칙)
// 1단계 직각삼각형 0-1-2 (직각은 1, 빗변 = 밑면 대각선), 2단계 직각삼각형 0-2-6 (직각은 2, 빗변 = 입체 대각선)
export function diagonalLayout({ width: w, depth: d, height: h }: BoxSize) {
  const p0: Vec3 = [-w / 2, -h / 2, d / 2]
  const p1: Vec3 = [w / 2, -h / 2, d / 2]
  const p2: Vec3 = [w / 2, -h / 2, -d / 2]
  const p6: Vec3 = [w / 2, h / 2, -d / 2]
  return { p0, p1, p2, p6, base: Math.hypot(w, d), space: Math.hypot(w, d, h) }
}

// 겉면 최단 거리 후보 하나: 두 면을 지나는 길. 전개도에서 두 면이 붙어 있어서(부모-자식) 펼치면 곧은 선이다.
// 직각삼각형의 두 변은 모서리를 따라간다: 시작 꼭짓점 → (붙는 모서리 위 꼭짓점 s) → 직각 꼭짓점 r, 그리고 r → 끝 꼭짓점
export interface ShortRoute {
  length: number
  segments: { face: number; from: Vec3; to: Vec3 }[] // 길. 면마다 자른 선분 (면 메시의 자식으로 붙인다)
  legs: { face: number; from: Vec3; to: Vec3 }[][] // [첫 변의 선분들, 둘째 변의 선분들]. 면 정보는 펼친 전개도에서 놓일 면
  legLengths: [number[], number[]] // 변마다 모서리 길이들 (식에 4 + 2 처럼 보인다)
  corner: { face: number; at: Vec3; dirs: [Vec3, Vec3] } // 직각 표시: 직각 꼭짓점과 두 변 방향
}

// 시작 꼭짓점 0 에서 가장 먼 꼭짓점까지. 펼친 전개도에서 곧게 보이는 길만, 긴 길부터 (마지막이 최단, 공개는 끝에)
export function shortestRoutes(poly: Polyhedron, start = 0): ShortRoute[] {
  const pos = poly.positions
  const end = pos.reduce((best, p, i) => (dist(p, pos[start]) > dist(pos[best], pos[start]) ? i : best), start)
  const out: ShortRoute[] = []
  for (const route of surfaceRoutes(poly, { vertex: start }, { vertex: end }, 6)) {
    const placed = placeLines(poly, route.lines)
    if (placed.length !== 2 || placed.some((p) => !p)) continue
    let [f1, f2] = placed.map((p) => p!.face)
    if (!poly.faces[f1].vertices.includes(start)) [f1, f2] = [f2, f1]
    const child = poly.faces[f2].parent === f1 ? f2 : poly.faces[f1].parent === f2 ? f1 : -1
    if (child < 0) continue // 전개도에서 떨어진 두 면: 펼쳐도 곧게 보이지 않는다
    const hinge = poly.faces[child].hinge!
    const ring = (f: number, v: number) => {
      const vs = poly.faces[f].vertices
      const i = vs.indexOf(v)
      return [vs[(i + 1) % vs.length], vs[(i + vs.length - 1) % vs.length]]
    }
    const s = ring(f1, start).find((v) => hinge.includes(v))
    const r = ring(f2, end).find((v) => !hinge.includes(v))
    if (s === undefined || r === undefined || !ring(f2, s).includes(r)) continue
    const legLengths: [number[], number[]] = [[dist(pos[start], pos[s]), dist(pos[s], pos[r])], [dist(pos[r], pos[end])]]
    const a = legLengths[0][0] + legLengths[0][1]
    const b = legLengths[1][0]
    if (Math.abs(a * a + b * b - route.length * route.length) > 1e-6) continue // 직각삼각형이 아니면 (모서리를 따라가는 변이 아니면) 빼기
    out.push({
      length: route.length,
      segments: placed.map((p) => ({ face: p!.face, from: p!.from, to: p!.to })),
      legs: [
        [
          { face: f1, from: pos[start], to: pos[s] },
          { face: f2, from: pos[s], to: pos[r] },
        ],
        [{ face: f2, from: pos[r], to: pos[end] }],
      ],
      legLengths,
      corner: { face: f2, at: pos[r], dirs: [sub(pos[s], pos[r]), sub(pos[end], pos[r])] },
    })
  }
  return out.sort((x, y) => y.length - x.length)
}
