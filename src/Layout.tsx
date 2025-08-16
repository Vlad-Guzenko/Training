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

  // закрываем сайдбар при переходе
  React.useEffect(() => setOpened(false), [loc.pathname]);

  // включаем ios-pwa класс только для PWA на iOS
  useEffect(() => {
    const isStandalone =
      window.matchMedia?.("(display-mode: standalone)")?.matches ||
      // старый способ для iOS
      // @ts-ignore
      !!navigator.standalone;

    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
    if (isStandalone && isIOS) {
      document.documentElement.classList.add("ios-pwa");
      return () => document.documentElement.classList.remove("ios-pwa");
    }
  }, []);
  const theme = useMantineTheme();
  const isActive = (path: string) =>
    path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(path);

  const toggleColorScheme = () =>
    setColorScheme(colorScheme === "dark" ? "light" : "dark");

  return (
    <AppShell
      header={{ height: 56 }}
      navbar={{
        width: 260,
        breakpoint: "sm",
        collapsed: { mobile: !opened },
      }}
      padding="md"
    >
      {/* HEADER */}
      <AppShell.Header className="app-header">
        {/* узкая накладка для safe-area сверху */}
        <div className="pwa-top-safe" />

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

      {/* NAVBAR */}
      <AppShell.Navbar p="sm" withBorder>
        <ScrollArea type="auto" style={{ height: "100%" }}>
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

      {/* CONTENT */}
      <AppShell.Main className="app-main">
        <Box mih="100%" mx="auto">
          {children}
        </Box>
      </AppShell.Main>
    </AppShell>
  );
}
