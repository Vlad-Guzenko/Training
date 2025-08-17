import { Badge } from "@mantine/core";
import type { SyncStatus } from "../lib/useCloudSync";
import { t } from "i18next";

export function SyncBadge({ status }: { status: SyncStatus }) {
  const map = {
    saved: { color: "teal", text: t("syncBadge.synced") },
    pending: { color: "yellow", text: t("syncBadge.notSync") },
    offline: { color: "red", text: t("syncBadge.offline") },
    error: { color: "red", text: t("syncBadge.error") },
  } as const;

  const { color, text } = map[status];
  return <Badge color={color}>{text}</Badge>;
}
