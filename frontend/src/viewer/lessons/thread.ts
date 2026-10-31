// 실 감기 (ui.md 공식 시각화 규칙, viewer.md "곡면 위 선"): ① 세운 원기둥에 실을 감는다 ② 옆면을 펴면 실이 곧은 선이 된다 ③ 그 길이. 식은 왼쪽 쪽에.
// 옆면·밑면은 겉넓이 설명(curvedSurface.ts)의 펼치기를 그대로 쓴다. 실은 옆면과 같은 점 함수라 펴도 길이가 그대로다
import * as THREE from 'three'
import type { RoundSize } from '../../shared/types.ts'
import { sidePoint, thickLine, type Point } from '../curved.ts'
import { buildCurvedSurfaceLesson } from './curvedSurface.ts'
import { clamp01, textSprite } from './draw.ts'
import type { LessonObject } from './index.ts'
import type { PiMode } from './lengthLabels.ts'

const COUNT = 96
const THREAD = '#2e9e4f' // 밑면 둘레(분홍), 높이(파랑)와 구분되게

export function buildThreadLesson(size: RoundSize, pi: PiMode, valueLabel: string): LessonObject {
  const base = buildCurvedSurfaceLesson('cylinder', size, pi)
  const { radius: r, height: h } = size
  const extent = Math.max(2 * Math.PI * r, h + 4 * r)
  const material = new THREE.MeshBasicMaterial({ color: THREAD })
  const line = thickLine(COUNT, extent * 0.008, material)
  base.group.add(line.mesh)
  const flat = sidePoint('cylinder', size, 0.25, 0.25, 1)
  const label = textSprite(valueLabel, extent * 0.34, true)
  label.sprite.position.set(flat[0], extent * 0.04, flat[2])
  base.group.add(label.sprite)

  const apply = (progress: number) => {
    const [wind, spread, measure] = [0, 1, 2].map((k) => clamp01(progress * 3 - k))
    base.apply(0.5 + spread * 0.5) // 겉넓이 설명에서 밑면을 다 본 때부터 옆면을 다 편 때까지
    const s = clamp01((spread - 0.15) / 0.55) // 겉넓이 설명과 같은 펼침
    line.mesh.visible = wind > 0
    if (wind > 0) line.set([...Array(COUNT + 1).keys()].map((i): Point => sidePoint('cylinder', size, (wind * i) / COUNT, (wind * i) / COUNT, s)))
    label.sprite.visible = measure > 0
  }
  apply(0)
  return {
    ...base,
    apply,
    dispose() {
      label.dispose()
      material.dispose()
      line.mesh.geometry.dispose()
      line.mesh.removeFromParent()
      base.dispose()
    },
  }
}
