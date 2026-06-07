import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import bcrypt from 'bcryptjs'
import { randomBytes } from 'crypto'

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error: dbError } = createAdminClient()
  if (dbError || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('preguntas_recuperacion')
    .eq('id', session.tiendaId)
    .single()

  return NextResponse.json({
    preguntas: tienda?.preguntas_recuperacion || [],
  })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId) {
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  }

  const { supabase, error: dbError } = createAdminClient()
  if (dbError || !supabase) {
    return NextResponse.json({ error: 'Error de conexión' }, { status: 500 })
  }

  const body = await req.json()
  const { action } = body

  if (action === 'regenerar-codigo') {
    const nuevoCodigo = randomBytes(3).toString('hex').toUpperCase()
    const hash = await bcrypt.hash(nuevoCodigo, 10)

    await supabase
      .from('tiendas')
      .update({ codigo_verificacion_hash: hash })
      .eq('id', session.tiendaId)

    return NextResponse.json({ codigo: nuevoCodigo })
  }

  if (action === 'guardar-preguntas') {
    const { preguntas } = body

    if (!Array.isArray(preguntas) || preguntas.length !== 3) {
      return NextResponse.json({ error: 'Debes configurar exactamente 3 preguntas.' }, { status: 400 })
    }

    const preguntasSet = new Set(preguntas.map((p: any) => p.pregunta))
    if (preguntasSet.size !== 3) {
      return NextResponse.json({ error: 'Las 3 preguntas deben ser diferentes.' }, { status: 400 })
    }

    for (const p of preguntas) {
      if (!p.pregunta?.trim() || !p.respuesta?.trim()) {
        return NextResponse.json({ error: 'Todas las preguntas y respuestas son obligatorias.' }, { status: 400 })
      }
    }

    await supabase
      .from('tiendas')
      .update({ preguntas_recuperacion: preguntas })
      .eq('id', session.tiendaId)

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ error: 'Acción no válida' }, { status: 400 })
}
