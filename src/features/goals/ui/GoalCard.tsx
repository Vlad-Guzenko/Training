// src/features/goals/ui/GoalCard.tsx
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Divider,
  Group,
  Stack,
  Text,
  Tooltip,
  useMantineTheme,
  useMantineColorScheme,
} from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useTranslation } from "react-i18next";
import GoalEtaRing from "./GoalEtaRing";
import type { Goal } from "../domain/types";

type Props = {
  goal: Goal;
  isActive: boolean;
  onSuggest: (g: Goal) => void;
  onMakeActive: (g: Goal) => void;
  onDelete: (g: Goal) => void;
};

export default function GoalCard({
  goal: g,
  isActive,
  onSuggest,
  onMakeActive,
  onDelete,
}: Props) {
  const { t } = useTranslation();
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();
  const isDark = colorScheme === "dark";

  // типобезопасный акцент
  const primaryKey: keyof typeof theme.colors =
    theme.primaryColor in theme.colors
      ? (theme.primaryColor as keyof typeof theme.colors)
      : "indigo";
  const accent = theme.colors[primaryKey][6];

  return (
    <Card
      withBorder
      radius="lg"
      p="lg"
      shadow="sm"
      style={{
        display: "grid",
        gridTemplateRows: "auto 1fr auto", // header • content • footer
        background: isDark
          ? "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))"
          : "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.01))",
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? `${accent}55` : undefined,
        transition:
          "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
      }}
    >
      {/* HEADER — флекс с бейджем справа, без absolute */}
      <Box mb="xs">
        <Group
          justify="space-between"
          align="flex-start"
          wrap="nowrap"
          gap="sm"
        >
          <Text
            fw={700}
            size="lg"
            lineClamp={2}
            style={{ minWidth: 0, flex: "1 1 auto" }}
          >
            {g.name}
          </Text>

          {isActive && (
            <Badge
              size="sm"
              variant="light"
              style={{
                flex: "0 0 auto",
                whiteSpace: "nowrap",
                marginRight: 2, // чуть отступить от скругления
                marginTop: 2,
              }}
            >
              {t("goals.active")}
            </Badge>
          )}
        </Group>

        <Text size="sm" c="dimmed" mt={6}>
          {t(`goals.domain.${g.domain}`)} • {t(`goals.metric.${g.metric}`)} •{" "}
          {t("goals.weeksShort", { n: g.planWeeks })}
        </Text>
      </Box>

      {/* CONTENT */}
      <Group align="center" gap="md" mt="md" wrap="nowrap">
        <GoalEtaRing progress={g.progress} eta={g.eta} />
        <Stack gap={2}>
          <Text c="dimmed" size="sm">
            {t("goals.etaLabel")}
          </Text>
          <Text fw={700} size="lg">
            {g.eta || (t("goals.etaUnknown") as string)}
          </Text>
        </Stack>
      </Group>

      <Divider my="md" />

      {/* FOOTER — два варианта с теми же брейкпоинтами Mantine */}
      {/* Desktop/tablet ≥ sm */}
      <Group
        gap="sm"
        mt="auto"
        justify="space-between"
        wrap="nowrap"
        visibleFrom="sm"
      >
        <Button
          variant={isActive ? "light" : "default"}
          size="md"
          onClick={() => (isActive ? onSuggest(g) : onMakeActive(g))}
          style={{ flex: 1, whiteSpace: "nowrap", minWidth: 0 }}
        >
          {isActive ? t("goals.suggest") : t("goals.makeActive")}
        </Button>

        <Tooltip label={t("common.delete") as string}>
          <ActionIcon
            size="lg"
            variant="subtle"
            color="red"
            aria-label={t("common.delete") as string}
            onClick={() => onDelete(g)}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* Mobile < sm */}
      <Stack gap="xs" mt="auto" hiddenFrom="sm">
        <Button
          variant={isActive ? "light" : "default"}
          fullWidth
          onClick={() => (isActive ? onSuggest(g) : onMakeActive(g))}
        >
          {isActive ? t("goals.suggest") : t("goals.makeActive")}
        </Button>

        <Button
          variant="subtle"
          color="red"
          fullWidth
          leftSection={<IconTrash size={16} />}
          onClick={() => onDelete(g)}
        >
          {t("common.delete")}
        </Button>
      </Stack>
    </Card>
  );
}
