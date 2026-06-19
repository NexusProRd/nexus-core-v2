import { createPublicClient } from '@/lib/supabase/public'
import type { Metadata } from 'next'
import GiftCardConsultaClient from './consulta-client'

interface Props {
  params: Promise<{ slug: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const supabase = createPublicClient()

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('nombre_tienda')
    .eq('slug', slug)
    .maybeSingle()

  if (!tienda) {
    const { data: tiendaById } = await supabase
      .from('tiendas')
      .select('nombre_tienda')
      .eq('id', slug)
      .maybeSingle()
    if (tiendaById) {
      return { title: `${tiendaById.nombre_tienda} | Consultar Gift Card` }
    }
    return { title: 'Gift Card — Tienda no encontrada' }
  }

  return { title: `${tienda.nombre_tienda} | Consultar Gift Card` }
}

export default async function GiftCardPage({ params }: Props) {
  const { slug } = await params
  const supabase = createPublicClient()

  let tienda: { id: string; nombre_tienda: string } | null = null

  const { data: tiendaBySlug } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda')
    .eq('slug', slug)
    .maybeSingle()

  if (tiendaBySlug) {
    tienda = tiendaBySlug
  } else {
    const { data: tiendaById } = await supabase
      .from('tiendas')
      .select('id, nombre_tienda')
      .eq('id', slug)
      .maybeSingle()
    tienda = tiendaById
  }

  let perfil: { logo_url: string | null; nombre_comercial: string | null; color_primario: string | null; whatsapp_numero: string | null } | null = null

  if (tienda) {
    const { data: profile } = await supabase
      .from('perfil_tienda')
      .select('logo_url, nombre_comercial, color_primario, whatsapp_numero')
      .eq('id_tienda', tienda.id)
      .maybeSingle()
    perfil = profile
  }

  if (!tienda) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Tienda no encontrada</h1>
          <p className="text-sm text-slate-500">El enlace que buscas no es válido.</p>
        </div>
      </div>
    )
  }

  return (
    <GiftCardConsultaClient
      storeId={tienda.id}
      storeName={perfil?.nombre_comercial || tienda.nombre_tienda}
      logoUrl={perfil?.logo_url || null}
      colorPrimario={perfil?.color_primario || '#3B82F6'}
      whatsappNumber={perfil?.whatsapp_numero || null}
    />
  )
}
