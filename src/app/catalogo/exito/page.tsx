import { createPublicClient } from '@/lib/supabase/public'
import Link from 'next/link'
import { formatearPrecio } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export default async function ExitoPage({
  searchParams,
}: {
  searchParams: Promise<{ pedido: string; tienda?: string }>
}) {
  const { pedido: pedidoId, tienda: tiendaId } = await searchParams

  if (!pedidoId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-slate-900 mb-2">Pedido no encontrado</h1>
          <Link href="/" className="text-violet-600 hover:underline">Volver al inicio</Link>
        </div>
      </div>
    )
  }

  const supabase = createPublicClient()

  const { data: pedido } = await supabase
    .from('pedidos')
    .select('*')
    .eq('id', pedidoId)
    .single()

  const { data: detalles } = await supabase
    .from('detalles_pedido')
    .select('*')
    .eq('id_pedido', pedidoId)

  const idFinalTienda = tiendaId || pedido?.id_tienda
  const tiendaUrl = idFinalTienda ? `/catalogo/${idFinalTienda}` : '/'

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">¡Pedido Enviado!</h1>
        <p className="text-slate-600 mb-6">
          Hemos recibido tu solicitud. Te contactaremos pronto por WhatsApp.
        </p>

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-slate-500 mb-1">Número de pedido</p>
          <p className="text-sm font-mono text-slate-900 font-bold">{pedido?.order_id || pedidoId.slice(0, 8).toUpperCase()}</p>
        </div>

        {detalles && detalles.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Productos</p>
            {detalles.map((d: any) => (
              <div key={d.id} className="flex justify-between text-sm py-1">
                <span className="text-slate-700">{d.producto} x{d.cantidad}</span>
                <span className="font-bold text-slate-900">RD$${formatearPrecio(d.precio_unitario * d.cantidad)}</span>
              </div>
            ))}
            <div className="border-t mt-2 pt-2 flex justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-green-600">RD$${formatearPrecio(pedido?.total || 0)}</span>
            </div>
          </div>
        )}

        <Link
          href={tiendaUrl}
          className="inline-block bg-gradient-to-r from-teal-500 to-emerald-600 text-white font-bold py-3 px-6 rounded-full hover:from-teal-600 hover:to-emerald-600 transition-all shadow-sm"
        >
          Volver a la Tienda
        </Link>
      </div>
    </div>
  )
}