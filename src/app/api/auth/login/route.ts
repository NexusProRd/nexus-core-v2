import { NextResponse } from 'next/server'
import { scryptSync, timingSafeEqual, createHash } from 'crypto'
import { createAdminClient } from '@/lib/supabase/admin'
import { createPublicClient } from '@/lib/supabase/public'
import { createSessionToken } from '@/lib/auth/session'

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, key] = stored.split(':')
  if (!salt || !key) return false
  const derivedKey = scryptSync(password, salt, 64).toString('hex')
  if (derivedKey.length !== key.length) return false
  return timingSafeEqual(Buffer.from(derivedKey), Buffer.from(key))
}

function hashUserAgent(ua: string): string {
  return createHash('sha256').update(ua).digest('hex')
}

async function checkRateLimit(ip: string): Promise<{ blocked: boolean; minsLeft?: number }> {
  const admin = createAdminClient()
  if (!admin.supabase) return { blocked: false }

  const { data } = await admin.supabase
    .from('nexus_rate_limits')
    .select('intentos, bloqueado_hasta, ultimo_intento')
    .eq('ip', ip)
    .maybeSingle()

  if (!data) return { blocked: false }

  if (data.bloqueado_hasta) {
    const blockedUntil = new Date(data.bloqueado_hasta).getTime()
    if (blockedUntil > Date.now()) {
      return { blocked: true, minsLeft: Math.ceil((blockedUntil - Date.now()) / 60000) }
    }
  }

  return { blocked: false }
}

async function recordFailedAttempt(ip: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin.supabase) return

  const now = new Date()
  const windowStart = new Date(now.getTime() - 60 * 1000)

  const { data: existing } = await admin.supabase
    .from('nexus_rate_limits')
    .select('intentos, ultimo_intento')
    .eq('ip', ip)
    .maybeSingle()

  if (existing) {
    const isWithinWindow = new Date(existing.ultimo_intento) > windowStart
    const newCount = isWithinWindow ? existing.intentos + 1 : 1
    const bloqueadoHasta = newCount >= 5 ? new Date(now.getTime() + 30 * 60 * 1000) : null

    await admin.supabase.from('nexus_rate_limits').update({
      intentos: newCount,
      ultimo_intento: now.toISOString(),
      bloqueado_hasta: bloqueadoHasta?.toISOString() || null,
    }).eq('ip', ip)
  } else {
    await admin.supabase.from('nexus_rate_limits').insert({
      ip,
      intentos: 1,
      ultimo_intento: now.toISOString(),
      bloqueado_hasta: null,
    })
  }
}

async function clearRateLimit(ip: string): Promise<void> {
  const admin = createAdminClient()
  if (!admin.supabase) return
  await admin.supabase.from('nexus_rate_limits').delete().eq('ip', ip)
}

export async function POST(req: Request) {
  const ip = getClientIp(req)

  const { blocked, minsLeft } = await checkRateLimit(ip)
  if (blocked) {
    return NextResponse.json(
      { error: `Demasiados intentos. Intenta de nuevo en ${minsLeft} minuto(s).` },
      { status: 429 }
    )
  }

  let body: { whatsapp: string; password: string }
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Cuerpo de solicitud inválido.' }, { status: 400 })
  }

  const { whatsapp, password } = body
  const digits = (whatsapp || '').replace(/\D/g, '')
  if (digits.length < 10) {
    return NextResponse.json({ error: 'WhatsApp inválido' }, { status: 400 })
  }

  if (!password?.trim()) {
    return NextResponse.json({ error: 'Contraseña requerida.' }, { status: 400 })
  }

  const supabase = createPublicClient()
  const { data: tienda, error: queryError } = await supabase
    .from('tiendas')
    .select('id, nombre_tienda, esta_activa, onboarding_completo, password_hash, dispositivo_id_hash, ultima_ip, telefono_socio, whatsapp_num')
    .in('whatsapp_num', [whatsapp.trim(), digits])
    .is('soft_deleted_at', null)
    .maybeSingle()

  if (queryError) {
    return NextResponse.json({ error: `Error BD: ${queryError.message}` }, { status: 500 })
  }

  if (!tienda) {
    const admin = createAdminClient()
    let colExiste = false
    if (admin.supabase && !admin.error) {
      const { data: col } = await admin.supabase
        .from('colaboradores')
        .select('id, id_tienda, password_hash, activo, permisos, nombre')
        .eq('whatsapp_num', whatsapp.trim())
        .maybeSingle()

      if (col) {
        colExiste = true
        if (col.activo && verifyPassword(password, col.password_hash)) {
          await clearRateLimit(ip)
          const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1')
          const res = NextResponse.json({
            success: true,
            redirectTo: '/dashboard',
            tiendaId: col.id_tienda,
            nombre: 'Colaborador',
          })
          // LEGACY COMPATIBILITY: signed token replaces raw id_tienda
          const token = await createSessionToken(col.id_tienda)
          res.cookies.set('nx_session', token, {
            httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
          })
          const colCookie = JSON.stringify({ id: col.id, permisos: col.permisos, nombre: col.nombre })
          res.cookies.set('nx_colaborador', colCookie, {
            httpOnly: false, secure: !isLocalhost, sameSite: 'lax', path: '/', maxAge: 60 * 60 * 24 * 30,
          })
          return res
        }
      }
    }

    await recordFailedAttempt(ip)
    return NextResponse.json(
      { error: colExiste ? 'WhatsApp o contraseña incorrecta.' : 'Número no registrado.' },
      { status: 401 }
    )
  }

  if (!tienda.password_hash) {
    return NextResponse.json({ error: 'WhatsApp o contraseña incorrecta.' }, { status: 401 })
  }

  if (!verifyPassword(password, tienda.password_hash)) {
    await recordFailedAttempt(ip)
    return NextResponse.json({ error: 'WhatsApp o contraseña incorrecta.' }, { status: 401 })
  }

  await clearRateLimit(ip)

  const userAgent = req.headers.get('user-agent') || ''
  const currentDeviceHash = hashUserAgent(userAgent)
  const storedDeviceHash = tienda.dispositivo_id_hash
  const storedIp = tienda.ultima_ip
  const esDispositivoNuevo = Boolean(
    storedDeviceHash && (storedDeviceHash !== currentDeviceHash || (storedIp && storedIp !== ip))
  )

  const admin = createAdminClient()
  if (admin.supabase && !admin.error) {
    await admin.supabase
      .from('tiendas')
      .update({
        user_agent: userAgent,
        dispositivo_id_hash: currentDeviceHash,
        ultima_ip: ip,
        ultimo_login: new Date().toISOString(),
      })
      .eq('id', tienda.id)
  }

  if (esDispositivoNuevo) {
    if (admin.supabase && !admin.error) {
      await admin.supabase.from('nexus_login_vigilado').insert({
        id_tienda: tienda.id,
        whatsapp_num: tienda.whatsapp_num,
        nombre_tienda: tienda.nombre_tienda,
        ip,
        user_agent: userAgent,
        navegador: userAgent.slice(0, 100),
      })
    }
  }

  let redirectTo = '/dashboard'
  if (!tienda.esta_activa) redirectTo = '/dashboard/bloqueado'
  else if (!tienda.onboarding_completo) redirectTo = '/onboarding'

  const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1')
  const res = NextResponse.json({
    success: true,
    redirectTo,
    tiendaId: tienda.id,
    nombre: tienda.nombre_tienda,
  })
  // LEGACY COMPATIBILITY: signed token replaces raw id_tienda
  const token = await createSessionToken(tienda.id)
  res.cookies.set('nx_session', token, {
    httpOnly: true,
    secure: false,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30,
  })
  return res
}
