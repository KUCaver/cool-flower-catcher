import { RefObject, useEffect, useRef, useState } from "react";
import type { HandLandmarkerResult } from "@mediapipe/tasks-vision";
import { createHandTracker, type HandTracker } from "../vision/handLandmarker";
import {
  canStartWithHand,
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
const HAND_DETECTION_INTERVAL_MS = 42;

export type TrackedHand = {
  id: string;
  index: number;
  handedness: string;
  landmarks: Landmark[];
  palm: Point;
  mirroredPalm: Point;
  isGrab: boolean;
  pinchRatio: number;
  palmWidthPx: number;
  distanceStatus: HandDistanceStatus;
};

export type HandFrame = TrackedHand & {
  hands: TrackedHand[];
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
  const lastDetectionAtRef = useRef(0);
  const activeHandIdRef = useRef<string | null>(null);

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
        if (timestampMs - lastDetectionAtRef.current < HAND_DETECTION_INTERVAL_MS) {
          animationFrame = window.requestAnimationFrame(detectLoop);
          return;
        }

        lastDetectionAtRef.current = timestampMs;
        const result = tracker.detect(video, timestampMs);
        const hands = result.landmarks
          .map((landmarks, index): TrackedHand | null => {
            if (!landmarks.length) {
              return null;
            }

            const typedLandmarks = landmarks as Landmark[];
            const palm = getPalmCenter(typedLandmarks);
            const grab = detectGrab(typedLandmarks, grabThreshold);
            const mirroredPalm = toMirroredCanvasPoint(palm, canvasSize.x, canvasSize.y);
            const palmWidthPx = getPalmWidthPx(typedLandmarks, video.videoWidth);
            const distanceStatus = getHandDistanceStatus(palmWidthPx);
            const handedness = result.handedness[index]?.[0]?.categoryName ?? `Hand ${index + 1}`;

            return {
              id: handedness === "Left" || handedness === "Right" ? handedness : `hand-${index}`,
              index,
              handedness,
              landmarks: typedLandmarks,
              palm,
              mirroredPalm,
              isGrab: grab.isGrab,
              pinchRatio: grab.pinchRatio,
              palmWidthPx,
              distanceStatus,
            };
          })
          .filter((hand): hand is TrackedHand => hand !== null);

        if (hands.length) {
          const activeHand = selectActiveHand(hands, activeHandIdRef.current);
          activeHandIdRef.current = activeHand.id;

          if (timestampMs - lastStatePublishRef.current > 33) {
            lastStatePublishRef.current = timestampMs;
            setFrame({
              ...activeHand,
              hands,
              raw: result,
            });
          }
        } else if (timestampMs - lastStatePublishRef.current > 120) {
          activeHandIdRef.current = null;
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

function selectActiveHand(hands: TrackedHand[], previousActiveId: string | null) {
  const previousActive = hands.find((hand) => hand.id === previousActiveId);

  if (previousActive) {
    return previousActive;
  }

  const usableHand = hands.find((hand) => canStartWithHand(hand.distanceStatus));
  return usableHand ?? hands[0];
}
