// src/lib/usePrefsSync.ts
import { useEffect, useRef, useState } from "react";
import { onAuth } from "./firebase";
import { loadUserPrefs, saveUserPrefs } from "./cloudNormalized";
import { useMantineColorScheme } from "@mantine/core";
import { usePrimaryColor } from "./usePrimaryColor";
import { useTranslation } from "react-i18next";

type Lng = "ua" | "en" | "it" | "ru";

export function usePrefsSync() {
  // локальные настройки UI
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [primary, setPrimary] = usePrimaryColor();
  const { i18n } = useTranslation();
  const lang = (i18n.language as Lng) || "en";

  // авторизация
  const [authed, setAuthed] = useState<boolean>(false);
  useEffect(() => {
    const off = onAuth((u) => setAuthed(!!u));
    return () => off();
  }, []);

  // грузим prefs из облака один раз после логина
  const loadedOnce = useRef(false);
  useEffect(() => {
    if (!authed || loadedOnce.current) return;

    (async () => {
      try {
        const prefs = await loadUserPrefs();
        if (prefs.colorScheme === "light" || prefs.colorScheme === "dark") {
          setColorScheme(prefs.colorScheme);
        }
        if (prefs.primaryColor) setPrimary(prefs.primaryColor);
        if (prefs.lang && prefs.lang !== i18n.language) {
          await i18n.changeLanguage(prefs.lang);
        }
      } catch {
        /* no-op */
      } finally {
        loadedOnce.current = true;
      }
    })();
  }, [authed, i18n, setColorScheme, setPrimary]);

  // дебаунс-сохранение в облако после изменений (только когда авторизованы)
  useEffect(() => {
    if (!authed) return;

    const t = window.setTimeout(async () => {
      try {
        await saveUserPrefs({
          colorScheme: colorScheme as "light" | "dark",
          primaryColor: primary,
          lang, // ровно Lng
        });
        try {
          localStorage.setItem("i18nextLng", lang);
        } catch {}
      } catch {
        /* тихо игнорируем фоновые ошибки */
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, [authed, colorScheme, primary, lang]);
}
