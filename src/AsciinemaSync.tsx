// src/AsciinemaSync.tsx
import React, {useEffect, useRef} from "react";
import {useCurrentFrame, useVideoConfig} from "remotion";
import {create as createAsciinema} from "asciinema-player";

type Theme = "asciinema" | "tango" | "solarized-dark" | "solarized-light";
type Fit = "width" | "height" | "both" | "none";

const asPromise = <T,>(x: any): Promise<T | void> =>
  x && typeof x.then === "function" ? x : Promise.resolve(x);

export const AsciinemaSync: React.FC<{
  src: string;
  cols?: number;
  rows?: number;
  theme?: Theme | string; // allow custom themes if you add CSS
  fit?: Fit;
  showControls?: boolean;
}> = ({
  src,
  cols = 80,
  rows = 24,
  theme = "asciinema",
  fit = "width",
  showControls = false,
}) => {
  const hostRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const readyRef = useRef(false);
  const modeRef = useRef<"playing" | "paused">("paused");
  const lastFrameRef = useRef<number | null>(null);
  const lastSeekTimeRef = useRef<number>(-1);

  // coalesce seeks while scrubbing
  const seekInFlightRef = useRef(false);
  const nextSeekTargetRef = useRef<number | null>(null);

  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  // Mount player once
  useEffect(() => {
    if (!hostRef.current) return;

    playerRef.current = createAsciinema(src, hostRef.current, {
      cols,
      rows,
      theme,
      fit,
      preload: true,
      autoplay: false,
      controls: showControls,
      poster: "npt:0:00",
    });

    let disposed = false;

    // Align once on the next frame (lets the DOM mount/measure)
    requestAnimationFrame(() => {
      if (disposed || !playerRef.current) return;
      const t0 = frame / fps;
      asPromise(playerRef.current.seek?.(t0)).then(() => {
        if (disposed) return;
        asPromise(playerRef.current.pause?.());
        readyRef.current = true;
        modeRef.current = "paused";
        lastSeekTimeRef.current = t0;
      });
    });

    return () => {
      disposed = true;
      try { playerRef.current?.dispose?.(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, cols, rows, theme, fit, showControls]);

  // Coalesced seek helper
  const seekCoalesced = (t: number) => {
    nextSeekTargetRef.current = t;
    if (seekInFlightRef.current) return;
    seekInFlightRef.current = true;

    const loop = () => {
      const target = nextSeekTargetRef.current;
      nextSeekTargetRef.current = null;
      if (target == null) {
        seekInFlightRef.current = false;
        return;
      }
      asPromise(playerRef.current.seek?.(target)).then(() => {
        lastSeekTimeRef.current = target;
        if (nextSeekTargetRef.current != null) loop();
        else seekInFlightRef.current = false;
      });
    };
    loop();
  };

  // Hybrid sync: smooth play (no per-frame seeks), exact pause/scrub seeks
  useEffect(() => {
    if (!readyRef.current || !playerRef.current) return;

    const prev = lastFrameRef.current;
    lastFrameRef.current = frame;

    const t = frame / fps;
    const isContinuousPlay = prev !== null && frame - prev === 1;

    if (isContinuousPlay) {
      if (modeRef.current !== "playing") {
        asPromise(playerRef.current.seek?.(t)).then(() => {
          asPromise(playerRef.current.play?.());
          modeRef.current = "playing";
        });
      }
      return; // playing: do not seek every frame -> no flicker
    }

    // paused or scrubbing:
    if (modeRef.current !== "paused") {
      asPromise(playerRef.current.pause?.());
      modeRef.current = "paused";
    }
    const tol = 1 / (fps * 2);
    if (Math.abs(t - lastSeekTimeRef.current) > tol) {
      seekCoalesced(t);
    }
  }, [frame, fps]);

  // Centered layout; player computes height from rows
  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        display: "grid",
        placeItems: "center",
        background: "#000",
      }}
    >
      <div
        ref={hostRef}
        style={{
          width: "100%",
          maxWidth: "100%",
          background: "#000",
        }}
      />
    </div>
  );
};
