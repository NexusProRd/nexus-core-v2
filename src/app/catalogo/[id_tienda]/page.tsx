import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'
import Link from 'next/link'
import StoreProvider from '@/components/store/StoreProvider'
import CatalogContent from '@/components/store/CatalogContent'
import type { TallaVariant } from '@/types/database'

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
}

interface PerfilTienda {
  nombre_comercial: string | null
  logo_url: string | null
  banner_url: string | null
  color_primario: string | null
  mensaje_bienvenida: string | null
  whatsapp_numero: string | null
  theme_config: unknown
}

interface Tienda {
  nombre_tienda: string
  moneda_simbolo: string
  tipo_negocio: string | null
  direccion?: string | null
  whatsapp_num?: string | null
}

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: Promise<{ id_tienda: string }> }): Promise<Metadata> {
  const { id_tienda } = await params
  const supabase = createPublicClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('nombre_tienda')
    .eq('id', id_tienda)
    .maybeSingle()

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('logo_url, nombre_comercial')
    .eq('id_tienda', id_tienda)
    .maybeSingle()

  const nombre = perfil?.nombre_comercial || tienda?.nombre_tienda || 'Tienda'

  return {
    title: `${nombre} | Catálogo Oficial`,
    icons: { icon: perfil?.logo_url || '/favicon.svg' },
  }
}

export default async function CatalogoPage({ params, searchParams }: { params: Promise<{ id_tienda: string }>; searchParams: Promise<{ openCart?: string }> }) {
  const { id_tienda } = await params
  const { openCart } = await searchParams
  
  const supabase = createPublicClient()

  const { data: tienda, error: tiendaError } = await supabase
    .from('tiendas')
    .select('nombre_tienda, moneda_simbolo, fecha_suspension_catalogo, esta_activa, tipo_negocio, direccion, whatsapp_num')
    .eq('id', id_tienda)
    .maybeSingle()

  if (tiendaError) {
    console.error('[Catalogo] Error al buscar tienda:', tiendaError.message)
  }

  if (!tienda) {
    console.error('[Catalogo] Tienda no encontrada para ID:', id_tienda)
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-sm text-slate-500 mb-4">ID: {id_tienda}</p>
          <Link href="/" className="text-blue-600 hover:underline">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  const ahora = new Date()
  const suspensionActiva = tienda.fecha_suspension_catalogo && new Date(tienda.fecha_suspension_catalogo) <= ahora

  if (!tienda.esta_activa || suspensionActiva) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100 px-4">
          <div className="max-w-md text-center">
            <div className="text-7xl mb-6">🏪⏳</div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-3">Catálogo Temporalmente Inactivo</h1>
            <p className="text-slate-500 leading-relaxed">
              Este comercio se encuentra en mantenimiento técnico o actualización de pasarela. Por favor, ponte en contacto directo con la administración del negocio para realizar tu pedido de forma manual.
            </p>
          </div>
        </div>
      )
  }

  const { data: perfil } = await supabase
    .from('perfil_tienda')
    .select('*')
    .eq('id_tienda', id_tienda)
    .maybeSingle()

  const tiendaBase: Tienda = { nombre_tienda: tienda.nombre_tienda, moneda_simbolo: tienda.moneda_simbolo, tipo_negocio: tienda.tipo_negocio || 'estandar', direccion: tienda.direccion, whatsapp_num: tienda.whatsapp_num }

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
        openCart={openCart === '1'}
      />
    </StoreProvider>
  )
}