// JS-side constants for the Monitor scene. CSS tokens live in monitor.css.
export const COLORS = {
  dark: {
    bg: "#0b0d0e",
    gridCell: "#161a1e",
    gridSection: "#22282e",
    ink: "#e6ebf0",
    inkDim: "#7f8a96",
    stream: "#8a8a8a",
  },
  light: {
    bg: "#f5f6f4",
    gridCell: "#e3e5e2",
    gridSection: "#c9cdc8",
    ink: "#14171a",
    inkDim: "#5b6570",
    stream: "#6b6b6b",
  },
};

export function colorsFor(isDark) {
  return isDark ? COLORS.dark : COLORS.light;
}

export const DPR = [1, 2];
export const FLOOR_Y = -9.2;

export const CAMERA_FOV = 32;
export const CAMERA_TARGET = [0, -0.2, 0];

/** Camera presets as unit directions from the target; distance comes from fitDistance(). */
export const VIEWS = {
  perspective: [0.53, 0.28, 0.80],
  front:       [0.0, 0.02, 1.0],
  side:        [1.0, 0.02, 0.0],
};
export const DEFAULT_VIEW = "perspective";

/** Distance at which a stack of `height` world units fills ~89% of the viewport height. */
export function fitDistance(height) {
  return (height / (2 * Math.tan((CAMERA_FOV * Math.PI) / 360))) * 1.12;
}

export function viewPosition(view, height) {
  const d = fitDistance(height);
  const dir = VIEWS[view] ?? VIEWS[DEFAULT_VIEW];
  const len = Math.hypot(...dir);
  return [CAMERA_TARGET[0] + (dir[0] / len) * d, CAMERA_TARGET[1] + (dir[1] / len) * d, CAMERA_TARGET[2] + (dir[2] / len) * d];
}
