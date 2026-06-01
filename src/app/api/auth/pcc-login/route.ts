import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { createSessionToken } from '@/lib/auth/session'

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0].trim()
  return req.headers.get('x-real-ip') || 'unknown'
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

export async function POST(req: NextRequest) {
  try {
    const ip = getClientIp(req)

    const { blocked, minsLeft } = await checkRateLimit(ip)
    if (blocked) {
      return NextResponse.json(
        { error: `Demasiados intentos. Intenta de nuevo en ${minsLeft} minuto(s).` },
        { status: 429 }
      )
    }

    const { password } = await req.json()

    if (!password || !password.trim()) {
      return NextResponse.json({ error: 'Contraseña requerida' }, { status: 400 })
    }

    const { supabase, error: adminError } = createAdminClient()
    if (!supabase) {
      return NextResponse.json({ error: 'Error de configuración' }, { status: 500 })
    }

    const { data: config } = await supabase
      .from('nexus_config')
      .select('valor')
      .eq('clave', 'pcc_password')
      .maybeSingle()

    const storedPassword = config?.valor || 'admin123'

    if (password.trim() !== storedPassword) {
      await recordFailedAttempt(ip)
      return NextResponse.json({ error: 'Contraseña incorrecta' }, { status: 401 })
    }

    await clearRateLimit(ip)

    const token = await createSessionToken('pcc')

    const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1')
    const res = NextResponse.json({ success: true })
    res.cookies.set('nx_pcc_session', token, {
      httpOnly: true,
      secure: !isLocalhost,
      sameSite: 'lax',
      path: '/',
      maxAge: 60 * 60 * 24,
    })
    return res
  } catch {
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
