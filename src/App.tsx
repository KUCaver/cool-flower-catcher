import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import type { GameSnapshot, GameStatus } from "./game/types";
import { useCamera } from "./hooks/useCamera";
import { useHandTracking } from "./hooks/useHandTracking";
import { canStartWithHand, type HandDistanceStatus, type Point } from "./vision/gesture";

const INITIAL_SNAPSHOT: GameSnapshot = {
  status: "idle",
  score: 0,
  combo: 0,
  caught: 0,
  missed: 0,
  remainingMs: 0,
  flowers: [],
};

function App() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [canvasSize, setCanvasSize] = useState<Point>({ x: 960, y: 540 });
  const [grabThreshold, setGrabThreshold] = useState(0.7);
  const [runId, setRunId] = useState(0);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const camera = useCamera(videoRef);
  const handTracking = useHandTracking({
    videoRef,
    enabled: camera.status === "ready",
    canvasSize,
    grabThreshold,
  });

  const handDistanceStatus = handTracking.frame?.distanceStatus ?? null;
  const hasUsableHand = handDistanceStatus ? canStartWithHand(handDistanceStatus) : false;
  const canStart =
    camera.status === "ready" && handTracking.status === "ready" && hasUsableHand;

  const startGame = useCallback(() => {
    if (!canStart || countdown !== null) {
      return;
    }

    setCountdown(3);
  }, [canStart, countdown]);

  useEffect(() => {
    if (countdown === null) {
      return undefined;
    }

    if (!canStart) {
      setCountdown(null);
      return undefined;
    }

    if (countdown === 0) {
      setRunId((id) => id + 1);
      setCountdown(null);
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setCountdown((value) => (value === null ? null : value - 1));
    }, 1000);

    return () => window.clearTimeout(timer);
  }, [canStart, countdown]);

  const statusText = useMemo(() => {
    if (countdown !== null) {
      return "카운트다운";
    }

    if (camera.status === "idle") {
      return "카메라 대기";
    }

    if (camera.status === "requesting") {
      return "카메라 권한 요청 중";
    }

    if (camera.status === "error") {
      return "카메라 오류";
    }

    if (handTracking.status === "loading") {
      return "손 인식 모델 로딩 중";
    }

    if (handTracking.status === "error") {
      return "손 인식 오류";
    }

    if (!handTracking.frame) {
      return "손 인식 대기";
    }

    if (handDistanceStatus === "too-far") {
      return "한 걸음 앞으로";
    }

    if (handDistanceStatus === "too-close") {
      return "손을 뒤로";
    }

    if (gameStatus === "playing") {
      return "게임 진행 중";
    }

    if (gameStatus === "finished") {
      return "결과 확인";
    }

    return "준비 완료";
  }, [camera.status, countdown, gameStatus, handDistanceStatus, handTracking.frame, handTracking.status]);

  const seconds = Math.ceil(snapshot.remainingMs / 1000);
  const pinchRatio = handTracking.frame?.pinchRatio;
  const palmWidthPx = handTracking.frame?.palmWidthPx;
  const calibration = getCalibrationCopy({
    cameraStatus: camera.status,
    trackerStatus: handTracking.status,
    distanceStatus: handDistanceStatus,
    hasHand: Boolean(handTracking.frame),
  });

  return (
    <main className="app-shell">
      <video ref={videoRef} className="camera-source" aria-hidden="true" />

      <section className="topbar" aria-label="게임 상태">
        <div className="brand">
          <span className="brand-mark">KU</span>
          <div>
            <h1>쿨라워 꽃잡기</h1>
            <p>손을 꽃 위에 올리고 엄지와 검지를 붙이면 점수가 올라갑니다.</p>
          </div>
        </div>
        <div className="status-pill">{statusText}</div>
      </section>

      <section className="play-layout">
        <div className="stage-wrap">
          <GameCanvas
            videoRef={videoRef}
            handFrame={handTracking.frame}
            runId={runId}
            gameStatus={gameStatus}
            onGameStatusChange={setGameStatus}
            onSnapshot={setSnapshot}
            onCanvasSize={setCanvasSize}
          />

          {gameStatus !== "playing" && (
            <div className="start-overlay">
              <div className="start-panel">
                <h2>
                  {countdown !== null
                    ? countdown === 0
                      ? "시작!"
                      : countdown
                    : gameStatus === "finished"
                      ? "게임 종료"
                      : calibration.title}
                </h2>
                <p>{countdown !== null ? "손을 중앙에 유지하세요." : calibration.message}</p>
                {camera.status === "ready" && (
                  <div className={`calibration-card ${getDistanceClass(handDistanceStatus)}`}>
                    <span>{getDistanceLabel(handDistanceStatus)}</span>
                    <strong>{palmWidthPx ? `${Math.round(palmWidthPx)}px` : "-"}</strong>
                  </div>
                )}
                <div className="overlay-actions">
                  {camera.status !== "ready" ? (
                    <button type="button" className="primary-button" onClick={camera.startCamera}>
                      카메라 켜기
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!canStart || countdown !== null}
                      onClick={startGame}
                    >
                      {countdown !== null
                        ? "카운트다운 중"
                        : canStart
                          ? "3초 카운트다운 시작"
                          : handTracking.status === "loading"
                            ? "모델 로딩 중"
                            : "손 위치를 맞춰주세요"}
                    </button>
                  )}
                </div>
                {(camera.error || handTracking.error) && (
                  <p className="error-message">{camera.error || handTracking.error}</p>
                )}
              </div>
            </div>
          )}
        </div>

        <aside className="control-panel" aria-label="점수와 설정">
          <div className="score-row primary">
            <span>점수</span>
            <strong>{snapshot.score.toLocaleString("ko-KR")}</strong>
          </div>
          <div className="metric-grid">
            <div>
              <span>남은 시간</span>
              <strong>{gameStatus === "playing" ? `${seconds}s` : "30s"}</strong>
            </div>
            <div>
              <span>콤보</span>
              <strong>{snapshot.combo}</strong>
            </div>
            <div>
              <span>잡은 꽃</span>
              <strong>{snapshot.caught}</strong>
            </div>
            <div>
              <span>놓친 꽃</span>
              <strong>{snapshot.missed}</strong>
            </div>
          </div>

          <div className="divider" />

          <label className="range-control">
            <span>
              잡기 민감도
              <strong>{grabThreshold.toFixed(2)}</strong>
            </span>
            <input
              type="range"
              min="0.55"
              max="0.85"
              step="0.01"
              value={grabThreshold}
              onChange={(event) => setGrabThreshold(Number(event.target.value))}
            />
          </label>

          <div className="debug-readout">
            <span>현재 pinch</span>
            <strong>{pinchRatio ? pinchRatio.toFixed(2) : "-"}</strong>
          </div>

          <div className={`debug-readout distance ${getDistanceClass(handDistanceStatus)}`}>
            <span>손 거리</span>
            <strong>{getDistanceLabel(handDistanceStatus)}</strong>
            <small>{palmWidthPx ? `${Math.round(palmWidthPx)}px` : "-"}</small>
          </div>

          <div className="guide">
            <h2>부스 운영 메모</h2>
            <p>바닥 80~90cm 위치를 기준선으로 두고, 꽃은 중앙 점선 영역 안에서만 나옵니다.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;

function getDistanceLabel(status: HandDistanceStatus | null) {
  if (status === "too-far") {
    return "너무 멀어요";
  }

  if (status === "far") {
    return "조금 멀어요";
  }

  if (status === "good") {
    return "좋아요";
  }

  if (status === "close") {
    return "조금 가까워요";
  }

  if (status === "too-close") {
    return "너무 가까워요";
  }

  return "손 대기";
}

function getDistanceClass(status: HandDistanceStatus | null) {
  return status ? `distance-${status}` : "distance-none";
}

function getCalibrationCopy(params: {
  cameraStatus: string;
  trackerStatus: string;
  distanceStatus: HandDistanceStatus | null;
  hasHand: boolean;
}) {
  const { cameraStatus, trackerStatus, distanceStatus, hasHand } = params;

  if (cameraStatus !== "ready") {
    return {
      title: "카메라를 켜주세요",
      message: "웹캠 권한을 허용하면 손 인식 준비가 시작됩니다.",
    };
  }

  if (trackerStatus === "loading") {
    return {
      title: "손 인식 준비 중",
      message: "MediaPipe 모델을 불러오는 중입니다.",
    };
  }

  if (!hasHand) {
    return {
      title: "손바닥을 보여주세요",
      message: "손을 화면 중앙 점선 영역 안에 놓아주세요.",
    };
  }

  if (distanceStatus === "too-far") {
    return {
      title: "한 걸음 앞으로",
      message: "손이 작게 잡혀서 시작할 수 없습니다.",
    };
  }

  if (distanceStatus === "too-close") {
    return {
      title: "손을 조금 뒤로",
      message: "손끝이 잘릴 수 있어 시작할 수 없습니다.",
    };
  }

  if (distanceStatus === "far") {
    return {
      title: "시작 가능",
      message: "조금 가까이 오면 더 안정적으로 잡힙니다.",
    };
  }

  if (distanceStatus === "close") {
    return {
      title: "시작 가능",
      message: "손이 조금 가깝지만 플레이할 수 있습니다.",
    };
  }

  return {
    title: "좋아요!",
    message: "3초 카운트다운을 시작할 수 있습니다.",
  };
}
