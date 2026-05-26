import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { randomBytes, createHmac } from 'crypto'

function generarToken(tiendaId: string): { token: string; expira: Date } {
  const secret = process.env.RECOVERY_SECRET || 'nexus-recovery-secret-dev'
  const expira = new Date(Date.now() + 15 * 60 * 1000)
  const payload = `${tiendaId}:${expira.getTime()}`
  const firma = createHmac('sha256', secret).update(payload).digest('hex')
  return { token: `${Buffer.from(payload).toString('base64url')}.${firma}`, expira }
}

export async function GET() {
  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'No DB' }, { status: 500 })
  }

  const { data } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, whatsapp_num, solicita_cambio, preguntas_recuperacion, token_recuperacion, token_expira')
    .eq('solicita_cambio', true)
    .order('updated_at', { ascending: false })

  return NextResponse.json({ tiendas: data || [] })
}

export async function POST(req: Request) {
  const { id, action } = await req.json()
  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'No DB' }, { status: 500 })
  }

  if (action === 'generar-enlace') {
    const { token, expira } = generarToken(id)

    await supabase
      .from('tiendas')
      .update({
        token_recuperacion: token,
        token_expira: expira.toISOString(),
      })
      .eq('id', id)

    const { data: tienda } = await supabase
      .from('tiendas')
      .select('nombre_tienda, whatsapp_num')
      .eq('id', id)
      .single()

    const host = req.headers.get('host') || 'localhost:3000'
    const protocol = host.includes('localhost') || host.includes('127.0.0.1') ? 'http' : 'https'
    const link = `${protocol}://${host}/recuperar?token=${token}`

    await supabase.from('nexus_logs').insert({
      modulo: 'Recuperacion',
      accion: 'Enlace generado',
      detalle: `Tienda: ${tienda?.nombre_tienda}`,
      metadata: { id_tienda: id },
    })

    return NextResponse.json({ link, whatsapp_num: tienda?.whatsapp_num, nombre_tienda: tienda?.nombre_tienda })
  }

  if (action === 'regenerar-codigo') {
    const nuevoCodigo = `${randomBytes(3).toString('hex').toUpperCase()}`
    const hash = await bcrypt.hash(nuevoCodigo, 10)

    await supabase
      .from('tiendas')
      .update({ codigo_verificacion_hash: hash })
      .eq('id', id)

    const { data: tienda } = await supabase
      .from('tiendas')
      .select('nombre_tienda')
      .eq('id', id)
      .single()

    await supabase.from('nexus_logs').insert({
      modulo: 'Recuperacion',
      accion: 'Codigo regenerado',
      detalle: `Tienda: ${tienda?.nombre_tienda}`,
      metadata: { id_tienda: id },
    })

    return NextResponse.json({ codigo: nuevoCodigo })
  }

  if (action === 'marcar-resuelto') {
    await supabase
      .from('tiendas')
      .update({
        solicita_cambio: false,
        token_recuperacion: null,
        token_expira: null,
      })
      .eq('id', id)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no válida.' }, { status: 400 })
}
