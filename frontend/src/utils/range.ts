export function parseRangeString(rangeStr: string, max: number): Set<number> {
  const result = new Set<number>()
  if (!rangeStr.trim()) {
    for (let i = 1; i <= max; i++) result.add(i)
    return result
  }
  for (const part of rangeStr.split(",").map((p) => p.trim())) {
    if (!part) continue
    const [start, end] = part
      .split("-")
      .map((s) => Number.parseInt(s.trim(), 10))
    if (Number.isNaN(start)) continue
    if (!Number.isNaN(end)) {
      const low = Math.min(start, end)
      const high = Math.min(Math.max(start, end), max)
      for (let i = low; i <= high; i++) result.add(i)
    } else if (start >= 1 && start <= max) {
      result.add(start)
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
  return rows.length === max ? [] : rows
}
