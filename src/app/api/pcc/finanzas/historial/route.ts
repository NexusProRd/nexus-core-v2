import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { ESTADOS_INCLUIDOS } from '@/app/dashboard/dashboard-metrics'

export async function GET(request: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

  const url = new URL(request.url)
  const periodo = url.searchParams.get('periodo') || 'mensual'

  const { data: pedidos } = await supabase
    .from('pedidos')
    .select('total, creado_at')
    .in('estado', ESTADOS_INCLUIDOS)

  const { data: tokens } = await supabase
    .from('nexus_logs')
    .select('created_at')
    .eq('accion', 'recarga_token')

  const { data: otros } = await supabase
    .from('nexus_otros_ingresos')
    .select('monto, creado_en')

  const { data: gastos } = await supabase
    .from('nexus_gastos')
    .select('tipo, monto, periodicidad, created_at')

  if (!pedidos && !tokens && !otros && !gastos) {
    return NextResponse.json({ data: [] })
  }

  const mapa = new Map<string, { ventas: number; tokens: number; otros: number; gastos: number }>()

  const getKey = (fecha: string): string => {
    const d = new Date(fecha)
    if (periodo === 'semanal') {
      const inicio = new Date(d)
      inicio.setDate(d.getDate() - d.getDay())
      return inicio.toISOString().split('T')[0]
    }
    if (periodo === 'anual') return `${d.getFullYear()}`
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
  }

  const init = (key: string) => {
    if (!mapa.has(key)) mapa.set(key, { ventas: 0, tokens: 0, otros: 0, gastos: 0 })
  }

  for (const p of pedidos || []) {
    if (!p.creado_at) continue
    const key = getKey(p.creado_at)
    init(key)
    mapa.get(key)!.ventas += Number(p.total || 0)
  }

  for (const t of tokens || []) {
    const key = getKey(t.created_at)
    init(key)
    mapa.get(key)!.tokens++
  }

  for (const o of otros || []) {
    const key = getKey(o.creado_en)
    init(key)
    mapa.get(key)!.otros += Number(o.monto || 0)
  }

  // Gastos fijos se prorratean mensuales, variables por fecha
  for (const g of gastos || []) {
    if (g.tipo === 'fijo' && g.periodicidad === 'mensual') {
      for (const [key, val] of mapa) {
        val.gastos += Number(g.monto || 0)
      }
    } else {
      const key = getKey(g.created_at)
      init(key)
      mapa.get(key)!.gastos += Number(g.monto || 0)
    }
  }

  const data = Array.from(mapa.entries())
    .map(([fecha, valores]) => ({
      fecha,
      ventas: Math.round(valores.ventas * 100) / 100,
      tokens: valores.tokens,
      otros: Math.round(valores.otros * 100) / 100,
      gastos: Math.round(valores.gastos * 100) / 100,
      ingresos: Math.round((valores.ventas + valores.tokens + valores.otros) * 100) / 100,
      neto: Math.round((valores.ventas + valores.tokens + valores.otros - valores.gastos) * 100) / 100,
    }))
    .sort((a, b) => a.fecha.localeCompare(b.fecha))

  return NextResponse.json({ data })
}
