import type { Source, SourceStatus } from '../types'
import { CATEGORY_LABELS, STATUS_LABELS } from '../types'
import { relevanceLabel } from '../lib/searchService'

interface Props {
  source: Source
  onStatusChange: (id: string, status: SourceStatus) => void
  onRemove?: (id: string) => void
}

const STATUS_OPTIONS: SourceStatus[] = [
  'recommended',
  'to_read',
  'reading',
  'used',
  'dismissed',
]

const CREDIBILITY_STYLES: Record<'tinggi' | 'sedang' | 'rendah', string> = {
  tinggi: 'bg-emerald-50 text-emerald-700',
  sedang: 'bg-amber-50 text-amber-700',
  rendah: 'bg-slate-100 text-slate-600',
}

const CREDIBILITY_LABELS: Record<'tinggi' | 'sedang' | 'rendah', string> = {
  tinggi: 'Kredibilitas Tinggi',
  sedang: 'Kredibilitas Sedang',
  rendah: 'Kredibilitas Rendah',
}

export default function SourceCard({ source, onStatusChange, onRemove }: Props) {
  const readUrl = source.openAccessUrl ?? source.url

  return (
    <article className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
        <div className="flex flex-wrap gap-2">
          <span className="text-xs font-medium bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
            {CATEGORY_LABELS[source.category]}
          </span>
          {source.relevanceScore != null && source.relevanceScore > 0 && (
            <span
              className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full"
              title={`Skor relevansi: ${source.relevanceScore}`}
            >
              {relevanceLabel(source.relevanceScore)}
            </span>
          )}
          {source.citationCount != null && (
            <span className="text-xs bg-slate-100 text-slate-700 px-2.5 py-1 rounded-full">
              Disitasi {source.citationCount}x
            </span>
          )}
          {source.credibility && (
            <span
              className={`text-xs px-2.5 py-1 rounded-full ${CREDIBILITY_STYLES[source.credibility]}`}
            >
              {CREDIBILITY_LABELS[source.credibility]}
            </span>
          )}
          {source.openAccessUrl && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
              Open Access
            </span>
          )}
        </div>
        <select
          value={source.status}
          onChange={(e) => onStatusChange(source.id, e.target.value as SourceStatus)}
          className="text-xs border border-border rounded-lg px-2 py-1.5 bg-white"
          aria-label="Status bacaan"
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {STATUS_LABELS[s]}
            </option>
          ))}
        </select>
      </div>

      <h3 className="font-semibold text-brand-900 leading-snug mb-1">{source.title}</h3>

      <p className="text-sm text-muted mb-3">
        {source.authors.length > 0 ? source.authors.join(', ') : 'Penulis tidak diketahui'}
        {source.year ? ` (${source.year})` : ''}
        {source.type === 'book' ? ' · Buku' : ' · Jurnal'}
      </p>

      {source.relevanceReason && (
        <p className="text-sm text-brand-700 bg-brand-50 rounded-lg px-3 py-2 mb-3">
          {source.relevanceReason}
        </p>
      )}

      <div className="mb-4">
        <p className="text-xs font-medium text-muted uppercase tracking-wide mb-1">
          Ringkasan
        </p>
        <p className="text-sm leading-relaxed text-slate-700">{source.summary}</p>
      </div>

      {source.citationApa && (
        <details className="mb-4">
          <summary className="text-xs font-medium text-muted cursor-pointer hover:text-brand-600">
            Sitasi APA 7
          </summary>
          <p className="text-xs mt-2 p-3 bg-slate-50 rounded-lg leading-relaxed select-all">
            {source.citationApa}
          </p>
        </details>
      )}

      <div className="flex flex-wrap gap-2">
        {readUrl && (
          <a
            href={readUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
          >
            {source.openAccessUrl ? 'Baca / Unduh' : 'Buka Sumber'}
          </a>
        )}
        {source.doi && (
          <a
            href={`https://doi.org/${source.doi.replace(/^https?:\/\/doi\.org\//, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-slate-50"
          >
            DOI
          </a>
        )}
        {onRemove && (
          <button
            onClick={() => onRemove(source.id)}
            className="text-sm text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50 ml-auto"
          >
            Hapus
          </button>
        )}
      </div>
    </article>
  )
}
