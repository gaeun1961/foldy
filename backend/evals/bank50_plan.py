import json
from pathlib import Path

root = Path("D:/가천대학교/26-2/해커톤/_테스트 학습지/퓨샷/7. bank50")
p = {
    "started_at_utc": "2026-11-01T04:29:33Z",
    "stop_new_work_at_utc": "2026-11-01T04:49:33Z",
    "mode": "20분 경과시 신규작업중단; 진행중 마무리 후 HTML",
    "target_samples": 50,
    "target_is_guarantee": False,
    "splits": "demo_development; 기존 평가자료 재사용으로 일반화 평가아님",
    "workers": [
        {
            "role": "R13/R14/R15 신규문제13개 및 교사라벨",
            "worktree": "D:/_개발/foldy-bench-tools/worktrees/bank50-data-a",
        },
        {
            "role": "R12 신규문제13개 및 교사라벨",
            "worktree": "D:/_개발/foldy-bench-tools/worktrees/bank50-data-b",
        },
        {
            "role": "기존24개 통합·중복검토·ShapeScene/렌더검증",
            "worktree": "D:/_개발/foldy-bench-tools/worktrees/bank50-verify",
        },
        {
            "role": "API실측·시간관리·상태집계·HTML보고",
            "worktree": "D:/_개발/foldy-bench-tools/worktrees/bank50-integration",
        },
    ],
}
(root / "plan.json").write_text(
    json.dumps(p, ensure_ascii=False, indent=2), encoding="utf8"
)
rows = "".join(
    f"<tr><td>{w['role']}</td><td>{w['worktree']}</td></tr>" for w in p["workers"]
)
page = """<!doctype html><html lang="ko"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>20분 병렬 실행 계획</title><style>body{font:22px/1.8 system-ui;background:#eef2f5;color:#17374c;margin:0}main{max-width:1150px;margin:auto;padding:32px}section{padding:26px;background:white;border-radius:18px;margin:24px 0}h1{font-size:2.2em;line-height:1.3}table{width:100%;border-collapse:collapse;font-size:.8em}td{padding:14px;border-bottom:1px solid #ddd;overflow-wrap:anywhere}li{margin:12px 0}</style><main><h1>20분 병렬 워크트리 계획</h1><p>시작 13:29:33 KST · 신규 작업 중단 13:49:33 KST</p><section><h2>수량과 완료 기준</h2><p>기존24개 + 신규26개 = 최대50개 사례를 목표로 합니다. 교재 예시/선택지/독립문제를 구분하고 중복 문제는 별도 집계합니다. 50개 크롭을 만들었다고 50개 3D 검증을 완료했다고 세지 않습니다.</p><ul><li>자료 준비: 원본 출처·문제 영역·선택 도형·중복그룹</li><li>교사 검수: 종류·치수·면 연결·지원 상태·가정</li><li>실측: 실제 모델 응답·시간·토큰, 동일 사례 예시 재현 여부</li><li>3D 검증: 계약·기하·실제 뷰어 실행을 구분</li></ul></section><section><h2>워크트리 분담</h2><table>ROWS</table></section><section><h2>시간 배분</h2><p>0~3분: 작업분리와 기존자료통합. 3~13분: 신규크롭/교사라벨, 완료분부터 API실측. 13~18분: 장면검증·시연후보확정. 20분 도달: 신규작업중단, 실행중인작업만마무리하고 HTML보고.</p><p>최종 숫자는 준비/라벨검수/실측/3D검증을 각각 표시합니다. 미검증과 표현미지원 사례도 사유를 남깁니다.</p></section><section><h2>시연 해석</h2><p>모든 사례는 사전에 준비한 시연 개발자료로 사용합니다. 같은 사진과 정답이 퓨샷에 들어간 실험은 '동일 예시 재현'이며 새 문제 성능이 아닙니다. 검수 장면 재사용은 실시간 AI 생성과 구분해 표시합니다.</p><p>서비스코드·계약은 그대로 두고 외부 자료와 재현 스크립트를 만듭니다. 사용자사진·API키는 git에 넣지 않습니다.</p></section></main></html>"""
(root / "reports/plan.html").write_text(page.replace("ROWS", rows), encoding="utf8")
