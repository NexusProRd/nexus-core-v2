import { createAdminClient } from '@/lib/supabase/admin'
import { getSession } from '@/lib/auth/get-session'
import { NextResponse } from 'next/server'
import { randomBytes, scryptSync } from 'crypto'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

export async function POST(req: Request) {
  const session = await getSession(req)
  if (!session.valid || !session.tiendaId)
    return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
  const sessionId = session.tiendaId

  const { supabase, error: adminError } = createAdminClient()
  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  // Verify admin permissions: owner (no nx_colaborador cookie) or admin colaborador
  const cookieHeader = req.headers.get('cookie') || ''
  const colMatch = cookieHeader.match(/(?:^|;\s*)nx_colaborador=([^;]*)/)
  if (colMatch) {
    let colId: string
    try {
      const raw = decodeURIComponent(colMatch[1])
      const parsed = JSON.parse(raw)
      colId = parsed.id
    } catch {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const { data: col } = await supabase
      .from('colaboradores')
      .select('id, permisos')
      .eq('id', colId)
      .eq('id_tienda', sessionId)
      .eq('activo', true)
      .maybeSingle()
    if (!col) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 403 })
    }
    const p = col.permisos as Record<string, boolean> | null
    if (!p?.productos || !p?.pedidos) {
      return NextResponse.json({ error: 'No tienes permisos para registrar colaboradores' }, { status: 403 })
    }
  }

  const { nombre, whatsapp, password, permisos } = await req.json()

  if (!nombre?.trim() || !whatsapp?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
  }

  const password_hash = hashPassword(password)

  const { error: insertError } = await supabase.from('colaboradores').insert({
    id_tienda: sessionId,
    nombre: nombre.trim(),
    whatsapp_num: whatsapp.trim(),
    password_hash,
    permisos: permisos || { productos: true, pedidos: true, dashboard: true },
  })

  if (insertError) {
    if (insertError.code === '23505') {
      return NextResponse.json({ error: 'Este WhatsApp ya tiene un colaborador en esta tienda.' }, { status: 409 })
    }
    return NextResponse.json({ error: `Error al guardar: ${insertError.message}` }, { status: 500 })
  }

  return NextResponse.json({ success: true })
}
