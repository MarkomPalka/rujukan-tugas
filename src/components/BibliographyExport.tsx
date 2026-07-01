import { useState } from 'react'
import type { Source } from '../types'
import { formatBibliography } from '../lib/apaCitation'

interface Props {
  sources: Source[]
}

export default function BibliographyExport({ sources }: Props) {
  const [copied, setCopied] = useState(false)
  const usedSources = sources.filter((s) => s.status === 'used' || s.status === 'to_read' || s.status === 'reading')
  const bibliography = formatBibliography(usedSources)

  async function copyToClipboard() {
    await navigator.clipboard.writeText(bibliography)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function downloadTxt() {
    const blob = new Blob([bibliography], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'daftar-pustaka.txt'
    a.click()
    URL.revokeObjectURL(url)
  }

  if (usedSources.length === 0) {
    return (
      <div className="bg-white border border-border rounded-xl p-5 text-sm text-muted">
        Tandai bacaan sebagai &quot;Dipakai di Esai&quot; atau &quot;Perlu Dibaca&quot; untuk
        mengekspor daftar pustaka.
      </div>
    )
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div>
          <h3 className="font-semibold text-brand-900">Daftar Pustaka (APA 7)</h3>
          <p className="text-sm text-muted">{usedSources.length} sumber</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={copyToClipboard}
            className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-stone-50"
          >
            {copied ? 'Tersalin!' : 'Salin'}
          </button>
          <button
            onClick={downloadTxt}
            className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
          >
            Unduh .txt
          </button>
        </div>
      </div>
      <pre className="text-xs leading-relaxed whitespace-pre-wrap bg-stone-50 rounded-lg p-4 max-h-64 overflow-y-auto">
        {bibliography}
      </pre>
    </div>
  )
}
