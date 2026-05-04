import { RefObject, useCallback, useEffect, useState } from "react";

type CameraStatus = "idle" | "requesting" | "ready" | "error";

export function useCamera(videoRef: RefObject<HTMLVideoElement | null>) {
  const [status, setStatus] = useState<CameraStatus>("idle");
  const [error, setError] = useState<string | null>(null);

  const startCamera = useCallback(async () => {
    const video = videoRef.current;

    if (!video) {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("error");
      setError("이 브라우저는 웹캠 API를 지원하지 않습니다.");
      return;
    }

    try {
      setStatus("requesting");
      setError(null);

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30, max: 30 },
          facingMode: "user",
        },
      });

      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      await video.play();

      setStatus("ready");
    } catch (cameraError) {
      setStatus("error");
      setError(
        cameraError instanceof Error
          ? cameraError.message
          : "카메라 권한을 가져오지 못했습니다.",
      );
    }
  }, [videoRef]);

  useEffect(() => {
    const video = videoRef.current;

    return () => {
      const stream = video?.srcObject;
      if (stream instanceof MediaStream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [videoRef]);

  return {
    status,
    error,
    startCamera,
  };
}
