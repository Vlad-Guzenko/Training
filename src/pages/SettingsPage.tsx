import { useRef, useState } from "react";
import { Button, Card, Group, Stack, Title, Text, Divider, ActionIcon, Badge, FileInput } from "@mantine/core";
import { useMantineColorScheme } from "@mantine/core";
import { IconSun, IconMoonStars, IconDownload, IconUpload, IconTrash, IconBell, IconClipboard } from "@tabler/icons-react";
import { notifications } from "@mantine/notifications";
import { LS_KEY } from "../lib/workout";
import { ColorSwatch, SimpleGrid } from "@mantine/core";
import { usePrimaryColor } from "../lib/usePrimaryColor";
import { useMantineTheme } from "@mantine/core";

export default function SettingsPage() {
  const theme = useMantineTheme();
  const [primary, setPrimary] = usePrimaryColor();

  const { colorScheme, setColorScheme } = useMantineColorScheme();
  const fileRef = useRef<File | null>(null);
  const [size, setSize] = useState(() => roughStorageSize());

  const toggleScheme = () => setColorScheme(colorScheme === "dark" ? "light" : "dark");

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
        title: "Экспорт готов",
        message: "Скачан файл workout-plan-state.json",
        color: "teal",
      });
    } catch {
      notifications.show({
        title: "Ошибка экспорта",
        message: "Не удалось сформировать файл",
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
        title: "Импорт успешен",
        message: "Перезагружаю приложение…",
        color: "teal",
      });
      setTimeout(() => window.location.reload(), 500);
    } catch {
      notifications.show({
        title: "Ошибка импорта",
        message: "Неверный формат файла",
        color: "red",
      });
    }
  };

  const handleClear = () => {
    try {
      localStorage.removeItem(LS_KEY);
      setSize(roughStorageSize());
      notifications.show({
        title: "Данные очищены",
        message: "Состояние приложения сброшено",
        color: "orange",
      });
    } catch {
      notifications.show({
        title: "Ошибка очистки",
        message: "Не удалось удалить данные",
        color: "red",
      });
    }
  };

  const handleCopyState = async () => {
    try {
      const raw = localStorage.getItem(LS_KEY) || "{}";
      await navigator.clipboard.writeText(raw);
      notifications.show({
        title: "Скопировано",
        message: "Текущее состояние в буфере обмена",
        color: "teal",
      });
    } catch {
      notifications.show({
        title: "Буфер недоступен",
        message: "Сделайте экспорт в файл",
        color: "yellow",
      });
    }
  };

  const testNotification = () =>
    notifications.show({
      title: "Пример уведомления",
      message: "Так оно будет выглядеть в интерфейсе",
      color: "indigo",
      autoClose: 2000,
    });

  return (
    <>
      <Title order={2} mb="sm">
        Настройки
      </Title>

      <Stack gap="md">
        {/* Тема */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600} mb="xs">
            Акцентный цвет
          </Text>
          <SimpleGrid cols={8} spacing="xs">
            {Object.keys(theme.colors).map((color) => (
              <ColorSwatch
                key={color}
                color={theme.colors[color][6]}
                onClick={() => {
                  setPrimary(color);
                  notifications.show({
                    title: "Цвет изменён",
                    message: `Теперь акцентный цвет — ${color}`,
                    color: color,
                  });
                }}
                style={{
                  cursor: "pointer",
                  border: primary === color ? "2px solid var(--mantine-color-text)" : "none",
                }}
              />
            ))}
          </SimpleGrid>
        </Card>
        <Card withBorder shadow="sm" radius="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600}>Тема интерфейса</Text>
              <Text c="dimmed" size="sm">
                Переключение светлой / тёмной темы
              </Text>
            </div>
            <ActionIcon variant="default" size="lg" radius="xl" onClick={toggleScheme} title="Сменить тему">
              {colorScheme === "dark" ? <IconSun size={18} /> : <IconMoonStars size={18} />}
            </ActionIcon>
          </Group>
        </Card>

        {/* Уведомления */}
        <Card withBorder shadow="sm" radius="md">
          <Group justify="space-between" align="center">
            <div>
              <Text fw={600}>Уведомления</Text>
              <Text c="dimmed" size="sm">
                Проверить, где и как появляются уведомления
              </Text>
            </div>
            <Button leftSection={<IconBell size={16} />} onClick={testNotification}>
              Тест уведомления
            </Button>
          </Group>
        </Card>

        {/* Данные */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600} mb="xs">
            Данные
          </Text>
          <Group gap="sm" wrap="wrap">
            <Button variant="light" leftSection={<IconDownload size={16} />} onClick={handleExport}>
              Экспорт JSON
            </Button>
            <FileInput
              placeholder="Выберите JSON для импорта"
              leftSection={<IconUpload size={16} />}
              accept="application/json"
              onChange={handleImport}
              value={fileRef.current ? (fileRef.current as any) : null}
              clearable
            />
            <Button color="red" variant="light" leftSection={<IconTrash size={16} />} onClick={handleClear}>
              Очистить данные
            </Button>
            <Button variant="default" leftSection={<IconClipboard size={16} />} onClick={handleCopyState}>
              Копировать в буфер
            </Button>
          </Group>

          <Divider my="sm" />
          <Group>
            <Text c="dimmed" size="sm">
              Объём хранилища:
            </Text>
            <Badge variant="light">{size} КБ</Badge>
          </Group>
        </Card>

        {/* О приложении */}
        <Card withBorder shadow="sm" radius="md">
          <Text fw={600}>О приложении</Text>
          <Text c="dimmed" size="sm">
            Всё работает локально, данные сохраняются в вашем браузере (localStorage).
          </Text>
        </Card>
      </Stack>
    </>
  );
}
