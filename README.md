# 쿨라워 꽃잡기

노트북 웹캠으로 손을 인식하고, 화면에 뜨는 꽃을 pinch 동작으로 잡아 점수화하는 축제 부스용 MVP입니다.

## 구조

```txt
src/
  App.tsx                  # 화면 구성과 상태 연결
  components/GameCanvas.tsx # 카메라 렌더링, 꽃 렌더링, 손 오버레이
  game/flowerGame.ts        # 점수, 콤보, 타이머, 꽃 스폰 규칙
  hooks/useCamera.ts        # getUserMedia 웹캠 연결
  hooks/useHandTracking.ts  # MediaPipe 실행 루프
  vision/gesture.ts         # grab/open, 손바닥 중심, 좌표 변환
  vision/handLandmarker.ts  # MediaPipe Hand Landmarker 로더
```

## 실행

```bash
npm install
npm run dev
```

브라우저에서 `http://127.0.0.1:5174`를 열고 카메라 권한을 허용합니다.

## 판정 방식

- MediaPipe Hand Landmarker의 사전학습 모델을 사용합니다.
- 별도 학습은 하지 않습니다.
- 엄지 끝과 검지 끝 사이 거리를 손바닥 너비로 나눈 `pinchRatio`가 기준값보다 작으면 `grab`입니다.
- 꽃 중심이 손바닥 중심 근처에 있고 `open -> grab` 전환이 발생한 순간에만 점수가 올라갑니다.

## 현장 튜닝

- 기본 잡기 민감도는 `0.70`입니다.
- 오탐이 많으면 `0.60` 근처로 낮춥니다.
- 잘 안 잡히면 `0.78` 근처로 올립니다.
- 축제 부스에서는 조명이 손등에 직접 닿게 하고, 카메라를 가슴 위 높이에 맞추는 것이 좋습니다.

## 권장 거리와 플레이 영역

- 권장 손 거리: 카메라에서 약 `70~100cm`
- 허용 손 거리: 약 `50~120cm`
- 운영 표시: 바닥에 `80~90cm` 기준선을 붙이는 것을 추천합니다.
- 앱은 실제 cm 대신 `palmWidthPx`로 손 크기를 판단합니다.
- 손이 너무 멀거나 너무 가까우면 시작 전 캘리브레이션 화면에서 막습니다.
- 꽃은 화면 전체가 아니라 중앙 ROI 안에서만 생성됩니다.

초기 거리 판정값:

```txt
palmWidthPx < 45px    -> 너무 멂
45px ~ 70px           -> 조금 멂
70px ~ 170px          -> 권장
170px ~ 220px         -> 조금 가까움
220px 초과            -> 너무 가까움
```

## 오프라인 운영 메모

현재 MVP는 MediaPipe wasm과 모델 파일을 CDN/Google Storage에서 로드합니다. 인터넷이 불안정한 행사장에서는 `@mediapipe/tasks-vision` wasm 파일과 `hand_landmarker.task` 모델을 `public/mediapipe/` 아래로 내려받아 `src/vision/handLandmarker.ts`의 URL을 로컬 경로로 바꾸는 방식으로 고정 운영할 수 있습니다.
