"""팀 테스트 엔진 Antigravity CLI(agy) 실행 (docs/specs/worksheets.md C, #150).

run(): 사진 한 장과 프롬프트를 agy 에 보내 결과 {"response": 답 글} JSON 문자열을 돌려준다 (vision.cli_scene 이 읽는 모양).
- 미리 띄워 두기: agy 를 stream-json 입력으로 띄워 두면 띄우는 5.5초가 요청 전에 끝나 있다.
  한 번 쓰면 끄고 뒤에서 새로 띄운다 (앞 사진이 대화에 남지 않게). 오래 논 것·죽은 것은 버린다.
  backend 가 죽으면 입력이 닫혀 agy 도 스스로 끝난다 (0.5초, 실측).
- 늦으면 하나 더: HEDGE_S 안에 답이 없으면 같은 요청을 하나 더 보내 먼저 온 답을 쓰고 나머지는 끈다.
  가끔 요청 하나만 40초쯤 늦다 (실측 29번 두 도형: 평소 약 20초, 4회 중 2회 56~62초).
stream-json 입력은 글자만 받아 사진은 `@파일` 로 붙인다 (에이전트가 read_file 로 연다).
명령 실행은 허락하지 않는다 (--sandbox, 권한 건너뛰기 없음).
"""

import json
import mimetypes
import queue
import shutil
import subprocess
import tempfile
import threading
import time
from pathlib import Path

TIMEOUT_S = 300
HEDGE_S = 25  # 평소 15~20초. 이보다 늦으면 하나 더
IDLE_S = (
    600  # 이보다 오래 논 대기 프로세스는 버리고 새로 (로그인·설정이 바뀌었을 수 있어)
)


class AgyError(Exception):
    pass


class _Proc:
    """띄워 둔 agy 하나. 사진은 띄울 때 만든 자기 폴더에 넣는다 (--add-dir)."""

    def __init__(self, model: str):
        exe = shutil.which("agy")
        if not exe:
            raise AgyError("Antigravity CLI(agy) 가 설치돼 있지 않다")
        self.folder = Path(tempfile.mkdtemp(prefix="foldy-agy-"))
        self.born = time.monotonic()
        self.p = subprocess.Popen(
            [exe, "--input-format", "stream-json", "--output-format", "stream-json"]
            + ["--model", model, "--sandbox", "--add-dir", str(self.folder), "-p="],
            cwd=self.folder,
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            encoding="utf-8",
            errors="replace",  # 출력이 utf-8 이 아니어도 예외 대신 (사진 세션 요청)
        )

    def fresh(self) -> bool:
        return self.p.poll() is None and time.monotonic() - self.born < IDLE_S

    def ask(self, image: bytes, content_type: str, ask: str) -> str:
        """ask 의 "{name}" 자리에 사진 파일 이름이 들어간다 (프롬프트에 JSON { } 가 있어 format 은 못 쓴다)."""
        name = "photo" + (mimetypes.guess_extension(content_type) or ".jpg")
        (self.folder / name).write_bytes(image)
        text = f"@{name}\n\n" + ask.replace("{name}", name)
        message = {"event": "user", "message": {"role": "user", "content": text}}
        try:
            out, err = self.p.communicate(
                json.dumps(message, ensure_ascii=False) + "\n", timeout=TIMEOUT_S
            )
        except subprocess.TimeoutExpired as e:
            raise AgyError("Antigravity CLI 시간 초과") from e
        except (OSError, ValueError) as e:  # 그새 끝났거나 다른 쪽이 껐다
            raise AgyError(f"Antigravity CLI 실패: {e}") from e
        finally:
            self.kill()
        for line in reversed(out.splitlines()):
            try:
                event = json.loads(line)
            except json.JSONDecodeError:
                continue
            if event.get("event") == "result":
                result = event.get("result") or {}
                if result.get("status") != "SUCCESS":
                    raise AgyError(f"Antigravity CLI 실패: {result.get('error')}")
                return json.dumps({"response": result.get("response", "")})
        raise AgyError(f"Antigravity CLI 실패: {(err or '')[-300:]}")

    def kill(self) -> None:
        if self.p.poll() is None:
            self.p.kill()
            self.p.wait()
        shutil.rmtree(self.folder, ignore_errors=True)


_pool: dict[str, list[_Proc]] = {}  # 모델 → 대기 중
_keep: dict[str, int] = {}  # 모델 → 대기 수
_pool_lock = threading.Lock()


def warm(model: str, keep: int) -> None:
    """model 로 keep 개를 띄워 둔다 (backend 시작 때). agy 가 없으면 조용히 넘어간다 (요청 때 에러)."""
    with _pool_lock:
        _keep[model] = keep
    _fill(model)


def _fill(model: str) -> None:
    with _pool_lock:
        procs = _pool.setdefault(model, [])
        for p in [p for p in procs if not p.fresh()]:
            procs.remove(p)
            p.kill()
        try:
            while len(procs) < _keep.get(model, 0):
                procs.append(
                    _Proc(model)
                )  # Popen 은 바로 돌아온다. 띄우는 일은 agy 가 알아서
        except AgyError:
            pass


def _take(model: str) -> _Proc:
    with _pool_lock:
        procs = _pool.setdefault(model, [])
        ready = None
        while procs:
            p = procs.pop()
            if p.fresh():
                ready = p
                break
            p.kill()
    threading.Thread(target=_fill, args=(model,), daemon=True).start()
    return ready or _Proc(model)


def run(
    image: bytes, content_type: str, ask: str, model: str, lock: threading.Semaphore
) -> str:
    """lock: 동시에 도는 수 (차례를 기다리는 동안은 HEDGE_S 를 세지 않는다). 하나 더 보낸 것은 lock 밖."""
    with lock:
        results: queue.Queue = queue.Queue()
        started: list[_Proc] = []
        guard = threading.Lock()
        over = (
            threading.Event()
        )  # 답이 정해졌다. 그 뒤에 꺼낸 프로세스는 묻지 않고 끈다

        def attempt() -> None:
            try:
                p = _take(model)
                with guard:
                    if over.is_set():
                        p.kill()  # 늦게 꺼냈다 (하나 더 보내는 중에 첫 답이 왔다)
                        return
                    started.append(p)
                results.put((True, p.ask(image, content_type, ask)))
            except AgyError as e:
                results.put((False, e))

        threading.Thread(target=attempt, daemon=True).start()
        sent, failed = 1, []
        deadline = time.monotonic() + TIMEOUT_S + 10
        try:
            while True:
                wait = HEDGE_S if sent == 1 else deadline - time.monotonic()
                try:
                    ok, value = results.get(timeout=max(wait, 0.1))
                except queue.Empty:
                    if sent == 1:
                        threading.Thread(target=attempt, daemon=True).start()
                        sent = 2
                        continue
                    raise AgyError("Antigravity CLI 시간 초과") from None
                if ok:
                    return value
                failed.append(value)
                if len(failed) == sent:
                    raise failed[0]
        finally:
            with guard:
                over.set()
                done = list(started)
            for p in done:  # 늦은 쪽을 끈다 (이긴 쪽은 이미 끝나 있다)
                p.kill()
