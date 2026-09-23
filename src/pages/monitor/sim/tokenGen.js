// Frontend-only token stream (the backend schema has none). Words are chosen
// from a small pseudo-vocabulary so the generation strip reads like language.

const VOCAB = (
  "the model learns to predict each token from context , while gradients flow backward " +
  "through every layer . attention heads specialise : some track syntax , others track " +
  "long range meaning . the substrate beneath computes with light , spins , or qubits ; " +
  "energy per token falls as the loss curve bends toward its floor . mission control " +
  "watches perplexity , learning rate , and thermal state in real time . a checkpoint is " +
  "written ; the run continues . photons interfere , particles settle , wavefunctions collapse " +
  "and the next word appears"
).split(" ");

const WINDOW = 16;
const DIFFUSION_RECORDS = 50; // one full 1000→0 sweep

const clamp01 = (v) => Math.min(1, Math.max(0, v));

export function createTokenGen(rng) {
  let tokens = [];
  let confs = [];
  let slots = null;
  let offsets = null;
  let k = 0;

  return {
    ar() {
      const tok = rng.pick(VOCAB);
      tokens.push(tok);
      confs.push(clamp01(0.3 + 0.68 * Math.pow(rng.next(), 0.6)));
      if (tokens.length > WINDOW) { tokens.shift(); confs.shift(); }
      return { mode: "ar", tokens: [...tokens], confidences: [...confs], timestep: null, new_token: tok };
    },
    diffusion() {
      if (!slots || k >= DIFFUSION_RECORDS) {
        slots = Array.from({ length: WINDOW }, () => rng.pick(VOCAB));
        offsets = Array.from({ length: WINDOW }, () => rng.range(-0.15, 0.15));
        k = 0;
      }
      const t = 1000 - (1000 / DIFFUSION_RECORDS) * k;
      k++;
      const confidences = offsets.map((o) => clamp01(1 - t / 1000 + o));
      return { mode: "diffusion", tokens: [...slots], confidences, timestep: Math.round(t), new_token: null };
    },
    reset() { tokens = []; confs = []; slots = null; k = 0; },
  };
}
