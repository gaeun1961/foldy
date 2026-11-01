import { useEffect, useRef, useState } from 'react'
import type { ShapeScene } from '../shared/types'
import { analyze, OfflineError } from './api'
import { ITEM_LABELS, MAX_ITEMS } from '../viewer'
import { CornerPick } from './CornerPick'
import { NetPreview } from './NetPreview'
import { TOUCH } from './device'
import { prepPhoto, rotatePhoto } from './photoPrep'
import { suggestShapes } from './suggestBoxes'
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
  onManual?: () => void // 인식이 실패해 직접 만들기로 안내할 때 (접혀 있으면 펼친다, worksheets.md)
  onShapes?: (shapes: { scene: ShapeScene; place: PhotoPlace | null }[]) => void // 도형을 여러 개 읽었을 때 (①부터 순서대로). 없으면 onScene 으로 첫 도형만
  onReading?: (reading: boolean) => void // 사진을 읽는 중인지. 그동안 3D 책에서 펜이 사진 위를 칠한다 (viewer.md "빈 책" 읽는 중)
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

export function PhotoUpload({ onScene, onPhoto, onManual, onReading, onShapes }: Props) {
  const [state, setState] = useState<State>({ kind: 'idle' })
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [box, setBox] = useState<PhotoBox | null>(null)
  const [drag, setDrag] = useState<{ x: number; y: number } | null>(null) // 네모를 그리기 시작한 점
  // 2단계 네모 (worksheets.md): ① 문제 전체(문장과 그림) → ② 그 안에서 도형만. 문제 칸은 글자만, 도형 칸은 모양만 따로 동시에 읽는다
  const [problemBox, setProblemBox] = useState<PhotoBox | null>(null)
  const [step, setStep] = useState<'problem' | 'shape'>('problem')
  const [shapes, setShapes] = useState<PhotoBox[]>([]) // ② 에서 "도형 더하기"로 모은 네모 (①②③…, 최대 6개)
  const [suggested, setSuggested] = useState(false) // shapes 가 ① 문제 칸에서 찾은 추천 네모인지 (worksheets.md "추천 네모")
  const [lying, setLying] = useState(false) // 문제 칸 글 줄이 세로 (사진이 누움) → 추천 대신 "돌려 주세요"
  const img = useRef<HTMLImageElement>(null)
  useEffect(() => () => void (photo && URL.revokeObjectURL(photo.url)), [photo])
  const loading = state.kind === 'loading' || state.kind === 'preparing'
  // 내 학습지 보관함 (worksheets.md W3): 이 기기 안. 읽기에 성공하면 저장하고, 누르면 /analyze 없이 다시 연다
  const [shelf, setShelf] = useState<WorksheetItem[]>([])
  const refreshShelf = () => void listWorksheets().then(setShelf, () => setShelf([]))
  useEffect(refreshShelf, [])
  // 읽는 동안 지난 초 (팀 테스트 엔진 agy 는 2분쯤 걸린다, worksheets.md W4)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (state.kind !== 'loading') return
    const t = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(t)
  }, [state.kind])
  const reading = state.kind === 'loading'
  useEffect(() => onReading?.(reading), [reading, onReading])
  const seconds = state.kind === 'loading' ? Math.max(0, Math.round((now - state.since) / 1000)) : 0

  // 이 사진을 기준 사진으로 (고른 사진, 편 사진)
  const setBase = (file: File) => {
    const url = URL.createObjectURL(file)
    setPhoto({ file, url })
    setBox(null)
    setProblemBox(null)
    setShapes([])
    setLying(false)
    setStep('problem')
    onPhoto(url)
    setState({ kind: 'picking' })
  }

  // 사진 준비·돌리기가 실패하면(메모리 부족, 모르는 형식) 버튼이 꺼진 채 멈추지 않게 오류로 돌린다 (코드 검토)
  const prepare = async (make: () => Promise<File>) => {
    setState({ kind: 'preparing' })
    try {
      setBase(await make())
    } catch {
      setState({ kind: 'error', message: '사진을 열지 못했어요. 다른 사진으로 해 볼까요?' })
    }
  }

  const pick = (original: File) => prepare(() => prepPhoto(original))

  // 옆으로 찍은 학습지를 바로 세운다 (worksheets.md W5). 돌린 사진이 기준 사진이 되어 네모·칸 밑 사진이 모두 그 방향
  const turn = async (turns: number) => {
    if (!photo) return
    await prepare(() => rotatePhoto(photo.file, turns))
  }

  // 보관함에서 열기: 사진 인식이 성공했을 때와 같은 길 (onPhoto → onScene). App 은 다르게 다루지 않는다
  const openSaved = async (id: string) => {
    const w = await getWorksheet(id)
    if (!w) return refreshShelf()
    const file = new File([w.photo], 'photo.jpg', { type: w.photo.type || 'image/jpeg' })
    setBase(file)
    if (w.more?.length && onShapes) onShapes([{ scene: w.scene, place: w.place }, ...w.more])
    else onScene(w.scene, w.place)
    setState({ kind: 'done', scene: w.scene })
  }

  const onFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    e.target.value = '' // 같은 사진을 다시 골라도 onChange 가 오게
    if (file) pick(file)
  }

  // parts: 도형 네모들 (없으면 사진 전체). 여러 개면 동시에 읽고, 문제 글은 ① 하나에만 보내 모두에 붙인다 (worksheets.md 여러 도형)
  const read = async (parts: PhotoBox[] | null, problemPart: PhotoBox | null = null) => {
    if (!photo || !img.current) return
    setState({ kind: 'loading', since: Date.now() })
    setNow(Date.now())
    try {
      const pic = img.current
      const aspect = pic.naturalWidth / pic.naturalHeight
      const problemFile = problemPart ? await crop(pic, problemPart) : undefined
      const boxes = parts?.length ? parts : [null] // null 도 사진 전체로 (화면 갱신 중 옛 버튼이 read(null) 로 부른 적이 있다)
      const files = await Promise.all(boxes.map((b) => (b ? crop(pic, b) : Promise.resolve(photo.file))))
      const scenes = await Promise.all(files.map((f, i) => analyze(f, i === 0 ? problemFile : undefined)))
      const problem = scenes[0].problem
      const found = scenes.map((scene, i) => {
        const withProblem = problem && !scene.problem ? ({ ...scene, problem } as ShapeScene) : scene
        // 전체를 읽었으면 인식이 알려 준 사진 속 전개도 네모(photoBox)로 칸 밑 사진을 맞춘다 (worksheets.md W8)
        const where = boxes[i] ?? (scene.photoBox ? clampBox(scene.photoBox) : null)
        return { scene: withProblem, place: where && { box: where, aspect } }
      })
      const [first, ...more] = found
      if (more.length && onShapes) onShapes(found)
      else onScene(first.scene, first.place)
      setShapes([])
      setState({ kind: 'done', scene: first.scene })
      // 보관함 저장은 실패해도 읽기는 성공이다 (예전에는 같은 try 안이라 저장 오류가 "읽기 실패"로 보였다, 코드 검토)
      void prepPhoto(photo.file, 240)
        .then((thumb) => saveWorksheet({ name: defaultName(first.scene, new Date()) + (more.length ? ` 외 ${more.length}개` : ''), photo: photo.file, thumb, scene: first.scene, place: first.place, more }))
        .then(refreshShelf, () => {})
    } catch (e) {
      setState({ kind: e instanceof OfflineError ? 'soft' : 'error', message: (e as Error).message })
      onManual?.()
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
          onPointerUp={(e) => {
            // 끌지 않고 한 번 누르면(탭·클릭) 그 자리의 도형 네모를 지운다. 겹쳐 있으면 가장 작은 것 (추천 네모가 엉뚱한 곳을 잡을 때, 휴대폰 실측)
            const p = pointAt(e)
            if (drag && Math.abs(p.x - drag.x) < MIN_BOX && Math.abs(p.y - drag.y) < MIN_BOX) {
              const hit = shapes
                .map((s, i) => ({ i, area: s.w * s.h, inside: p.x >= s.x && p.x <= s.x + s.w && p.y >= s.y && p.y <= s.y + s.h }))
                .filter((s) => s.inside)
                .sort((a, b) => a.area - b.area)[0]
              if (hit) {
                setShapes(shapes.filter((_, i) => i !== hit.i))
                setBox(null)
              }
            }
            setDrag(null)
          }}
        >
          <img ref={img} src={photo.url} alt="올린 학습지 사진" draggable={false} />
          {state.kind === 'loading' && <div className="reading-scan" aria-hidden />}
          {problemBox && (
            // ① 에서 고른 문제 칸: 점선으로 남겨 둔다 (index.css 는 다른 작업과 겹쳐서 여기서 바로 칠한다)
            <div
              aria-hidden
              style={{ position: 'absolute', pointerEvents: 'none', border: '2px dashed #e07a3f', borderRadius: 4, left: `${problemBox.x * 100}%`, top: `${problemBox.y * 100}%`, width: `${problemBox.w * 100}%`, height: `${problemBox.h * 100}%` }}
            />
          )}
          {shapes.map((s, i) => (
            <div key={i} aria-hidden style={{ position: 'absolute', pointerEvents: 'none', border: '2px solid var(--accent)', borderRadius: 4, left: `${s.x * 100}%`, top: `${s.y * 100}%`, width: `${s.w * 100}%`, height: `${s.h * 100}%` }}>
              <span style={{ position: 'absolute', left: 2, top: 0, font: 'bold 13px sans-serif', color: '#fff', background: 'var(--accent)', borderRadius: 3, padding: '0 3px' }}>{ITEM_LABELS[i]}</span>
            </div>
          ))}
          {box && <div className="pick-box" style={{ left: `${box.x * 100}%`, top: `${box.y * 100}%`, width: `${box.w * 100}%`, height: `${box.h * 100}%` }} />}
        </div>
      )}
      {photo && state.kind !== 'straighten' && step === 'problem' && (
        <div className="pick-buttons">
          <button
            type="button"
            className="primary-button"
            style={{ gridColumn: '1 / -1' }}
            disabled={loading || !usable}
            onClick={() => {
              setProblemBox(box)
              setBox(null)
              setStep('shape')
              // 문제 칸 안 색칠된 도형을 찾아 ② 네모로 미리 깔아 둔다. 못 찾으면 빈 목록 → 지금처럼 직접 감싼다
              const found = img.current && box ? suggestShapes(img.current, box) : { boxes: [], sideways: false }
              setShapes(found.boxes.slice(0, MAX_ITEMS))
              setSuggested(found.boxes.length > 0)
              setLying(found.sideways)
            }}
          >
            다음: 도형 고르기
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => setStep('shape')}>
            문제 없이 도형만
          </button>
          <button type="button" className="secondary-button" disabled={loading} onClick={() => read([])}>
            사진 전체 읽기
          </button>
        </div>
      )}
      {photo && state.kind !== 'straighten' && step === 'shape' && (
        <div className="pick-buttons">
          <button
            type="button"
            className="primary-button"
            disabled={loading || (!usable && !shapes.length)}
            onClick={() => read([...shapes, ...(usable && box ? [box] : [])], problemBox)}
          >
            {shapes.length ? `도형 ${shapes.length + (usable ? 1 : 0)}개 읽기` : '이 도형 읽기'}
          </button>
          <button
            type="button"
            className="secondary-button"
            disabled={loading || !usable || shapes.length >= MAX_ITEMS - 1}
            onClick={() => {
              setShapes([...shapes, box!])
              setBox(null)
              setSuggested(false)
            }}
          >
            도형 더하기 +
          </button>
          {shapes.length > 0 && (
            <button
              type="button"
              className="secondary-button"
              disabled={loading}
              onClick={() => {
                setShapes([])
                setSuggested(false)
              }}
            >
              네모 지우기
            </button>
          )}
          <button
            type="button"
            className="secondary-button"
            style={shapes.length ? undefined : { gridColumn: '1 / -1' }}
            disabled={loading}
            onClick={() => {
              setBox(problemBox)
              setProblemBox(null)
              setShapes([])
              setStep('problem')
            }}
          >
            문제 다시 고르기
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
        {state.kind === 'picking' &&
          (step === 'problem'
            ? '① 문제 전체(문장과 그림)를 네모로 감싸 주세요'
            : lying && !shapes.length
              ? '② 사진이 옆으로 누워 있어 도형을 못 찾았어요. 아래 "돌리기"로 글자를 바로 세운 뒤 문제를 다시 감싸 주세요 (그대로 직접 감싸도 돼요)'
              : shapes.length && suggested
              ? `② 찾은 도형 ${shapes.length}개를 감쌌어요. 맞으면 읽고, 틀린 네모는 한 번 누르면 지워져요`
              : shapes.length
              ? `② 도형 ${shapes.length}개를 골랐어요. 더 있으면 감싸고 "도형 더하기", 다 골랐으면 읽어요. 네모를 한 번 누르면 지워져요`
              : '② 이제 도형(그림)만 네모로 딱 맞게 감싸 주세요. 도형이 여러 개면 하나씩 감싸고 "도형 더하기"')}
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
      {state.kind === 'done' && state.scene.problem && <p className="upload-problem">문제: {state.scene.problem}</p>}
      {state.kind === 'done' && <NetPreview scene={state.scene} />}
    </div>
  )
}
