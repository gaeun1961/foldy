// 설명 모드 공용 그리기 도우미 (피타고라스 TODO-30, 위치 관계 TODO-28): 자라는 막대, 직각 표시, 단계 진행률
import * as THREE from 'three'
import type { Vec3 } from '../polyhedra.ts'

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

// 길이 글자: 바탕이 흰 작은 표. 깊이 검사를 꺼서 다른 면에 가려져도 보인다. width 는 글자 표의 3D 가로 길이
export function textSprite(text: string, width: number) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgb(255 255 255 / 88%)'
  ctx.roundRect(4, 8, 248, 80, 24)
  ctx.fill()
  ctx.font = 'bold 56px system-ui, sans-serif'
  ctx.fillStyle = '#1f2430'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 50, 232)
  const texture = new THREE.CanvasTexture(canvas)
  texture.colorSpace = THREE.SRGBColorSpace
  const material = new THREE.SpriteMaterial({ map: texture, depthTest: false, depthWrite: false, transparent: true })
  const sprite = new THREE.Sprite(material)
  sprite.scale.set(width, (width * 96) / 256, 1)
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
