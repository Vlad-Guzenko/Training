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
  Modal,
  useMantineColorScheme,
  useMantineTheme,
  Avatar,
  ColorSwatch,
  SimpleGrid,
} from "@mantine/core";
import {
  IconSun,
  IconMoonStars,
  IconDownload,
  IconUpload,
  IconTrash,
  IconBell,
  IconClipboard,
  IconBrandGoogle,
  IconLogout,
  IconCloudUp,
  IconCloudDown,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { LS_KEY } from "../lib/workout";
import { usePrimaryColor } from "../lib/usePrimaryColor";

import { cloudLoad, cloudSave } from "../lib/cloud";
import type { PlanState } from "../types";
import { db, onAuth, signInWithGoogle, signOutGoogle } from "../lib/firebase";
import { useCloudSync } from "../lib/useCloudSync";
import { SyncBadge } from "../components/SyncBadge";
import { useTranslation } from "react-i18next";
import {
  clearIndexedDbPersistence,
  terminate,
  deleteDoc,
  doc,
} from "firebase/firestore";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { modalSafeProps } from "../lib/modalSafe";
import { modals } from "@mantine/modals";

export default function SettingsPage({
  state,
  setState,
}: {
  state: PlanState;
  setState: React.Dispatch<React.SetStateAction<PlanState>>;
}) {
  const theme = useMantineTheme();
  const [primary, setPrimary] = usePrimaryColor();

  const SKIP_IMPORT_FLAG = "__wf_skip_local_import_once";
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const fileRef = useRef<File | null>(null);
  const [size, setSize] = useState(() => roughStorageSize());
  const [askOpen, { open: openAsk, close: closeAsk }] = useDisclosure(false);

  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  useEffect(() => onAuth(setUser), []);
  const status = useCloudSync(state, setState);
  const isPhone = useMediaQuery("(max-width: 480px)");
  const toggleScheme = () =>
    setColorScheme(colorScheme === "dark" ? "light" : "dark");
  const [signoutOpen, signout] = useDisclosure(false);
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

  const handleClearLocalPlan = () => {
    try {
      localStorage.removeItem(LS_KEY);
      setSize(roughStorageSize());
      notifications.show({
        title: t("settings.cleared"),
        message: t("settings.stateCleared"),
        color: "orange",
      });
      setTimeout(() => window.location.reload(), 300);
    } catch {
      notifications.show({
        title: t("settings.clearError"),
        message: t("settings.clearFail"),
        color: "red",
      });
    }
  };

  const handleClearPlanEverywhere = async () => {
    if (!user) {
      notifications.show({
        title: t("settings.needLogin"),
        message: t("settings.signInToClearCloud"),
        color: "yellow",
      });
      return;
    }
    try {
      await deleteDoc(doc(db, "users", user.uid, "data", "plan"));
      localStorage.removeItem(LS_KEY);
      setSize(roughStorageSize());
      notifications.show({
        title: t("settings.cleared"),
        message: t("settings.stateClearedEverywhere"),
        color: "red",
      });
      setTimeout(() => window.location.reload(), 300);
    } catch {
      notifications.show({
        title: t("settings.clearError"),
        message: t("settings.clearFailCloud"),
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

  const handleSignOut = async () => {
    try {
      await signOutGoogle();
    } finally {
      try {
        localStorage.clear();
      } catch {}

      try {
        await terminate(db as any).catch(() => {});
        await clearIndexedDbPersistence(db as any).catch(() => {});
      } catch {}

      try {
        if ("caches" in window) {
          const names = await caches.keys();
          await Promise.all(names.map((n) => caches.delete(n)));
        }
      } catch {}

      window.location.reload();
    }
  };

  const hardSignOut = handleSignOut;

  function openSignOutConfirm() {
    modals.openConfirmModal({
      centered: true,
      title: t("settings.signOutConfirmTitle", {
        defaultValue: "Выйти из аккаунта?",
      }) as string,
      children: (
        <Text size="sm">
          {t("settings.signOutConfirmText", {
            defaultValue:
              "Вы выйдете из аккаунта, а кэш и локальные данные на этом устройстве будут удалены.",
          })}
        </Text>
      ),
      labels: {
        cancel: t("common.cancel") as string,
        confirm: t("settings.signOut", { defaultValue: "Выйти" }) as string,
      },
      confirmProps: { color: "red" },
      // чтобы фон перекрывал safe-areas в PWA
      overlayProps: {
        opacity: 0.55,
        style: {
          position: "fixed",
          inset: 0,
          height: "100dvh",
          backdropFilter: "blur(2px)",
        },
      },
      onConfirm: hardSignOut,
    });
  }

  function isMeaningfulPlan(obj: any): boolean {
    if (!obj || typeof obj !== "object") return false;

    const candidates = [
      obj?.history,
      obj?.sessions,
      obj?.exercises,
      obj?.customExercises,
      obj?.workouts,
      obj?.plan?.exercises,
      obj?.plan?.days,
      obj?.weeks,
    ].filter(Array.isArray) as any[];

    if (candidates.some((a) => a.length > 0)) return true;

    const stack: any[] = [obj];
    const seen = new Set<any>();
    while (stack.length) {
      const cur = stack.pop();
      if (!cur || typeof cur !== "object" || seen.has(cur)) continue;
      seen.add(cur);
      for (const k in cur) {
        const v = cur[k];
        if (Array.isArray(v)) {
          if (v.length > 0) return true;
        } else if (v && typeof v === "object") {
          stack.push(v);
        }
      }
    }

    return false;
  }

  function hasLocalProgress(): boolean {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (!raw) return false;
      const t = raw.trim();
      if (!t || t === "{}" || t === "null" || t === "undefined") return false;
      const obj = JSON.parse(t);
      return isMeaningfulPlan(obj);
    } catch {
      return false;
    }
  }

  const proceedImport = async () => {
    closeAsk();
    await signInWithGoogle();
  };

  const proceedFresh = async () => {
    try {
      localStorage.setItem(SKIP_IMPORT_FLAG, "1");
      localStorage.removeItem(LS_KEY);
    } catch {}
    closeAsk();
    await signInWithGoogle();
  };

  const handleSignIn = async () => {
    if (hasLocalProgress()) {
      openAsk();
      return;
    }
    await signInWithGoogle();
  };

  return (
    <>
      <Title order={2} mb="sm">
        {t("settings.title")}
      </Title>

      <Stack gap="md">
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
                  onClick={signout.open}
                >
                  {t("settings.signOut")}
                </Button>
              ) : (
                <Button
                  leftSection={<IconBrandGoogle size={16} />}
                  onClick={handleSignIn}
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
            <Menu withinPortal position="bottom-start">
              <Menu.Target>
                <Button
                  color="red"
                  variant="light"
                  leftSection={<IconTrash size={16} />}
                >
                  {t("settings.clear")}
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item onClick={handleClearLocalPlan}>
                  {t("settings.resetPlanLocal")}
                </Menu.Item>
                <Menu.Item color="red" onClick={handleClearPlanEverywhere}>
                  {t("settings.resetPlanEverywhere")}
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
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
              {t("settings.storageUsed")}
            </Text>
            <Badge variant="light">{size} КБ</Badge>
          </Group>
        </Card>
      </Stack>
      <Modal
        {...modalSafeProps}
        opened={askOpen}
        onClose={closeAsk}
        centered
        withinPortal
        size={isPhone ? "sm" : "lg"}
        radius="md"
        zIndex={20000}
        title={t("settings.signInChoiceTitle")}
        overlayProps={{
          ...modalSafeProps.overlayProps,
          opacity: 0.45,
          zIndex: 19999,
        }}
        styles={{
          ...modalSafeProps.styles,
          body: { paddingTop: 8, paddingBottom: 8 },
        }}
      >
        <Stack gap="md" style={{ paddingBottom: 0, marginBottom: 0 }}>
          <Text size="sm" c="dimmed">
            {t("settings.signInChoiceDesc")}
          </Text>

          <Group visibleFrom="sm" justify="space-between" wrap="nowrap">
            <Button variant="default" onClick={closeAsk}>
              {t("settings.signInChoiceCancel")}
            </Button>
            <Group gap="xs" wrap="nowrap">
              <Button variant="outline" onClick={proceedFresh}>
                {t("settings.signInChoiceFresh")}
              </Button>
              <Button onClick={proceedImport} autoFocus>
                {t("settings.signInChoiceImport")}
              </Button>
            </Group>
          </Group>

          <Stack gap="xs" hiddenFrom="sm" style={{ marginBottom: 0 }}>
            <Button fullWidth onClick={proceedImport}>
              {t("settings.signInChoiceImport")}
            </Button>
            <Button variant="outline" fullWidth onClick={proceedFresh}>
              {t("settings.signInChoiceFresh")}
            </Button>
            <Button variant="default" fullWidth onClick={closeAsk}>
              {t("settings.signInChoiceCancel")}
            </Button>
          </Stack>
        </Stack>
      </Modal>
      {/*Sign out modal*/}
      <Modal
        {...modalSafeProps}
        opened={signoutOpen}
        onClose={signout.close}
        title={t("settings.signOutConfirmTitle")}
        centered
        overlayProps={{
          ...modalSafeProps.overlayProps,
          opacity: 0.55,
        }}
        styles={{
          ...modalSafeProps.styles,
          content: { padding: "var(--mantine-spacing-sm)" },
        }}
      >
        <Stack gap="sm">
          <Text size="sm">{t("settings.signOutConfirmText")}</Text>
          <Group justify="flex-end">
            <Button variant="default" onClick={signout.close}>
              {t("common.cancel")}
            </Button>
            <Button
              color="red"
              onClick={async () => {
                signout.close();
                await handleSignOut();
              }}
            >
              {t("settings.signOut")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
