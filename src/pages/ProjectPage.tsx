import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { getProject, saveProject } from '../lib/db'
import {
  buildSearchQueries,
  detectGaps,
  extractKeywords,
} from '../lib/keywords'
import { createManualSource, searchAndCurate } from '../lib/searchService'
import type { Project, Source, SourceCategory, SourceStatus, WorkflowStep } from '../types'
import { CATEGORY_LABELS, WORKFLOW_STEPS } from '../types'
import SourceCard from '../components/SourceCard'
import BibliographyExport from '../components/BibliographyExport'
import WorkflowStepper from '../components/WorkflowStepper'

type Tab = 'workflow' | 'recommendations' | 'collection' | 'bibliography'

const STEP_ORDER: WorkflowStep[] = ['brief', 'direction', 'draft', 'sources']

function inferWorkflowStep(project: Project): WorkflowStep {
  if (project.workflowStep && STEP_ORDER.includes(project.workflowStep)) {
    return project.workflowStep
  }
  if (!project.brief.trim()) return 'brief'
  if (!project.direction.trim()) return 'direction'
  return 'draft'
}

function canAccessStep(project: Project, step: WorkflowStep): boolean {
  const stepIndex = STEP_ORDER.indexOf(step)
  if (stepIndex === 0) return true
  if (!project.brief.trim()) return false
  if (stepIndex >= 1 && !project.direction.trim() && step !== 'brief') {
    return step === 'direction' ? true : false
  }
  if (stepIndex >= 2 && !project.direction.trim()) return false
  return true
}

function nextStep(current: WorkflowStep): WorkflowStep | null {
  const index = STEP_ORDER.indexOf(current)
  return index < STEP_ORDER.length - 1 ? STEP_ORDER[index + 1] : null
}

function prevStep(current: WorkflowStep): WorkflowStep | null {
  const index = STEP_ORDER.indexOf(current)
  return index > 0 ? STEP_ORDER[index - 1] : null
}

export default function ProjectPage() {
  const { id } = useParams<{ id: string }>()
  const [project, setProject] = useState<Project | null>(null)
  const [workflowStep, setWorkflowStep] = useState<WorkflowStep>('brief')
  const [loading, setLoading] = useState(true)
  const [searching, setSearching] = useState(false)
  const [searchError, setSearchError] = useState<string | null>(null)
  const [tab, setTab] = useState<Tab>('workflow')
  const [saved, setSaved] = useState(false)

  const [manualTitle, setManualTitle] = useState('')
  const [manualAuthors, setManualAuthors] = useState('')
  const [manualYear, setManualYear] = useState('')
  const [manualUrl, setManualUrl] = useState('')
  const [manualDoi, setManualDoi] = useState('')

  const persist = useCallback(async (updated: Project, step?: WorkflowStep) => {
    updated.updatedAt = Date.now()
    if (step) updated.workflowStep = step
    await saveProject(updated)
    setProject(updated)
    if (step) setWorkflowStep(step)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }, [])

  useEffect(() => {
    if (!id) return
    getProject(id).then((p) => {
      if (p) {
        setProject(p)
        setWorkflowStep(inferWorkflowStep(p))
      }
      setLoading(false)
    })
  }, [id])

  function updateLocal<K extends keyof Project>(field: K, value: Project[K]) {
    if (!project) return
    setProject({ ...project, [field]: value })
  }

  async function saveCurrent(step?: WorkflowStep) {
    if (!project) return
    await persist(project, step)
  }

  async function goToStep(step: WorkflowStep) {
    if (!project || !canAccessStep(project, step)) return
    await persist(project, step)
  }

  async function goNext() {
    if (!project) return
    const next = nextStep(workflowStep)
    if (!next) return

    if (workflowStep === 'brief' && !project.brief.trim()) return
    if (workflowStep === 'direction' && !project.direction.trim()) return

    await persist(project, next)
  }

  async function goBack() {
    if (!project) return
    const prev = prevStep(workflowStep)
    if (!prev) return
    await persist(project, prev)
  }

  async function skipDraft() {
    if (!project) return
    await persist(project, 'sources')
  }

  async function handleSearch() {
    if (!project) return
    if (!project.brief.trim() || !project.direction.trim()) {
      setSearchError('Brief dan arah tulisan wajib diisi sebelum mencari rujukan.')
      return
    }

    setSearching(true)
    setSearchError(null)

    try {
      const keywords = extractKeywords(project.brief, project.direction, project.draft)
      const queries = buildSearchQueries(keywords)
      const existingSources = project.sources.filter(
        (s) => s.category === 'existing' || s.status !== 'dismissed'
      )
      const gapTerms = detectGaps(project.draft, existingSources)

      const recommendations = await searchAndCurate(
        queries,
        keywords,
        gapTerms,
        project.sources.map((s) => s.title)
      )

      const kept = project.sources.filter(
        (s) =>
          s.category === 'existing' ||
          s.status === 'used' ||
          s.status === 'to_read' ||
          s.status === 'reading'
      )

      const updated: Project = {
        ...project,
        keywords,
        lastSearchAt: Date.now(),
        workflowStep: 'sources',
        sources: [...kept, ...recommendations],
      }

      await persist(updated, 'sources')
      setTab('recommendations')
    } catch (err) {
      setSearchError(
        err instanceof Error
          ? err.message
          : 'Pencarian gagal. Periksa koneksi internet dan coba lagi.'
      )
    } finally {
      setSearching(false)
    }
  }

  function handleStatusChange(sourceId: string, status: SourceStatus) {
    if (!project) return
    const sources = project.sources.map((s) =>
      s.id === sourceId ? { ...s, status } : s
    )
    void persist({ ...project, sources })
  }

  function handleRemoveSource(sourceId: string) {
    if (!project) return
    void persist({
      ...project,
      sources: project.sources.filter((s) => s.id !== sourceId),
    })
  }

  function handleAddManual(e: React.FormEvent) {
    e.preventDefault()
    if (!project || !manualTitle.trim()) return

    const source = createManualSource({
      title: manualTitle.trim(),
      authors: manualAuthors || undefined,
      year: manualYear ? parseInt(manualYear, 10) : undefined,
      url: manualUrl || undefined,
      doi: manualDoi || undefined,
    })

    void persist({ ...project, sources: [...project.sources, source] })
    setManualTitle('')
    setManualAuthors('')
    setManualYear('')
    setManualUrl('')
    setManualDoi('')
  }

  function groupedRecommendations(sources: Source[]) {
    const groups: SourceCategory[] = [
      'gap_fill',
      'theory',
      'case_study',
      'methodology',
      'general',
    ]
    return groups
      .map((cat) => ({
        category: cat,
        items: sources.filter((s) => s.category === cat && s.status !== 'dismissed'),
      }))
      .filter((g) => g.items.length > 0)
  }

  if (loading) return <p className="text-muted">Memuat proyek...</p>
  if (!project) return <p className="text-red-600">Proyek tidak ditemukan.</p>

  const recommendations = project.sources.filter(
    (s) => s.category !== 'existing' && s.status !== 'dismissed'
  )
  const collection = project.sources.filter((s) =>
    ['to_read', 'reading', 'used'].includes(s.status)
  )
  const gaps = detectGaps(
    project.draft,
    project.sources.filter((s) => s.category === 'existing' || s.status === 'used')
  )

  const currentStepMeta = WORKFLOW_STEPS.find((s) => s.id === workflowStep)
  const canProceedFromBrief = project.brief.trim().length > 0
  const canProceedFromDirection = project.direction.trim().length > 0
  const canSearch = canProceedFromBrief && canProceedFromDirection

  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'workflow', label: 'Persiapan' },
    { id: 'recommendations', label: 'Rekomendasi', count: recommendations.length },
    { id: 'collection', label: 'Koleksi', count: collection.length },
    { id: 'bibliography', label: 'Daftar Pustaka' },
  ]

  return (
    <div>
      <header className="mb-6">
        <input
          value={project.title}
          onChange={(e) => updateLocal('title', e.target.value)}
          onBlur={() => void saveCurrent()}
          className="text-2xl font-bold text-brand-900 bg-transparent border-none w-full focus:outline-none focus:ring-0 mb-1"
          aria-label="Judul proyek"
        />
        <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
          {saved && <span className="text-emerald-600">Tersimpan</span>}
          {project.keywords.length > 0 && (
            <span>Kata kunci: {project.keywords.join(', ')}</span>
          )}
          {project.lastSearchAt && (
            <span>
              Terakhir dicari:{' '}
              {new Intl.DateTimeFormat('id-ID', {
                day: 'numeric',
                month: 'short',
                hour: '2-digit',
                minute: '2-digit',
              }).format(new Date(project.lastSearchAt))}
            </span>
          )}
        </div>
      </header>

      <nav className="flex flex-wrap gap-1 mb-6 border-b border-border pb-px">
        {tabs.map((t) => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
              tab === t.id
                ? 'bg-white border border-border border-b-white -mb-px text-brand-700'
                : 'text-muted hover:text-brand-600'
            }`}
          >
            {t.label}
            {t.count != null && t.count > 0 && (
              <span className="ml-1.5 bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full text-xs">
                {t.count}
              </span>
            )}
          </button>
        ))}
      </nav>

      {tab === 'workflow' && (
        <div>
          <WorkflowStepper
            current={workflowStep}
            onNavigate={(step) => void goToStep(step)}
            canNavigateTo={(step) => canAccessStep(project, step)}
            stepStatus={{
              sources: project.sources.some((s) => s.status === 'used')
                ? 'done'
                : project.lastSearchAt
                  ? 'partial'
                  : undefined,
            }}
          />

          <div className="bg-white border border-border rounded-xl p-6 shadow-sm">
            <div className="mb-6">
              <p className="text-xs font-medium text-brand-600 uppercase tracking-wide mb-1">
                Tahap {STEP_ORDER.indexOf(workflowStep) + 1} dari {STEP_ORDER.length}
              </p>
              <h2 className="text-xl font-semibold text-brand-900">{currentStepMeta?.label}</h2>
              <p className="text-sm text-muted mt-1">{currentStepMeta?.description}</p>
            </div>

            {workflowStep === 'brief' && (
              <div>
                <p className="text-sm text-muted mb-4">
                  Tempel instruksi dari dosen: pertanyaan, topik, batasan, dan persyaratan
                  sumber. Tahap ini wajib diisi sebelum lanjut.
                </p>
                <textarea
                  value={project.brief}
                  onChange={(e) => updateLocal('brief', e.target.value)}
                  onBlur={() => void saveCurrent()}
                  rows={8}
                  autoFocus
                  placeholder="Contoh: Tulis esai 1500 kata tentang representasi identitas budaya lokal dalam konten media digital. Gunakan minimal 5 sumber jurnal..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            )}

            {workflowStep === 'direction' && (
              <div>
                <p className="text-sm text-muted mb-4">
                  Jelaskan argumen atau sudut pandang yang ingin kamu bangun. Tahap ini wajib
                  diisi agar rekomendasi bacaan selaras dengan arah tulisanmu.
                </p>
                <textarea
                  value={project.direction}
                  onChange={(e) => updateLocal('direction', e.target.value)}
                  onBlur={() => void saveCurrent()}
                  rows={8}
                  autoFocus
                  placeholder="Contoh: Saya ingin menunjukkan bagaimana platform TikTok merekonstruksi simbol budaya tradisional menjadi konten populer yang dikonsumsi generasi muda..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
              </div>
            )}

            {workflowStep === 'draft' && (
              <div>
                <p className="text-sm text-muted mb-4">
                  Tempel draft esai atau studi kasus jika sudah ada. Tahap ini{' '}
                  <strong>opsional</strong> — kamu bisa lewati dan lanjut langsung ke pencarian
                  rujukan.
                </p>
                <textarea
                  value={project.draft}
                  onChange={(e) => updateLocal('draft', e.target.value)}
                  onBlur={() => void saveCurrent()}
                  rows={10}
                  autoFocus
                  placeholder="Tempel draft tulisanmu di sini (opsional)..."
                  className="w-full border border-border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
                />
                {gaps.length > 0 && (
                  <div className="mt-3 p-3 bg-amber-50 rounded-lg text-sm text-amber-800">
                    <strong>Gap terdeteksi:</strong> {gaps.join(', ')} — belum cukup ter-cover
                    oleh sumber yang ada.
                  </div>
                )}
              </div>
            )}

            {workflowStep === 'sources' && (
              <div className="space-y-6">
                <div className="grid sm:grid-cols-2 gap-3 text-sm">
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-brand-900 mb-1">Brief</p>
                    <p className="text-muted line-clamp-3">{project.brief || '—'}</p>
                  </div>
                  <div className="p-3 bg-slate-50 rounded-lg">
                    <p className="font-medium text-brand-900 mb-1">Arah tulisan</p>
                    <p className="text-muted line-clamp-3">{project.direction || '—'}</p>
                  </div>
                </div>

                {project.draft.trim() && (
                  <div className="p-3 bg-slate-50 rounded-lg text-sm">
                    <p className="font-medium text-brand-900 mb-1">Draft (opsional)</p>
                    <p className="text-muted line-clamp-4">{project.draft}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-1">Sumber yang Sudah Kamu Punya</h3>
                  <p className="text-sm text-muted mb-4">
                    Tambahkan bacaan manual agar tidak direkomendasikan ulang (opsional).
                  </p>
                  <form onSubmit={handleAddManual} className="grid gap-3 sm:grid-cols-2 mb-4">
                    <input
                      required
                      value={manualTitle}
                      onChange={(e) => setManualTitle(e.target.value)}
                      placeholder="Judul *"
                      className="border border-border rounded-lg px-3 py-2 text-sm sm:col-span-2"
                    />
                    <input
                      value={manualAuthors}
                      onChange={(e) => setManualAuthors(e.target.value)}
                      placeholder="Penulis (pisahkan koma)"
                      className="border border-border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      value={manualYear}
                      onChange={(e) => setManualYear(e.target.value)}
                      placeholder="Tahun"
                      type="number"
                      className="border border-border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      value={manualUrl}
                      onChange={(e) => setManualUrl(e.target.value)}
                      placeholder="URL"
                      className="border border-border rounded-lg px-3 py-2 text-sm"
                    />
                    <input
                      value={manualDoi}
                      onChange={(e) => setManualDoi(e.target.value)}
                      placeholder="DOI"
                      className="border border-border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="sm:col-span-2 text-sm bg-slate-800 text-white px-4 py-2 rounded-lg hover:bg-slate-900 w-fit"
                    >
                      + Tambah Sumber Manual
                    </button>
                  </form>

                  {project.sources.filter((s) => s.category === 'existing').length > 0 && (
                    <div className="space-y-3">
                      {project.sources
                        .filter((s) => s.category === 'existing')
                        .map((s) => (
                          <SourceCard
                            key={s.id}
                            source={s}
                            onStatusChange={handleStatusChange}
                            onRemove={handleRemoveSource}
                          />
                        ))}
                    </div>
                  )}
                </div>

                {searchError && <p className="text-sm text-red-600">{searchError}</p>}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-3 mt-8 pt-6 border-t border-border">
              <div>
                {prevStep(workflowStep) && (
                  <button
                    type="button"
                    onClick={() => void goBack()}
                    className="text-sm px-4 py-2 rounded-lg border border-border hover:bg-slate-50"
                  >
                    ← Kembali
                  </button>
                )}
              </div>

              <div className="flex flex-wrap gap-2">
                {workflowStep === 'draft' && (
                  <button
                    type="button"
                    onClick={() => void skipDraft()}
                    className="text-sm px-4 py-2 rounded-lg text-muted hover:bg-slate-100"
                  >
                    Lewati draft →
                  </button>
                )}

                {workflowStep === 'sources' ? (
                  <button
                    type="button"
                    onClick={() => void handleSearch()}
                    disabled={searching || !canSearch}
                    className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {searching ? 'Mencari rujukan...' : 'Cari Rekomendasi Bacaan'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={
                      (workflowStep === 'brief' && !canProceedFromBrief) ||
                      (workflowStep === 'direction' && !canProceedFromDirection)
                    }
                    className="bg-brand-600 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-brand-700 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Lanjut →
                  </button>
                )}
              </div>
            </div>
          </div>

          <p className="text-xs text-muted mt-4 text-center">
            Perbarui brief atau arah tulisan kapan saja dengan kembali ke tahap sebelumnya.
          </p>
        </div>
      )}

      {tab === 'recommendations' && (
        <div className="space-y-8">
          {recommendations.length === 0 ? (
            <div className="bg-white border border-dashed border-border rounded-xl p-10 text-center">
              <p className="text-muted mb-2">Belum ada rekomendasi.</p>
              <button
                onClick={() => setTab('workflow')}
                className="text-brand-600 text-sm font-medium hover:underline"
              >
                Selesaikan persiapan lalu cari bacaan →
              </button>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => {
                    setTab('workflow')
                    void goToStep('brief')
                  }}
                  className="text-sm border border-border px-3 py-1.5 rounded-lg hover:bg-slate-50"
                >
                  Perbarui brief & cari ulang
                </button>
              </div>
              {groupedRecommendations(recommendations).map(({ category, items }) => (
                <section key={category}>
                  <h3 className="font-semibold text-brand-900 mb-1">
                    {CATEGORY_LABELS[category]}
                  </h3>
                  <p className="text-sm text-muted mb-4">{items.length} sumber</p>
                  <div className="space-y-4">
                    {items.map((s) => (
                      <SourceCard
                        key={s.id}
                        source={s}
                        onStatusChange={handleStatusChange}
                        onRemove={handleRemoveSource}
                      />
                    ))}
                  </div>
                </section>
              ))}
            </>
          )}
        </div>
      )}

      {tab === 'collection' && (
        <div className="space-y-4">
          {collection.length === 0 ? (
            <div className="bg-white border border-dashed border-border rounded-xl p-10 text-center text-muted">
              Tandai rekomendasi sebagai &quot;Perlu Dibaca&quot; atau &quot;Dipakai di Esai&quot;
              untuk mengumpulkannya di sini.
            </div>
          ) : (
            collection.map((s) => (
              <SourceCard
                key={s.id}
                source={s}
                onStatusChange={handleStatusChange}
                onRemove={handleRemoveSource}
              />
            ))
          )}
        </div>
      )}

      {tab === 'bibliography' && <BibliographyExport sources={project.sources} />}
    </div>
  )
}
