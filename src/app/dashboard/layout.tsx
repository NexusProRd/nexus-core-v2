// VERCEL BUILD FIX: Client component wrapper with dynamic ssr:false prevents prerender of Supabase shell
'use client'
import dynamic from 'next/dynamic'

const DashboardShell = dynamic(() => import('./DashboardShell'), { ssr: false })

export default function Layout({ children }: { children: React.ReactNode }) {
  return <DashboardShell>{children}</DashboardShell>
}
