import {
  Card,
  Stack,
  Title,
  Text,
  Group,
  Button,
  useMantineTheme,
} from "@mantine/core";
import { useTranslation } from "react-i18next";
import { AUTHOR } from "../lib/appInfo";
import { useMemo } from "react";

export default function AboutPage() {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const primaryVar = `var(--mantine-color-${theme.primaryColor}-6)`;

  // небольшая утилита: оборачиваем все вхождения "GooseFit" в <Text span ...>
  function highlightBrand(text: string, brand = "GooseFit") {
    const esc = brand.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const re = new RegExp(`(${esc})`, "gi");
    return text.split(re).map((part, i) =>
      part.toLowerCase() === brand.toLowerCase() ? (
        <Text key={i} span fw={700} c={primaryVar}>
          {part}
        </Text>
      ) : (
        part
      )
    );
  }

  const aboutText = t("about.aboutText");
  const highlightedAbout = useMemo(
    () => highlightBrand(aboutText),
    [aboutText, theme.primaryColor]
  );

  return (
    <Stack gap="md">
      <Title order={2}>{t("about.about")}</Title>
      <Card withBorder shadow="sm" radius="md">
        <Text
          c="dimmed"
          size="sm"
          style={{ whiteSpace: "pre-line", lineHeight: 1.5 }}
        >
          {highlightedAbout}
        </Text>
      </Card>
      <Card withBorder shadow="sm" radius="md">
        <Text fw={600}>{t("author.author")}</Text>
        <Text c="dimmed" size="sm">
          {t("author.authorText", { name: AUTHOR.name })}
        </Text>

        <Group gap="xs" mt="sm" wrap="wrap">
          <Button
            component="a"
            href={`https://instagram.com/${AUTHOR.instagram}`}
            target="_blank"
            rel="noopener noreferrer"
            variant="light"
          >
            {t("author.authorInstagram")}
          </Button>

          {AUTHOR.email && (
            <Button
              component="a"
              href={`mailto:${AUTHOR.email}`}
              variant="default"
            >
              {t("author.authorEmail")}
            </Button>
          )}
        </Group>
      </Card>
    </Stack>
  );
}
