import { MARKS, type Mark } from './markFace.ts'

// 면 표시 고르기 (docs/specs/ui.md 화면 배치 5번): "보기" 메뉴에서 면 표시를 켜면 아래 바에 나온다. 표시를 고른 뒤 3D 에서 면을 누르면 그 면에 쓴다.
// 학습지 전개도(grid)만 면 글자·색칠을 담을 수 있어서, 십자형(치수로 만들기)은 켤 때 App 이 같은 모양의 grid 로 바꾼다
export function FaceMarks({ mark, onMark }: { mark: Mark; onMark: (mark: Mark) => void }) {
  return (
    <div className="face-marks">
      <div className="toggle-row mark-picker" role="group" aria-label="쓸 표시">
        {MARKS.map((m) => (
          <button key={m} type="button" aria-pressed={mark === m} onClick={() => onMark(m)}>
            {m}
          </button>
        ))}
      </div>
    </div>
  )
}
