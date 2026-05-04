import { RefObject, useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { createHandTracker, type HandTracker } from "../vision/handLandmarker";
import {
  detectGrab,
  getHandDistanceStatus,
  getPalmCenter,
  getPalmWidthPx,
  type HandDistanceStatus,
  type Landmark,
  type Point,
  toMirroredCanvasPoint,
} from "../vision/gesture";

type TrackerStatus = "idle" | "loading" | "ready" | "error";

export type HandFrame = {
  landmarks: Landmark[];
  palm: Point;
  mirroredPalm: Point;
  isGrab: boolean;
  pinchRatio: number;
  palmWidthPx: number;
  distanceStatus: HandDistanceStatus;
  raw: HandLandmarkerResult;
};

export function useHandTracking(params: {
  videoRef: RefObject<HTMLVideoElement | null>;
  enabled: boolean;
  canvasSize: Point;
  grabThreshold: number;
}) {
  const { videoRef, enabled, canvasSize, grabThreshold } = params;
  const [status, setStatus] = useState<TrackerStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const [frame, setFrame] = useState<HandFrame | null>(null);
  const trackerRef = useRef<HandTracker | null>(null);
  const lastStatePublishRef = useRef(0);

  useEffect(() => {
    let cancelled = false;

    async function loadTracker() {
      try {
        setStatus("loading");
        setError(null);
        const tracker = await createHandTracker();

        if (cancelled) {
          tracker.close();
          return;
        }

        trackerRef.current = tracker;
        setStatus("ready");
      } catch (trackerError) {
        setStatus("error");
        setError(
          trackerError instanceof Error
            ? trackerError.message
            : "손 인식 모델을 불러오지 못했습니다.",
        );
      }
    }

    loadTracker();

    return () => {
      cancelled = true;
      trackerRef.current?.close();
      trackerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!enabled || status !== "ready") {
      return undefined;
    }

    let animationFrame = 0;

    const detectLoop = (timestampMs: number) => {
      const video = videoRef.current;
      const tracker = trackerRef.current;

      if (video && tracker && video.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        const result = tracker.detect(video, timestampMs);
        const landmarks = result.landmarks[0] as Landmark[] | undefined;

        if (landmarks?.length) {
          const palm = getPalmCenter(landmarks);
          const grab = detectGrab(landmarks, grabThreshold);
          const mirroredPalm = toMirroredCanvasPoint(palm, canvasSize.x, canvasSize.y);
          const palmWidthPx = getPalmWidthPx(landmarks, video.videoWidth);
          const distanceStatus = getHandDistanceStatus(palmWidthPx);

          if (timestampMs - lastStatePublishRef.current > 33) {
            lastStatePublishRef.current = timestampMs;
            setFrame({
              landmarks,
              palm,
              mirroredPalm,
              isGrab: grab.isGrab,
              pinchRatio: grab.pinchRatio,
              palmWidthPx,
              distanceStatus,
              raw: result,
            });
          }
        } else if (timestampMs - lastStatePublishRef.current > 120) {
          lastStatePublishRef.current = timestampMs;
          setFrame(null);
        }
      }

      animationFrame = window.requestAnimationFrame(detectLoop);
    };

    animationFrame = window.requestAnimationFrame(detectLoop);

    return () => {
      window.cancelAnimationFrame(animationFrame);
    };
  }, [canvasSize.x, canvasSize.y, enabled, grabThreshold, status, videoRef]);

  return {
    status,
    error,
    frame,
  };
}
