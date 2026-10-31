// 설명 모드 공용 그리기 도우미 (피타고라스 TODO-30, 위치 관계 TODO-28): 자라는 막대, 직각 표시, 단계 진행률
import * as THREE from 'three'
import type { Polyhedron, Vec3 } from '../polyhedra.ts'

export const v3 = (p: Vec3) => new THREE.Vector3(...p)
export const clamp01 = (x: number) => Math.min(1, Math.max(0, x))
export const DONE = 1 - 1e-6 // 단계 경계의 부동소수 오차 (1/3 × 3 이 1 보다 조금 작게 나온다)

// from 에서 to 로 자라는 막대. grow(q) 로 0~1 만큼 보인다
export function growingTube(from: THREE.Vector3, to: THREE.Vector3, r: number, material: THREE.Material) {
  const geometry = new THREE.CylinderGeometry(r, r, 1, 12).translate(0, 0.5, 0) // 밑이 원점이라 y 로 늘리면 from 에서 자란다
  const mesh = new THREE.Mesh(geometry, material)
  mesh.position.copy(from)
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), to.clone().sub(from).normalize())
  const length = from.distanceTo(to)
  const grow = (q: number) => {
    mesh.visible = q > 0
    mesh.scale.set(1, Math.max(q, 1e-3) * length, 1)
  }
  grow(0)
  return { mesh, length, grow }
}

// 볼록 다면체를 한 덩어리 메시로 (면마다 부채꼴 삼각형). 설명에서 입체를 칠하거나 복사할 때 쓴다
export function solidGeometry(poly: Polyhedron) {
  const pts = poly.faces.flatMap((f) => {
    const p = f.vertices.map((v) => new THREE.Vector3(...poly.positions[v]))
    return p.slice(1, -1).flatMap((q, i) => [p[0], q, p[i + 2]])
  })
  const geometry = new THREE.BufferGeometry().setFromPoints(pts)
  geometry.computeVertexNormals()
  return geometry
}

// 길이 글자: 바탕이 흰 작은 표. 깊이 검사를 꺼서 다른 면에 가려져도 보인다. width 는 글자 표의 3D 가로 길이
export function textSprite(text: string, width: number, long = false) {
  const canvas = document.createElement('canvas')
  canvas.width = long ? 512 : 256 // long: 식처럼 긴 글. 글자가 줄어들지 않게 표를 넓게
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(255 255 255 / 88%)'
  ctx.roundRect(4, 8, canvas.width - 8, 80, 24)
  ctx.fill()
  ctx.font = 'bold 56px system-ui, sans-serif'
  ctx.fillStyle = '#1f2430'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, canvas.width / 2, 50, canvas.width - 24)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width, (width * 96) / canvas.width, 1)
  sprite.renderOrder = 5
  sprite.raycast = () => {} // 누르기에 걸리지 않게
  return {
    sprite,
    dispose() {
      sprite.removeFromParent()
      texture.dispose()
      material.dispose()
    },
  }
}

// 번호 (쌓기의 층, 개수 세기): 지금 것에만 작게 보인다. pos(k) 는 k 번째 자리
export function layerTags(parent: THREE.Object3D, count: number, width: number, pos: (k: number) => THREE.Vector3, unit = '층') {
  const tags = [...Array(count).keys()].map((k) => {
    const s = textSprite(`${k + 1}${unit}`, width)
    s.sprite.position.copy(pos(k))
    s.sprite.visible = false
    parent.add(s.sprite)
    return s
  })
  return {
    show: (current: number) => tags.forEach((t, k) => (t.sprite.visible = k === current)),
    dispose: () => tags.forEach((t) => t.dispose()),
  }
}

// 피타고라스 직각삼각형: 밑변·높이·빗변이 자라고 값이 나온다. foot 이 직각, show(q) 는 0~1. 같은 길이는 같은 색
export function rightTriangleOverlay(parent: THREE.Object3D, { foot, end, top, out, reach, text }: { foot: THREE.Vector3; end: THREE.Vector3; top: THREE.Vector3; out: THREE.Vector3; reach: number; text: { edge: string; leg: string; rise: string } }) {
  const r = reach * 0.018
  const materials = ['#2f9e44', '#1c7ed6', '#c2255c'].map((color) => new THREE.MeshBasicMaterial({ color }))
  const shadeMaterial = new THREE.MeshBasicMaterial({ color: '#ff9f6b', transparent: true, opacity: 0.75, side: THREE.DoubleSide, depthWrite: false })
  const tubes = [growingTube(foot, end, r, materials[0]), growingTube(foot, top, r, materials[1]), growingTube(end, top, r, materials[2])]
  const shadeGeometry = new THREE.BufferGeometry().setFromPoints([foot, end, top])
  const shade = new THREE.Mesh(shadeGeometry, shadeMaterial)
  const corner = rightAngleMark(foot, end.clone().sub(foot), top.clone().sub(foot), reach * 0.1, r * 0.5, materials[1])
  const labels = [
    [text.leg, foot.clone().lerp(end, 0.5)],
    [text.rise, foot.clone().lerp(top, 0.5)],
    [text.edge, end.clone().lerp(top, 0.5)],
  ].map(([words, at]) => {
    const s = textSprite(words as string, reach * 0.55)
    s.sprite.position.copy(at as THREE.Vector3).add(out)
    parent.add(s.sprite)
    return s
  })
  const root = new THREE.Group()
  root.add(shade, corner, ...tubes.map((t) => t.mesh))
  parent.add(root)
  const show = (q: number) => {
    tubes.forEach((t, i) => t.grow(clamp01((q / 0.6) * tubes.length - i)))
    shade.visible = q > 0
    corner.visible = q >= 0.6
    labels.forEach((l) => (l.sprite.visible = q >= 0.6))
  }
  show(0)
  return {
    show,
    dispose: () => {
      labels.forEach((l) => l.dispose())
      root.removeFromParent()
      root.traverse((o) => {
        if (o instanceof THREE.Mesh) o.geometry.dispose()
      })
      for (const m of [...materials, shadeMaterial]) m.dispose()
    },
  }
}

// 직각 표시: 꼭짓점에서 두 변 방향으로 size 만큼 간 작은 ㄱ자
export function rightAngleMark(at: THREE.Vector3, dirA: THREE.Vector3, dirB: THREE.Vector3, size: number, r: number, material: THREE.Material) {
  const a = at.clone().addScaledVector(dirA.clone().normalize(), size)
  const b = at.clone().addScaledVector(dirB.clone().normalize(), size)
  const c = a.clone().add(b).sub(at)
  const group = new THREE.Group()
  for (const [p, q] of [
    [a, c],
    [c, b],
  ]) {
    const t = growingTube(p, q, r, material)
    t.grow(1)
    group.add(t.mesh)
  }
  return group
}
