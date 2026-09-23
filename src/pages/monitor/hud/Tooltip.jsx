import { useTranslation } from "react-i18next";
import { useMonitorStore } from "../../../store/monitorStore";
import { PARADIGM_META } from "../../../config/paradigms";
import { SHAPE_PARAMS } from "../../../config/architecture";

/** Small pointer-following label for the hovered rectangle. */
export default function Tooltip() {
  const { t } = useTranslation();
  const hovered = useMonitorStore((s) => s.ui.hovered);
  if (!hovered) return null;
  const m = PARADIGM_META[hovered.paradigm];
  return (
    <div className="mon-tip" style={{ left: hovered.x, top: hovered.y }} role="tooltip">
      <b>{t(hovered.labelKey, SHAPE_PARAMS)}</b>
      <span className="mon-tip__sub">{t(`paradigms.${hovered.paradigm}`, m.label)} · {t(hovered.shapeKey, SHAPE_PARAMS)}</span>
    </div>
  );
}
