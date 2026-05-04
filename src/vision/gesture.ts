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

export function toMirroredCanvasPoint(point: Point, width: number, height: number): Point {
  return {
    x: (1 - point.x) * width,
    y: point.y * height,
  };
}
