import { useCallback, useEffect, useRef, useState } from "react";

const STORAGE_W = "qpt-monitor-split-w";
const STORAGE_H = "qpt-monitor-split-h";
const BOUNDS_W = { min: 360, reserve: 320 }; // reserve = min width left for the diagram pane
const BOUNDS_H = { min: 200, reserve: 200 }; // reserve = min height left for the metrics pane
const STACK_QUERY = "(max-width: 1100px)";
const NUDGE = 24;

const clamp = (v, min, max) => Math.min(max, Math.max(min, v));
const isStacked = () => typeof window !== "undefined" && window.matchMedia(STACK_QUERY).matches;

/**
 * Draggable divider between the metrics column and the 3D diagram card. Desktop
 * drags resize the left column's width; below the 1100px breakpoint (stacked
 * layout) the same handle resizes the diagram's height instead. Size persists
 * to localStorage; double-click or Escape while dragging resets to the default.
 */
export function useResizableSplit() {
  const rootRef = useRef(null);
  const [orientation, setOrientation] = useState(() => (isStacked() ? "horizontal" : "vertical"));
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const w = localStorage.getItem(STORAGE_W);
    const h = localStorage.getItem(STORAGE_H);
    if (w) el.style.setProperty("--mon-left-w", `${w}px`);
    if (h) el.style.setProperty("--mon-right-h", `${h}px`);
  }, []);

  useEffect(() => {
    const mq = window.matchMedia(STACK_QUERY);
    const onChange = (e) => setOrientation(e.matches ? "horizontal" : "vertical");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const reset = useCallback(() => {
    const el = rootRef.current;
    if (!el) return;
    el.style.removeProperty("--mon-left-w");
    el.style.removeProperty("--mon-right-h");
    localStorage.removeItem(STORAGE_W);
    localStorage.removeItem(STORAGE_H);
  }, []);

  const onPointerDown = useCallback((e) => {
    const el = rootRef.current;
    const target = e.currentTarget;
    if (!el || e.button != null && e.button !== 0) return;
    const stacked = isStacked();
    const rect = el.getBoundingClientRect();
    const startX = e.clientX;
    const startY = e.clientY;
    const startW = el.querySelector(".mon-left")?.getBoundingClientRect().width ?? 0;
    const startH = el.querySelector(".mon-right")?.getBoundingClientRect().height ?? 0;
    const maxW = Math.max(BOUNDS_W.min, rect.width - BOUNDS_W.reserve);
    const maxH = Math.max(BOUNDS_H.min, rect.height - BOUNDS_H.reserve);

    target.setPointerCapture(e.pointerId);
    document.body.style.userSelect = "none";
    setDragging(true);

    const move = (ev) => {
      if (stacked) {
        const h = clamp(startH + (ev.clientY - startY), BOUNDS_H.min, maxH);
        el.style.setProperty("--mon-right-h", `${Math.round(h)}px`);
      } else {
        const w = clamp(startW + (ev.clientX - startX), BOUNDS_W.min, maxW);
        el.style.setProperty("--mon-left-w", `${Math.round(w)}px`);
      }
    };
    const finish = () => {
      target.releasePointerCapture(e.pointerId);
      target.removeEventListener("pointermove", move);
      target.removeEventListener("pointerup", finish);
      target.removeEventListener("pointercancel", finish);
      document.body.style.userSelect = "";
      setDragging(false);
      const w = el.style.getPropertyValue("--mon-left-w");
      const h = el.style.getPropertyValue("--mon-right-h");
      if (w) localStorage.setItem(STORAGE_W, parseFloat(w));
      if (h) localStorage.setItem(STORAGE_H, parseFloat(h));
    };
    target.addEventListener("pointermove", move);
    target.addEventListener("pointerup", finish);
    target.addEventListener("pointercancel", finish);
  }, []);

  const onKeyDown = useCallback((e) => {
    const el = rootRef.current;
    if (!el) return;
    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); reset(); return; }
    const stacked = isStacked();
    const grow = stacked ? (e.key === "ArrowDown") : (e.key === "ArrowRight");
    const shrink = stacked ? (e.key === "ArrowUp") : (e.key === "ArrowLeft");
    if (!grow && !shrink) return;
    e.preventDefault();
    const rect = el.getBoundingClientRect();
    const prop = stacked ? "--mon-right-h" : "--mon-left-w";
    const bounds = stacked ? BOUNDS_H : BOUNDS_W;
    const selector = stacked ? ".mon-right" : ".mon-left";
    const current = parseFloat(el.style.getPropertyValue(prop)) || el.querySelector(selector)?.getBoundingClientRect()[stacked ? "height" : "width"] || 0;
    const max = Math.max(bounds.min, (stacked ? rect.height : rect.width) - bounds.reserve);
    const next = clamp(current + (grow ? NUDGE : -NUDGE), bounds.min, max);
    el.style.setProperty(prop, `${Math.round(next)}px`);
    localStorage.setItem(stacked ? STORAGE_H : STORAGE_W, next);
  }, [reset]);

  return { rootRef, orientation, dragging, onPointerDown, onKeyDown, onDoubleClick: reset };
}
