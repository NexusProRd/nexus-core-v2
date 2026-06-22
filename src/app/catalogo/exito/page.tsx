import { createAdminClient } from '@/lib/supabase/admin'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { formatCurrency } from '@/lib/utils'

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

  const admin = createAdminClient()
  const supabase = admin.supabase || await createClient()

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
  const { data: tiendaData } = idFinalTienda ? await supabase.from('tiendas').select('currency_code, whatsapp_num').eq('id', idFinalTienda).maybeSingle() : { data: null }
  const currencyCode = tiendaData?.currency_code || 'DOP'
  const whatsappNumero = tiendaData?.whatsapp_num?.replace(/\D/g, '') || ''

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-8 text-center">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-slate-900 mb-2">✅ Pedido recibido</h1>
        <p className="text-slate-600 mb-6 leading-relaxed">
          Hemos recibido tu solicitud. La tienda revisará tu pedido y se comunicará contigo por WhatsApp para coordinar el pago y la entrega.
        </p>
        {whatsappNumero && (
          <a
            href={`https://wa.me/${whatsappNumero}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 text-sm text-emerald-600 hover:text-emerald-700 font-medium mb-6 px-4 py-2 bg-emerald-50 rounded-xl hover:bg-emerald-100 transition-colors"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
            Contactar por WhatsApp
          </a>
        )}

        <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
          <p className="text-xs text-slate-500 mb-1">Número de pedido</p>
          <p className="text-sm font-mono text-slate-900 font-bold">{pedido?.order_id || pedidoId.slice(0, 8).toUpperCase()}</p>
        </div>

        {detalles && detalles.length > 0 && (
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <p className="text-xs text-slate-500 mb-2 font-bold uppercase">Productos</p>
            {detalles.map((d: any) => {
              const lineaTotal = d.total ?? (d.precio_unitario * d.cantidad)
              return (
                <div key={d.id} className="flex justify-between text-sm py-1">
                  <span className="text-slate-700">{d.producto} x{d.cantidad}</span>
                  <span className="font-bold text-slate-900">{formatCurrency(lineaTotal, currencyCode)}</span>
                </div>
              )
            })}
            {detalles.some((d: any) => Number(d.impuesto) > 0) && (
              <>
                <div className="flex justify-between text-sm pt-2 border-t mt-2">
                  <span className="text-slate-600">Subtotal (sin impuesto)</span>
                  <span className="text-slate-700">{formatCurrency(detalles.reduce((s: number, d: any) => s + Number(d.subtotal ?? d.precio_unitario * d.cantidad), 0), currencyCode)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-slate-600">Impuesto</span>
                  <span className="text-slate-700">{formatCurrency(detalles.reduce((s: number, d: any) => s + Number(d.impuesto || 0), 0), currencyCode)}</span>
                </div>
              </>
            )}
            <div className="border-t mt-2 pt-2 flex justify-between">
              <span className="font-bold text-slate-900">Total</span>
              <span className="font-bold text-green-600">{formatCurrency(pedido?.total || 0, currencyCode)}</span>
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