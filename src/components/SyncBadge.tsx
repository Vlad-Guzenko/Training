import { Badge } from "@mantine/core";
import type { SyncStatus } from "../lib/useCloudSync";
import { useTranslation } from "react-i18next";

export function SyncBadge({ status }: { status: SyncStatus }) {
  const { t } = useTranslation();

  // у гостя и пустого состояния — ничего не показываем
  if (status === "hidden") return null;

  const map: Record<
    Exclude<SyncStatus, "hidden">,
    { color: string; text: string }
  > = {
    saved: { color: "teal", text: t("syncBadge.synced", "Сохранено") },
    pending: {
      color: "yellow",
      text: t("syncBadge.notSync", "Синхронизация…"),
    },
    offline: { color: "yellow", text: t("syncBadge.offline", "Оффлайн") },
    error: { color: "red", text: t("syncBadge.error", "Ошибка") },
    local: { color: "gray", text: t("syncBadge.local", "Только локально") },
  };

  const { color, text } = map[status];

  return (
    <Badge color={color} variant="light">
      {text}
    </Badge>
  );
}
