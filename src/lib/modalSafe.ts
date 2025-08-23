// src/lib/modalSafe.ts
export const modalSafeProps = {
  centered: true,
  withinPortal: true,
  // небольшой отступ от "чёлки" на iOS PWA
  yOffset: "max(8px, env(safe-area-inset-top, 0px))",
  zIndex: 6000,
  overlayProps: {
    zIndex: 6000,
    color: "var(--mantine-color-black)",
    opacity: 0.55,
    style: {
      position: "fixed",
      inset: 0,
      width: "100vw",
      height: "max(100dvh, calc(var(--app-vh, 1vh) * 100))",
    },
  },
  styles: {
    // без safe-area внутри, чтобы не было огромных пустых зон
    content: { padding: "var(--mantine-spacing-sm)" },
  },
} as const;
