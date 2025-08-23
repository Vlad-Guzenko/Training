import { Button, Group, List, Modal, Stack, Text, Title } from "@mantine/core";
import type { Exercise } from "../../../types";
import { t } from "i18next";
import { modalSafeProps } from "../../../lib/modalSafe";

export default function SuggestedWorkoutModal({
  opened,
  onClose,
  goalName,
  suggested,
  applyAppend,
  applyReplace,
}: {
  opened: boolean;
  onClose: () => void;
  goalName: string;
  suggested: Exercise[];
  applyAppend: () => void;
  applyReplace: () => void;
}) {
  return (
    <Modal
      {...modalSafeProps}
      opened={opened}
      onClose={onClose}
      title={t("goals.preview")}
    >
      <Stack>
        <Title order={4}>{t("goals.suggestedFor", { name: goalName })}</Title>
        <List spacing="xs" withPadding>
          {suggested.map((e) => (
            <List.Item key={e.id}>
              <Text fw={600}>
                {e.name} — {e.sets}×{e.reps}
              </Text>
              {e.notes && (
                <Text size="sm" c="dimmed">
                  {e.notes}
                </Text>
              )}
            </List.Item>
          ))}
        </List>
        <Group justify="flex-end" mt="md">
          <Button variant="default" onClick={onClose}>
            {t("common.cancel")}
          </Button>
          <Button onClick={applyAppend}>{t("goals.addToPlan")}</Button>
          <Button color="red" onClick={applyReplace}>
            {t("goals.replacePlan")}
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
