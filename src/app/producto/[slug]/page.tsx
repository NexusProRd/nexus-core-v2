import { redirect } from 'next/navigation'
import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'

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
  return {
    title: `${producto.nombre} | Nexus`,
    description: producto.descripcion || '',
    openGraph: producto.imagen_url ? { images: [{ url: producto.imagen_url }] } : undefined,
  }
}

export default async function ProductoRedirect({ params }: PageProps) {
  const { slug } = await params
  const producto = await fetchProducto(slug)
  if (!producto) redirect('/')

  redirect(`/catalogo/${producto.id_tienda}/producto/${producto.slug || producto.id}`)
}
