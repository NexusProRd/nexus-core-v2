'use client'

export default function PushSubscribeButton({ pushState }: { pushState: {
  isSupported: boolean
  isLoading: boolean
  isSubscribed: boolean
  subscribe: () => Promise<void>
  unsubscribe: () => Promise<void>
} }) {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator) || !('PushManager' in window)) {
    return null
  }

  if (!pushState.isSupported) return null

  return (
    <button
      onClick={pushState.isSubscribed ? pushState.unsubscribe : pushState.subscribe}
      disabled={pushState.isLoading}
      className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 border border-transparent transition-all duration-200 disabled:opacity-50"
    >
      <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-slate-100 dark:bg-slate-700 text-slate-400 dark:text-slate-500">
        <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
      </div>
      {pushState.isLoading ? '...' : pushState.isSubscribed ? 'Notificaciones ON' : 'Notificaciones OFF'}
    </button>
  )
}
