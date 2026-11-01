import { ActivityStore } from './activityStore.ts'
const assert = {
  equal: (a: unknown, b: unknown) => { if (a !== b) throw new Error(`${a} != ${b}`) },
  deepEqual: (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('상태 불일치') },
  ok: (value: unknown) => { if (!value) throw new Error('잠금이 사라짐') },
}
const store = new ActivityStore()
const read = store.begin({ label: '취소', run: () => {} })
const pen = store.begin({ label: '건너뛰기', run: () => {} })
read()
assert.equal(store.snapshot()?.action?.label, '건너뛰기')
read() // 늦은 정리 콜백은 다음 동작 잠금을 풀지 않는다.
assert.ok(store.snapshot())
pen()
assert.equal(store.snapshot(), null)
const prepare = store.begin()
assert.deepEqual(store.snapshot(), { action: null })
prepare()
assert.equal(store.snapshot(), null)
console.log('ok: 동작 인계 중 잠금 유지, 중복 종료·늦은 종료, 준비 상태')
