import { norm } from "@/utils/shortcut.ts"
import { useHotkeys } from "react-hotkeys-hook"

export function useRowHotkeys(
  shortcuts: any,
  handlers: Record<string, () => void>,
) {
  useHotkeys(
    shortcuts.previous ? norm(shortcuts.previous) : "",
    (e) => {
      e.preventDefault()
      handlers.goPrev()
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA"] },
    [handlers.goPrev],
  )
  useHotkeys(
    shortcuts.skip ? norm(shortcuts.skip) : "",
    (e) => {
      e.preventDefault()
      handlers.goNext()
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA"] },
    [handlers.goNext],
  )
  useHotkeys(
    shortcuts.accept ? norm(shortcuts.accept) : "",
    (e) => {
      e.preventDefault()
      handlers.save()
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA"] },
    [handlers.save],
  )
  useHotkeys(
    shortcuts.accept_and_next ? norm(shortcuts.accept_and_next) : "",
    (e) => {
      e.preventDefault()
      handlers.saveAndNext()
    },
    { enableOnFormTags: ["INPUT", "TEXTAREA"] },
    [handlers.saveAndNext],
  )
}
