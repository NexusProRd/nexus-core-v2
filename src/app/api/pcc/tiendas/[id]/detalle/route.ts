import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    const [tiendaRes, productosRes, pedidosRes, logsRes] = await Promise.all([
      supabase.from('tiendas').select('*').eq('id', id).single(),
      supabase.from('productos').select('id, nombre, precio, stock, in_stock').eq('id_tienda', id),
      supabase.from('pedidos').select('id, order_id, cliente_nombre, total, ganancia_neta, estado, creado_at').eq('id_tienda', id).order('creado_at', { ascending: false }).limit(10),
      supabase.from('nexus_logs').select('id, accion, detalle, created_at').eq('id_tienda', id).order('created_at', { ascending: false }).limit(10),
    ])

    if (tiendaRes.error) return NextResponse.json({ error: tiendaRes.error.message }, { status: 404 })

    const { data: pedidosTotal } = await supabase
      .from('pedidos')
      .select('total, ganancia_neta')
      .eq('id_tienda', id)
      .in('estado', ['entregado', 'confirmado'])

    const totalVentas = (pedidosTotal || []).reduce((s, p) => s + Number(p.total ?? 0), 0)
    const totalGanancias = (pedidosTotal || []).reduce((s, p) => s + Number(p.ganancia_neta ?? 0), 0)

    return NextResponse.json({
      tienda: tiendaRes.data,
      totalProductos: productosRes.data?.length ?? 0,
      productos: productosRes.data ?? [],
      ultimosPedidos: pedidosRes.data ?? [],
      logs: logsRes.data ?? [],
      totalVentas,
      totalGanancias,
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}
