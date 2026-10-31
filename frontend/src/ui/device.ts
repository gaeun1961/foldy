// PC·휴대폰에서 달라지는 것을 가르는 곳 (docs/specs/ui.md "PC·휴대폰 구분"). 기기 이름(User-Agent)은 보지 않는다.
// 화면 배치는 CSS 폭(1024px), 조작 방식은 주 입력 장치, 기능은 그 기능이 있는지로 가른다

// 손가락이 주 입력 (휴대폰·태블릿). CSS 의 @media (pointer: coarse) 와 같은 기준
export const TOUCH = typeof matchMedia === 'function' && matchMedia('(pointer: coarse)').matches
