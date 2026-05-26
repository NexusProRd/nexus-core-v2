import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import bcrypt from 'bcryptjs'
import { createHmac } from 'crypto'
import { scryptSync, randomBytes } from 'crypto'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

function verificarToken(token: string): string | null {
  try {
    const secret = process.env.RECOVERY_SECRET || 'nexus-recovery-secret-dev'
    const parts = token.split('.')
    if (parts.length !== 2) return null
    const payload = parts[0]
    const firmaEsperada = parts[1]
    const firmaReal = createHmac('sha256', secret).update(
      Buffer.from(payload, 'base64url').toString()
    ).digest('hex')
    if (firmaEsperada !== firmaReal) return null
    const decoded = Buffer.from(payload, 'base64url').toString()
    const [tiendaId, expiraStr] = decoded.split(':')
    if (Date.now() > Number(expiraStr)) return null
    return tiendaId
  } catch {
    return null
  }
}

export async function POST(req: Request) {
  const { token, codigo, nueva_password } = await req.json()

  if (!token || !codigo) {
    return NextResponse.json({ error: 'Token y código requeridos.' }, { status: 400 })
  }

  const tiendaId = verificarToken(token)
  if (!tiendaId) {
    return NextResponse.json({ error: 'Enlace inválido o expirado.' }, { status: 401 })
  }

  const { supabase, error } = createAdminClient()
  if (error || !supabase) {
    return NextResponse.json({ error: 'Error de conexión.' }, { status: 500 })
  }

  const { data: tienda } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, codigo_verificacion_hash')
    .eq('id', tiendaId)
    .single()

  if (!tienda || !tienda.codigo_verificacion_hash) {
    return NextResponse.json({ error: 'Código de verificación no encontrado.' }, { status: 404 })
  }

  const codigoValido = await bcrypt.compare(codigo.trim().toUpperCase(), tienda.codigo_verificacion_hash)
  if (!codigoValido) {
    return NextResponse.json({ error: 'Código de verificación incorrecto.' }, { status: 401 })
  }

  if (nueva_password) {
    if (nueva_password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const password_hash = hashPassword(nueva_password)

    await supabase
      .from('tiendas')
      .update({
        password_hash,
        solicita_cambio: false,
        token_recuperacion: null,
        token_expira: null,
      })
      .eq('id', tienda.id)

    await supabase.from('nexus_logs').insert({
      modulo: 'Recuperacion',
      accion: 'Contraseña restablecida',
      detalle: `Tienda: ${tienda.nombre_tienda}`,
      metadata: { id_tienda: tienda.id },
    })

    return NextResponse.json({ success: true })
  }

  return NextResponse.json({ codigo_valido: true })
}
