'use client'

import { createPortal } from 'react-dom'

interface ProductoModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export default function ProductoModal({ open, title, onClose, children }: ProductoModalProps) {
  if (!open) return null

  const portalRoot = typeof document !== 'undefined' ? document.body : null
  if (!portalRoot) return null

  return createPortal(
    <div
      className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white dark:bg-slate-800/95 rounded-2xl shadow-xl max-w-lg w-full max-h-[85vh] sm:max-h-[90vh] overflow-y-auto overscroll-contain p-5 sm:p-6"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>,
    portalRoot
  )
}
