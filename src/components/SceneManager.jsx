import { Suspense, lazy, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import ThemeToggle from "./ui/ThemeToggle";
import LanguageSwitcher from "./ui/LanguageSwitcher";
import ProgressRail from "./ui/ProgressRail";

const Scene1 = lazy(() => import("./scenes/Scene1"));
const Scene2 = lazy(() => import("./scenes/Scene2"));
const Scene3 = lazy(() => import("./scenes/Scene3"));
const Scene4 = lazy(() => import("./scenes/Scene4"));
const Scene5 = lazy(() => import("./scenes/Scene5"));
const Scene6 = lazy(() => import("./scenes/Scene6"));
const Scene7 = lazy(() => import("./scenes/Scene7"));
const Scene8 = lazy(() => import("./scenes/Scene8"));

const SCENES = [Scene1, Scene2, Scene3, Scene4, Scene5, Scene6, Scene7, Scene8];
const TOTAL = SCENES.length;
const TRANSITION_MS = 900;
const WHEEL_COOLDOWN_MS = 780;
const WHEEL_THRESHOLD = 22;
const SWIPE_THRESHOLD = 46;

export default function SceneManager() {
  const { t } = useTranslation();
  const [index, setIndex] = useState(0);
  const lockRef = useRef(false);
  const wheelAccumRef = useRef(0);
  const touchStartY = useRef(null);

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

  const items = useMemo(
    () =>
      SCENES.map((SceneComponent, i) => {
        const offset = i - index;
        const isActive = offset === 0;
        const isNearby = Math.abs(offset) <= 1;
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
            <Suspense fallback={null}>
              {isNearby ? <SceneComponent active={isActive} /> : null}
            </Suspense>
          </div>
        );
      }),
    [index]
  );

  return (
    <div className="scene-viewport" style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      {items}

      <header className="chrome chrome-top">
        <span className="wordmark stroke-hair" style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src="/favicon.png"
            alt="Logo"
            style={{ height: "55px", width: "auto", display: "block" }}
          />
          <span style={{ fontSize: "30px", lineHeight: 1, fontWeight: "inherit" }}>QPT</span>
        </span>
        <div className="chrome-controls">
          <LanguageSwitcher />
          <ThemeToggle />
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