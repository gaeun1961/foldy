import * as THREE from 'three'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'
import { clamp01, growingTube, textSprite, v3 } from './draw.ts'
import type { LessonObject } from './index.ts'
import { isExact, lengthText } from './lengthLabels.ts'
import { faceNormal, surfaceSteps, tileCells } from './surfaceLayout.ts'

// 겉넓이 설명 (TODO-25, ui.md 겉넓이·부피 공통 흐름): 접힌 입체에서 같은 모양 면끼리 한 묶음씩, 대표 면 하나로 과정을 보여준다.
// ① 그 면을 칠한다 ② 길이가 자라며 값이 나온다 (같은 길이는 같은 색) ③ (직육면체·정육면체) 1×1 칸이 한 칸씩 깔린다 ④ 같은 모양의 나머지 면을 칠한다. 식은 왼쪽 쪽에.
// 다음 묶음으로 가면 앞 묶음의 선·칸은 사라지고 칠한 색만 남는다 (한 번에 하나만). 전체 합은 끝난 뒤 왼쪽 쪽에
const PAIR_COLORS = ['#ffd982', '#b9dcff', '#c9f0c2'] // 노랑, 하늘, 연두. 모서리 7색과 겹치지 않는 연한 색
const LEG_COLORS = ['#c2255c', '#2f9e44', '#1c7ed6'] // 같은 길이는 같은 색

// tiles: 1×1 칸을 깐다 (직육면체·정육면체, 면이 모두 직사각형)
// lengthColors: 공식 글자와 맞출 길이의 색 (길이 toFixed(4) → 색). 나머지 길이는 LEG_COLORS 차례로
export function buildSurfaceAreaLesson(poly: Polyhedron, offset: Vec3 = [0, 0, 0], tiles = false, lengthColors = new Map<string, string>()): LessonObject {
  const steps = surfaceSteps(poly, tiles)
  const white = new THREE.Color('#ffffff')
  const byFace = new Map<number, { materials: [THREE.Material, THREE.Material]; color: THREE.Color; step: number; first: boolean }>()
  const face = (side: THREE.Side) => new THREE.MeshStandardMaterial({ color: '#ffffff', side, transparent: true, opacity: 0.72, depthWrite: false, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1 })
  steps.forEach((step, k) => {
    for (const f of step.faces) byFace.set(f, { materials: [face(THREE.FrontSide), face(THREE.BackSide)], color: new THREE.Color(PAIR_COLORS[k % PAIR_COLORS.length]), step: k, first: f === step.face })
  })

  const size = Math.max(...poly.positions.flatMap((p) => p.map(Math.abs))) * 2
  const group = new THREE.Group()
  const inner = new THREE.Group() // 면 좌표 그대로. 설명 물체는 입체 가운데 기준으로 옮겨지므로(offset) 되돌린다
  inner.position.set(...offset)
  group.add(inner)
  const legMaterials = new Map<string, THREE.Material>()
  const legMaterial = (length: number) => {
    const key = length.toFixed(4)
    if (!legMaterials.has(key)) legMaterials.set(key, new THREE.MeshStandardMaterial({ color: lengthColors.get(key) ?? LEG_COLORS[legMaterials.size % LEG_COLORS.length] }))
    return legMaterials.get(key)!
  }
  const tileMaterial = new THREE.MeshBasicMaterial({ color: '#ffe08a', side: THREE.DoubleSide })
  const tileLine = new THREE.LineBasicMaterial({ color: '#a8842a' })
  const tileGeometry = new THREE.PlaneGeometry(1, 1)
  const tileEdges = new THREE.EdgesGeometry(tileGeometry)
  const sprites: ReturnType<typeof textSprite>[] = []
  const sprite = (text: string, width: number, at: THREE.Vector3) => {
    const s = textSprite(text, width)
    s.sprite.position.copy(at)
    s.sprite.visible = false
    inner.add(s.sprite)
    sprites.push(s)
    return s.sprite
  }

  const parts = steps.map((step) => {
    const normal = v3(faceNormal(poly, step.face))
    const useTiles = tiles && step.legs.length === 2
    const legs = step.legs.map(({ from, to, length }) => {
      const [a, b] = [v3(from), v3(to)]
      const tube = growingTube(a, b, size * 0.012, legMaterial(length))
      inner.add(tube.mesh)
      // 3D 라벨은 값만. 딱 떨어지지 않는 길이(√)는 숫자로 쓰지 않는다
      return { tube, label: isExact(length) ? sprite(lengthText(length), size * 0.3, a.clone().lerp(b, 0.5).addScaledVector(normal, size * 0.06)) : null }
    })
    // 1×1 칸: 면의 한 귀퉁이에서 가로로 깔고, 다음 줄로 올라간다
    const cells = useTiles
      ? tileCells(step.legs[0].length, step.legs[1].length).map((c) => {
          const [o, q, r] = [v3(step.legs[0].from), v3(step.legs[0].to), v3(step.legs[1].to)]
          const [u, w] = [q.clone().sub(o).normalize(), r.clone().sub(q).normalize()]
          const mesh = new THREE.Mesh(tileGeometry, tileMaterial)
          mesh.quaternion.setFromRotationMatrix(new THREE.Matrix4().makeBasis(u, w, u.clone().cross(w)))
          mesh.position.copy(o).addScaledVector(u, c.u).addScaledVector(w, c.v).addScaledVector(normal, size * 0.004)
          mesh.add(new THREE.LineSegments(tileEdges, tileLine))
          mesh.visible = false
          inner.add(mesh)
          return { mesh, sx: c.su * 0.94, sy: c.sv * 0.94 }
        })
      : []
    return { legs, cells }
  })

  const apply = (progress: number) => {
    const qs = steps.map((_, k) => clamp01(progress * steps.length - k))
    for (const { materials, color, step, first } of byFace.values()) {
      const others = parts[step].cells.length ? 0.85 : 0.5 // 나머지 면은 대표 면을 다 본 뒤에
      const paint = first ? clamp01(qs[step] / 0.1) : clamp01((qs[step] - others) / 0.15)
      for (const m of materials) (m as THREE.MeshStandardMaterial).color.copy(white).lerp(color, paint)
    }
    parts.forEach(({ legs, cells }, k) => {
      const q = qs[k]
      const showing = q > 0 && (qs[k + 1] ?? 0) <= 0 // 다음 묶음이 시작하면 사라진다
      legs.forEach(({ tube, label }, i) => {
        const grow = showing ? clamp01(((q - 0.1) / 0.2) * legs.length - i) : 0 // 길이를 하나씩
        tube.grow(grow)
        if (label) label.visible = grow >= 1
      })
      const laid = showing ? clamp01((q - 0.3) / 0.55) * cells.length : 0
      cells.forEach(({ mesh, sx, sy }, i) => {
        const t = clamp01(laid - i)
        mesh.visible = t > 0
        mesh.scale.set(Math.max(sx * t, 1e-3), Math.max(sy * t, 1e-3), 1)
      })
    })
  }
  apply(0)

  return {
    group,
    faceMaterials: (f) => byFace.get(f)?.materials ?? null,
    apply,
    dispose: () => {
      sprites.forEach((s) => s.dispose())
      group.removeFromParent()
      for (const part of parts) for (const { tube } of part.legs) tube.mesh.geometry.dispose()
      tileGeometry.dispose()
      tileEdges.dispose()
      for (const m of [...legMaterials.values(), tileMaterial, tileLine]) m.dispose()
      for (const { materials } of byFace.values()) for (const m of materials) m.dispose()
    },
  }
}
