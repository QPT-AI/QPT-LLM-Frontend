// Procedural surfaces for the architecture diagram, one per compute paradigm.
// Each slab gets a MeshStandardMaterial patched through onBeforeCompile so
// three.js still does the lighting; the paradigm chunk only decides albedo,
// emissive, roughness/metalness and the glowing border rim. Only four shader
// programs exist (customProgramCacheKey = paradigm); uniforms are per slab.
import * as THREE from "three";
import { PARADIGM_META, PARADIGM_TEXTURE } from "../../../../config/paradigms";

// ── shared GLSL ──────────────────────────────────────────────────────────────
const UNIFORMS_GLSL = /* glsl */ `
  uniform float uTime;
  uniform float uMotion;
  uniform float uDim;
  uniform float uHot;
  uniform float uEnergy;
  uniform float uHeat;
  uniform float uSeed;
  uniform vec3 uSize;
  uniform vec3 uBase;
  uniform vec3 uRim;
  varying vec3 vLocal;
  varying vec3 vLocalN;
`;

const HELPERS_GLSL = /* glsl */ `
  float qhash21(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
  float qnoise(vec2 p) {
    vec2 i = floor(p), f = fract(p); f = f * f * (3.0 - 2.0 * f);
    return mix(mix(qhash21(i), qhash21(i + vec2(1, 0)), f.x), mix(qhash21(i + vec2(0, 1)), qhash21(i + vec2(1, 1)), f.x), f.y);
  }
  float qfbm(vec2 p) { return 0.5 * qnoise(p) + 0.25 * qnoise(p * 2.03 + 7.1) + 0.125 * qnoise(p * 4.07 + 3.3); }
  vec3 qrainbow(float h) { return 0.5 + 0.5 * cos(6.28318 * (h + vec3(0.0, 0.33, 0.67))); }
  /* in-plane coordinates of the face this fragment lies on, in world units */
  vec2 qplane(vec3 p, vec3 an) { return an.x > 0.5 ? p.zy : (an.y > 0.5 ? p.xz : p.xy); }
  /* distance to the nearest border of the current face, world units */
  float qedge(vec3 an) {
    vec3 d = (0.5 - abs(vLocal)) * uSize + an * 1e3;
    return min(d.x, min(d.y, d.z));
  }
  /* 0 at the face centre → 1 at its border (rounded-rectangle isolines) */
  float qradius(vec3 an) {
    vec3 q = abs(vLocal) * 2.0 * (1.0 - an);
    float cheb = max(q.x, max(q.y, q.z));
    return clamp(mix(length(q) * 0.7071, cheb, 0.55), 0.0, 1.0);
  }
  vec3 qramp6(float t, vec3 c0, vec3 c1, vec3 c2, vec3 c3, vec3 c4, vec3 c5) {
    t = clamp(t, 0.0, 1.0) * 5.0;
    vec3 c = mix(c0, c1, clamp(t, 0.0, 1.0));
    c = mix(c, c2, clamp(t - 1.0, 0.0, 1.0));
    c = mix(c, c3, clamp(t - 2.0, 0.0, 1.0));
    c = mix(c, c4, clamp(t - 3.0, 0.0, 1.0));
    return mix(c, c5, clamp(t - 4.0, 0.0, 1.0));
  }
`;

// Every surface fills: qptAlbedo, qptEmissive, qptRough, qptMetal.
// Available: p (world-scaled local pos), uv2 (in-plane coords), an (abs local normal),
// edge (distance to border), r (0 centre → 1 border), t (time), viewDot (|n·v|).
const SURFACE_PRELUDE = /* glsl */ `
  vec3 an = abs(vLocalN);
  vec3 p = vLocal * uSize + uSeed * 7.31;
  vec2 uv2 = qplane(p, an);
  float edge = qedge(an);
  float r = qradius(an);
  float t = uTime * uMotion;
  float viewDot = abs(dot(normalize(vViewPosition), normalize(vNormal)));
  vec3 qptAlbedo = uBase;
  vec3 qptEmissive = vec3(0.0);
  float qptRough = 0.8;
  float qptMetal = 0.0;
`;

const SURFACES = {
  // Cybernetic Quantum Matrix: emerald base, teal topographic contours,
  // violet micro-circuitry, luminous pulsing nodes.
  quantum: /* glsl */ `
    vec3 teal = vec3(0.184, 0.831, 0.769);
    vec3 violet = vec3(0.541, 0.361, 0.965);
    qptAlbedo = uBase * 0.62;
    float field = qfbm(uv2 * 1.7 + vec2(t * 0.02, -t * 0.013));
    float contour = abs(fract(field * 7.0) - 0.5);
    float line = 1.0 - smoothstep(0.0, 0.06, contour);
    qptAlbedo = mix(qptAlbedo, teal, line * 0.85);
    vec2 g = uv2 / 0.26;
    vec2 gc = floor(g), gf = fract(g);
    float h = qhash21(gc + uSeed);
    float trace = h > 0.62 ? 1.0 - smoothstep(0.03, 0.05, abs(gf.y - 0.5))
                : h > 0.34 ? 1.0 - smoothstep(0.03, 0.05, abs(gf.x - 0.5)) : 0.0;
    float pad = 1.0 - smoothstep(0.06, 0.09, length(gf - 0.5)) ;
    qptAlbedo = mix(qptAlbedo, violet, (trace * 0.28 + pad * 0.5 * step(0.5, h)));
    vec2 n = uv2 / 0.42;
    vec2 nc = floor(n), nf = fract(n);
    float hn = qhash21(nc + 13.0 + uSeed);
    float node = 0.0;
    if (hn > 0.9) {
      vec2 c = vec2(qhash21(nc + 1.0), qhash21(nc + 2.0)) * 0.6 + 0.2;
      float d = length((nf - c) * vec2(1.0, 1.0));
      float pulse = 0.55 + 0.45 * sin(t * 1.6 + hn * 6.2832);
      node = smoothstep(0.11, 0.015, d) * pulse;
    }
    qptEmissive = teal * (line * 0.10 + node * (0.6 + 0.8 * uEnergy)) + vec3(0.9, 0.95, 1.0) * node * 0.35;
    qptRough = 0.7;
    qptMetal = 0.05;
  `,

  // Holographic Diffraction Foil: metallic amber with view-dependent rainbow,
  // starburst micro-etchings and frost shimmer.
  photonic: /* glsl */ `
    float hue = fract(1.6 * viewDot + 0.35 * qfbm(uv2 * 2.5) + t * 0.015 + uSeed * 0.1);
    // spectrum anchored to the brand amber: amber face-on, rainbow shimmer at grazing angles (thin-film look)
    vec3 spectrum = mix(qrainbow(hue), uBase, 0.35);
    float irid = 0.10 + 0.42 * pow(1.0 - viewDot, 1.6);
    qptAlbedo = mix(uBase, spectrum, irid);
    vec2 s = uv2 / 0.3;
    vec2 sc = floor(s), sf = fract(s);
    float sh = qhash21(sc + uSeed);
    vec2 cen = vec2(qhash21(sc + 3.0), qhash21(sc + 4.0)) * 0.6 + 0.2;
    vec2 v = sf - cen;
    float ang = atan(v.y, v.x);
    float rr = length(v);
    float star = pow(abs(sin(ang * 8.0 + sh * 6.2832)), 28.0) * smoothstep(0.34, 0.0, rr) * step(0.45, sh);
    float frost = qnoise(uv2 * 34.0) - 0.5;
    qptAlbedo += frost * 0.06;
    qptEmissive = uBase * 0.16 + spectrum * irid * 0.12 + vec3(1.0) * star * 0.35 + spectrum * star * 0.25;
    qptRough = clamp(0.22 + frost * 0.2, 0.08, 0.5);
    qptMetal = 0.55;
  `,

  // Thermal Imaging Heat Map: cool edge → warm mid → white-hot core; core level
  // follows the substrate heat and the block's energy share.
  thermodynamic: /* glsl */ `
    float core = 0.55 * uHeat + 0.45 * uEnergy;
    float rr = clamp(r + 0.05 * (qfbm(uv2 * 3.0 + vec2(t * 0.08)) - 0.5), 0.0, 1.0);
    float k = pow(1.0 - rr, 0.6) * (0.66 + 0.5 * core);
    vec3 c0 = vec3(0.106, 0.310, 0.847);   // cool blue
    vec3 c1 = vec3(0.102, 0.671, 0.486);   // green
    vec3 c2 = vec3(0.941, 0.671, 0.0);     // yellow
    vec3 c3 = uBase;                       // brand orange (widest band)
    vec3 c4 = vec3(1.0, 0.231, 0.188);     // red
    vec3 c5 = vec3(1.0);                   // white-hot
    qptAlbedo = qramp6(k, c0, c1, c2, c3, c3, c4);
    qptAlbedo = mix(qptAlbedo, c5, smoothstep(0.86, 1.0, k));
    qptEmissive = qptAlbedo * smoothstep(0.55, 1.0, k) * 0.45;
    qptRough = 0.85;
    qptMetal = 0.0;
  `,

  // Matte graphite: plain dark grey with fine grain; recedes behind the three coloured paradigms.
  classical: /* glsl */ `
    float grain = qnoise(uv2 * 40.0) - 0.5;
    qptAlbedo = vec3(0.231, 0.243, 0.259) + grain * 0.06;
    qptRough = 0.95;
    qptMetal = 0.0;
  `,
};

const SURFACE_EPILOGUE = /* glsl */ `
  float rim = 1.0 - smoothstep(0.0, 0.035, edge);
  qptAlbedo *= mix(0.22, 1.0, uDim) * (1.0 + 0.25 * uHot);
  qptEmissive *= uDim;
  qptEmissive += uRim * rim * (0.9 + 0.6 * uHot) * uDim;
  diffuseColor.rgb = qptAlbedo;
`;

const SLAB_UNIFORM_KEYS = ["uTime", "uMotion", "uDim", "uHot", "uEnergy", "uHeat", "uSeed", "uSize", "uBase", "uRim"];

/**
 * A lit, procedurally textured material for one slab. Per-slab state lives in
 * `material.userData.u` (uniform objects) and is written every frame by Slabs.
 * `ink` is the current theme's ink color, mixed into the rim glow.
 */
export function makeSlabMaterial(paradigm, { seed = 0, size = [1, 1, 1], ink } = {}) {
  const base = new THREE.Color(PARADIGM_META[paradigm].color);
  if (paradigm === "classical") base.set(PARADIGM_TEXTURE.classical.base);
  const rim = new THREE.Color(PARADIGM_META[paradigm].color).lerp(new THREE.Color(ink), 0.45);
  const u = {
    uTime: { value: 0 },
    uMotion: { value: 1 },
    uDim: { value: 1 },
    uHot: { value: 0 },
    uEnergy: { value: 0.5 },
    uHeat: { value: 0.5 },
    uSeed: { value: seed },
    uSize: { value: new THREE.Vector3(...size) },
    uBase: { value: base },
    uRim: { value: rim },
  };

  const mat = new THREE.MeshStandardMaterial({ color: base, roughness: 0.8, metalness: 0 });
  mat.defines = { ...(mat.defines || {}), USE_UV: "" };
  mat.customProgramCacheKey = () => `qpt-slab-${paradigm}`;
  mat.onBeforeCompile = (shader) => {
    for (const k of SLAB_UNIFORM_KEYS) shader.uniforms[k] = u[k];
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", `#include <common>\n varying vec3 vLocal; varying vec3 vLocalN;`)
      .replace("#include <begin_vertex>", `#include <begin_vertex>\n vLocal = position; vLocalN = normal;`);
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>\n${UNIFORMS_GLSL}\n${HELPERS_GLSL}`)
      .replace("#include <color_fragment>", `#include <color_fragment>\n${SURFACE_PRELUDE}\n${SURFACES[paradigm]}\n${SURFACE_EPILOGUE}`)
      .replace("#include <roughnessmap_fragment>", `#include <roughnessmap_fragment>\n roughnessFactor = qptRough;`)
      .replace("#include <metalnessmap_fragment>", `#include <metalnessmap_fragment>\n metalnessFactor = qptMetal;`)
      .replace("#include <emissivemap_fragment>", `#include <emissivemap_fragment>\n totalEmissiveRadiance = qptEmissive;`);
  };
  mat.userData.u = u;
  mat.userData.paradigm = paradigm;
  return mat;
}
