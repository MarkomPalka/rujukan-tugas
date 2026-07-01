import { extractKeywords } from './keywords'

async function translateToEnglish(term: string): Promise<string | null> {
  try {
    const params = new URLSearchParams({ q: term, langpair: 'id|en' })
    const res = await fetch(`https://api.mymemory.translated.net/get?${params}`)
    if (!res.ok) return null
    const data = (await res.json()) as { responseData?: { translatedText?: string } }
    const translated = data.responseData?.translatedText?.toLowerCase().trim()
    if (!translated || translated === term.toLowerCase()) return null
    return translated
  } catch {
    return null
  }
}

const BLOCKED_WORDS = new Set([
  'pecker', 'shaft', 'prick', 'joyride', 'tool around', 'puppet', 'dick', 'cock', 'pussy',
])

async function fetchDatamuse(params: Record<string, string>): Promise<string[]> {
  try {
    const res = await fetch(`https://api.datamuse.com/words?${new URLSearchParams(params)}`)
    if (!res.ok) return []
    const data = (await res.json()) as { word: string }[]
    return data
      .map((d) => d.word.toLowerCase())
      .filter((w) => !BLOCKED_WORDS.has(w))
  } catch {
    return []
  }
}

async function relatedTerms(term: string, max = 4): Promise<string[]> {
  const synonyms = await fetchDatamuse({ rel_syn: term, max: String(max) })
  if (synonyms.length > 0) return synonyms
  return fetchDatamuse({ ml: term, max: String(max) })
}

export interface KeywordSuggestions {
  base: string[]
  suggestions: string[]
}

export async function suggestKeywordExpansion(
  brief: string,
  direction: string,
  draft: string
): Promise<KeywordSuggestions> {
  const base = extractKeywords(brief, direction, draft, 6)
  const baseSet = new Set(base)

  const expansions = await Promise.all(
    base.map(async (term) => {
      const translation = await translateToEnglish(term)
      const related = await relatedTerms(translation ?? term)
      return [translation, ...related].filter((w): w is string => Boolean(w))
    })
  )

  const suggestions = [...new Set(expansions.flat())].filter((w) => !baseSet.has(w))

  return { base, suggestions: suggestions.slice(0, 12) }
}
