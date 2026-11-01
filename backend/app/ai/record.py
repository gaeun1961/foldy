"""기록 모드 (개발 모드 전용, docs/specs/worksheets.md H, #159).

backend `.env` 의 VISION_RECORD=1 일 때만 켜진다. /analyze 읽기 한 번을 evals/cases/ 에 폴더 하나로 남긴다.
- begin(): 요청마다 기록판(trace)을 만들어 contextvar 에 둔다. vision·agy 가 note()·event() 로 적는다
  (run_in_threadpool 은 contextvar 를 넘겨준다. vision 이 따로 여는 스레드는 copy_context 로 넘긴다)
- write(): 응답을 돌려준 뒤(BackgroundTasks) 사진·결과·시간을 쓴다. 학생 대기 시간에 들어가지 않는다
사진은 저작권·학생 사진이라 git 에 올리지 않는다 (.gitignore backend/evals/cases/).
"""

import hashlib
import json
import os
import re
import threading
import time
from contextvars import ContextVar
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2] / "evals" / "cases"

_trace: ContextVar[dict | None] = ContextVar("vision_record_trace", default=None)
_folders: dict[str, Path] = {}  # 묶음 id → 폴더 (같은 사진의 여러 읽기를 한 폴더에)
_lock = threading.Lock()


def enabled() -> bool:
    return os.environ.get("VISION_RECORD") == "1"


def begin() -> dict:
    """이 요청의 기록판. 꺼져 있어도 부를 수 있다 (적기만 하고 쓰지 않는다)."""
    trace: dict = {"started": time.time(), "events": []}
    _trace.set(trace)
    return trace


def current() -> dict | None:
    return _trace.get()


def note(**values) -> None:
    """기록판에 값을 적는다 (source="agy" 등). 기록판이 없으면 아무것도 안 한다."""
    trace = _trace.get()
    if trace is not None:
        trace.update(values)


def event(trace: dict | None, **values) -> None:
    """다른 스레드(agy 하나 더 보내기 등)에서도 쓸 수 있게 기록판을 직접 받는다."""
    if trace is not None:
        trace["events"].append(
            {"t": round(time.time() - trace["started"], 2), **values}
        )


def _safe(text: str) -> str:
    return re.sub(r"[^0-9A-Za-z_-]", "", text)[:12] or "x"


def _folder(session: str | None) -> Path:
    with _lock:
        key = session or f"one-{time.time_ns()}"
        if key not in _folders:
            stamp = time.strftime("%Y-%m-%d_%H%M%S")
            _folders[key] = ROOT / f"{stamp}_{_safe(key)[:6]}"
            if len(_folders) > 500:  # 오래 켜 둔 서버에서 끝없이 늘지 않게
                _folders.pop(next(iter(_folders)))
        return _folders[key]


def _next_read(folder: Path) -> Path:
    with _lock:
        n = 1
        while (folder / f"read-{n}").exists():
            n += 1
        path = folder / f"read-{n}"
        path.mkdir(parents=True)
        return path


def _ext(content_type: str | None) -> str:
    return ".png" if content_type == "image/png" else ".jpg"


def write(
    trace: dict,
    image: bytes,
    content_type: str | None,
    problem: bytes | None,
    result: dict,
    record: str | None,
    photo: bytes | None,
    photo_type: str | None,
) -> None:
    """읽기 한 번을 쓴다. record: frontend 가 보낸 JSON 글자 (없거나 깨져도 쓴다)."""
    try:
        info = json.loads(record) if record else {}
        if not isinstance(info, dict):
            info = {"record": info}
    except json.JSONDecodeError:
        info = {"record_raw": record[:2000]}
    session = info.get("session") if isinstance(info.get("session"), str) else None
    folder = _folder(session)
    read = _next_read(folder)

    (read / f"shape{_ext(content_type)}").write_bytes(image)
    if problem:
        (read / f"problem{_ext(content_type)}").write_bytes(problem)
    (read / "result.json").write_text(
        json.dumps(result, ensure_ascii=False, indent=1), encoding="utf-8"
    )
    meta = {
        k: v for k, v in trace.items() if k not in ("started", "finished")
    }  # source, engine, model, events …
    meta.update(
        {
            "time": time.strftime(
                "%Y-%m-%d %H:%M:%S", time.localtime(trace["started"])
            ),
            "seconds": round(trace.get("finished", time.time()) - trace["started"], 2),
            "shape_sha256": hashlib.sha256(image).hexdigest(),
            "problem_sha256": hashlib.sha256(problem).hexdigest() if problem else None,
        }
    )
    (read / "meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=1), encoding="utf-8"
    )

    with _lock:
        session_file = folder / "session.json"
        merged = (
            json.loads(session_file.read_text(encoding="utf-8"))
            if session_file.exists()
            else {}
        )
        merged.update(info)
        merged.setdefault("reads", [])
        merged["reads"].append(read.name)
        session_file.write_text(
            json.dumps(merged, ensure_ascii=False, indent=1), encoding="utf-8"
        )
        if photo and not any(folder.glob("photo.*")):
            (folder / f"photo{_ext(photo_type)}").write_bytes(photo)
