import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";

// English ships with the bundle as the fallback; other languages are fetched
// only when selected.
const LOCALES = import.meta.glob(["./*.json", "!./en.json"], { import: "default" });

const lazyLocales = {
  type: "backend",
  read(lng, _ns, callback) {
    const load = LOCALES[`./${lng}.json`];
    if (!load) return callback(null, {});
    load().then((data) => callback(null, data), (err) => callback(err, null));
  },
};

export const SUPPORTED_LANGUAGES = [
  { code: "en", label: "EN", flag: "🇺🇸" },
  { code: "es", label: "ES", flag: "🇨🇴" },
  { code: "ru", label: "RU", flag: "🇷🇺" },
  { code: "de", label: "DE", flag: "🇩🇪" },
  { code: "zh", label: "ZH", flag: "🇨🇳" },
  { code: "ja", label: "JA", flag: "🇯🇵" },
  { code: "uk", label: "UK", flag: "🇺🇦" },
  { code: "fr", label: "FR", flag: "🇫🇷" },
  { code: "pt", label: "PT", flag: "🇧🇷" },
];

i18n
  .use(lazyLocales)
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en } },
    partialBundledLanguages: true,
    fallbackLng: "en",
    supportedLngs: SUPPORTED_LANGUAGES.map((l) => l.code),
    interpolation: { escapeValue: false },
    detection: {
      order: ["localStorage", "navigator"],
      caches: ["localStorage"],
      lookupLocalStorage: "qpt-language",
    },
  });

export default i18n;
