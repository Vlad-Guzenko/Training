import { notifications } from "@mantine/notifications";
import { t } from "i18next";

type GuardOpts = {
  id?: string;
  autoClose?: number;
  color?: string;
};

export const blockIfGuest = (message: string, opts: GuardOpts = {}) => {
  notifications.show({
    id: opts.id,
    title: t("auth.signInRequired"),
    message,
    color: opts.color ?? "yellow",
    autoClose: opts.autoClose ?? 1500,
    withCloseButton: true,
  });
  return false;
};
