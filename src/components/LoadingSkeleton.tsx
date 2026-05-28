'use client'

/* MOTION SYSTEM PASS: Skeleton with shimmer overlay instead of pulse fade */

function ShimmerBlock({ className = '' }: { className?: string }) {
  return <div className={`skeleton-shimmer ${className}`} />
}

export function CardSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50 p-5 space-y-3 skeleton-shimmer">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-3/4" />
          <div className="h-8 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        </div>
      ))}
    </div>
  )
}

export function TableSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="space-y-2">
      <div className="flex gap-4 p-3">
        <ShimmerBlock className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        <ShimmerBlock className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
        <ShimmerBlock className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
        <ShimmerBlock className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="flex gap-4 p-4 bg-white dark:bg-slate-800/40 rounded-lg border border-slate-200 dark:border-slate-700/50 skeleton-shimmer">
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/4" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
          <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-1/6" />
        </div>
      ))}
    </div>
  )
}

export function ListSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 flex items-center gap-3 skeleton-shimmer">
          <div className="w-12 h-12 rounded-lg bg-slate-200 dark:bg-slate-700 shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="h-4 bg-slate-200 dark:bg-slate-700 rounded w-2/3" />
            <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
          </div>
        </div>
      ))}
    </div>
  )
}

export function StatCardSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="bg-white dark:bg-slate-800/40 rounded-xl border border-slate-200 dark:border-slate-700/50 p-4 space-y-2 skeleton-shimmer">
          <div className="h-3 bg-slate-200 dark:bg-slate-700 rounded w-1/2" />
          <div className="h-6 bg-slate-200 dark:bg-slate-700 rounded w-1/3" />
        </div>
      ))}
    </div>
  )
}

export function Spinner({ className = '' }: { className?: string }) {
  return (
    <svg className={`animate-spin h-5 w-5 text-slate-400 ${className}`} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
    </svg>
  )
}

export function PageSkeleton() {
  return (
    <div className="space-y-6 p-4 sm:p-6">
      <div className="h-7 bg-slate-200 dark:bg-slate-700 rounded w-1/3 skeleton-shimmer" />
      <StatCardSkeleton />
      <CardSkeleton count={2} />
    </div>
  )
}
