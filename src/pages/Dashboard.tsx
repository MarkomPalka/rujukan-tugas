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

export default function Dashboard() {
  const [projects, setProjects] = useState<Project[]>([])
  const [loading, setLoading] = useState(true)
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)

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

  return (
    <div>
      <section className="mb-10">
        <h2 className="text-2xl font-bold text-brand-900 mb-2">
          Proyek Tugas Kuliah
        </h2>
        <p className="text-muted max-w-2xl">
          Buat proyek per tugas, isi brief atau draft, lalu dapatkan rekomendasi
          bacaan terkurasi untuk esai dan studi kasus Kajian Budaya dan Media.
        </p>
      </section>

      <section className="mb-8">
        {!creating ? (
          <button
            onClick={() => setCreating(true)}
            className="inline-flex items-center gap-2 bg-brand-600 text-white px-5 py-2.5 rounded-lg font-medium hover:bg-brand-700 transition-colors shadow-sm"
          >
            + Proyek Baru
          </button>
        ) : (
          <form
            onSubmit={handleCreate}
            className="bg-white border border-border rounded-xl p-5 shadow-sm max-w-lg"
          >
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
                className="px-4 py-2 rounded-lg text-sm text-muted hover:bg-slate-100"
              >
                Batal
              </button>
            </div>
          </form>
        )}
      </section>

      {loading ? (
        <p className="text-muted">Memuat proyek...</p>
      ) : projects.length === 0 ? (
        <div className="bg-white border border-dashed border-border rounded-xl p-10 text-center">
          <p className="text-muted mb-1">Belum ada proyek.</p>
          <p className="text-sm text-muted">
            Klik &quot;Proyek Baru&quot; untuk mulai mengkurasi bacaan tugasmu.
          </p>
        </div>
      ) : (
        <div className="grid gap-4">
          {projects.map((project) => (
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
                      <span className="bg-slate-100 text-slate-600 px-2.5 py-1 rounded-full">
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
  )
}
