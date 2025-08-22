// src/features/goals/ui/SuggestedWorkoutModal.tsx
import { Button, Group, List, Modal, Stack, Text, Title } from "@mantine/core";
import type { Exercise, PlanState } from "../../../types";

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
    <Modal opened={opened} onClose={onClose} title="Preview workout">
      <Stack>
        <Title order={4}>Suggested for: {goalName}</Title>
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
            Cancel
          </Button>
          <Button onClick={applyAppend}>Add to plan</Button>
          <Button color="red" onClick={applyReplace}>
            Replace plan
          </Button>
        </Group>
      </Stack>
    </Modal>
  );
}
