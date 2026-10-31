// 결과가 나올 때 공식의 글자와 같은 색으로 길이 선을 보인다 (ui.md "도형별 일반 공식"). 설명 끝에서만 보인다. 좌표는 lesson.group 기준
import * as THREE from 'three'
import { DONE, growingTube } from './draw.ts'
import type { LessonObject } from './index.ts'

export type LengthLine = { from: THREE.Vector3; to: THREE.Vector3; color: string }

export function withEndLines(lesson: LessonObject, lines: LengthLine[], radius: number): LessonObject {
  if (!lines.length) return lesson
  const materials = lines.map(({ color }) => new THREE.MeshBasicMaterial({ color }))
  const tubes = lines.map(({ from, to }, k) => {
    const tube = growingTube(from, to, radius, materials[k])
    lesson.group.add(tube.mesh)
    return tube
  })
  const apply = (progress: number) => {
    lesson.apply(progress)
    for (const tube of tubes) tube.grow(progress >= DONE ? 1 : 0)
  }
  apply(0)
  return {
    ...lesson,
    apply,
    dispose() {
      for (const tube of tubes) {
        tube.mesh.removeFromParent()
        tube.mesh.geometry.dispose()
      }
      materials.forEach((m) => m.dispose())
      lesson.dispose()
    },
  }
}
