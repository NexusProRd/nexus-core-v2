'use client'

import { useState } from 'react'

export default function QrButton({ url }: { url: string }) {
  const [open, setOpen] = useState(false)
  const qrSrc = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}`

  return (
    <>
      <button onClick={() => setOpen(true)}
        className="w-full bg-white rounded-2xl border border-slate-200 dark:border-slate-800 p-4 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 text-left flex items-center gap-3">
        <div className="w-9 h-9 rounded-xl bg-indigo-50 flex items-center justify-center shrink-0">
          <svg className="w-4.5 h-4.5 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm12 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 20h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-900">Generar QR</p>
          <p className="text-xs text-slate-400">Comparte tu catálogo</p>
        </div>
      </button>

      {open && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setOpen(false)}>
          <div className="bg-white rounded-2xl shadow-xl max-w-xs w-full p-6 text-center" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-bold text-slate-900">Código QR</h3>
              <button onClick={() => setOpen(false)} className="p-1 text-slate-400 hover:text-slate-600">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <img src={qrSrc} alt="QR del catálogo" className="w-48 h-48 mx-auto rounded-xl border border-slate-200" />
            <p className="text-xs text-slate-500 mt-4 break-all">{url}</p>
            <a href={qrSrc} target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 mt-4 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-xl hover:brightness-110 transition-colors">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Descargar QR
            </a>
          </div>
        </div>
      )}
    </>
  )
}