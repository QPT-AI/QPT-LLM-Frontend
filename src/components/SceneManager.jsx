import { Component as ReactComponent, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ui/ThemeToggle";
import LanguageSwitcher from "./ui/LanguageSwitcher";
import LoginButton from "./ui/LoginButton";
import NavLinks from "./ui/NavLinks";
import ProgressRail from "./ui/ProgressRail";
import { useAuth } from "../context/AuthContext";
import { lazyWithReload } from "../utils/lazyWithReload";

const Scene1 = lazyWithReload(() => import("./scenes/Scene1"));
const Scene2 = lazyWithReload(() => import("./scenes/Scene2"));
const Scene3 = lazyWithReload(() => import("./scenes/Scene3"));
const Scene4a = lazyWithReload(() => import("./scenes/Scene4a"));
const Scene4b = lazyWithReload(() => import("./scenes/Scene4b"));
const Scene5 = lazyWithReload(() => import("./scenes/Scene5"));
const Scene6 = lazyWithReload(() => import("./scenes/Scene6"));
const Scene7 = lazyWithReload(() => import("./scenes/Scene7"));
const Scene8 = lazyWithReload(() => import("./scenes/Scene8"));

// Keeps one failing scene (chunk load error, WebGL context failure on iOS)
// from unmounting the whole page.
class SceneErrorBoundary extends ReactComponent {
  // Set in the constructor, not as a class field: the field helper would be
  // shared with drei and drag the three.js chunk into the landing page.
  constructor(props) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  componentDidCatch(error) {
    console.error("Scene failed to render:", error);
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const SCENES = [Scene1, Scene2, Scene3, null, Scene5, Scene6, Scene7, Scene8];
const TOTAL = SCENES.length;
const TRANSITION_MS = 900;
const WHEEL_COOLDOWN_MS = 780;
const WHEEL_THRESHOLD = 22;
const SWIPE_THRESHOLD = 46;

export default function SceneManager() {
  const { t } = useTranslation();
  const { isAuthenticated } = useAuth();
  const [index, setIndex] = useState(0);
  const lockRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const touchStartY = useRef(null);
  const [scene4Visits, setScene4Visits] = useState(0);
  const prevIndexRef = useRef(0);
  const visitTimerRef = useRef(0);

  const goTo = useCallback((next) => {
    const clamped = Math.max(0, Math.min(TOTAL - 1, next));
    setIndex((cur) => {
      if (clamped === cur || lockRef.current) return cur;
      lockRef.current = true;
      window.setTimeout(() => {
        lockRef.current = false;
      }, WHEEL_COOLDOWN_MS);

      return clamped;
    });
  }, []);

  const step = useCallback(
    (dir) => {
      goTo(index + dir);
    },
    [goTo, index]
  );

  useEffect(() => {
    const onWheel = (e) => {
      e.preventDefault();
      if (lockRef.current) return;
      wheelAccumRef.current += e.deltaY;
      if (wheelAccumRef.current > WHEEL_THRESHOLD) {
        wheelAccumRef.current = 0;
        step(1);
      } else if (wheelAccumRef.current < -WHEEL_THRESHOLD) {
        wheelAccumRef.current = 0;
        step(-1);
      }
    };

    const onKeyDown = (e) => {
      if (["ArrowDown", "PageDown"].includes(e.key)) {
        e.preventDefault();
        step(1);
      } else if (["ArrowUp", "PageUp"].includes(e.key)) {
        e.preventDefault();
        step(-1);
      } else if (e.key === "Home") {
        e.preventDefault();
        goTo(0);
      } else if (e.key === "End") {
        e.preventDefault();
        goTo(TOTAL - 1);
      }
    };

    const onTouchStart = (e) => {
      touchStartY.current = e.touches[0].clientY;
    };

    const onTouchMove = (e) => {
      if (touchStartY.current === null || lockRef.current) return;
      const delta = touchStartY.current - e.touches[0].clientY;
      if (Math.abs(delta) > SWIPE_THRESHOLD) {
        step(delta > 0 ? 1 : -1);
        touchStartY.current = null;
      }
    };

    const onTouchEnd = () => {
      touchStartY.current = null;
    };

    window.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("touchstart", onTouchStart, { passive: true });
    window.addEventListener("touchmove", onTouchMove, { passive: true });
    window.addEventListener("touchend", onTouchEnd);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("touchstart", onTouchStart);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
    };
  }, [step, goTo]);

  // Count a scene 4 visit once we've LEFT it and its slide-out has finished.
  // Counting on entry swapped the variant warm-mounted as the neighbour for a
  // cold one right as it came into view.
  useEffect(() => {
    const prev = prevIndexRef.current;
    prevIndexRef.current = index;
    if (prev !== 3 || index === 3) return;
    window.clearTimeout(visitTimerRef.current);
    visitTimerRef.current = window.setTimeout(() => {
      // Came back to scene 4 before the timer fired: keep showing it as is.
      if (prevIndexRef.current !== 3) setScene4Visits((v) => v + 1);
    }, TRANSITION_MS);
  }, [index]);
  useEffect(() => () => window.clearTimeout(visitTimerRef.current), []);

  // Warm the chunk two scenes ahead so it's cached before it mounts.
  useEffect(() => {
    const ahead = index + 2 === 3 ? [scene4Visits % 2 === 0 ? Scene4a : Scene4b] : [SCENES[index + 2]];
    const warm = () => ahead.forEach((S) => S?.preload());
    if (typeof window.requestIdleCallback === "function") {
      const id = window.requestIdleCallback(warm, { timeout: 2000 });
      return () => window.cancelIdleCallback(id);
    }
    const id = window.setTimeout(warm, 300);
    return () => window.clearTimeout(id);
  }, [index, scene4Visits]);

  const items = useMemo(
    () =>
      SCENES.map((SceneComponent, i) => {
        const offset = i - index;
        const isActive = offset === 0;
        const isNearby = Math.abs(offset) <= 1;

        // Alternate Scene4a / Scene4b on each visit, starting with 4a
        const Component =
          i === 3
            ? scene4Visits % 2 === 0
              ? Scene4a
              : Scene4b
            : SceneComponent;

        return (
          <div
            key={i}
            className="scene"
            style={{
              transform: `translateY(${offset * 100}%)`,
              transition: `transform ${TRANSITION_MS}ms var(--ease-out)`,
              opacity: Math.abs(offset) <= 1 ? 1 : 0,
              pointerEvents: isActive ? "auto" : "none",
              zIndex: isActive ? 2 : 1,
            }}
            aria-hidden={!isActive}
          >
            <SceneErrorBoundary>
              <Suspense fallback={null}>
                {isNearby && Component ? <Component active={isActive} /> : null}
              </Suspense>
            </SceneErrorBoundary>
          </div>
        );
      }),
    [index, scene4Visits]
  );

  return (
    <div className="scene-viewport" style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {items}

      <header className={isAuthenticated ? "chrome chrome-top app-nav" : "chrome chrome-top minimal"}>
        <Link to="/" className="brand-mark" aria-label="QPT home">
          <img src="/logo-sm.webp" width="128" height="128" decoding="async" alt="QPT logo" className="brand-logo" />
        </Link>
        {isAuthenticated && <NavLinks />}
        <div className="chrome-controls">
          <LanguageSwitcher />
          <ThemeToggle />
          <LoginButton />
        </div>
      </header>

      <ProgressRail total={TOTAL} current={index} onSelect={goTo} />

      {index === 0 && (
        <div className="scroll-hint">
          <span>{t("nav.scrollHint")}</span>
          <span className="stem" />
        </div>
      )}
    </div>
  );
}