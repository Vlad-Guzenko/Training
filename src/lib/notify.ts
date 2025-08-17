// src/lib/notify.ts
import { notifications } from "@mantine/notifications";

export type NotifyOptions = {
  color?: string;
  autoClose?: number;
  icon?: string;
  badge?: string;
};

export type NotifyPayload = {
  title: string;
  message: string;
} & NotifyOptions;

export function isPwa(): boolean {
  const dm =
    typeof window !== "undefined" &&
    window.matchMedia?.("(display-mode: standalone)")?.matches;
  const iosStandalone =
    typeof navigator !== "undefined" && (navigator as any).standalone === true;
  return Boolean(dm || iosStandalone);
}

/** Нормализатор аргументов: поддерживает (title, message, opts?) ИЛИ ({title, message, ...}) */
function normalizeArgs(
  a: string | NotifyPayload,
  b?: string,
  c?: NotifyOptions
): NotifyPayload {
  if (typeof a === "string") {
    return { title: a, message: b ?? "", ...(c ?? {}) };
  }
  return a;
}

/** Гибридное уведомление: Mantine toast + (в PWA) системное OS-уведомление */
export async function notifyHybrid(
  titleOrPayload: string | NotifyPayload,
  maybeMessage?: string,
  maybeOpts?: NotifyOptions
) {
  const { title, message, color, autoClose, icon, badge } = normalizeArgs(
    titleOrPayload,
    maybeMessage,
    maybeOpts
  );

  // 1) Mantine toast (всегда, как быстрый визуальный фидбек)
  notifyHybrid({
    title,
    message,
    color: (color as any) ?? "teal",
    autoClose: autoClose ?? 3000,
  });

  // 2) В PWA поверх показываем системное уведомление (если разрешено)
  if (
    isPwa() &&
    typeof Notification !== "undefined" &&
    "serviceWorker" in navigator
  ) {
    try {
      const perm =
        Notification.permission === "granted"
          ? "granted"
          : await Notification.requestPermission();
      if (perm === "granted") {
        const reg = await navigator.serviceWorker.ready;
        const opts: NotificationOptions = {
          body: message,
          icon: icon || "/icons/icon-192.png",
          badge: badge || "/icons/icon-96.png",
        };
        await reg.showNotification(title, opts);
      }
    } catch (e) {
      // игнорируем — тост уже показан
      console.warn("[notifyHybrid] OS notification fallback", e);
    }
  }
}
