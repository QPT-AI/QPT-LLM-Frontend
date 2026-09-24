import { Html, Line } from "@react-three/drei";
import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { PARADIGM_META } from "../../../config/paradigms";
import { MODEL, SHAPE_PARAMS, fmtParams } from "../../../config/architecture";
import { useTheme } from "../../../context/ThemeContext";
import { colorsFor } from "../theme";
import { fmtFixed } from "../hud/format";
import { stageExtent, stageY } from "./layout";

const NO_EVENTS = { pointerEvents: "none" };
const Z = [10, 0];

function Glyph({ paradigm }) {
  const { t } = useTranslation();
  const m = PARADIGM_META[paradigm];
  return <span className="mon-glyph" style={{ "--c": m.color }} title={t(`paradigms.${paradigm}`, m.label)}>{m.glyph}</span>;
}

/** Live per-block readout printed on the front face of each transformer block. */
function BlockFace({ block, row, maxPct, dim }) {
  const pct = row.pct_of_step;
  const share = Number.isFinite(pct) ? pct / maxPct : 0;
  return (
    <div className={`mon-face mon-face--block ${dim ? "is-dim" : ""}`}>
      <span className="mon-face__id">L{String(block.layer).padStart(2, "0")}</span>
      <span className="mon-face__bar" aria-hidden="true"><span style={{ width: `${Math.round(share * 100)}%` }} /></span>
      <span className="mon-face__num">{Number.isFinite(pct) ? `${pct.toFixed(1)}%` : "--"}<i>step</i></span>
      <span className="mon-face__num">{row.gradContrib != null ? `${(row.gradContrib * 100).toFixed(1)}%` : "--"}<i>grad</i></span>
      {row.delta_loss != null && <span className="mon-face__num">{fmtFixed(row.delta_loss, 2)}<i>Δloss</i></span>}
    </div>
  );
}

/** Face labels for every rectangle, a group bracket for the blocks, and sub-layer names for the active block. */
export default function Labels({ layout }) {
  const { t } = useTranslation();
  const { isDark } = useTheme();
  const colors = colorsFor(isDark);
  const highlight = useMonitorStore((s) => s.ui.highlight);
  const activeLayer = useMonitorStore((s) => s.ui.hovered?.layer ?? s.ui.selected?.layer ?? null);
  const selLayer = useMonitorStore((s) => s.ui.selected?.layer ?? null);
  const perLayer = useMonitorStore((s) => s.perLayer);
  const explode = useMonitorStore((s) => (s.ui.exploded ? 1 : 0));
  const sideView = useMonitorStore((s) => s.ui.view === "side"); // the left bracket collapses onto the stack edge-on
  const maxPct = Math.max(1e-9, ...perLayer.map((r) => r.pct_of_step ?? 0));
  const zFace = layout.depth / 2 + 0.03;
  const br = {
    ...layout.blockRegion,
    y0: stageExtent(layout.blocks[0], explode).y0,
    y1: stageExtent(layout.blocks[layout.blocks.length - 1], explode).y1,
  };
  const bx = layout.bracketX;
  const dimOf = (p, layer = null) => (highlight && p !== highlight) || (selLayer != null && layer !== selLayer);

  return (
    <group>
      {layout.stages.filter((s) => !s.sublayers).map((s) => (
        <Html key={s.id} position={[0, stageY(s, explode), zFace]} zIndexRange={Z} style={NO_EVENTS} center>
          <div className={`mon-face ${dimOf(s.paradigm) ? "is-dim" : ""}`}>
            <Glyph paradigm={s.paradigm} />
            <span className="mon-face__title">{t(s.labelKey, SHAPE_PARAMS)}</span>
            {s.params > 0 && <span className="mon-face__meta">{fmtParams(s.params)}{s.tied ? " tied" : ""}</span>}
          </div>
        </Html>
      ))}

      {layout.blocks.map((b) => (
        <Html key={b.id} position={[0, stageY(b, explode), zFace]} zIndexRange={Z} style={NO_EVENTS} center>
          <BlockFace block={b} row={perLayer[b.layer]} maxPct={maxPct} dim={selLayer != null && selLayer !== b.layer} />
        </Html>
      ))}

      {/* block group bracket */}
      {!sideView && <>
      <Line points={[[bx, br.y0, zFace], [bx, br.y1, zFace]]} color={colors.inkDim} lineWidth={1} />
      <Line points={[[bx, br.y0, zFace], [bx + 0.2, br.y0, zFace]]} color={colors.inkDim} lineWidth={1} />
      <Line points={[[bx, br.y1, zFace], [bx + 0.2, br.y1, zFace]]} color={colors.inkDim} lineWidth={1} />
      <Html position={[bx - 0.15, (br.y0 + br.y1) / 2, zFace]} zIndexRange={Z} style={NO_EVENTS}>
        <div className="mon-lbl mon-lbl--left">
          <div className="mon-lbl__title">{t("monitor.diagram.blockGroup.title", { count: MODEL.blocks })}</div>
          <div className="mon-lbl__sub">{t("monitor.diagram.blockGroup.paramsEach", { params: fmtParams(layout.blocks[0].params) })}</div>
          <div className="mon-lbl__sub"><Glyph paradigm="thermodynamic" />{t("monitor.diagram.blockGroup.norm")} · <Glyph paradigm="photonic" />{t("monitor.diagram.blockGroup.attention")}</div>
          <div className="mon-lbl__sub"><Glyph paradigm="thermodynamic" />{t("monitor.diagram.blockGroup.norm")} · <Glyph paradigm="photonic" />{t("monitor.diagram.blockGroup.feedForward")}</div>
          <div className="mon-lbl__sub"><Glyph paradigm="classical" />{t("monitor.diagram.blockGroup.residualStream")}</div>
        </div>
      </Html>
      </>}

      {activeLayer != null && (() => {
        const b = layout.blocks[activeLayer];
        const subs = layout.slabs.filter((s) => s.layer === activeLayer).slice().reverse(); // top-most first
        return (
          <Html position={[b.wMax / 2 + 0.25, stageY(b, explode), zFace]} zIndexRange={Z} style={NO_EVENTS}>
            <div className="mon-callout">
              {subs.map((s) => (
                <div key={s.id} className="mon-callout__row">
                  <Glyph paradigm={s.paradigm} />{t(s.labelKey, SHAPE_PARAMS)} <span className="mon-lbl__dim">· {fmtParams(s.params)}</span>
                </div>
              ))}
            </div>
          </Html>
        );
      })()}
    </group>
  );
}
