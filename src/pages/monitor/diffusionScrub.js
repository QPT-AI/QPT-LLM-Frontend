// Shared between the HUD scrubber and the 3D diffusion cloud so both agree on
// per-token confidence when the user overrides the timestep.
export function scrubConfidence(i, timestep) {
  const offset = ((i * 37) % 11) / 40 - 0.13;
  return Math.min(1, Math.max(0, 1 - timestep / 1000 + offset));
}
