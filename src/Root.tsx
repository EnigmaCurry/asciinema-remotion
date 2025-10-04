// src/Root.tsx
import "asciinema-player/dist/bundle/asciinema-player.css";
import "./index.css";
import {Composition, staticFile} from "remotion";
import {MyComposition, MyCompositionProps} from "./Composition";

async function getCastDurationSeconds(url: string): Promise<number> {
  const res = await fetch(url);
  const txt = await res.text();

  // Try v2 (single JSON)
  try {
    const obj = JSON.parse(txt);
    if (typeof obj.duration === "number") return obj.duration;
    if (Array.isArray(obj.stdout) && obj.stdout.length) {
      const last = obj.stdout[obj.stdout.length - 1];
      if (Array.isArray(last) && typeof last[0] === "number") return last[0];
    }
  } catch {/* fall through to v1 */}

  // v1 (NDJSON-ish): last line timestamp
  const lines = txt.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length >= 2) {
    try {
      const arr = JSON.parse(lines[lines.length - 1]);
      if (Array.isArray(arr) && typeof arr[0] === "number") return arr[0];
    } catch {}
  }
  return 0;
}

const defaultProps: MyCompositionProps = {
  castPath: "casts/test1.cast",
  cols: 80,
  rows: 20,
  theme: "asciinema",
};

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="d-rymcg-tech"
        component={MyComposition}
        width={1920}
        height={1080}
        fps={30}
        defaultProps={defaultProps}
        // NOTE: Remotion passes the props you set (defaultProps or CLI/URL overrides)
        calculateMetadata={async ({props}: {props: MyCompositionProps}) => {
          const seconds = await getCastDurationSeconds(staticFile(props.castPath));
          const frames = Math.max(1, Math.ceil(seconds * 30));
          return {durationInFrames: frames};
        }}
      />
    </>
  );
};
