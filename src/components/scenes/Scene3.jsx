import { Suspense, useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Line, Trail } from "@react-three/drei";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";
import "../../styles/Scene3.css";
const PHOTONIC = "#f0ab00";

const X_START   = -2.6;
const X_END     =  2.6;
const AMPLITUDE = 0.55;
const OFF_SCREEN = new THREE.Vector3(0, -999, 0);
const PAUSE_DURATION = 1.0; // seconds to wait at the end before restarting

// Hover sparkles — tune here
const SPARK = {
  max: 160,           // sparkles alive at once
  spacing: 9,         // px of cursor travel per sparkle (lower = denser trail)
  idleRate: 5,        // sparkles per second while the cursor rests in the scene
  life: [0.55, 1.3],  // seconds each one lives (min, max)
  gravity: 24,        // px/s² — they drift down like glitter
  drag: 1.8,          // how quickly their initial burst slows
  starChance: 0.3,    // share of 4-point stars vs. round glints
};
// [glow, core] colours per theme; "gold" = PHOTONIC
const SPARK_COLORS = {
  dark:  { gold: ["240, 171, 0", "255, 236, 170"], glint: ["255, 255, 255", "255, 255, 255"] },
  light: { gold: ["240, 171, 0", "205, 130, 0"],   glint: ["196, 120, 0",   "150, 88, 0"] },
};

function buildSquareWavePoints(frequency) {
  const points = [];
  const totalWidth = X_END - X_START;
  const cycleWidth = totalWidth / frequency;
  const eps = 0.001;

  for (let c = 0; c < frequency; c++) {
    const x0 = X_START + c * cycleWidth;
    const x1 = x0 + cycleWidth / 2;
    const x2 = x0 + cycleWidth;

    points.push(new THREE.Vector3(x0,       -AMPLITUDE, 0));
    points.push(new THREE.Vector3(x0 + eps,  AMPLITUDE, 0));
    points.push(new THREE.Vector3(x1 - eps,  AMPLITUDE, 0));
    points.push(new THREE.Vector3(x1 + eps, -AMPLITUDE, 0));
    points.push(new THREE.Vector3(x2 - eps, -AMPLITUDE, 0));
  }
  points.push(new THREE.Vector3(X_END, -AMPLITUDE, 0));
  return points;
}

function squareWavePosition(t, frequency) {
  const totalWidth = X_END - X_START;
  const x = X_START + t * totalWidth;
  const cycleWidth = totalWidth / frequency;
  const posInCycle = ((x - X_START) % cycleWidth + cycleWidth) % cycleWidth;
  const y = posInCycle < cycleWidth / 2 ? AMPLITUDE : -AMPLITUDE;
  return new THREE.Vector3(x, y, 0);
}

function TravelingPulse({ frequency, speed }) {
  const tipRef = useRef();

  // All timing state lives in refs — no re-renders needed
  const cycleStartTime = useRef(null); // clock time when current run began
  const pauseStartTime = useRef(null); // clock time when pause began (null = not pausing)
  const cycleDuration  = useRef(1 / speed); // seconds for one full pass

  useFrame((state) => {
    const now = state.clock.elapsedTime;

    // First frame: initialise
    if (cycleStartTime.current === null) {
      cycleStartTime.current = now;
    }

    // --- PAUSING ---
    if (pauseStartTime.current !== null) {
      const pauseElapsed = now - pauseStartTime.current;
      if (pauseElapsed < PAUSE_DURATION) {
        // Still pausing — keep mesh off-screen so the trail stays flushed
        if (tipRef.current) tipRef.current.position.copy(OFF_SCREEN);
        return;
      }
      // Pause over — start a fresh cycle
      pauseStartTime.current = null;
      cycleStartTime.current = now;
    }

    // --- RUNNING ---
    const elapsed = now - cycleStartTime.current;
    const t = elapsed * speed; // 0 → 1 over one cycle

    if (t >= 1) {
      // Reached the end — park off-screen and begin pause
      if (tipRef.current) tipRef.current.position.copy(OFF_SCREEN);
      pauseStartTime.current = now;
      return;
    }

    const p = squareWavePosition(t, frequency);
    if (tipRef.current) tipRef.current.position.copy(p);
  });

  return (
    <Trail
      width={1.0}
      length={5}
      color={PHOTONIC}
      attenuation={(w) => w * w}
      target={tipRef}
    >
      <mesh ref={tipRef}>
        <sphereGeometry args={[0.05, 12, 12]} />
        <meshBasicMaterial color="#ffffff" toneMapped={false} />
      </mesh>
    </Trail>
  );
}

/* Sparkle sprites — drawn once per theme, then stamped with drawImage. */
function makeSprite(draw) {
  const c = document.createElement("canvas");
  c.width = c.height = 64;
  draw(c.getContext("2d"), 32);
  return c;
}
// round glint: bright core, soft halo
function glowSprite(glow, core) {
  return makeSprite((g, h) => {
    const grad = g.createRadialGradient(h, h, 0, h, h, h);
    grad.addColorStop(0,    `rgba(${core}, 1)`);
    grad.addColorStop(0.14, `rgba(${core}, 0.9)`);
    grad.addColorStop(0.32, `rgba(${glow}, 0.4)`);
    grad.addColorStop(1,    `rgba(${glow}, 0)`);
    g.fillStyle = grad;
    g.fillRect(0, 0, h * 2, h * 2);
  });
}
// 4-point star: small halo + two thin tapered arms
function starSprite(glow, core) {
  return makeSprite((g, h) => {
    const halo = g.createRadialGradient(h, h, 0, h, h, h * 0.45);
    halo.addColorStop(0, `rgba(${core}, 0.9)`);
    halo.addColorStop(1, `rgba(${glow}, 0)`);
    g.fillStyle = halo;
    g.fillRect(0, 0, h * 2, h * 2);

    const arm = g.createRadialGradient(h, h, 0, h, h, h);
    arm.addColorStop(0,    `rgba(${core}, 1)`);
    arm.addColorStop(0.35, `rgba(${glow}, 0.55)`);
    arm.addColorStop(1,    `rgba(${glow}, 0)`);
    g.fillStyle = arm;
    for (const [dx, dy] of [[1, 0], [0, 1]]) {
      g.beginPath();
      g.moveTo(h - dx * h, h - dy * h);
      g.lineTo(h + dy * 1.6, h - dx * 1.6);
      g.lineTo(h + dx * h, h + dy * h);
      g.lineTo(h - dy * 1.6, h + dx * 1.6);
      g.closePath();
      g.fill();
    }
  });
}
function buildSparkSprites(dark) {
  const p = dark ? SPARK_COLORS.dark : SPARK_COLORS.light;
  return {
    dotGold:   glowSprite(...p.gold),
    dotGlint:  glowSprite(...p.glint),
    starGold:  starSprite(...p.gold),
    starGlint: starSprite(...p.glint),
  };
}

/* Hover sparkles: the cursor sheds tiny glints anywhere over the scene.
   The backdrop is pointer-events: none, so we listen on its parent
   (.scene-inner) — hovering the text, the 3D canvas or empty space all
   count. Everything is drawn on one <canvas>; the loop runs only while
   the cursor is in the scene or sparkles are still fading out.
   No React re-renders. */
function useSparkles(canvasRef, isDark) {
  const darkRef = useRef(isDark);
  useEffect(() => { darkRef.current = isDark; }, [isDark]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const bg = canvas?.parentElement;   // .holo-bg
    const host = bg?.parentElement;     // .scene-inner — receives the pointer
    const ctx = canvas?.getContext("2d");
    if (!canvas || !bg || !host || !ctx) return undefined;

    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sprites = {};
    const spritesFor = (dark) => (sprites[dark] ??= buildSparkSprites(dark));
    const rand = (a, b) => a + Math.random() * (b - a);
    const clampV = (v) => Math.max(-1200, Math.min(1200, v));

    let dpr = 1;
    const resize = () => {
      const r = bg.getBoundingClientRect();
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.max(1, Math.round(r.width * dpr));
      canvas.height = Math.max(1, Math.round(r.height * dpr));
    };
    resize();
    const ro = new ResizeObserver(resize);
    ro.observe(bg);

    const parts = [];
    let raf = 0, lastFrame = 0;
    let inside = false, idle = 0, travel = 0;
    let px = 0, py = 0, lastT = 0;      // last cursor position (backdrop px) and time

    const emit = (x, y, cvx, cvy, spread) => {
      if (parts.length >= SPARK.max) parts.shift();
      const star = Math.random() < SPARK.starChance;
      const a = Math.random() * Math.PI * 2;
      const speed = rand(8, 40);
      parts.push({
        x: x + rand(-spread, spread),
        y: y + rand(-spread, spread),
        vx: Math.cos(a) * speed + cvx * 0.12,       // a little of the cursor's momentum
        vy: Math.sin(a) * speed + cvy * 0.12 - 12,  // small upward kick before they fall
        age: 0,
        life: rand(SPARK.life[0], SPARK.life[1]),
        size: star ? rand(9, 18) : rand(3, 8),
        star,
        glint: Math.random() < 0.45,                 // white (dark mode) / deep amber (light)
        rot: Math.random() * Math.PI,
        spin: rand(-2, 2),
        tw: rand(8, 18),                             // twinkle speed
        phase: Math.random() * Math.PI * 2,
      });
    };

    const frame = (t) => {
      const dt = Math.max(0, Math.min((t - lastFrame) / 1000, 0.05));
      lastFrame = t;

      if (inside) {                                  // gentle trickle while resting
        idle += dt * SPARK.idleRate;
        while (idle >= 1) { idle -= 1; emit(px, py, 0, 0, 22); }
      }

      const dark = darkRef.current;
      const sp = spritesFor(dark);
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.globalCompositeOperation = dark ? "lighter" : "source-over";

      const damp = Math.exp(-SPARK.drag * dt);
      let n = 0;
      for (let i = 0; i < parts.length; i++) {
        const p = parts[i];
        p.age += dt;
        if (p.age >= p.life) continue;               // dead → dropped
        p.vx *= damp;
        p.vy = p.vy * damp + SPARK.gravity * dt;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.rot += p.spin * dt;

        const k = p.age / p.life;
        const env = k < 0.12 ? k / 0.12 : 1 - (k - 0.12) / 0.88;  // pop in, fade out
        const twinkle = 0.5 + 0.5 * Math.sin(p.phase + p.age * p.tw);
        ctx.globalAlpha = env * (0.35 + 0.65 * twinkle);
        const s = p.size * (1 - 0.4 * k);
        const img = p.star
          ? (p.glint ? sp.starGlint : sp.starGold)
          : (p.glint ? sp.dotGlint : sp.dotGold);
        const c = Math.cos(p.rot) * dpr;
        const si = Math.sin(p.rot) * dpr;
        ctx.setTransform(c, si, -si, c, p.x * dpr, p.y * dpr);
        ctx.drawImage(img, -s / 2, -s / 2, s, s);
        parts[n++] = p;
      }
      parts.length = n;
      ctx.globalAlpha = 1;

      raf = n > 0 || inside ? requestAnimationFrame(frame) : 0;
    };

    const start = () => {
      if (!raf) {
        lastFrame = performance.now();
        raf = requestAnimationFrame(frame);
      }
    };

    const onMove = (e) => {
      if (e.pointerType === "touch" || reduceMotion.matches) return;
      const r = bg.getBoundingClientRect();
      const x = e.clientX - r.left;
      const y = e.clientY - r.top;
      if (!inside) {                                 // entering: start the trail right here
        inside = true;
        px = x; py = y; lastT = e.timeStamp; travel = 0;
      }
      const dx = x - px;
      const dy = y - py;
      const secs = Math.max((e.timeStamp - lastT) / 1000, 0.001);
      const cvx = clampV(dx / secs);
      const cvy = clampV(dy / secs);

      travel += Math.hypot(dx, dy);
      const count = Math.min(Math.floor(travel / SPARK.spacing), 10);
      travel %= SPARK.spacing;
      for (let i = 1; i <= count; i++) {             // spread along the path, not in clumps
        const f = i / count;
        emit(px + dx * f, py + dy * f, cvx, cvy, 5);
      }

      px = x; py = y; lastT = e.timeStamp;
      start();
    };

    const onLeave = () => { inside = false; idle = 0; };  // existing sparkles finish fading

    host.addEventListener("pointermove", onMove, { passive: true });
    host.addEventListener("pointerleave", onLeave);
    return () => {
      host.removeEventListener("pointermove", onMove);
      host.removeEventListener("pointerleave", onLeave);
      ro.disconnect();
      cancelAnimationFrame(raf);
    };
  }, [canvasRef]);
}

function HoloBackground() {
  const { isDark } = useTheme();
  const sparkRef = useRef(null);
  useSparkles(sparkRef, isDark);

  return (
    <div className={`holo-bg ${isDark ? "holo-dark" : "holo-light"}`} aria-hidden="true">
      <div className="holo-graticule" />
      <div className="holo-reflect" />
      <div className="holo-beam">            {/* the ONE animated carrier */}
        <div className="holo-beam-shadow" /> {/* reflection: same parent → same tilt, same position, same clock */}
        <div className="holo-beam-bar" />    {/* the shiny inclined bar, drawn over its reflection */}
      </div>
      <div className="holo-grain" />
      <div className="holo-vignette" />
      <canvas ref={sparkRef} className="holo-sparkle" /> {/* hover sparkles — on top so they stay crisp */}
    </div>
  );
}

function SquareWaveFormula({ isDark }) {
  return (
    <div
      style={{
        position: "absolute",
        bottom: "12px",
        left: "50%",
        transform: "translateX(-50%)",
        padding: "8px 18px",
        borderRadius: "8px",
        background: isDark ? "rgba(0,0,0,0.55)" : "rgba(255,255,255,0.75)",
        backdropFilter: "blur(6px)",
        WebkitBackdropFilter: "blur(6px)",
        border: `1px solid ${PHOTONIC}33`,
        fontFamily: "'Courier New', Courier, monospace",
        fontSize: "13px",
        color: isDark ? "#e2e2e2" : "#1a1a1a",
        letterSpacing: "0.4px",
        whiteSpace: "nowrap",
        pointerEvents: "none",
        userSelect: "none",
        zIndex: 10,
      }}
    >
      <span style={{ color: PHOTONIC, fontWeight: 700 }}>y(x)</span>
      <span style={{ margin: "0 4px" }}>=</span>
      <span style={{ fontStyle: "italic" }}>A</span>
      <span style={{ margin: "0 3px" }}>·</span>
      <span style={{ color: PHOTONIC }}>sgn</span>
      <span>[</span>
      <span style={{ fontStyle: "italic" }}>sin</span>
      <span>(</span>
      <span style={{ display: "inline-block", textAlign: "center", lineHeight: 1.1 }}>
        <span style={{ display: "block", borderBottom: `1px solid ${isDark ? "#888" : "#444"}`, paddingBottom: "1px" }}>
          2π<i>f</i>(<i>x</i> − <i>X</i>
          <sub style={{ fontSize: "9px" }}>START</sub>)
        </span>
        <span style={{ display: "block", paddingTop: "1px" }}>
          <i>X</i>
          <sub style={{ fontSize: "9px" }}>END</sub> − <i>X</i>
          <sub style={{ fontSize: "9px" }}>START</sub>
        </span>
      </span>
      <span>)</span>
      <span>]</span>
    </div>
  );
}

function Visual({ frequency = 5, speed = 0.55 }) {
  const { isDark } = useTheme();
  const pathPoints = useMemo(() => buildSquareWavePoints(frequency), [frequency]);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%" }}>
      <Canvas
        camera={{ position: [0, 0.2, 4], fov: 40 }}
        dpr={[1, 1.6]}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={isDark ? 0.3 : 0.7} />
        <pointLight position={[2, 2, 2]} intensity={0.6} color={PHOTONIC} />
        <Line
          points={pathPoints}
          color={PHOTONIC}
          transparent
          opacity={isDark ? 0.28 : 0.32}
          lineWidth={0.6}
        />
        <Suspense fallback={null}>
          <TravelingPulse frequency={frequency} speed={speed} />
        </Suspense>
      </Canvas>
      <SquareWaveFormula isDark={isDark} />
    </div>
  );
}

export default function Scene3({ active, frequency = 5, speed = 1.55 }) {
  const { t } = useTranslation();

  return (
    <div className="scene-inner">
      <HoloBackground />
      <div className="split">
        <div className="visual-pane">
          <div className="instrument-frame">
            {active ? <Visual frequency={frequency} speed={speed} /> : null}
          </div>
        </div>
        <div className="scene-text">
          <span className="eyebrow stroke-hair">
            <span className="eyebrow-dot" style={{ background: PHOTONIC }} />
            {t("scene3.eyebrow")}
          </span>
          <div className="letter-block" style={{ margin: "10px 0 20px" }}>
            <span className="letter-giant stroke-lg" style={{ color: PHOTONIC }}>
              P
            </span>
            <span className="letter-suffix stroke-sm">hotonic</span>
          </div>
          <br />
          <p className="body-line" style={{ maxWidth: "38ch" }}>
            {t("scene3.description")}
          </p>
        </div>
      </div>
    </div>
  );
}