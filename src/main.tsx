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

function Root() {
  // Храним акцентный цвет на самом верху
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
