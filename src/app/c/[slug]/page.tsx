import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'
import { notFound, redirect } from 'next/navigation'
import StoreProvider from '@/components/store/StoreProvider'
import CatalogContent from '@/components/store/CatalogContent'
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

  return {
    title: tienda.nombre_tienda,
    manifest: `/api/manifest/catalogo/${tienda.id}`,
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

  if (!tienda) return notFound()
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
