import type { Metadata } from 'next'
import PwaRegister from '@/components/PwaRegister'
import PwaInstallPrompt from '@/components/PwaInstallPrompt'
import InstallAppButton from '@/components/InstallAppButton'
import { createPublicClient } from '@/lib/supabase/public'

export async function generateMetadata({ params }: { params: Promise<{ id_tienda: string }> }): Promise<Metadata> {
  const { id_tienda } = await params
  return {
    manifest: `/api/manifest/catalogo/${id_tienda}`,
  }
}

export default async function CatalogoLayout({ children, params }: { children: React.ReactNode; params: Promise<{ id_tienda: string }> }) {
  const { id_tienda } = await params

  let logoUrl: string | null = null
  try {
    const supabase = createPublicClient()
    const { data } = await supabase
      .from('perfil_tienda')
      .select('logo_url')
      .eq('id_tienda', id_tienda)
      .maybeSingle()
    if (data?.logo_url) logoUrl = data.logo_url
  } catch {}

  return (
    <>
      {children}
      <PwaRegister swUrl="/sw-catalogo.js" logoUrl={logoUrl} />
      <PwaInstallPrompt />
      <InstallAppButton />
    </>
  )
}
