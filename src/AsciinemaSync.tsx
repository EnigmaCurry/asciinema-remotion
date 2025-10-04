// src/AsciinemaSync.tsx
import React, {useEffect, useRef} from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";

type Theme = "asciinema" | "tango" | "solarized-dark" | "solarized-light";

export const AsciinemaSync: React.FC<{
  src: string;
  cols?: number;
  rows?: number;
  theme?: Theme;
  showControls?: boolean;
}> = ({
  src,
  cols = 80,
  rows = 24,
  theme = "asciinema",
  showControls = false,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const readyRef = useRef(false);
  const lastFrameRef = useRef<number | null>(null);
  const {fps} = useVideoConfig();
  const frame = useCurrentFrame();

  // Load JS/CSS once
  useEffect(() => {
    const js =
      "https://cdn.jsdelivr.net/npm/asciinema-player@3.7.1/dist/bundle/asciinema-player.min.js";
    const css =
      "https://cdn.jsdelivr.net/npm/asciinema-player@3.7.1/dist/bundle/asciinema-player.css";

    if (!document.querySelector(`script[src="${js}"]`)) {
      const s = document.createElement("script");
      s.src = js;
      s.async = true;
      document.body.appendChild(s);
    }
    if (!document.querySelector(`link[href="${css}"]`)) {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = css;
      document.head.appendChild(l);
    }
  }, []);

  // Create player and wait until ready
  useEffect(() => {
    let disposed = false;

    const mount = () => {
      const AP = (window as any).AsciinemaPlayer;
      if (disposed || !AP || !hostRef.current) {
        requestAnimationFrame(mount);
        return;
      }

      playerRef.current = AP.create(src, hostRef.current, {
        cols,
        rows,
        theme,
        preload: true,
        autoplay: false,
        controls: showControls,
        poster: "npt:0:00",
        fit: "both",
      });

      const waitReady = () => {
        if (disposed) return;
        const dur = playerRef.current?.getDuration?.();
        if (typeof dur === "number" && dur > 0) {
          readyRef.current = true;
          // Draw the first frame
          playerRef.current.seek?.(0);
          playerRef.current.pause?.();
        } else {
          setTimeout(waitReady, 50);
        }
      };
      waitReady();
    };

    mount();
    return () => {
      disposed = true;
      try {
        playerRef.current?.dispose?.();
      } catch {}
    };
  }, [src, cols, rows, theme, showControls]);

  // Drive playback: only seek when scrubbing/jumping, not during smooth play
  useEffect(() => {
    if (!readyRef.current) return;
    const p = playerRef.current;
    if (!p) return;

    const prev = lastFrameRef.current;
    lastFrameRef.current = frame;

    const targetTime = frame / fps;

    // If we advanced by exactly 1 frame, assume "playing"
    const isPlaying = prev !== null && frame - prev === 1;

    if (isPlaying) {
      // Let the player run freely; just ensure it's playing
      p.play?.();
      return;
    }

    // Paused or scrubbed (jumped by >1 or backwards or first frame):
    // Seek exactly and pause so the previewed frame is deterministic.
    p.seek?.(targetTime);
    p.pause?.();
  }, [frame, fps]);

  return (
    <div
      ref={hostRef}
      style={{
        width: "100%",
        height: "100%",
        display: "block",
        background: "black",
       }}
    />
  );
};
