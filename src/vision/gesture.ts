export type Landmark = {
  x: number;
  y: number;
  z?: number;
};

export type Point = {
  x: number;
  y: number;
};

export type GrabResult = {
  isGrab: boolean;
  pinchRatio: number;
};

export type HandDistanceStatus = "too-far" | "far" | "good" | "close" | "too-close";

export const HAND_DISTANCE_LIMITS = {
  tooFarMax: 45,
  recommendedMin: 70,
  recommendedMax: 170,
  tooCloseMin: 220,
} as const;

export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y);

export function getPalmCenter(landmarks: Landmark[]): Point {
  const palmIds = [0, 5, 9, 13, 17];
  const center = palmIds.reduce(
    (sum, id) => {
      sum.x += landmarks[id]?.x ?? 0;
      sum.y += landmarks[id]?.y ?? 0;
      return sum;
    },
    { x: 0, y: 0 },
  );

  return {
    x: center.x / palmIds.length,
    y: center.y / palmIds.length,
  };
}

export function detectGrab(landmarks: Landmark[], threshold: number): GrabResult {
  const thumbTip = landmarks[4];
  const indexTip = landmarks[8];
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];

  if (!thumbTip || !indexTip || !indexMcp || !pinkyMcp) {
    return { isGrab: false, pinchRatio: Number.POSITIVE_INFINITY };
  }

  const palmWidth = Math.max(distance(indexMcp, pinkyMcp), 0.001);
  const pinchRatio = distance(thumbTip, indexTip) / palmWidth;

  return {
    isGrab: pinchRatio < threshold,
    pinchRatio,
  };
}

export function getPalmWidthPx(landmarks: Landmark[], videoWidth: number): number {
  const indexMcp = landmarks[5];
  const pinkyMcp = landmarks[17];

  if (!indexMcp || !pinkyMcp || videoWidth <= 0) {
    return 0;
  }

  return distance(indexMcp, pinkyMcp) * videoWidth;
}

export function getHandDistanceStatus(palmWidthPx: number): HandDistanceStatus {
  if (palmWidthPx < HAND_DISTANCE_LIMITS.tooFarMax) {
    return "too-far";
  }

  if (palmWidthPx < HAND_DISTANCE_LIMITS.recommendedMin) {
    return "far";
  }

  if (palmWidthPx <= HAND_DISTANCE_LIMITS.recommendedMax) {
    return "good";
  }

  if (palmWidthPx <= HAND_DISTANCE_LIMITS.tooCloseMin) {
    return "close";
  }

  return "too-close";
}

export function canStartWithHand(status: HandDistanceStatus): boolean {
  return status !== "too-far" && status !== "too-close";
}

export function getCatchScaleForDistance(status: HandDistanceStatus): number {
  if (status === "too-far") {
    return 1.35;
  }

  if (status === "far") {
    return 1.25;
  }

  if (status === "close") {
    return 1.08;
  }

  return 1;
}

export function toMirroredCanvasPoint(point: Point, width: number, height: number): Point {
  return {
    x: (1 - point.x) * width,
    y: point.y * height,
  };
}
