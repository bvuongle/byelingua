export function parseRangeString(rangeStr: string, max: number): Set<number> {
  const result = new Set<number>()
  if (!rangeStr.trim()) {
    for (let i = 1; i <= max; i++) result.add(i)
    return result
  }

  const parts = rangeStr
    .split(",")
    .map((p) => p.trim())
    .filter((p) => p)

  for (const part of parts) {
    const rangeParts = part.split("-").map((s) => Number.parseInt(s.trim(), 10))

    if (
      rangeParts.length === 2 &&
      !Number.isNaN(rangeParts[0]) &&
      !Number.isNaN(rangeParts[1])
    ) {
      const start = Math.min(rangeParts[0], rangeParts[1])
      const end = Math.max(rangeParts[0], rangeParts[1])

      for (let i = Math.max(1, start); i <= Math.min(end, max); i++) {
        result.add(i)
      }
    } else if (rangeParts.length === 1 && !Number.isNaN(rangeParts[0])) {
      const row = rangeParts[0]
      if (row >= 1 && row <= max) {
        result.add(row)
      }
    }
  }

  return result
}

export function computeRows(
  includeStr: string,
  excludeStr: string,
  max: number,
): number[] {
  const includeSet = parseRangeString(includeStr, max)
  const excludeSet = excludeStr.trim()
    ? parseRangeString(excludeStr, max)
    : new Set<number>()
  const rows = Array.from(includeSet)
    .filter((i) => !excludeSet.has(i))
    .sort((a, b) => a - b)
  return rows
}
