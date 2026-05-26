import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { randomBytes, scryptSync } from 'crypto'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

export async function POST(req: Request) {
  const { supabase, error: adminError } = createAdminClient()

  if (adminError || !supabase) {
    return NextResponse.json({ error: 'Error de configuración del servidor.' }, { status: 500 })
  }

  const { id_tienda, nombre, whatsapp, password, permisos } = await req.json()

  if (!id_tienda || !nombre?.trim() || !whatsapp?.trim() || !password?.trim()) {
    return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
  }

  if (password.length < 6) {
    return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
  }

  const password_hash = hashPassword(password)

  const { error: insertError } = await supabase.from('colaboradores').insert({
    id_tienda,
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
