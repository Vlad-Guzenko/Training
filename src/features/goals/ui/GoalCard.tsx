import { useState } from "react";
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
  Modal,
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
  onDelete: (g: Goal) => void; // ← тут теперь ожидаем ПРЯМОЕ удаление (без своих модалок)
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

  // локальная модалка подтверждения удаления
  const [delOpen, setDelOpen] = useState(false);
  const openDel = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    e?.preventDefault?.();
    setDelOpen(true);
  };
  const closeDel = () => setDelOpen(false);
  const confirmDel = () => {
    closeDel();
    onDelete(g);
  };

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
        gridTemplateRows: "auto 1fr auto",
        background: isDark
          ? "linear-gradient(180deg, rgba(255,255,255,0.04), rgba(255,255,255,0.02))"
          : "linear-gradient(180deg, rgba(0,0,0,0.02), rgba(0,0,0,0.01))",
        borderWidth: isActive ? 2 : 1,
        borderColor: isActive ? `${accent}55` : undefined,
        transition:
          "transform .12s ease, box-shadow .12s ease, border-color .12s ease",
      }}
    >
      {/* HEADER */}
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
                marginRight: 6,
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

      {/* FOOTER — desktop/tablet */}
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
            onClick={openDel}
            style={{ marginRight: 4 }}
          >
            <IconTrash size={18} />
          </ActionIcon>
        </Tooltip>
      </Group>

      {/* FOOTER — mobile */}
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
          onClick={openDel}
        >
          {t("common.delete")}
        </Button>
      </Stack>

      {/* LOCAL CONFIRM MODAL */}
      <Modal
        opened={delOpen}
        onClose={closeDel}
        centered
        title={t("goals.deleteTitle", { defaultValue: "Удалить цель?" })}
      >
        <Text size="sm">
          {t("goals.confirmDelete", {
            name: g.name,
            defaultValue: `Удалить цель «${g.name}»? Это действие необратимо.`,
          })}
        </Text>

        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={closeDel}>
            {t("common.cancel", { defaultValue: "Отмена" })}
          </Button>
          <Button color="red" onClick={confirmDel}>
            {t("common.delete", { defaultValue: "Удалить" })}
          </Button>
        </Group>
      </Modal>
    </Card>
  );
}
