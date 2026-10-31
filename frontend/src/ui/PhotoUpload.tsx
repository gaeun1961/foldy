import { useEffect, useRef, useState } from 'react'
import type { ShapeScene } from '../shared/types'
import { analyze, OfflineError } from './api'
import { CornerPick } from './CornerPick'
import { NetPreview } from './NetPreview'
import { TOUCH } from './device'
import { prepPhoto, rotatePhoto } from './photoPrep'
import { WorksheetShelf } from './WorksheetShelf'
import { defaultName, deleteWorksheet, getWorksheet, listWorksheets, renameWorksheet, saveWorksheet, type WorksheetItem } from './worksheetStore'
import type { PhotoBox } from './manualScene.ts'

// 학습지 사진 올리기 (docs/specs/ui.md 화면 배치 2번). 고르면 사진이 크게 보이고, 읽을 전개도를 네모로 감싸 "이 부분 읽기"
// (그 부분만 잘라 /analyze) 또는 "사진 전체 읽기". 결과 도형과 고른 네모(사진 비율 0~1, 전체면 null)를 onScene 으로 넘긴다.
// 휴대폰은 "사진 올리기"(앨범·파일)와 "촬영하기"(카메라 바로)로 나눈다. 올린 사진 주소는 onPhoto 로도 넘겨 전개도 그리기 칸 밑에 깐다 (TODO-37)
// 사진은 모두 pick 으로 들어오고, 거기서 줄이고 방향을 맞춘 뒤(photoPrep) 그 사진을 기준으로 네모·자르기를 한다 (docs/specs/mobile.md)
// 옆으로 찍었으면 "사진 돌리기", 비스듬히 찍었으면 "종이 펴기"(CornerPick)로 고친 사진이 그 뒤의 기준 사진이 된다
type State = { kind: 'idle' } | { kind: 'preparing' } | { kind: 'straighten' } | { kind: 'picking' } | { kind: 'loading'; since: number } | { kind: 'done'; scene: ShapeScene } | { kind: 'error'; message: string } | { kind: 'soft'; message: string }
export type PhotoPlace = { box: PhotoBox; aspect: number } // 고른 네모와 사진 가로/세로
interface Props {
  onScene: (scene: ShapeScene, place: PhotoPlace | null) => void
  onPhoto: (url: string) => void
}

const MIN_BOX = 0.03 // 이보다 작은 네모는 누른 것으로 보고 무시
// 터치 화면(휴대폰·태블릿)은 "사진 올리기 | 촬영하기" 두 칸. 촬영하기는 capture 로 뒷면 카메라를 바로 연다 (HTTPS 없이 된다). PC 는 지금 capture 를 무시해서 한 칸

// 인식이 준 네모를 사진 안으로 (모델이 1 을 조금 넘게 줄 때가 있다)
function clampBox(b: PhotoBox): PhotoBox {
  const x = Math.min(Math.max(b.x, 0), 1)
  const y = Math.min(Math.max(b.y, 0), 1)
  return { x, y, w: Math.max(0.01, Math.min(b.w, 1 - x)), h: Math.max(0.01, Math.min(b.h, 1 - y)) }
}

// 사진의 box 부분만 원래 해상도로 잘라 JPEG 파일로
function crop(img: HTMLImageElement, box: PhotoBox): Promise<File> {
  const [W, H] = [img.naturalWidth, img.naturalHeight]
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(box.w * W)
  canvas.height = Math.round(box.h * H)
  canvas.getContext('2d')!.drawImage(img, box.x * W, box.y * H, canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], 'crop.jpg', { type: 'image/jpeg' })) : reject(new Error('사진을 자르지 못했어요'))), 'image/jpeg', 0.92),
  )
}

export function PhotoUpload({ onScene, onPhoto }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [box, setBox] = useState<PhotoBox | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null) // 네모를 그리기 시작한 점
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo])
  const loading = state.kind === 'loading' || state.kind === 'preparing'
  // 내 학습지 보관함 (worksheets.md W3): 이 기기 안. 읽기에 성공하면 저장하고, 누르면 /analyze 없이 다시 연다
  const [shelf, setShelf] = useState<WorksheetItem[]>([])
  const refreshShelf = () => void listWorksheets().then(setShelf)
  useEffect(refreshShelf, [])
  // 읽는 동안 지난 초 (팀 테스트 엔진 agy 는 2분쯤 걸린다, worksheets.md W4)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (state.kind !== 'loading') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [state.kind])
  const seconds = state.kind === 'loading' ? Math.max(0, Math.round((now - state.since) / 1000)) : 0

  // 이 사진을 기준 사진으로 (고른 사진, 편 사진)
  const setBase = (file: File) => {
    const url = URL.createObjectURL(file)
    setPhoto({ file, url })
    setBox(null)
    onPhoto(url)
    setState({ kind: 'picking' })
  }

  const pick = async (original: File) => {
    setState({ kind: 'preparing' })
    setBase(await prepPhoto(original))
  }

  // 옆으로 찍은 학습지를 바로 세운다 (worksheets.md W5). 돌린 사진이 기준 사진이 되어 네모·칸 밑 사진이 모두 그 방향
  const turn = async (turns: number) => {
    if (!photo) return
    setState({ kind: 'preparing' })
    setBase(await rotatePhoto(photo.file, turns))
  }

  // 보관함에서 열기: 사진 인식이 성공했을 때와 같은 길 (onPhoto → onScene). App 은 다르게 다루지 않는다
  const openSaved = async (id: string) => {
    const w = await getWorksheet(id)
    if (!w) return refreshShelf()
    const file = new File([w.photo], 'photo.jpg', { type: w.photo.type || 'image/jpeg' })
    setBase(file)
    onScene(w.scene, w.place)
    setState({ kind: 'done', scene: w.scene })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 사진을 다시 골라도 onChange 가 오게
    if (file) pick(file)
  }

  const read = async (part: PhotoBox | null) => {
    if (!photo || !img.current) return
    setState({ kind: 'loading', since: Date.now() })
    setNow(Date.now())
    try {
      const file = part ? await crop(img.current, part) : photo.file
      const scene = await analyze(file)
      // 전체를 읽었으면 인식이 알려 준 사진 속 전개도 네모(photoBox)로 칸 밑 사진을 맞춘다 (worksheets.md W8)
      const where = part ?? (scene.photoBox ? clampBox(scene.photoBox) : null)
      const place = where && { box: where, aspect: img.current.naturalWidth / img.current.naturalHeight }
      onScene(scene, place)
      setState({ kind: 'done', scene })
      const thumb = await prepPhoto(photo.file, 240)
      await saveWorksheet({ name: defaultName(scene, new Date()), photo: photo.file, thumb, scene, place })
      refreshShelf()
    } catch (e) {
      setState({ kind: e instanceof OfflineError ? 'soft' : 'error', message: (e as Error).message })
    }
  }

  // 사진 위 점 → 사진 비율 0~1
  const pointAt = (e: React.PointerEvent) => {
    const r = img.current!.getBoundingClientRect()
    const clamp = (v: number) => Math.max(0, Math.min(1, v))
    return { x: clamp((e.clientX - r.left) / r.width), y: clamp((e.clientY - r.top) / r.height) }
  }
  const boxOf = (a: { x: number; y: number }, b: { x: number; y: number }): PhotoBox => ({
    x: Math.min(a.x, b.x),
    y: Math.min(a.y, b.y),
    w: Math.abs(a.x - b.x),
    h: Math.abs(a.y - b.y),
  })
  const usable = !!box && box.w > MIN_BOX && box.h > MIN_BOX

  return (
    <div className="photo-upload" data-state={state.kind}>
      <div className="upload-buttons">
        <label className={`upload-button${loading ? ' disabled' : ''}`}>
          {TOUCH ? (photo ? '다른 사진 올리기' : '사진 올리기') : photo ? '다른 사진 올리기' : '학습지 사진 올리기'}
          <input type="file" accept="image/*" disabled={loading} onChange={onFile} />
        </label>
        {TOUCH && (
          <label className={`upload-button${loading ? ' disabled' : ''}`}>
            {photo ? '다시 촬영하기' : '촬영하기'}
            <input type="file" accept="image/*" capture="environment" disabled={loading} onChange={onFile} />
          </label>
        )}
      </div>
      <WorksheetShelf
        items={shelf}
        disabled={loading}
        onOpen={openSaved}
        onRename={(id, name) => void renameWorksheet(id, name).then(refreshShelf)}
        onDelete={(id) => void deleteWorksheet(id).then(refreshShelf)}
      />
      {photo && state.kind === 'straighten' && (
        <CornerPick url={photo.url} onDone={setBase} onCancel={() => setState({ kind: 'picking' })} />
      )}
      {photo && state.kind !== 'straighten' && (
        <div
          className={`photo-pick${loading ? ' disabled' : ''}`}
          onPointerDown={(e) => {
            if (loading) return
            e.currentTarget.setPointerCapture(e.pointerId)
            const p = pointAt(e)
            setDrag(p)
            setBox({ ...p, w: 0, h: 0 })
          }}
          onPointerMove={(e) => drag && setBox(boxOf(drag, pointAt(e)))}
          onPointerUp={() => setDrag(null)}
        >
          <img ref={img} src={photo.url} alt="올린 학습지 사진" draggable={false} />
          {state.kind === 'loading' && <div className="reading-scan" aria-hidden />}
          {box && <div className="pick-box" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }} />}
        </div>
      )}
      {photo && state.kind !== 'straighten' && (
        <div className="pick-buttons">
          <button type="button" className="primary-button" disabled={loading || !usable} onClick={() => read(box)}>
            이 부분 읽기
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => read(null)}>
            사진 전체 읽기
          </button>
        </div>
      )}
      {photo && state.kind !== 'straighten' && (
        <div className="pick-tools">
          <button type="button" className="secondary-button" disabled={loading} onClick={() => turn(3)} aria-label="사진을 왼쪽으로 돌리기">
            ↺ 돌리기
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => turn(1)} aria-label="사진을 오른쪽으로 돌리기">
            돌리기 ↻
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => setState({ kind: 'straighten' })}>
            종이 펴기
          </button>
        </div>
      )}
      <p className={`upload-status ${state.kind}`} role="status">
        {state.kind === 'idle' && '학습지 사진을 올리면 도형이 나타나요'}
        {state.kind === 'preparing' && '사진을 준비하고 있어요…'}
        {state.kind === 'straighten' && '동그라미 네 개를 학습지 네 귀퉁이에 맞춰 주세요'}
        {state.kind === 'picking' && '읽을 전개도를 네모로 딱 맞게 감싸 주세요'}
        {state.kind === 'loading' && (
          <>
            사진에서 도형을 찾고 있어요… {seconds}초
            {seconds >= 30 && (
              <>
                <br />
                조금 더 걸려요. 그동안 <a href="#manual-input">아래에서 직접 그려 봐도 돼요</a>
              </>
            )}
          </>
        )}
        {state.kind === 'done' && '도형을 찾았어요. 접어 보세요! 다른 부분도 감싸서 읽을 수 있어요'}
        {state.kind === 'soft' && <a href="#manual-input">{state.message}</a>}
        {state.kind === 'error' && (
          <>
            {state.message}
            <br />
            <a href="#manual-input">아래에서 사진을 따라 전개도를 그려 보세요</a>
          </>
        )}
      </p>
      {state.kind === 'done' && <NetPreview scene={state.scene} />}
    </div>
  )
}
