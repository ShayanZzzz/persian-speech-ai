export type SubtitleWord = { word: string; probability?: number }
export type Subtitle = {
  id: string
  start: number
  end: number
  text: string
  words?: SubtitleWord[]
}

// Confidence is optional: never infer word-level errors from segment scores.
export function parseSubtitleSegments(value: unknown): Subtitle[] {
  if (!Array.isArray(value)) return []
  return value.flatMap((segment): Subtitle[] => {
    if (!segment || typeof segment !== 'object') return []
    const { start, end, text, words } = segment
    if (typeof start !== 'number' || !Number.isFinite(start) || start < 0 ||
        typeof end !== 'number' || !Number.isFinite(end) || end <= start ||
        typeof text !== 'string' || !text.trim()) return []
    return [{
      id: crypto.randomUUID(), start, end, text: text.trim(),
      words: Array.isArray(words) ? words.flatMap(word => {
        if (!word || typeof word.word !== 'string') return []
        return [{
          word: word.word,
          probability: typeof word.probability === 'number' && Number.isFinite(word.probability) && word.probability >= 0 && word.probability <= 1 ? word.probability : undefined,
        }]
      }) : undefined,
    }]
  })
}
