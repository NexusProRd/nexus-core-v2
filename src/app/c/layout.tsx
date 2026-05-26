import type { Metadata } from 'next'
import PwaRegister from '@/components/PwaRegister'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'

export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaRegister swUrl="/sw-catalogo.js" />
      <PwaInstallPrompt />
    </>
  )
}
