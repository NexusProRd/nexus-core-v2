'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { generarSlug } from '@/lib/slug'

async function getTiendaIdFromServerCookies(): Promise<string | null> {
  const cookieStore = await cookies()
  return cookieStore.get('nx_session')?.value ?? null
}

export async function crearProducto(formData: FormData) {
  const supabase = await createClient()
  const sessionId = await getTiendaIdFromServerCookies()
  if (!sessionId) return { error: 'No autenticado' }

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, token_productos_limite')
    .eq('id', sessionId)
    .single()
  if (!tienda) return { error: 'Tienda no encontrada' }

  const { count: totalProductos } = await supabase
    .from('productos')
    .select('*', { count: 'exact', head: true })
    .eq('id_tienda', tienda.id)

  if (totalProductos !== null && totalProductos >= tienda.token_productos_limite) {
    return { error: 'Límite de plan alcanzado' }
  }

  const nombre = formData.get('nombre') as string
  const descripcion = formData.get('descripcion') as string
  const enOferta = formData.get('en_oferta_checkbox') === 'true'
  const precioOfertaRaw = formData.get('precio_oferta') as string
  const precioOferta = enOferta && precioOfertaRaw && parseFloat(precioOfertaRaw) > 0 ? parseFloat(precioOfertaRaw) : null
  const imagenUrl = formData.get('imagen_url') as string || null

  const usaVariantes = formData.get('usa_variantes') === 'true'
  const tallasRaw = formData.get('tallas') as string
  let tallas: any[] = []
  try { if (tallasRaw) tallas = JSON.parse(tallasRaw) } catch {}

  const precio = usaVariantes ? (tallas[0]?.precio ?? 0) : parseFloat(formData.get('precio') as string) || 0
  const costoCompra = usaVariantes ? (tallas[0]?.costo ?? 0) : parseFloat(formData.get('costo_compra') as string) || 0
  const stock = usaVariantes ? tallas.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) : (parseInt(formData.get('stock') as string) || 0)

  const codigoBarra = formData.get('codigo_barra') as string || ''
  const slug = await generarSlug(nombre, codigoBarra, supabase, tienda.id)

  const { error } = await supabase.from('productos').insert({
    id_tienda: tienda.id,
    nombre,
    slug,
    descripcion,
    categoria: formData.get('categoria') as string || null,
    precio,
    costo_compra: costoCompra,
    precio_oferta: precioOferta,
    stock,
    in_stock: true,
    imagen_url: imagenUrl,
    tallas: usaVariantes ? tallas : [],
    tipo_articulo: formData.get('tipo_articulo') as string || null,
  })

  if (error) return { error: error.message }
  revalidatePath('/dashboard/inventario')
  return { success: true }
}

export async function toggleStock(productoId: string, inStock: boolean) {
  const admin = createAdminClient()
  if (!admin.supabase) return
  const tiendaId = await getTiendaIdFromServerCookies()
  if (!tiendaId) return
  await admin.supabase.from('productos').update({ in_stock: inStock }).eq('id', productoId).eq('id_tienda', tiendaId)
  revalidatePath('/dashboard/inventario')
}

export async function eliminarProducto(productoId: string) {
  const admin = createAdminClient()
  if (!admin.supabase) return
  const tiendaId = await getTiendaIdFromServerCookies()
  if (!tiendaId) return
  await admin.supabase.from('productos').delete().eq('id', productoId).eq('id_tienda', tiendaId)
  revalidatePath('/dashboard/inventario')
}

export async function actualizarProducto(formData: FormData) {
  const admin = createAdminClient()
  if (!admin.supabase) return
  const tiendaId = await getTiendaIdFromServerCookies()
  if (!tiendaId) return
  const id = formData.get('id') as string
  const enOferta = formData.get('en_oferta_checkbox') === 'true'
  const precioOfertaRaw = formData.get('precio_oferta') as string
  const precioOferta = enOferta && precioOfertaRaw && parseFloat(precioOfertaRaw) > 0 ? parseFloat(precioOfertaRaw) : null
  const tallasRaw = formData.get('tallas') as string
  let tallas: any[] = []
  try { if (tallasRaw) tallas = JSON.parse(tallasRaw) } catch {}
  const usaVariantes = formData.get('usa_variantes') === 'true'

  const precio = usaVariantes ? (tallas[0]?.precio ?? 0) : (parseFloat(formData.get('precio') as string) || 0)
  const costoCompra = usaVariantes ? (tallas[0]?.costo ?? 0) : parseFloat(formData.get('costo_compra') as string) || 0

  const nombreUpdate = formData.get('nombre') as string
  const codigoBarraUpdate = formData.get('codigo_barra') as string || ''
  const slugUpdate = await generarSlug(nombreUpdate, codigoBarraUpdate, admin.supabase, tiendaId, id)

  await admin.supabase.from('productos').update({
    nombre: nombreUpdate,
    slug: slugUpdate,
    descripcion: formData.get('descripcion') as string,
    categoria: formData.get('categoria') as string || null,
    precio,
    precio_oferta: precioOferta,
    costo_compra: costoCompra,
    stock: usaVariantes ? tallas.reduce((sum: number, v: any) => sum + (v.stock || 0), 0) : (parseInt(formData.get('stock') as string) || 0),
    tipo_articulo: formData.get('tipo_articulo') as string || null,
    tallas: usaVariantes ? tallas : [],
  }).eq('id', id).eq('id_tienda', tiendaId)
  revalidatePath('/dashboard/inventario')
}
