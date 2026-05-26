import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const { supabase, error: adminError } = createAdminClient()
  if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

  const { data } = await supabase.from('nexus_gastos').select('*').order('created_at', { ascending: false })
  return NextResponse.json({ data: data || [] })
}

export async function POST(request: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

  const body = await request.json()
  const { tipo, concepto, monto, periodicidad } = body

  if (!tipo || !concepto || !monto) {
    return NextResponse.json({ error: 'Tipo, concepto y monto son requeridos' }, { status: 400 })
  }
  if (!['fijo', 'variable'].includes(tipo)) {
    return NextResponse.json({ error: 'Tipo debe ser fijo o variable' }, { status: 400 })
  }

  const { error: insertError } = await supabase.from('nexus_gastos').insert({
    tipo,
    concepto: concepto.trim(),
    monto: Number(monto),
    periodicidad: periodicidad || 'mensual',
  })

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

export async function DELETE(request: Request) {
  const { supabase, error: adminError } = createAdminClient()
  if (!supabase) return NextResponse.json({ error: adminError || 'Error de configuración' }, { status: 500 })

  const { id } = await request.json()
  if (!id) return NextResponse.json({ error: 'ID requerido' }, { status: 400 })

  const { error: deleteError } = await supabase.from('nexus_gastos').delete().eq('id', id)
  if (deleteError) return NextResponse.json({ error: deleteError.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
