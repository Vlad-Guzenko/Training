import { useEffect, useRef, useState } from "react";
import {
  Button,
  Card,
  Group,
  Stack,
  Title,
  Text,
  Divider,
  ActionIcon,
  Badge,
  FileInput,
  Menu,
} from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import {
  IconSun,
  IconMoonStars,
  IconDownload,
  IconUpload,
  IconTrash,
  IconBell,
  IconClipboard,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { LS_KEY } from "../lib/workout";
import { ColorSwatch, SimpleGrid } from "@mantine/core";
import { usePrimaryColor } from "../lib/usePrimaryColor";
import { useMantineTheme } from "@mantine/core";

import { Avatar } from "@mantine/core";
import {
  IconBrandGoogle,
  IconLogout,
  IconCloudUp,
  IconCloudDown,
} from "@tabler/icons-react";
import { cloudLoad, cloudSave } from "../lib/cloud";
import type { PlanState } from "../types";
import { onAuth, signInWithGoogle, signOutGoogle } from "../lib/firebase";
import { useCloudSync } from "../lib/useCloudSync";
import { SyncBadge } from "../components/SyncBadge";
import { useTranslation } from "react-i18next";

export default function SettingsPage({
  state,
  setState,
}: {
  state: PlanState;
  setState: React.Dispatch<React.SetStateAction<PlanState>>;
}) {
  const theme = useMantineTheme();
  const [primary, setPrimary] = usePrimaryColor();

  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const fileRef = useRef<File | null>(null);
  const [size, setSize] = useState(() => roughStorageSize());

  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  useEffect(() => onAuth(setUser), []);
  const status = useCloudSync(state, setState);

  const toggleScheme = () =>
    setColorScheme(colorScheme === "dark" ? "light" : "dark");

  const { t } = useTranslation();

  const saveCloud = async () => {
    try {
      await cloudSave(state);
      notifications.show({
        title: t("settings.saved"),
        message: t("settings.updatedCloud"),
        color: "teal",
      });
    } catch (e: any) {
      notifications.show({
        title: t("settings.error"),
        message: e?.message || t("settings.needLogin"),
        color: "red",
      });
    }
  };

  const loadCloud = async () => {
    try {
      const data = await cloudLoad();
      if (data) {
        setState(data);
        localStorage.setItem(LS_KEY, JSON.stringify(data));
        setSize(roughStorageSize());
        notifications.show({
          title: t("settings.loaded"),
          message: t("settings.pulledFromCloud"),
          color: "teal",
        });
      } else {
        notifications.show({
          title: t("settings.empty"),
          message: t("settings.noCloud"),
          color: "yellow",
        });
      }
    } catch (e: any) {
      notifications.show({
        title: t("settings.error"),
        message: e?.message || t("settings.needLogin"),
        color: "red",
      });
    }
  };

  function roughStorageSize() {
    try {
      const raw = localStorage.getItem(LS_KEY) || "";
      return Math.ceil(new Blob([raw]).size / 1024);
    } catch {
      return 0;
    }
  }

  const handleExport = () => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      const data = raw ? JSON.parse(raw) : {};
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "workout-plan-state.json";
      a.click();
      URL.revokeObjectURL(url);
      notifications.show({
        title: t("settings.exportReady"),
        message: t("settings.downloaded"),
        color: "teal",
      });
    } catch {
      notifications.show({
        title: t("settings.exportError"),
        message: t("settings.exportFail"),
        color: "red",
      });
    }
  };

  const handleImport = async (f: File | null) => {
    if (!f) return;
    try {
      const text = await f.text();
      const json = JSON.parse(text);
      localStorage.setItem(LS_KEY, JSON.stringify(json));
      notifications.show({
        title: t("settings.importOk"),
        message: t("settings.reloading"),
        color: "teal",
      });
      setTimeout(() => window.location.reload(), 500);
    } catch {
      notifications.show({
        title: t("settings.importError"),
        message: t("settings.importInvalid"),
        color: "red",
      });
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(LS_KEY);
      setSize(roughStorageSize());
      notifications.show({
        title: t("settings.cleared"),
        message: t("settings.stateCleared"),
        color: "orange",
      });
    } catch {
      notifications.show({
        title: t("settings.clearError"),
        message: t("settings.clearFail"),
        color: "red",
      });
    }
  };

  const handleCopyState = async () => {
    try {
      const raw = localStorage.getItem(LS_KEY) || "{}";
      await navigator.clipboard.writeText(raw);
      notifications.show({
        title: t("settings.copied"),
        message: t("settings.stateCopied"),
        color: "teal",
      });
    } catch {
      notifications.show({
        title: t("settings.clipboardNA"),
        message: t("settings.exportInstead"),
        color: "yellow",
      });
    }
  };

  const testNotification = () =>
    notifications.show({
      title: t("settings.sampleTitle"),
      message: t("settings.sampleMsg"),
      color: theme.colors[theme.primaryColor][6],
      autoClose: 1500,
    });

  return (
    <>
      <Title order={2} mb="sm">
        {t("settings.title")}
      </Title>

      <Stack gap="md">
        {/* Тема */}
        <Card withBorder shadow="sm" radius="md">
          <Group justify="space-between" align="center">
            <Group>
              <Avatar src={user?.photoURL ?? undefined} radius="xl" />
              <div>
                <Text fw={600}>{t("settings.account")}</Text>
                <Text size="sm" c="dimmed">
                  {user
                    ? user.email || user.displayName
                    : t("settings.loginToSync")}
                </Text>
              </div>
            </Group>

            <Group>
              <SyncBadge status={status} />
              {user ? (
                <Button
                  leftSection={<IconLogout size={16} />}
                  variant="default"
                  onClick={signOutGoogle}
                >
                  {t("settings.signOut")}
                </Button>
              ) : (
                <Button
                  leftSection={<IconBrandGoogle size={16} />}
                  onClick={signInWithGoogle}
                >
                  {t("settings.signInGoogle")}
                </Button>
              )}
            </Group>
          </Group>

          <Divider my="sm" />
          <Group wrap="wrap" gap="sm">
            <Button
              leftSection={<IconCloudUp size={16} />}
              onClick={saveCloud}
              disabled={!user}
            >
              {t("settings.cloudSave")}
            </Button>
            <Button
              leftSection={<IconCloudDown size={16} />}
              onClick={loadCloud}
              variant="default"
              disabled={!user}
            >
              {t("settings.cloudLoad")}
            </Button>
          </Group>
        </Card>

        <Card withBorder shadow="sm" radius="md">
          <Text fw={600} mb="xs">
            {t("settings.accentColor")}
          </Text>
          <SimpleGrid cols={8} spacing="xs">
            {Object.keys(theme.colors).map((color) => (
              <ColorSwatch
                key={color}
                color={theme.colors[color][6]}
                onClick={() => {
                  setPrimary(color);
                  notifications.show({
                    title: t("settings.colorChanged"),
                    message: t("settings.colorChangedMsg", { color }),
                    color: color,
                  });
                }}
                style={{
                  cursor: "pointer",
                  border:
                    primary === color
                      ? "2px solid var(--mantine-color-text)"
                      : "none",
                }}
              />
            ))}
          </SimpleGrid>
        </Card>
        <Card withBorder shadow="sm" radius="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600}>{t("settings.theme")}</Text>
              <Text c="dimmed" size="sm">
                {t("settings.themeHint")}
              </Text>
            </div>
            <ActionIcon
              variant="default"
              size="lg"
              radius="xl"
              onClick={toggleScheme}
              title="Сменить тему"
            >
              {colorScheme === "dark" ? (
                <IconSun size={18} />
              ) : (
                <IconMoonStars size={18} />
              )}
            </ActionIcon>
          </Group>
        </Card>

        {/* Уведомления */}
        <Card withBorder shadow="sm" radius="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600}>{t("settings.notifications")}</Text>
              <Text c="dimmed" size="sm">
                {t("settings.notifyCheck")}
              </Text>
            </div>
            <Button
              leftSection={<IconBell size={16} />}
              onClick={testNotification}
            >
              {t("settings.notificationsTest")}
            </Button>
          </Group>
        </Card>

        {/* Данные */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600} mb="xs">
            {t("settings.data")}
          </Text>
          <Group gap="sm" wrap="wrap">
            <Button
              variant="light"
              leftSection={<IconDownload size={16} />}
              onClick={handleExport}
            >
              {t("settings.export")}
            </Button>
            <FileInput
              placeholder={t("settings.selectJsonToImport")}
              leftSection={<IconUpload size={16} />}
              accept="application/json"
              onChange={handleImport}
              value={fileRef.current ? (fileRef.current as any) : null}
              clearable
            />
            <Button
              color="red"
              variant="light"
              leftSection={<IconTrash size={16} />}
              onClick={handleClear}
            >
              {t("settings.clear")}
            </Button>
            <Button
              variant="default"
              leftSection={<IconClipboard size={16} />}
              onClick={handleCopyState}
            >
              {t("settings.copyClipboard")}
            </Button>
          </Group>

          <Divider my="sm" />
          <Group>
            <Text c="dimmed" size="sm">
              {t("settings.storageSize")}
            </Text>
            <Badge variant="light">{size} КБ</Badge>
          </Group>
        </Card>

        {/* О приложении */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600}>{t("settings.about")}</Text>
          <Text c="dimmed" size="sm">
            {t("settings.aboutText")}
          </Text>
        </Card>
      </Stack>
    </>
  );
}
