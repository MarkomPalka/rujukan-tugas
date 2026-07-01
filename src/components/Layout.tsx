import { Outlet, Link, useLocation } from 'react-router-dom'

export default function Layout() {
  const location = useLocation()
  const isHome = location.pathname === '/'

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border bg-white/80 backdrop-blur sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-9 h-9 rounded-lg bg-brand-900 flex items-center justify-center text-white shrink-0">
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="w-5 h-5"
                aria-hidden="true"
              >
                <path d="M12 6.04A8.97 8.97 0 006 3.75c-1.05 0-2.06.18-3 .51v14.25A8.99 8.99 0 016 18c2.3 0 4.41.87 6 2.29m0-14.25a8.97 8.97 0 016-2.29c1.05 0 2.06.18 3 .51v14.25A8.99 8.99 0 0018 18a8.97 8.97 0 00-6 2.29m0-14.25v14.25" />
              </svg>
            </div>
            <div>
              <h1 className="font-semibold text-brand-900 leading-tight group-hover:text-brand-600 transition-colors">
                RefMate
              </h1>
              <p className="text-xs text-muted">Kurator bacaan akademik</p>
            </div>
          </Link>
          {!isHome && (
            <Link
              to="/"
              className="text-sm text-brand-600 hover:text-brand-700 font-medium"
            >
              ← Semua Proyek
            </Link>
          )}
        </div>
      </header>

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>

      <footer className="border-t border-border py-4 text-center text-xs text-muted">
        Data disimpan lokal di browser · Sumber dari OpenAlex & Semantic Scholar
      </footer>
    </div>
  )
}
