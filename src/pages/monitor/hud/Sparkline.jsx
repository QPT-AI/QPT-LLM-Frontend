import { useEffect, useRef } from "react";

/**
 * Hand-rolled canvas sparkline over a ring buffer. Redraws only when `version`
 * changes. `log` maps values through log10. `threshold` draws a dashed guide.
 */
export default function Sparkline({ buffer, version, log = false, height = 36, threshold = null, color = null, label }) {
  const ref = useRef(null);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    const w = canvas.clientWidth || 200;
    const h = height;
    if (canvas.width !== Math.round(w * dpr) || canvas.height !== Math.round(h * dpr)) {
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
    }
    const ctx = canvas.getContext("2d");
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);

    const n = buffer.length;
    if (n < 2) return;
    const stroke = color || getComputedStyle(canvas).getPropertyValue("--mon-accent").trim() || "#8a8a8a";
    const tf = log ? (v) => Math.log10(Math.max(v, 1e-9)) : (v) => v;
    let [min, max] = buffer.minMax();
    min = tf(min); max = tf(max);
    if (threshold != null) { min = Math.min(min, tf(threshold)); max = Math.max(max, tf(threshold)); }
    if (max - min < 1e-9) max = min + 1;
    const pad = 3;
    const y = (v) => h - pad - ((tf(v) - min) / (max - min)) * (h - 2 * pad);
    const x = (i) => (i / (n - 1)) * (w - 2);

    ctx.beginPath();
    ctx.moveTo(x(0), y(buffer.at(0)));
    for (let i = 1; i < n; i++) ctx.lineTo(x(i), y(buffer.at(i)));
    ctx.lineTo(x(n - 1), h); ctx.lineTo(0, h); ctx.closePath();
    ctx.fillStyle = stroke; ctx.globalAlpha = 0.08; ctx.fill(); ctx.globalAlpha = 1;

    ctx.beginPath();
    ctx.moveTo(x(0), y(buffer.at(0)));
    for (let i = 1; i < n; i++) ctx.lineTo(x(i), y(buffer.at(i)));
    ctx.strokeStyle = stroke; ctx.lineWidth = 1.2; ctx.lineJoin = "round"; ctx.stroke();

    if (threshold != null) {
      const ty = y(threshold);
      ctx.setLineDash([3, 3]); ctx.strokeStyle = "rgba(240,171,0,0.7)"; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, ty); ctx.lineTo(w, ty); ctx.stroke(); ctx.setLineDash([]);
    }
    ctx.fillStyle = stroke;
    ctx.beginPath(); ctx.arc(x(n - 1), y(buffer.last()), 2, 0, Math.PI * 2); ctx.fill();
  }, [buffer, version, log, height, threshold, color]);

  return <canvas ref={ref} className="mon-spark" style={{ height }} role="img" aria-label={label} />;
}
