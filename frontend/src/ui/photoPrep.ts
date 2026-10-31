// 올린 사진 다듬기 (docs/specs/mobile.md M2). 휴대폰 사진(3~12MB)을 긴 변 MAX_SIDE 로 줄이고 방향(EXIF)을 맞춰 JPEG 로.
// 네모 고르기·자르기·전개도 칸 밑 사진이 모두 이 결과를 기준으로 한다 (PhotoUpload 의 pick)

export const MAX_SIDE = 1600 // 학습지 글자·선이 읽히는 크기. 바꾸면 evals/vision_eval.py 로 정확도를 다시 잰다

// 긴 변이 maxSide 를 넘으면 비율대로 줄인 크기, 아니면 그대로
export function fitSize(w: number, h: number, maxSide: number): { w: number; h: number } {
  const k = Math.min(1, maxSide / Math.max(w, h))
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) }
}

// canvas 를 JPEG 파일로
export function canvasToFile(canvas: HTMLCanvasElement, name: string): Promise<File> {
  return new Promise((resolve, reject) =>
    canvas.toBlob((b) => (b ? resolve(new File([b], name, { type: 'image/jpeg' })) : reject(new Error('사진을 만들지 못했어요'))), 'image/jpeg', 0.9),
  )
}

// 줄이고 방향을 맞춘 사진. 이미 작은 JPEG·PNG 는 그대로, 브라우저가 읽지 못하는 형식이면 원본 그대로 돌려준다
export async function prepPhoto(file: File, maxSide = MAX_SIDE): Promise<File> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: 'from-image' })
  } catch {
    return file
  }
  const { w, h } = fitSize(bitmap.width, bitmap.height, maxSide)
  if (w === bitmap.width && /^image\/(jpeg|png)$/.test(file.type)) {
    bitmap.close()
    return file
  }
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, w, h)
  bitmap.close()
  return canvasToFile(canvas, 'photo.jpg')
}
