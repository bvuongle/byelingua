export function norm(s: string) {
  return s.replace(/\s*\+\s*/g, "+").toLowerCase();
}

export function prettifyKey(k: string) {
  switch (k) {
    case "ctrl":
      return "Ctrl";
    case "alt":
      return "Alt";
    case "shift":
      return "Shift";
    case "meta":
      return "Cmd";
    case "←":
      return "←";
    case "→":
      return "→";
    case "↑":
      return "↑";
    case "↓":
      return "↓";
    default:
      return k.length === 1 ? k.toUpperCase() : k;
  }
}
