import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import InventarioClient from './InventarioClient'
import { parsearCategorias } from '@/lib/utils'

interface Producto {
  id: string
  id_tienda: string
  nombre: string
  descripcion: string | null
  categoria: string | null
  precio: number
  precio_oferta: number | null
  costo_compra: number
  stock: number
  in_stock: boolean
  imagen_url: string | null
  unidad_medida: string | null
  tallas: string[]
  tipo_articulo: string | null
}

export default async function InventarioPage() {
  const supabase = await createClient()
  const cookieStore = await cookies()
  const sessionId = cookieStore.get('nx_session')?.value
  if (!sessionId) redirect('/login')

  const { data: tienda } = await supabase.from('tiendas').select('id, nombre_tienda, tipo_negocio').eq('id', sessionId).single()
  if (!tienda) redirect('/onboarding')

  const { data: productos } = await supabase.from('productos').select('*').eq('id_tienda', tienda.id).order('nombre', { ascending: true })

  // Get categories from perfil_tienda
  const { data: perfil } = await supabase.from('perfil_tienda').select('categorias').eq('id_tienda', tienda.id).single()
  const categorias = parsearCategorias(perfil?.categorias)

  return <InventarioClient tiendaId={tienda.id} tipoNegocio={tienda.tipo_negocio || 'estandar'} productos={(productos || []) as Producto[]} categorias={categorias} />
}
