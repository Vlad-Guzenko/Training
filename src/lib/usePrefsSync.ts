// src/lib/usePrefsSync.ts
import { useEffect, useRef } from "react";
import { onAuth } from "./firebase";
import { loadUserPrefs, saveUserPrefs } from "./cloudNormalized";
import { useMantineColorScheme } from "@mantine/core";
import { usePrimaryColor } from "./usePrimaryColor";

export function usePrefsSync() {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [primary, setPrimary] = usePrimaryColor();

  const last = useRef<string>("");

  // 1) При логине — подтягиваем prefs и применяем
  useEffect(() => {
    const unsub = onAuth(async (u) => {
      if (!u) return;
      try {
        const prefs = await loadUserPrefs();
        if (prefs?.colorScheme) setColorScheme(prefs.colorScheme);
        if (prefs?.primaryColor) setPrimary(prefs.primaryColor);
      } catch (e) {
        console.warn("[prefs sync] load error", e);
      }
    });
    return () => unsub();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 2) Автосейв при изменениях локальных настроек
  useEffect(() => {
    const json = JSON.stringify({ colorScheme, primary });
    if (json === last.current) return;
    last.current = json;

    const t = window.setTimeout(async () => {
      try {
        await saveUserPrefs({
          colorScheme: colorScheme as "light" | "dark",
          primaryColor: primary,
        });
      } catch (e) {
        console.warn("[prefs sync] save error", e);
      }
    }, 800);

    return () => window.clearTimeout(t);
  }, [colorScheme, primary]);
}
