import { useEffect } from "react";
import { useThree } from "@react-three/fiber";

// Compile every shader in the background (KHR_parallel_shader_compile) and
// upload buffers/textures with one render, so the canvas is ready before the
// slide comes into view. Pair with frameloop "never" while inactive: a
// "demand" canvas renders on mount and compiles synchronously, blocking the
// main thread for hundreds of ms.
export default function PrecompileShaders() {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  useEffect(() => {
    let cancelled = false;
    // The error check forces a synchronous wait on every compile.
    gl.debug.checkShaderErrors = import.meta.env.DEV;
    gl.compileAsync(scene, camera).then(() => {
      if (!cancelled) gl.render(scene, camera);
    });
    return () => {
      cancelled = true;
    };
  }, [gl, scene, camera]);
  return null;
}
