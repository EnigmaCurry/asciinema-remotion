// src/Composition.tsx
import {AbsoluteFill, staticFile} from "remotion";
import {AsciinemaSync} from "./AsciinemaSync";

export type MyCompositionProps = {
  castPath: string;
  cols?: number;
  rows?: number;
  theme?: "asciinema" | "tango" | "solarized-dark" | "solarized-light";
};

export const MyComposition: React.FC<MyCompositionProps> = ({
  castPath,
  cols = 80,
  rows = 24,
  theme = "asciinema",
}) => {
  return (
    <AbsoluteFill style={{backgroundColor: "#000"}}>
      <AsciinemaSync
        src={staticFile(castPath)}   // build URL once here
        cols={cols}
        rows={rows}
        theme={theme}
        showControls={false}
      />
    </AbsoluteFill>
  );
};
