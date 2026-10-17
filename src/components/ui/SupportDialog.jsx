import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Check, Copy, ExternalLink, X } from "lucide-react";
import { QRCodeSVG } from "qrcode.react";

const BMC_URL = "https://buymeacoffee.com/jero98772f";
const BTC_ADDRESS = "bc1q9rrjnfxyfqxyk2ln2lu9su48mh3gnsyrrs9gyk";
const LN_ADDRESS =
  "lnurl1dp68gurn8ghj7ampd3kx2ar0veekzar0wd5xjtnrdakj7tnhv4kxctttdehhwm30d3h82unvwqhkv6tcv4j8q6t60fsnzvqgc7sjv";
const BREB_KEY = "@victora7036";

const TABS = ["card", "crypto", "colombia"];
const TAB_LABELS = { card: "tabCard", crypto: "tabCrypto", colombia: "tabColombia" };

export default function SupportDialog({ open, onClose }) {
  const { t } = useTranslation();
  const dialogRef = useRef(null);
  const [tab, setTab] = useState("card");

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  // Clicks on the dialog element itself land on the backdrop.
  function handleClick(e) {
    if (e.target === dialogRef.current) onClose();
  }

  return (
    <dialog
      ref={dialogRef}
      className="support-dialog"
      onClose={onClose}
      onClick={handleClick}
      aria-labelledby="support-dialog-title"
    >
      <div className="support-dialog-body">
        <header className="support-head">
          <div>
            <h2 id="support-dialog-title" className="support-title">
              {t("footer.support.title")}
            </h2>
            <p className="support-subtitle">{t("footer.support.subtitle")}</p>
          </div>
          <button
            type="button"
            className="support-close"
            onClick={onClose}
            aria-label={t("footer.support.close")}
          >
            <X size={18} />
          </button>
        </header>

        <div className="support-tabs" role="tablist">
          {TABS.map((id) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={tab === id}
              className={`footer-btn ${tab === id ? "primary" : "ghost"}`}
              onClick={() => setTab(id)}
            >
              {t(`footer.support.${TAB_LABELS[id]}`)}
            </button>
          ))}
        </div>

        <div className="support-panel" role="tabpanel">
          {tab === "card" && (
            <>
              <p className="support-text">{t("footer.support.cardText")}</p>
              <a
                className="footer-btn primary support-cta"
                href={BMC_URL}
                target="_blank"
                rel="noopener noreferrer"
              >
                {t("footer.support.cardCta")}
                <ExternalLink size={14} />
              </a>
            </>
          )}

          {tab === "crypto" && (
            <div className="support-crypto">
              <CryptoBlock
                label={t("footer.support.onchain")}
                value={BTC_ADDRESS}
                uri={`bitcoin:${BTC_ADDRESS}`}
              />
              <CryptoBlock
                label={t("footer.support.lightning")}
                value={LN_ADDRESS}
                uri={`lightning:${LN_ADDRESS.toUpperCase()}`}
              />
            </div>
          )}

          {tab === "colombia" && (
            <div className="support-colombia">
              <p className="support-text">{t("footer.support.colombiaNote")}</p>
              <img
                src="/donation.jpeg"
                alt="Bre-B / Bancolombia QR"
                className="support-breb-img"
                loading="lazy"
              />
              <CopyRow label={t("footer.support.key")} value={BREB_KEY} />
            </div>
          )}
        </div>
      </div>
    </dialog>
  );
}

function CryptoBlock({ label, value, uri }) {
  const { t } = useTranslation();
  return (
    <div className="support-crypto-block">
      <span className="support-label">{label}</span>
      <div className="support-qr">
        {/* Uppercase keeps the QR in alphanumeric mode, which is denser. */}
        <QRCodeSVG value={uri.toUpperCase()} size={168} level="M" bgColor="#ffffff" fgColor="#000000" />
      </div>
      <CopyRow value={value} />
      <a className="support-wallet-link" href={uri}>
        {t("footer.support.openWallet")}
      </a>
    </div>
  );
}

function CopyRow({ label, value }) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard unavailable (insecure context or denied) — value stays selectable.
    }
  }

  return (
    <div className="support-copy-row">
      {label && <span className="support-label">{label}</span>}
      <code className="support-value" title={value}>
        {value}
      </code>
      <button type="button" className="support-copy-btn" onClick={copy}>
        {copied ? <Check size={14} /> : <Copy size={14} />}
        {t(copied ? "footer.support.copied" : "footer.support.copy")}
      </button>
    </div>
  );
}
