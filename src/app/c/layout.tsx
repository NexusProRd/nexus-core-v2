import type { Metadata } from 'next'
import PwaRegister from '@/components/PwaRegister'
import InstallAppButton from '@/components/InstallAppButton'

export default function CLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaRegister swUrl="/catalogo/sw.js" scope="/catalogo/" />
      <InstallAppButton />
    </>
  )
}
