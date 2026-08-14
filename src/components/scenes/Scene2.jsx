import { Suspense, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { useTranslation } from "react-i18next";
import { useTheme } from "../../context/ThemeContext";

const QUANTUM = "#5bad1e";
const PULSE_COLOR = "#a855f7"; // purple - the traveling "sending" packet

// ---- Tunables for the effects -----------------------------------------
const GHOST_COUNT = 5; // number of trailing echo meshes per particle
const TRAIL_SAMPLES = 48; // frames of position history retained per particle
const GHOST_STEP = Math.floor(TRAIL_SAMPLES / (GHOST_COUNT + 1)); // spacing between ghosts in the buffer
const GHOST_SCALE = [0.8, 0.65, 0.5, 0.38, 0.28]; // nearest -> farthest
const GHOST_OPACITY = [0.42, 0.3, 0.2, 0.12, 0.07]; // nearest -> farthest

const CYCLE_LENGTH = 4.5; // seconds between teleport / reconnection events
const PULSE_WINDOW = 1.0; // seconds the data-pulse travels along the rod before a swap
const FLASH_WINDOW = 0.24; // seconds the particles "blink" around the swap instant
const RING_RADIUS = 0.46; // orbital ring drawn around each qubit
// -----------------------------------------------------------------------

function alignRod(mesh, a, b) {
  const dir = new THREE.Vector3().subVectors(b, a);
  const len = Math.max(dir.length(), 0.0001);
  const mid = new THREE.Vector3().addVectors(a, b).multiplyScalar(0.5);
  mesh.position.copy(mid);
  mesh.scale.set(1, len, 1);
  mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.clone().normalize());
}

function smoothstep(edge0, edge1, x) {
  const t = THREE.MathUtils.clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// Draws short quantum-notation text onto a canvas and returns a texture.
function makeLabelTexture(text, color = QUANTUM) {
  const width = 512;
  const height = 128;
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  ctx.clearRect(0, 0, width, height);
  ctx.font = "600 52px 'Courier New', monospace";
  ctx.fillStyle = color;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.shadowColor = color;
  ctx.shadowBlur = 20;
  ctx.fillText(text, width / 2, height / 2);
  const texture = new THREE.CanvasTexture(canvas);
  texture.needsUpdate = true;
  return texture;
}

function makeLabelSprite(texture) {
  const material = new THREE.SpriteMaterial({ map: texture, transparent: true, depthWrite: false });
  const sprite = new THREE.Sprite(material);
  sprite.scale.set(1.3, 0.32, 1);
  return sprite;
}

function EntangledPair() {
  const groupRef = useRef();
  const aRef = useRef();
  const bRef = useRef();
  const rodRef = useRef();
  const glowRef = useRef();
  const pulseRef = useRef();
  const ringARef = useRef();
  const ringBRef = useRef();

  const posA = useMemo(() => new THREE.Vector3(), []);
  const posB = useMemo(() => new THREE.Vector3(), []);
  const swapTmp = useMemo(() => new THREE.Vector3(), []);

  // Circular history buffers used to drive the ghost trails
  const trailA = useMemo(() => Array.from({ length: TRAIL_SAMPLES }, () => new THREE.Vector3()), []);
  const trailB = useMemo(() => Array.from({ length: TRAIL_SAMPLES }, () => new THREE.Vector3()), []);
  const ghostARefs = useRef([]);
  const ghostBRefs = useRef([]);

  // Quantum-math labels: "qN: state" under each qubit. Built once, texture is
  // swapped between superposition / collapsed-basis states at runtime.
  const labelTextures = useMemo(
    () => ({
      superA: makeLabelTexture("q\u2080:  \u03b1|0\u27e9 + \u03b2|1\u27e9"),
      superB: makeLabelTexture("q\u2081:  \u03b2|0\u27e9 + \u03b1|1\u27e9"),
      a0: makeLabelTexture("q\u2080:  |0\u27e9"),
      a1: makeLabelTexture("q\u2080:  |1\u27e9"),
      b0: makeLabelTexture("q\u2081:  |0\u27e9"),
      b1: makeLabelTexture("q\u2081:  |1\u27e9"),
    }),
    []
  );
  const labelA = useMemo(() => makeLabelSprite(labelTextures.superA), [labelTextures]);
  const labelB = useMemo(() => makeLabelSprite(labelTextures.superB), [labelTextures]);

  // Teleport / reconnection state
  const swapSignRef = useRef(1);
  const lastCycleIndexRef = useRef(0);
  const swapTimeRef = useRef(-Infinity);
  const justSwappedRef = useRef(false);
  const primedRef = useRef(false);

  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.14;

    // ---- Base orbital position ----
    const radius = 1.5;
    const angle = t * 0.85;
    const x = Math.cos(angle) * radius;
    const y = Math.sin(angle) * radius * 0.42;
    const z = Math.sin(angle * 0.6) * 0.6;
    posA.set(x, y, z);
    posB.set(-x, -y, -z);

    // ---- Teleportation cycle: detect a new cycle boundary and flip which
    // particle (qubit) occupies which point on the orbit ----
    const cyclePos = t % CYCLE_LENGTH;
    const cycleIndex = Math.floor(t / CYCLE_LENGTH);
    if (cycleIndex !== lastCycleIndexRef.current) {
      lastCycleIndexRef.current = cycleIndex;
      swapSignRef.current *= -1;
      swapTimeRef.current = t;
      justSwappedRef.current = true;
    }
    if (swapSignRef.current < 0) {
      swapTmp.copy(posA);
      posA.copy(posB);
      posB.copy(swapTmp);
    }

    // ---- Flash factor: peaks at 1 exactly at the swap instant, fades out
    // across FLASH_WINDOW on either side ----
    const distToSwap = Math.abs(t - swapTimeRef.current);
    const flashAmt = 1 - smoothstep(0, FLASH_WINDOW / 2, distToSwap);
    const scaleFactor = 1 - flashAmt * 0.92;

    if (aRef.current) {
      aRef.current.position.copy(posA);
      aRef.current.rotation.x += delta * 2.6;
      aRef.current.rotation.y += delta * 1.1;
      aRef.current.scale.setScalar(scaleFactor);
    }
    if (bRef.current) {
      bRef.current.position.copy(posB);
      bRef.current.rotation.z += delta * 1.9;
      bRef.current.rotation.y -= delta * 2.1;
      bRef.current.scale.setScalar(scaleFactor);
    }

    // ---- Orbital rings around each qubit ----
    if (ringARef.current) {
      ringARef.current.position.copy(posA);
      ringARef.current.rotation.x += delta * 0.8;
      ringARef.current.rotation.y += delta * 0.5;
      ringARef.current.scale.setScalar(scaleFactor);
    }
    if (ringBRef.current) {
      ringBRef.current.position.copy(posB);
      ringBRef.current.rotation.x -= delta * 0.8;
      ringBRef.current.rotation.y -= delta * 0.5;
      ringBRef.current.scale.setScalar(scaleFactor);
    }

    const pulse = 0.55 + Math.sin(t * 2.6) * 0.45;
    if (rodRef.current) {
      alignRod(rodRef.current, posA, posB);
      rodRef.current.material.emissiveIntensity = 0.8 + pulse * 1.4 + flashAmt * 3;
    }
    if (glowRef.current) {
      alignRod(glowRef.current, posA, posB);
      glowRef.current.material.opacity = 0.08 + pulse * 0.16 + flashAmt * 0.3;
    }
    if (aRef.current) aRef.current.material.emissiveIntensity = 1 + pulse + flashAmt * 2.5;
    if (bRef.current) bRef.current.material.emissiveIntensity = 1 + pulse + flashAmt * 2.5;

    // ---- Quantum-math labels: superposition normally, collapse to a
    // definite (anti-correlated) basis state right at the teleport instant ----
    const collapsed = flashAmt > 0.5;
    if (labelA) {
      labelA.position.set(posA.x, posA.y - 0.55, posA.z);
      const desired = collapsed ? (swapSignRef.current < 0 ? labelTextures.a1 : labelTextures.a0) : labelTextures.superA;
      if (labelA.material.map !== desired) {
        labelA.material.map = desired;
        labelA.material.needsUpdate = true;
      }
    }
    if (labelB) {
      labelB.position.set(posB.x, posB.y - 0.55, posB.z);
      const desired = collapsed ? (swapSignRef.current < 0 ? labelTextures.b0 : labelTextures.b1) : labelTextures.superB;
      if (labelB.material.map !== desired) {
        labelB.material.map = desired;
        labelB.material.needsUpdate = true;
      }
    }

    // ---- Traveling data-pulse (purple): races along the rod in the
    // run-up to a swap, representing the information being sent ----
    const pulseStart = CYCLE_LENGTH - PULSE_WINDOW;
    if (pulseRef.current) {
      if (cyclePos >= pulseStart) {
        const progress = THREE.MathUtils.clamp((cyclePos - pulseStart) / PULSE_WINDOW, 0, 1);
        pulseRef.current.position.lerpVectors(posA, posB, progress);
        const bump = Math.sin(progress * Math.PI); // fades in, peaks mid-flight, fades out
        pulseRef.current.visible = true;
        pulseRef.current.scale.setScalar(0.5 + bump * 0.9);
        pulseRef.current.material.opacity = 0.25 + bump * 0.75;
      } else {
        pulseRef.current.visible = false;
      }
    }

    // ---- Ghost trail buffers ----
    if (!primedRef.current) {
      for (let i = 0; i < TRAIL_SAMPLES; i++) {
        trailA[i].copy(posA);
        trailB[i].copy(posB);
      }
      primedRef.current = true;
    } else if (justSwappedRef.current) {
      // Snap the whole trail to the new location so the echoes don't streak
      // across the scene when the particles teleport.
      for (let i = 0; i < TRAIL_SAMPLES; i++) {
        trailA[i].copy(posA);
        trailB[i].copy(posB);
      }
      justSwappedRef.current = false;
    } else {
      for (let i = TRAIL_SAMPLES - 1; i > 0; i--) {
        trailA[i].copy(trailA[i - 1]);
        trailB[i].copy(trailB[i - 1]);
      }
      trailA[0].copy(posA);
      trailB[0].copy(posB);
    }

    for (let i = 0; i < GHOST_COUNT; i++) {
      const sampleIndex = Math.min((i + 1) * GHOST_STEP, TRAIL_SAMPLES - 1);
      const ga = ghostARefs.current[i];
      const gb = ghostBRefs.current[i];
      if (ga) {
        ga.position.copy(trailA[sampleIndex]);
        ga.scale.setScalar(GHOST_SCALE[i]);
        ga.material.opacity = GHOST_OPACITY[i] * (1 - flashAmt);
      }
      if (gb) {
        gb.position.copy(trailB[sampleIndex]);
        gb.scale.setScalar(GHOST_SCALE[i]);
        gb.material.opacity = GHOST_OPACITY[i] * (1 - flashAmt);
      }
    }
  });

  return (
    <group ref={groupRef}>
      <mesh ref={glowRef}>
        <cylinderGeometry args={[0.09, 0.09, 1, 10, 1, true]} />
        <meshBasicMaterial color={QUANTUM} transparent opacity={0.14} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>
      <mesh ref={rodRef}>
        <cylinderGeometry args={[0.022, 0.022, 1, 10]} />
        <meshStandardMaterial color={QUANTUM} emissive={QUANTUM} emissiveIntensity={1.4} roughness={0.3} />
      </mesh>

      {/* Orbital rings - each qubit gets its own "electron orbit" style ring */}
      <mesh ref={ringARef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RING_RADIUS, 0.012, 8, 48]} />
        <meshBasicMaterial color={QUANTUM} transparent opacity={0.3} depthWrite={false} />
      </mesh>
      <mesh ref={ringBRef} rotation={[Math.PI / 2, 0, 0]}>
        <torusGeometry args={[RING_RADIUS, 0.012, 8, 48]} />
        <meshBasicMaterial color={QUANTUM} transparent opacity={0.3} depthWrite={false} />
      </mesh>

      {/* Ghosting trail echoes */}
      {Array.from({ length: GHOST_COUNT }).map((_, i) => (
        <mesh key={`ghost-a-${i}`} ref={(el) => (ghostARefs.current[i] = el)}>
          <icosahedronGeometry args={[0.28, 1]} />
          <meshStandardMaterial
            color={QUANTUM}
            emissive={QUANTUM}
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.1}
            transparent
            depthWrite={false}
            opacity={GHOST_OPACITY[i]}
          />
        </mesh>
      ))}
      {Array.from({ length: GHOST_COUNT }).map((_, i) => (
        <mesh key={`ghost-b-${i}`} ref={(el) => (ghostBRefs.current[i] = el)}>
          <icosahedronGeometry args={[0.28, 1]} />
          <meshStandardMaterial
            color={QUANTUM}
            emissive={QUANTUM}
            emissiveIntensity={0.6}
            roughness={0.3}
            metalness={0.1}
            transparent
            depthWrite={false}
            opacity={GHOST_OPACITY[i]}
          />
        </mesh>
      ))}

      {/* Traveling data pulse (purple) - races along the rod ahead of a teleport swap */}
      <mesh ref={pulseRef} visible={false}>
        <sphereGeometry args={[0.075, 14, 14]} />
        <meshBasicMaterial color={PULSE_COLOR} transparent opacity={0.7} depthWrite={false} blending={THREE.AdditiveBlending} />
      </mesh>

      {/* Quantum-math labels for each qubit */}
      <primitive object={labelA} />
      <primitive object={labelB} />

      <mesh ref={aRef}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color={QUANTUM} emissive={QUANTUM} emissiveIntensity={1.4} roughness={0.2} metalness={0.25} />
      </mesh>
      <mesh ref={bRef}>
        <icosahedronGeometry args={[0.28, 1]} />
        <meshStandardMaterial color={QUANTUM} emissive={QUANTUM} emissiveIntensity={1.4} roughness={0.2} metalness={0.25} />
      </mesh>
    </group>
  );
}

function Visual() {
  const { isDark } = useTheme();
  return (
    <Canvas camera={{ position: [0, 0, 4.4], fov: 42 }} dpr={[1, 1.6]} gl={{ antialias: true, alpha: true }}>
      <ambientLight intensity={isDark ? 0.32 : 0.75} />
      <pointLight position={[3, 3, 3]} intensity={1.4} color={QUANTUM} />
      <pointLight position={[-3, -2, -2]} intensity={0.4} color={QUANTUM} />
      <Suspense fallback={null}>
        <EntangledPair />
      </Suspense>
    </Canvas>
  );
}

export default function Scene2({ active }) {
  const { t } = useTranslation();
  return (
    <div className="scene-inner">
      <div className="split">
        <div className="scene-text">
          <span className="eyebrow stroke-hair">
            <span className="eyebrow-dot" style={{ background: QUANTUM }} />
            {t("scene2.eyebrow")}
          </span>
          <div className="letter-block" style={{ margin: "10px 0 20px" }}>
            <span className="letter-giant stroke-lg" style={{ color: QUANTUM }}>
              Q
            </span>
            <span className="letter-suffix stroke-sm">uantum</span>
          </div>
          <br/>
          <p className="body-line" style={{ maxWidth: "38ch" }}>
            {t("scene2.description")}
          </p>
        </div>
        <div className="visual-pane">
          <div className="instrument-frame">{active ? <Visual /> : null}</div>
        </div>
      </div>
    </div>
  );
}