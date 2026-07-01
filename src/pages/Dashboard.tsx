import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { createId, deleteProject, getAllProjects, saveProject } from '../lib/db'
import type { Project } from '../types'

function formatDate(ts: number) {
  return new Intl.DateTimeFormat('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(ts))
}

function isFinished(p: Project) {
  return p.sources.some((s) => s.status === 'used')
}

function getGreeting() {
  const hour = new Date().getHours()
  if (hour < 11) return 'Selamat pagi'
  if (hour < 15) return 'Selamat siang'
  if (hour < 19) return 'Selamat sore'
  return 'Selamat malam'
}

const SCHOLARLY_QUOTES: { quote: string; author: string }[] = [
  {
    quote:
      'Semakin banyak kau membaca, semakin banyak yang kau ketahui. Semakin banyak kau belajar, semakin banyak tempat yang bisa kau tuju.',
    author: 'Dr. Seuss',
  },
  { quote: 'Menulis adalah berpikir di atas kertas.', author: 'William Zinsser' },
  {
    quote: 'Buku adalah sahabat yang paling tenang dan paling setia.',
    author: 'Charles W. Eliot',
  },
  { quote: 'Pengetahuan adalah kekuatan.', author: 'Francis Bacon' },
  {
    quote: 'Aku menulis semata untuk mengetahui apa yang sedang kupikirkan.',
    author: 'Joan Didion',
  },
  {
    quote: 'Semakin banyak aku belajar, semakin aku sadar betapa banyak yang belum kuketahui.',
    author: 'Albert Einstein',
  },
  {
    quote: 'Ruangan tanpa buku ibarat tubuh tanpa jiwa.',
    author: 'Marcus Tullius Cicero',
  },
]

type Tab = 'ongoing' | 'finished'

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [tab, setTab] = useState<Tab>('ongoing')
  const [{ quote, author }] = useState(
    () => SCHOLARLY_QUOTES[Math.floor(Math.random() * SCHOLARLY_QUOTES.length)]
  )

  useEffect(() => {
    getAllProjects().then(setProjects).finally(() => setLoading(false))
  }, [])

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault()
    if (!newTitle.trim()) return

    const now = Date.now()
    const project: Project = {
      id: createId(),
      title: newTitle.trim(),
      brief: '',
      direction: '',
      draft: '',
      keywords: [],
      createdAt: now,
      updatedAt: now,
      sources: [],
    }

    await saveProject(project)
    setProjects((prev) => [project, ...prev])
    setNewTitle('')
    setCreating(false)
  }

  async function handleDelete(id: string) {
    if (!confirm('Hapus proyek ini? Data tidak bisa dikembalikan.')) return
    await deleteProject(id)
    setProjects((prev) => prev.filter((p) => p.id !== id))
  }

  const usedCount = (p: Project) =>
    p.sources.filter((s) => s.status === 'used').length

  const toReadCount = (p: Project) =>
    p.sources.filter((s) => ['to_read', 'reading', 'recommended'].includes(s.status)).length

  const ongoingProjects = projects.filter((p) => !isFinished(p))
  const finishedProjects = projects.filter(isFinished)
  const visibleProjects = tab === 'ongoing' ? ongoingProjects : finishedProjects

  return (
    <div>
      {/* Bagian 1: sapaan, kutipan, dan mulai penugasan baru */}
      <section className="text-center max-w-2xl mx-auto pt-6 pb-14">
        <p className="text-sm font-medium text-brand-600 mb-4">{getGreeting()}.</p>
        <blockquote>
          <p className="text-3xl sm:text-4xl font-serif italic text-brand-900 leading-tight text-balance">
            &ldquo;{quote}&rdquo;
          </p>
          <footer className="text-sm text-muted mt-3">— {author}</footer>
        </blockquote>

        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm mt-8"
          >
            + Mulai Penugasan Baru
          </button>
        ) : (
          <form onSubmit={handleCreate} className="max-w-lg mx-auto mt-8 text-left">
            <label className="block text-sm font-medium mb-2">
              Judul / nama tugas
            </label>
            <input
              autoFocus
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Contoh: Esai Representasi Budaya di Media Digital"
              className="w-full border border-border rounded-lg px-3 py-2 mb-4 focus:outline-none focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="bg-brand-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-brand-700"
              >
                Buat Proyek
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreating(false)
                  setNewTitle('')
                }}
                className="px-4 py-2 rounded-lg text-sm text-muted hover:bg-stone-100"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </section>

      {/* Bagian 2: tugas berjalan & menu utama lainnya */}
      <section>
        <h2 className="text-lg font-semibold text-brand-900 mb-4">Tugas Kamu</h2>

        {loading ? (
          <p className="text-muted">Memuat proyek...</p>
        ) : projects.length === 0 ? (
          <div className="bg-white border border-dashed border-border rounded-xl p-10 text-center">
            <p className="text-muted mb-1">Belum ada proyek.</p>
            <p className="text-sm text-muted">
              Klik &quot;Mulai Penugasan Baru&quot; untuk mulai mengkurasi bacaan tugasmu.
            </p>
          </div>
        ) : (
          <div>
            <nav className="flex gap-1 mb-5 border-b border-border pb-px">
            <button
              onClick={() => setTab('ongoing')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === 'ongoing'
                  ? 'bg-white border border-border border-b-white -mb-px text-brand-700'
                  : 'text-muted hover:text-brand-600'
              }`}
            >
              Sedang Berjalan
              {ongoingProjects.length > 0 && (
                <span className="ml-1.5 bg-brand-100 text-brand-700 px-1.5 py-0.5 rounded-full text-xs">
                  {ongoingProjects.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setTab('finished')}
              className={`px-4 py-2 text-sm font-medium rounded-t-lg transition-colors ${
                tab === 'finished'
                  ? 'bg-white border border-border border-b-white -mb-px text-brand-700'
                  : 'text-muted hover:text-brand-600'
              }`}
            >
              Selesai
              {finishedProjects.length > 0 && (
                <span className="ml-1.5 bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded-full text-xs">
                  {finishedProjects.length}
                </span>
              )}
            </button>
          </nav>

          {visibleProjects.length === 0 ? (
            <div className="bg-white border border-dashed border-border rounded-xl p-10 text-center">
              <p className="text-muted mb-1">
                {tab === 'ongoing'
                  ? 'Tidak ada tugas yang sedang berjalan.'
                  : 'Belum ada tugas yang selesai.'}
              </p>
              <p className="text-sm text-muted">
                {tab === 'ongoing'
                  ? 'Klik "Mulai Penugasan Baru" untuk mulai mengkurasi bacaan tugasmu.'
                  : 'Tandai sumber sebagai "Dipakai di Esai" agar proyek pindah ke sini.'}
              </p>
            </div>
          ) : (
            <div className="grid gap-4">
              {visibleProjects.map((project) => (
            <article
              key={project.id}
              className="bg-white border border-border rounded-xl p-5 shadow-sm hover:border-brand-100 hover:shadow-md transition-all"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <Link
                    to={`/project/${project.id}`}
                    className="text-lg font-semibold text-brand-900 hover:text-brand-600 block truncate"
                  >
                    {project.title}
                  </Link>
                  <p className="text-sm text-muted mt-1">
                    Diperbarui {formatDate(project.updatedAt)}
                  </p>
                  <div className="flex flex-wrap gap-3 mt-3 text-xs">
                    <span className="bg-brand-50 text-brand-700 px-2.5 py-1 rounded-full">
                      {toReadCount(project)} bacaan aktif
                    </span>
                    <span className="bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-full">
                      {usedCount(project)} dipakai di esai
                    </span>
                    {project.keywords.length > 0 && (
                      <span className="bg-stone-100 text-stone-600 px-2.5 py-1 rounded-full">
                        {project.keywords.slice(0, 3).join(', ')}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Link
                    to={`/project/${project.id}`}
                    className="text-sm bg-brand-600 text-white px-3 py-1.5 rounded-lg hover:bg-brand-700"
                  >
                    Buka
                  </Link>
                  <button
                    onClick={() => handleDelete(project.id)}
                    className="text-sm text-red-600 px-3 py-1.5 rounded-lg hover:bg-red-50"
                  >
                    Hapus
                  </button>
                </div>
              </div>
            </article>
              ))}
            </div>
          )}
          </div>
        )}
      </section>
    </div>
  )
}
