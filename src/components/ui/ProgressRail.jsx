import { useTranslation } from "react-i18next";

export default function ProgressRail({ total, current, onSelect }) {
  const { t } = useTranslation();
  return (
    <nav className="progress-rail" aria-label={t("nav.progressLabel", { current: current + 1, total })}>
      {Array.from({ length: total }).map((_, i) => (
        <button
          key={i}
          type="button"
          className="rail-dot"
          data-active={i === current}
          aria-label={t("nav.progressLabel", { current: i + 1, total })}
          aria-current={i === current ? "true" : undefined}
          onClick={() => onSelect(i)}
        />
      ))}
    </nav>
  );
}
