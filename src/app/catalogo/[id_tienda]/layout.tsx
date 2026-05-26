import type { Metadata } from 'next'
import PwaRegister from '@/components/PwaRegister'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'

export async function generateMetadata({ params }: { params: Promise<{ id_tienda: string }> }): Promise<Metadata> {
  const { id_tienda } = await params
  return {
    manifest: `/api/manifest/catalogo/${id_tienda}`,
  }
}

export default function CatalogoLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <PwaRegister swUrl="/sw-catalogo.js" />
      <PwaInstallPrompt />
    </>
  )
}
