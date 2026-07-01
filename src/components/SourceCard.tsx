import type { Source, SourceStatus } from '../types'
import { CATEGORY_LABELS, STATUS_LABELS } from '../types'
import { relevanceLabel } from '../lib/searchService'
import Tooltip from './Tooltip'

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
  rendah: 'bg-stone-100 text-stone-600',
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
            <Tooltip
              label={`Skor ${source.relevanceScore}: +10 tiap kata kunci cocok, +15 tiap gap draft cocok, +5 open access, +3 terbit ≥2015.`}
            >
              <span className="text-xs bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full cursor-help">
                {relevanceLabel(source.relevanceScore)}
              </span>
            </Tooltip>
          )}
          {source.citationCount != null && (
            <Tooltip label="Jumlah kutipan dari database OpenAlex/Semantic Scholar — makin tinggi, makin sering dirujuk peneliti lain.">
              <span className="text-xs bg-stone-100 text-stone-700 px-2.5 py-1 rounded-full cursor-help">
                Disitasi {source.citationCount}x
              </span>
            </Tooltip>
          )}
          {source.credibility && (
            <Tooltip label="Dihitung dari jumlah sitasi, jenis publikasi, dan kebaruan tahun terbit. Bukan penilaian isi/metodologi — tetap cek sendiri sebelum dikutip.">
              <span
                className={`text-xs px-2.5 py-1 rounded-full cursor-help ${CREDIBILITY_STYLES[source.credibility]}`}
              >
                {CREDIBILITY_LABELS[source.credibility]}
              </span>
            </Tooltip>
          )}
          {source.openAccessUrl && (
            <Tooltip label="Bisa diakses/diunduh gratis, tanpa perlu langganan jurnal.">
              <span className="text-xs bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full cursor-help">
                Open Access
              </span>
            </Tooltip>
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
        <p className="text-sm leading-relaxed text-stone-700">{source.summary}</p>
      </div>

      {source.citationApa && (
        <details className="mb-4">
          <summary className="text-xs font-medium text-muted cursor-pointer hover:text-brand-600">
            Sitasi APA 7
          </summary>
          <p className="text-xs mt-2 p-3 bg-stone-50 rounded-lg leading-relaxed select-all">
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
            className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-stone-50"
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
