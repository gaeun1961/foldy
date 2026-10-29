import { useEffect, useState } from 'react'
import type { ShapeScene } from '../shared/types'
import { analyze } from './api'

// 학습지 사진 올리기 (docs/specs/ui.md 화면 배치 2번). 고르면 바로 /analyze 를 부르고, 결과 도형을 onScene 으로 넘긴다.
// 휴대폰은 input[type=file] 이 카메라 촬영과 앨범을 함께 보여준다
type State = { kind: 'idle' } | { kind: 'loading' } | { kind: 'done' } | { kind: 'error'; message: string }

export function PhotoUpload({ onScene }: { onScene: (scene: ShapeScene) => void }) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [preview, setPreview] = useState<string | null>(null)
  useEffect(() => () => void (preview && URL.revokeObjectURL(preview)), [preview])

  const upload = async (photo: File) => {
    setPreview(URL.createObjectURL(photo))
    setState({ kind: 'loading' })
    try {
      onScene(await analyze(photo))
      setState({ kind: 'done' })
    } catch (e) {
      setState({ kind: 'error', message: (e as Error).message })
    }
  }

  return (
    <div className="photo-upload">
      <label className={`upload-button${state.kind === 'loading' ? ' disabled' : ''}`}>
        📷 {state.kind === 'done' ? '다른 사진 올리기' : '학습지 사진 올리기'}
        <input
          type="file"
          accept="image/*"
          disabled={state.kind === 'loading'}
          onChange={(e) => {
            const photo = e.target.files?.[0]
            e.target.value = '' // 같은 사진을 다시 골라도 onChange 가 오게
            if (photo) upload(photo)
          }}
        />
      </label>
      {preview && <img className="upload-preview" src={preview} alt="올린 학습지 사진" />}
      <p className={`upload-status ${state.kind}`} role="status">
        {state.kind === 'idle' && '학습지 사진을 올리면 도형이 나타나요'}
        {state.kind === 'loading' && '사진에서 도형을 찾고 있어요…'}
        {state.kind === 'done' && '도형을 찾았어요. 접어 보세요!'}
        {state.kind === 'error' && (
          <>
            {state.message}
            <br />
            <a href="#manual-input">아래에서 전개도를 직접 만들어 보세요</a>
          </>
        )}
      </p>
    </div>
  )
}
