import { RefObject, useEffect, useRef } from "react";
import { FlowerGameEngine, PLAY_AREA } from "../game/flowerGame";
import type { FloatingText, Flower, GameSnapshot, GameStatus } from "../game/types";
import type { HandFrame, TrackedHand } from "../hooks/useHandTracking";
import type { Landmark, Point } from "../vision/gesture";
import { getCatchScaleForDistance, toMirroredCanvasPoint } from "../vision/gesture";

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
  const previousGrabRef = useRef(new Map<string, boolean>());
  const gameStatusRef = useRef<GameStatus>(gameStatus);
  const lastSnapshotAtRef = useRef(0);
  const canvasMetricsRef = useRef({ width: 960, height: 540, pixelRatio: 1 });

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
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 1.5);

      canvas.width = Math.round(width * pixelRatio);
      canvas.height = Math.round(height * pixelRatio);
      canvasMetricsRef.current = { width, height, pixelRatio };
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
    previousGrabRef.current.clear();
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

      const { width, height, pixelRatio } = canvasMetricsRef.current;

      context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);
      context.clearRect(0, 0, width, height);

      drawCamera(context, videoRef.current, width, height);
      drawVignette(context, width, height);
      drawPlayArea(context, width, height);

      const engine = engineRef.current;
      if (gameStatusRef.current === "playing") {
        engine.update(now, width, height);
        const currentFrame = handFrameRef.current;
        const currentHands = currentFrame?.hands ?? [];
        const currentHandIds = new Set(currentHands.map((hand) => hand.id));

        for (const handId of previousGrabRef.current.keys()) {
          if (!currentHandIds.has(handId)) {
            previousGrabRef.current.delete(handId);
          }
        }

        for (const hand of currentHands) {
          const previousGrab = previousGrabRef.current.get(hand.id) ?? false;
          const grabStarted = hand.isGrab && !previousGrab;
          engine.attemptCatch({
            palm: hand.mirroredPalm,
            isGrab: hand.isGrab,
            grabStarted,
            now,
            hitboxScale: getCatchScaleForDistance(hand.distanceStatus),
          });
          previousGrabRef.current.set(hand.id, hand.isGrab);
        }
      } else {
        previousGrabRef.current.clear();
      }

      const snapshot = engine.snapshot(now);
      if (snapshot.isFever) {
        drawFeverOverlay(context, width, height, now);
      }
      drawFlowers(context, snapshot.flowers, now);
      drawFeedbacks(context, snapshot.feedbacks, now);
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

function drawPlayArea(context: CanvasRenderingContext2D, width: number, height: number) {
  const x = width * PLAY_AREA.xMin;
  const y = height * PLAY_AREA.yMin;
  const playWidth = width * (PLAY_AREA.xMax - PLAY_AREA.xMin);
  const playHeight = height * (PLAY_AREA.yMax - PLAY_AREA.yMin);

  context.save();
  context.setLineDash([12, 12]);
  context.lineWidth = 2;
  context.strokeStyle = "rgba(255, 255, 255, 0.26)";
  context.strokeRect(x, y, playWidth, playHeight);
  context.restore();
}

function drawFeverOverlay(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  now: number,
) {
  const shimmer = 0.12 + Math.sin(now / 120) * 0.04;

  context.save();
  const gradient = context.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, `rgba(124, 246, 189, ${shimmer})`);
  gradient.addColorStop(0.5, `rgba(255, 216, 86, ${shimmer + 0.04})`);
  gradient.addColorStop(1, `rgba(240, 91, 145, ${shimmer})`);
  context.fillStyle = gradient;
  context.fillRect(0, 0, width, height);
  context.restore();
}

function drawFlowers(context: CanvasRenderingContext2D, flowers: Flower[], now: number) {
  for (const flower of flowers) {
    const lifeRatio = Math.max(
      0,
      Math.min(1, (flower.expiresAt - now) / (flower.expiresAt - flower.bornAt)),
    );
    const pulse = 1 + Math.sin(now / 120 + flower.id) * 0.04;
    const radius = flower.radius * pulse;

    context.save();
    context.globalAlpha = 0.55 + lifeRatio * 0.45;
    context.translate(flower.x, flower.y);

    context.beginPath();
    context.arc(0, 0, radius + 15, 0, Math.PI * 2);
    context.fillStyle =
      flower.kind === "pollution" ? "rgba(33, 21, 27, 0.36)" : `${flower.color}2e`;
    context.fill();

    if (flower.kind === "pollution") {
      drawPollutionDrop(context, radius, lifeRatio);
      context.restore();
      continue;
    }

    const petalCount = flower.kind === "coollower" ? 8 : 6;
    const rotationStep = (Math.PI * 2) / petalCount;

    for (let i = 0; i < petalCount; i += 1) {
      context.rotate(rotationStep);
      context.beginPath();
      context.ellipse(0, -radius * 0.58, radius * 0.34, radius * 0.58, 0, 0, Math.PI * 2);
      context.fillStyle = flower.color;
      context.fill();
    }

    context.beginPath();
    context.arc(0, 0, radius * 0.28, 0, Math.PI * 2);
    context.fillStyle = flower.accentColor;
    context.fill();

    context.lineWidth = 3;
    context.strokeStyle = "rgba(255,255,255,0.78)";
    context.stroke();
    context.restore();
  }
}

function drawPollutionDrop(context: CanvasRenderingContext2D, radius: number, lifeRatio: number) {
  context.save();

  const wobble = 1 + (1 - lifeRatio) * 0.08;
  context.scale(wobble, 1);

  context.beginPath();
  context.moveTo(0, -radius * 0.88);
  context.bezierCurveTo(radius * 0.56, -radius * 0.28, radius * 0.78, radius * 0.08, radius * 0.5, radius * 0.48);
  context.bezierCurveTo(radius * 0.18, radius * 0.94, -radius * 0.42, radius * 0.84, -radius * 0.56, radius * 0.3);
  context.bezierCurveTo(-radius * 0.68, -radius * 0.08, -radius * 0.42, -radius * 0.42, 0, -radius * 0.88);
  context.closePath();
  context.fillStyle = "#4b2639";
  context.fill();
  context.lineWidth = 4;
  context.strokeStyle = "rgba(255,255,255,0.78)";
  context.stroke();

  context.beginPath();
  context.arc(radius * 0.16, -radius * 0.04, radius * 0.26, 0, Math.PI * 2);
  context.fillStyle = "#9cff58";
  context.fill();

  context.beginPath();
  context.moveTo(radius * 0.16, -radius * 0.2);
  context.lineTo(radius * 0.16, radius * 0.06);
  context.moveTo(radius * 0.16, radius * 0.2);
  context.lineTo(radius * 0.16, radius * 0.22);
  context.lineWidth = 4;
  context.lineCap = "round";
  context.strokeStyle = "#17310f";
  context.stroke();

  context.restore();
}

function drawFeedbacks(context: CanvasRenderingContext2D, feedbacks: FloatingText[], now: number) {
  context.save();
  context.textAlign = "center";
  context.textBaseline = "middle";

  for (const feedback of feedbacks) {
    const life = Math.max(
      0,
      Math.min(1, (feedback.expiresAt - now) / (feedback.expiresAt - feedback.bornAt)),
    );
    const rise = (1 - life) * 44;

    context.globalAlpha = life;
    context.font = `900 ${feedback.size}px Inter, system-ui, sans-serif`;
    context.lineWidth = 5;
    context.strokeStyle = "rgba(4, 18, 12, 0.72)";
    context.strokeText(feedback.text, feedback.x, feedback.y - rise);
    context.fillStyle = feedback.color;
    context.fillText(feedback.text, feedback.x, feedback.y - rise);
  }

  context.restore();
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

  const hands = frame.hands.length ? frame.hands : [frame];
  const activeHandId = frame.id;
  const toCanvas = (landmark: Landmark) => toMirroredCanvasPoint(landmark, width, height);

  context.save();
  context.lineCap = "round";
  context.lineJoin = "round";

  for (const hand of hands) {
    const isActive = hand.id === activeHandId;

    for (const [from, to] of HAND_CONNECTIONS) {
      const a = hand.landmarks[from];
      const b = hand.landmarks[to];

      if (!a || !b) {
        continue;
      }

      const start = toCanvas(a);
      const end = toCanvas(b);
      context.beginPath();
      context.moveTo(start.x, start.y);
      context.lineTo(end.x, end.y);
      context.lineWidth = isActive ? 4 : 3;
      context.strokeStyle = hand.isGrab
        ? "rgba(255, 223, 93, 0.9)"
        : isActive
          ? "rgba(124, 246, 189, 0.82)"
          : "rgba(193, 230, 212, 0.58)";
      context.stroke();
    }

    for (const landmark of hand.landmarks) {
      const point = toCanvas(landmark);
      context.beginPath();
      context.arc(point.x, point.y, isActive ? 4 : 3, 0, Math.PI * 2);
      context.fillStyle = isActive ? "#f6fff9" : "rgba(246, 255, 249, 0.7)";
      context.fill();
    }

    context.beginPath();
    context.arc(hand.mirroredPalm.x, hand.mirroredPalm.y, hand.isGrab ? 54 : 40, 0, Math.PI * 2);
    context.lineWidth = hand.isGrab ? 6 : isActive ? 3 : 2;
    context.strokeStyle = hand.isGrab ? "#ffdf5d" : isActive ? "#7cf6bd" : "rgba(193, 230, 212, 0.7)";
    context.fillStyle = hand.isGrab ? "rgba(255, 223, 93, 0.18)" : "rgba(124, 246, 189, 0.1)";
    context.fill();
    context.stroke();
  }
  context.restore();
}
