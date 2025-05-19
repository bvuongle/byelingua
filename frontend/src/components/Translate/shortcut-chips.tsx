import { Kbd, HStack, Center } from "@chakra-ui/react";

export function prettifyKey(k: string) {
  switch (k) {
    case "ctrl":  return "Ctrl";
    case "alt":   return "Alt";
    case "shift": return "Shift";
    case "meta":  return "Cmd";
    case "←":     return "←";
    case "→":     return "→";
    case "↑":     return "↑";
    case "↓":     return "↓";
    default:      return k.length === 1 ? k.toUpperCase() : k;
  }
}

export function norm(s: string) {
  return s.replace(/\s*\+\s*/g, "+").toLowerCase();
}

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
