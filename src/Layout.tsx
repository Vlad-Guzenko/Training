import * as React from "react";
import { useEffect, useState } from "react";
import { AppShell, NavLink, ActionIcon, Group, Burger, Title, ScrollArea } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { NavLink as RouterLink, useLocation } from "react-router-dom";
import {
  IconHome,
  IconHistory,
  IconClockHour4,
  IconSettings,
  IconSun,
  IconMoonStars,
  IconRun, // для "План" можно оставить домик, а для упражнений — заменить на вес
  IconWeight, // ✅ вместо IconDumbbell
} from "@tabler/icons-react";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const [opened, setOpened] = useState(false);
  const loc = useLocation();

  // Автозакрытие сайдбара при смене маршрута (удобно на мобиле)
  useEffect(() => {
    setOpened(false);
  }, [loc.pathname]);

  const toggleColorScheme = () => setColorScheme(colorScheme === "dark" ? "light" : "dark");

  // Хелпер: активность пункта
  const isActive = (path: string) => (path === "/" ? loc.pathname === "/" : loc.pathname.startsWith(path));

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
      {/* Header */}
      <AppShell.Header>
        <Group h="100%" px="md" justify="space-between">
          <Group gap="sm">
            <Burger opened={opened} onClick={() => setOpened((o) => !o)} hiddenFrom="sm" size="sm" />
            <Title
              order={3}
              style={{
                lineHeight: 1.1,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
                fontSize: "clamp(14px, 3.2vw, 20px)",
              }}
            >
              Конструктор прогрессирующих тренировок
            </Title>
          </Group>

          <ActionIcon variant="default" onClick={toggleColorScheme} title="Сменить тему" radius="xl" size="lg">
            {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoonStars size={18} />}
          </ActionIcon>
        </Group>
      </AppShell.Header>

      {/* Sidebar */}
      <AppShell.Navbar p="sm" withBorder>
        <ScrollArea type="auto" style={{ height: "100%" }}>
          <NavLink
            component={RouterLink}
            to="/"
            label="План"
            active={isActive("/")}
            leftSection={<IconHome size={18} />} // ✅ Mantine v7 — leftSection
            onClick={() => setOpened(false)}
          />
          <NavLink
            component={RouterLink}
            to="/exercises"
            label="Упражнения"
            active={isActive("/exercises")}
            leftSection={<IconWeight size={18} />} // ✅ вместо IconDumbbell
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

      {/* Content */}
      <AppShell.Main>{children}</AppShell.Main>
    </AppShell>
  );
}
