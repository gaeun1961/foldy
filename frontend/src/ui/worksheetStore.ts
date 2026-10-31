// 내 학습지 보관함 (docs/specs/worksheets.md W3): 사진 인식에 성공한 학습지를 이 기기 브라우저(IndexedDB)에 둔다.
// 서버로 보내지 않는다 (로그인 없음, 학생 사진이 밖으로 나가지 않음). 다시 열면 /analyze 없이 바로 3D
import type { ShapeScene } from '../shared/types.ts'
import { shapeName } from './foldStatus.ts'
import type { PhotoBox } from './manualScene.ts'

export interface SavedWorksheet {
  id: string
  savedAt: number
  name: string
  photo: Blob // 기준 사진 (줄이고·돌리고·편 사진)
  thumb: Blob // 목록용 작은 사진
  scene: ShapeScene // /analyze 결과 그대로
  place: { box: PhotoBox; aspect: number } | null // 사진 속 전개도 네모 (칸 밑 사진 맞춤)
  more?: { scene: ShapeScene; place: { box: PhotoBox; aspect: number } | null }[] // 여러 도형 문제의 ②번부터 (worksheets.md 여러 도형)
}
export type WorksheetItem = Omit<SavedWorksheet, 'photo'>

export const MAX_SAVED = 30 // 넘으면 오래된 것부터 지운다 (사진 30장 ≈ 10MB)
const DB = 'foldy'
const STORE = 'worksheets'

// 기본 이름: "정육면체 · 10/31 14:20"
export function defaultName(scene: ShapeScene, at: Date): string {
  const two = (n: number) => String(n).padStart(2, '0')
  return `${shapeName(scene)} · ${at.getMonth() + 1}/${at.getDate()} ${two(at.getHours())}:${two(at.getMinutes())}`
}

// 하나를 더 넣을 때 지울 것: 최신 max - 1 개만 남기고 나머지 (오래된 것)
export function overflow(items: { id: string; savedAt: number }[], max = MAX_SAVED): string[] {
  return [...items]
    .sort((a, b) => b.savedAt - a.savedAt)
    .slice(Math.max(0, max - 1))
    .map((w) => w.id)
}

let opening: Promise<IDBDatabase | null> | null = null
// IndexedDB 를 못 쓰면(사생활 보호 모드 등) null. 그때 보관함은 숨긴다
function db(): Promise<IDBDatabase | null> {
  opening ??= new Promise((resolve) => {
    if (typeof indexedDB === 'undefined') return resolve(null)
    const req = indexedDB.open(DB, 1)
    req.onupgradeneeded = () => req.result.createObjectStore(STORE, { keyPath: 'id' })
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => resolve(null)
  })
  return opening
}

function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T> | void): Promise<T | undefined> {
  return db().then(
    (d) =>
      new Promise((resolve) => {
        if (!d) return resolve(undefined)
        const tx = d.transaction(STORE, mode)
        const req = work(tx.objectStore(STORE))
        tx.oncomplete = () => resolve(req ? req.result : undefined)
        tx.onerror = () => resolve(undefined)
      }),
  )
}

export const storeAvailable = () => db().then((d) => d !== null)

export async function listWorksheets(): Promise<WorksheetItem[]> {
  const all = (await run<SavedWorksheet[]>('readonly', (s) => s.getAll() as IDBRequest<SavedWorksheet[]>)) ?? []
  return all.map(({ photo: _photo, ...rest }) => rest).sort((a, b) => b.savedAt - a.savedAt)
}

export async function getWorksheet(id: string): Promise<SavedWorksheet | null> {
  return ((await run<SavedWorksheet>('readonly', (s) => s.get(id) as IDBRequest<SavedWorksheet>)) as SavedWorksheet | undefined) ?? null
}

export async function saveWorksheet(w: Omit<SavedWorksheet, 'id' | 'savedAt'>): Promise<string> {
  const old = overflow(await listWorksheets())
  const id = crypto.randomUUID()
  await run('readwrite', (s) => {
    old.forEach((k) => s.delete(k))
    s.put({ ...w, id, savedAt: Date.now() })
  })
  return id
}

export async function renameWorksheet(id: string, name: string): Promise<void> {
  const w = await getWorksheet(id)
  if (w) await run('readwrite', (s) => void s.put({ ...w, name }))
}

export async function deleteWorksheet(id: string): Promise<void> {
  await run('readwrite', (s) => void s.delete(id))
}
