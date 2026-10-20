import { useEffect, useState } from "react";

// SceneManager TRANSITION_MS plus a little margin.
export const SLIDE_MS = 1000;

// Keep a scene's 3D visual warm.
// Creating the canvas when the slide becomes active (and destroying it when it
// leaves) makes every visit pay for a new WebGL context, shader compiles and
// geometry — right in the middle of the slide transition. Instead, mount it in
// idle time while the scene is still a neighbour, then only pause it:
// frameloop "always" while active, "never" while not (see PrecompileShaders).
export default function useWarmMount(active) {
  const [warm, setWarm] = useState(active);
  useEffect(() => {
    if (warm) return undefined;
    if (active) {
      setWarm(true);
      return undefined;
    }
    // A scene becomes a neighbour as a slide starts. The slide runs on the
    // compositor, so the main thread looks idle — wait for it to finish first.
    let idleId = 0;
    const timer = setTimeout(() => {
      if (typeof window.requestIdleCallback === "function") {
        idleId = window.requestIdleCallback(() => setWarm(true), { timeout: 2500 });
      } else {
        setWarm(true);
      }
    }, SLIDE_MS);
    return () => {
      clearTimeout(timer);
      if (idleId) window.cancelIdleCallback(idleId);
    };
  }, [active, warm]);
  return warm || active;
}
