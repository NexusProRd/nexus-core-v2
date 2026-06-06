import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  try {
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    const ahora = new Date()
    const inicioMes = new Date(ahora.getFullYear(), ahora.getMonth(), 1).toISOString()

    const [tiendasRes, configRes, tokensRes, otrosRes] = await Promise.all([
      supabase.from('tiendas').select('id, nombre_tienda, plan_tipo, esta_activa, fecha_vencimiento'),
      supabase.from('nexus_config').select('clave, valor').in('clave', ['precio_servicio', 'plan_emprendedor_price', 'plan_pro_price']),
      supabase.from('nexus_logs').select('id', { count: 'exact', head: true }).eq('accion', 'recarga_token').gte('created_at', inicioMes),
      supabase.from('nexus_otros_ingresos').select('*').order('creado_en', { ascending: false }),
    ])

    if (tiendasRes.error) throw new Error(tiendasRes.error.message)

    const tiendas = tiendasRes.data || []
    const configMap = new Map(configRes.data?.map(r => [r.clave, r.valor]) ?? [])
    const precioServicio = parseInt(configMap.get('precio_servicio') || '49', 10)
    const emprendedorPrice = parseInt(configMap.get('plan_emprendedor_price') || '380', 10)
    const proPrice = parseInt(configMap.get('plan_pro_price') || '900', 10)

    // --- MRR (basado en plan_tipo real) ---
    const activas = tiendas.filter(t => t.esta_activa)
    const emprendedorasActivas = activas.filter(t => t.plan_tipo === 'emprendedor').length
    const prosActivas = activas.filter(t => t.plan_tipo === 'pro').length
    const mrr = (emprendedorasActivas * emprendedorPrice) + (prosActivas * proPrice)

    // --- Ingresos por Tokens (este mes) ---
    const tokensEsteMes = tokensRes.count ?? 0
    const ingresoToken = tokensEsteMes * precioServicio

    // --- Otros Ingresos ---
    const otrosIngresos = (otrosRes.data || []).map(r => ({
      id: r.id,
      concepto: r.concepto,
      monto: Number(r.monto),
      creado_at: r.creado_en,
    }))
    const totalOtros = otrosIngresos.reduce((s, i) => s + i.monto, 0)

    // --- Totales ---
    const totalIngresos = mrr + ingresoToken + totalOtros

    // --- Pagos Pendientes (próximos 7 días o vencidas) ---
    const sieteDias = new Date(ahora.getTime() + 7 * 24 * 60 * 60 * 1000)
    const pagosPendientes = tiendas
      .filter(t => {
        if (!t.fecha_vencimiento || !t.esta_activa) return false
        const vence = new Date(t.fecha_vencimiento)
        return vence <= sieteDias
      })
      .map(t => ({
        id: t.id,
        nombre: t.nombre_tienda,
        plan_tipo: t.plan_tipo,
        vence: t.fecha_vencimiento,
        precio: t.plan_tipo === 'pro' ? proPrice : emprendedorPrice,
        vencida: new Date(t.fecha_vencimiento) < ahora,
      }))
      .sort((a, b) => new Date(a.vence).getTime() - new Date(b.vence).getTime())

    return NextResponse.json({
      config: { precioServicio, plan_emprendedor_price: emprendedorPrice, plan_pro_price: proPrice },
      resumen: {
        mrr,
        activas: activas.length,
        emprendedorasActivas,
        prosActivas,
        tokensEsteMes,
        ingresoToken,
        totalOtros,
        totalIngresos,
      },
      otrosIngresos,
      pagosPendientes: {
        cantidad: pagosPendientes.length,
        totalPendiente: pagosPendientes.reduce((s, p) => s + p.precio, 0),
        tiendas: pagosPendientes,
      },
    })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    const body = await request.json()
    const { concepto, monto } = body

    if (!concepto || !monto) {
      return NextResponse.json({ error: 'Concepto y monto son requeridos' }, { status: 400 })
    }

    const { error: insertError } = await supabase.from('nexus_otros_ingresos').insert({
      concepto,
      monto: Number(monto),
    })

    if (insertError) throw new Error(insertError.message)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

    const { id } = await request.json()
    if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

    const { error: deleteError } = await supabase.from('nexus_otros_ingresos').delete().eq('id', id)
    if (deleteError) throw new Error(deleteError.message)

    return NextResponse.json({ ok: true })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : 'Error inesperado' }, { status: 500 })
  }
}
