import * as React from "react";
import { useEffect, useState } from "react";
import {
  AppShell,
  NavLink,
  ActionIcon,
  Group,
  Burger,
  Text,
  ScrollArea,
  Box,
  useMantineTheme,
  useMantineColorScheme,
  Menu,
} from "@mantine/core";
import { NavLink as RouterLink, useLocation } from "react-router-dom";
import {
  IconHome,
  IconHistory,
  IconClockHour4,
  IconSettings,
  IconSun,
  IconMoonStars,
  IconWeight,
  IconLanguage,
  IconCheck,
  IconTarget,
  IconInfoCircle,
} from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import { usePrefsSync } from "./lib/usePrefsSync";
import { onAuthStateChanged } from "firebase/auth";
import { notifications } from "@mantine/notifications";
import { auth } from "./lib/firebase";
import { blockIfGuest } from "./lib/guard";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { t, i18n } = useTranslation(); // подписка на смену языка
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, setOpened] = useState(false);
  const loc = useLocation();
  const theme = useMantineTheme();
  usePrefsSync();

  // если ресурсы названы "ua", используем его; иначе — стандартный "uk"
  const UA_CODE = (i18n.options as any)?.resources?.ua ? "ua" : "uk";
  const LANGS = [
    { value: "en", label: "EN" },
    { value: "it", label: "IT" },
    { value: "ru", label: "RU" },
    { value: UA_CODE, label: "UA" },
  ];

  // закрываем сайдбар при переходе
  React.useEffect(() => setOpened(false), [loc.pathname]);

  // iOS PWA helper-класс
  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      (navigator as any).standalone;
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (!(isStandalone && isIOS)) return;

    const setVH = () => {
      const vh = window.innerHeight * 0.01;
      document.documentElement.style.setProperty("--app-vh", `${vh}px`);
    };
    setVH();
    window.addEventListener("resize", setVH);
    document.addEventListener("visibilitychange", setVH);
    return () => {
      window.removeEventListener("resize", setVH);
      document.removeEventListener("visibilitychange", setVH);
    };
  }, []);

  useEffect(() => {
    // блокируем скролл фона, когда открыт navbar
    document.documentElement.classList.toggle("lock-scroll", opened);
    document.body.classList.toggle("lock-scroll", opened);
    return () => {
      document.documentElement.classList.remove("lock-scroll");
      document.body.classList.remove("lock-scroll");
    };
  }, [opened]);

  const isActive = (path: string) =>
    path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(path);

  const toggleColorScheme = () =>
    setColorScheme(colorScheme === "dark" ? "light" : "dark");

  const [authed, setAuthed] = useState(false);
  useEffect(() => onAuthStateChanged(auth, (u) => setAuthed(!!u)), []);

  const HEADER_H = 56;
  const SAFE_TOP = "env(safe-area-inset-top, 0px)";
  const SAFE_BOTTOM = "env(safe-area-inset-bottom, 0px)";

  return (
    <AppShell
      header={{ height: HEADER_H, offset: true }} // фикс-хедер
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      <Box className="safe-top-veil" aria-hidden="true" />
      {/* HEADER (fixed AppShell-ом) */}
      <AppShell.Header
        withBorder
        style={{
          zIndex: 6000,
          background: "var(--mantine-color-body)", // глухой фон, чтобы не просвечивало
          transform: "translateZ(0)", // отдельный слой для iOS
          willChange: "transform",
        }}
      >
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
              aria-label={opened ? t("a11y.closeMenu") : t("a11y.openMenu")}
              aria-expanded={opened}
              title={opened ? t("a11y.closeMenu") : t("a11y.openMenu")}
            />
            <Text
              fw={700}
              c={theme.colors[theme.primaryColor][6]}
              style={{
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                lineHeight: 1.15,
                fontSize: "clamp(14px, 2.8vw, 20px)",
              }}
            >
              GooseFit
            </Text>
          </Group>

          <ActionIcon
            variant="default"
            radius="xl"
            size="lg"
            onClick={toggleColorScheme}
            aria-label={
              colorScheme === "dark"
                ? t("a11y.switchToLightTheme")
                : t("a11y.switchToDarkTheme")
            }
            title={
              colorScheme === "dark"
                ? t("a11y.switchToLightTheme")
                : t("a11y.switchToDarkTheme")
            }
          >
            {colorScheme === "dark" ? (
              <IconSun size={18} />
            ) : (
              <IconMoonStars size={18} />
            )}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      {/* NAVBAR — свой скролл, высота ограничена экраном минус хедер и safe-top */}
      {/* key={i18n.language} форс-перемонтирует navbar при смене языка */}
      <AppShell.Navbar p="sm" withBorder key={i18n.language}>
        <ScrollArea
          type="auto"
          style={{
            height: `calc((var(--app-vh, 1vh) * 100) - ${SAFE_TOP} - ${HEADER_H}px)`,
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <NavLink
            component={RouterLink}
            to="/"
            label={t("plan.title")}
            active={isActive("/")}
            leftSection={<IconHome size={18} />}
            onClick={() => setOpened(false)}
          />
          {authed ? (
            <NavLink
              component={RouterLink}
              to="/goals"
              label={t("goals.title")}
              active={isActive("/goals")}
              leftSection={<IconTarget size={18} />}
              onClick={() => setOpened(false)}
            />
          ) : (
            <NavLink
              component={RouterLink}
              to="/goals"
              label={t("goals.title")}
              leftSection={<IconTarget size={18} />}
              onClick={(e) => {
                if (!authed) {
                  e.preventDefault();
                  blockIfGuest(t("auth.pleaseSignInToManage"));
                }
              }}
              aria-disabled={!authed}
              styles={{
                root: {
                  opacity: authed ? 1 : 0.45,
                  cursor: authed ? "pointer" : "not-allowed",
                },
              }}
            />
          )}
          <NavLink
            component={RouterLink}
            to="/exercises"
            label={t("exercises.title")}
            active={isActive("/exercises")}
            leftSection={<IconWeight size={18} />}
            onClick={() => setOpened(false)}
          />

          <NavLink
            component={RouterLink}
            to="/history"
            label={t("history.title")}
            active={isActive("/history")}
            leftSection={<IconHistory size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/timer"
            label={t("timer.title")}
            active={isActive("/timer")}
            leftSection={<IconClockHour4 size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/settings"
            label={t("settings.title")}
            active={isActive("/settings")}
            leftSection={<IconSettings size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/about"
            label={t("about.about")}
            active={isActive("/about")}
            leftSection={<IconInfoCircle size={18} />}
            onClick={() => setOpened(false)}
          />
        </ScrollArea>

        {/* FOOTER NAVBAR — только язык */}
        <Box
          p="sm"
          style={{
            marginTop: "auto",
            paddingBottom:
              "calc(var(--mantine-spacing-sm, 12px) + env(safe-area-inset-bottom))",
            paddingLeft:
              "calc(var(--mantine-spacing-sm, 12px) + env(safe-area-inset-left))",
            paddingRight:
              "calc(var(--mantine-spacing-sm, 12px) + env(safe-area-inset-right))",
          }}
        >
          <Group justify="flex-start" align="center">
            <Menu withinPortal position="right-start">
              <Menu.Target>
                <ActionIcon
                  variant="default"
                  radius="xl"
                  size="lg"
                  aria-label={t("a11y.changeLanguage")}
                  title={t("a11y.changeLanguage")}
                  style={{ marginBottom: 2, marginLeft: 2 }}
                >
                  <IconLanguage size={18} />
                </ActionIcon>
              </Menu.Target>
              <Menu.Dropdown>
                {LANGS.map((l) => (
                  <Menu.Item
                    key={l.value}
                    onClick={() => {
                      i18n.changeLanguage(l.value);
                      try {
                        localStorage.setItem("i18nextLng", l.value);
                      } catch {}
                      setOpened(false);
                    }}
                    rightSection={
                      i18n.language === l.value ? <IconCheck size={14} /> : null
                    }
                  >
                    {l.label}
                  </Menu.Item>
                ))}
              </Menu.Dropdown>
            </Menu>
          </Group>
        </Box>
      </AppShell.Navbar>

      {/* MAIN — скролл только здесь; учитываем safe areas */}
      <AppShell.Main
        className="app-main"
        style={{
          paddingTop: `calc(${SAFE_TOP} + var(--mantine-spacing-md, 16px))`,
          paddingBottom: `calc(${SAFE_BOTTOM} + var(--mantine-spacing-md, 16px))`,
          position: "relative",
          zIndex: 0,
        }}
      >
        <Box mx="auto">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
