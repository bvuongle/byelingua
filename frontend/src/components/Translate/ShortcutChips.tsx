import {Center, HStack, Kbd} from "@chakra-ui/react";
import {prettifyKey} from "@/utils/shortcut.ts";

export const ShortcutChips = ({ combo }: { combo?: string | null }) => {
  if (!combo) return null;
  const parts = combo.split(/\s*\+\s*/).filter(Boolean);

  return (
    <Center>
      <HStack as="span" gap="0.5">
        {parts.map((p) => (
          <Kbd key={p} size="sm">
            {prettifyKey(p)}
          </Kbd>
        ))}
      </HStack>
    </Center>
  );
};
