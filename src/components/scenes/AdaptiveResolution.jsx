import { useThree } from "@react-three/fiber";
import { PerformanceMonitor } from "@react-three/drei";

// Drop to 1× pixel ratio when the GPU can't hold the frame rate, and go back
// up to `max` once it recovers. Fast devices never notice; slow ones keep the
// animation smooth instead of stuttering.
export default function AdaptiveResolution({ max }) {
  const setDpr = useThree((s) => s.setDpr);
  return (
    <PerformanceMonitor
      flipflops={3}
      onDecline={() => setDpr(1)}
      onIncline={() => setDpr(Math.min(window.devicePixelRatio || 1, max))}
      onFallback={() => setDpr(1)}
    />
  );
}
