import {Button, Stack} from "@chakra-ui/react";
import {ShortcutChips} from "./shortcut-chips";

interface NavButtonProps {
  onClick: () => void;
  disabled: boolean;
  label: string;
  shortcut?: string | null;
  colorScheme?: string;
  loading?: boolean;
}
export function NavButton({
                     onClick,
                     disabled,
                     label,
                     shortcut,
                     colorScheme,
                     loading,
                   }: NavButtonProps) {
  return (
    <Button onClick={onClick} disabled={disabled} colorScheme={colorScheme} py="8">
      <Stack>
        {loading ? "Saving…" : label}
        {shortcut && <ShortcutChips combo={shortcut} />}
      </Stack>
    </Button>
  );
}
