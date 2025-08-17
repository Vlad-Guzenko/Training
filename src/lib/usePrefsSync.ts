// src/lib/usePrefsSync.ts
import { useEffect, useRef } from "react";
import { onAuth } from "./firebase";
import { loadUserPrefs, saveUserPrefs } from "./cloudNormalized";
import { useMantineColorScheme } from "@mantine/core";
import { usePrimaryColor } from "./usePrimaryColor";
import { useTranslation } from "react-i18next";

type Lng = "ua" | "en" | "it" | "ru";

type CloudPrefs = {
  colorScheme?: "light" | "dark";
  primaryColor?: string;
  lang?: Lng; // ua | en | it | ru
};

// нормализация языка из i18n/браузера/облака к нашему юниону
function normalizeLang(input?: string): Lng {
  const raw = (input || "en").toLowerCase();
  const base = raw.split("-")[0]; // en-US -> en
  const mapped = base === "uk" ? "ua" : base; // на всякий: uk -> ua
  if (
    mapped === "ua" ||
    mapped === "en" ||
    mapped === "it" ||
    mapped === "ru"
  ) {
    return mapped;
  }
  return "en";
}

export function usePrefsSync() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [primary, setPrimary] = usePrimaryColor();
  const { i18n } = useTranslation();

  const last = useRef<string>("");

  // 1) При логине — подтягиваем prefs и применяем
  useEffect(() => {
    const unsub = onAuth(async (u) => {
      if (!u) return;
      try {
        const prefs = (await loadUserPrefs()) as CloudPrefs | null;
        if (prefs?.colorScheme) setColorScheme(prefs.colorScheme);
        if (prefs?.primaryColor) setPrimary(prefs.primaryColor);

        const cloudLang = normalizeLang(prefs?.lang);
        if (cloudLang && cloudLang !== normalizeLang(i18n.language)) {
          await i18n.changeLanguage(cloudLang);
          try {
            localStorage.setItem("i18nextLng", cloudLang);
          } catch {}
        }
      } catch (e) {
        console.warn("[prefs sync] load error", e);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n]); // нам важен текущий экземпляр i18n

  // 2) Автосейв при изменениях локальных настроек (в т.ч. языка)
  useEffect(() => {
    const lang = normalizeLang(i18n.language);
    const json = JSON.stringify({ colorScheme, primary, lang });
    if (json === last.current) return;
    last.current = json;

    const t = window.setTimeout(async () => {
      try {
        await saveUserPrefs({
          colorScheme: colorScheme as "light" | "dark",
          primaryColor: primary,
          lang, // <- тип теперь ровно Lng
        });
        try {
          localStorage.setItem("i18nextLng", lang);
        } catch {}
      } catch (e) {
        console.warn("[prefs sync] save error", e);
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, [colorScheme, primary, i18n.language]);
}
