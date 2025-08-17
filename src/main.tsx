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
  // Акцентный цвет на верхнем уровне темы
  const [primary] = usePrimaryColor();

  return (
    <MantineProvider theme={{ primaryColor: primary }}>
      <Notifications position="top-right" zIndex={9999} />
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
