import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import StoreProvider from '@/components/store/StoreProvider'
import CatalogContent from '@/components/store/CatalogContent'
import { getPerfilTienda } from '@/lib/perfil-tienda'
import { resolveOgImage, storeDescription } from '@/lib/og-images'
import type { TallaVariant } from '@/types/database'

interface PageProps {
  params: Promise<{ slug: string }>
}

interface Producto {
  id: string
  nombre: string
  descripcion: string | null
  precio: number
  precio_oferta: number | null
  stock: number
  in_stock: boolean
  imagen_url: string | null
  tallas?: (string | TallaVariant)[]
  tipo_articulo?: string | null
  unidad_medida?: string | null
  slug?: string | null
  aplica_impuesto?: boolean | null
  porcentaje_impuesto?: number | null
}

interface Tienda {
  nombre_tienda: string
  moneda_simbolo: string
  currency_code: string
  tipo_negocio: string
  direccion: string | null
  whatsapp_num: string | null
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const supabase = createPublicClient()

  const { slug } = await params
  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda')
    .eq('slug', slug)
    .maybeSingle()

  if (!tienda) return { title: 'Tienda no encontrada' }

  const perfil = await getPerfilTienda(tienda.id)
  const nombre = perfil?.nombre_comercial || tienda.nombre_tienda
  const ogImage = resolveOgImage(perfil)

  return {
    title: nombre,
    manifest: `/api/manifest/catalogo/${tienda.id}`,
    alternates: { canonical: `/c/${slug}` },
    openGraph: {
      title: nombre,
      description: storeDescription(perfil, nombre),
      siteName: 'Nexus',
      images: [{ url: ogImage }],
    },
    twitter: {
      card: 'summary_large_image',
      title: nombre,
      description: storeDescription(perfil, nombre),
      images: [{ url: ogImage }],
    },
  }
}

export default async function CatalogoSlugPage({ params }: PageProps) {
  const supabase = createPublicClient()

  const { slug } = await params

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, moneda_simbolo, currency_code, tipo_negocio, direccion, whatsapp_num, tienda_abierta')
    .eq('slug', slug)
    .maybeSingle()

  if (!tienda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8 max-w-md">
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-gray-100">
            <svg className="h-7 w-7 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-sm text-slate-500 mb-6">El enlace que buscas no es válido o la tienda ya no está disponible.</p>
          <a href="/" className="inline-block px-6 py-3 bg-slate-800 text-white font-semibold rounded-xl hover:bg-slate-700 transition-colors">
            Volver al inicio
          </a>
        </div>
      </div>
    )
  }
  if (!tienda.tienda_abierta) redirect('/catalogo/cerrado')

  const id_tienda = tienda.id

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('*')
    .eq('id_tienda', id_tienda)
    .maybeSingle()

  const tiendaBase: Tienda = {
    nombre_tienda: tienda.nombre_tienda,
    moneda_simbolo: tienda.moneda_simbolo,
    currency_code: tienda.currency_code,
    tipo_negocio: tienda.tipo_negocio || 'estandar',
    direccion: tienda.direccion,
    whatsapp_num: tienda.whatsapp_num,
  }

  const { data: productosRaw } = await supabase
    .from('productos')
    .select('*')
    .eq('id_tienda', id_tienda)

  const productos: Producto[] = (productosRaw || []).map(p => ({
    ...p,
    tallas: Array.isArray(p.tallas) && p.tallas.length > 0 && typeof p.tallas[0] === 'object'
      ? p.tallas.map((t: any) => ({
          talla: t.talla,
          stock: t.stock ?? 0,
          precio: t.precio ?? null,
        }))
      : p.tallas,
  }))

  return (
    <StoreProvider
      idTienda={id_tienda}
      perfil={perfil}
      tiendaBase={tiendaBase}
      tipoNegocio={tienda.tipo_negocio || 'estandar'}
    >
      <CatalogContent
        id_tienda={id_tienda}
        productos={productos || []}
        openCart={false}
      />
    </StoreProvider>
  )
}
