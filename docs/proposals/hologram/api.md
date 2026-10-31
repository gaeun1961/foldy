# 홀로그램 연동 API (초안, 구현 안 함)

> 제안 다음 단계의 초안이다. 팀 합의 전이며 `docs/specs/api.md`가 아니다. 개요는 [README.md](README.md).

## 왜 필요한가

지금은 홀로그램을 띄운 기기에서 도형을 만든다. 시연에서는 노트북(또는 다른 태블릿)으로 도형을 고르고 접는 동안, 아크릴을 올린 휴대폰이 그 도형을 따라 보여 주면 좋다. 기기가 다르므로 backend가 중계한다. 같은 브라우저 탭끼리만 되는 `BroadcastChannel`로는 안 된다.

LLM 호출이 없으므로 키 문제는 없다. 저장·로그인도 없다.

## 흐름

1. 조작하는 화면(책 화면)에서 "다른 기기로 홀로그램" → 방을 만들고 방 코드와 QR을 보여 준다
2. 휴대폰이 QR(`/?holo={room}`)을 열면 바로 홀로그램 보기로 시작한다 (책 화면 없이)
3. 조작하는 화면이 도형·펼침 값을 바꿀 때마다 방에 보낸다. 휴대폰은 받아서 그린다

## 엔드포인트

### `POST /api/holo/rooms`

방을 만든다.

```json
// 응답 200
{ "room": "4831", "expiresIn": 3600 }
```

- `room`: 숫자 4자리. 겹치면 다시 뽑는다
- 마지막 갱신 뒤 `expiresIn`초가 지나면 지운다 (메모리에만 둔다)

### `PUT /api/holo/rooms/{room}`

조작하는 화면의 지금 상태. 바뀔 때마다 보낸다 (슬라이더를 끄는 동안은 0.1초에 한 번까지).

```json
// 요청
{
  "scene": { "shape": "cuboid", "size": { "width": 4, "depth": 2, "height": 3 }, "...": "ShapeScene 그대로" },
  "unfold": 0.4,
  "foldMode": "step",
  "follow": true
}
// 응답 204
```

- `scene`: ShapeScene (`docs/specs/shape-scene.md`). backend는 `schema.py`로 검사만 한다
- `unfold`: 펼침 값 s (0 = 입체, 1 = 전개도). `follow`가 `true`면 홀로그램이 자체 반복 대신 이 값을 따른다
- `foldMode`: `'all' | 'step'`
- 없는 방이면 404, 검사 실패면 422

### `GET /api/holo/rooms/{room}/events`

Server-Sent Events. 홀로그램 기기가 연결해 받는다.

```
event: state
data: {"scene": {...}, "unfold": 0.4, "foldMode": "step", "follow": true}
```

- 연결하자마자 마지막 상태를 한 번 보낸다
- 방이 지워지면 `event: closed`를 보내고 끊는다
- 15초마다 주석 줄(`: ping`)로 연결을 유지한다

## 홀로그램 쪽 변화 (합의되면 spec.md에 더할 것)

- `HologramViewer`에 `unfold?: number` prop을 더한다. 주면 자체 반복(`fold`) 대신 그 값으로 접는다
- 휴대폰은 화면을 누를 수 없으므로(아크릴) 연결 상태를 가운데 사각형 안에 작은 점으로 보인다 (초록 = 연결, 회색 = 끊김)

## 위험

- 같은 와이파이·같은 서버에 붙어야 한다. 시연장 와이파이가 기기 간 통신을 막으면 노트북 핫스팟을 쓴다
- Wake Lock·전체 화면은 HTTPS가 필요할 수 있다. 시연은 배포 주소(HTTPS)로 하는 편이 낫다
- 방 코드는 4자리라 추측할 수 있다. 저장하는 정보가 없고 1시간이면 지워져서 시연 범위에서는 받아들인다
