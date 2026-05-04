import { useCallback, useMemo, useRef, useState } from "react";
import { GameCanvas } from "./components/GameCanvas";
import type { GameSnapshot, GameStatus } from "./game/types";
import { useCamera } from "./hooks/useCamera";
import { useHandTracking } from "./hooks/useHandTracking";
import type { Point } from "./vision/gesture";

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
  const [gameStatus, setGameStatus] = useState<GameStatus>("idle");
  const [snapshot, setSnapshot] = useState<GameSnapshot>(INITIAL_SNAPSHOT);
  const camera = useCamera(videoRef);
  const handTracking = useHandTracking({
    videoRef,
    enabled: camera.status === "ready",
    canvasSize,
    grabThreshold,
  });

  const canStart = camera.status === "ready" && handTracking.status === "ready";

  const startGame = useCallback(() => {
    if (!canStart) {
      return;
    }

    setRunId((id) => id + 1);
  }, [canStart]);

  const statusText = useMemo(() => {
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

    if (gameStatus === "playing") {
      return "게임 진행 중";
    }

    if (gameStatus === "finished") {
      return "결과 확인";
    }

    return "준비 완료";
  }, [camera.status, gameStatus, handTracking.status]);

  const seconds = Math.ceil(snapshot.remainingMs / 1000);
  const pinchRatio = handTracking.frame?.pinchRatio;

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
                <h2>{gameStatus === "finished" ? "게임 종료" : "꽃을 잡을 준비"}</h2>
                <p>
                  30초 동안 화면에 뜨는 꽃을 잡아 점수를 얻습니다. 현장에서는 손이 잘 보이도록
                  카메라를 가슴 위 높이에 맞춰 주세요.
                </p>
                <div className="overlay-actions">
                  {camera.status !== "ready" ? (
                    <button type="button" className="primary-button" onClick={camera.startCamera}>
                      카메라 켜기
                    </button>
                  ) : (
                    <button
                      type="button"
                      className="primary-button"
                      disabled={!canStart}
                      onClick={startGame}
                    >
                      {handTracking.status === "loading" ? "모델 로딩 중" : "30초 시작"}
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

          <div className="guide">
            <h2>부스 운영 메모</h2>
            <p>시작 전 손바닥을 카메라 중앙에 놓고, 꽃 위에서 pinch 동작을 한 번만 해보면 됩니다.</p>
          </div>
        </aside>
      </section>
    </main>
  );
}

export default App;
