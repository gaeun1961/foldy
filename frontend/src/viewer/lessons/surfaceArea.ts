import * as THREE from 'three'
import type { Polyhedron } from '../polyhedra.ts'
import type { LessonObject } from './index.ts'
import { oppositeFacePairs } from './surfaceLayout.ts'

// 겉넓이 설명 (TODO-25): 펼친 전개도에서 마주 보는 면 쌍을 한 쌍씩 같은 색으로 칠한다.
// 단계 = 쌍. 칠하는 중인 쌍은 흰색에서 그 쌍의 색으로 서서히 바뀌고, 다 칠한 쌍은 그 색을 유지한다 (ui.md 친절한 설명 원칙)
const PAIR_COLORS = ['#ffd982', '#b9dcff', '#c9f0c2'] // 노랑(앞·뒤), 하늘(왼·오), 연두(위·아래). 모서리 7색과 겹치지 않는 연한 색

export function buildSurfaceAreaLesson(poly: Polyhedron): LessonObject {
  const pairs = oppositeFacePairs(poly)
  const white = new THREE.Color('#ffffff')
  const faceColor = new Map<number, { color: THREE.Color; pair: number }>()
  const materials = pairs.flatMap((pair, k) =>
    pair.map((face) => {
      const m: [THREE.Material, THREE.Material] = [
        new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.FrontSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
        new THREE.MeshStandardMaterial({ color: '#ffffff', side: THREE.BackSide, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 }),
      ]
      faceColor.set(face, { color: new THREE.Color(PAIR_COLORS[k % PAIR_COLORS.length]), pair: k })
      return [face, m] as const
    }),
  )
  const byFace = new Map(materials)

  const apply = (progress: number) => {
    const n = pairs.length
    for (const [face, m] of byFace) {
      const { color, pair } = faceColor.get(face)!
      const q = Math.min(1, Math.max(0, progress * n - pair)) // 이 쌍의 진행률
      for (const mat of m) (mat as THREE.MeshStandardMaterial).color.copy(white).lerp(color, q)
    }
  }

  return {
    group: new THREE.Group(), // 따로 그릴 물체는 없고 면 재질만 바꾼다
    faceMaterials: (face) => byFace.get(face) ?? null,
    apply,
    dispose: () => {
      for (const [, m] of byFace) for (const mat of m) mat.dispose()
    },
  }
}
