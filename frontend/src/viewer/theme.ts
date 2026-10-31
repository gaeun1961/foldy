// 3D 디자인 토큰 (docs/specs/viewer.md "홀로그램" 3D 디자인 토큰).
// CSS 토큰(index.css :root)처럼 3D 도형 색을 한 곳에 둔다. 책 장면은 PAPER, 홀로그램은 HOLOGRAM 을 쓴다.
// 도형 디자인을 바꿀 때는 여기만 고치면 책 장면과 홀로그램이 같이 따라간다.
// 홀로그램은 아크릴에 비친다: 검은색은 투명이 되므로 밝은 선·반투명 밝은 면이어야 한다 (같은 값을 쓰면 선이 사라진다)

// 면 모양 하나: 바깥 면, 안쪽 면, 모서리 색, 불투명도 (1 이면 불투명)
export interface Look {
  outside: string
  inside: string
  edge: string
  opacity: number
}

// 책 장면이 상황마다 바꿔 쓰는 면 모양 (ThreeViewer looks)
export type LookName = 'normal' | 'active' | 'faded' | 'ghost' | 'filled' | 'overlap' | 'opposite'

export interface Theme3D {
  name: 'paper' | 'hologram'
  looks: Record<LookName, Look>
  facePalette: string[] | null // 면마다 다른 색 (null 이면 looks.normal 한 색)
  edgeWidth: number // 0 = 1px 선, 0 보다 크면 굵은 선: 화면 짧은 변 × 이 값 (px)
  pairs: string[] // 접으면 맞닿는 모서리 쌍 색 (돌려 쓴다)
  curved: { seam: string; rim: string; plain: string } // 원기둥·원뿔: 자른 선, 밑면 둘레, 맞닿는 색을 끈 선
  sphereRing: string // 구 적도 선
}

const look = (outside: string, inside: string, edge: string, opacity = 1): Look => ({ outside, inside, edge, opacity })

// 책 장면 (docs/specs/ui.md 색 기준). 지금 화면 값 그대로
export const PAPER: Theme3D = {
  name: 'paper',
  looks: {
    normal: look('#ffffff', '#e3f1fb', '#3c4048'), // 면 바깥 흰색, 안쪽 아주 연한 하늘색, 모서리 진한 회색
    active: look('#ffe8a8', '#ffd982', '#3c4048'), // 단계별 접기에서 지금 접히는 면
    faded: look('#f1eee8', '#ebe8e2', '#b9bdc4'), // 단계별 접기의 나머지 면
    ghost: look('#ffffff', '#e3f1fb', '#3c4048', 0.12), // 설명 모드: 면을 거의 투명하게
    filled: look('#cfe3c4', '#cfe3c4', '#3c4048'), // 학습지에서 색칠한 면 (grid fill)
    overlap: look('#ffc9c9', '#ffc9c9', '#3c4048'), // 잘못된 전개도에서 겹친 면
    opposite: look('#e5dbff', '#d9ccff', '#3c4048'), // 누른 면과 마주 보는 면
  },
  facePalette: null,
  edgeWidth: 0,
  pairs: ['#e5484d', '#f76b15', '#e2a400', '#30a46c', '#12a594', '#3e63dd', '#8e4ec6'],
  curved: { seam: '#e5484d', rim: '#3e63dd', plain: '#3c4048' }, // 두 밑면은 같은 테두리 (ui.md 공식 시각화 규칙)
  sphereRing: '#3c4048',
}

// 홀로그램: 검은 바탕에 빛나는 선. 면은 반투명이라 뒤 모서리도 비쳐 입체가 잘 읽힌다
export const HOLOGRAM: Theme3D = {
  name: 'hologram',
  looks: {
    normal: look('#5ad1ff', '#5ad1ff', '#ffffff', 0.35),
    active: look('#ffd25a', '#ffd25a', '#ffffff', 0.5),
    faded: look('#5ad1ff', '#5ad1ff', '#9aa4b2', 0.2),
    ghost: look('#5ad1ff', '#5ad1ff', '#ffffff', 0.12),
    filled: look('#7dff9a', '#7dff9a', '#ffffff', 0.45),
    overlap: look('#ff7a7a', '#ff7a7a', '#ffffff', 0.5),
    opposite: look('#b18cff', '#b18cff', '#ffffff', 0.5),
  },
  facePalette: ['#5ad1ff', '#ffd25a', '#ff7aa8', '#7dff9a', '#b18cff', '#ff9f5a'],
  edgeWidth: 1 / 220,
  pairs: ['#ff6b6b', '#ffa94d', '#ffd43b', '#69db7c', '#38d9a9', '#74c0fc', '#da77f2'],
  curved: { seam: '#ff6b6b', rim: '#74c0fc', plain: '#ffffff' },
  sphereRing: '#ffffff',
}
