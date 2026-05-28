'use client'

import Link from 'next/link'

interface EmptyStateProps {
  icon?: React.ReactNode
  title: string
  description?: string
  action?: {
    label: string
    href?: string
    onClick?: () => void
  }
  compact?: boolean
}

export default function EmptyState({ icon, title, description, action, compact }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center text-center ${compact ? 'py-8' : 'py-16'} px-4`}>
      {icon ? (
        <div className="mb-4 text-slate-300 dark:text-slate-600">{icon}</div>
      ) : (
        <div className="w-14 h-14 mb-4 rounded-full bg-slate-100 dark:bg-slate-800/60 flex items-center justify-center">
          <svg className="w-7 h-7 text-slate-400 dark:text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
          </svg>
        </div>
      )}
      <h3 className={`font-semibold text-slate-800 dark:text-slate-200 ${compact ? 'text-sm' : 'text-base'}`}>{title}</h3>
      {description && (
        <p className={`mt-1 text-slate-500 dark:text-slate-400 max-w-xs ${compact ? 'text-xs' : 'text-sm'}`}>{description}</p>
      )}
      {action && (
        action.href ? (
          <Link href={action.href}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all press-scale-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {action.label}
          </Link>
        ) : (
          <button onClick={action.onClick}
            className="mt-4 inline-flex items-center gap-1.5 px-4 py-2 bg-[var(--primary)] text-white text-sm font-medium rounded-xl hover:opacity-90 transition-all press-scale-sm"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
            {action.label}
          </button>
        )
      )}
    </div>
  )
}
