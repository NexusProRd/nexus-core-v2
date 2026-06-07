import { createAdminClient } from '@/lib/supabase/admin'
import { NextResponse } from 'next/server'
import { randomBytes, scryptSync } from 'crypto'
import bcrypt from 'bcryptjs'
import { getDefaultLimit } from '@/lib/commercial'
import { createSessionToken } from '@/lib/auth/session'
import { slugify, slugDisponible } from '@/lib/slug'

function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex')
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  return `${salt}:${derivedKey}`
}

export async function POST(req: Request) {
  try {
    const { nombre_socio, nombre_tienda, whatsapp, password } = await req.json()

    if (!nombre_socio?.trim() || !nombre_tienda?.trim() || !whatsapp?.trim() || !password?.trim()) {
      return NextResponse.json({ error: 'Todos los campos son obligatorios.' }, { status: 400 })
    }

    const digits = (whatsapp as string).replace(/\D/g, '')
    if (digits.length < 10) {
      return NextResponse.json({ error: 'WhatsApp inválido.' }, { status: 400 })
    }

    if (password.length < 6) {
      return NextResponse.json({ error: 'La contraseña debe tener al menos 6 caracteres.' }, { status: 400 })
    }

    const { supabase, error } = createAdminClient()
    if (error) return NextResponse.json({ error }, { status: 500 })

    const { data: existente } = await supabase!
      .from('tiendas')
      .select('id')
      .eq('whatsapp_num', whatsapp.trim())
      .is('soft_deleted_at', null)
      .maybeSingle()

    if (existente) {
      return NextResponse.json({ error: 'Este WhatsApp ya está registrado.' }, { status: 409 })
    }

    const slug = await slugDisponible(supabase, slugify(nombre_tienda) || 'tienda')

    const password_hash = hashPassword(password)
    const codigoVerificacion = `${randomBytes(3).toString('hex').toUpperCase()}`
    const codigoHash = await bcrypt.hash(codigoVerificacion, 10)
    const ipReal = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim()
      || req.headers.get('x-real-ip')
      || 'desconocida'

    const ahora = new Date()
    const trialEnd = new Date(ahora.getTime() + 30 * 24 * 60 * 60 * 1000)

    const fechaSusp = new Date(ahora.getTime() + 45 * 24 * 60 * 60 * 1000)
    const fechaElim = new Date(ahora.getTime() + 61 * 24 * 60 * 60 * 1000)

    const { data: nuevaTienda, error: insertError } = await supabase!.from('tiendas').insert({
      nombre_socio: nombre_socio.trim(),
      nombre_tienda: nombre_tienda.trim(),
      slug,
      whatsapp_num: whatsapp.trim(),
      id_owner: crypto.randomUUID(),
      esta_activa: true,
      plan_tipo: 'emprendedor',
      plan_status: 'trial',
      token_productos_limite: getDefaultLimit('emprendedor'),
      is_founder: false,
      trial_started_at: ahora.toISOString(),
      trial_ends_at: trialEnd.toISOString(),
      fecha_vencimiento: trialEnd.toISOString(),
      fecha_bloqueo_panel: trialEnd.toISOString(),
      fecha_suspension_catalogo: fechaSusp.toISOString(),
      fecha_eliminacion_total: fechaElim.toISOString(),
      tokens_disponibles: 0,
      password_hash,
      codigo_verificacion_hash: codigoHash,
      ultima_ip: ipReal,
    }).select('id').single()

    if (insertError) {
      if (insertError.code === '23505' || insertError.message?.includes('duplicate key')) {
        return NextResponse.json({ error: 'Este slug ya está en uso. Intenta de nuevo.' }, { status: 409 })
      }
      return NextResponse.json({ error: `Error al guardar: ${insertError.message}` }, { status: 500 })
    }

    if (!nuevaTienda) {
      return NextResponse.json({ error: 'Error al crear la tienda' }, { status: 500 })
    }

    // Non-blocking: create perfil_tienda entry
    try {
      await supabase!.from('perfil_tienda').upsert({
        id_tienda: nuevaTienda.id,
        nombre_comercial: nombre_tienda.trim(),
        whatsapp_numero: whatsapp.trim(),
      })
    } catch {}

    // Non-blocking: create seed products
    try {
      const semillas = [
        { nombre: 'Jabón Artesanal', precio: 250, stock: 15 },
        { nombre: 'Envío Exprés', precio: 350, stock: 0 },
      ]
      const productosSemilla = semillas.map(s => ({
        id_tienda: nuevaTienda.id,
        nombre: s.nombre,
        precio: s.precio,
        stock: s.stock,
        costo_compra: Math.round(s.precio * 0.6),
        precio_oferta: null,
        in_stock: true,
        imagen_url: null,
        descripcion: null,
        categoria: null,
      }))
      await supabase!.from('productos').insert(productosSemilla)
    } catch {}

    const token = await createSessionToken(nuevaTienda.id)
    const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1')
    const res = NextResponse.json({
      success: true,
      slug,
      codigo_verificacion: codigoVerificacion,
      redirectTo: '/onboarding',
    })
    res.cookies.set('nx_session', token, {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24 * 30,
    })
    return res
  } catch (err: any) {
    return NextResponse.json({ error: `Error interno: ${err.message}` }, { status: 500 })
  }
}
