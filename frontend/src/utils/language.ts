export function getLanguageName(
  code: string,
  locale: string = navigator.language || "en",
): string {
  if (code === "auto") {
    return "Auto Detect"
  }
  const dn = new Intl.DisplayNames([locale], { type: "language" })
  return dn.of(code) ?? code
}
