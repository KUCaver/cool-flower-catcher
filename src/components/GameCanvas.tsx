import { RefObject, useEffect, useRef } from "react";
import { FlowerGameEngine } from "../game/flowerGame";
import type { Flower, GameSnapshot, GameStatus } from "../game/types";
import type { HandFrame } from "../hooks/useHandTracking";
import type { Landmark, Point } from "../vision/gesture";
import { toMirroredCanvasPoint } from "../vision/gesture";

const HAND_CONNECTIONS = [
  [0, 1],
  [1, 2],
  [2, 3],
  [3, 4],
  [0, 5],
  [5, 6],
  [6, 7],
  [7, 8],
  [5, 9],
  [9, 10],
  [10, 11],
  [11, 12],
  [9, 13],
  [13, 14],
  [14, 15],
  [15, 16],
  [13, 17],
  [17, 18],
  [18, 19],
  [19, 20],
  [0, 17],
] as const;

type Props = {
  videoRef: RefObject<HTMLVideoElement | null>;
  handFrame: HandFrame | null;
  runId: number;
  gameStatus: GameStatus;
  onGameStatusChange: (status: GameStatus) => void;
  onSnapshot: (snapshot: GameSnapshot) => void;
  onCanvasSize: (size: Point) => void;
};

export function GameCanvas({
  videoRef,
  handFrame,
  runId,
  gameStatus,
  onGameStatusChange,
  onSnapshot,
  onCanvasSize,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const engineRef = useRef(new FlowerGameEngine());
  const handFrameRef = useRef<HandFrame | null>(null);
  const previousGrabRef = useRef(false);
  const gameStatusRef = useRef<GameStatus>(gameStatus);
  const lastSnapshotAtRef = useRef(0);

  useEffect(() => {
    handFrameRef.current = handFrame;
  }, [handFrame]);

  useEffect(() => {
    gameStatusRef.current = gameStatus;
  }, [gameStatus]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) {
      return undefined;
    }

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      const width = Math.max(1, Math.round(rect.width));
      const height = Math.max(1, Math.round(rect.height));
      const pixelRatio = window.devicePixelRatio || 1;

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      onCanvasSize({ x: width, y: height });
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    return () => observer.disconnect();
  }, [onCanvasSize]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || runId === 0) {
      return;
    }

    const rect = canvas.getBoundingClientRect();
    engineRef.current.start(performance.now(), rect.width, rect.height);
    previousGrabRef.current = false;
    onGameStatusChange("playing");
  }, [onGameStatusChange, runId]);

  useEffect(() => {
    let frameId = 0;

    const render = (now: number) => {
      const canvas = canvasRef.current;
      const context = canvas?.getContext("2d");

      if (!canvas || !context) {
        frameId = window.requestAnimationFrame(render);
        return;
      }

      const rect = canvas.getBoundingClientRect();
      const width = rect.width;
      const height = rect.height;
      const pixelRatio = window.devicePixelRatio || 1;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      drawCamera(context, videoRef.current, width, height);
      drawVignette(context, width, height);

      const engine = engineRef.current;
      if (gameStatusRef.current === "playing") {
        engine.update(now, width, height);
        const currentFrame = handFrameRef.current;
        const currentGrab = currentFrame?.isGrab ?? false;
        const grabStarted = currentGrab && !previousGrabRef.current;

        if (currentFrame) {
          engine.attemptCatch({
            palm: currentFrame.mirroredPalm,
            grabStarted,
            now,
          });
        }

        previousGrabRef.current = currentGrab;
      } else {
        previousGrabRef.current = false;
      }

      const snapshot = engine.snapshot(now);
      drawFlowers(context, snapshot.flowers, now);
      drawHandOverlay(context, handFrameRef.current, width, height);

      if (now - lastSnapshotAtRef.current > 100) {
        lastSnapshotAtRef.current = now;
        onSnapshot(snapshot);

        if (gameStatusRef.current === "playing" && snapshot.status === "finished") {
          onGameStatusChange("finished");
        }
      }

      frameId = window.requestAnimationFrame(render);
    };

    frameId = window.requestAnimationFrame(render);

    return () => {
      window.cancelAnimationFrame(frameId);
    };
  }, [onGameStatusChange, onSnapshot, videoRef]);

  return <canvas className="game-canvas" ref={canvasRef} aria-label="꽃잡기 게임 화면" />;
}

function drawCamera(
  context: CanvasRenderingContext2D,
  video: HTMLVideoElement | null,
  width: number,
  height: number,
) {
  if (!video || video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA) {
    const gradient = context.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, "#10281e");
    gradient.addColorStop(1, "#273828");
    context.fillStyle = gradient;
    context.fillRect(0, 0, width, height);
    return;
  }

  const videoRatio = video.videoWidth / video.videoHeight;
  const canvasRatio = width / height;
  let drawWidth = width;
  let drawHeight = height;
  let offsetX = 0;
  let offsetY = 0;

  if (videoRatio > canvasRatio) {
    drawHeight = height;
    drawWidth = height * videoRatio;
    offsetX = (width - drawWidth) / 2;
  } else {
    drawWidth = width;
    drawHeight = width / videoRatio;
    offsetY = (height - drawHeight) / 2;
  }

  context.save();
  context.translate(width, 0);
  context.scale(-1, 1);
  context.drawImage(video, offsetX, offsetY, drawWidth, drawHeight);
  context.restore();
}

function drawVignette(context: CanvasRenderingContext2D, width: number, height: number) {
  context.fillStyle = "rgba(4, 18, 12, 0.18)";
  context.fillRect(0, 0, width, height);

  const gradient = context.createRadialGradient(
    width / 2,
    height / 2,
    Math.min(width, height) * 0.25,
    width / 2,
    height / 2,
    Math.max(width, height) * 0.76,
  );
  gradient.addColorStop(0, "rgba(255,255,255,0)");
  gradient.addColorStop(1, "rgba(3,16,11,0.48)");
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
}

function drawFlowers(context: CanvasRenderingContext2D, flowers: Flower[], now: number) {
  for (const flower of flowers) {
    const lifeRatio = Math.max(0, Math.min(1, (flower.expiresAt - now) / 2600));
    const pulse = 1 + Math.sin(now / 120 + flower.id) * 0.04;
    const radius = flower.radius * pulse;

    context.save();
    context.globalAlpha = 0.55 + lifeRatio * 0.45;
    context.translate(flower.x, flower.y);

    context.beginPath();
    context.arc(0, 0, radius + 15, 0, Math.PI * 2);
    context.fillStyle = flower.kind === "gold" ? "rgba(255, 218, 85, 0.18)" : "rgba(255, 116, 165, 0.16)";
    context.fill();

    const petalColor =
      flower.kind === "gold" ? "#ffd856" : flower.kind === "speed" ? "#8fe7ff" : "#ff7aae";

    for (let i = 0; i < 6; i += 1) {
      context.rotate(Math.PI / 3);
      context.beginPath();
      context.ellipse(0, -radius * 0.58, radius * 0.34, radius * 0.58, 0, 0, Math.PI * 2);
      context.fillStyle = petalColor;
      context.fill();
    }

    context.beginPath();
    context.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = flower.kind === "gold" ? "#8b5b13" : "#ffe27a";
    context.fill();

    context.lineWidth = 3;
    context.strokeStyle = "rgba(255,255,255,0.78)";
    context.stroke();
    context.restore();
  }
}

function drawHandOverlay(
  context: CanvasRenderingContext2D,
  frame: HandFrame | null,
  width: number,
  height: number,
) {
  if (!frame) {
    return;
  }

  const toCanvas = (landmark: Landmark) => toMirroredCanvasPoint(landmark, width, height);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const [from, to] of HAND_CONNECTIONS) {
    const a = frame.landmarks[from];
    const b = frame.landmarks[to];

    if (!a || !b) {
      continue;
    }

    const start = toCanvas(a);
    const end = toCanvas(b);
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.lineWidth = 4;
    context.strokeStyle = frame.isGrab ? "rgba(255, 223, 93, 0.9)" : "rgba(124, 246, 189, 0.82)";
    context.stroke();
  }

  for (const landmark of frame.landmarks) {
    const point = toCanvas(landmark);
    context.beginPath();
    context.arc(point.x, point.y, 4, 0, Math.PI * 2);
    context.fillStyle = "#f6fff9";
    context.fill();
  }

  context.beginPath();
  context.arc(frame.mirroredPalm.x, frame.mirroredPalm.y, frame.isGrab ? 54 : 40, 0, Math.PI * 2);
  context.lineWidth = frame.isGrab ? 6 : 3;
  context.strokeStyle = frame.isGrab ? "#ffdf5d" : "#7cf6bd";
  context.stroke();
  context.restore();
}
