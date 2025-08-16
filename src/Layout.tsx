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
} from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { NavLink as RouterLink, useLocation } from "react-router-dom";
import {
  IconHome,
  IconHistory,
  IconClockHour4,
  IconSettings,
  IconSun,
  IconMoonStars,
  IconWeight,
} from "@tabler/icons-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, setOpened] = useState(false);
  const loc = useLocation();
  const theme = useMantineTheme();

  // закрываем сайдбар при переходе
  React.useEffect(() => setOpened(false), [loc.pathname]);

  // iOS PWA helper-класс
  useEffect(() => {
    // только для iOS PWA
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
      {/* HEADER (fixed AppShell-ом) */}
      <AppShell.Header withBorder>
        <Group h="100%" px="md" justify="space-between" wrap="nowrap">
          <Group gap="sm" wrap="nowrap">
            <Burger
              opened={opened}
              onClick={() => setOpened((o) => !o)}
              hiddenFrom="sm"
              size="sm"
              aria-label="Открыть меню"
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
            aria-label="Сменить тему"
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
      <AppShell.Navbar p="sm" withBorder>
        <ScrollArea
          type="auto"
          style={{
            // высота = реальная высота экрана (через --app-vh) минус safe-top и минус хедер
            height: `calc((var(--app-vh, 1vh) * 100) - ${SAFE_TOP} - ${HEADER_H}px)`,
            WebkitOverflowScrolling: "touch",
            overscrollBehavior: "contain",
          }}
        >
          <NavLink
            component={RouterLink}
            to="/"
            label="План"
            active={isActive("/")}
            leftSection={<IconHome size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/exercises"
            label="Упражнения"
            active={isActive("/exercises")}
            leftSection={<IconWeight size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/history"
            label="История"
            active={isActive("/history")}
            leftSection={<IconHistory size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/timer"
            label="Таймер"
            active={isActive("/timer")}
            leftSection={<IconClockHour4 size={18} />}
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/settings"
            label="Настройки"
            active={isActive("/settings")}
            leftSection={<IconSettings size={18} />}
            onClick={() => setOpened(false)}
          />
        </ScrollArea>
      </AppShell.Navbar>

      {/* MAIN — скролл только здесь; учитываем safe areas */}
      <AppShell.Main
        className="app-main"
        style={{
          paddingTop: `calc(${SAFE_TOP} + var(--mantine-spacing-md, 16px))`,
          paddingBottom: `calc(${SAFE_BOTTOM} + var(--mantine-spacing-md, 16px))`,
        }}
      >
        <Box mx="auto">{children}</Box>
      </AppShell.Main>
    </AppShell>
  );
}
