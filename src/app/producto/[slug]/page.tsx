import { redirect } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'
import { getPerfilTienda } from '@/lib/perfil-tienda'
import { resolveOgImage } from '@/lib/og-images'

interface PageProps {
  params: Promise<{ slug: string }>
}

async function fetchProducto(slug: string) {
  const supabase = createPublicClient()
  const { data: porSlug } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, imagen_url, id_tienda, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (porSlug) return porSlug
  const { data: porId } = await supabase
    .from('productos')
    .select('id, nombre, descripcion, imagen_url, id_tienda, slug')
    .eq('id', slug)
    .maybeSingle()
  return porId || null
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params
  const producto = await fetchProducto(slug)
  if (!producto) return { title: 'Producto no encontrado' }

  const perfil = await getPerfilTienda(producto.id_tienda)
  const ogImage = resolveOgImage(perfil, producto.imagen_url)

  return {
    title: `${producto.nombre} | Nexus`,
    description: producto.descripcion || '',
    openGraph: { images: [{ url: ogImage }], siteName: 'Nexus' },
    twitter: { card: 'summary_large_image', images: [{ url: ogImage }] },
  }
}

export default async function ProductoRedirect({ params }: PageProps) {
  const { slug } = await params
  const producto = await fetchProducto(slug)
  if (!producto) redirect('/')

  redirect(`/catalogo/${producto.id_tienda}/producto/${producto.slug || producto.id}`)
}
