import { useLocalStorage } from "@mantine/hooks";

export function usePrimaryColor() {
  return useLocalStorage<string>({
    key: "primary-color",
    defaultValue: "blue",
  });
}
