import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "./en.json";
import es from "./es.json";
import ru from "./ru.json";
import de from "./de.json";
import zh from "./zh.json";
import ja from "./ja.json";
import uk from "./uk.json";
import fr from "./fr.json";
import pt from "./pt.json";

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
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: es },
      ru: { translation: ru },
      de: { translation: de },
      zh: { translation: zh },
      ja: { translation: ja },
      uk: { translation: uk },
      fr: { translation: fr },
      pt: { translation: pt },
    },
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
