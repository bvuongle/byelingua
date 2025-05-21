export function getLanguageName(
  code: string,
  locale: string = navigator.language || "en",
): string {
  const dn = new Intl.DisplayNames([locale], { type: "language" })
  return dn.of(code) ?? code
}
