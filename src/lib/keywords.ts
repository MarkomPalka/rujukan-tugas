const STOP_WORDS = new Set([
  'yang', 'dan', 'atau', 'dengan', 'dari', 'pada', 'untuk', 'dalam', 'adalah', 'ini',
  'itu', 'akan', 'telah', 'sudah', 'bisa', 'dapat', 'juga', 'serta', 'oleh', 'ke',
  'di', 'sebagai', 'bahwa', 'agar', 'antara', 'lebih', 'sangat', 'para', 'sebuah',
  'the', 'and', 'or', 'with', 'from', 'for', 'that', 'this', 'are', 'was', 'were',
  'been', 'have', 'has', 'had', 'will', 'would', 'could', 'should', 'about', 'into',
  'through', 'during', 'before', 'after', 'above', 'below', 'between', 'under',
  'again', 'further', 'then', 'once', 'here', 'there', 'when', 'where', 'why', 'how',
  'all', 'each', 'few', 'more', 'most', 'other', 'some', 'such', 'only', 'own', 'same',
  'than', 'too', 'very', 'can', 'just', 'don', 'now', 'dengan', 'oleh', 'karena',
  'namun', 'tetapi', 'jika', 'maka', 'sehingga', 'hingga', 'yaitu', 'yakni', 'via',
  'essay', 'tugas', 'paper', 'study', 'analysis', 'discuss', 'explain', 'describe',
])

const DOMAIN_TERMS = [
  'media', 'budaya', 'culture', 'cultural', 'komunikasi', 'communication',
  'representasi', 'representation', 'identitas', 'identity', 'hegemoni', 'hegemony',
  'diskursus', 'discourse', 'simbol', 'symbol', 'narrative', 'narratif', 'visual',
  'digital', 'sosial', 'social', 'audience', 'audiens', 'konstruksi', 'construction',
  'semiotik', 'semiotic', 'postkolonial', 'postcolonial', 'gender', 'kekuasaan',
  'power', 'ideologi', 'ideology', 'popular', 'populer', 'televisi', 'television',
  'film', 'cinema', 'literasi', 'literacy', 'jurnalisme', 'journalism', 'branding',
  'koperasi', 'cooperative', 'public', 'relations', 'marketing', 'advertising',
]

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s-]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP_WORDS.has(w))
}

export function extractKeywords(
  brief: string,
  direction: string,
  draft: string,
  max = 8
): string[] {
  const combined = `${brief} ${direction} ${draft}`
  const tokens = tokenize(combined)
  const freq = new Map<string, number>()

  for (const token of tokens) {
    freq.set(token, (freq.get(token) ?? 0) + 1)
  }

  for (const term of DOMAIN_TERMS) {
    if (combined.toLowerCase().includes(term)) {
      freq.set(term, (freq.get(term) ?? 0) + 5)
    }
  }

  return [...freq.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, max)
    .map(([word]) => word)
}

export function buildSearchQueries(keywords: string[]): string[] {
  if (keywords.length === 0) return ['media culture studies']

  const queries: string[] = []
  queries.push(keywords.slice(0, 4).join(' '))

  const mediaIdx = keywords.findIndex((k) =>
    ['media', 'budaya', 'culture', 'cultural', 'komunikasi'].includes(k)
  )
  if (mediaIdx >= 0) {
    queries.push(`${keywords[mediaIdx]} ${keywords.filter((_, i) => i !== mediaIdx).slice(0, 2).join(' ')}`)
  }

  if (keywords.length >= 2) {
    queries.push(keywords.slice(0, 2).join(' '))
  }

  return [...new Set(queries)].slice(0, 3)
}

export function detectGaps(
  draft: string,
  existingSources: { title: string; abstract?: string }[]
): string[] {
  if (!draft.trim()) return []

  const draftKeywords = new Set(extractKeywords('', '', draft, 15))
  const coveredText = existingSources
    .map((s) => `${s.title} ${s.abstract ?? ''}`)
    .join(' ')
    .toLowerCase()

  const gaps: string[] = []
  for (const kw of draftKeywords) {
    if (!coveredText.includes(kw)) {
      gaps.push(kw)
    }
  }

  return gaps.slice(0, 5)
}

export function summarizeAbstract(abstract: string, maxSentences = 2): string {
  if (!abstract?.trim()) return 'Abstrak tidak tersedia. Buka sumber untuk membaca lebih lanjut.'

  const sentences = abstract
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+/)
    .filter((s) => s.length > 20)

  if (sentences.length <= maxSentences) return abstract.trim()
  return sentences.slice(0, maxSentences).join(' ')
}
