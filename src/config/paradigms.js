// Single source of truth for the four QPT compute paradigms.
// Colors mirror the CSS brand tokens in src/styles/global.css.

export const PARADIGM_META = {
  quantum:       { color: "#5bad1e", label: "Quantum",       glyph: "Q", cssVar: "--quantum" },
  photonic:      { color: "#f0ab00", label: "Photonic",      glyph: "P", cssVar: "--photonic" },
  thermodynamic: { color: "#e8690a", label: "Thermodynamic", glyph: "T", cssVar: "--thermo" },
  classical:     { color: "#8a8a8a", label: "Classical",     glyph: "C", cssVar: "--ternary" },
};

export const PARADIGM_ORDER = ["classical", "quantum", "photonic", "thermodynamic"];

/** Accent colours for each paradigm's procedural surface (shared by the 3D shaders and the legend swatches). */
export const PARADIGM_TEXTURE = {
  quantum:       { accentA: "#2fd4c4", accentB: "#8a5cf6" },                       // teal contours, violet circuitry
  photonic:      { spectrum: true },                                              // iridescent foil over the brand amber
  thermodynamic: { cool: ["#1b4fd8", "#1aab7c"], hot: ["#ff3b30", "#ffffff"] },  // edge → core heat ramp
  classical:     { base: "#3b3e42" },                                             // matte graphite
};

export function hexToRgb(hex) {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16),
    parseInt(h.slice(2, 4), 16),
    parseInt(h.slice(4, 6), 16),
  ];
}
