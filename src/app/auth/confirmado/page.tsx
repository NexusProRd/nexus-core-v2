'use client'

import Link from 'next/link'

export default function ConfirmadoPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 to-blue-50 px-4">
      <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 max-w-lg w-full p-8 sm:p-10 text-center">
        <div className="w-16 h-16 mx-auto mb-5 rounded-full bg-emerald-50 flex items-center justify-center">
          <svg className="w-8 h-8 text-emerald-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-800 mb-3">
          ¡Registro Exitoso!
        </h1>

        <p className="text-slate-500 leading-relaxed mb-8">
          Tu cuenta ha sido creada correctamente. El siguiente paso es configurar la identidad operativa de tu negocio para activar tu catálogo digital.
        </p>

        <Link
          href="/onboarding"
          className="inline-flex items-center justify-center w-full sm:w-auto px-8 py-3.5 bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold text-base rounded-2xl hover:brightness-110 transition-all shadow-lg shadow-teal-500/25"
        >
          Configurar mi Tienda Ahora
        </Link>
      </div>
    </div>
  )
}
