/** Dashboard card: title row with optional right-hand tools, scrollable body. */
export default function Panel({ title, ariaLabel, children, className = "", tools = null, fill = false, bodyClassName = "" }) {
  return (
    <section className={`mon-panel ${fill ? "mon-panel--fill" : ""} ${className}`} aria-label={ariaLabel ?? (typeof title === "string" ? title : undefined)}>
      <header className="mon-panel__head">
        <span>{title}</span>
        {tools && <div className="mon-panel__tools">{tools}</div>}
      </header>
      <div className={`mon-panel__body ${bodyClassName}`}>{children}</div>
    </section>
  );
}
