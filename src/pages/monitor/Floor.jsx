import { Grid } from "@react-three/drei";
import { useTheme } from "../../context/ThemeContext";
import { colorsFor, FLOOR_Y } from "./theme";

/** Quiet reference grid beneath the diagram. */
export default function Floor() {
  const { isDark } = useTheme();
  const colors = colorsFor(isDark);
  return (
    <Grid
      position={[0, FLOOR_Y, 0]}
      args={[80, 80]}
      infiniteGrid
      cellSize={1}
      cellThickness={0.5}
      cellColor={colors.gridCell}
      sectionSize={5}
      sectionThickness={0.9}
      sectionColor={colors.gridSection}
      fadeDistance={55}
      fadeStrength={1.5}
    />
  );
}
