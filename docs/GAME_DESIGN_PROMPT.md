# 쿨라워 꽃잡기 게임화 개발 프롬프트

이 문서는 현재 “손 인식 데모 + 점수판” 상태를 축제 부스용 30초 아케이드 게임으로 발전시키기 위한 재사용 프롬프트입니다. 나중에 Codex에게 “게임화 프롬프트로 작업 시작해줘”라고 지시하면 이 문서를 기준으로 바로 실행할 수 있게 만든 작업 지시서입니다.

## 핵심 판단

현재 구조는 손 인식 기술 데모에 가깝다. 게임처럼 보이려면 다음 요소가 필요하다.

- 목표: 30초 안에 정원을 되살린다.
- 긴장: 좋은 꽃은 잡고, 시든 꽃은 피한다.
- 보상: 점수, 콤보, 피버, 칭호, 랭킹.
- 리듬: 초반 기본 꽃, 중반 희귀/시든 꽃, 마지막 피버.
- 피드백: 큰 점수 텍스트, 콤보 텍스트, 파티클, 사운드.
- 결과 욕구: 다시 하기, 랭킹 등록, 칭호 확인.

## 참고 게임에서 가져올 구조

- Fruit Ninja: 단순 입력, 콤보, 폭탄 회피, 파워업, 하이스코어 욕구.
- Whac-A-Mole: 랜덤 등장 타깃, 빠른 반응, 전 연령 대상 단순 규칙.
- Beat Saber: 타깃 등장 방향, 타이밍, 강한 시각 피드백.
- Just Dance: 설명 없이 따라 할 수 있는 파티형 UX, 관전성.
- MediaPipe hand game examples: pinch 기반 잡기/놓기, 카메라 배경 위 Canvas UI.

## 게임 콘셉트

```txt
쿨라워 정원이 축제 열기로 시들고 있다.
플레이어는 30초 동안 손으로 꽃 에너지를 모아 정원을 되살리는 쿨라워 가드너가 된다.
좋은 꽃은 잡고, 시든 꽃은 피하며, 콤보가 쌓이면 쿨라워 피버가 발동한다.
```

핵심 조작은 늘리지 않는다.

```txt
손 이동 = 커서 이동
open -> grab = 꽃 잡기
```

제스처를 늘리지 말고 게임 오브젝트, 보상, 피드백을 늘린다.

## 30초 라운드 구조

| 구간 | 시간 | 내용 |
| --- | --- | --- |
| 준비 | 0~3초 | 손 인식 준비, 짧은 튜토리얼 |
| Phase 1 | 3~13초 | 기본 꽃 중심, 쉬운 구간 |
| Phase 2 | 13~23초 | 희귀 꽃과 시든 꽃 등장 |
| Fever | 23~30초 | 쿨라워 피버 타임 |
| 결과 | 종료 후 | 점수, 콤보, 칭호, 랭킹 |

## 꽃 타입

| 타입 | 역할 | 점수 | 효과 |
| --- | ---: | ---: | --- |
| 기본꽃 | 기본 타깃 | +10 | 가장 많이 등장 |
| 반짝꽃 | 보너스 타깃 | +30 | 짧게 등장 |
| 쿨라워꽃 | 브랜드 타깃 | +50 | 낮은 확률 등장 |
| 오염방울 | 회피 타깃 | -10 | 꽃에 해로운 오염물, 콤보 초기화 |
| 물방울 | 보조 아이템 | 0 | 4초간 hitbox 확대 |
| 쿨브리즈 | 파워업 | 0 | 4초간 꽃 속도 감소 |
| 햇살꽃 | 파워업 | 0 | 5초간 점수 2배 |

오염방울은 오탐 때문에 과하게 벌주면 안 된다. 추천은 `-10점 + 콤보 초기화`이고, 게임 오버는 넣지 않는다.

## 콤보와 피버

```txt
3콤보  -> NICE x1.2
5콤보  -> COOL x1.5
8콤보  -> FLOWER RUSH x2.0
12콤보 -> COOLLOWER FEVER
마지막 5초 -> FEVER x1.5
```

관전자도 이해할 수 있게 화면 피드백을 크게 표시한다.

```txt
+10
+30
COOL!
5 COMBO
FEVER!
```

## 손 인식 보정

- pinch 판정은 절대 px가 아니라 비율 기반으로 한다.
- `pinchRatio = distance(thumbTip, indexTip) / palmWidth`
- 기본 grab 기준값은 `0.7`로 시작하고 config로 분리한다.
- 손바닥 중심은 landmarks `[0, 5, 9, 13, 17]` 평균으로 계산한다.
- `palmWidthPx`로 거리 상태를 판단한다.
- hitbox는 실제 꽃 이미지보다 크게 둔다.
- grab 전환 직후 `150ms` input buffer를 둔다.
- 손 인식이 `300ms` 이하로 끊기면 miss를 유예한다.
- 배경 사람 손이 잡히지 않도록 active hand를 유지한다.

초기 거리 기준:

```txt
palmWidthPx < 45    -> TOO_FAR
45 ~ 220            -> playable
70 ~ 170            -> recommended
palmWidthPx > 220   -> TOO_CLOSE
```

## 구현 우선순위 압축판

개발 시간이 짧으면 아래 6개만 먼저 넣는다.

```txt
1. 캘리브레이션 화면
2. 중앙 ROI 꽃 생성
3. 꽃 종류 4개: 기본꽃 / 반짝꽃 / 쿨라워꽃 / 오염방울
4. 콤보 배율
5. 마지막 5초 피버 타임
6. 결과 칭호 + localStorage 랭킹
```

이 6개가 들어가면 “손으로 꽃을 잡는 데모”에서 “30초 아케이드 게임”으로 보이기 시작한다.

## Codex 실행 프롬프트

```txt
쿨라워꽃잡기 프로젝트에서 게임화 작업을 시작해줘.

먼저 다음 문서를 읽고 작업 범위를 정리해줘.
- docs/PROJECT_RUNBOOK.md
- docs/GAME_DESIGN_PROMPT.md

브랜치 규칙:
- main은 건드리지 마.
- 현재 브랜치가 codex/festival-distance-calibration인지 확인해.
- 새 작업은 codex/gameplay-arcade-loop 브랜치를 따서 진행해.
- 작업 전 git status -sb, git branch -vv를 확인해.

목표:
현재 손 인식 데모를 축제 부스용 30초 아케이드 게임으로 발전시켜줘.

우선 구현할 MVP:
1. gameConfig.ts 생성
   - flower types
   - score config
   - timing config
   - gesture threshold
   - hitbox multiplier
   - ROI config

2. 게임 오브젝트 확장
   - 기본꽃
   - 반짝꽃
   - 쿨라워꽃
   - 오염방울

3. 점수/콤보 강화
   - combo multiplier
   - 오염방울 감점과 콤보 초기화
   - 마지막 5초 fever multiplier

4. GameCanvas 피드백 강화
   - 점수 float text
   - combo text
   - fever text
   - 손 커서 링 open/grab 상태 차이

5. ResultScreen 추가
   - 최종 점수
   - 최고 콤보
   - 잡은 꽃 수
   - 놓친 꽃 수
   - 쿨라워 칭호
   - 다시하기

6. localStorage 랭킹
   - 닉네임 3~6글자
   - 상위 점수 저장
   - 카메라 영상 저장 금지

완료 조건:
- npm run build 통과
- 30초 라운드가 정상 시작/종료
- 좋은 꽃을 잡으면 점수와 콤보 증가
- 오염방울을 잡으면 감점과 콤보 초기화
- 마지막 5초 피버 타임 동작
- 결과 화면에서 칭호 표시
- localStorage 랭킹 저장
- 변경 요약과 되돌리는 방법을 docs/PROJECT_RUNBOOK.md에 업데이트

주의:
- 제스처는 늘리지 말고 오브젝트와 피드백을 늘려.
- App.tsx 하나에 몰아넣지 말고 game, vision, components, storage로 분리해.
- magic number는 gameConfig.ts로 분리해.
- main에 merge하거나 push하지 마. 현재 작업 브랜치에만 push해.
```

## 칭호 기준

```txt
0~99점     새싹 가드너
100~199점  꽃잎 수집가
200~299점  쿨라워 정원사
300~399점  플라워 마스터
400점 이상 쿨라워 레전드
```

## 참고 링크

- Fruit Ninja: https://play.google.com/store/apps/details?hl=en&id=com.halfbrick.fruitninjafree
- Whac-A-Mole: https://www.bobsspaceracers.com/Whac-A-Mole--Park-And-Building-Games-Park-Group-Games-10-349037.html
- Beat Saber: https://beatsaber.com/
- Just Dance Now: https://justdancenow.com/
- Bubble Shooter MediaPipe example: https://github.com/AmitDas4321/Bubble-Shooter
- MediaPipe Hand Landmarker Web: https://ai.google.dev/edge/mediapipe/solutions/vision/hand_landmarker/web_js
