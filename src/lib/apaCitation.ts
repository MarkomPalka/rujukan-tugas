export function formatAuthorsApa(authors: string[], max = 20): string {
  if (authors.length === 0) return 'n.d.'

  const formatted = authors.slice(0, max).map((name) => {
    const parts = name.trim().split(/\s+/)
    if (parts.length === 1) return parts[0]
    const last = parts[parts.length - 1]
    const initials = parts
      .slice(0, -1)
      .map((p) => `${p[0]}.`)
      .join(' ')
    return `${last}, ${initials}`
  })

  if (formatted.length === 1) return formatted[0]
  if (formatted.length === 2) return `${formatted[0]}, & ${formatted[1]}`
  if (formatted.length <= max) {
    const last = formatted[formatted.length - 1]
    const rest = formatted.slice(0, -1).join(', ')
    return `${rest}, & ${last}`
  }
  return `${formatted[0]} et al.`
}

export function formatApaJournal(source: {
  title: string
  authors: string[]
  year?: number
  doi?: string
  url?: string
}): string {
  const authorPart = formatAuthorsApa(source.authors)
  const yearPart = source.year ? `(${source.year}).` : '(n.d.).'
  const titlePart = source.title.endsWith('.') ? source.title : `${source.title}.`
  let citation = `${authorPart} ${yearPart} ${titlePart}`

  if (source.doi) {
    citation += ` https://doi.org/${source.doi.replace(/^https?:\/\/doi\.org\//, '')}`
  } else if (source.url) {
    citation += ` ${source.url}`
  }

  return citation
}

export function formatApaBook(source: {
  title: string
  authors: string[]
  year?: number
  doi?: string
  url?: string
}): string {
  const authorPart = formatAuthorsApa(source.authors)
  const yearPart = source.year ? `(${source.year}).` : '(n.d.).'
  const titlePart = `*${source.title.replace(/\.$/, '')}*.`
  let citation = `${authorPart} ${yearPart} ${titlePart}`

  if (source.doi) {
    citation += ` https://doi.org/${source.doi.replace(/^https?:\/\/doi\.org\//, '')}`
  } else if (source.url) {
    citation += ` ${source.url}`
  }

  return citation
}

export function formatBibliography(
  sources: { title: string; authors: string[]; year?: number; doi?: string; url?: string; type: string; citationApa?: string }[]
): string {
  const used = sources.filter((s) => s.citationApa || s.title)
  const lines = used.map((s) => {
    if (s.citationApa) return s.citationApa
    if (s.type === 'book') return formatApaBook(s)
    return formatApaJournal(s)
  })

  return lines.sort((a, b) => a.localeCompare(b)).join('\n\n')
}
