import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import en from "../locales/en.json";
import it from "../locales/it.json";
import ru from "../locales/ru.json";
import ua from "../locales/ua.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      it: { translation: it },
      ru: { translation: ru },
      ua: { translation: ua }, // <-- ключ именно 'ua'
    },
    fallbackLng: "en",
    supportedLngs: ["en", "it", "ru", "ua"],
    nonExplicitSupportedLngs: true,
    detection: {
      order: ["localStorage", "navigator", "htmlTag", "cookie"],
      lookupLocalStorage: "i18nextLng",
      caches: ["localStorage"], // сохраняем выбор
      // Нормализуем всё, что начинается с 'uk' → 'ua'
      convertDetectedLanguage: (lng) => {
        if (!lng) return lng;
        const L = lng.toLowerCase();
        return L.startsWith("uk") ? "ua" : L.split("-")[0];
      },
    },
    interpolation: { escapeValue: false },
    react: {
      bindI18n: "languageChanged loaded",
      useSuspense: false,
    },
  });

// Одноразовая миграция, если раньше успели сохранить 'uk' в localStorage
try {
  const k = "i18nextLng";
  const saved = localStorage.getItem(k);
  if (saved && saved.toLowerCase().startsWith("uk")) {
    localStorage.setItem(k, "ua");
    if (i18n.language !== "ua") i18n.changeLanguage("ua");
  }
} catch {}

export default i18n;
