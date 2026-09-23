import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/Scene4.css";

const THERMO = "#e8690a";
const COOL   = "#22434f";
const HOT    = "#ffdd9e";

const VERTEX_SHADER = /* glsl */ `
  varying vec2  vUv;
  varying vec3  vPos;
  varying vec3  vNorm;
  uniform float uTime;
  uniform float uProb;
  uniform float uEntropy;

  void main() {
    vUv   = uv;
    vNorm = normal;
    vec3 pos = position;

    /* Entropy-driven turbulence: rougher when uncertain (p≈0.5) */
    float t = uTime;
    float wave = sin(pos.x * 5.0 + t * 1.4)
               * sin(pos.y * 5.0 - t * 1.2)
               * sin(pos.z * 5.0 + t * 0.8);
    pos += normal * wave * uEntropy * 0.18;

    /* Probability bias deforms the sphere into a slight prolate /
       oblate shape depending on how far p is from 0.5            */
    float bias = (uProb - 0.5) * 2.0;          // −1 … +1
    pos.z *= 1.0 + bias * 0.12;
    pos.xy *= 1.0 - abs(bias) * 0.06;

    vPos = pos;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  varying vec2  vUv;
  varying vec3  vPos;
  varying vec3  vNorm;
  uniform float uTime;
  uniform float uProb;
  uniform float uEntropy;
  uniform vec3  uCool;
  uniform vec3  uMid;
  uniform vec3  uHot;

  void main() {
    /* Map the original normal z-coordinate to the bit-state axis:
       south pole (z = −1)  →  |0⟩   (p = 0)
       north pole (z = +1)  →  |1⟩   (p = 1)                       */
    float z = vNorm.z;
    float pMap = z * 0.5 + 0.5;

    /* Shift the colour gradient by the current probability */
    float mixFactor = smoothstep(0.0, 1.0, pMap + (uProb - 0.5) * 0.4);

    vec3 color = mix(uCool, uMid, smoothstep(0.0, 0.5, mixFactor));
    color      = mix(color, uHot, smoothstep(0.5, 1.0, mixFactor));

    /* Equator glow — brightest when entropy is maximal */
    float equator = 1.0 - abs(z);
    float glow = equator * uEntropy * 1.6;
    color += vec3(1.0, 0.85, 0.5) * glow;

    /* Subtle surface shimmer */
    float shimmer = sin(vPos.x * 10.0 + uTime * 2.0) * 0.015;
    color += shimmer;

    gl_FragColor = vec4(color, 1.0);
  }
`;


function TextSprite({ text, position, color = "#ffffff", size = 0.35 }) {
  const texture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = color;
    ctx.font = "bold 80px 'Times New Roman', serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(text, 256, 256);
    const tex = new THREE.CanvasTexture(canvas);
    tex.needsUpdate = true;
    return tex;
  }, [text, color]);

  return (
    <sprite position={position} scale={[size, size, 1]}>
      <spriteMaterial map={texture} transparent depthTest={false} opacity={0.9} />
    </sprite>
  );
}

function Axes() {
  const geoms = useMemo(() => {
    const L = 1.9;
    return [
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(-L, 0, 0), new THREE.Vector3(L, 0, 0)
      ]), // x
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, -L, 0), new THREE.Vector3(0, L, 0)
      ]), // y
      new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(0, 0, -L), new THREE.Vector3(0, 0, L)
      ]), // z
    ];
  }, []);

  return (
    <group>
      <line geometry={geoms[0]}>
        <lineBasicMaterial color="#e74c3c" />
      </line>
      <line geometry={geoms[1]}>
        <lineBasicMaterial color="#2ecc71" />
      </line>
      <line geometry={geoms[2]}>
        <lineBasicMaterial color="#3498db" />
      </line>

      {/* Axis labels */}
      <TextSprite text="x" position={[2.05, 0, 0]} color="#e74c3c" size={0.22} />
      <TextSprite text="y" position={[0, 2.05, 0]} color="#2ecc71" size={0.22} />
      <TextSprite text="z" position={[0, 0, 2.05]} color="#3498db" size={0.22} />

      {/* Pole state markers */}
      <mesh position={[0, 0, -1.35]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={COOL} />
      </mesh>
      <TextSprite text="|0⟩  p≈0" position={[0.3, 0.15, -1.5]} color={COOL} size={0.32} />

      <mesh position={[0, 0, 1.35]}>
        <sphereGeometry args={[0.04, 16, 16]} />
        <meshBasicMaterial color={HOT} />
      </mesh>
      <TextSprite text="|1⟩  p≈1" position={[0.3, 0.15, 1.5]} color={HOT} size={0.32} />
    </group>
  );
}


function EquatorRing() {
  const ref = useRef();
  useFrame((state) => {
    if (!ref.current) return;
    ref.current.rotation.z = state.clock.elapsedTime * 0.08;
    const s = 1.0 + Math.sin(state.clock.elapsedTime * 0.4) * 0.015;
    ref.current.scale.set(s, s, s);
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2, 0, 0]}>
      <torusGeometry args={[1.32, 0.007, 16, 120]} />
      <meshBasicMaterial color={THERMO} transparent opacity={0.3} />
    </mesh>
  );
}


function ProbabilisticBit() {
  const meshRef = useRef();
  const wireRef = useRef();
  const matRef  = useRef();

  const uniforms = useMemo(
    () => ({
      uTime:    { value: 0 },
      uProb:    { value: 0.5 },
      uEntropy: { value: 0.693 },
      uCool:    { value: new THREE.Color(COOL) },
      uMid:     { value: new THREE.Color(THERMO) },
      uHot:     { value: new THREE.Color(HOT) },
    }),
    []
  );

  useFrame((state) => {
    const t = state.clock.elapsedTime;

    /* Slowly oscillate probability so the viewer sees the bit
       evolve from ordered → uncertain → ordered               */
    const prob = 0.5 + 0.35 * Math.sin(t * 0.22);
    const p    = Math.max(0.001, Math.min(0.999, prob));
    const entropy = -(p * Math.log(p) + (1.0 - p) * Math.log(1.0 - p));

    if (matRef.current) {
      matRef.current.uniforms.uTime.value    = t;
      matRef.current.uniforms.uProb.value    = prob;
      matRef.current.uniforms.uEntropy.value = entropy;
    }
    if (meshRef.current) meshRef.current.rotation.y = t * 0.12;
    if (wireRef.current) wireRef.current.rotation.y = t * 0.12;
  });

  return (
    <group>
      <mesh ref={meshRef}>
        <icosahedronGeometry args={[1.3, 6]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={VERTEX_SHADER}
          fragmentShader={FRAGMENT_SHADER}
          uniforms={uniforms}
        />
      </mesh>

      <mesh ref={wireRef} scale={1.015}>
        <icosahedronGeometry args={[1.3, 1]} />
        <meshBasicMaterial color="#ffffff" wireframe transparent opacity={0.06} />
      </mesh>

      <Axes />
      <EquatorRing />
    </group>
  );
}


function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas
      camera={{ position: [2.4, 1.6, 3.6], fov: 40 }}
      dpr={[1, 1.6]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={isDark ? 0.4 : 0.8} />
      <pointLight position={[3, 2, 3]} intensity={0.7} color={THERMO} />
      <pointLight position={[-3, -2, -3]} intensity={0.25} color={COOL} />
      <ProbabilisticBit />
    </Canvas>
  );
}


function FormulaCard() {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "14px",
        left: "14px",
        background: "rgba(10, 12, 18, 0.55)",
        backdropFilter: "blur(10px)",
        WebkitBackdropFilter: "blur(10px)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: "12px",
        padding: "14px 18px",
        fontFamily: "'Times New Roman', Times, serif",
        color: "#e2e8f0",
        lineHeight: 1.5,
        pointerEvents: "none",
        userSelect: "none",
        maxWidth: "320px",
      }}
    >
      <div
        style={{
          fontSize: "10px",
          textTransform: "uppercase",
          letterSpacing: "0.12em",
          color: THERMO,
          marginBottom: "6px",
          fontFamily: "system-ui, sans-serif",
          fontWeight: 600,
        }}
      >
        Ising Energy
      </div>
      <div style={{ fontSize: "17px" }}>
        E(<b>s</b>) = − Σ<sub>i&lt;j</sub> J<sub>ij</sub> s<sub>i</sub> s<sub>j</sub>
        &nbsp;−&nbsp; Σ<sub>i</sub> h<sub>i</sub> s<sub>i</sub>
      </div>
    </div>
  );
}


// --- Thermal gradient background ---------------------------------------------
// Whole-slide heat field. A small WebGL fragment shader draws domain-warped
// noise as temperature and maps it through a cold -> hot colour ramp. Hot and
// cold regions drift and slowly trade places. Under the cursor it adds a hot
// core with a cold rim that stretches into a short comet while the pointer
// moves, plus a little convection swirl.
//
// It renders at ~1/3 resolution: the field is all soft gradients, so the
// browser's upscale costs nothing visible. Colours and speed come from the
// --s4-* variables in Scene4.css, so both themes are tuned there.
// This block is identical in Scene4a.jsx and Scene4b.jsx.

const HEAT_RENDER_SCALE = 0.34; // canvas pixels per CSS pixel
const HEAT_MAX_PIXELS = 480000; // cap for very large screens

// Used only if the CSS variables are missing.
const HEAT_DEFAULT_DARK = ["#3fa7c4", "#123543", "#0b0f14", "#e8690a", "#ffe6b0"];
const HEAT_DEFAULT_LIGHT = ["#7fb6cc", "#d3e6ec", "#f6f1e8", "#f3a15a", "#d4500a"];

const HEAT_VERT = /* glsl */ `
  attribute vec2 aPos;
  void main() {
    gl_Position = vec4(aPos, 0.0, 1.0);
  }
`;

const HEAT_FRAG = /* glsl */ `
  #ifdef GL_FRAGMENT_PRECISION_HIGH
  precision highp float;
  #else
  precision mediump float;
  #endif

  uniform vec2  uRes;
  uniform float uTime;
  uniform vec2  uMouse;   // cursor, 0..1, y up
  uniform vec2  uTrail;   // lagging copy of the cursor
  uniform float uHover;   // 0..1
  uniform vec3  uC0;      // coldest
  uniform vec3  uC1;
  uniform vec3  uC2;      // neutral
  uniform vec3  uC3;
  uniform vec3  uC4;      // hottest

  vec2 hash2(vec2 p) {
    p = vec2(dot(p, vec2(127.1, 311.7)), dot(p, vec2(269.5, 183.3)));
    return -1.0 + 2.0 * fract(sin(p) * 43758.5453);
  }

  float noise(vec2 p) {
    vec2 i = floor(p);
    vec2 f = fract(p);
    vec2 u = f * f * (3.0 - 2.0 * f);
    float a = dot(hash2(i), f);
    float b = dot(hash2(i + vec2(1.0, 0.0)), f - vec2(1.0, 0.0));
    float c = dot(hash2(i + vec2(0.0, 1.0)), f - vec2(0.0, 1.0));
    float d = dot(hash2(i + vec2(1.0, 1.0)), f - vec2(1.0, 1.0));
    return mix(mix(a, b, u.x), mix(c, d, u.x), u.y);
  }

  float fbm(vec2 p) {
    float v = 0.0;
    float a = 0.55;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 4; i++) {
      v += a * noise(p);
      p = r * p * 1.97 + vec2(11.3, 7.1);
      a *= 0.42;
    }
    return v;
  }

  float fbm3(vec2 p) {
    float v = 0.0;
    float a = 0.5;
    mat2 r = mat2(0.8, 0.6, -0.6, 0.8);
    for (int i = 0; i < 3; i++) {
      v += a * noise(p);
      p = r * p * 2.03 + vec2(11.3, 7.1);
      a *= 0.5;
    }
    return v;
  }

  vec3 ramp(float t) {
    t = clamp(t, 0.0, 1.0);
    vec3 c = mix(uC0, uC1, smoothstep(0.0, 0.3, t));
    c = mix(c, uC2, smoothstep(0.22, 0.52, t));
    c = mix(c, uC3, smoothstep(0.48, 0.78, t));
    return mix(c, uC4, smoothstep(0.74, 1.0, t));
  }

  void main() {
    vec2 uv  = gl_FragCoord.xy / uRes;
    vec2 asp = vec2(uRes.x / uRes.y, 1.0);
    vec2 p   = (uv - 0.5) * asp;
    vec2 m   = (uMouse - 0.5) * asp;
    vec2 tr  = (uTrail - 0.5) * asp;
    float t  = uTime;

    /* distance to the comet segment trail -> cursor */
    vec2 pa = p - tr;
    vec2 ba = m - tr;
    float h = clamp(dot(pa, ba) / max(dot(ba, ba), 1e-5), 0.0, 1.0);
    float d = length(pa - ba * h);

    /* convection: the field twists around the cursor */
    float sw = uHover * 0.9 * exp(-d * d * 26.0);
    float cs = cos(sw);
    float sn = sin(sw);
    vec2 rel = p - m;
    vec2 ps = m + vec2(cs * rel.x - sn * rel.y, sn * rel.x + cs * rel.y);

    /* ambient field: domain-warped noise drifting in several directions */
    vec2 s = ps * 1.2;
    vec2 q = vec2(fbm(s + t * vec2(0.034, 0.019)),
                  fbm(s + vec2(5.2, 1.3) - t * vec2(0.021, 0.03)));
    vec2 r = vec2(fbm(s + 2.1 * q + vec2(1.7, 9.2) + t * 0.047),
                  fbm(s + 2.1 * q + vec2(8.3, 2.8) - t * 0.04));
    float f = fbm(s + 1.6 * r);

    /* slow tide so hot and cold regions trade places across the slide */
    float tide = 0.5 * sin(t * 0.055 + p.x * 1.3 - p.y * 0.9)
               + 0.5 * sin(t * 0.041 - p.x * 0.8 + p.y * 1.5 + 1.7);

    float temp = 0.5 + f * 1.4 + tide * 0.2;

    /* cursor: hot core, cold rim, edges wobble with the field */
    float R = 0.13;
    float dd = d + fbm3(p * 4.0 + t * 0.3) * 0.06;
    float core = exp(-(dd * dd) / (R * R)) * mix(0.6, 1.0, h);
    float x = (dd - R * 1.55) / (R * 0.6);
    float rim = exp(-x * x);
    temp += uHover * (0.85 * core - 0.38 * rim);

    vec3 col = ramp(temp);

    /* dither against banding */
    col += (fract(sin(dot(gl_FragCoord.xy, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) / 255.0;
    gl_FragColor = vec4(col, 1.0);
  }
`;

function parseHexColor(value) {
  const m = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec((value || "").trim());
  if (!m) return null;
  let hex = m[1];
  if (hex.length === 3) hex = hex.replace(/./g, (c) => c + c);
  const n = parseInt(hex, 16);
  return [((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255];
}

function HeatBackground({ active, isDark }) {
  const wrapRef = useRef(null);
  const canvasRef = useRef(null);
  const activeRef = useRef(active);
  const darkRef = useRef(isDark);
  const kickRef = useRef(() => {});

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return undefined;

    const s = {
      clientX: 0,
      clientY: 0,
      hasPointer: false,
      px: 0.5, py: 0.5, // pointer
      mx: 0.5, my: 0.5, // cursor (fast follow)
      tx: 0.5, ty: 0.5, // trail (slow follow)
      hover: 0,
      time: 40,
      speed: 1,
      palette: null,
      paletteTarget: null,
    };

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    let reduced = motionQuery.matches;
    let gl = null;
    let prog = null;
    let buf = null;
    let loc = {};
    let raf = 0;
    let last = 0;
    let styleDirty = true;
    let ready = false;

    const setupGL = () => {
      const opts = {
        alpha: false,
        antialias: false,
        depth: false,
        stencil: false,
        preserveDrawingBuffer: false,
        powerPreference: "low-power",
      };
      gl = canvas.getContext("webgl", opts) || canvas.getContext("experimental-webgl", opts);
      if (!gl || gl.isContextLost()) return false;

      const compile = (type, src) => {
        const sh = gl.createShader(type);
        gl.shaderSource(sh, src);
        gl.compileShader(sh);
        if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
          console.warn("[Scene4] heat shader:", gl.getShaderInfoLog(sh));
          gl.deleteShader(sh);
          return null;
        }
        return sh;
      };
      const vs = compile(gl.VERTEX_SHADER, HEAT_VERT);
      const fs = compile(gl.FRAGMENT_SHADER, HEAT_FRAG);
      if (!vs || !fs) return false;

      prog = gl.createProgram();
      gl.attachShader(prog, vs);
      gl.attachShader(prog, fs);
      gl.linkProgram(prog);
      gl.deleteShader(vs);
      gl.deleteShader(fs);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
        console.warn("[Scene4] heat program:", gl.getProgramInfoLog(prog));
        gl.deleteProgram(prog);
        prog = null;
        return false;
      }
      gl.useProgram(prog);

      // one triangle that covers the whole viewport
      buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aPos = gl.getAttribLocation(prog, "aPos");
      gl.enableVertexAttribArray(aPos);
      gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

      loc = {};
      ["uRes", "uTime", "uMouse", "uTrail", "uHover", "uC0", "uC1", "uC2", "uC3", "uC4"].forEach(
        (name) => {
          loc[name] = gl.getUniformLocation(prog, name);
        }
      );
      return true;
    };

    const readStyle = () => {
      styleDirty = false;
      const cs = getComputedStyle(wrap);
      const defaults = darkRef.current ? HEAT_DEFAULT_DARK : HEAT_DEFAULT_LIGHT;
      s.paletteTarget = defaults.map(
        (hex, i) => parseHexColor(cs.getPropertyValue(`--s4-c${i}`)) || parseHexColor(hex)
      );
      if (!s.palette) s.palette = s.paletteTarget.map((c) => c.slice());
      const speed = parseFloat(cs.getPropertyValue("--s4-flow-speed"));
      s.speed = Number.isFinite(speed) ? speed : 1;
    };

    const draw = () => {
      if (prog && gl && !gl.isContextLost()) {
        gl.viewport(0, 0, canvas.width, canvas.height);
        gl.uniform2f(loc.uRes, canvas.width, canvas.height);
        gl.uniform1f(loc.uTime, s.time);
        gl.uniform2f(loc.uMouse, s.mx, s.my);
        gl.uniform2f(loc.uTrail, s.tx, s.ty);
        gl.uniform1f(loc.uHover, s.hover);
        s.palette.forEach((c, i) => gl.uniform3fv(loc[`uC${i}`], c));
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        if (!ready) {
          ready = true;
          wrap.setAttribute("data-ready", "");
        }
      } else {
        // CSS fallback: only the cursor spot needs JS
        wrap.style.setProperty("--s4-mx", `${(s.mx * 100).toFixed(2)}%`);
        wrap.style.setProperty("--s4-my", `${((1 - s.my) * 100).toFixed(2)}%`);
        wrap.style.setProperty("--s4-hover", s.hover.toFixed(3));
      }
    };

    const frame = (now) => {
      raf = 0;
      const dt = last ? Math.min((now - last) / 1000, 0.1) : 1 / 60;
      last = now;
      const ease = (rate) => 1 - Math.exp(-rate * dt);

      if (styleDirty) readStyle();

      // pointer -> canvas uv (y up); rect is read once per frame
      let target = 0;
      if (s.hasPointer) {
        const rect = wrap.getBoundingClientRect(); // canvas is display:none in fallback
        if (rect.width > 0 && rect.height > 0) {
          const u = (s.clientX - rect.left) / rect.width;
          const v = 1 - (s.clientY - rect.top) / rect.height;
          if (u >= 0 && u <= 1 && v >= 0 && v <= 1) {
            s.px = u;
            s.py = v;
            target = 1;
          }
        }
      }
      // cursor re-enters: start the spot where the pointer is
      if (target && s.hover < 0.02) {
        s.mx = s.tx = s.px;
        s.my = s.ty = s.py;
      }

      const km = ease(12);
      const kt = ease(2.6);
      s.mx += (s.px - s.mx) * km;
      s.my += (s.py - s.my) * km;
      s.tx += (s.mx - s.tx) * kt;
      s.ty += (s.my - s.ty) * kt;
      s.hover += (target - s.hover) * ease(target > s.hover ? 3.2 : 1.3);

      // theme switch: blend the ramp instead of snapping
      let paletteMoving = false;
      const kp = ease(5);
      s.palette.forEach((c, i) => {
        const goal = s.paletteTarget[i];
        for (let k = 0; k < 3; k++) {
          const diff = goal[k] - c[k];
          if (Math.abs(diff) > 0.002) paletteMoving = true;
          c[k] += diff * kp;
        }
      });

      if (activeRef.current && !reduced) s.time += dt * s.speed;

      draw();

      const settling =
        paletteMoving ||
        Math.abs(target - s.hover) > 0.003 ||
        Math.abs(s.px - s.tx) + Math.abs(s.py - s.ty) > 0.0005;
      const flowing = !!prog && !reduced;
      if (activeRef.current && (flowing || settling)) raf = requestAnimationFrame(frame);
    };

    const kick = (restyle) => {
      if (restyle) styleDirty = true;
      if (!raf) {
        last = 0;
        raf = requestAnimationFrame(frame);
      }
    };
    kickRef.current = kick;

    if (!setupGL()) {
      prog = null;
      wrap.setAttribute("data-fallback", "");
    }

    // --- sizing
    const resize = () => {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      if (!w || !h) return;
      let scale = HEAT_RENDER_SCALE;
      if (w * h * scale * scale > HEAT_MAX_PIXELS) scale = Math.sqrt(HEAT_MAX_PIXELS / (w * h));
      const cw = Math.max(2, Math.round(w * scale));
      const ch = Math.max(2, Math.round(h * scale));
      if (canvas.width !== cw || canvas.height !== ch) {
        canvas.width = cw;
        canvas.height = ch;
      }
      kick();
    };
    let ro = null;
    if (typeof ResizeObserver !== "undefined") {
      ro = new ResizeObserver(resize);
      ro.observe(canvas);
    } else {
      window.addEventListener("resize", resize);
    }
    resize();

    // --- pointer (window-level, so text and the 3D pane count as hover too)
    const onMove = (e) => {
      s.clientX = e.clientX;
      s.clientY = e.clientY;
      s.hasPointer = true;
      if (activeRef.current) kick();
    };
    const onRelease = (e) => {
      if (e.pointerType !== "mouse") {
        s.hasPointer = false;
        kick();
      }
    };
    const onOut = (e) => {
      if (!e.relatedTarget) {
        s.hasPointer = false;
        kick();
      }
    };
    const onBlur = () => {
      s.hasPointer = false;
      kick();
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onMove, { passive: true });
    window.addEventListener("pointerup", onRelease, { passive: true });
    window.addEventListener("pointercancel", onRelease, { passive: true });
    document.addEventListener("mouseout", onOut);
    window.addEventListener("blur", onBlur);

    const onMotion = (e) => {
      reduced = e.matches;
      kick();
    };
    motionQuery.addEventListener("change", onMotion);

    // --- WebGL context loss: fall back to CSS, recover when restored
    const onLost = (e) => {
      e.preventDefault();
      prog = null;
      ready = false;
      wrap.removeAttribute("data-ready");
      wrap.setAttribute("data-fallback", "");
    };
    const onRestored = () => {
      if (setupGL()) wrap.removeAttribute("data-fallback");
      else prog = null;
      kick(true);
    };
    canvas.addEventListener("webglcontextlost", onLost);
    canvas.addEventListener("webglcontextrestored", onRestored);

    kick(true);

    return () => {
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      kickRef.current = () => {};
      if (ro) ro.disconnect();
      else window.removeEventListener("resize", resize);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      window.removeEventListener("pointerup", onRelease);
      window.removeEventListener("pointercancel", onRelease);
      document.removeEventListener("mouseout", onOut);
      window.removeEventListener("blur", onBlur);
      motionQuery.removeEventListener("change", onMotion);
      canvas.removeEventListener("webglcontextlost", onLost);
      canvas.removeEventListener("webglcontextrestored", onRestored);
      if (gl && !gl.isContextLost()) {
        if (buf) gl.deleteBuffer(buf);
        if (prog) gl.deleteProgram(prog);
      }
      prog = null;
      wrap.removeAttribute("data-ready");
      wrap.removeAttribute("data-fallback");
    };
  }, []);

  useEffect(() => {
    activeRef.current = active;
    kickRef.current();
  }, [active]);

  useEffect(() => {
    darkRef.current = isDark;
    kickRef.current(true); // re-read colours on the next frame, after the theme lands
  }, [isDark]);

  return (
    <>
      <div
        ref={wrapRef}
        className={`scene4-heat${active ? "" : " is-paused"}`}
        aria-hidden="true"
      >
        <canvas ref={canvasRef} className="scene4-heat-canvas" />
      </div>
      <div className="scene4-heat-veil" aria-hidden="true" />
    </>
  );
}


export default function Scene4({ active }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  return (
    <div className="scene-inner scene4-root">
      {/* whole-slide thermal background: drifts on its own, heats up under the cursor */}
      <HeatBackground active={active} isDark={isDark} />

      <div className="scene4-content">
        <div className="split">
          <div className="scene-text">
            <span className="eyebrow stroke-hair">
              <span className="eyebrow-dot" style={{ background: THERMO }} />
              {t("scene4.eyebrow")}
            </span>
            <div style={{ margin: "10px 0 20px", whiteSpace: "nowrap", display: "inline-flex", alignItems: "baseline", gap: "0.02em" }}>
              <span className="letter-giant stroke-lg" style={{ color: THERMO, flexShrink: 0 }}>
                T
              </span>
              <span className="letter-suffix stroke-sm" style={{ flexShrink: 0 }}>
                hermodynamic
              </span>
            </div>
            <p className="body-line" style={{ maxWidth: "38ch" }}>
              {t("scene4.description")}
            </p>
          </div>
          <div className="visual-pane">
            <div className="instrument-frame">{active ? <Visual /> : null}</div>
          </div>
        </div>
      </div>
    </div>
  );
}