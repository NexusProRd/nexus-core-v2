import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import StoreProvider from '@/components/store/StoreProvider'
import ProductDetailClient from './ProductDetailClient'
import { getPerfilTienda } from '@/lib/perfil-tienda'
import { resolveOgImage } from '@/lib/og-images'

interface PageProps {
  params: Promise<{ id_tienda: string; producto_slug: string }>
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { id_tienda, producto_slug } = await params
  const supabase = createPublicClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('nombre_tienda')
    .eq('id', id_tienda)
    .maybeSingle()
  if (!tienda) return { title: 'Producto no encontrado' }

  const perfil = await getPerfilTienda(id_tienda)

  const { data: productoPorSlug } = await supabase
    .from('productos')
    .select('nombre, descripcion, imagen_url')
    .eq('slug', producto_slug)
    .eq('id_tienda', id_tienda)
    .maybeSingle()
  if (productoPorSlug) {
    const ogImage = resolveOgImage(perfil, productoPorSlug.imagen_url)
    return {
      title: `${productoPorSlug.nombre} | ${tienda.nombre_tienda}`,
      description: productoPorSlug.descripcion || '',
      icons: { icon: perfil?.logo_url || '/favicon.svg' },
      openGraph: { images: [{ url: ogImage }], siteName: 'Nexus' },
      twitter: { card: 'summary_large_image', images: [{ url: ogImage }] },
      alternates: { canonical: `/catalogo/${id_tienda}/producto/${producto_slug}` },
    }
  }

  const { data: productoPorId } = await supabase
    .from('productos')
    .select('nombre, descripcion, imagen_url')
    .eq('id', producto_slug)
    .eq('id_tienda', id_tienda)
    .maybeSingle()

  if (!productoPorId) return { title: 'Producto no encontrado' }

  const ogImage = resolveOgImage(perfil, productoPorId.imagen_url)
  return {
    title: `${productoPorId.nombre} | ${tienda.nombre_tienda}`,
    description: productoPorId.descripcion || '',
    icons: { icon: perfil?.logo_url || '/favicon.svg' },
    openGraph: { images: [{ url: ogImage }], siteName: 'Nexus' },
    twitter: { card: 'summary_large_image', images: [{ url: ogImage }] },
    alternates: { canonical: `/catalogo/${id_tienda}/producto/${producto_slug}` },
  }
}

async function fetchTienda(supabase: any, id: string) {
  const { data } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, moneda_simbolo, currency_code, tipo_negocio, whatsapp_num')
    .eq('id', id)
    .maybeSingle()
  return data || null
}

async function fetchProducto(supabase: any, slug: string, idTienda: string) {
  const { data: porSlug } = await supabase
    .from('productos')
    .select('*')
    .eq('slug', slug)
    .eq('id_tienda', idTienda)
    .maybeSingle()
  if (porSlug) return porSlug

  const { data: porId } = await supabase
    .from('productos')
    .select('*')
    .eq('id', slug)
    .eq('id_tienda', idTienda)
    .maybeSingle()
  return porId || null
}

export default async function ProductoCatalogoPage({ params }: PageProps) {
  const { id_tienda, producto_slug } = await params
  const supabase = createPublicClient()

  const tienda = await fetchTienda(supabase, id_tienda)
  if (!tienda) notFound()

  const producto = await fetchProducto(supabase, producto_slug, tienda.id)
  if (!producto) notFound()

  const tallas = Array.isArray(producto.tallas) && producto.tallas.length > 0 && typeof producto.tallas[0] === 'object'
    ? producto.tallas.map((t: any) => ({ talla: t.talla, stock: t.stock ?? 0, precio: t.precio ?? null }))
    : producto.tallas

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('*')
    .eq('id_tienda', tienda.id)
    .maybeSingle()

  const { data: sugeridosRaw } = await supabase
    .from('productos')
    .select('*')
    .eq('id_tienda', tienda.id)
    .neq('id', producto.id)
    .limit(8)

  const sugeridos = (sugeridosRaw || []).map((p: any) => ({
    ...p,
    tallas: Array.isArray(p.tallas) && p.tallas.length > 0 && typeof p.tallas[0] === 'object'
      ? p.tallas.map((t: any) => ({ talla: t.talla, stock: t.stock ?? 0, precio: t.precio ?? null }))
      : p.tallas,
  }))

  return (
    <StoreProvider
      idTienda={id_tienda}
      perfil={perfil}
      tiendaBase={{ nombre_tienda: tienda.nombre_tienda, moneda_simbolo: tienda.moneda_simbolo, currency_code: tienda.currency_code }}
      tipoNegocio={tienda.tipo_negocio || 'estandar'}
    >
      <ProductDetailClient
        producto={{ ...producto, tallas }}
        tienda={tienda}
        perfil={perfil}
        tiendaSlug={id_tienda}
        sugeridos={sugeridos}
      />
    </StoreProvider>
  )
}
