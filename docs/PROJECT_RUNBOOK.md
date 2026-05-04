# 쿨라워 꽃잡기 프로젝트 관리 노트

이 문서는 나중에 Codex에게 바로 지시해서 실행할 수 있도록 현재 프로젝트 상태, 브랜치 역할, 자주 쓰는 명령, 다음 작업 지시문을 정리한 운영 노트입니다.

## 저장소

- GitHub: https://github.com/KUCaver/cool-flower-catcher
- 로컬 경로: `C:\Users\gando\OneDrive\바탕 화면\건국대학교\건국대학교3학년 1학기\공모전\똥아리\쿨라워꽃잡기`
- 개발 서버: `http://127.0.0.1:5174`

## 브랜치 역할

| 브랜치 | 역할 | 기준 커밋 |
| --- | --- | --- |
| `main` | 초기 MVP. 안정 복구 기준 | `340cc2c` |
| `backup/initial-mvp` | 초기 MVP 고정 백업 | `340cc2c` |
| `codex/festival-distance-calibration` | 축제 거리/캘리브레이션 개선 버전 | `af18e41` 이후 |
| `codex/gameplay-arcade-loop` | 꽃 타입/콤보/피버/결과/랭킹을 넣은 1차 게임화 버전 | `codex/festival-distance-calibration`에서 분기 |

원칙:

- `main`은 사용자가 명시적으로 요청하기 전까지 건드리지 않는다.
- 새 기능은 `codex/...` 브랜치에서 작업한다.
- 복구 확인은 `backup/initial-mvp` 또는 `main`으로 전환해서 한다.
- 기능이 마음에 들 때만 PR 또는 merge로 `main`에 반영한다.

## 빠른 명령

현재 브랜치 확인:

```bash
npm run branch:list
```

초기 MVP로 전환:

```bash
npm run branch:initial
```

현재 축제 보정 버전으로 전환:

```bash
npm run branch:festival
```

게임화 작업 브랜치로 전환:

```bash
npm run branch:gameplay
```

개발 서버 실행:

```bash
npm run dev
```

빌드 검증:

```bash
npm run verify
```

Windows exe 생성:

```bash
npm run build
Compress-Archive -Path .\dist\* -DestinationPath .\launcher\CoolFlowerCatcherLauncher\app-dist.zip -Force
dotnet publish .\launcher\CoolFlowerCatcherLauncher\CoolFlowerCatcherLauncher.csproj -c Release -r win-x64 --self-contained true -p:PublishSingleFile=true -p:EnableCompressionInSingleFile=true -o .\launcher\publish
```

생성 결과:

```txt
launcher\publish\쿨라워꽃잡기.exe
```

## Codex에게 바로 줄 지시문

### 게임화 작업 시작

```txt
쿨라워꽃잡기 프로젝트에서 게임화 작업을 시작해줘.
먼저 `docs/PROJECT_RUNBOOK.md`와 `docs/GAME_DESIGN_PROMPT.md`를 읽고, `main`은 건드리지 말고 새 `codex/gameplay-arcade-loop` 브랜치를 따서 작업해줘.
우선순위는 꽃 타입 확장, 콤보/피버, 결과 칭호, localStorage 랭킹이야.
구현 후 `npm run build`를 통과시키고 현재 작업 브랜치에만 push해줘.
```

### 초기 MVP로 확인

```txt
쿨라워꽃잡기 프로젝트에서 초기 MVP 버전을 확인하고 싶어.
`backup/initial-mvp` 브랜치로 전환하고, `npm install`이 필요한지 확인한 뒤 `npm run dev`로 실행해줘.
작업 전후에 `git status -sb`와 현재 브랜치를 알려줘.
```

### 축제 거리 보정 버전으로 복귀

```txt
쿨라워꽃잡기 프로젝트에서 축제 거리 보정 버전으로 돌아가줘.
`codex/festival-distance-calibration` 브랜치로 전환하고 `npm run build`로 검증한 뒤 개발 서버가 켜져 있는지 확인해줘.
```

### 새 기능 작업 시작

```txt
쿨라워꽃잡기 프로젝트에서 새 기능을 작업해줘.
먼저 `git status -sb`, `git branch -vv`를 확인하고, `main`은 건드리지 말고 현재 개선 브랜치에서 새 `codex/...` 브랜치를 따서 작업해줘.
구현 후 `npm run build`를 통과시키고, 변경 요약과 되돌리는 방법을 함께 정리해줘.
```

### 변경분 GitHub에 올리기

```txt
쿨라워꽃잡기 프로젝트의 현재 변경분을 확인하고 GitHub에 올려줘.
먼저 `git status -sb`와 `git diff --stat`로 범위를 확인하고, 관련 파일만 stage한 뒤 커밋해줘.
`npm run build` 통과 후 현재 브랜치에 push해줘. `main`에는 merge하지 마.
```

### 이전 버전으로 복구

```txt
쿨라워꽃잡기 프로젝트를 이전 초기 MVP 버전으로 복구해서 확인하고 싶어.
작업 중인 변경분이 있으면 먼저 알려주고, 안전하면 `backup/initial-mvp` 브랜치로 전환해줘.
전환 후 `npm run dev`로 실행 가능한 상태인지 확인해줘.
```

## 축제 운영 기준

- 권장 손 거리: 카메라에서 약 `70~100cm`
- 허용 손 거리: 약 `50~120cm`
- 바닥 표시: 카메라 기준 `80~90cm` 위치
- 손 인식 기준: 실제 cm가 아니라 `palmWidthPx`
- 시작 전 캘리브레이션: 너무 멀거나 너무 가까우면 시작 차단
- 꽃 생성 영역: 화면 중앙 ROI
- 카메라 권장값: `1280x720`, `30fps`

## 다음 개발 후보

우선순위 높은 순서:

1. 게임화 2차: 물방울/쿨브리즈/햇살꽃 파워업 추가
2. 운영자 설정 패널: 게임 시간, 민감도, 거리 기준값
3. MediaPipe 모델 파일 로컬 저장으로 오프라인 운영 안정화
4. 포토카드/결과 이미지 생성
5. 실제 웹캠 거리별 QA 결과를 문서화

## 게임화 1차 변경 요약

브랜치: `codex/gameplay-arcade-loop`

추가된 내용:

- `gameConfig.ts` 기준으로 게임 시간, ROI, 스폰 속도, 꽃 타입 설정 분리
- 꽃 타입 4종 추가: 기본꽃, 반짝꽃, 쿨라워꽃, 시든꽃
- 콤보 배율 추가: x1.0, x1.2, x1.5, x2.0
- 마지막 5초 `COOLLOWER FEVER` 연출과 점수 배율 추가
- 시든꽃 감점 및 콤보 초기화
- 점수 float text, 콤보 text, 피버 overlay 추가
- 결과 화면 추가: 최종 점수, 최고 콤보, 잡은 꽃, 시든꽃, 칭호
- localStorage 랭킹 추가: 닉네임과 점수만 저장, 카메라 영상 저장 없음

되돌리는 방법:

```bash
git switch codex/festival-distance-calibration
```

초기 MVP까지 되돌려 확인하려면:

```bash
git switch backup/initial-mvp
```

## 안전 규칙

- 카메라 영상은 저장하지 않는다.
- 사용자 동의 문구 없이 사진/영상 캡처 기능을 넣지 않는다.
- 현장에서는 게임 시작 전 손 인식 상태가 안정적인지 확인한다.
- `git reset --hard`, 강제 push, `main` merge는 사용자가 명시적으로 요청할 때만 한다.
- exe는 로컬 서버를 띄우고 브라우저를 여는 런처다. 창을 닫으면 게임도 종료된다.
