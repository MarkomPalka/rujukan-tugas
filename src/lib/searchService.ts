import type { Source, SourceCategory } from '../types'
import { createId } from './db'
import { summarizeAbstract } from './keywords'
import { formatApaJournal, formatApaBook } from './apaCitation'

interface OpenAlexWork {
  id: string
  title: string
  publication_year?: number
  doi?: string
  abstract_inverted_index?: Record<string, number[]>
  authorships?: { author: { display_name: string } }[]
  primary_location?: {
    source?: { type?: string }
    landing_page_url?: string
    pdf_url?: string
  }
  open_access?: { is_oa?: boolean; oa_url?: string }
  language?: string
  type?: string
  cited_by_count?: number
}

function reconstructAbstract(index?: Record<string, number[]>): string | undefined {
  if (!index) return undefined
  const pairs: [number, string][] = []
  for (const [word, positions] of Object.entries(index)) {
    for (const pos of positions) {
      pairs.push([pos, word])
    }
  }
  pairs.sort((a, b) => a[0] - b[0])
  return pairs.map(([, w]) => w).join(' ')
}

function mapType(type?: string, sourceType?: string): 'journal' | 'book' | 'other' {
  const t = `${type ?? ''} ${sourceType ?? ''}`.toLowerCase()
  if (t.includes('book')) return 'book'
  if (t.includes('journal') || t.includes('article')) return 'journal'
  return 'other'
}

export async function searchOpenAlex(query: string, perPage = 10): Promise<Source[]> {
  const params = new URLSearchParams({
    search: query,
    per_page: String(perPage),
    mailto: 'user@refmate.local',
  })

  const res = await fetch(`https://api.openalex.org/works?${params}`)
  if (!res.ok) throw new Error('Gagal mencari di OpenAlex')

  const data = (await res.json()) as { results: OpenAlexWork[] }

  return data.results.map((work) => {
    const abstract = reconstructAbstract(work.abstract_inverted_index)
    const authors =
      work.authorships?.map((a) => a.author.display_name).filter(Boolean) ?? []
    const type = mapType(work.type, work.primary_location?.source?.type)
    const doi = work.doi?.replace('https://doi.org/', '')
    const base = {
      title: work.title ?? 'Tanpa judul',
      authors,
      year: work.publication_year,
      abstract,
      doi,
      url: work.primary_location?.landing_page_url ?? work.doi,
      openAccessUrl: work.open_access?.oa_url ?? work.primary_location?.pdf_url,
      type,
      language: work.language,
    }

    return {
      id: createId(),
      ...base,
      summary: summarizeAbstract(abstract ?? ''),
      citationApa:
        type === 'book' ? formatApaBook(base) : formatApaJournal(base),
      citationCount: work.cited_by_count,
      category: 'general' as SourceCategory,
      status: 'recommended' as const,
      addedAt: Date.now(),
      sourceApi: 'openalex' as const,
    }
  })
}

interface SemanticPaper {
  paperId: string
  title: string
  year?: number
  abstract?: string
  authors?: { name: string }[]
  externalIds?: { DOI?: string }
  openAccessPdf?: { url?: string }
  url?: string
  citationCount?: number
}

export async function searchSemanticScholar(query: string, limit = 8): Promise<Source[]> {
  const params = new URLSearchParams({
    query,
    limit: String(limit),
    fields: 'title,year,abstract,authors,externalIds,openAccessPdf,url,citationCount',
  })

  const res = await fetch(
    `https://api.semanticscholar.org/graph/v1/paper/search?${params}`,
    { headers: { Accept: 'application/json' } }
  )

  if (!res.ok) {
    if (res.status === 429) return []
    throw new Error('Gagal mencari di Semantic Scholar')
  }

  const data = (await res.json()) as { data?: SemanticPaper[] }

  return (data.data ?? []).map((paper) => {
    const authors = paper.authors?.map((a) => a.name) ?? []
    const doi = paper.externalIds?.DOI
    const base = {
      title: paper.title ?? 'Tanpa judul',
      authors,
      year: paper.year,
      abstract: paper.abstract,
      doi,
      url: paper.url ?? (doi ? `https://doi.org/${doi}` : undefined),
      openAccessUrl: paper.openAccessPdf?.url,
      type: 'journal' as const,
    }

    return {
      id: createId(),
      ...base,
      summary: summarizeAbstract(paper.abstract ?? ''),
      citationApa: formatApaJournal(base),
      citationCount: paper.citationCount,
      category: 'general' as SourceCategory,
      status: 'recommended' as const,
      addedAt: Date.now(),
      sourceApi: 'semantic_scholar' as const,
    }
  })
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/[^\w\s]/g, '').trim()
}

export function dedupeSources(sources: Source[]): Source[] {
  const seen = new Set<string>()
  return sources.filter((s) => {
    const key = s.doi ?? normalizeTitle(s.title)
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function scoreRelevance(
  source: Source,
  keywords: string[],
  gapTerms: string[]
): { score: number; reason: string } {
  const text = `${source.title} ${source.abstract ?? ''}`.toLowerCase()
  let score = 0
  const matched: string[] = []
  const gapMatched: string[] = []

  for (const kw of keywords) {
    if (text.includes(kw.toLowerCase())) {
      score += 10
      matched.push(kw)
    }
  }

  for (const gap of gapTerms) {
    if (text.includes(gap.toLowerCase())) {
      score += 15
      gapMatched.push(gap)
    }
  }

  if (source.openAccessUrl) score += 5
  if (source.year && source.year >= 2015) score += 3

  let reason = 'Relevansi berdasarkan kata kunci tugas.'
  if (matched.length > 0) {
    reason = `Cocok dengan: ${matched.slice(0, 3).join(', ')}.`
  }
  if (gapMatched.length > 0) {
    reason += ` Memperkuat gap: ${gapMatched.join(', ')}.`
  }

  return { score, reason }
}

export function relevanceLabel(score: number): 'Sangat Relevan' | 'Relevan' | 'Cukup Relevan' {
  if (score >= 30) return 'Sangat Relevan'
  if (score >= 15) return 'Relevan'
  return 'Cukup Relevan'
}

function computeCredibility(source: Source): 'tinggi' | 'sedang' | 'rendah' {
  const citations = source.citationCount ?? 0
  let points = 0

  if (citations >= 50) points += 2
  else if (citations >= 5) points += 1

  if (source.type === 'journal') points += 1
  if (source.year && source.year >= 2015) points += 1

  if (points >= 3) return 'tinggi'
  if (points >= 1) return 'sedang'
  return 'rendah'
}

function categorizeSource(
  source: Source,
  gapTerms: string[]
): SourceCategory {
  const text = `${source.title} ${source.abstract ?? ''}`.toLowerCase()

  if (gapTerms.some((g) => text.includes(g.toLowerCase()))) return 'gap_fill'
  if (/case study|studi kasus|ethnograph|qualitative study/i.test(text)) return 'case_study'
  if (/method|metodologi|framework|theory|teori|conceptual|kerangka/i.test(text)) {
    if (/method|metodologi|approach|pendekatan/i.test(text)) return 'methodology'
    return 'theory'
  }
  if (/case|kasus|example|contoh/i.test(text)) return 'case_study'

  return 'general'
}

export async function searchAndCurate(
  queries: string[],
  keywords: string[],
  gapTerms: string[],
  existingTitles: string[]
): Promise<Source[]> {
  const existingNorm = new Set(existingTitles.map(normalizeTitle))
  const all: Source[] = []
  let failedAttempts = 0

  for (const query of queries) {
    const [oa, ss] = await Promise.all([
      searchOpenAlex(query, 8).catch(() => null),
      searchSemanticScholar(query, 5).catch(() => null),
    ])
    if (oa === null && ss === null) {
      failedAttempts++
      continue
    }
    all.push(...(oa ?? []), ...(ss ?? []))
  }

  if (queries.length > 0 && failedAttempts === queries.length) {
    throw new Error(
      'Layanan pencarian (OpenAlex/Semantic Scholar) sedang tidak bisa diakses. Coba lagi beberapa saat lagi.'
    )
  }

  const unique = dedupeSources(all).filter(
    (s) => !existingNorm.has(normalizeTitle(s.title))
  )

  return unique
    .map((source) => {
      const { score, reason } = scoreRelevance(source, keywords, gapTerms)
      const category = categorizeSource(source, gapTerms)
      return {
        ...source,
        relevanceScore: score,
        relevanceReason: reason,
        credibility: computeCredibility(source),
        category,
      }
    })
    .sort((a, b) => (b.relevanceScore ?? 0) - (a.relevanceScore ?? 0))
    .slice(0, 24)
}

export function createManualSource(input: {
  title: string
  authors?: string
  year?: number
  url?: string
  doi?: string
  notes?: string
}): Source {
  const authors = input.authors
    ? input.authors.split(/[,;]/).map((a) => a.trim()).filter(Boolean)
    : []

  const type = 'journal' as const
  const base = {
    title: input.title,
    authors,
    year: input.year,
    doi: input.doi,
    url: input.url ?? (input.doi ? `https://doi.org/${input.doi}` : undefined),
    abstract: input.notes,
    type,
  }

  return {
    id: createId(),
    ...base,
    summary: input.notes ? summarizeAbstract(input.notes) : 'Sumber ditambahkan manual.',
    citationApa: formatApaJournal(base),
    category: 'existing',
    status: 'to_read',
    addedAt: Date.now(),
    sourceApi: 'manual',
  }
}
