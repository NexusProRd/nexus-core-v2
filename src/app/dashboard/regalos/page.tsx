'use client'

import Link from 'next/link'

// DYNAMIC DASHBOARD FIX: Prevent static prerender — requires runtime Supabase session
export const dynamic = 'force-dynamic'

export default function RegalosPage() {
  return (
    <div className="min-h-screen">
      <header className="bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 border-b border-white/[0.08]">
        <div className="max-w-7xl mx-auto py-6 sm:py-8 px-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/15 flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-white">Regalos y Cupones</h1>
              <p className="text-sm text-white/70 mt-0.5">Gestión de regalos — Próximamente</p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto py-4 sm:py-6 px-3 sm:px-6 lg:px-8">
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-2xl bg-gradient-to-br from-violet-100 to-pink-100 flex items-center justify-center">
            <svg className="w-10 h-10 text-violet-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h2 className="text-xl font-bold text-slate-900 mb-2">Próximamente</h2>
          <p className="text-sm text-slate-500 mb-6 max-w-md mx-auto leading-relaxed">
            Estamos rediseñando la experiencia de regalos para ofrecerte algo mucho más completo.
            <br />
            <span className="font-medium text-slate-700">Regalos V2</span> incluirá seguimiento en tiempo real, notificaciones automatizadas y un panel rediseñado.
          </p>
          <Link
            href="/dashboard"
            className="inline-flex items-center gap-2 px-6 py-2.5 bg-[var(--primary)] text-white text-sm font-semibold rounded-xl hover:brightness-110 transition-all"
          >
            Volver al Dashboard
          </Link>
        </div>
      </main>
    </div>
  )
}
