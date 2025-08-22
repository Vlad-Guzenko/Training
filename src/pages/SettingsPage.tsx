// src/pages/SettingsPage.tsx
import { useEffect, useState } from "react";
import {
  ActionIcon,
  Anchor,
  Avatar,
  Badge,
  Button,
  Card,
  ColorSwatch,
  Divider,
  FileInput,
  Group,
  Modal,
  SimpleGrid,
  Stack,
  Text,
  Title,
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import {
  IconAlertTriangle,
  IconBell,
  IconBrandGoogle,
  IconClipboard,
  IconDownload,
  IconLogout,
  IconMoonStars,
  IconSun,
  IconTrash,
  IconUpload,
} from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { useTranslation } from "react-i18next";

import { LS_KEY } from "../lib/workout";
import { usePrimaryColor } from "../lib/usePrimaryColor";
import type { PlanState } from "../types";
import { db, onAuth, signInWithGoogle, signOutGoogle } from "../lib/firebase";
import { useCloudSync } from "../lib/useCloudSync";
import { SyncBadge } from "../components/SyncBadge";
import {
  clearIndexedDbPersistence,
  collection,
  deleteDoc,
  doc,
  getDocs,
  terminate,
} from "firebase/firestore";
import { useDisclosure, useMediaQuery } from "@mantine/hooks";
import { modalSafeProps } from "../lib/modalSafe";
import {
  deleteUser,
  GoogleAuthProvider,
  reauthenticateWithPopup,
} from "firebase/auth";

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
  const [size, setSize] = useState(() => roughStorageSize());
  const [signoutOpen, signout] = useDisclosure(false);
  const [delOpen, del] = useDisclosure(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [user, setUser] = useState<import("firebase/auth").User | null>(null);
  const isPhone = useMediaQuery("(max-width: 480px)");
  const { t } = useTranslation();

  // ---- helpers --------------------------------------------------------------

  async function wipeLocalAndReload() {
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

  async function deleteUserData(uid: string) {
    // 1) data/*
    try {
      await deleteDoc(doc(db, "users", uid, "data", "plan")).catch(() => {});
      await deleteDoc(doc(db, "users", uid, "data", "prefs")).catch(() => {});
    } catch {}

    // 2) workouts/* и их subcollection sessions/*
    try {
      const workoutsRef = collection(db, "users", uid, "workouts");
      const workoutsSnap = await getDocs(workoutsRef);
      for (const w of workoutsSnap.docs) {
        const sessionsRef = collection(
          db,
          "users",
          uid,
          "workouts",
          w.id,
          "sessions"
        );
        const sessionsSnap = await getDocs(sessionsRef);
        await Promise.all(
          sessionsSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {}))
        );
        await deleteDoc(w.ref).catch(() => {});
      }
    } catch {}

    // 3) goals/*
    try {
      const goalsRef = collection(db, "users", uid, "goals");
      const goalsSnap = await getDocs(goalsRef);
      await Promise.all(
        goalsSnap.docs.map((d) => deleteDoc(d.ref).catch(() => {}))
      );
    } catch {}

    // 4) корневой документ (если используешь)
    try {
      await deleteDoc(doc(db, "users", uid)).catch(() => {});
    } catch {}
  }

  const handleDeleteAccount = async () => {
    if (!user) {
      notifications.show({
        title: t("settings.needLogin", { defaultValue: "Sign in required" }),
        message: t("settings.signInToDelete", {
          defaultValue: "Please sign in to delete your account",
        }),
        color: "yellow",
      });
      return;
    }

    setIsDeleting(true);
    try {
      await deleteUserData(user.uid);

      try {
        await deleteUser(user);
      } catch (e: any) {
        if (e?.code === "auth/requires-recent-login") {
          const provider = new GoogleAuthProvider();
          await reauthenticateWithPopup(user, provider);
          await deleteUser(user);
        } else {
          throw e;
        }
      }

      notifications.show({
        title: t("settings.accountDeletedTitle", {
          defaultValue: "Account deleted",
        }),
        message: t("settings.accountDeletedMsg", {
          defaultValue: "All your data has been removed",
        }),
        color: "red",
      });

      // Шаг 3: локальный wipe и перезагрузка
      await wipeLocalAndReload();
    } catch {
      notifications.show({
        title: t("settings.deleteErrorTitle", {
          defaultValue: "Delete failed",
        }),
        message: t("settings.deleteErrorMsg", {
          defaultValue: "We couldn't delete your account. Try again.",
        }),
        color: "red",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  // ---- effects --------------------------------------------------------------

  // подгружаем фото после логина (у Google иногда появится на второй тик)
  useEffect(() => {
    const unsub = onAuth(async (u) => {
      if (u && (!u.photoURL || !u.providerData?.[0]?.photoURL)) {
        try {
          await u.reload();
        } catch {}
      }
      setUser(u);
    });
    return unsub;
  }, []);

  // синк без лишних уведомлений
  const status = useCloudSync(state, setState, true, 3000);

  const toggleScheme = () =>
    setColorScheme(colorScheme === "dark" ? "light" : "dark");

  function roughStorageSize() {
    try {
      const raw = localStorage.getItem(LS_KEY) || "";
      return Math.ceil(new Blob([raw]).size / 1024);
    } catch {
      return 0;
    }
  }

  // ---- handlers -------------------------------------------------------------

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
      await wipeLocalAndReload();
    }
  };

  const handleSignIn = async () => {
    await signInWithGoogle();
  };

  // ---- render ---------------------------------------------------------------

  return (
    <>
      <Title order={2} mb="sm">
        {t("settings.title")}
      </Title>

      <Stack gap="md">
        <Card withBorder shadow="sm" radius="md">
          <Group justify="space-between" align="center">
            <Group>
              <Avatar
                key={
                  user?.photoURL || user?.providerData?.[0]?.photoURL || "anon"
                }
                src={(() => {
                  const raw =
                    user?.photoURL || user?.providerData?.[0]?.photoURL || "";
                  if (!raw) return undefined;
                  try {
                    const u = new URL(raw);
                    if (!u.searchParams.has("sz"))
                      u.searchParams.set("sz", "128");
                    return u.toString();
                  } catch {
                    return raw.includes("?") ? raw : `${raw}?sz=128`;
                  }
                })()}
                radius="xl"
                imageProps={{ referrerPolicy: "no-referrer" }}
              />
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
                    color: color as any,
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
              title="Switch theme"
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
              clearable
            />

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

      {/* Danger zone */}
      <Card
        withBorder
        radius="md"
        styles={{ root: { borderColor: theme.colors.red[6] } }}
        mt="lg"
      >
        <Stack gap="xs">
          <Text fw={700} c="red">
            Опасная зона
          </Text>
          <Text size="sm" c="dimmed">
            Необратимые действия. Перед удалением вы можете{" "}
            <Anchor onClick={handleExport}>экспортировать данные</Anchor>.
          </Text>
          <Group wrap="wrap">
            <Button
              variant="light"
              color="red"
              onClick={handleClearPlanEverywhere}
            >
              Сбросить везде
            </Button>
            <Button color="red" onClick={del.open}>
              Удалить аккаунт
            </Button>
          </Group>
        </Stack>
      </Card>

      {/* Подтверждение выхода */}
      <Modal
        {...modalSafeProps}
        opened={signoutOpen}
        onClose={signout.close}
        title={t("settings.signOutConfirmTitle", { defaultValue: "Sign out?" })}
        centered
        size={isPhone ? "sm" : "md"}
        overlayProps={{ ...modalSafeProps.overlayProps, opacity: 0.55 }}
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

      {/*Модалка удаления аккаунта*/}
      <Modal
        opened={delOpen}
        onClose={del.close}
        centered // ⬅️ по центру экрана
        size={isPhone ? "sm" : "md"}
        withinPortal
        portalProps={{
          target: typeof document !== "undefined" ? document.body : undefined,
        }}
        lockScroll
        trapFocus
        overlayProps={{
          ...modalSafeProps.overlayProps,
          opacity: 0.55,
          zIndex: 1000,
        }}
        zIndex={2000}
        title={
          <Group gap="xs" align="center">
            <IconAlertTriangle size={18} color={theme.colors.red[6]} />
            <Text size="sm">{t("settings.deleteAccountTitle")}</Text>
          </Group>
        }
      >
        <Stack gap="sm">
          <Text size="sm">{t("settings.deleteAccountText")}</Text>

          <Group justify="flex-end">
            <Button variant="default" onClick={del.close}>
              {t("common.cancel")}
            </Button>
            <Button
              color="red"
              leftSection={<IconTrash size={16} />}
              loading={isDeleting}
              onClick={async () => {
                del.close();
                await handleDeleteAccount();
              }}
            >
              {t("settings.deleteForever")}
            </Button>
          </Group>
        </Stack>
      </Modal>
    </>
  );
}
