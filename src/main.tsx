// src/main.tsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "@mantine/core/styles.css";
import "@mantine/notifications/styles.css";
import "./index.css";

import { MantineProvider } from "@mantine/core";
import { Notifications } from "@mantine/notifications";
import { HashRouter } from "react-router-dom";
import { usePrimaryColor } from "./lib/usePrimaryColor";

import { registerSW } from "virtual:pwa-register";
import "./lib/i18n";
import { useMediaQuery } from "@mantine/hooks";

registerSW({
  immediate: true,
  onNeedRefresh() {
    console.log("💡 Доступна новая версия. Обновите страницу.");
  },
  onOfflineReady() {
    console.log("✅ Приложение готово к офлайн-работе.");
  },
});

function Root() {
  const [primary] = usePrimaryColor();
  const isPhone = useMediaQuery("(max-width: 600px)"); // или 640px — на вкус

  return (
    <MantineProvider theme={{ primaryColor: primary }}>
      <Notifications
        withinPortal
        zIndex={4000}
        limit={3}
        position="top-right"
        containerWidth={isPhone ? undefined : 420}
        style={{
          top: "calc(env(safe-area-inset-top, 0px) + 56px + 8px)", // 56 — твоя высота хедера
          right: isPhone ? 8 : 12,
          left: isPhone ? 8 : "auto",
          width: isPhone ? "calc(100vw - 16px)" : undefined,
        }}
        styles={(theme) => ({
          notification: {
            borderRadius: 12,
            boxShadow: theme.shadows.md,
          },
          title: { fontWeight: 600 },
        })}
      />
      <HashRouter>
        <App />
      </HashRouter>
    </MantineProvider>
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <Root />
  </React.StrictMode>
);
