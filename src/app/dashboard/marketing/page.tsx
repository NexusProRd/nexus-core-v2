// UX EVOLUTION — Marketing placeholder
'use client'

// DYNAMIC DASHBOARD FIX: Prevent static prerender — requires runtime Supabase session
export const dynamic = 'force-dynamic'

export default function MarketingPage() {
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-10 space-y-6">
      {/* Header */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-white/70 dark:bg-slate-800/70 backdrop-blur-xl border border-white/20 dark:border-slate-700/30 shadow-lg shadow-slate-200/50 dark:shadow-slate-900/30 p-5 sm:p-7">
        <div className="absolute -top-10 -right-10 w-40 h-40 rounded-full bg-rose-500/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-10 -left-10 w-40 h-40 rounded-full bg-amber-400/5 blur-3xl pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shrink-0">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" /></svg>
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white">Marketing</h1>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5">Herramientas para promocionar y hacer crecer tu negocio</p>
          </div>
        </div>
      </div>

      {/* Cards grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white shadow-sm mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 3.055A9.001 9.001 0 1020.945 13H11V3.055z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20.488 9H15V3.512A9.025 9.025 0 0120.488 9z" /></svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Analíticas Avanzadas</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Métricas detalladas de ventas, productos más vendidos y rendimiento de tu catálogo.</p>
          <a href="/dashboard/analiticas" className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-blue-600 dark:text-blue-400 hover:text-blue-700 transition-colors">
            Ver Analíticas
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-500 flex items-center justify-center text-white shadow-sm mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" /></svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Cupones y Descuentos</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Crea y gestiona cupones de descuento para impulsar tus ventas.</p>
          <a href="/dashboard/cupones" className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 transition-colors">
            Ver Cupones
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-sm mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Programa de Regalos</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Gestión de regalos empresariales y tickets de experiencia.</p>
          <a href="/dashboard/regalos" className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-purple-600 dark:text-purple-400 hover:text-purple-700 transition-colors">
            Ver Regalos
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>

        <div className="rounded-2xl bg-white dark:bg-slate-800/40 border border-slate-200 dark:border-slate-700 p-5 sm:p-6 hover:shadow-md transition-shadow">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center text-white shadow-sm mb-4">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" /></svg>
          </div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Vitrina Promocional</h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">Diseña modales promocionales y banners para tu tienda.</p>
          <a href="/dashboard/vitrina" className="inline-flex items-center gap-1 mt-4 text-xs font-bold text-amber-600 dark:text-amber-400 hover:text-amber-700 transition-colors">
            Ir a Vitrina
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" /></svg>
          </a>
        </div>
      </div>

      {/* Coming soon section */}
      <div className="rounded-2xl bg-white/50 dark:bg-slate-800/20 border border-dashed border-slate-200 dark:border-slate-700 p-6 sm:p-8 text-center">
        <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-gradient-to-br from-rose-100 to-amber-100 dark:from-rose-900/20 dark:to-amber-900/20 flex items-center justify-center">
          <svg className="w-6 h-6 text-rose-500 dark:text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
        </div>
        <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Más Herramientas Marketing</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400 max-w-md mx-auto">
          Estamos trabajando en campañas automatizadas, embudos de ventas e integraciones con redes sociales. Próximamente.
        </p>
        <span className="inline-block mt-3 text-[11px] font-semibold text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 px-3 py-1 rounded-full">Próximamente</span>
      </div>
    </div>
  )
}
